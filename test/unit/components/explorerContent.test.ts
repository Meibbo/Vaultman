import { describe, expect, it, vi } from 'vitest';
import { explorerContent } from '../../../src/components/containers/explorerContent';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../../src/main';
import type {
	ActiveFilterEntry,
	ContentMatch,
	IContentIndex,
	INodeIndex,
	NodeBase,
	QueueChange,
} from '../../../src/types/typeContracts';
import { mockApp, mockTFile, type TFile } from '../../helpers/obsidian-mocks';

function makeIndex<TNode extends NodeBase>(nodes: TNode[]): INodeIndex<TNode> {
	return {
		nodes,
		revision: 0,
		refresh: vi.fn(),
		subscribe: vi.fn(() => () => {}),
		byId: (id: string) => nodes.find((node) => node.id === id),
	};
}

function makeContentIndex(nodes: ContentMatch[]): IContentIndex {
	return {
		nodes,
		revision: 0,
		refresh: vi.fn(),
		subscribe: vi.fn(() => () => {}),
		byId: (id: string) => nodes.find((node) => node.id === id),
		setQuery: vi.fn(),
	};
}

function makePlugin(nodes: ContentMatch[]): {
	plugin: VaultmanPlugin;
	files: TFile[];
} {
	const alpha = mockTFile('Notes/Alpha.md');
	const beta = mockTFile('Beta.md');
	const files = [alpha, beta] as TFile[];
	const app = mockApp({ files });

	return {
		files,
		plugin: {
			app,
			contentIndex: makeContentIndex(nodes),
			operationsIndex: makeIndex<QueueChange>([]),
			activeFiltersIndex: makeIndex<ActiveFilterEntry>([]),
			viewService: new ViewService(),
			contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
			queueService: { add: vi.fn() },
		} as unknown as VaultmanPlugin,
	};
}

describe('explorerContent', () => {
	it('groups content matches by file and exposes match children with highlights', () => {
		const { plugin } = makePlugin([
			{
				id: 'Notes/Alpha.md:0:6',
				filePath: 'Notes/Alpha.md',
				line: 0,
				before: 'alpha ',
				match: 'needle',
				after: ' one',
			},
			{
				id: 'Notes/Alpha.md:3:2',
				filePath: 'Notes/Alpha.md',
				line: 3,
				before: 'x ',
				match: 'needle',
				after: ' two',
			},
			{
				id: 'Beta.md:1:0',
				filePath: 'Beta.md',
				line: 1,
				before: '',
				match: 'needle',
				after: ' three',
			},
		]);
		const explorer = new explorerContent(plugin);

		const tree = explorer.getTree();

		expect(tree).toHaveLength(2);
		expect(tree[0].label).toBe('Notes/Alpha.md');
		expect(tree[0].count).toBe(2);
		expect(tree[0].children).toHaveLength(2);
		expect(tree[0].children?.[0].label).toBe('1: alpha needle one');
		expect(tree[0].children?.[0].highlights).toEqual([{ start: 9, end: 15 }]);
		expect(tree[1].label).toBe('Beta.md');
		expect(tree[1].count).toBe(1);
	});

	it('returns unique files for the current content results', () => {
		const { plugin, files } = makePlugin([
			{
				id: 'Notes/Alpha.md:0:0',
				filePath: 'Notes/Alpha.md',
				line: 0,
				before: '',
				match: 'needle',
				after: '',
			},
			{
				id: 'Notes/Alpha.md:2:0',
				filePath: 'Notes/Alpha.md',
				line: 2,
				before: '',
				match: 'needle',
				after: '',
			},
		]);
		const explorer = new explorerContent(plugin);

		expect(explorer.getFiles()).toEqual([files[0]]);
	});

	it('queues file deletion from the registered content context action', async () => {
		const { plugin, files } = makePlugin([
			{
				id: 'Notes/Alpha.md:0:0',
				filePath: 'Notes/Alpha.md',
				line: 0,
				before: '',
				match: 'needle',
				after: '',
			},
		]);
		const explorer = new explorerContent(plugin);
		const fileNode = explorer.getTree()[0];
		const deleteAction = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([action]) => action.id === 'content.delete')?.[0];

		expect(deleteAction).toBeTruthy();

		await deleteAction.run({
			nodeType: 'file',
			node: fileNode,
			selectedNodes: [fileNode],
			surface: 'panel',
			file: files[0],
		});

		expect(plugin.queueService.add).toHaveBeenCalledOnce();
		const change = (plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change.type).toBe('file_delete');
		expect(change.action).toBe('delete');
		expect(change.files).toEqual([files[0]]);
	});

	it('queues file deletion from the content hover badge', () => {
		const { plugin, files } = makePlugin([
			{
				id: 'Beta.md:1:0',
				filePath: 'Beta.md',
				line: 1,
				before: '',
				match: 'needle',
				after: '',
			},
		]);
		const explorer = new explorerContent(plugin) as explorerContent & {
			handleHoverBadge?: (
				node: ReturnType<explorerContent['getTree']>[number],
				kind: string,
			) => void;
		};
		const fileNode = explorer.getTree()[0];

		expect(typeof explorer.handleHoverBadge).toBe('function');

		explorer.handleHoverBadge?.(fileNode, 'delete');

		expect(plugin.queueService.add).toHaveBeenCalledOnce();
		expect((plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0].files).toEqual([
			files[1],
		]);
	});
});
