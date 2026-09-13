import { describe, expect, it } from 'vitest';

import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';

function functionSlice(source: string, name: string): string {
	const start = source.indexOf(`function ${name}`);
	const end = source.indexOf('\n\tfunction ', start + 1);
	return source.slice(start, end < 0 ? undefined : end);
}

// L-VMFIX — guard: nested / parentsFirst / fixedFolders only exist INSIDE
// the `engines` submenu, never at the top level of the view_menu; `engines`
// and the `Toolbar` toggle share one section (a divider ahead of `engines`,
// none between `engines` and `Toolbar` -- order dev, 2026-09-13); with
// `nested` off, parentsFirst / fixedFolders do not appear inside the submenu.
//
// Reasoning kept short on purpose: the dev's spec 08 §2 (and the 2026-09-13
// reorder on top of it) is the contract, and these assertions are its
// negative form.
describe('L-VMFIX view_menu guard', () => {
	it('emits nested/parentsFirst/fixedFolders only inside the engines submenu', () => {
		const menu = functionSlice(navbarSource, 'openNativeViewMenu');
		const enginesStart = menu.indexOf("translate('viewmenu.engines')");
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

	it('puts engines before Toolbar, with a divider ahead of engines and none between them', () => {
		const menu = functionSlice(navbarSource, 'openNativeViewMenu');
		const enginesIdx = menu.indexOf("translate('viewmenu.engines')");
		const toolbarIdx = menu.indexOf("translate('viewmenu.toolbar')");
		expect(enginesIdx).toBeGreaterThan(-1);
		expect(toolbarIdx).toBeGreaterThan(enginesIdx);

		// A top-level divider (on `menu`, not the `engines` submenu) sits
		// ahead of the engines section, separating it from the cell presets
		// above (order dev, 2026-09-13).
		const beforeEngines = menu.slice(0, enginesIdx);
		expect(beforeEngines).toMatch(/\tmenu\.addSeparator\(/);

		// No TOP-LEVEL divider between engines and Toolbar. The tab right
		// before `menu.addSeparator(` distinguishes it from the submenu's own
		// `submenu.addSeparator()` calls, which are expected inside this span
		// (e.g. before `nested`) and are not a top-level divider.
		const between = menu.slice(enginesIdx, toolbarIdx);
		expect(between).not.toMatch(/\tmenu\.addSeparator\(/);
	});

	it('keeps the nested -> parentsFirst -> fixedFolders projection chain inside engines', () => {
		const menu = functionSlice(navbarSource, 'openNativeViewMenu');
		const enginesIdx = menu.indexOf("translate('viewmenu.engines')");
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
});