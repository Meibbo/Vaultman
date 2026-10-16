import { describe, expect, it } from 'vitest';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';
import tabApiSceneSource from '../../src/components/pages/tabApiScene.svelte?raw';
import apiSceneHostSource from '../../src/components/layout/apiSceneHost.svelte?raw';

describe('ApiScene single toolbar in VaultmanFrame', () => {
	it('skips panel widget publication in pageFilters when apiscene is active', () => {
		expect(pageFiltersSource).toContain("if (filtersActiveTab === 'apiscene') {");
		expect(pageFiltersSource).toContain('onPanelWidgetStateChange?.(null);');
		expect(pageFiltersSource).toContain('return;');
	});

	it('wires scene navigation into TabApiScene and ApiSceneHost', () => {
		expect(pageFiltersSource).toContain('tabOptions={filterTabOptions}');
		expect(pageFiltersSource).toContain('{tabMenuActions}');
		expect(pageFiltersSource).toContain('activeSectionTab={filtersActiveTab}');
		expect(pageFiltersSource).toContain('onSectionTabChange={switchFiltersTab}');

		expect(tabApiSceneSource).toContain('tabOptions,');
		expect(tabApiSceneSource).toContain('tabMenuActions,');
		expect(tabApiSceneSource).toContain('activeSectionTab,');
		expect(tabApiSceneSource).toContain('onSectionTabChange,');

		expect(apiSceneHostSource).toContain('tabOptions: tabOptions ?? [');
		expect(apiSceneHostSource).toContain('tabMenuActions: tabMenuActions ?? [],');
		expect(apiSceneHostSource).toContain('onSectionTabChange,');
	});
});
