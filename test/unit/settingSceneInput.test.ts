import { describe, expect, it, vi } from 'vitest';

import settingsSource from '../../src/VaultmanSettings.ts?raw';
import pluginsExplorerSource from '../../src/components/containers/explorerPlugins.ts?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import {
	executeSettingSceneActivation,
	hasSettingOpenApi,
	normalizeSettingSceneGoToTarget,
	openSettingsTabById,
	resolveSettingSceneActivation,
} from '../../src/logic/logicSettingSceneActivation';
import {
	normalizeSettingSceneMode,
	resolveSettingSceneContent,
	settingSceneModeToggle,
} from '../../src/logic/logicSettingSceneContent';
import {
	DEFAULT_SETTINGS,
	SETTING_SCENE_GO_TO_TARGETS,
} from '../../src/types/typeSettings';

function mockApp(opts: {
	pluginTabs?: unknown;
	open?: boolean;
	openTabById?: boolean;
} = {}) {
	const open = opts.open === false ? undefined : vi.fn();
	const openTabById = opts.openTabById === false ? undefined : vi.fn();
	return {
		app: {
			setting: {
				pluginTabs: opts.pluginTabs ?? [{ id: 'alpha', name: 'Alpha' }],
				...(open ? { open } : {}),
				...(openTabById ? { openTabById } : {}),
			},
		} as never,
		open,
		openTabById,
	};
}

describe('U130 parity C (F5): settingScene go_to target option', () => {
	it('defaults to modal', () => {
		expect(DEFAULT_SETTINGS.settingSceneGoToTarget).toBe('modal');
		expect(SETTING_SCENE_GO_TO_TARGETS).toEqual(['modal', 'panel_content']);
	});

	it('normalizes unknown values to modal', () => {
		expect(normalizeSettingSceneGoToTarget(undefined)).toBe('modal');
		expect(normalizeSettingSceneGoToTarget('')).toBe('modal');
		expect(normalizeSettingSceneGoToTarget('modal')).toBe('modal');
		expect(normalizeSettingSceneGoToTarget('panel_content')).toBe(
			'panel_content',
		);
		expect(normalizeSettingSceneGoToTarget('PANEL')).toBe('modal');
	});

	it('offers the option in the Settings UI next to search highlights', () => {
		expect(settingsSource).toContain(
			"translate('settings.setting_scene_go_to_target')",
		);
		expect(settingsSource).toContain(
			'this.plugin.settings.settingSceneGoToTarget =',
		);
		expect(settingsSource).toContain('normalizeSettingSceneGoToTarget');
	});

	it('localizes the option in en and es', () => {
		for (const key of [
			'settings.setting_scene_go_to_target',
			'settings.setting_scene_go_to_target.desc',
			'settings.setting_scene_go_to_target.modal',
			'settings.setting_scene_go_to_target.panel_content',
		]) {
			expect(en[key]).toBeTruthy();
			expect(es[key]).toBeTruthy();
			expect(es[key]).not.toBe(en[key]);
		}
	});
});

describe('U130 parity C (F5): open-mode activation routing', () => {
	it('routes plugin rows with a tab to the modal tab', () => {
		expect(
			resolveSettingSceneActivation({
				row: { pluginId: 'alpha', settingsTab: 'alpha', hasPluginTab: true },
				settingApiAvailable: true,
			}),
		).toEqual({ kind: 'open-plugin-tab', pluginId: 'alpha' });
	});

	it('routes settings rows to the exact tab via openTabById', () => {
		expect(
			resolveSettingSceneActivation({
				row: { pluginId: '', settingsTab: 'editor', hasPluginTab: false },
				settingApiAvailable: true,
			}),
		).toEqual({ kind: 'open-settings-tab', tab: 'editor' });
	});

	it('keeps unresolvable rows selection-only', () => {
		expect(
			resolveSettingSceneActivation({
				row: { pluginId: 'orphan', settingsTab: 'orphan', hasPluginTab: false },
				settingApiAvailable: true,
			}),
		).toEqual({ kind: 'select-only', reason: 'plugin-without-tab' });
		expect(
			resolveSettingSceneActivation({
				row: { pluginId: '', settingsTab: '', hasPluginTab: false },
				settingApiAvailable: true,
			}),
		).toEqual({ kind: 'select-only', reason: 'settings-without-tab' });
		expect(
			resolveSettingSceneActivation({
				row: { pluginId: '', settingsTab: 'editor', hasPluginTab: false },
				settingApiAvailable: false,
			}),
		).toEqual({ kind: 'select-only', reason: 'settings-api-missing' });
	});

	it('opens plugin tabs through the openPluginSettings path', () => {
		const { app, open, openTabById } = mockApp();
		expect(
			executeSettingSceneActivation(app, {
				kind: 'open-plugin-tab',
				pluginId: 'alpha',
			}),
		).toEqual({ status: 'success', destination: 'plugin-tab' });
		expect(open).toHaveBeenCalledOnce();
		expect(openTabById).toHaveBeenCalledWith('alpha');
	});

	it('opens native settings tabs without the plugin-tab gate', () => {
		const { app, open, openTabById } = mockApp();
		expect(
			executeSettingSceneActivation(app, {
				kind: 'open-settings-tab',
				tab: 'editor',
			}),
		).toEqual({ status: 'success', destination: 'settings-tab' });
		expect(open).toHaveBeenCalledOnce();
		expect(openTabById).toHaveBeenCalledWith('editor');
	});

	it('preserves the native setting manager receiver when opening an exact definition', () => {
		// Given: native navigation reads its active tab from the manager receiver.
		const { app, open, openTabById } = mockApp();
		const definition = { name: 'Font size' };
		const item = { entry: { definition } };
		const group = { tab: { id: 'appearance' }, pagePath: [], results: [item] };
		const manager = {
			open,
			openTabById,
			activeTab: 'editor',
			searchIndex: { search: () => [group] },
			navigateToSearchResult(this: { activeTab: string }, result: typeof group) {
				this.activeTab = result.tab.id;
			},
		};
		Object.assign(app, { setting: manager });
		// When: the settings row opens its native definition.
		const outcome = executeSettingSceneActivation(app, {
			kind: 'open-settings-tab', tab: 'appearance',
			target: { tab: 'appearance', page: '', pagePath: '', definition: 'Font size' },
		});
		// Then: exact navigation succeeds instead of degrading to the tab top.
		expect(outcome).toEqual({ status: 'success', destination: 'settings-row' });
		expect(manager.activeTab).toBe('appearance');
		expect(openTabById).not.toHaveBeenCalled();
	});

	it('reports failure when the native api cannot open', () => {
		const { app, open, openTabById } = mockApp({
			pluginTabs: [{ id: 'other', name: 'Other' }],
		});
		expect(
			executeSettingSceneActivation(app, {
				kind: 'open-plugin-tab',
				pluginId: 'alpha',
			}),
		).toEqual({ status: 'failed' });
		expect(open).not.toHaveBeenCalled();
		expect(openTabById).not.toHaveBeenCalled();
		expect(
			executeSettingSceneActivation(app, { kind: 'select-only', reason: 'plugin-without-tab' }),
		).toEqual({ status: 'failed' });
	});

	it('opens the requested page when two native pages contain the same definition name', () => {
		const { app, open, openTabById } = mockApp();
		const definition = { name: 'Shared setting' };
		const results = ['First page', 'Second page'].map((page) => ({
			tab: { id: 'appearance' }, page: { name: page }, pagePath: [page],
			results: [{ entry: { definition } }],
		}));
		let selectedPage = '';
		Object.assign(app, { setting: {
			open, openTabById,
			searchIndex: { search: () => results },
			navigateToSearchResult(group: (typeof results)[number]) { selectedPage = group.page.name; },
		} });
		const outcome = executeSettingSceneActivation(app, {
			kind: 'open-settings-tab', tab: 'appearance',
			target: { tab: 'appearance', page: 'Second page', pagePath: 'Second page', definition: 'Shared setting' },
		});
		expect(outcome).toEqual({ status: 'success', destination: 'settings-row' });
		expect(selectedPage).toBe('Second page');
	});

	it('opens settings tabs only with a resolvable target', () => {
		expect(openSettingsTabById({} as never, 'editor')).toBe(false);
		expect(openSettingsTabById({} as never, '')).toBe(false);
		const { app, open } = mockApp({ openTabById: false });
		expect(openSettingsTabById(app, 'editor')).toBe(false);
		expect(open).not.toHaveBeenCalled();
		const full = mockApp();
		expect(openSettingsTabById(full.app, '')).toBe(false);
		expect(full.open).not.toHaveBeenCalled();
		expect(openSettingsTabById(full.app, 'editor')).toBe(true);
		expect(full.openTabById).toHaveBeenCalledWith('editor');
	});

	it('detects the native open api', () => {
		expect(hasSettingOpenApi(mockApp().app)).toBe(true);
		expect(hasSettingOpenApi(mockApp({ open: false }).app)).toBe(false);
		expect(hasSettingOpenApi({} as never)).toBe(false);
	});
});

describe('U130 parity C (F6): explorer/content mode toggle', () => {
	it('defaults to explorer and normalizes unknowns', () => {
		expect(normalizeSettingSceneMode(undefined)).toBe('explorer');
		expect(normalizeSettingSceneMode('explorer')).toBe('explorer');
		expect(normalizeSettingSceneMode('content')).toBe('content');
		expect(normalizeSettingSceneMode('side-by-side')).toBe('explorer');
	});

	it('exposes a checked toggle payload mirroring the mode', () => {
		expect(settingSceneModeToggle('explorer')).toMatchObject({
			id: 'setting-scene-mode',
			checked: false,
			mode: 'explorer',
		});
		expect(settingSceneModeToggle('content')).toMatchObject({
			id: 'setting-scene-mode',
			checked: true,
			mode: 'content',
		});
	});
});

describe('U130 parity C (F6): content renderer bridge (design-02)', () => {
	it('reports no-selection without a row', () => {
		const model = resolveSettingSceneContent({
			rowKind: 'none',
			ref: null,
			label: null,
			tabAvailable: false,
			definition: null,
		});
		expect(model.status).toBe('unavailable');
		expect(model.reason).toBe('no-selection');
	});

	it('reports group and plugin rows as explicitly unavailable', () => {
		expect(
			resolveSettingSceneContent({
				rowKind: 'group',
				ref: null,
				label: null,
				tabAvailable: false,
				definition: null,
			}).reason,
		).toBe('group-node');
		expect(
			resolveSettingSceneContent({
				rowKind: 'plugin',
				ref: null,
				label: 'Alpha',
				tabAvailable: true,
				definition: null,
			}).reason,
		).toBe('plugin-node');
	});

	it('reports removed tabs and missing definitions', () => {
		const ref = { tab: 'alpha', page: '', pagePath: '', definition: 'Opt' };
		expect(
			resolveSettingSceneContent({
				rowKind: 'settings',
				ref,
				label: 'Opt',
				tabAvailable: false,
				definition: { visible: true },
			}).reason,
		).toBe('tab-removed');
		expect(
			resolveSettingSceneContent({
				rowKind: 'settings',
				ref,
				label: 'Opt',
				tabAvailable: true,
				definition: null,
			}).reason,
		).toBe('definition-missing');
	});

	it('never renders visible=false, even from a valid ref', () => {
		const ref = { tab: 'editor', page: '', pagePath: '', definition: 'Opt' };
		const model = resolveSettingSceneContent({
			rowKind: 'settings',
			ref,
			label: 'Opt',
			tabAvailable: true,
			definition: { visible: false, searchable: true },
		});
		expect(model.status).toBe('unavailable');
		expect(model.reason).toBe('hidden-setting');
	});

	it('marks file/folder/secret surfaces unsupported', () => {
		const ref = { tab: 'editor', page: '', pagePath: '', definition: 'Dir' };
		for (const control of ['file', 'folder', 'secret']) {
			const model = resolveSettingSceneContent({
				rowKind: 'settings',
				ref,
				label: 'Dir',
				tabAvailable: true,
				definition: { visible: true, control },
			});
			expect(model.status).toBe('unavailable');
			expect(model.reason).toBe('unsupported-surface');
		}
	});

	it('stays ready for searchable=false from a valid ref', () => {
		const ref = { tab: 'editor', page: '', pagePath: '', definition: 'Opt' };
		const model = resolveSettingSceneContent({
			rowKind: 'settings',
			ref,
			label: 'Opt',
			tabAvailable: true,
			definition: { visible: true, searchable: false, control: 'toggle' },
		});
		expect(model.status).toBe('ready');
		expect(model.reason).toBeUndefined();
		expect(model.ref).toEqual(ref);
		expect(model.label).toBe('Opt');
		expect(model.assumptions.length).toBeGreaterThan(0);
	});
});

describe('U130 parity C: explorer wiring guards', () => {
	it('routes open-mode activation through the settingScene bridge', () => {
		expect(pluginsExplorerSource).toContain('_activateSettingSceneRow');
		expect(pluginsExplorerSource).toContain('resolveSettingSceneActivation');
		expect(pluginsExplorerSource).toContain('executeSettingSceneActivation');
		expect(pluginsExplorerSource).toContain('settingSceneGoToTarget');
	});

	it('exposes scene-local mode state and the toolbar toggle', () => {
		expect(pluginsExplorerSource).toContain('getSettingSceneMode');
		expect(pluginsExplorerSource).toContain('setSettingSceneMode');
		expect(pluginsExplorerSource).toContain('getSettingSceneModeToggle');
		expect(pluginsExplorerSource).toContain('getSettingSceneContent');
	});

	it('keeps the config cell and select mode paths intact', () => {
		expect(pluginsExplorerSource).toContain("cellId === 'config'");
		expect(pluginsExplorerSource).toContain('openPluginSettings');
		expect(pluginsExplorerSource).toContain('_toggleRowSelection');
	});
});
