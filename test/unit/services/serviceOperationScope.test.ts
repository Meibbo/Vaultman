import { describe, expect, it } from 'vitest';
import { mockTFile } from '../../helpers/obsidian-mocks';
import {
	normalizeOperationScope,
	resolveOperationScopeFiles,
	resolveVerifiedOperationScopeFiles,
} from '../../../src/services/serviceOperationScope';

describe('serviceOperationScope', () => {
	it('normalizes legacy all-file scope to auto', () => {
		expect(normalizeOperationScope('all')).toBe('auto');
		expect(normalizeOperationScope('selected')).toBe('selected');
		expect(normalizeOperationScope('filtered')).toBe('filtered');
		expect(normalizeOperationScope(undefined)).toBe('auto');
	});

	it('resolves auto as visible selected, then filtered, and never all vault files', () => {
		const visibleSelected = mockTFile('visible-selected.md');
		const staleSelected = mockTFile('stale-selected.md');
		const filtered = [visibleSelected, mockTFile('filtered.md')];

		expect(
			resolveOperationScopeFiles({
				scope: 'auto',
				selectedFiles: [visibleSelected],
				filteredFiles: filtered,
			}),
		).toEqual([visibleSelected]);
		expect(
			resolveOperationScopeFiles({
				scope: 'auto',
				selectedFiles: [staleSelected],
				filteredFiles: filtered,
			}),
		).toEqual(filtered);
		expect(resolveOperationScopeFiles({ scope: 'auto', selectedFiles: [], filteredFiles: filtered })).toEqual(
			filtered,
		);
		expect(resolveOperationScopeFiles({ scope: 'auto', selectedFiles: [], filteredFiles: [] })).toEqual(
			[],
		);
	});

	it('does not widen selected or filtered scopes when their source set is empty', () => {
		const filtered = [mockTFile('filtered.md')];

		expect(resolveOperationScopeFiles({ scope: 'selected', selectedFiles: [], filteredFiles: filtered })).toEqual(
			[],
		);
		expect(resolveOperationScopeFiles({ scope: 'filtered', selectedFiles: [], filteredFiles: [] })).toEqual(
			[],
		);
	});

	it('clamps selected scope to visible files and reports stale selections', () => {
		const visible = mockTFile('visible.md');
		const stale = mockTFile('stale.md');

		const result = resolveVerifiedOperationScopeFiles({
			scope: 'selected',
			selectedFiles: [visible, stale],
			filteredFiles: [visible],
			visibleFiles: [visible],
		});

		expect(result.files).toEqual([visible]);
		expect(result.source).toBe('selected');
		expect(result.selectedCount).toBe(2);
		expect(result.visibleCount).toBe(1);
		expect(result.staleSelectedFiles).toEqual([stale]);
	});

	it('keeps provider-facing file resolution inside the visible filtered set', () => {
		const visible = mockTFile('visible.md');
		const stale = mockTFile('stale.md');

		expect(
			resolveOperationScopeFiles({
				scope: 'auto',
				selectedFiles: [stale],
				filteredFiles: [visible],
			}),
		).toEqual([visible]);
	});
});
