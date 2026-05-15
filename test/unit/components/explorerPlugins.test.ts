import { describe, expect, it, vi } from 'vitest';
import { explorerPlugins } from '../../../src/providers/explorerPlugins';
import type { VaultmanPlugin } from '../../../src/main';
import type { PluginNode, QueueChange } from '../../../src/types/typeContracts';
import { mockApp } from '../../helpers/obsidian-mocks';

vi.mock('../../../src/types/typeObsidian', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../../src/types/typeObsidian')>();
	return {
		...actual,
		setCommunityPluginEnabled: vi.fn(async () => true),
	};
});

function makePlugin(nodes: PluginNode[] = [], manifestId = 'vaultman'): VaultmanPlugin {
	return {
		app: mockApp(),
		manifest: { id: manifestId },
		contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
		pluginsIndex: {
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

describe('explorerPlugins', () => {
	it('maps plugin index nodes to tree rows with enabled state controls', () => {
		const explorer = new explorerPlugins(
			makePlugin([
				{
					id: 'dataview',
					pluginId: 'dataview',
					name: 'Dataview',
					enabled: false,
					loaded: false,
				},
				{
					id: 'calendar',
					pluginId: 'calendar',
					name: 'Calendar',
					enabled: true,
					loaded: true,
					version: '1.5.10',
				},
			]),
		);

		const tree = explorer.getTree();

		expect(tree.map((node) => node.id)).toEqual(['calendar', 'dataview']);
		expect(tree[0]).toMatchObject({
			label: 'Calendar',
			icon: 'lucide-plug',
			countLabel: 'on',
			meta: { pluginId: 'calendar', name: 'Calendar', enabled: true, loaded: true },
		});
		expect(tree[1].countLabel).toBe('off');
		expect(tree[1].badges?.[0]).toMatchObject({
			quickAction: true,
			icon: 'lucide-toggle-left',
		});
	});

	it('toggle badge flips plugin enabled state and refreshes the index', async () => {
		const plugin = makePlugin([
			{ id: 'calendar', pluginId: 'calendar', name: 'Calendar', enabled: false, loaded: false },
		]);
		const explorer = new explorerPlugins(plugin);
		const node = explorer.getTree()[0];

		await node.badges?.[0].onClick?.();

		const { setCommunityPluginEnabled } = await import('../../../src/types/typeObsidian');
		expect(setCommunityPluginEnabled).toHaveBeenCalledWith(plugin.app, 'calendar', true);
		expect(plugin.pluginsIndex.refresh).toHaveBeenCalledOnce();
	});

	it('secondary activation toggles plugin enabled state for list mode', async () => {
		const { setCommunityPluginEnabled } = await import('../../../src/types/typeObsidian');
		vi.mocked(setCommunityPluginEnabled).mockClear();
		const plugin = makePlugin([
			{ id: 'calendar', pluginId: 'calendar', name: 'Calendar', enabled: false, loaded: false },
		]);
		const explorer = new explorerPlugins(plugin);
		const node = explorer.getTree()[0];

		explorer.handleNodeSecondaryAction?.(node);

		await vi.waitFor(async () => {
			expect(setCommunityPluginEnabled).toHaveBeenCalledWith(plugin.app, 'calendar', true);
		});
		expect(plugin.pluginsIndex.refresh).toHaveBeenCalledOnce();
	});

	it('does not disable the running Vaultman plugin', async () => {
		const plugin = makePlugin(
			[{ id: 'vaultman', pluginId: 'vaultman', name: 'Vaultman', enabled: true, loaded: true }],
			'vaultman',
		);
		const explorer = new explorerPlugins(plugin);
		const node = explorer.getTree()[0];

		await node.badges?.[0].onClick?.();

		const { setCommunityPluginEnabled } = await import('../../../src/types/typeObsidian');
		expect(setCommunityPluginEnabled).not.toHaveBeenCalledWith(plugin.app, 'vaultman', false);
		expect(plugin.pluginsIndex.refresh).not.toHaveBeenCalled();
		expect(node.badges?.[0]).toMatchObject({
			icon: 'lucide-shield',
			quickAction: true,
		});
	});

	it('registers a binding-note context action for plugin nodes', async () => {
		const plugin = makePlugin([
			{ id: 'calendar', pluginId: 'calendar', name: 'Calendar', enabled: true, loaded: true },
		]);
		const explorer = new explorerPlugins(plugin);
		const node = explorer.getTree()[0];
		const action = (
			plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls.find(([candidate]) => candidate.id === 'plugin.bindingNote')?.[0];

		expect(action).toBeTruthy();
		await action.run({ nodeType: 'plugin', node, surface: 'panel' });

		expect(plugin.nodeBindingService?.bindOrCreate).toHaveBeenCalledWith({
			kind: 'plugin',
			label: 'Calendar',
			pluginId: 'calendar',
		});
	});
});
