import { describe, expect, it } from 'vitest';
import {
	isBuiltInPreset,
	normalizeCustomPreset,
	type ThemePreset,
} from '../../../src/types/typeThemePreset';

const SAMPLE_BUILT_IN: ThemePreset = {
	source: 'built-in',
	id: 'sample',
	displayName: 'Sample',
	useNativeDom: false,
	chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
	density: { rowHeight: '30px', rowPaddingY: '4px', iconSize: '16px' },
	dock: { visible: true, presentation: 'bar' },
	tabs: { visible: true, presentation: 'top-tabs', kind: 'embedded' },
	toolbar: { buttons: 'full' },
	viewModes: ['tree'],
	nodeElements: {
		icon: true,
		label: true,
		detail: true,
		media: false,
		badges: { ops: false, filters: false, warnings: false, inherited: false, counts: false },
		actions: false,
	},
	lockNodeElementVisibility: false,
};

describe('isBuiltInPreset', () => {
	it('returns true for source: built-in', () => {
		expect(isBuiltInPreset(SAMPLE_BUILT_IN)).toBe(true);
	});

	it('returns false for source: custom', () => {
		const custom: ThemePreset = { ...SAMPLE_BUILT_IN, source: 'custom' };
		expect(isBuiltInPreset(custom)).toBe(false);
	});
});

function makeMinimalCustomRaw(overrides: Record<string, unknown> = {}): unknown {
	return {
		source: 'custom',
		id: 'unset',
		displayName: 'Test',
		useNativeDom: false,
		chrome: { popupBgOpacity: 0.5, popupBackdropBlur: '2px', popupBgTint: 0 },
		density: { rowHeight: '30px', rowPaddingY: '3px', iconSize: '15px' },
		dock: { visible: true, presentation: 'bar' },
		tabs: { visible: true, presentation: 'top-tabs', kind: 'embedded' },
		toolbar: { buttons: 'full' },
		viewModes: ['tree', 'list'],
		nodeElements: {
			icon: true,
			label: true,
			detail: true,
			media: false,
			badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
			actions: true,
		},
		lockNodeElementVisibility: false,
		...overrides,
	};
}

describe('normalizeCustomPreset', () => {
	it('rejects non-object inputs', () => {
		expect(normalizeCustomPreset(null)).toBeNull();
		expect(normalizeCustomPreset(undefined)).toBeNull();
		expect(normalizeCustomPreset('string')).toBeNull();
		expect(normalizeCustomPreset(42)).toBeNull();
		expect(normalizeCustomPreset([])).toBeNull();
	});

	it('rejects source !== "custom"', () => {
		const raw = makeMinimalCustomRaw({ source: 'built-in', id: 'x' });
		expect(normalizeCustomPreset(raw)).toBeNull();
	});

	it('rejects built-in id collisions', () => {
		expect(normalizeCustomPreset(makeMinimalCustomRaw({ id: 'native' }))).toBeNull();
		expect(normalizeCustomPreset(makeMinimalCustomRaw({ id: 'vaultman' }))).toBeNull();
	});

	it('rejects missing or empty id', () => {
		expect(normalizeCustomPreset(makeMinimalCustomRaw({ id: '' }))).toBeNull();
		expect(normalizeCustomPreset(makeMinimalCustomRaw({ id: 42 }))).toBeNull();
	});

	it('rejects invalid chrome and density primitives', () => {
		expect(
			normalizeCustomPreset(
				makeMinimalCustomRaw({
					id: 'bad-opacity',
					chrome: { popupBgOpacity: 2, popupBackdropBlur: '2px', popupBgTint: 0 },
				}),
			),
		).toBeNull();
		expect(
			normalizeCustomPreset(
				makeMinimalCustomRaw({
					id: 'bad-length',
					density: { rowHeight: 'calc(1px)', rowPaddingY: '3px', iconSize: '15px' },
				}),
			),
		).toBeNull();
	});

	it('accepts a minimal valid custom and returns it', () => {
		const raw = makeMinimalCustomRaw({ id: 'mine' });
		const result = normalizeCustomPreset(raw);
		expect(result).not.toBeNull();
		expect(result?.source).toBe('custom');
		expect(result?.id).toBe('mine');
	});

	it('forces nodeElements.media to false even if raw says true', () => {
		const raw = makeMinimalCustomRaw({
			id: 'm',
			nodeElements: {
				icon: true,
				label: true,
				detail: true,
				media: true,
				badges: { ops: false, filters: false, warnings: false, inherited: false, counts: false },
				actions: true,
			},
		});
		const result = normalizeCustomPreset(raw);
		expect(result?.nodeElements.media).toBe(false);
	});

	it('strips "markmap" from viewModes silently', () => {
		const raw = makeMinimalCustomRaw({
			id: 'm',
			viewModes: ['tree', 'markmap', 'list'],
		});
		const result = normalizeCustomPreset(raw);
		expect(result?.viewModes).toEqual(['tree', 'list']);
	});

	it('passes through valid extends id', () => {
		const raw = makeMinimalCustomRaw({ id: 'm', extends: 'native' });
		const result = normalizeCustomPreset(raw);
		expect(result?.extends).toBe('native');
	});

	it('ignores invalid extends types', () => {
		const raw = makeMinimalCustomRaw({ id: 'm', extends: 42 });
		const result = normalizeCustomPreset(raw);
		expect(result?.extends).toBeUndefined();
	});

	it('preserves optional unload[] when valid', () => {
		const raw = makeMinimalCustomRaw({
			id: 'm',
			unload: ['file-explorer', 'tag-pane'],
		});
		const result = normalizeCustomPreset(raw);
		expect(result?.unload).toEqual(['file-explorer', 'tag-pane']);
	});
});
