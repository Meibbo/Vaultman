import { describe, expect, it } from 'vitest';

import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';

describe('minimal filters header source guards', () => {
	it('shows the active Content tab label on the minimal Tabs button', () => {
		expect(navbarFiltersSource).toContain('showTabsButtonLabel');
		expect(navbarFiltersSource).toContain("activeSectionTab === 'content'");
		expect(navbarFiltersSource).toContain('vaultman-header-action-label');
		expect(navbarFiltersSource).toContain('{currentTabsOption.label}');
	});
});
