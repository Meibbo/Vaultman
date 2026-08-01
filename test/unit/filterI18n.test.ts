import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import addFilterSource from '../../src/modals/modalAddFilter.ts?raw';
import filtersPageSource from '../../src/components/pages/pageFilters.svelte?raw';

const EXPECTED_ENGLISH_FILTER_COPY = {
	'filter.has_property': 'Has prop',
	'filter.missing_property': 'Not prop',
	'filter.specific_value': 'Has value',
	'filter.multiple_values': 'Not value',
	'filter.folder': 'In folder',
	'filter.folder_exclude': 'Not folder',
	'filter.file_name': 'Has name',
	'filter.file_name_exclude': 'Not name',
	'filter.text_contains': 'Has text',
	'filter.text_not_contains': 'Not text',
} as const;

const EXPECTED_SPANISH_FILTER_COPY = {
	'filter.has_property': 'Con propiedad',
	'filter.missing_property': 'Sin propiedad',
	'filter.specific_value': 'Con valor',
	'filter.multiple_values': 'Sin valor',
	'filter.folder': 'En carpeta',
	'filter.folder_exclude': 'Sin carpeta',
	'filter.file_name': 'Con nombre',
	'filter.file_name_exclude': 'Sin nombre',
	'filter.text_contains': 'Con texto',
	'filter.text_not_contains': 'Sin texto',
} as const;

describe('BT5-052 concise filter copy', () => {
	it('preserves the dev-authored English Has/Not catalog', () => {
		for (const [key, label] of Object.entries(EXPECTED_ENGLISH_FILTER_COPY)) {
			expect(en[key]).toBe(label);
		}
	});

	it('keeps Spanish keys semantically aligned and equally concise', () => {
		for (const [key, label] of Object.entries(EXPECTED_SPANISH_FILTER_COPY)) {
			expect(es[key]).toBe(label);
		}
	});

	it('resolves every filter type the Add Filter modal requests', () => {
		for (const key of Object.keys(EXPECTED_ENGLISH_FILTER_COPY)) {
			expect(en[key]).not.toBe(key);
			expect(es[key]).not.toBe(key);
		}
		for (const key of Object.keys(EXPECTED_ENGLISH_FILTER_COPY).filter(
			(key) => !key.startsWith('filter.text_'),
		)) {
			expect(addFilterSource).toContain(`translate('${key}')`);
		}
		expect(filtersPageSource).toContain("translate('filter.text_contains')");
		expect(filtersPageSource).toContain(
			"translate('filter.text_not_contains')",
		);
	});
});
