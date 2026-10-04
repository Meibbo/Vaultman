import type { App } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import { PluginsExplorerPanel } from '../../src/components/containers/explorerPlugins';
import { translate } from '../../src/i18n/index';
import { createPluginUpdatesService } from '../../src/services/servicePluginUpdates';
import {
	isPluginUpdateToolbarActionVisible,
	pluginUpdateTargetLabel,
} from '../../src/services/pendingUpdateSupport';

interface ToolbarTestPanel {
	plugin: {
		pluginUpdatesService: {
			getPluginUpdates: () => readonly { id: string; version: string }[];
			getPluginUpdate: (id: string) => { id: string; version: string } | undefined;
			isUpdating: (id: string) => boolean;
			onChanged: (callback: () => void) => () => void;
		};
		app: App;
		settings: Record<string, unknown>;
	};
	dataSource?: { providerId?: string };
	entries: Array<{ pluginId: string }>;
}

function panel(updates: Array<{ id: string; version: string }>, entryIds: string[], providerId?: string) {
	const listeners = new Set<() => void>();
	const service = {
		getPluginUpdates: () => updates,
		getPluginUpdate: (id: string) => updates.find((update) => update.id === id),
		isUpdating: () => false,
		onChanged: vi.fn((callback: () => void) => {
			listeners.add(callback);
			return () => listeners.delete(callback);
		}),
	};
	const value = Object.create(PluginsExplorerPanel.prototype) as PluginsExplorerPanel;
	const state = value as unknown as ToolbarTestPanel;
	state.plugin = { pluginUpdatesService: service, app: {} as App, settings: {} };
	state.entries = entryIds.map((pluginId) => ({ pluginId }));
	if (providerId) state.dataSource = { providerId };
	return { panel: value, service, listeners };
}

describe('plugin update toolbar eligibility (C2/C4)', () => {
	it('hides update-all when the owning native panel has no eligible discoveries', () => {
		const { panel: explorer } = panel([{ id: 'outside', version: '2.0.0' }], ['alpha']);
		expect(explorer.getPendingUpdateCount()).toBe(0);
		expect(isPluginUpdateToolbarActionVisible('update_all_plugins', explorer.getPendingUpdateCount())).toBe(false);
	});

	it('shows update-all for one or more eligible discoveries in the native panel', () => {
		const { panel: explorer } = panel([
			{ id: 'alpha', version: '2.0.0' },
			{ id: 'beta', version: '3.0.0' },
		], ['alpha', 'beta']);
		expect(explorer.getPendingUpdateCount()).toBe(2);
		expect(isPluginUpdateToolbarActionVisible('update_all_plugins', explorer.getPendingUpdateCount())).toBe(true);
	});

	it('ignores pending IDs outside the owning native plugin scene', () => {
		const { panel: explorer } = panel([{ id: 'other-scene', version: '2.0.0' }], ['alpha']);
		expect(explorer.getPendingUpdateCount()).toBe(0);
	});

	it('does not claim native updates from the non-native data-source scene', () => {
		const { panel: explorer } = panel([{ id: 'alpha', version: '2.0.0' }], ['alpha'], 'sasi');
		expect(explorer.getPendingUpdateCount()).toBe(0);
	});

	it('keeps the sibling check action visible and invokable at zero pending', () => {
		expect(isPluginUpdateToolbarActionVisible('check_plugin_updates', 0)).toBe(true);
	});

	it('refreshes eligible count after discovery, failure, and installed-version clear', async () => {
		let fail = false;
		const plugins = {
			manifests: { alpha: { id: 'alpha', name: 'Alpha', version: '1.0.0' } },
			updates: { alpha: { repo: 'owner/alpha', version: '2.0.0', manifest: { id: 'alpha', name: 'Alpha' } } } as Record<string, unknown>,
			checkForUpdates: vi.fn(async () => { if (fail) throw new Error('network failed'); }),
			installPlugin: vi.fn(),
		};
		const service = createPluginUpdatesService({ plugins } as unknown as App, { throttleMs: 0, pendingStore: null });
		const { panel: explorer } = panel([], ['alpha']);
		await service.whenHydrated();
		const state = explorer as unknown as ToolbarTestPanel;
		state.plugin.pluginUpdatesService = service;
		let changes = 0;
		const stop = explorer.onPendingUpdatesChanged(() => { changes += 1; });

		await service.checkPluginUpdates();
		expect(explorer.getPendingUpdateCount()).toBe(1);
		fail = true;
		await service.checkPluginUpdates();
		expect(explorer.getPendingUpdateCount()).toBe(1);
		(plugins.manifests.alpha as { version: string }).version = '2.0.0';
		plugins.updates = {};
		fail = false;
		await service.checkPluginUpdates();
		expect(explorer.getPendingUpdateCount()).toBe(0);
		expect(changes).toBe(3);
		stop();
	});

	it('forwards refresh changes and unsubscribes from the service', () => {
		const { panel: explorer, listeners, service } = panel([], []);
		const callback = vi.fn();
		const stop = explorer.onPendingUpdatesChanged(callback);
		for (const listener of listeners) listener();
		expect(callback).toHaveBeenCalledTimes(1);
		stop();
		expect(listeners.size).toBe(0);
		expect(service.onChanged).toHaveBeenCalledTimes(1);
	});

	it('passes the cached target into the production row badge label consumed as its tooltip', () => {
		const { panel: explorer } = panel([{ id: 'alpha', version: '2.7.4-beta.2' }], ['alpha']);
		const state = explorer as unknown as {
			plugin: ToolbarTestPanel['plugin'] & { queueService: { queue: never[] } };
			pendingUpdateIds: Set<string>;
			pendingToggleIds: Set<string>;
			cellStyle: string;
			buildPluginNodes(entries: Array<{ pluginId: string; name: string; version: string; enabled: boolean }>): Array<{ cells: Array<{ id: string; label?: string }> }>;
		};
		state.plugin.queueService = { queue: [] };
		state.pendingUpdateIds = new Set();
		state.pendingToggleIds = new Set();
		state.cellStyle = 'native';
		const [node] = state.buildPluginNodes([{ pluginId: 'alpha', name: 'Alpha', version: '1.0.0', enabled: true }]);

		expect(node.cells.find((cell) => cell.id === 'cell_update')?.label)
			.toBe(translate('addons.update_to', { version: '2.7.4-beta.2' }));
	});

	it('carries the cached target version into the row action tooltip label', () => {
		expect(pluginUpdateTargetLabel('2.7.4-beta.2')).toContain('2.7.4-beta.2');
	});
});
