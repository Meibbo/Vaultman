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
		expect(navbarFiltersSource).toContain(
			'<div class:nav-buttons-container={minimalStyle}',
		);
		expect(navbarFiltersSource).not.toContain(
			'class:nav-buttons-container={minimalStyle}\n\t\t\t>',
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
		expect(navbarFiltersSource).toContain(
			"props: ['icon', 'text', 'count', 'nested']",
		);
		expect(navbarFiltersSource).toContain(
			"tags: ['icon', 'text', 'count', 'nested']",
		);
		expect(navbarFiltersSource).toContain(
			"files: ['name', 'ext', 'mtime', 'path', 'nested']",
		);
		expect(navbarFiltersSource).toContain("mtime: 'viewmode.pill.mtime'");
		expect(navbarFiltersSource).toContain("nested: 'viewmode.pill.nested'");
		expect(popupViewSource).toContain(
			"{ id: 'nested', labelKey: 'viewmode.pill.nested', defaultOn: true }",
		);
	});
});
