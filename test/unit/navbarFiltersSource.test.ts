import { describe, expect, it } from 'vitest';

import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupViewSource from '../../src/components/layout/popupView.svelte?raw';

describe('minimal filters header source guards', () => {
	it('shows the active Content tab label on the minimal Tabs button', () => {
		expect(navbarFiltersSource).toContain('showTabsButtonLabel');
		expect(navbarFiltersSource).toContain("activeSectionTab === 'content'");
		expect(navbarFiltersSource).toContain('vaultman-header-action-label');
		expect(navbarFiltersSource).toContain('{currentTabsOption.label}');
	});

	it('keeps minimal header buttons in the same nav-header/nav-buttons-container structure as core plugins', () => {
		expect(navbarFiltersSource).toContain('class:nav-header={minimalStyle}');
		expect(navbarFiltersSource).toContain('class="vaultman-filters-actions"');
		expect(navbarFiltersSource).toContain(
			'class:nav-buttons-container={minimalStyle}',
		);
		expect(navbarFiltersSource).not.toContain(
			'class:nav-buttons-container={minimalStyle}\n\t\t\t>',
		);
	});

	it('keeps minimal search as a toggle and gives phone mode its own top layer', () => {
		expect(navbarFiltersSource).toContain('{#if showSearchInput}');
		expect(navbarFiltersSource).toContain('function toggleSearch()');
		expect(navbarFiltersSource).toContain('function focusVisibleSearchInput()');
		expect(navbarFiltersSource).toContain(
			'function markSearchToggleActivation()',
		);
		expect(navbarFiltersSource).toContain('function isSearchToggleTarget');
		expect(navbarFiltersSource).toContain('vaultman-filters-phone-search-row');
		expect(navbarFiltersSource).toContain('aria-pressed={searchExpanded}');
		expect(navbarFiltersSource).toContain('data-vaultman-search-toggle="true"');
		expect(navbarFiltersSource).toContain(
			'searchToggleActivationPending || isSearchToggleTarget(nextTarget)',
		);
		expect(navbarFiltersSource).toContain(
			'onpointerdown={markSearchToggleActivation}',
		);
		expect(navbarFiltersSource).toContain(
			'class:is-active={searchExpanded || filtersSearch.length > 0}',
		);
		expect(navbarFiltersSource).toContain("{@render searchControl('phone')}");
		expect(navbarFiltersSource).toContain("{@render searchControl('inline')}");
		expect(navbarFiltersSource).not.toContain('showMinimalSearchRow');
		expect(navbarFiltersSource).not.toContain('vaultman-minimal-search-row');
		expect(navbarFiltersSource).not.toContain('isPhoneMode');
	});

	it('renders caller-provided header actions immediately after the tabs button', () => {
		const tabsIndex = navbarFiltersSource.indexOf('openTabsPopup(event)');
		const headerActionsIndex = navbarFiltersSource.indexOf(
			'{#each headerActions as action',
		);
		const explorerControlsIndex = navbarFiltersSource.indexOf(
			'{#if showExplorerControls}',
		);

		expect(headerActionsIndex).toBeGreaterThan(tabsIndex);
		expect(headerActionsIndex).toBeLessThan(explorerControlsIndex);
	});

	it('keeps Nested enabled by default across Files, Props, and Tags view controls', () => {
		expect(navbarFiltersSource).toContain(
			"props: ['icon', 'text', 'count', 'nested']",
		);
		expect(navbarFiltersSource).toContain(
			"tags: ['icon', 'text', 'count', 'nested']",
		);
		expect(navbarFiltersSource).toContain(
			"files: ['name', 'ext', 'count', 'nested']",
		);
		expect(navbarFiltersSource).toContain("mtime: 'viewmode.pill.mtime'");
		expect(navbarFiltersSource).toContain("nested: 'viewmode.pill.nested'");
		expect(popupViewSource).toContain(
			"{ id: 'nested', labelKey: 'viewmode.pill.nested', defaultOn: true }",
		);
	});

	it('keeps Files date cells opt-in and represents path mode as Nested off', () => {
		expect(navbarFiltersSource).toContain(
			"files: ['name', 'ext', 'count', 'nested']",
		);
		expect(popupViewSource).toContain(
			"{ id: 'mtime', labelKey: 'viewmode.pill.mtime', defaultOn: false }",
		);
		expect(popupViewSource).toContain(
			"{ id: 'nested', labelKey: 'viewmode.pill.nested', defaultOn: true }",
		);
		expect(navbarFiltersSource).not.toContain("path: 'viewmode.pill.path'");
		expect(navbarFiltersSource).not.toContain("path: 'lucide-route'");
		expect(popupViewSource).not.toContain("id: 'path'");
	});

	it('keeps dock-off menu labels reactive and exposes Files grouping by extension', () => {
		expect(navbarFiltersSource).toContain('getFileTypeOptions');
		expect(navbarFiltersSource).toContain('nodeTypeOptionsForActiveTab');
		expect(navbarFiltersSource).toContain(
			'nodeTypeFilterPatch(nodeTypeFiltersForState(normalized))',
		);
		expect(navbarFiltersSource).toContain(
			'`${action.label}${countLabel}${warningLabel}`',
		);
		expect(navbarFiltersSource).not.toContain(
			'action.tooltip && (isFiltersAction || isQueueAction)',
		);
	});

	it('exposes Files Parents First as a sort preference separate from node type filters', () => {
		expect(navbarFiltersSource).toContain(
			'const parentsFirst = current.parentsFirst ?? true;',
		);
		expect(navbarFiltersSource).toContain(
			'fileList?.setSortState(normalizedState)',
		);
		expect(navbarFiltersSource).toContain('sameExplorerSortState(left, right)');
		expect(navbarFiltersSource).toContain("translate('sort.parents_first')");
		expect(navbarFiltersSource).toContain("setIcon('lucide-folder-tree')");
	});

	it('persists and applies full scoped sort state instead of the legacy child-level shape', () => {
		expect(navbarFiltersSource).toContain(
			"normalizeExplorerSortState(tab, state",
		);
		expect(navbarFiltersSource).toContain('activeScopeSort(tab, sort)');
		expect(navbarFiltersSource).toContain('sorts: { ...sortState.sorts }');
		expect(navbarFiltersSource).not.toContain('childLevel');
	});

	it('condenses only the minimal Files toolbar to tabs, view, sort, search, tools', () => {
		expect(navbarFiltersSource).toContain('toolbarToolsMenu = false');
		expect(navbarFiltersSource).toContain('frameWidth = 0');
		expect(navbarFiltersSource).toContain('shouldCondenseFilesToolbar({');
		expect(navbarFiltersSource).toContain('manual: toolbarToolsMenu');
		expect(navbarFiltersSource).toContain(
			'const compactFilesTools = $derived(',
		);
		expect(navbarFiltersSource).toContain(
			"activeTab === 'files' && !compactFilesTools",
		);
		expect(navbarFiltersSource).toContain('!compactFilesTools');

		const actionsSource = navbarFiltersSource.slice(
			navbarFiltersSource.indexOf('class="vaultman-filters-actions"'),
		);
		const tabsIndex = actionsSource.indexOf('openTabsPopup(event)');
		const viewIndex = actionsSource.indexOf('openViewModePopup(event)');
		const sortIndex = actionsSource.indexOf('openSortPopup(event)');
		const searchIndex = actionsSource.indexOf(
			'data-vaultman-search-toggle="true"',
		);
		const toolsIndex = actionsSource.indexOf('openToolsMenu(event)');
		expect(tabsIndex).toBeLessThan(viewIndex);
		expect(viewIndex).toBeLessThan(sortIndex);
		expect(sortIndex).toBeLessThan(searchIndex);
		expect(searchIndex).toBeLessThan(toolsIndex);
	});

	it('puts auto-reveal before dynamic expand/collapse in the native Tools menu', () => {
		const menuStart = navbarFiltersSource.indexOf(
			'function openToolsMenu(event: MouseEvent)',
		);
		const menuEnd = navbarFiltersSource.indexOf('\n\tfunction ', menuStart + 1);
		const menuSource = navbarFiltersSource.slice(menuStart, menuEnd);
		expect(menuSource).toContain("translate('filter.auto_reveal')");
		expect(menuSource).toContain('fileList?.autoRevealActiveFile()');
		expect(menuSource).toContain('expansionLabel');
		expect(menuSource).toContain('toggleExplorerExpansion');
		expect(menuSource.indexOf("translate('filter.auto_reveal')")).toBeLessThan(
			menuSource.indexOf('expansionLabel'),
		);
	});
});
