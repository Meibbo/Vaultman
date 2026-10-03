import type { App } from 'obsidian';

import {
	executeSettingSceneActivation,
	openSettingsTabById,
	type SettingSceneActivationOutcome,
} from './logicSettingSceneActivation';

/** Native community-plugins tab id for browse/restricted-mode navigation. */
export const COMMUNITY_PLUGINS_TAB_ID = 'community-plugins';

/** Native definition name of the restricted-mode setting (English vaults). */
export const RESTRICTED_MODE_DEFINITION = 'Restricted mode';

export type BrowseCommunityPluginsOutcome = 'opened' | 'tab-only' | 'failed';

/** Capture only the callbacks published by Obsidian's native community menu. */
interface NativeMenuItem {
	setSection(section: string): NativeMenuItem;
	setIcon(icon: string): NativeMenuItem;
	setTitle(title: string): NativeMenuItem;
	setWarning(warning: boolean): NativeMenuItem;
	onClick(action: () => unknown): NativeMenuItem;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function nativeCommunityPluginAction(
	app: unknown,
	pluginId: string,
	icon: string,
): (() => unknown) | undefined {
	if (!isRecord(app) || !isRecord(app.plugins) || !isRecord(app.plugins.manifests) || !isRecord(app.setting)) return;
	const manifest = app.plugins.manifests[pluginId];
	if (!isRecord(manifest) || !Array.isArray(app.setting.settingTabs)) return;
	const tab: unknown = app.setting.settingTabs.find((candidate: unknown) =>
		isRecord(candidate) && candidate.id === 'community-plugins');
	if (!isRecord(tab) || typeof tab.buildPluginActionsMenu !== 'function') return;
	const actions = new Map<string, () => unknown>();
	const menu = {
		addSections(_sections: readonly string[]) { return menu; },
		addItem(configure: (item: NativeMenuItem) => unknown) {
			let itemIcon = '';
			const item: NativeMenuItem = {
				setSection: () => item,
				setIcon(value) { itemIcon = value; return item; },
				setTitle: () => item,
				setWarning: () => item,
				onClick(action) { actions.set(itemIcon, action); return item; },
			};
			configure(item);
			return menu;
		},
	};
	// The native callbacks close over their tab, preserving the browse/funding
	// modal behavior and platform gating instead of replacing it with URLs.
	tab.buildPluginActionsMenu.call(tab, menu, manifest);
	return actions.get(icon);
}

interface NativeSettingButton {
	setButtonText(text: string): NativeSettingButton;
	onClick(action: () => unknown): NativeSettingButton;
}

interface NativeSettingStub {
	addButton(configure: (button: NativeSettingButton) => unknown): NativeSettingStub;
	setDesc(desc: unknown): NativeSettingStub;
	setName(name: unknown): NativeSettingStub;
}

function communityPluginsTab(app: unknown): Record<string, unknown> | undefined {
	if (!isRecord(app) || !isRecord(app.setting)) return undefined;
	const tabs = app.setting.settingTabs;
	if (!Array.isArray(tabs)) return undefined;
	const tab = tabs.find((candidate: unknown) =>
		isRecord(candidate) && candidate.id === COMMUNITY_PLUGINS_TAB_ID);
	return isRecord(tab) ? tab : undefined;
}

/**
 * Capture the native Browse callback from the community-plugins tab's own
 * setting definitions. The callback closes over the native browser modal
 * (`new Browser(app).open()`), so invoking it preserves the exact native
 * behavior instead of reimplementing the browser entry. Only the
 * `Community plugins` section render is executed, with a stub Setting, so
 * no DOM is touched and other sections never run.
 */
export function nativeBrowseCommunityPlugins(
	app: unknown,
): (() => unknown) | undefined {
	const tab = communityPluginsTab(app);
	if (!tab || typeof tab.getSettingDefinitions !== 'function') return undefined;
	let definitions: unknown;
	try {
		definitions = (tab.getSettingDefinitions as () => unknown).call(tab);
	} catch {
		return undefined;
	}
	if (!Array.isArray(definitions)) return undefined;
	for (const definition of definitions) {
		if (!isRecord(definition) || typeof definition.render !== 'function') continue;
		if (typeof definition.name !== 'string' || !/community plugins/i.test(definition.name)) continue;
		const clicks: Array<() => unknown> = [];
		const button: NativeSettingButton = {
			setButtonText: () => button,
			onClick: (action) => { clicks.push(action); return button; },
		};
		const setting: NativeSettingStub = {
			addButton: (configure) => { configure(button); return setting; },
			setDesc: () => setting,
			setName: () => setting,
		};
		try {
			(definition.render as (setting: unknown) => unknown).call(tab, setting);
		} catch {
			continue;
		}
		if (clicks.length > 0) return clicks[0];
	}
	return undefined;
}

/**
 * Open the native community plugin browser: opens the community-plugins
 * tab, then invokes the captured native Browse callback. Falls back to the
 * open tab when the callback is unavailable (e.g. non-English section
 * names), never a dead click.
 */
export function browseCommunityPlugins(app: unknown): BrowseCommunityPluginsOutcome {
	if (!openSettingsTabById(app as App, COMMUNITY_PLUGINS_TAB_ID)) return 'failed';
	const browse = nativeBrowseCommunityPlugins(app);
	if (!browse) return 'tab-only';
	browse();
	return 'opened';
}

/**
 * Open the native Restricted mode setting: opens the community-plugins tab
 * and navigates to the exact `Restricted mode` definition with highlight.
 * Degrades to the open tab when the definition is not found; never toggles
 * the mode itself (SASIs must not mutate the vault).
 */
export function openRestrictedModeSetting(app: unknown): SettingSceneActivationOutcome {
	return executeSettingSceneActivation(app as App, {
		kind: 'open-settings-tab',
		tab: COMMUNITY_PLUGINS_TAB_ID,
		target: {
			tab: COMMUNITY_PLUGINS_TAB_ID,
			page: '',
			pagePath: '',
			definition: RESTRICTED_MODE_DEFINITION,
		},
	});
}
