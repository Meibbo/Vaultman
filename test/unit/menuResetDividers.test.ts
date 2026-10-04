import { describe, expect, it } from 'vitest';

import {
	TOOLBAR_MENU_DEFAULT_ORDER,
	TOOLBAR_MENU_KINDS,
	toolbarMenuCatalog,
} from '../../src/logic/logicToolbarMenuCatalog';
import {
	FILES_MENU_DEFAULT_ORDER,
	defaultFilesMenuLayout,
	mergeFilesMenuLayout,
	removeMenuOverride,
	type FilesMenuItem,
	type PanelMenuKind,
} from '../../src/logic/logicFilesContextMenu';
import {
	projectToolbarMenu,
	type ToolbarMenuNode,
} from '../../src/logic/logicToolbarMenuProjection';

type MenuValue = { readonly label: string };

const action = (id: string): ToolbarMenuNode<MenuValue> => ({
	kind: 'item',
	item: { id, value: { label: id } },
});

const divider = (id: string): ToolbarMenuNode<MenuValue> => ({
	kind: 'divider',
	id,
});

const dividerCount = (nodes: readonly ToolbarMenuNode<MenuValue>[]) =>
	nodes.filter((node) => node.kind === 'divider').length;

const catalogIdsFor = (
	kind: (typeof TOOLBAR_MENU_KINDS)[number],
): readonly string[] => toolbarMenuCatalog(kind).map((entry) => entry.id);

describe('A1/A2 menu reset restores provider-default dividers', () => {
	it('toolbar default orders carry section dividers (authoritative catalog sections)', () => {
		for (const kind of TOOLBAR_MENU_KINDS) {
			const order = TOOLBAR_MENU_DEFAULT_ORDER[kind];
			expect(
				order.filter((entry) => entry === '---').length,
				`${kind} default order dividers`,
			).toBeGreaterThan(0);
		}
	});

	it('toolbar default layouts materialize dividers for the settings editor', () => {
		for (const kind of TOOLBAR_MENU_KINDS) {
			const layout = defaultFilesMenuLayout(
				catalogIdsFor(kind),
				TOOLBAR_MENU_DEFAULT_ORDER[kind],
			);
			expect(
				layout.filter((item) => item.kind === 'divider').length,
				`${kind} default layout dividers`,
			).toBeGreaterThan(0);
		}
	});

	it('absent override projects source dividers (reset state)', () => {
		const source = [
			action('view_menu.interaction'),
			divider('view_menu.divider.layouts'),
			action('view_menu.layouts'),
			divider('view_menu.divider.after_layouts'),
			action('view_menu.cells.icon'),
			divider('view_menu.divider.engines'),
			action('view_menu.engines'),
		];
		const projected = projectToolbarMenu('view_menu', undefined, source);
		expect(dividerCount(projected)).toBeGreaterThan(0);
	});

	it('explicit dividerless custom array stays a valid override until reset', () => {
		const source = [
			action('view_menu.interaction'),
			divider('view_menu.divider.layouts'),
			action('view_menu.layouts'),
			divider('view_menu.divider.engines'),
			action('view_menu.engines'),
		];
		const dividerlessSaved: FilesMenuItem[] = [
			{ kind: 'action', id: 'view_menu.interaction', visible: true },
			{ kind: 'action', id: 'view_menu.layouts', visible: true },
			{ kind: 'action', id: 'view_menu.engines', visible: true },
		];
		const projected = projectToolbarMenu(
			'view_menu',
			dividerlessSaved,
			source,
		);
		expect(dividerCount(projected)).toBe(0);
	});

	it('merge with absent override deep-equals default (no provenance flag)', () => {
		for (const kind of TOOLBAR_MENU_KINDS) {
			const ids = catalogIdsFor(kind);
			const order = TOOLBAR_MENU_DEFAULT_ORDER[kind];
			expect(mergeFilesMenuLayout(undefined, ids, order)).toEqual(
				defaultFilesMenuLayout(ids, order),
			);
		}
	});

	it('production reset removes only the selected toolbar key (isolation + purity)', () => {
		const layouts: Partial<
			Record<(typeof TOOLBAR_MENU_KINDS)[number], FilesMenuItem[]>
		> = {
			view_menu: [
				{ kind: 'action', id: 'view_menu.interaction', visible: true },
			],
			sort_menu: [
				{ kind: 'action', id: 'sort_menu.scope', visible: true },
			],
		};
		const before = structuredClone(layouts);
		const reset = removeMenuOverride<
			(typeof TOOLBAR_MENU_KINDS)[number]
		>(layouts, 'view_menu');
		expect(reset?.view_menu).toBeUndefined();
		expect(reset?.sort_menu).toEqual([
			{ kind: 'action', id: 'sort_menu.scope', visible: true },
		]);
		// The production operation never mutates its input.
		expect(layouts).toEqual(before);
	});

	it('production reset is idempotent and collapses emptied maps', () => {
		const layouts: Partial<
			Record<(typeof TOOLBAR_MENU_KINDS)[number], FilesMenuItem[]>
		> = {
			view_menu: [
				{ kind: 'action', id: 'view_menu.interaction', visible: true },
			],
		};
		const once = removeMenuOverride(layouts, 'view_menu');
		expect(once).toBeUndefined();
		const twice = removeMenuOverride(once, 'view_menu');
		expect(twice).toBeUndefined();
		// Absent key is a no-op returning the input unchanged.
		const untouched: Partial<
			Record<(typeof TOOLBAR_MENU_KINDS)[number], FilesMenuItem[]>
		> = {
			sort_menu: [
				{ kind: 'action', id: 'sort_menu.scope', visible: true },
			],
		};
		expect(removeMenuOverride(untouched, 'view_menu')).toBe(untouched);
		expect(removeMenuOverride(undefined, 'view_menu')).toBeUndefined();
	});

	it('production reset isolates panel kinds', () => {
		const layouts: Partial<Record<PanelMenuKind, FilesMenuItem[]>> = {
			props: [{ kind: 'action', id: 'prop.rename', visible: true }],
			tags: [{ kind: 'action', id: 'tag.rename', visible: true }],
		};
		const reset = removeMenuOverride<PanelMenuKind>(layouts, 'props');
		expect(reset?.props).toBeUndefined();
		expect(reset?.tags).toEqual([
			{ kind: 'action', id: 'tag.rename', visible: true },
		]);
		expect(layouts.props).toEqual([
			{ kind: 'action', id: 'prop.rename', visible: true },
		]);
	});

	it('files reset re-materializes a divider-carrying default array', () => {
		const catalogIds = [
			'file.open_tab',
			'file.make_copy',
			'file.rename',
			'file.delete',
		];
		const restored = defaultFilesMenuLayout(
			catalogIds,
			FILES_MENU_DEFAULT_ORDER,
		);
		expect(Array.isArray(restored)).toBe(true);
		expect(
			restored.filter((item) => item.kind === 'divider').length,
		).toBeGreaterThan(0);
		expect(mergeFilesMenuLayout(undefined, catalogIds)).toEqual(restored);
	});

	it('non-reset custom submenu survives the production reset', () => {
		const submenuId = 'submenu:1';
		const layouts: Partial<
			Record<(typeof TOOLBAR_MENU_KINDS)[number], FilesMenuItem[]>
		> = {
			view_menu: [
				{ kind: 'action', id: 'view_menu.interaction', visible: true },
			],
			sort_menu: [
				{ kind: 'submenu', id: submenuId, label: 'More' },
				{
					kind: 'action',
					id: 'sort_menu.scope',
					visible: true,
					parent: submenuId,
				},
				{ kind: 'action', id: 'sort_menu.groups', visible: true },
			],
		};
		const reset = removeMenuOverride<
			(typeof TOOLBAR_MENU_KINDS)[number]
		>(layouts, 'view_menu');
		const savedSort = reset?.sort_menu;
		expect(savedSort).toEqual(layouts.sort_menu);
		const projected = projectToolbarMenu(
			'sort_menu',
			savedSort,
			[action('sort_menu.scope'), action('sort_menu.groups')],
			[],
			(_id, label) => ({ label }),
		);
		const ids = projected
			.filter(
				(node): node is Extract<ToolbarMenuNode<MenuValue>, { kind: 'item' }> =>
					node.kind === 'item',
			)
			.map((node) => node.item.id);
		expect(ids).toContain(submenuId);
	});

	it('provider default dynamic additions appear at canonical rank', () => {
		const kind = 'view_menu' as const;
		const ids = [...catalogIdsFor(kind)];
		const freshAction = 'view_menu.engines.new_engine';
		const extendedIds = [...ids, freshAction];
		// Absent override: default includes the new provider action.
		const defaulted = defaultFilesMenuLayout(
			extendedIds,
			TOOLBAR_MENU_DEFAULT_ORDER[kind],
		);
		expect(
			defaulted.some(
				(item) => item.kind === 'action' && item.id === freshAction,
			),
		).toBe(true);
		// Dividerless saved override: merge inserts the newcomer (never dropped).
		const dividerlessSaved: FilesMenuItem[] = ids.map((id) => ({
			kind: 'action' as const,
			id,
			visible: true,
		}));
		const merged = mergeFilesMenuLayout(
			dividerlessSaved,
			extendedIds,
			TOOLBAR_MENU_DEFAULT_ORDER[kind],
		);
		expect(
			merged.some((item) => item.kind === 'action' && item.id === freshAction),
		).toBe(true);
	});

	it('files default order still carries dividers (verify-only, unaffected)', () => {
		expect(
			FILES_MENU_DEFAULT_ORDER.filter((entry) => entry === '---').length,
		).toBeGreaterThan(0);
	});
});
