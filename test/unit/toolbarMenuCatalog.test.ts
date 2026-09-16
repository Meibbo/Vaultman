import { describe, expect, it } from 'vitest';

import {
	TOOLBAR_MENU_KINDS,
	toolbarMenuActionIds,
	toolbarMenuCatalog,
	toolbarMenuActionsWithSatisfiedRequirements,
} from '../../src/logic/logicToolbarMenuCatalog';
import { viewModesForDataSurface } from '../../src/logic/logicExplorerViewModes';
import { SORT_MENU_OPTIONS } from '../../src/logic/logicSortMenu';

describe('U130-110 toolbar menu catalog', () => {
	it('uses unique namespaced IDs and exposes every native menu family', () => {
		const actionIds = TOOLBAR_MENU_KINDS.flatMap((kind) =>
			toolbarMenuActionIds(kind),
		);

		expect(new Set(actionIds).size).toBe(actionIds.length);
		for (const kind of TOOLBAR_MENU_KINDS) {
			expect(toolbarMenuActionIds(kind).every((id) => id.startsWith(`${kind}.`))).toBe(
				true,
			);
			for (const action of toolbarMenuCatalog(kind)) {
				expect(action.labelKey).toBeTruthy();
				expect(action.icon).toBeTruthy();
				expect(action.section).toBeTruthy();
				expect(action.availability.tabs.length).toBeGreaterThan(0);
			}
		}
		expect(actionIds).toEqual(
			expect.arrayContaining([
				'scene_menu.tab.files',
				'scene_menu.launcher.filters',
				'scene_menu.floating_toc',
				'view_menu.interaction.open',
				'view_menu.cells.checkbox',
				'view_menu.engines.tree',
				'view_menu.engines.fixed_folders',
				'sort_menu.scope.all',
				'sort_menu.groups.none',
				'sort_menu.sort.files.name',
				'sort_menu.by_type.files.all',
			]),
		);
		expect(actionIds.some((id) => id.startsWith('sort_menu.engines.'))).toBe(
			false,
		);
		expect(actionIds).not.toContain('view_menu.cells.nested');
	});

	it('keeps engine options behind nested then parents-first requirements', () => {
		const nested = 'view_menu.engines.nested';
		const parentsFirst = 'view_menu.engines.parents_first';
		const fixedFolders = 'view_menu.engines.fixed_folders';

		const definitions = toolbarMenuCatalog('view_menu');
		expect(definitions.find((action) => action.id === nested)?.requires).toEqual([]);
		expect(
			definitions.find((action) => action.id === parentsFirst)?.requires,
		).toEqual([nested]);
		expect(
			definitions.find((action) => action.id === fixedFolders)?.requires,
		).toEqual([nested, parentsFirst]);

		expect(
			toolbarMenuActionsWithSatisfiedRequirements('view_menu', []).map(
				(action) => action.id,
			),
		).not.toContain(parentsFirst);
		expect(
			toolbarMenuActionsWithSatisfiedRequirements('view_menu', [nested]).map(
				(action) => action.id,
			),
		).not.toContain(fixedFolders);
		expect(
			toolbarMenuActionsWithSatisfiedRequirements('view_menu', [
				nested,
				parentsFirst,
			]).map((action) => action.id),
		).toContain(fixedFolders);
	});

	it('derives deterministic engine and sort metadata from their existing catalogs', () => {
		const tree = viewModesForDataSurface('files').find(
			(option) => option.id === 'tree',
		);
		const engine = toolbarMenuCatalog('view_menu').find(
			(action) => action.id === 'view_menu.engines.tree',
		);
		expect(engine?.labelKey).toBe(tree?.labelKey);
		expect(engine?.icon).toBe(tree?.icon);

		const nameSort = SORT_MENU_OPTIONS.files.find(
			(option) => option.id === 'name',
		);
		const catalogSort = toolbarMenuCatalog('sort_menu').find(
			(action) => action.id === 'sort_menu.sort.files.name',
		);
		expect(catalogSort?.labelKey).toBe(nameSort?.labelKey);
		expect(catalogSort?.icon).toBe(nameSort?.icon);

		const firstPass = TOOLBAR_MENU_KINDS.map((kind) =>
			toolbarMenuCatalog(kind).map(
				({ availability, icon, id, labelKey, requires, section, submenu }) => ({
					availability,
					icon,
					id,
					labelKey,
					requires,
					section,
					submenu,
				}),
			),
		);
		const secondPass = TOOLBAR_MENU_KINDS.map((kind) =>
			toolbarMenuCatalog(kind).map(
				({ availability, icon, id, labelKey, requires, section, submenu }) => ({
					availability,
					icon,
					id,
					labelKey,
					requires,
					section,
					submenu,
				}),
			),
		);
		expect(firstPass).toEqual(secondPass);
	});
});
