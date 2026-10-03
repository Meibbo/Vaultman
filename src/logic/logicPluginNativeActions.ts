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
