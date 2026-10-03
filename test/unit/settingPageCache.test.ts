import { expect, it, vi } from 'vitest';
import { listPluginSettingPages } from '../../src/services/serviceSettingSearchAdapter';

it('keeps a core plugin without a native settings tab a leaf without searching', () => {
	const search = vi.fn((_query: string) => []);
	const app = { setting: { pluginTabs: [], searchIndex: { search } },
		internalPlugins: { plugins: { 'cache-core-no-tab': { enabled: true } } } };
	expect(listPluginSettingPages(app, 'cache-core-no-tab')).toEqual([]);
	expect(search).not.toHaveBeenCalled();
});

it('runs the broad native coverage search once across plugin page discovery', () => {
	const search = vi.fn((_query: string) => []);
	const app = { setting: { pluginTabs: [
		{ id: 'cache-a', name: 'A' }, { id: 'cache-b', name: 'B' },
	], searchIndex: { search } } };
	listPluginSettingPages(app, 'cache-a');
	listPluginSettingPages(app, 'cache-b');
	expect(search.mock.calls.filter(([query]) => query === 'a')).toHaveLength(1);
});

it('keeps native setting-page results scoped to the app instance', () => {
	const first = vi.fn((_query: string) => []);
	const second = vi.fn((_query: string) => []);
	const app = (search: typeof first) => ({ setting: {
		pluginTabs: [{ id: 'cache-isolated', name: 'Same tab' }], searchIndex: { search },
	} });
	listPluginSettingPages(app(first), 'cache-isolated');
	listPluginSettingPages(app(second), 'cache-isolated');
	expect(second).toHaveBeenCalled();
});
