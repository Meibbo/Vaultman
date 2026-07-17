import { describe, expect, it, vi } from 'vitest';

import { applyGlassBlurSetting } from '../../src/logic/logicGlassBlur';

describe('applyGlassBlurSetting', () => {
	it('forces the CSS variable to zero for the minimal preset', () => {
		const setProperty = vi.fn();
		const settings = { minimalStyle: true, glassBlurIntensity: 83 };
		applyGlassBlurSetting({ setProperty }, settings);

		expect(setProperty).toHaveBeenCalledWith('--vaultman-glass-blur', '0px');
		expect(settings.glassBlurIntensity).toBe(83);
	});

	it('maps the stored intensity for the experimental preset', () => {
		const setProperty = vi.fn();
		applyGlassBlurSetting(
			{ setProperty },
			{
				minimalStyle: false,
				glassBlurIntensity: 75,
			},
		);

		expect(setProperty).toHaveBeenCalledWith('--vaultman-glass-blur', '15px');
	});

	it('preserves the 60-percent fallback for experimental installs', () => {
		const setProperty = vi.fn();
		applyGlassBlurSetting(
			{ setProperty },
			{ minimalStyle: false, glassBlurIntensity: undefined },
		);

		expect(setProperty).toHaveBeenCalledWith('--vaultman-glass-blur', '12px');
	});
});
