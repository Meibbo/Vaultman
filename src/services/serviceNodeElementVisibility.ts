import type { ThemePreset } from '../types/typeThemePreset';
import type { NodeElementMask, NodeElementOverrides } from '../types/typeViewHost';

export function baseMaskFromPreset(preset: ThemePreset): NodeElementMask {
	return {
		icon: preset.nodeElements.icon,
		label: preset.nodeElements.label,
		detail: preset.nodeElements.detail,
		media: preset.nodeElements.media,
		badges: { ...preset.nodeElements.badges },
		actions: preset.nodeElements.actions,
	};
}

export function mergeOverrides(
	base: NodeElementMask,
	ov: NodeElementOverrides,
): NodeElementMask {
	return {
		icon: ov.icon ?? base.icon,
		label: ov.label ?? base.label,
		detail: ov.detail ?? base.detail,
		media: ov.media ?? base.media,
		badges: {
			ops: ov.badges?.ops ?? base.badges.ops,
			filters: ov.badges?.filters ?? base.badges.filters,
			warnings: ov.badges?.warnings ?? base.badges.warnings,
			inherited: ov.badges?.inherited ?? base.badges.inherited,
			counts: ov.badges?.counts ?? base.badges.counts,
		},
		actions: ov.actions ?? base.actions,
	};
}

export function computeNodeElementMask(
	preset: ThemePreset,
	overrides: NodeElementOverrides | null | undefined,
): NodeElementMask {
	if (preset.lockNodeElementVisibility) {
		return baseMaskFromPreset(preset);
	}
	return mergeOverrides(baseMaskFromPreset(preset), overrides ?? {});
}
