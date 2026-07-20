import { describe, expect, it } from 'vitest';

import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import { expansionActionAvailable } from '../../src/logic/logicTreeExpansion';

describe('BT5-006 contextual expand/collapse availability', () => {
	it.each([
		['files', ['name', 'nested'], true],
		['props', ['icon', 'nested'], true],
		['tags', ['count', 'nested'], true],
		['files', ['name'], false],
		['props', ['icon'], false],
		['tags', ['count'], false],
		['snippets', ['nested'], false],
		['plugins', ['nested'], false],
	] as const)(
		'tab=%s cells=%j => %s',
		(tab, cells, expected) => {
			expect(expansionActionAvailable(tab, cells)).toBe(expected);
		},
	);

	it('keeps the compact Files Tools entry while gating only expansion', () => {
		expect(navbarSource).toContain('expansionActionAvailable(');
		expect(navbarSource).toContain('visibleCellsByTab[activeTab]');

		const toolsStart = navbarSource.indexOf(
			'function openToolsMenu(event: MouseEvent)',
		);
		const toolsEnd = navbarSource.indexOf('\n\tfunction ', toolsStart + 1);
		const toolsSource = navbarSource.slice(toolsStart, toolsEnd);
		expect(toolsSource).toContain("translate('filter.auto_reveal')");
		expect(toolsSource).toContain(
			'if (expansionActionAvailableForActiveTab)',
		);

		expect(navbarSource).toContain(
			"{#if activeTab === 'files' && compactFilesTools}",
		);
		expect(navbarSource).toContain(
			'{:else if expansionActionAvailableForActiveTab}',
		);
	});
});
