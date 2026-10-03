import { describe, expect, it } from 'vitest';

import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

function functionSlice(source: string, name: string): string {
	const start = source.indexOf(`function ${name}`);
	const end = source.indexOf('\n\tfunction ', start + 1);
	return source.slice(start, end < 0 ? undefined : end);
}

// L-VMFIX — guard: nested / parentsFirst / fixedFolders only exist INSIDE
// the `engines` submenu, never at the top level of the view_menu; the
// interaction submenu goes first, and the `Toolbar` toggle sits ABOVE
// `engines` with a divider between them — the second divider reserves the
// slot for the stream proto_design dimension control (orden dev,
// 2026-09-15); with `nested` off, parentsFirst / fixedFolders do not appear
// inside the submenu.
//
// Reasoning kept short on purpose: the dev's spec 08 §2 (and the 2026-09-15
// reorder on top of it) is the contract, and these assertions are its
// negative form.
describe('L-VMFIX view_menu guard', () => {
	it('emits nested/parentsFirst/fixedFolders only inside the engines submenu', () => {
		const menu = functionSlice(navbarSource, 'openNativeViewMenu');
		const enginesStart = menu.indexOf('const engineChildren: NativeMenuNode[]');
		expect(enginesStart).toBeGreaterThan(-1);
		const menuEnd = menu.indexOf('\n\tfunction ', enginesStart + 1);
		const topLevel = menu.slice(0, enginesStart);

		expect(topLevel).not.toContain("translate('sort.level.nested')");
		expect(topLevel).not.toContain("translate('sort.parents_first')");
		expect(topLevel).not.toContain("translate('sort.level.fixed_folders')");
		expect(menu.slice(enginesStart, menuEnd < 0 ? undefined : menuEnd)).toContain(
			"translate('sort.level.nested')",
		);
	});

	it('puts the interaction submenu first in the view_menu', () => {
		const menu = functionSlice(navbarSource, 'openNativeViewMenu');
		const interactionIdx = menu.indexOf("translate('viewmenu.interaction')");
		const layoutsIdx = menu.indexOf("translate('viewmenu.layouts')");
		const presetsIdx = menu.indexOf('cellMenuOrder(');
		expect(interactionIdx).toBeGreaterThan(-1);
		expect(presetsIdx).toBeGreaterThan(interactionIdx);
		if (layoutsIdx > -1) expect(layoutsIdx).toBeGreaterThan(interactionIdx);
	});

	it('removes toolbar toggle and configures layout and nested dividers', () => {
		const menu = functionSlice(navbarSource, 'openNativeViewMenu');
		const enginesIdx = menu.indexOf('const engineChildren: NativeMenuNode[]');
		expect(enginesIdx).toBeGreaterThan(-1);

		// Toolbar option is removed from view_menu per backlog spec (redundant).
		expect(menu).not.toContain("translate('viewmenu.toolbar')");
		expect(menu).not.toContain("nativeMenuDivider('view_menu.divider.toolbar')");

		// Divider before engines sits ahead of the engines submenu.
		const beforeEngines = menu.slice(0, enginesIdx);
		expect(beforeEngines).toContain("nativeMenuDivider('view_menu.divider.engines')");

		// Dividers before and after layout view_option.
		expect(menu).toContain("nativeMenuDivider('view_menu.divider.layouts')");
		expect(menu).toContain("nativeMenuDivider('view_menu.divider.after_layouts')");

		// Dividers before and after nested option inside engines submenu.
		const enginesBlock = menu.slice(enginesIdx);
		const nestedIdx = enginesBlock.indexOf("'view_menu.engines.nested'");
		const beforeNestedDividerIdx = enginesBlock.indexOf("'view_menu.engines.divider.before_nested'");
		const afterNestedDividerIdx = enginesBlock.indexOf("'view_menu.engines.divider.options'");

		expect(beforeNestedDividerIdx).toBeGreaterThan(-1);
		expect(nestedIdx).toBeGreaterThan(beforeNestedDividerIdx);
		expect(afterNestedDividerIdx).toBeGreaterThan(nestedIdx);

		// Input interaction mode is 'Rename' / 'Renombrar'.
		expect(en['viewmenu.interaction.input']).toBe('Rename');
		expect(es['viewmenu.interaction.input']).toBe('Renombrar');
	});

	it('keeps the nested -> parentsFirst -> fixedFolders projection chain inside engines', () => {
		const menu = functionSlice(navbarSource, 'openNativeViewMenu');
		const enginesIdx = menu.indexOf('const engineChildren: NativeMenuNode[]');
		const enginesBlock = menu.slice(enginesIdx);

		// `nested` is the gate: when false, parentsFirst and fixedFolders
		// must NOT be emitted. We assert that the conditional emission of
		// those two is gated on `nestedAct` (the same boolean the render
		// reads for the nested toggle itself).
		const parentsFirstIdx = enginesBlock.indexOf(
			"translate('sort.parents_first')",
		);
		const fixedFoldersIdx = enginesBlock.indexOf(
			"translate('sort.level.fixed_folders')",
		);
		expect(parentsFirstIdx).toBeGreaterThan(-1);
		expect(fixedFoldersIdx).toBeGreaterThan(-1);

		// The two emissions sit under `if (nestedAct && activeTab === 'files')`
		// — search backwards from each emission for that exact guard.
		const parentsFirstGuard = enginesBlock.lastIndexOf(
			'if (nestedAct && activeTab === \'files\')',
			parentsFirstIdx,
		);
		const fixedFoldersGuard = enginesBlock.lastIndexOf(
			'if (nestedAct && activeTab === \'files\')',
			fixedFoldersIdx,
		);
		expect(parentsFirstGuard).toBeGreaterThan(-1);
		expect(fixedFoldersGuard).toBeGreaterThan(-1);

		// And the fixed-folders emission is further gated by `if (parentsFirst)`.
		const fixedFoldersParentsGuard = enginesBlock.lastIndexOf(
			'if (parentsFirst)',
			fixedFoldersIdx,
		);
		expect(fixedFoldersParentsGuard).toBeGreaterThan(-1);
	});

	it('emits the per-instance tooltips toggle inside the engines submenu', () => {
		const menu = functionSlice(navbarSource, 'openNativeViewMenu');
		const enginesIdx = menu.indexOf('const engineChildren: NativeMenuNode[]');
		expect(enginesIdx).toBeGreaterThan(-1);
		const enginesBlock = menu.slice(enginesIdx);
		expect(enginesBlock).toContain("'view_menu.engines.tooltips'");
		expect(enginesBlock).toContain("translate('sort.level.tooltips')");
		expect(enginesBlock).toContain('tooltipsEnabledFor(activeTab)');
		expect(enginesBlock).toContain('toggleTooltipsFor(activeTab)');
		// El commit vive en `toggleTooltipsFor`, fuera del slice del menú.
		expect(navbarSource).toContain('commitConfig(tab, { tooltips: next })');
		expect(en['sort.level.tooltips']).toBeTruthy();
		expect(es['sort.level.tooltips']).toBeTruthy();
		expect(es['sort.level.tooltips']).not.toBe(en['sort.level.tooltips']);
	});
});
