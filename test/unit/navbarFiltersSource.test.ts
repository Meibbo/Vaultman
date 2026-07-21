import { describe, expect, it } from 'vitest';

import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupViewSource from '../../src/components/layout/popupView.svelte?raw';

describe('minimal filters header source guards', () => {
	it('uses the tab-label setting for every active minimal Tabs button', () => {
		expect(navbarFiltersSource).toContain('showTabsButtonLabel');
		expect(navbarFiltersSource).not.toContain("activeSectionTab === 'content'");
		expect(navbarFiltersSource).toContain('showTabLabels !== false');
		expect(navbarFiltersSource).toContain('TODO(refactor)');
		expect(navbarFiltersSource).toContain('vaultman-header-action-label');
		expect(navbarFiltersSource).toContain(
			'{#if showTabsButtonLabel && currentTabsOption}',
		);
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
		expect(navbarFiltersSource).toContain('shouldShowMinimalSearchInput({');
		expect(navbarFiltersSource).toContain(
			'tabLabelVisible: showTabsButtonLabel',
		);
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
		expect(navbarFiltersSource).toContain('defaultVisibleCells');
		expect(popupViewSource).toContain('defaultVisibleCells');
		expect(navbarFiltersSource).not.toContain('const DEFAULT_VISIBLE_CELLS');
		expect(popupViewSource).not.toContain('const PILLS');
	});

	it('keeps Files date cells opt-in and represents path mode as Nested off', () => {
		// BT5-011: the navbar projects through cellMenuOrder; the view popup
		// still reads viewMenuCells directly.
		expect(navbarFiltersSource).toContain('cellMenuOrder(');
		// BT5-012: Path mode is now a registry-gated projection, so the popup
		// passes its active pills into viewMenuCells.
		expect(popupViewSource).toContain(
			'viewMenuCells(activeTab, activeView, activePills)',
		);
		expect(navbarFiltersSource).not.toContain('const CELL_LABELS');
		expect(navbarFiltersSource).not.toContain('const CELL_ICONS');
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
		// Sort menu cleanup: byLevelModel now receives treeCapableFor(tab) so the
		// folder options vanish in flat (table/cards) views.
		expect(navbarFiltersSource).toContain('nestedActiveFor(tab)');
		expect(navbarFiltersSource).toContain('treeCapableFor(tab)');
		expect(navbarFiltersSource).toContain("option.id === 'parentsFirst'");
		expect(navbarFiltersSource).toContain(
			'fileList?.setSortState(normalizedState)',
		);
		expect(navbarFiltersSource).toContain('sameExplorerSortState(left, right)');
		expect(navbarFiltersSource).toContain('translate(option.labelKey)');
		expect(navbarFiltersSource).toContain('.setIcon(option.icon)');
	});

	it('persists and applies full scoped sort state instead of the legacy child-level shape', () => {
		expect(navbarFiltersSource).toContain(
			'normalizeExplorerSortState(tab, state',
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
