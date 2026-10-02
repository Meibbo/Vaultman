import { describe, expect, it } from 'vitest';
import { listCorePluginStubs } from '../../src/logic/logicAddonExplorer';

describe('core plugin discovery', () => {
	it('includes core plugins without settings tabs from the runtime registry', () => {
		const app = {
			setting: { pluginTabs: [{ id: 'backlink', name: 'Backlinks' }] },
			internalPlugins: { plugins: {
				graph: { enabled: true, instance: { name: 'Graph view' } },
				templates: { enabled: false, instance: { name: 'Templates' } },
				backlink: { enabled: true, instance: { name: 'Backlinks' } },
			} },
		};
		const stubs = listCorePluginStubs(app, []);
		expect(stubs).toEqual(expect.arrayContaining([
			{ pluginId: 'graph', name: 'Graph view', enabled: true },
			{ pluginId: 'templates', name: 'Templates', enabled: false },
		]));
		expect(stubs.filter(stub => stub.pluginId === 'backlink')).toHaveLength(1);
	});

	it('reads enabled state from the app-level internal plugin manager', () => {
		const app = {
			setting: { pluginTabs: [{ id: 'templates', name: 'Templates' }] },
			internalPlugins: { getEnabledPluginById: () => null },
		};
		expect(listCorePluginStubs(app, [])).toEqual([
			{ pluginId: 'templates', name: 'Templates', enabled: false },
		]);
	});

	it('excludes community IDs and discovers core plugins before settings tabs exist', () => {
		const app = { internalPlugins: { plugins: {
			graph: { enabled: true, instance: { name: 'Graph view' } },
		} } };
		expect(listCorePluginStubs(app, [' GRAPH '])).toEqual([]);
		expect(listCorePluginStubs(app, [])).toHaveLength(1);
	});
});
