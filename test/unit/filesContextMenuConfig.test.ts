import { describe, expect, it } from 'vitest';

import {
	FILES_MENU_DEFAULT_ORDER,
	isNativePanelActionId,
	nativePanelActionId,
	addFilesMenuDivider,
	addFilesMenuSubmenu,
	defaultFilesMenuLayout,
	mergeFilesMenuLayout,
	normalizeFilesMenuLayout,
	projectFilesMenu,
	removeFilesMenuItem,
	reorderFilesMenuItems,
	setFilesMenuParent,
	setFilesMenuVisibility,
	type FilesMenuItem,
} from '../../src/logic/logicFilesContextMenu';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import contextMenuSource from '../../src/services/serviceContextMenu.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';

const CATALOG = [
	'file.open_tab',
	'file.open_right',
	'file.open_window',
	'file.make_copy',
	'file.rename',
	'file.delete',
	'folder.new_note',
	'folder.delete',
];

const actionIds = (items: readonly FilesMenuItem[]) =>
	items.filter((item) => item.kind === 'action').map((item) => item.id);

describe('BT5-018 Files context menu configuration', () => {
	it('defaults to the Core Files order, keeping only what the registry offers', () => {
		const layout = defaultFilesMenuLayout(CATALOG);
		expect(actionIds(layout)).toEqual([
			'file.open_tab',
			'file.open_right',
			'file.open_window',
			'folder.new_note',
			'file.make_copy',
			'file.rename',
			'file.delete',
			'folder.delete',
		]);
		expect(layout.every((item) => item.kind !== 'action' || item.visible)).toBe(
			true,
		);
		expect(DEFAULT_SETTINGS.filesContextMenuLayout).toEqual([]);
	});

	it('appends an action the default order never named', () => {
		const layout = defaultFilesMenuLayout([...CATALOG, 'file.brand_new']);
		expect(FILES_MENU_DEFAULT_ORDER).not.toContain('file.brand_new');
		expect(actionIds(layout).at(-1)).toBe('file.brand_new');
	});

	it('merges a future action into its canonical place, by id', () => {
		const saved: FilesMenuItem[] = [
			{ kind: 'action', id: 'file.delete', visible: true },
			{ kind: 'action', id: 'file.open_tab', visible: false },
		];
		// `file.rename` ranks before `file.delete` in the default order, so it
		// lands there rather than at the end of the saved list.
		const merged = mergeFilesMenuLayout(saved, [
			'file.delete',
			'file.open_tab',
			'file.rename',
		]);
		expect(actionIds(merged)).toEqual([
			'file.rename',
			'file.delete',
			'file.open_tab',
		]);
		// A saved hidden flag survives the merge.
		expect(
			merged.find((item) => item.id === 'file.open_tab'),
		).toMatchObject({ visible: false });
	});

	it('loads a config whose ids were retired without breaking', () => {
		const merged = mergeFilesMenuLayout(
			[
				{ kind: 'action', id: 'file.gone_forever', visible: true },
				{ kind: 'action', id: 'file.rename', visible: true },
			],
			['file.rename'],
		);
		expect(actionIds(merged)).toEqual(['file.rename']);
		expect(mergeFilesMenuLayout('not an array', CATALOG)).toEqual(
			defaultFilesMenuLayout(CATALOG),
		);
	});

	it('never keeps a leading, trailing or doubled divider', () => {
		const normalized = normalizeFilesMenuLayout([
			{ kind: 'divider', id: 'divider:1' },
			{ kind: 'action', id: 'file.rename', visible: true },
			{ kind: 'divider', id: 'divider:2' },
			{ kind: 'divider', id: 'divider:3' },
			{ kind: 'action', id: 'file.delete', visible: true },
			{ kind: 'divider', id: 'divider:4' },
		]);
		expect(normalized.map((item) => item.id)).toEqual([
			'file.rename',
			'divider:2',
			'file.delete',
		]);
	});

	it('adds dividers and submenus with ids that never collide', () => {
		let layout: FilesMenuItem[] = [
			{ kind: 'divider', id: 'divider:7' },
			{ kind: 'action', id: 'file.rename', visible: true },
		];
		layout = addFilesMenuDivider(layout);
		expect(layout.at(-1)?.id).toBe('divider:8');

		layout = addFilesMenuSubmenu(layout, 'Convert');
		const submenu = layout.at(-1);
		expect(submenu).toMatchObject({ kind: 'submenu', label: 'Convert' });

		// An empty submenu is dropped; a populated one survives.
		expect(normalizeFilesMenuLayout(layout).map((item) => item.id)).not.toContain(
			submenu?.id,
		);
		const populated = setFilesMenuParent(
			layout,
			'file.rename',
			submenu?.id ?? '',
		);
		expect(normalizeFilesMenuLayout(populated).map((item) => item.id)).toContain(
			submenu?.id,
		);
	});

	it('detaches its children when a submenu is removed', () => {
		const layout: FilesMenuItem[] = [
			{ kind: 'submenu', id: 'submenu:1', label: 'Convert' },
			{ kind: 'action', id: 'file.rename', visible: true, parent: 'submenu:1' },
		];
		const removed = removeFilesMenuItem(layout, 'submenu:1');
		expect(removed).toEqual([
			{ kind: 'action', id: 'file.rename', visible: true },
		]);
	});

	it('reorders by drag and drop without losing an entry', () => {
		const layout = defaultFilesMenuLayout(CATALOG);
		const moved = reorderFilesMenuItems(layout, 'file.delete', 'file.open_tab');
		expect(actionIds(moved)[0]).toBe('file.delete');
		expect(moved).toHaveLength(layout.length);
		// An unknown target leaves the list untouched.
		expect(reorderFilesMenuItems(layout, 'file.delete', 'nope')).toEqual(layout);
	});

	it('projects exactly what the menu should emit', () => {
		let layout = defaultFilesMenuLayout(CATALOG);
		layout = setFilesMenuVisibility(layout, 'file.delete', false);
		layout = addFilesMenuSubmenu(layout, 'Convert');
		const submenu = layout.at(-1);
		layout = setFilesMenuParent(layout, 'file.rename', submenu?.id ?? '');

		const steps = projectFilesMenu(layout, CATALOG);
		expect(steps.map((step) => step.id)).not.toContain('file.delete');
		expect(steps.find((step) => step.id === 'file.rename')?.submenu).toBe(
			'Convert',
		);
		// Actions the context cannot offer right now drop out too, and the
		// dividers around them collapse instead of stacking.
		const narrow = projectFilesMenu(layout, ['file.open_tab', 'folder.delete']);
		expect(narrow.map((step) => step.kind)).toEqual([
			'action',
			'divider',
			'action',
		]);
		expect(narrow.map((step) => step.id).filter((id) => !id.startsWith('divider:'))).toEqual([
			'file.open_tab',
			'folder.delete',
		]);
	});

	it('derives a stable, collision-proof id for an intercepted item', () => {
		expect(nativePanelActionId('Open in new tab')).toBe(
			'native:open-in-new-tab',
		);
		expect(nativePanelActionId('  Rename…  ')).toBe('native:rename');
		expect(isNativePanelActionId('native:rename')).toBe(true);
		expect(isNativePanelActionId('file.rename')).toBe(false);
	});

	it('leads the default layout with intercepted items, in discovery order', () => {
		const nativeA = nativePanelActionId('Open in new tab');
		const nativeB = nativePanelActionId('Reveal in navigation');
		const layout = defaultFilesMenuLayout([nativeA, nativeB, ...CATALOG]);
		const ids = actionIds(layout);
		expect(ids.slice(0, 2)).toEqual([nativeA, nativeB]);
		// A Vaultman action still follows in its Core-Files position.
		expect(ids.indexOf('file.open_tab')).toBeGreaterThan(1);
	});

	it('merges a newly intercepted item to the front, not the tail', () => {
		const known = nativePanelActionId('Rename');
		const fresh = nativePanelActionId('Pin to top');
		const saved: FilesMenuItem[] = [
			{ kind: 'action', id: known, visible: true },
			{ kind: 'action', id: 'file.delete', visible: true },
		];
		const merged = mergeFilesMenuLayout(saved, [
			known,
			fresh,
			'file.delete',
		]);
		expect(actionIds(merged)[0]).toBe(fresh);
	});

	it('renders the real panel menu through the saved projection', () => {
		expect(contextMenuSource).toContain('projectFilesMenu(');
		expect(contextMenuSource).toContain('mergeFilesMenuLayout(');
		expect(contextMenuSource).toContain('panelActionCatalog()');
	});

	it('lists intercepted items and applies their saved visibility live', () => {
		// The settings list must include intercepted + parent-menu entries.
		expect(contextMenuSource).toContain('_probeNativePanelEntries()');
		expect(contextMenuSource).toContain("trigger('file-menu'");
		expect(contextMenuSource).toContain('meta.submenu ? { submenu: true }');
		// The live menu hides an intercepted item the layout marks hidden.
		expect(contextMenuSource).toContain('_hideConfiguredNativeItems(menu)');
		expect(contextMenuSource).toContain('nativePanelActionId(title)');
		// Native rows in the settings page carry no drag grip.
		expect(settingsSource).toContain('if (!isNative) {');
		expect(settingsSource).toContain(
			"settings.files_context_menu.intercepted",
		);
	});

	it('exposes the sub-page with reset and both creators', () => {
		expect(settingsSource).toContain("page = 'files-context-menu'");
		expect(settingsSource).toContain('addFilesMenuDivider(');
		expect(settingsSource).toContain('addFilesMenuSubmenu(');
		expect(settingsSource).toContain('defaultFilesMenuLayout(');
		expect(settingsSource).toContain('reorderFilesMenuItems(');
		for (const source of [enSource, esSource]) {
			expect(source).toContain("'settings.files_context_menu':");
			expect(source).toContain("'settings.files_context_menu.desc':");
		}
	});
});
