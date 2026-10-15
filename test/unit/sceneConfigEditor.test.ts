import { describe, expect, it } from 'vitest';
import {
	applySceneConfigPath,
	parseSceneConfigEditorInput,
	validateSceneConfigInput,
} from '../../src/logic/logicSceneConfigEditor';

describe('scene config editor contracts', () => {
	it('rejects viewMode values outside the scene contract', () => {
		expect(validateSceneConfigInput('viewMode', 'bogus-mode', 'files').ok).toBe(false);
		const ok = validateSceneConfigInput('viewMode', 'tree', 'files');
		expect(ok).toEqual({ ok: true, value: 'tree' });
	});

	it('rejects non-boolean values for boolean fields', () => {
		expect(validateSceneConfigInput('indent', 'true').ok).toBe(false);
		expect(validateSceneConfigInput('indent', true)).toEqual({ ok: true, value: true });
	});

	it('rejects visibleCells that the cell registry would normalize away', () => {
		expect(validateSceneConfigInput('visibleCells', ['not-a-cell'], 'files').ok).toBe(false);
		expect(validateSceneConfigInput('visibleCells', 'name').ok).toBe(false);
	});

	it('rejects nativeCompat with unknown boundaries or modes', () => {
		expect(validateSceneConfigInput('nativeCompat', { tree: 'locked' }).ok).toBe(true);
		expect(validateSceneConfigInput('nativeCompat', { bogus: 'locked' }).ok).toBe(false);
		expect(validateSceneConfigInput('nativeCompat', { tree: 'bogus' }).ok).toBe(false);
	});

	it('reports invalid JSON separately from incompatible values', () => {
		expect(parseSceneConfigEditorInput('visibleCells', '[oops', 'files')).toEqual({
			ok: false, reason: 'invalid-json',
		});
		expect(parseSceneConfigEditorInput('visibleCells', '["not-a-cell"]', 'files')).toEqual({
			ok: false, reason: 'incompatible-value',
		});
	});

	it('resets sparsely, pruning emptied parent maps', () => {
		expect(applySceneConfigPath({ viewMode: 'table' }, ['viewMode'], undefined)).toEqual({});
		expect(
			applySceneConfigPath({ nativeCompat: { tree: 'locked' } }, ['nativeCompat', 'tree'], undefined),
		).toEqual({});
		expect(
			applySceneConfigPath(
				{ nativeCompat: { tree: 'locked', toolbar: 'locked' } },
				['nativeCompat', 'tree'],
				undefined,
			),
		).toEqual({ nativeCompat: { toolbar: 'locked' } });
	});
});
