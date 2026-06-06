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
});
