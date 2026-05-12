import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { mount, unmount, flushSync, type Component } from 'svelte';
import SettingsUI from '../../src/components/settings/SettingsUI.svelte';
import {
	DEFAULT_SETTINGS,
	type iVaultmanPlugin,
	type VaultmanSettings,
} from '../../src/types/typeSettings';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';
import { LeafDetachService } from '../../src/services/serviceLeafDetach';

beforeAll(() => {
	installObsidianDomPolyfill();
});

interface FakePlugin {
	settings: VaultmanSettings;
	saveSettings: ReturnType<typeof vi.fn>;
	updateGlassBlur: ReturnType<typeof vi.fn>;
}

function makeFakePlugin(): FakePlugin {
	return {
		settings: structuredClone(DEFAULT_SETTINGS),
		saveSettings: vi.fn(async () => {}),
		updateGlassBlur: vi.fn(),
	};
}

async function makeFakePluginWithLeafDetach(): Promise<FakePlugin & { leafDetachService: LeafDetachService }> {
	const leafDetachService = new LeafDetachService({
		store: {
			loadData: async () => ({}),
			saveData: async () => undefined,
		},
		host: {
			spawnLeaf: async () => undefined,
			closeLeaf: async () => undefined,
		},
	});
	await leafDetachService.load();
	return {
		...makeFakePlugin(),
		leafDetachService,
	};
}

describe('SettingsUI mount (regression: effect_update_depth_exceeded)', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		vi.stubGlobal('activeDocument', document);
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	it('mounts without throwing and renders .vm-settings root', () => {
		const plugin = makeFakePlugin();

		// If SettingsUI re-introduces a blanket $effect autosave loop, Svelte
		// will throw `effect_update_depth_exceeded` inside flushSync(), which
		// fails this test naturally — no extra assertion needed.
		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		const root = target.querySelector('.vm-settings');
		expect(root).not.toBeNull();
	});

	it('does not call saveSettings or updateGlassBlur during mount', () => {
		const plugin = makeFakePlugin();

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		expect(plugin.saveSettings).not.toHaveBeenCalled();
		expect(plugin.updateGlassBlur).not.toHaveBeenCalled();
	});

	it('does not mutate plugin.settings during mount', () => {
		const plugin = makeFakePlugin();
		const before = JSON.stringify(plugin.settings);

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		expect(JSON.stringify(plugin.settings)).toBe(before);
	});

	it('renders the grid hierarchy mode setting without autosaving on mount', () => {
		const plugin = makeFakePlugin();

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		expect(target.textContent).toContain('Grid hierarchy mode');
		expect(target.textContent).toContain('Folder navigation');
		expect(target.textContent).toContain('Inline expansion');
		const inlineOption = [...target.querySelectorAll('option')].find(
			(option) => option.textContent === 'Inline expansion',
		);
		expect(inlineOption?.disabled).toBe(false);
		expect(plugin.saveSettings).not.toHaveBeenCalled();
		expect(plugin.settings.gridHierarchyMode).toBe('folder');
	});

	it('persists inline grid hierarchy mode when selected', () => {
		const plugin = makeFakePlugin();

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		const select = [...target.querySelectorAll('select')].find((candidate) =>
			[...candidate.options].some((option) => option.textContent === 'Inline expansion'),
		) as HTMLSelectElement;
		select.value = 'inline';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(plugin.settings.gridHierarchyMode).toBe('inline');
		expect(plugin.saveSettings).toHaveBeenCalledOnce();
	});

	it('persists layout dock, drawer, and tab label placement settings', () => {
		const plugin = makeFakePlugin();

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		expect(target.textContent).toContain('Dock content');
		expect(target.textContent).toContain('Dock presentation');
		expect(target.textContent).toContain('Top tabs content');
		expect(target.textContent).toContain('Primary node action');

		const showDockLabels = [...target.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
			.find((candidate) => candidate.closest('label')?.textContent?.includes('Show dock labels'));
		expect(showDockLabels).toBeTruthy();
		const selectByLabel = (label: string): HTMLSelectElement => {
			const found = [...target.querySelectorAll<HTMLSelectElement>('select')].find((candidate) =>
				candidate.closest('label')?.textContent?.includes(label),
			);
			expect(found, label).toBeTruthy();
			return found!;
		};

		showDockLabels!.checked = true;
		showDockLabels!.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(plugin.settings.layout?.dock.labels.visible).toBe(true);
		expect(plugin.saveSettings).toHaveBeenCalledOnce();

		const presentation = selectByLabel('Dock presentation');
		presentation.value = 'drawer';
		presentation.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(plugin.settings.layout?.dock.presentation.mode).toBe('drawer');

		const direction = selectByLabel('Dock drawer direction');
		direction.value = 'left';
		direction.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(plugin.settings.layout?.dock.presentation.drawerDirection).toBe('left');

		const topTabsContent = selectByLabel('Top tabs content');
		topTabsContent.value = 'tool-tabs';
		topTabsContent.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(plugin.settings.layout?.tabs.content).toBe('tool-tabs');
		expect(plugin.saveSettings).toHaveBeenCalledTimes(4);
	});

	it('persists faint accent focus mode without autosaving on mount', () => {
		const plugin = makeFakePlugin();

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		const toggle = [...target.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(
			(candidate) =>
				candidate.closest('label')?.textContent?.includes('Faint accents during workspace focus'),
		);
		expect(toggle).toBeTruthy();
		expect(plugin.saveSettings).not.toHaveBeenCalled();

		toggle!.checked = true;
		toggle!.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(plugin.settings.faintAccentsWhenWorkspaceFocused).toBe(true);
		expect(plugin.updateGlassBlur).toHaveBeenCalledOnce();
		expect(plugin.saveSettings).toHaveBeenCalledOnce();
	});

	it('renders layout themes including disabled custom placeholder without autosaving', () => {
		const plugin = makeFakePlugin();

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		const themeSelect = [...target.querySelectorAll('select')].find((candidate) =>
			[...candidate.options].some((option) => option.textContent === 'Create your own'),
		) as HTMLSelectElement;

		expect(themeSelect).toBeTruthy();
		expect([...themeSelect.options].map((option) => option.textContent)).toEqual([
			'Default',
			'Polish',
			'Glass',
			'Create your own',
		]);
		expect([...themeSelect.options].find((option) => option.value === 'custom')?.disabled).toBe(
			true,
		);
		expect(plugin.saveSettings).not.toHaveBeenCalled();
	});

	it('persists node surface and matched-filter decoration toggles', () => {
		const plugin = makeFakePlugin();

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		const checkboxByLabel = (label: string): HTMLInputElement => {
			const found = [...target.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(
				(candidate) => candidate.closest('label')?.textContent?.includes(label),
			);
			expect(found, label).toBeTruthy();
			return found!;
		};

		const matchedFilters = checkboxByLabel('Matched filter node decorations');
		const backgrounds = checkboxByLabel('Node backgrounds');
		const borders = checkboxByLabel('Node borders');

		expect(matchedFilters.checked).toBe(false);
		expect(backgrounds.checked).toBe(true);
		expect(borders.checked).toBe(true);
		expect(plugin.saveSettings).not.toHaveBeenCalled();

		matchedFilters.checked = true;
		matchedFilters.dispatchEvent(new Event('change', { bubbles: true }));
		backgrounds.checked = false;
		backgrounds.dispatchEvent(new Event('change', { bubbles: true }));
		borders.checked = false;
		borders.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(plugin.settings.explorerShowMatchedFilterDecorations).toBe(true);
		expect(plugin.settings.explorerNodeBackgrounds).toBe(false);
		expect(plugin.settings.explorerNodeBorders).toBe(false);
		expect(plugin.saveSettings).toHaveBeenCalledTimes(3);
	});

	it('persists the Files explorer folders-first toggle', () => {
		const plugin = makeFakePlugin();

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		const foldersFirst = [...target.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(
			(candidate) => candidate.closest('label')?.textContent?.includes('Folders first in Files'),
		);

		expect(foldersFirst).toBeTruthy();
		expect(foldersFirst!.checked).toBe(true);
		expect(plugin.saveSettings).not.toHaveBeenCalled();

		foldersFirst!.checked = false;
		foldersFirst!.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(plugin.settings.explorerFilesFoldersFirst).toBe(false);
		expect(plugin.saveSettings).toHaveBeenCalledOnce();
	});

	it('does not render the detachable leaf toggle because it belongs in PageTools Layout', async () => {
		const plugin = await makeFakePluginWithLeafDetach();

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		expect(target.textContent).not.toContain('All tabs as independent leaves');
	});
});
