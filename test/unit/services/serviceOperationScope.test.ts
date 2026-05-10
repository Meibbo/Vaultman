import { describe, expect, it } from 'vitest';
import { mockTFile } from '../../helpers/obsidian-mocks';
import {
	normalizeOperationScope,
	resolveOperationScopeFiles,
} from '../../../src/services/serviceOperationScope';

describe('serviceOperationScope', () => {
	it('normalizes legacy all-file scope to auto', () => {
		expect(normalizeOperationScope('all')).toBe('auto');
		expect(normalizeOperationScope('selected')).toBe('selected');
		expect(normalizeOperationScope('filtered')).toBe('filtered');
		expect(normalizeOperationScope(undefined)).toBe('auto');
	});

	it('resolves auto as selected, then filtered, and never all vault files', () => {
		const selected = [mockTFile('selected.md')];
		const filtered = [mockTFile('filtered.md')];

		expect(resolveOperationScopeFiles({ scope: 'auto', selectedFiles: selected, filteredFiles: filtered })).toEqual(
			selected,
		);
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
});
