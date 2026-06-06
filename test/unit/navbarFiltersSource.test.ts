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

	it('keeps Nested enabled by default across Files, Props, and Tags view controls', () => {
		expect(navbarFiltersSource).toContain(
			"props: ['icon', 'text', 'count', 'nested']",
		);
		expect(navbarFiltersSource).toContain(
			"tags: ['icon', 'text', 'count', 'nested']",
		);
		expect(navbarFiltersSource).toContain(
			"files: ['name', 'ext', 'path', 'nested']",
		);
		expect(navbarFiltersSource).toContain("nested: 'viewmode.pill.nested'");
		expect(popupViewSource).toContain(
			"{ id: 'nested', labelKey: 'viewmode.pill.nested', defaultOn: true }",
		);
	});
});
