import { describe, expect, it } from 'vitest';

import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupSource from '../../src/components/layout/popupSort.svelte?raw';

describe('explorer sort UI source', () => {
	it('exposes modified and created time instead of the ambiguous date sort', () => {
		for (const source of [navbarSource, popupSource]) {
			expect(source).toContain("id: 'mtime'");
			expect(source).toContain("id: 'ctime'");
			expect(source).not.toMatch(
				/\{\s*id:\s*'date'[\s\S]{0,100}labelKey:\s*'sort\.by\.date'/,
			);
		}
	});

	it('transports Files Parents First through native and popup sort controls', () => {
		expect(navbarSource).toContain('parentsFirst: true');
		expect(navbarSource).toContain("translate('sort.parents_first')");
		expect(popupSource).toContain('parentsFirst');
		expect(popupSource).toContain("translate('sort.parents_first')");
	});

	it('labels Files count sort as Props without renaming generic count sorts', () => {
		expect(navbarSource).toContain("labelKey: 'sort.by.props'");
		expect(popupSource).toContain("labelKey: 'sort.by.props'");
	});
});
