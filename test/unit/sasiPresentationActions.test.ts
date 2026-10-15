import { describe, expect, it } from 'vitest';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	applyScenePresentationAction,
	parseScenePresentationAction,
	PRESENTATION_ACTION_SCOPE,
} from '../../src/logic/logicSasiPresentationActions';

it('registers scoped presentation actions without publishing commands', () => {
	const { registry } = createVaultmanSasi();
	const ids = ['provided', 'lowercase', 'titlecase', 'uppercase'].map(mode => `vaultman.scene.text-case.${mode}`);
	for (const boundary of ['tree', 'toolbar', 'container', 'menu']) {
		for (const mode of ['compatible', 'locked']) ids.push(`vaultman.scene.native-compat.${boundary}.${mode}`);
	}
	for (const id of ids) {
		const resolved = registry.resolve(id);
		expect(resolved.def?.kind).toBe('action');
		expect(resolved.available).toBe(true);
		expect(resolved.def?.scope).toBe(PRESENTATION_ACTION_SCOPE);
		expect(resolved.def?.scope).toBe('this.instance → file.scene');
		expect(resolved.def?.supports.map((s) => s.surface)).toEqual(['panelWidget']);
		expect(registry.listCommands().some(command => command.composes?.includes(id))).toBe(false);
	}
});

describe('presentation action dispatch (pure)', () => {
	it('parses text-case and native-compat ids, rejects unknown', () => {
		expect(parseScenePresentationAction('vaultman.scene.text-case.uppercase')).toEqual({
			kind: 'text-case', mode: 'uppercase',
		});
		expect(parseScenePresentationAction('vaultman.scene.native-compat.tree.locked')).toEqual({
			kind: 'native-compat', boundary: 'tree', mode: 'locked',
		});
		expect(parseScenePresentationAction('vaultman.scene.native-compat.tree')).toBeNull();
		expect(parseScenePresentationAction('vaultman.scene.engine.tree')).toBeNull();
		expect(parseScenePresentationAction('vaultman.scene.text-case.bogus')).toBeNull();
	});

	it('applies native-compat sparsely, preserving other boundaries', () => {
		const next = applyScenePresentationAction(
			{ nativeCompat: { toolbar: 'locked' } },
			'files',
			{ kind: 'native-compat', boundary: 'tree', mode: 'locked' },
		);
		expect(next.nativeCompat).toEqual({ toolbar: 'locked', tree: 'locked' });
	});

	it('applies text-case to the scene text cells only', () => {
		const next = applyScenePresentationAction({}, 'files', { kind: 'text-case', mode: 'uppercase' });
		expect(next.textCase?.name).toBe('uppercase');
		// Must not invent cells outside the scene contract.
		expect(next.textCase?.text).toBeUndefined();
		const propsNext = applyScenePresentationAction({}, 'props', { kind: 'text-case', mode: 'lowercase' });
		expect(propsNext.textCase?.text).toBe('lowercase');
	});
});
