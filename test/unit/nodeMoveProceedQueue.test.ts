import type { App, TFile } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

import { fileMoveStrategy } from '../../src/logic/logicMoveRouting';
import {
	enterNodeMoveMode,
	selectNodeMoveDestination,
} from '../../src/logic/logicNodeMoveMode';
import {
	buildNodeMoveQueueChanges,
	dedupeNodeMoveOperations,
	proceedNodeMoveToQueue,
	stageNodeMovePlan,
} from '../../src/logic/logicNodeMoveProceed';
import { OperationQueueService } from '../../src/services/serviceOperationQueue';
import { COPY_FILE, MOVE_FILE } from '../../src/types/typeOps';

function makeFile(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	const extension = dot >= 0 ? name.slice(dot + 1) : '';
	const basename = dot >= 0 ? name.slice(0, dot) : name;
	return {
		basename,
		extension,
		name,
		parent: null,
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

const RESTORE = { interactionMode: 'open', searchOpen: false };

function stateWithDestination(
	originDisposition: 'move' | 'copy' = 'move',
	secondDestination = false,
) {
	let state = enterNodeMoveMode({
		origin: [
			{
				id: 'a',
				kind: 'file',
				node: { id: 'a', kind: 'file', canonicalId: 'x/a.md' },
			},
		],
		restore: RESTORE,
		owner: { instanceId: 'inst-1', scene: 'files' },
		strategy: fileMoveStrategy,
	});
	state = { ...state, originDisposition };
	state = selectNodeMoveDestination(state, {
		id: 'dst',
		kind: 'folder',
		canonicalId: 'archivo',
	});
	if (secondDestination) {
		state = selectNodeMoveDestination(state, {
			id: 'dst2',
			kind: 'folder',
			canonicalId: 'bodega',
		});
	}
	return state;
}

describe('U130-02 proceed-queue: plan desde NodeMoveOperation con resolucion segura', () => {
	it('construye un file_move contra la queue existente con TFile y destino resueltos', () => {
		const state = stateWithDestination('move');
		const files = new Map([['x/a.md', makeFile('x/a.md')]]);
		const plan = buildNodeMoveQueueChanges(
			[
				{
					originId: 'a',
					originCanonicalId: 'x/a.md',
					originKind: 'file',
					destinationId: 'dst',
					destinationCanonicalId: 'archivo',
					write: 'append',
					originDisposition: 'move',
				},
			],
			{
				findFile: (path) => files.get(path) ?? null,
				listFilesInFolder: () => [],
			},
		);
		expect(plan.unresolved).toEqual([]);
		expect(plan.changes).toHaveLength(1);
		expect(plan.changes[0]).toMatchObject({
			type: 'file_move',
			action: 'move',
			files: [files.get('x/a.md')],
		});
		expect(plan.changes[0].logicFunc(files.get('x/a.md')!, {})).toEqual({
			[MOVE_FILE]: 'archivo',
		});
		expect(state.originDisposition).toBe('move');
	});

	it('origen o destino muerto no se inventa: queda en unresolved con motivo', () => {
		const plan = buildNodeMoveQueueChanges(
			[
				{
					originId: 'ghost',
					originCanonicalId: 'x/ghost.md',
					originKind: 'file',
					destinationId: 'dst',
					destinationCanonicalId: 'archivo',
					write: 'append',
					originDisposition: 'move',
				},
			],
			{
				findFile: () => null,
				listFilesInFolder: () => [],
			},
		);
		expect(plan.changes).toHaveLength(0);
		expect(plan.unresolved).toEqual([
			expect.objectContaining({
				originId: 'ghost',
				destinationId: 'dst',
				reason: 'origin-missing',
			}),
		]);
	});
});

describe('U130-02 proceed-queue: fan-out estable y deduplicado', () => {
	it('1 origen x 2 destinos produce 2 cambios atribuibles por par', () => {
		const files = new Map([['x/a.md', makeFile('x/a.md')]]);
		const plan = buildNodeMoveQueueChanges(
			[
				{
					originId: 'a',
					originCanonicalId: 'x/a.md',
					originKind: 'file',
					destinationId: 'dst',
					destinationCanonicalId: 'archivo',
					write: 'append',
					originDisposition: 'move',
				},
				{
					originId: 'a',
					originCanonicalId: 'x/a.md',
					originKind: 'file',
					destinationId: 'dst2',
					destinationCanonicalId: 'bodega',
					write: 'append',
					originDisposition: 'move',
				},
			],
			{
				findFile: (path) => files.get(path) ?? null,
				listFilesInFolder: () => [],
			},
		);
		expect(plan.changes).toHaveLength(2);
		expect(plan.changes[0].details).toContain('x/a.md');
		expect(plan.changes[0].details).toContain('archivo');
		expect(plan.changes[1].details).toContain('bodega');
	});

	it('pares duplicados se deduplican de forma estable sin duplicar la queue', () => {
		const { ops, deduped } = dedupeNodeMoveOperations([
			{
				originId: 'a',
				originCanonicalId: 'x/a.md',
				originKind: 'file',
				destinationId: 'dst',
				destinationCanonicalId: 'archivo',
				write: 'append',
				originDisposition: 'move',
			},
			{
				originId: 'a',
				originCanonicalId: 'x/a.md',
				originKind: 'file',
				destinationId: 'dst',
				destinationCanonicalId: 'archivo',
				write: 'append',
				originDisposition: 'move',
			},
		]);
		expect(ops).toHaveLength(1);
		expect(deduped).toBe(1);
	});
});

describe('U130-02 proceed-queue: move vs copy respetan semantica', () => {
	it('copy stagea file_copy con COPY_FILE y conserva el origen', () => {
		const file = makeFile('x/a.md');
		const files = new Map([['x/a.md', file]]);
		const plan = buildNodeMoveQueueChanges(
			[
				{
					originId: 'a',
					originCanonicalId: 'x/a.md',
					originKind: 'file',
					destinationId: 'dst',
					destinationCanonicalId: 'archivo',
					write: 'append',
					originDisposition: 'copy',
				},
			],
			{
				findFile: (path) => files.get(path) ?? null,
				listFilesInFolder: () => [],
			},
		);
		expect(plan.changes).toHaveLength(1);
		expect(plan.changes[0]).toMatchObject({
			type: 'file_copy',
			action: 'copy',
		});
		expect(plan.changes[0].logicFunc(file, {})).toEqual({
			[COPY_FILE]: 'archivo/a.md',
		});
	});

	it('copy ejecuta vault.copy y move ejecuta renameFile: no se cruzan', async () => {
		const file = makeFile('x/a.md');
		const copy = vi.fn().mockResolvedValue(undefined);
		const renameFile = vi.fn().mockResolvedValue(undefined);
		const app = {
			vault: {
				getAbstractFileByPath: vi.fn().mockReturnValue(null),
				copy,
				createFolder: vi.fn().mockResolvedValue(undefined),
			},
			fileManager: {
				renameFile,
				processFrontMatter: vi.fn(),
			},
		} as unknown as App;
		const moveService = new OperationQueueService(app);
		const copyService = new OperationQueueService(app);

		const files = new Map([['x/a.md', file]]);
		const movePlan = buildNodeMoveQueueChanges(
			[
				{
					originId: 'a',
					originCanonicalId: 'x/a.md',
					originKind: 'file',
					destinationId: 'dst',
					destinationCanonicalId: 'archivo',
					write: 'append',
					originDisposition: 'move',
				},
			],
			{
				findFile: (path) => files.get(path) ?? null,
				listFilesInFolder: () => [],
			},
		);
		const copyPlan = buildNodeMoveQueueChanges(
			[
				{
					originId: 'a',
					originCanonicalId: 'x/a.md',
					originKind: 'file',
					destinationId: 'dst',
					destinationCanonicalId: 'archivo',
					write: 'append',
					originDisposition: 'copy',
				},
			],
			{
				findFile: (path) => files.get(path) ?? null,
				listFilesInFolder: () => [],
			},
		);
		moveService.addBatch(movePlan.changes);
		await moveService.execute();
		expect(renameFile).toHaveBeenCalledTimes(1);
		expect(copy).not.toHaveBeenCalled();

		copy.mockClear();
		renameFile.mockClear();
		copyService.addBatch(copyPlan.changes);
		await copyService.execute();
		expect(copy).toHaveBeenCalledTimes(1);
		expect(copy).toHaveBeenCalledWith(file, 'archivo/a.md');
		expect(renameFile).not.toHaveBeenCalled();
	});
});

describe('U130-02 proceed-queue: errores parciales conservan exitos y mensajes por par', () => {
	it('un par roto no tumba el otro y cada fallo nombra su par', async () => {
		const good = makeFile('x/good.md');
		const bad = makeFile('x/bad.md');
		const renameFile = vi.fn().mockImplementation((file: TFile) => {
			if (file.path === 'x/bad.md')
				return Promise.reject(new Error('EACCES bad'));
			return Promise.resolve(undefined);
		});
		const app = {
			vault: {
				getAbstractFileByPath: vi.fn().mockReturnValue(null),
				createFolder: vi.fn().mockResolvedValue(undefined),
			},
			fileManager: { renameFile, processFrontMatter: vi.fn() },
		} as unknown as App;
		const service = new OperationQueueService(app);
		const files = new Map([
			['x/good.md', good],
			['x/bad.md', bad],
		]);
		const plan = buildNodeMoveQueueChanges(
			[
				{
					originId: 'good',
					originCanonicalId: 'x/good.md',
					originKind: 'file',
					destinationId: 'dst',
					destinationCanonicalId: 'archivo',
					write: 'append',
					originDisposition: 'move',
				},
				{
					originId: 'bad',
					originCanonicalId: 'x/bad.md',
					originKind: 'file',
					destinationId: 'dst',
					destinationCanonicalId: 'archivo',
					write: 'append',
					originDisposition: 'move',
				},
			],
			{
				findFile: (path) => files.get(path) ?? null,
				listFilesInFolder: () => [],
			},
		);
		service.addBatch(plan.changes);
		const result = await service.execute();
		expect(result.success).toBe(1);
		expect(result.errors).toBe(1);
		expect(result.messages.join('\n')).toContain('x/bad.md');
		// Sin rollback ciego: el exito queda aplicado.
		expect(renameFile).toHaveBeenCalledWith(good, 'archivo/good.md');
	});
});

describe('U130-02 proceed-queue: stage/persistencia y bypass con consentimiento', () => {
	it('en stage la queue no ejecuta hasta Proceed/confirmacion: stagea sin escribir', async () => {
		const file = makeFile('x/a.md');
		const renameFile = vi.fn().mockResolvedValue(undefined);
		const app = {
			vault: {
				getAbstractFileByPath: vi.fn().mockReturnValue(null),
				createFolder: vi.fn().mockResolvedValue(undefined),
			},
			fileManager: { renameFile, processFrontMatter: vi.fn() },
		} as unknown as App;
		const service = new OperationQueueService(app);
		expect(service.operationMode).toBe('stage');
		const files = new Map([['x/a.md', file]]);
		const plan = buildNodeMoveQueueChanges(
			[
				{
					originId: 'a',
					originCanonicalId: 'x/a.md',
					originKind: 'file',
					destinationId: 'dst',
					destinationCanonicalId: 'archivo',
					write: 'append',
					originDisposition: 'move',
				},
			],
			{
				findFile: (path) => files.get(path) ?? null,
				listFilesInFolder: () => [],
			},
		);
		const outcome = stageNodeMovePlan(service, plan, { confirmed: false });
		expect(outcome.requiresConfirmation).toBe(false);
		expect(service.queue).toHaveLength(1);
		expect(renameFile).not.toHaveBeenCalled();
	});

	it('en bypass nada se ejecuta sin consentimiento explicito', () => {
		const file = makeFile('x/a.md');
		const app = {
			vault: { getAbstractFileByPath: vi.fn().mockReturnValue(null) },
			fileManager: {
				renameFile: vi.fn(),
				processFrontMatter: vi.fn(),
			},
		} as unknown as App;
		const service = new OperationQueueService(app, {
			bypassOperations: true,
		});
		const files = new Map([['x/a.md', file]]);
		const plan = buildNodeMoveQueueChanges(
			[
				{
					originId: 'a',
					originCanonicalId: 'x/a.md',
					originKind: 'file',
					destinationId: 'dst',
					destinationCanonicalId: 'archivo',
					write: 'append',
					originDisposition: 'move',
				},
			],
			{
				findFile: (path) => files.get(path) ?? null,
				listFilesInFolder: () => [],
			},
		);
		const addOrRun = vi
			.spyOn(service, 'addOrRun')
			.mockImplementation(() => {});
		const withoutConsent = stageNodeMovePlan(service, plan, {
			confirmed: false,
		});
		expect(withoutConsent.requiresConfirmation).toBe(true);
		expect(service.queue).toHaveLength(0);
		expect(addOrRun).not.toHaveBeenCalled();

		const withConsent = stageNodeMovePlan(service, plan, {
			confirmed: true,
		});
		expect(withConsent.requiresConfirmation).toBe(false);
		expect(addOrRun).toHaveBeenCalledTimes(plan.changes.length);
	});

	it('proceed poda antes de emitir y no emite sin las dos mitades', () => {
		const file = makeFile('x/a.md');
		const app = {} as App;
		const service = new OperationQueueService(app);
		const withDst = stateWithDestination('move');
		const pruned = proceedNodeMoveToQueue(withDst, {
			findFile: (path) => (path === 'x/a.md' ? file : null),
			listFilesInFolder: () => [],
			isAlive: (ref) => ref.canonicalId !== 'x/a.md',
			queueService: service,
			confirmed: false,
		});
		expect(pruned.pruned).toEqual(['x/a.md']);
		expect(pruned.staged).toBe(0);
		expect(service.queue).toHaveLength(0);
	});
});

describe('U130-02 proceed-queue: fuentes negativas', () => {
	const src = readFileSync(
		new URL('../../src/logic/logicNodeMoveProceed.ts', import.meta.url),
		'utf8',
	);

	it('no escribe en el vault fuera de OperationQueueService', () => {
		expect(src).not.toContain('app.vault');
		expect(src).not.toContain('vault.copy');
		expect(src).not.toContain('vault.modify');
		expect(src).not.toContain('renameFile');
		expect(src).not.toContain('createBinary');
		expect(src).not.toContain('as any');
	});

	it('no duplica ids globales ni inventa camino de escritura', () => {
		expect(src).not.toContain('vaultman.move.proceed');
		expect(src).not.toContain('vaultman.nodemove.proceed');
		expect(src).toContain('addBatch');
	});

	it('kind sin soporte no cae en silencio: queda en unresolved', () => {
		const file = makeFile('x/a.md');
		const plan = buildNodeMoveQueueChanges(
			[
				{
					originId: 'a',
					originCanonicalId: 'x/a.md',
					originKind: 'tag',
					destinationId: 'dst',
					destinationCanonicalId: 'tema',
					write: 'append',
					originDisposition: 'move',
				},
			],
			{
				findFile: () => file,
				listFilesInFolder: () => [],
			},
		);
		expect(plan.changes).toHaveLength(0);
		expect(plan.unresolved).toHaveLength(1);
		expect(plan.unresolved[0].reason).toBe('unsupported-kind');
	});
});
