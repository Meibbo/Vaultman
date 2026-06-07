import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';
import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';
import navbarPillFabSource from '../../src/components/layout/navbarPillFab.svelte?raw';
import filesExplorerSource from '../../src/components/containers/explorerFiles.ts?raw';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsExplorerSource from '../../src/components/containers/explorerTags.ts?raw';
import treeViewSource from '../../src/components/layout/viewTree.ts?raw';
import gridViewSource from '../../src/components/layout/viewGrid.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';

describe('cuts 1-3 source guards', () => {
	it('routes filters and queue launchers into the minimal tab menu when the dock is off', () => {
		expect(frameSource).toContain('showDock');
		expect(frameSource).toContain('openFiltersLauncher');
		expect(frameSource).toContain('openQueueLauncher');
		expect(frameSource).toContain('clearQueueQuick');
		expect(frameSource).toContain('{#if showDock}');
		expect(navbarFiltersSource).toContain('showDock = false');
		expect(navbarFiltersSource).toContain('tabMenuActions');
		expect(navbarFiltersSource).toContain('menu.addSeparator();');
		expect(navbarFiltersSource).toContain("action.id === 'filters'");
		expect(navbarFiltersSource).toContain("action.id === 'queue'");
	});

	it('keeps double-click clear from opening or closing the islands first', () => {
		expect(frameSource).toContain('handleLauncherClick');
		expect(frameSource).toContain('clearActiveFilters');
		expect(frameSource).toContain('clearQueueQuick');
		expect(navbarPillFabSource).toContain('triggerFabDoubleClick');
		expect(navbarPillFabSource).toContain('e.preventDefault();');
	});

	it('hides DnD and Cards from the minimal native view menu', () => {
		expect(navbarFiltersSource).toContain('minimalNativeViewModes');
		expect(navbarFiltersSource).toContain("option.id !== 'dnd'");
		expect(navbarFiltersSource).toContain("option.id !== 'cards'");
	});

	it('wires drag payloads through all explorer renderers', () => {
		for (const source of [treeViewSource, gridViewSource, nodeTableSource]) {
			expect(source).toContain('onDragStart');
			expect(source).toContain('draggable');
		}
		for (const source of [
			filesExplorerSource,
			propsExplorerSource,
			tagsExplorerSource,
		]) {
			expect(source).toContain('setVaultmanDragPayload');
		}
		expect(propsExplorerSource).toContain("kind: 'property-value'");
		expect(tagsExplorerSource).toContain("kind: 'tag'");
		expect(filesExplorerSource).toContain("kind: 'file'");
	});

	it('keeps Bases multi-select context operations behind an explicit adapter hook', () => {
		expect(frameSource).toContain('attachBasesMultiSelectOperations');
	});
});
