import { describe, expect, it, vi } from 'vitest';
import {
	browseCommunityPlugins,
	nativeBrowseCommunityPlugins,
	nativeCommunityPluginAction,
	openRestrictedModeSetting,
} from '../../src/logic/logicPluginNativeActions';

describe('native community plugin menu callbacks', () => {
	it('retains native callbacks and their manager receiver without opening a substitute URL', () => {
		// Given: a native menu builder whose callback retains the native modal behavior.
		const openNativeModal = vi.fn();
		const manifest = { id: 'example', fundingUrl: { GitHub: 'https://github.com/sponsors/example' } };
		const tab = {
			id: 'community-plugins',
			buildPluginActionsMenu(
				this: { id: string },
				menu: { addItem(configure: (item: { setIcon(icon: string): { onClick(action: () => unknown): unknown } }) => unknown): unknown },
			plugin: typeof manifest,
			) {
				if (this.id !== 'community-plugins') throw new Error('Lost native receiver');
				menu.addItem((item) => item.setIcon('lucide-info').onClick(() => openNativeModal(plugin.id)));
			},
		};
		const app = { plugins: { manifests: { example: manifest } }, setting: { settingTabs: [tab] } };
		// When: Vaultman invokes the published native details action.
		nativeCommunityPluginAction(app, 'example', 'lucide-info')?.();
		// Then: the native callback executes with the installed plugin identity.
		expect(openNativeModal).toHaveBeenCalledWith('example');
		expect(nativeCommunityPluginAction(app, 'core-plugin', 'lucide-info')).toBeUndefined();
		expect(nativeCommunityPluginAction(app, 'example', 'lucide-folder-open')).toBeUndefined();
	});
});

describe('native community browser entry', () => {
	type NativeTestButton = {
		setButtonText(text: string): NativeTestButton;
		onClick(action: () => unknown): NativeTestButton;
	};
	type NativeTestSetting = {
		addButton(configure: (button: NativeTestButton) => unknown): NativeTestSetting;
	};

	function communityTab(onBrowse: () => unknown, name = 'Community plugins') {
		return {
			id: 'community-plugins',
			getSettingDefinitions(this: { id: string }) {
				if (this.id !== 'community-plugins') throw new Error('Lost native receiver');
				const render = (setting: NativeTestSetting): unknown =>
					setting.addButton((button: NativeTestButton) =>
						button.setButtonText('Browse').onClick(onBrowse));
				return [{ name, render }];
			},
		};
	}

	function appWithCommunityTab(tab: unknown) {
		return {
			setting: { open: vi.fn(), openTabById: vi.fn(), settingTabs: [tab] },
		};
	}

	it('invokes the captured native Browse callback after opening the tab', () => {
		// Given: the native Community plugins section with its Browse button.
		const opened: string[] = [];
		const app = appWithCommunityTab(communityTab(() => { opened.push('browser'); }));
		// When: Vaultman runs the browse action.
		const outcome = browseCommunityPlugins(app);
		// Then: the tab opens and the native browser callback runs.
		expect(outcome).toBe('opened');
		expect(app.setting.open).toHaveBeenCalledTimes(1);
		expect(app.setting.openTabById).toHaveBeenCalledWith('community-plugins');
		expect(opened).toEqual(['browser']);
	});

	it('degrades to the open tab when no Community section exists', () => {
		// Given: definitions without a Community plugins section.
		const app = appWithCommunityTab(communityTab(() => {}, 'Current plugins'));
		// When: Vaultman runs the browse action.
		const outcome = browseCommunityPlugins(app);
		// Then: the tab stays open instead of a dead click.
		expect(outcome).toBe('tab-only');
		expect(app.setting.openTabById).toHaveBeenCalledWith('community-plugins');
	});

	it('fails closed without the native settings API', () => {
		// Given: an app without settings navigation.
		expect(browseCommunityPlugins({})).toBe('failed');
		expect(nativeBrowseCommunityPlugins({})).toBeUndefined();
	});
});

describe('native restricted mode entry', () => {
	function restrictedApp(results: unknown[]) {
		const receivers: unknown[] = [];
		const settings = {
			open: vi.fn(),
			openTabById: vi.fn(),
			searchIndex: { search: vi.fn(() => results) },
			navigateToSearchResult(this: unknown) { receivers.push(this); },
		};
		return { app: { setting: settings }, settings, receivers };
	}

	const restrictedGroup = {
		tab: { id: 'community-plugins' },
		pagePath: [],
		results: [{ entry: { definition: 'Restricted mode' } }],
	};

	it('navigates to the exact Restricted mode definition with its receiver', () => {
		// Given: the native search index resolves Restricted mode.
		const { app, settings, receivers } = restrictedApp([restrictedGroup]);
		// When: Vaultman runs the restricted-mode action.
		const outcome = openRestrictedModeSetting(app);
		// Then: exact navigation runs bound to the native settings manager.
		expect(outcome).toEqual({ status: 'success', destination: 'settings-row' });
		expect(settings.open).toHaveBeenCalledTimes(1);
		expect(receivers).toEqual([settings]);
	});

	it('degrades to the open tab when the definition is missing', () => {
		// Given: the native search index has no Restricted mode entry.
		const { app, settings } = restrictedApp([]);
		// When: Vaultman runs the restricted-mode action.
		const outcome = openRestrictedModeSetting(app);
		// Then: the community tab stays open instead of a dead click.
		expect(outcome).toEqual({ status: 'degraded', reason: 'target-not-found' });
		expect(settings.openTabById).toHaveBeenCalledWith('community-plugins');
	});

	it('fails closed without the native settings API', () => {
		// Given: an app without settings navigation.
		expect(openRestrictedModeSetting({})).toEqual({ status: 'failed' });
	});
});
