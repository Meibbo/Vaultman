import type {
	ElasticUiSettings,
	VaultmanUiIdentity,
	VaultmanUiMode,
} from '../types/typeElasticUi';
import type { ThemePreset, ThemePresetId } from '../types/typeThemePreset';
import {
	BUILT_IN_PRESETS,
	PRESET_NATIVE,
	PRESET_VAULTMAN,
} from '../config/themePresetsBuiltin';

export class ThemeService {
	activePresetId = $state<ThemePresetId>('vaultman');
	customPresets = $state<readonly ThemePreset[]>([]);

	mode = $state<VaultmanUiMode>('thin');
	identity = $state<VaultmanUiIdentity>('native');
	faintModeEnabled = $state(false);
	reducedMotion = $state(false);
	windowFocused = $state(true);
	foulDetection = $state(false);

	get activePreset(): ThemePreset {
		if (this.activePresetId === 'native') return PRESET_NATIVE;
		if (this.activePresetId === 'vaultman') return PRESET_VAULTMAN;
		const custom = this.customPresets.find((preset) => preset.id === this.activePresetId);
		return custom ?? PRESET_VAULTMAN;
	}

	get availablePresets(): readonly ThemePreset[] {
		return [...BUILT_IN_PRESETS, ...this.customPresets];
	}

	get faintActive(): boolean {
		return this.faintModeEnabled && !this.windowFocused;
	}

	get useUtilities(): boolean {
		return this.mode !== 'thin';
	}

	get useNativeDom(): boolean {
		return this.mode === 'thin' || this.identity === 'native';
	}

	get rootClasses(): string[] {
		const out = ['vm-root', `vm-mode-${this.mode}`, `vm-id-${this.identity}`];
		if (this.faintActive) out.push('vm-faint');
		if (this.reducedMotion) out.push('vm-reduced-motion');
		if (this.foulDetection) out.push('vm-foul-detect');
		return out;
	}

	hydrate(settings: ElasticUiSettings): void {
		this.mode = settings.mode;
		this.identity = settings.identity;
		this.faintModeEnabled = settings.faintModeEnabled;
		this.reducedMotion = settings.reducedMotion;
		this.foulDetection = settings.foulDetection;
	}
}
