import { describe, expect, it } from 'vitest';
import {
	FNR_FORMULA_ID_PREFIX,
	formulaNodeId,
	fnrRenamePreview,
	fnrScopeSummary,
	fnrContentReplaceLabel,
	fnrContentReplaceScopeCount,
	type FnRRenamePreviewInput,
} from '../../../src/logic/logicFnR';

describe('logicFnR — rename label/preview projection', () => {
	it('projects a property rename into a structured i18n preview descriptor', () => {
		const input: FnRRenamePreviewInput = {
			sourceKind: 'prop',
			original: 'status',
			fileCount: 3,
		};

		expect(fnrRenamePreview(input)).toEqual({
			key: 'fnr.rename.context',
			params: { kindKey: 'fnr.rename.kind.prop', original: 'status', count: 3 },
		});
	});

	it('projects tag and file renames through the same context key with their kind key', () => {
		expect(fnrRenamePreview({ sourceKind: 'tag', original: 'project', fileCount: 1 })).toEqual({
			key: 'fnr.rename.context',
			params: { kindKey: 'fnr.rename.kind.tag', original: 'project', count: 1 },
		});
		expect(fnrRenamePreview({ sourceKind: 'file', original: 'A.md', fileCount: 2 })).toEqual({
			key: 'fnr.rename.context',
			params: { kindKey: 'fnr.rename.kind.file', original: 'A.md', count: 2 },
		});
	});

	it('routes a value rename to the value-specific key carrying the owning prop', () => {
		expect(
			fnrRenamePreview({
				sourceKind: 'value',
				original: 'draft',
				propName: 'status',
				fileCount: 4,
			}),
		).toEqual({
			key: 'fnr.rename.context_value',
			params: { original: 'draft', prop: 'status', count: 4 },
		});
	});

	it('falls back to the generic context key for a value rename missing its prop', () => {
		expect(fnrRenamePreview({ sourceKind: 'value', original: 'draft', fileCount: 1 })).toEqual({
			key: 'fnr.rename.context',
			params: { kindKey: 'fnr.rename.kind.value', original: 'draft', count: 1 },
		});
	});

	it('is a pure projection: does not mutate its input', () => {
		const input: FnRRenamePreviewInput = { sourceKind: 'prop', original: 'status', fileCount: 3 };
		const snapshot = JSON.stringify(input);
		fnrRenamePreview(input);
		expect(JSON.stringify(input)).toBe(snapshot);
	});
});

describe('logicFnR — scope summary projection', () => {
	it('projects the filtered scope into a structured summary descriptor', () => {
		expect(fnrScopeSummary('filtered', 12)).toEqual({
			key: 'fnr.scope_label',
			params: { count: 12, scopeKey: 'fnr.scope.filtered' },
		});
	});

	it('projects the selected scope into a structured summary descriptor', () => {
		expect(fnrScopeSummary('selected', 0)).toEqual({
			key: 'fnr.scope_label',
			params: { count: 0, scopeKey: 'fnr.scope.selected' },
		});
	});
});

describe('logicFnR — content replace label/scope-count (preview-before-apply)', () => {
	it('builds the content replace details label with singular file wording', () => {
		expect(fnrContentReplaceLabel('foo', 'bar', 1)).toBe('Replace "foo" with "bar" in 1 file');
	});

	it('builds the content replace details label with plural file wording', () => {
		expect(fnrContentReplaceLabel('foo', 'bar', 3)).toBe('Replace "foo" with "bar" in 3 files');
	});

	it('reports the scope count straight from the projected file list (no mutation)', () => {
		expect(fnrContentReplaceScopeCount(['a.md', 'b.md'])).toBe(2);
		expect(fnrContentReplaceScopeCount([])).toBe(0);
	});
});

describe('logicFnR — formula namespacing (D6)', () => {
	it('namespaces a formula/rule id under formula.', () => {
		expect(FNR_FORMULA_ID_PREFIX).toBe('formula.');
		expect(formulaNodeId('content-replace-1')).toBe('formula.content-replace-1');
	});
});
