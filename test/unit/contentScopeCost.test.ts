import { describe, expect, it } from 'vitest';

import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';

/**
 * The typing freeze.
 *
 * `contentSearchScopeFiles()` sits under `getFilesIgnoringContentSearch(true)`,
 * which walks every file in the vault, applies the filter tree and sorts the
 * result through a collator. It was called straight from the search effect, so
 * it ran once per keystroke — and again through `contentScopeSummary` — while
 * none of it depends on the query being typed.
 *
 * Guarded at the source because the cost is a Svelte reactivity property: what
 * matters is that the walk sits behind a `$derived` keyed on the scope, not that
 * any particular function returns any particular value.
 */

describe('the search scope is computed when the scope moves, not per keystroke', () => {
	const derivedBlock =
		pageFiltersSource.match(
			/const contentScopeFiles = \$derived\.by<TFile\[\]>\([\s\S]*?\n\t\}\);/,
		)?.[0] ?? '';

	it('reads the block it means to guard', () => {
		expect(derivedBlock).not.toBe('');
	});

	it('puts the vault walk behind a derived', () => {
		expect(derivedBlock).toContain('contentSearchCandidateFiles()');
	});

	it('keys that derived on the scope revision and the selection', () => {
		// The revision is the host's own signal that scope or filters moved; the
		// selection count covers the 'selected' scope, which the revision does not
		// describe. Neither moves when a character is typed.
		expect(derivedBlock).toContain('void contentSearchScopeRevision;');
		expect(derivedBlock).toContain('void selectedCount;');
		expect(derivedBlock).not.toContain('contentFind');
	});

	it('leaves the accessor as a plain read of the derived', () => {
		const accessor =
			pageFiltersSource.match(
				/function contentSearchScopeFiles\(\): TFile\[\] \{[\s\S]*?\n\t\}/,
			)?.[0] ?? '';
		expect(accessor).toContain('return contentScopeFiles;');
		// The whole point: no walk, no sort, nothing proportional to the vault.
		expect(accessor).not.toContain('contentSearchCandidateFiles');
		expect(accessor).not.toContain('getSelectedFiles');
	});
});
