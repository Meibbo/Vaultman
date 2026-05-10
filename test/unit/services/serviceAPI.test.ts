import { describe, expect, it, vi } from 'vitest';
import { createServiceAPI } from '../../../src/services/serviceAPI';
import { DELETE_FILE, type FileChange, type PendingChange, type TagChange } from '../../../src/types/typeOps';
import type { ActiveFilterEntry, NodeBase, QueueChange } from '../../../src/types/typeContracts';
import { mockTFile, type TFile } from '../../helpers/obsidian-mocks';

function makeIndex<TNode extends NodeBase>(nodes: TNode[], revision?: number) {
	const index = {
		nodes,
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		byId: vi.fn((id: string) => nodes.find((node) => node.id === id)),
	};
	if (revision !== undefined) {
		return { ...index, revision };
	}
	return index;
}

function buildHost(opts: {
	files?: TFile[];
	filteredFiles?: TFile[];
	selectedFiles?: TFile[];
	operationNodes?: QueueChange[];
	activeFilterNodes?: ActiveFilterEntry[];
	queueAdd?: (change: PendingChange) => void;
	queueSize?: number;
	contentRevision?: number;
	scope?: 'auto' | 'selected' | 'filtered' | 'all';
} = {}) {
	const files = opts.files ?? [mockTFile('a.md'), mockTFile('b.md')];
	const queueAdd = opts.queueAdd ?? vi.fn();
	const queueExecute = vi.fn();

	return {
		host: {
			filesIndex: makeIndex(
				files.map((file) => ({
					id: file.path,
					path: file.path,
					basename: file.basename,
					file,
				})),
				3,
			),
			tagsIndex: makeIndex([{ id: '#review', tag: '#review', count: 2 }], 4),
			propsIndex: makeIndex(
				[{ id: 'status', property: 'status', values: ['draft'], valueFrequencies: { draft: 1 }, fileCount: 1 }],
				5,
			),
			contentIndex: makeIndex([{ id: 'match-1', filePath: files[0]?.path ?? '', line: 1, before: '', match: 'x', after: '' }], opts.contentRevision),
			operationsIndex: makeIndex(opts.operationNodes ?? [], 6),
			activeFiltersIndex: makeIndex(opts.activeFilterNodes ?? [], 7),
			filterService: {
				filteredFiles: opts.filteredFiles ?? files,
				selectedFiles: opts.selectedFiles ?? [],
			},
			queueService: {
				pending: [],
				size: opts.queueSize ?? 0,
				add: queueAdd,
				execute: queueExecute,
			},
			settings: {
				explorerOperationScope: opts.scope ?? 'auto',
			},
		},
		queueAdd,
		queueExecute,
	};
}

function buildAddTagChange(files: TFile[]): TagChange {
	return {
		id: 'add-review',
		type: 'tag',
		files,
		action: 'add',
		details: 'add #review',
		tag: '#review',
		logicFunc: () => ({ tags: ['review'] }),
		customLogic: true,
	};
}

function buildDeleteFileChange(file: TFile): FileChange {
	return {
		id: 'delete-a',
		type: 'file_delete',
		files: [file],
		action: 'delete',
		details: `delete ${file.path}`,
		logicFunc: () => ({ [DELETE_FILE]: true }),
	};
}

describe('serviceAPI read/plan/enqueue', () => {
	it('read reports index counts, verified scope, and missing revision warnings', () => {
		const visible = mockTFile('visible.md');
		const other = mockTFile('other.md');
		const stale = mockTFile('stale.md');
		const { host } = buildHost({
			files: [visible, other],
			filteredFiles: [visible, other],
			selectedFiles: [visible, stale],
			queueSize: 1,
			scope: 'selected',
		});

		const api = createServiceAPI(host);
		const read = api.read();

		expect(read.counts).toMatchObject({
			files: 2,
			tags: 1,
			props: 1,
			content: 1,
			operations: 0,
			activeFilters: 0,
			queue: 1,
			scopeFiles: 1,
		});
		expect(read.scope).toMatchObject({
			scope: 'selected',
			source: 'selected',
			paths: ['visible.md'],
			selectedCount: 2,
			visibleCount: 2,
			staleSelectedPaths: ['stale.md'],
		});
		expect(read.indexes.find((index) => index.name === 'content')?.stale).toBe(true);
		expect(read.validationErrors).toContainEqual(
			expect.objectContaining({ code: 'index_revision_unknown', target: 'content' }),
		);
		expect(read.summary).toContain('1 scoped file');
	});

	it('plan validates queueable changes without enqueueing', () => {
		const files = [mockTFile('a.md'), mockTFile('b.md')];
		const { host, queueAdd } = buildHost({ files });
		const api = createServiceAPI(host);

		const plan = api.plan({ label: 'Review tag', changes: buildAddTagChange(files) });

		expect(plan.queueable).toBe(true);
		expect(plan.risk).toBe('non_destructive');
		expect(plan.requiresConfirmation).toBe(false);
		expect(plan.affectedPaths).toEqual(['a.md', 'b.md']);
		expect(plan.validationErrors).toEqual([]);
		expect(plan.counts).toMatchObject({ changes: 1, targetFiles: 2 });
		expect(plan.rollbackLimits.length).toBeGreaterThan(0);
		expect(plan.summary).toContain('1 change');
		expect(queueAdd).not.toHaveBeenCalled();
	});

	it('enqueue requires confirmation for destructive changes and only calls queue add', () => {
		const file = mockTFile('a.md');
		const { host, queueAdd, queueExecute } = buildHost({ files: [file] });
		const api = createServiceAPI(host);
		const plan = api.plan({ changes: buildDeleteFileChange(file) });

		const rejected = api.enqueue(plan);

		expect(rejected.queued).toBe(0);
		expect(rejected.validationErrors).toContainEqual(
			expect.objectContaining({ code: 'confirmation_required' }),
		);
		expect(queueAdd).not.toHaveBeenCalled();

		const accepted = api.enqueue(plan, { confirmed: true });

		expect(accepted.queued).toBe(1);
		expect(accepted.validationErrors).toEqual([]);
		expect(queueAdd).toHaveBeenCalledTimes(1);
		expect(queueAdd).toHaveBeenCalledWith(plan.changes[0]);
		expect(queueExecute).not.toHaveBeenCalled();
		expect(accepted.summary).toContain('Queued 1 change');
	});
});
