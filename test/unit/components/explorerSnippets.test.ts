import { describe, expect, it, vi } from 'vitest';
import { explorerSnippets } from '../../../src/providers/explorerSnippets';
import type { VaultmanPlugin } from '../../../src/main';
import type { SnippetNode } from '../../../src/types/typeContracts';
import type { QueueChange } from '../../../src/types/typeContracts';
import { mockApp } from '../../helpers/obsidian-mocks';

vi.mock('../../../src/types/typeObsidian', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../../src/types/typeObsidian')>();
	return {
		...actual,
		setCssSnippetEnabled: vi.fn(async () => true),
	};
});

function makePlugin(nodes: SnippetNode[] = []): VaultmanPlugin {
	return {
		app: mockApp(),
		contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
		cssSnippetsIndex: {
			nodes,
			refresh: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
			byId: vi.fn(),
		},
		operationsIndex: {
			nodes: [] as QueueChange[],
			refresh: vi.fn(),
			subscribe: vi.fn(),
			byId: vi.fn(),
		},
		activeFiltersIndex: {
			nodes: [],
			refresh: vi.fn(),
			subscribe: vi.fn(),
			byId: vi.fn(),
		},
		nodeBindingService: {
			bindOrCreate: vi.fn(),
		},
	} as unknown as VaultmanPlugin;
}

describe('explorerSnippets', () => {
	it('maps snippet index nodes to tree rows with enabled state controls', () => {
		const explorer = new explorerSnippets(
			makePlugin([
				{ id: 'wide-table', name: 'wide-table', enabled: true },
				{ id: 'cards', name: 'cards', enabled: false },
			]),
		);

		const tree = explorer.getTree();

		expect(tree.map((node) => node.id)).toEqual(['cards', 'wide-table']);
		expect(tree[0]).toMatchObject({
			label: 'cards',
			icon: 'lucide-file-code',
			countLabel: 'off',
			meta: { name: 'cards', enabled: false },
		});
		expect(tree[1].countLabel).toBe('on');
		expect(tree[1].badges?.[0]).toMatchObject({
			quickAction: true,
			icon: 'lucide-toggle-right',
		});
	});

	it('toggle badge flips snippet enabled state and refreshes the index', async () => {
		const plugin = makePlugin([{ id: 'cards', name: 'cards', enabled: false }]);
		const explorer = new explorerSnippets(plugin);
		const node = explorer.getTree()[0];

		await node.badges?.[0].onClick?.();

		const { setCssSnippetEnabled } = await import('../../../src/types/typeObsidian');
		expect(setCssSnippetEnabled).toHaveBeenCalledWith(plugin.app, 'cards', true);
		expect(plugin.cssSnippetsIndex.refresh).toHaveBeenCalledOnce();
	});

	it('secondary activation toggles snippet enabled state for list mode', async () => {
		const { setCssSnippetEnabled } = await import('../../../src/types/typeObsidian');
		vi.mocked(setCssSnippetEnabled).mockClear();
		const plugin = makePlugin([{ id: 'cards', name: 'cards', enabled: false }]);
		const explorer = new explorerSnippets(plugin);
		const node = explorer.getTree()[0];

		explorer.handleNodeSecondaryAction?.(node);

		await vi.waitFor(async () => {
			expect(setCssSnippetEnabled).toHaveBeenCalledWith(plugin.app, 'cards', true);
		});
		expect(plugin.cssSnippetsIndex.refresh).toHaveBeenCalledOnce();
	});

	it('registers a binding-note context action for snippet nodes', async () => {
		const plugin = makePlugin([{ id: 'cards', name: 'cards', enabled: false }]);
		const explorer = new explorerSnippets(plugin);
		const node = explorer.getTree()[0];
		const action = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([candidate]) => candidate.id === 'snippet.bindingNote')?.[0];

		expect(action).toBeTruthy();
		await action.run({ nodeType: 'snippet', node, surface: 'panel' });

		expect(plugin.nodeBindingService?.bindOrCreate).toHaveBeenCalledWith({
			kind: 'snippet',
			label: 'cards',
		});
	});
});
