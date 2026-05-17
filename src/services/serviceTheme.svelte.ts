import type {
	ElasticUiSettings,
	VaultmanUiIdentity,
	VaultmanUiMode,
} from '../types/typeElasticUi';
import {
	normalizeCustomPreset,
	type ThemePreset,
	type ThemePresetId,
} from '../types/typeThemePreset';
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
		return this.activePreset.useNativeDom;
	}

	get rootClasses(): string[] {
		const out = [
			'vm-root',
			`vm-mode-${this.mode}`,
			`vm-id-${this.identity}`,
			`vm-theme-${this.#cssEscape(this.activePresetId)}`,
		];
		if (this.faintActive) out.push('vm-faint');
		if (this.reducedMotion) out.push('vm-reduced-motion');
		if (this.foulDetection) out.push('vm-foul-detect');
		return out;
	}

	setPreset(id: ThemePresetId): void {
		if (!this.availablePresets.some((preset) => preset.id === id)) {
			this.activePresetId = 'native';
			return;
		}
		this.activePresetId = id;
	}

	registerCustomPreset(preset: ThemePreset): void {
		if (preset.source !== 'custom') return;
		if (preset.id === 'native' || preset.id === 'vaultman') return;
		const next = this.customPresets.filter((candidate) => candidate.id !== preset.id);
		this.customPresets = [...next, preset];
	}

	unregisterCustomPreset(id: ThemePresetId): void {
		const before = this.customPresets.length;
		this.customPresets = this.customPresets.filter((preset) => preset.id !== id);
		if (this.customPresets.length === before) return;
		if (this.activePresetId === id) this.activePresetId = 'native';
	}

	updateCustomPreset(id: ThemePresetId, partial: Partial<ThemePreset>): void {
		this.customPresets = this.customPresets.map((preset) =>
			preset.id === id ? { ...preset, ...partial, source: 'custom' as const, id } : preset,
		);
	}

	hydrate(settings: ElasticUiSettings): void {
		this.mode = settings.mode;
		this.identity = settings.identity;
		this.faintModeEnabled = settings.faintModeEnabled;
		this.reducedMotion = settings.reducedMotion;
		this.foulDetection = settings.foulDetection;
		this.activePresetId = settings.themePresetId ?? 'vaultman';
		this.customPresets = (settings.customPresets ?? [])
			.map((preset) => normalizeCustomPreset(preset))
			.filter((preset): preset is ThemePreset => preset !== null);
	}

	#cssEscape(id: string): string {
		return id.replace(/[^a-zA-Z0-9_-]/g, '-');
	}
}
