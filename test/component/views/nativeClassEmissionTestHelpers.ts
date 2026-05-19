import { PRESET_NATIVE, PRESET_VAULTMAN } from '../../../src/config/themePresetsBuiltin';
import { PRESET_KEY } from '../../../src/components/explorer/viewHostContext';
import type { ThemePreset } from '../../../src/types/typeThemePreset';

export function presetContext(preset: ThemePreset): ReadonlyArray<readonly [symbol, unknown]> {
	return [[PRESET_KEY, { value: () => preset }]];
}

export function nativePresetContext(): ReadonlyArray<readonly [symbol, unknown]> {
	return presetContext(PRESET_NATIVE);
}

export function vaultmanPresetContext(): ReadonlyArray<readonly [symbol, unknown]> {
	return presetContext(PRESET_VAULTMAN);
}
