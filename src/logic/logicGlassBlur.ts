export interface GlassBlurSettings {
	minimalStyle: boolean;
	glassBlurIntensity?: number;
}

export interface GlassBlurStyleTarget {
	setProperty(name: string, value: string): void;
}

/** Apply the preset-aware glass blur without mutating the stored intensity. */
export function applyGlassBlurSetting(
	style: GlassBlurStyleTarget,
	settings: GlassBlurSettings,
): void {
	const intensity = settings.minimalStyle
		? 0
		: (settings.glassBlurIntensity ?? 60);
	const px = (intensity / 100) * 20;
	style.setProperty('--vaultman-glass-blur', `${px}px`);
}
