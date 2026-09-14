import { describe, expect, it } from 'vitest';

import {
	buildSavedLayoutPreview,
	type PayloadPreview,
} from '../../src/logic/logicPayloadPreview';
import { scopesForTab } from '../../src/logic/logicScopedSort';
import type { ExplorerTabId, SortScopeKey } from '../../src/types/typeUI';

const ALL_TABS: readonly ExplorerTabId[] = [
	'files',
	'props',
	'tags',
	'snippets',
	'plugins',
];

function section(preview: PayloadPreview, id: string) {
	const match = preview.sections.find((candidate) => candidate.id === id);
	expect(match, `missing section ${id}`).toBeDefined();
	return match!;
}

describe('U130-007 payload preview scopes', () => {
	it('recognizes exactly the scopes from scopesForTab for every tab', () => {
		for (const tab of ALL_TABS) {
			const preview = buildSavedLayoutPreview({
				name: `Scopes test - ${tab}`,
				config: {
					[tab]: {
						sortState: {},
					},
				},
			});

			const tabSection = section(preview, `layout:${tab}`);
			const previewScopes = tabSection.rows
				.map((r) => r.key.match(/^sortState\.sorts\.([^.]+)\.sortBy$/)?.[1])
				.filter((scope): scope is SortScopeKey => scope !== undefined);

			expect(previewScopes).toEqual(scopesForTab(tab));

			// Verify that providing all scopes from scopesForTab does not produce unknown-field warnings
			const sorts = Object.fromEntries(
				scopesForTab(tab).map((scope) => [
					scope,
					{ sortBy: 'name', direction: 'asc' },
				]),
			);
			const previewWithSorts = buildSavedLayoutPreview({
				name: `Scopes validation - ${tab}`,
				config: {
					[tab]: {
						sortState: { activeScope: 'all', sorts },
					},
				},
			});
			const sectionWithSorts = section(previewWithSorts, `layout:${tab}`);
			for (const scope of scopesForTab(tab)) {
				const unknownRow = sectionWithSorts.rows.find(
					(r) =>
						r.key === `sortState.sorts.${scope}` &&
						r.note === 'unknown-field',
				);
				expect(
					unknownRow,
					`scope ${scope} in tab ${tab} was unexpectedly flagged as unknown-field`,
				).toBeUndefined();
			}
		}
	});

	it('migrates a persisted groups sort to level 0 on every tab without rejecting it (spec 08 §3.1.bis)', () => {
		for (const tab of ALL_TABS) {
			const expectedSortBy =
				tab === 'snippets' || tab === 'plugins' ? 'updated' : 'mtime';
			const preview = buildSavedLayoutPreview({
				name: `Groups sort test - ${tab}`,
				config: {
					[tab]: {
						sortState: {
							activeScope: 'all',
							sorts: {
								groups: { sortBy: expectedSortBy, direction: 'desc' },
							},
						},
					},
				},
			});

			const tabSection = section(preview, `layout:${tab}`);

			const sortByRow = tabSection.rows.find(
				(r) => r.key === 'sortState.sorts.level:0.sortBy',
			);
			expect(
				sortByRow,
				`tab ${tab} should have sortState.sorts.level:0.sortBy`,
			).toBeDefined();
			expect(sortByRow?.value).toBe(expectedSortBy);

			const directionRow = tabSection.rows.find(
				(r) => r.key === 'sortState.sorts.level:0.direction',
			);
			expect(
				directionRow,
				`tab ${tab} should have sortState.sorts.level:0.direction`,
			).toBeDefined();
			expect(directionRow?.value).toBe('desc');

			const unknownGroupRow = tabSection.rows.find(
				(r) =>
					r.key === 'sortState.sorts.groups' && r.note === 'unknown-field',
			);
			expect(
				unknownGroupRow,
				`tab ${tab} must not flag groups sort as unknown-field`,
			).toBeUndefined();
		}
	});

	it('does not discard props sort in all as invalid or unknown', () => {
		const preview = buildSavedLayoutPreview({
			name: 'Props all sort test',
			config: {
				props: {
					sortState: {
						activeScope: 'all',
						sorts: {
							all: { sortBy: 'name', direction: 'desc' },
						},
					},
				},
			},
		});

		const tabSection = section(preview, 'layout:props');

		const sortByRow = tabSection.rows.find(
			(r) => r.key === 'sortState.sorts.all.sortBy',
		);
		expect(
			sortByRow,
			'props should have sortState.sorts.all.sortBy',
		).toBeDefined();
		expect(sortByRow?.value).toBe('name');

		const directionRow = tabSection.rows.find(
			(r) => r.key === 'sortState.sorts.all.direction',
		);
		expect(
			directionRow,
			'props should have sortState.sorts.all.direction',
		).toBeDefined();
		expect(directionRow?.value).toBe('desc');

		const unknownAllRow = tabSection.rows.find(
			(r) => r.key === 'sortState.sorts.all' && r.note === 'unknown-field',
		);
		expect(
			unknownAllRow,
			'props must not discard all sort as unknown-field',
		).toBeUndefined();
	});
});
