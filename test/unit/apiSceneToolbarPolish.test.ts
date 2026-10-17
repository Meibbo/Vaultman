import { describe, expect, it } from 'vitest';
import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

describe('ApiScene Toolbar Polish', () => {
	it('translates scene_menu.tab.apiscene as API in en and es', () => {
		expect(en['scene_menu.tab.apiscene']).toBe('API');
		expect(es['scene_menu.tab.apiscene']).toBe('API');
	});

	it('resolves activeSectionTab apiscene to API in currentTabsOption', () => {
		expect(navbarFiltersSource).toContain("if (activeSectionTab === 'apiscene') {");
		expect(navbarFiltersSource).toContain("label: translate('scene_menu.tab.apiscene') || 'API',");
	});

	it('guards plugin update actions in toolbar to only mount for providerId plugins', () => {
		expect(navbarFiltersSource).toContain("if (activeTab === 'plugins' && providerId === 'plugins') {");
		expect(navbarFiltersSource).toContain("{#if activeTab === 'plugins' && providerId === 'plugins'}");
	});
});
