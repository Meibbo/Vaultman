import { describe, expect, it } from 'vitest';

import { TOOLBAR_MENU_CANONICAL_ORDER } from '../../src/logic/logicToolbarMenuCatalog';
import {
	projectToolbarMenu,
	type ToolbarMenuNode,
} from '../../src/logic/logicToolbarMenuProjection';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import filtersSource from '../../src/components/pages/pageFilters.svelte?raw';
import statisticsSource from '../../src/components/pages/pageStatistics.svelte?raw';
import panelWidgetTypeSource from '../../src/types/typePanelWidget.ts?raw';

type MenuValue = { readonly label: string };

const action = (
	id: string,
	label = id,
	children?: readonly ToolbarMenuNode<MenuValue>[],
	anchor?: { readonly id: string; readonly placement: 'before' | 'after' },
): ToolbarMenuNode<MenuValue> => ({
	kind: 'item',
	item: {
		id,
		value: { label },
		...(children ? { children } : {}),
		...(anchor ? { anchor } : {}),
	},
});

const actionIds = (nodes: readonly ToolbarMenuNode<MenuValue>[]) =>
	nodes
		.filter(
			(node): node is Extract<ToolbarMenuNode<MenuValue>, { kind: 'item' }> =>
				node.kind === 'item',
		)
		.map((node) => node.item.id);

const childIds = (
	nodes: readonly ToolbarMenuNode<MenuValue>[],
	parentId: string,
) => {
	const parent = nodes.find(
		(node): node is Extract<ToolbarMenuNode<MenuValue>, { kind: 'item' }> =>
			node.kind === 'item' && node.item.id === parentId,
	);
	return parent?.kind === 'item' && parent.item.children
		? actionIds(parent.item.children)
		: [];
};

function layoutFor(entries: readonly { id: string; visible: boolean }[]) {
	return entries.map((entry) => ({ kind: 'action' as const, ...entry }));
}

describe('U130-110 toolbar menu projection', () => {
	it('uses the catalog canonical order when no global layout exists', () => {
		const ids = TOOLBAR_MENU_CANONICAL_ORDER.scene_menu;
		const projected = projectToolbarMenu(
			'scene_menu',
			undefined,
			[...ids].reverse().map((id) => action(id)),
		);

		expect(actionIds(projected)).toEqual(ids);
	});

	it('honors global visibility and order without mutating the saved layout', () => {
		const ids = TOOLBAR_MENU_CANONICAL_ORDER.scene_menu.slice(0, 4);
		const saved = layoutFor([
			{ id: ids[2] ?? '', visible: true },
			{ id: ids[1] ?? '', visible: true },
			{ id: ids[0] ?? '', visible: false },
			{ id: ids[3] ?? '', visible: true },
		]);
		const before = structuredClone(saved);
		const projected = projectToolbarMenu(
			'scene_menu',
			saved,
			ids.map((id) => action(id)),
		);

		expect(actionIds(projected)).toEqual([ids[2], ids[1], ids[3]]);
		expect(saved).toEqual(before);
	});

	it('keeps dependent view options hidden until nested and parents-first are active', () => {
		const nested = 'view_menu.engines.nested';
		const parentsFirst = 'view_menu.engines.parents_first';
		const fixedFolders = 'view_menu.engines.fixed_folders';
		const root = [
			action('view_menu.engines', 'Engines', [
				action(nested),
				action(parentsFirst),
				action(fixedFolders),
			]),
		];
		const hiddenNested = projectToolbarMenu(
			'view_menu',
			layoutFor([
				{ id: 'view_menu.engines', visible: true },
				{ id: nested, visible: false },
				{ id: parentsFirst, visible: true },
				{ id: fixedFolders, visible: true },
			]),
			root,
		);
		const enabled = projectToolbarMenu(
			'view_menu',
			layoutFor([
				{ id: 'view_menu.engines', visible: true },
				{ id: nested, visible: true },
				{ id: parentsFirst, visible: true },
				{ id: fixedFolders, visible: true },
			]),
			root,
		);

		expect(childIds(hiddenNested, 'view_menu.engines')).toEqual([]);
		expect(childIds(enabled, 'view_menu.engines')).toEqual([
			nested,
			parentsFirst,
			fixedFolders,
		]);
	});

	it('keeps runtime-generated children under their catalog parent', () => {
		const dynamicLayout = action('layout:one', 'Named layout', undefined, {
			id: 'view_menu.layouts.save',
			placement: 'before',
		});
		const projected = projectToolbarMenu('view_menu', undefined, [
			action('view_menu.layouts', 'Layouts', [
				action('view_menu.layouts.save', 'Save'),
				dynamicLayout,
			]),
		]);

		expect(actionIds(projected)).toEqual(['view_menu.layouts']);
		expect(childIds(projected, 'view_menu.layouts')).toEqual([
			'layout:one',
			'view_menu.layouts.save',
		]);
	});

	it('projects saved custom submenus and assigned actions', () => {
		const submenuId = 'submenu:1';
		const filtersId = 'scene_menu.launcher.filters';
		const queueId = 'scene_menu.launcher.queue';
		const saved = [
			{ kind: 'submenu' as const, id: submenuId, label: 'More' },
			{
				kind: 'action' as const,
				id: filtersId,
				visible: true,
				parent: submenuId,
			},
			{ kind: 'action' as const, id: queueId, visible: true },
		];
		const projected = projectToolbarMenu(
			'scene_menu',
			saved,
			[action(filtersId), action(queueId)],
			[],
			(_id, label) => ({ label }),
		);

		expect(actionIds(projected)).toEqual([submenuId, queueId]);
		expect(childIds(projected, submenuId)).toEqual([filtersId]);
	});

	it('wires the projection into all native menus and publishes global layouts', () => {
		expect(navbarSource).toContain('projectToolbarMenu(');
		expect(navbarSource).toContain("'scene_menu'");
		expect(navbarSource).toContain("'view_menu'");
		expect(navbarSource).toContain("'sort_menu'");
		expect(filtersSource).toContain(
			'toolbarMenuLayouts: plugin.settings.toolbarMenuLayouts',
		);
		expect(statisticsSource).toContain(
			'toolbarMenuLayouts: plugin.settings.toolbarMenuLayouts',
		);
		expect(panelWidgetTypeSource).toContain('toolbarMenuLayouts');
	});
});
