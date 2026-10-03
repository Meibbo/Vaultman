import { describe, expect, it, vi } from 'vitest';
import { nativeCommunityPluginAction } from '../../src/logic/logicPluginNativeActions';

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
