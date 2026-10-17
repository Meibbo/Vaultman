import { describe, expect, it, vi } from 'vitest';
import { createApiSceneDataSource } from '../../src/logic/logicApiSceneDataSource';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { summarizeGroupToggleState } from '../../src/logic/logicAddonGroupToggle';
import type { VaultmanPlugin } from '../../src/main';

describe('ApiScene group toggle 3-state live update', () => {
	function createMockPlugin(): VaultmanPlugin {
		const registry = createSasiRegistry();
		registry.register({
			id: 'vaultman:test-cmd-1',
			axis: 'function',
			kind: 'command',
			labelKey: 'Test Command 1',
			supports: [],
		});
		registry.register({
			id: 'vaultman:test-cmd-2',
			axis: 'function',
			kind: 'command',
			labelKey: 'Test Command 2',
			supports: [],
		});

		const publishedMap: Record<string, boolean> = {
			'vaultman:test-cmd-1': false,
			'vaultman:test-cmd-2': false,
		};

		return {
			app: {
				commands: { commands: {} },
				plugins: { manifests: {} },
			},
			settings: {
				sasiPublishedCommands: publishedMap,
			},
			sasiRegistry: registry,
			sasiProvider: {
				lifecycleFor: () => undefined,
			},
			sasiCommandPublisher: {
				isPublishable: () => true,
				isPublished: (id: string) => publishedMap[id] ?? false,
				setPublished: (id: string, published: boolean) => {
					publishedMap[id] = published;
				},
				snapshot: () => [
					{ id: 'vaultman:test-cmd-1' },
					{ id: 'vaultman:test-cmd-2' },
				],
			},
			saveData: vi.fn().mockResolvedValue(undefined),
		} as unknown as VaultmanPlugin;
	}

	it('toggles group members and updates published state with live 3 states', () => {
		const plugin = createMockPlugin();
		const dataSource = createApiSceneDataSource(plugin);

		expect(dataSource.toggleGroup).toBeDefined();

		// Initially both are disabled
		const initialNodes = dataSource.nodes();
		// Find command nodes (they might be nested under groups/subgroups or top level)
		const findInTree = (nodes: readonly any[], idSub: string): any => {
			for (const n of nodes) {
				if (n.id.includes(idSub)) return n;
				if (n.children?.length) {
					const found = findInTree(n.children, idSub);
					if (found) return found;
				}
			}
			return undefined;
		};
		const cmd1 = findInTree(initialNodes, 'test-cmd-1');
		const cmd2 = findInTree(initialNodes, 'test-cmd-2');
		expect(cmd1?.meta.enabled).toBe(false);
		expect(cmd2?.meta.enabled).toBe(false);

		const initialSummary = summarizeGroupToggleState([
			cmd1?.meta.enabled ?? false,
			cmd2?.meta.enabled ?? false,
		]);
		expect(initialSummary).toEqual({ enabled: false, mixed: false });

		// Toggle group on
		dataSource.toggleGroup?.('commands', [cmd1!.id, cmd2!.id]);

		const afterOnNodes = dataSource.nodes();
		const cmd1On = findInTree(afterOnNodes, 'test-cmd-1');
		const cmd2On = findInTree(afterOnNodes, 'test-cmd-2');
		expect(cmd1On?.meta.enabled).toBe(true);
		expect(cmd2On?.meta.enabled).toBe(true);

		const onSummary = summarizeGroupToggleState([
			cmd1On?.meta.enabled ?? false,
			cmd2On?.meta.enabled ?? false,
		]);
		expect(onSummary).toEqual({ enabled: true, mixed: false });

		// Individual toggle one off to create mixed state
		dataSource.cell(cmd1!.id, 'state');

		const mixedNodes = dataSource.nodes();
		const cmd1Mixed = findInTree(mixedNodes, 'test-cmd-1');
		const cmd2Mixed = findInTree(mixedNodes, 'test-cmd-2');
		expect(cmd1Mixed?.meta.enabled).toBe(false);
		expect(cmd2Mixed?.meta.enabled).toBe(true);

		const mixedSummary = summarizeGroupToggleState([
			cmd1Mixed?.meta.enabled ?? false,
			cmd2Mixed?.meta.enabled ?? false,
		]);
		expect(mixedSummary).toEqual({ enabled: false, mixed: true });

		// Toggle group from mixed state: turns all OFF
		dataSource.toggleGroup?.('commands', [cmd1!.id, cmd2!.id]);

		const allOffNodes = dataSource.nodes();
		const cmd1Off = findInTree(allOffNodes, 'test-cmd-1');
		const cmd2Off = findInTree(allOffNodes, 'test-cmd-2');
		expect(cmd1Off?.meta.enabled).toBe(false);
		expect(cmd2Off?.meta.enabled).toBe(false);

		const offSummary = summarizeGroupToggleState([
			cmd1Off?.meta.enabled ?? false,
			cmd2Off?.meta.enabled ?? false,
		]);
		expect(offSummary).toEqual({ enabled: false, mixed: false });
	});
});
