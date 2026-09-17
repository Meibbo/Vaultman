import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import saveTemplateSource from '../../src/modals/modalSaveTemplate.ts?raw';
import queueTemplateSource from '../../src/utils/queueTemplateMenu.ts?raw';
import filtersPageSource from '../../src/components/pages/pageFilters.svelte?raw';

describe('create and update save notices', () => {
	it('defines distinct translated notices for each save flow', () => {
		for (const [saved, updated] of [
			['viewmenu.saved_config_notice', 'viewmenu.updated_config_notice'],
			['filter.template.saved_notice', 'filter.template.updated_notice'],
			['queue.template.saved_notice', 'queue.template.updated_notice'],
		] as const) {
			expect(en[saved]).toBeTruthy();
			expect(en[updated]).toBeTruthy();
			expect(es[saved]).toBeTruthy();
			expect(es[updated]).toBeTruthy();
			expect(en[saved]).not.toBe(en[updated]);
			expect(es[saved]).not.toBe(es[updated]);
		}
	});

	it('branches composition saves on an existing name', () => {
		expect(filtersPageSource).toContain('const isUpdate =');
		expect(filtersPageSource).toContain("'viewmenu.updated_config_notice'");
		expect(filtersPageSource).toContain("'viewmenu.saved_config_notice'");
	});

	it('notifies filter and queue template creates and replacements', () => {
		for (const source of [saveTemplateSource, queueTemplateSource]) {
			expect(source).toContain('new Notice(');
			expect(source).toContain('saved_notice');
			expect(source).toContain('updated_notice');
			expect(source).toContain('isUpdate');
		}
	});
});
