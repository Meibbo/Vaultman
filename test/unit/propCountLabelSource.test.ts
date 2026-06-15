import { describe, expect, it } from 'vitest';

import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';
import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupViewSource from '../../src/components/layout/popupView.svelte?raw';

describe('Files prop count label source guards', () => {
	it('labels Files count cells as prop counts without renaming generic count labels', () => {
		expect(enSource).toContain("'viewmode.pill.prop_count': 'Prop Count'");
		expect(esSource).toContain("'viewmode.pill.prop_count': 'Props'");

		expect(popupViewSource).toContain(
			"{ id: 'count', labelKey: 'viewmode.pill.prop_count', defaultOn: true }",
		);
		expect(navbarFiltersSource).toContain(
			"count: 'viewmode.pill.prop_count'",
		);
		expect(navbarFiltersSource).toContain(
			"props: {\n\t\t\ticon: 'viewmode.pill.icon',\n\t\t\ttext: 'viewmode.pill.text',\n\t\t\tcount: 'viewmode.pill.count'",
		);
		expect(navbarFiltersSource).toContain(
			"tags: {\n\t\t\ticon: 'viewmode.pill.icon',\n\t\t\ttext: 'viewmode.pill.text',\n\t\t\tcount: 'viewmode.pill.count'",
		);
		expect(enSource).toContain("'viewmode.pill.count': 'Count'");
	});
});
