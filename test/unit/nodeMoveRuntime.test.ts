import { describe, expect, it } from 'vitest';

import { fileMoveStrategy } from '../../src/logic/logicMoveRouting';
import {
	enterNodeMoveMode,
	selectNodeMoveDestination,
	proceedEnabled,
} from '../../src/logic/logicNodeMoveMode';
import {
	NodeMoveSceneRuntime,
	isNodeMoveActiveIn,
	nodeMoveBarTransaction,
	projectNodeMoveBar,
} from '../../src/logic/logicNodeMoveRuntime';
import { ScenePanelWidgetController } from '../../src/logic/logicScenePanelWidgetController';
import type { NavbarPanelWidgetState } from '../../src/types/typePanelWidget';

const RESTORE = { interactionMode: 'open', searchOpen: false };

function enterFor(instanceId: string, scene: string) {
	return enterNodeMoveMode({
		origin: [
			{
				id: 'a',
				kind: 'file',
				node: { id: 'a', kind: 'file', canonicalId: 'x/a.md' },
			},
		],
		restore: RESTORE,
		owner: { instanceId, scene },
		strategy: fileMoveStrategy,
	});
}

function withDestination(instanceId: string, scene: string) {
	return selectNodeMoveDestination(enterFor(instanceId, scene), {
		id: 'dst',
		kind: 'folder',
		canonicalId: 'archivo',
	});
}

function mockProjection(
	providerId: string,
	transactionBar: NavbarPanelWidgetState['transactionBar'],
): NavbarPanelWidgetState {
	return {
		providerId,
		actionPort: { invoke: async () => true },
		activeTab: 'files',
		filtersSearch: '',
		filtersSearchCategory: { files: 0, props: 0, tags: 0 },
		icon: () => ({ update: () => {} }),
		transactionBar,
	};
}

describe('U130-02 runtime-wire: aislamiento por (instancia, Scene)', () => {
	it('dos instancias con la misma Scene NO comparten modo', () => {
		const runtime = new NodeMoveSceneRuntime();
		runtime.start(enterFor('inst-1', 'files'));
		// La otra instancia no ve nada: ni siquiera suspendido.
		expect(runtime.get('inst-2', 'files')).toBeNull();
		expect(runtime.get('inst-1', 'files')).not.toBeNull();
	});

	it('dos Scenes de la misma instancia guardan estados distintos', () => {
		const runtime = new NodeMoveSceneRuntime();
		runtime.start(enterFor('inst-1', 'files'));
		runtime.start(enterFor('inst-1', 'tags'));
		expect(runtime.get('inst-1', 'files')).not.toBeNull();
		expect(runtime.get('inst-1', 'tags')).not.toBeNull();
		expect(runtime.get('inst-1', 'files')).not.toBe(
			runtime.get('inst-1', 'tags'),
		);
	});

	it('cancel/Proceed/teardown terminan: finish retira solo su clave', () => {
		const runtime = new NodeMoveSceneRuntime();
		runtime.start(enterFor('inst-1', 'files'));
		runtime.start(enterFor('inst-1', 'tags'));
		expect(runtime.finish('inst-1', 'files')).toBe(true);
		expect(runtime.get('inst-1', 'files')).toBeNull();
		expect(runtime.get('inst-1', 'tags')).not.toBeNull();
	});

	it('cambio de dueno termina la clave vieja y el nuevo queda aislado', () => {
		const runtime = new NodeMoveSceneRuntime();
		runtime.start(withDestination('old-inst', 'files'));
		expect(runtime.get('old-inst', 'files')).not.toBeNull();
		// setNodeMoveOwner(new): finish(old, files) antes de cambiar.
		expect(runtime.finish('old-inst', 'files')).toBe(true);
		expect(runtime.get('old-inst', 'files')).toBeNull();
		expect(runtime.get('new-inst', 'files')).toBeNull();
	});
});

describe('U130-02 runtime-wire: suspension al cambiar Scene', () => {
	it('cambiar de Scene suspende, no mata: la barra queda hidden', () => {
		const runtime = new NodeMoveSceneRuntime();
		runtime.start(withDestination('inst-1', 'files'));
		const stored = runtime.get('inst-1', 'files');
		expect(stored).not.toBeNull();
		const bar = projectNodeMoveBar({
			state: stored,
			current: { instanceId: 'inst-1', scene: 'tags' },
			nodes: [],
			variant: 'row',
			groupsAvailable: false,
		});
		expect(bar.visibility).toBe('hidden');
		// Suspendido sigue siendo el mismo estado: volver lo restaura.
		expect(isNodeMoveActiveIn(stored, { instanceId: 'inst-1', scene: 'tags' })).toBe(false);
		expect(isNodeMoveActiveIn(stored, { instanceId: 'inst-1', scene: 'files' })).toBe(true);
	});

	it('otra instancia no ve ni suspendido: unmounted', () => {
		const runtime = new NodeMoveSceneRuntime();
		runtime.start(withDestination('inst-1', 'files'));
		const bar = projectNodeMoveBar({
			state: runtime.get('inst-1', 'files'),
			current: { instanceId: 'inst-2', scene: 'files' },
			nodes: [],
			variant: 'row',
			groupsAvailable: false,
		});
		expect(bar.visibility).toBe('unmounted');
	});
});

describe('U130-02 runtime-wire: reanudacion con poda sin publicar sobre Scene ajena', () => {
	it('resume poda origenes muertos y los reporta; la Scene ajena no cambia', () => {
		const runtime = new NodeMoveSceneRuntime();
		runtime.start(enterFor('inst-1', 'files'));
		runtime.start(enterFor('inst-1', 'tags'));
		const resumed = runtime.resume('inst-1', 'files', (ref) => ref.canonicalId !== 'x/a.md');
		expect(resumed.state).not.toBeNull();
		expect(resumed.state?.origin).toEqual([]);
		expect(resumed.pruned).toEqual(['x/a.md']);
		// La Scene ajena de la misma instancia queda intacta.
		expect(runtime.get('inst-1', 'tags')?.origin).toHaveLength(1);
	});

	it('resume poda destinos muertos y apaga proceed sin tocar la Scene ajena', () => {
		const runtime = new NodeMoveSceneRuntime();
		runtime.start(withDestination('inst-1', 'files'));
		expect(proceedEnabled(runtime.get('inst-1', 'files')!)).toBe(true);
		const resumed = runtime.resume(
			'inst-1',
			'files',
			(ref) => ref.canonicalId !== 'archivo',
		);
		expect(resumed.prunedDestinations).toEqual(['archivo']);
		expect(resumed.state?.destinations).toEqual([]);
		expect(resumed.state ? proceedEnabled(resumed.state) : true).toBe(false);
	});

	it('sin bajas resume devuelve el mismo estado y nada podado', () => {
		const runtime = new NodeMoveSceneRuntime();
		runtime.start(enterFor('inst-1', 'files'));
		const before = runtime.get('inst-1', 'files')!;
		const resumed = runtime.resume('inst-1', 'files', () => true);
		expect(resumed.state).toBe(before);
		expect(resumed.pruned).toEqual([]);
		expect(resumed.prunedDestinations).toEqual([]);
	});

	it('una instancia muerta no reanuda nada', () => {
		const runtime = new NodeMoveSceneRuntime();
		runtime.start(enterFor('inst-1', 'files'));
		const resumed = runtime.resume('inst-2', 'files', () => true);
		expect(resumed.state).toBeNull();
	});
});

describe('U130-02 runtime-wire: proyeccion determinista al host existente', () => {
	it('el mismo estado proyecta el mismo TransactionBarState', () => {
		const state = withDestination('inst-1', 'files');
		const args = {
			state,
			current: { instanceId: 'inst-1', scene: 'files' as const },
			nodes: [],
			variant: 'row' as const,
			groupsAvailable: false,
		};
		expect(projectNodeMoveBar(args)).toEqual(projectNodeMoveBar(args));
		expect(projectNodeMoveBar(args).visibility).toBe('visible');
	});

	it('la transaccion deriva del estado: owner, origenes, destinos y rechazo', () => {
		const rejected = selectNodeMoveDestination(enterFor('inst-1', 'files'), {
			id: 'otro',
			kind: 'file',
			canonicalId: 'y/b.md',
		});
		const tx = nodeMoveBarTransaction(rejected);
		expect(tx).not.toBeNull();
		expect(tx?.owner).toEqual({ instanceId: 'inst-1', scene: 'files' });
		expect(tx?.moveKind).toBe('node');
		expect(tx?.rejection).toEqual({
			destination: 'otro',
			reason: 'incompatible-kind',
		});
	});

	it('el envelope publicado en su host se acepta; sobre Scene ajena se rechaza', () => {
		const state = withDestination('inst-1', 'files');
		const bar = projectNodeMoveBar({
			state,
			current: { instanceId: 'inst-1', scene: 'files' },
			nodes: [],
			variant: 'row',
			groupsAvailable: false,
		});
		const host = new ScenePanelWidgetController('scene-host-A');
		const foreign = new ScenePanelWidgetController('scene-host-B');
		const gen = host.begin('files');
		const publication = {
			sceneInstanceId: 'scene-host-A',
			providerId: 'files',
			generation: gen,
			projection: mockProjection('files', bar),
		};
		expect(host.publish(publication)).not.toBeNull();
		// El mismo envelope sobre un host ajeno no publica: el contrato
		// (sceneInstanceId, providerId, generation) lo impide.
		expect(foreign.publish(publication)).toBeNull();
		expect(foreign.current()).toBeNull();
	});
});
