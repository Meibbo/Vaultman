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
	] as const)('tab=%s cells=%j => %s', (tab, cells, expected) => {
		expect(expansionActionAvailable(tab, cells)).toBe(expected);
	});

	it('keeps reveal in the generic Tools projection while gating only expansion', () => {
		expect(navbarSource).toContain('expansionActionAvailable(');
		expect(navbarSource).toContain('visibleCellsByTab[activeTab]');

		const toolsStart = navbarSource.indexOf(
			'function openToolsMenu(event: MouseEvent)',
		);
		const toolsEnd = navbarSource.indexOf('\n\tfunction ', toolsStart + 1);
		const toolsSource = navbarSource.slice(toolsStart, toolsEnd);
		expect(toolsSource).toContain(
			'for (const node of panelWidgetProjection.nodes)',
		);
		expect(toolsSource).toContain(
			'if (!forcedOverflowIds.includes(node.id)) continue;',
		);
		expect(toolsSource).not.toContain('expansionActionAvailableForActiveTab');
		// Formatting-tolerant: what matters is which branch appends which node,
		// not how Prettier happened to wrap the argument list. The exact-string
		// form of these two silently broke the moment the calls went multi-line.
		expect(navbarSource).toMatch(
			/if \(activeTab === 'files'\) \{\s*append\(\s*'reveal-active-file'/,
		);
		expect(navbarSource).toMatch(
			/if \(expansionActionAvailableForActiveTab\) \{\s*append\(\s*'toggle-expansion'/,
		);

		expect(navbarSource).toContain('{#if compactPanelWidgetTools}');
		expect(navbarSource).toContain(
			"{#if expansionActionAvailableForActiveTab && toolbarNodeVisible('toggle-expansion')}",
		);
	});
});
