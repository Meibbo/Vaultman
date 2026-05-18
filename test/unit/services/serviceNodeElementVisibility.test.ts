import { describe, expect, it } from 'vitest';
import {
	baseMaskFromPreset,
	computeNodeElementMask,
	mergeOverrides,
} from '../../../src/services/serviceNodeElementVisibility';
import type { ThemePreset } from '../../../src/types/typeThemePreset';
import type { NodeElementOverrides } from '../../../src/types/typeViewHost';

function makePreset(args: {
	lockNodeElementVisibility: boolean;
	media?: boolean;
	ops?: boolean;
	warnings?: boolean;
}): ThemePreset {
	return {
		source: 'built-in',
		id: 'test',
		displayName: 'test',
		useNativeDom: false,
		chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
		density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '16px' },
		dock: { visible: true, presentation: 'bar' },
		tabs: { visible: true, presentation: 'top-tabs', kind: 'workspace' },
		toolbar: { buttons: 'core' },
		viewModes: ['tree'],
		nodeElements: {
			icon: true,
			label: true,
			detail: true,
			media: args.media ?? false,
			badges: {
				ops: args.ops ?? true,
				filters: true,
				warnings: args.warnings ?? true,
				inherited: true,
				counts: true,
			},
			actions: true,
		},
		lockNodeElementVisibility: args.lockNodeElementVisibility,
	};
}

describe('serviceNodeElementVisibility - invariants', () => {
	it('baseMaskFromPreset returns a fresh mask reflecting preset.nodeElements', () => {
		const preset = makePreset({ lockNodeElementVisibility: false, media: false });
		const mask = baseMaskFromPreset(preset);
		expect(mask.icon).toBe(true);
		expect(mask.label).toBe(true);
		expect(mask.detail).toBe(true);
		expect(mask.media).toBe(false);
		expect(mask.badges.ops).toBe(true);
		expect(mask.badges.warnings).toBe(true);
		expect(mask.actions).toBe(true);
	});

	it('computeNodeElementMask ignores overrides when lockNodeElementVisibility=true', () => {
		const preset = makePreset({ lockNodeElementVisibility: true, media: false });
		const overrides: NodeElementOverrides = { media: true, icon: false };
		const mask = computeNodeElementMask(preset, overrides);
		expect(mask.media).toBe(false);
		expect(mask.icon).toBe(true);
	});

	it('computeNodeElementMask applies overrides when lockNodeElementVisibility=false', () => {
		const preset = makePreset({ lockNodeElementVisibility: false, media: false });
		const mask = computeNodeElementMask(preset, { media: true });
		expect(mask.media).toBe(true);
	});

	it('null overrides equivalent to undefined overrides', () => {
		const preset = makePreset({ lockNodeElementVisibility: false });
		const m1 = computeNodeElementMask(preset, null);
		const m2 = computeNodeElementMask(preset, undefined as unknown as NodeElementOverrides);
		expect(m1).toEqual(m2);
	});

	it('mergeOverrides shallow-merges simple keys', () => {
		const base = baseMaskFromPreset(makePreset({ lockNodeElementVisibility: false }));
		const merged = mergeOverrides(base, { detail: false, actions: false });
		expect(merged.icon).toBe(base.icon);
		expect(merged.detail).toBe(false);
		expect(merged.actions).toBe(false);
	});

	it('mergeOverrides sub-merges badges per key', () => {
		const base = baseMaskFromPreset(
			makePreset({
				lockNodeElementVisibility: false,
				ops: true,
				warnings: true,
			}),
		);
		const merged = mergeOverrides(base, { badges: { warnings: false } });
		expect(merged.badges.warnings).toBe(false);
		expect(merged.badges.ops).toBe(true);
		expect(merged.badges.filters).toBe(true);
		expect(merged.badges.inherited).toBe(true);
		expect(merged.badges.counts).toBe(true);
	});

	it('does not mutate preset.nodeElements', () => {
		const preset = makePreset({ lockNodeElementVisibility: false, ops: true });
		const before = JSON.stringify(preset.nodeElements);
		computeNodeElementMask(preset, { badges: { ops: false } });
		expect(JSON.stringify(preset.nodeElements)).toBe(before);
	});

	it('does not mutate overrides input', () => {
		const preset = makePreset({ lockNodeElementVisibility: false });
		const overrides: NodeElementOverrides = { icon: false, badges: { ops: false } };
		const before = JSON.stringify(overrides);
		computeNodeElementMask(preset, overrides);
		expect(JSON.stringify(overrides)).toBe(before);
	});

	it('determinism: same input yields structurally identical output', () => {
		const preset = makePreset({ lockNodeElementVisibility: false });
		const ov = { media: true } as NodeElementOverrides;
		const m1 = computeNodeElementMask(preset, ov);
		const m2 = computeNodeElementMask(preset, ov);
		expect(m1).toEqual(m2);
	});

	it('returned mask has fresh badges sub-object (not aliased to preset)', () => {
		const preset = makePreset({ lockNodeElementVisibility: false });
		const mask = baseMaskFromPreset(preset);
		expect(mask.badges).not.toBe(preset.nodeElements.badges);
	});
});
