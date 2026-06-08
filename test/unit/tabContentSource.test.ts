import { describe, expect, it } from 'vitest';

import tabContentSource from '../../src/components/pages/tabContent.svelte?raw';

describe('Content tab source guards', () => {
	it('keeps Content as a body surface because its tab/sort/expand controls live in the filters header', () => {
		expect(tabContentSource).toContain('sortedContentFiles');
		expect(tabContentSource).toContain('toggleContentFile');
		expect(tabContentSource).not.toContain(
			'vaultman-content-header nav-header',
		);
	});

	it('renders a landing state for idle or empty Content searches', () => {
		expect(tabContentSource).toContain('vaultman-content-landing');
		expect(tabContentSource).toContain("translate('content.landing_title')");
		expect(tabContentSource).toContain("translate('content.empty_desc')");
	});
});
