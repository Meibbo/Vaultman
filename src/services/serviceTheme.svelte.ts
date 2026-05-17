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
		this.#syncCustomStyles();
	}

	unregisterCustomPreset(id: ThemePresetId): void {
		const before = this.customPresets.length;
		this.customPresets = this.customPresets.filter((preset) => preset.id !== id);
		if (this.customPresets.length === before) return;
		if (this.activePresetId === id) this.activePresetId = 'native';
		this.#syncCustomStyles();
	}

	updateCustomPreset(id: ThemePresetId, partial: Partial<ThemePreset>): void {
		this.customPresets = this.customPresets.map((preset) =>
			preset.id === id ? { ...preset, ...partial, source: 'custom' as const, id } : preset,
		);
		this.#syncCustomStyles();
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
		this.#syncCustomStyles();
	}

	dispose(): void {
		this.#styleEl?.remove();
		this.#styleEl = null;
	}

	#cssEscape(id: string): string {
		return id.replace(/[^a-zA-Z0-9_-]/g, '-');
	}

	#styleEl: HTMLStyleElement | null = null;

	#syncCustomStyles(): void {
		if (typeof activeDocument === 'undefined') return;
		const doc = activeDocument;
		if (!doc?.head) return;

		if (this.customPresets.length === 0) {
			this.#styleEl?.remove();
			this.#styleEl = null;
			return;
		}

		const css = this.customPresets.map((preset) => this.#renderCustomBlock(preset)).join('\n');

		if (!this.#styleEl || this.#styleEl.ownerDocument !== doc) {
			this.#styleEl?.remove();
			// Custom preset tokens are user data, so they cannot be emitted in styles.css.
			this.#styleEl = doc.createElement('style');
			this.#styleEl.dataset.vmThemePresets = 'custom';
			doc.head.appendChild(this.#styleEl);
		}
		if (this.#styleEl) this.#styleEl.textContent = css;
	}

	#renderCustomBlock(preset: ThemePreset): string {
		const safeId = this.#cssEscape(preset.id);
		const bgOpacity = this.#sanitizeNumber01(preset.chrome.popupBgOpacity);
		const blur = this.#sanitizeCssLength(preset.chrome.popupBackdropBlur);
		const bgTint = this.#sanitizeNumber01(preset.chrome.popupBgTint);
		const rowHeight = this.#sanitizeCssLength(preset.density.rowHeight);
		const rowPaddingY = this.#sanitizeCssLength(preset.density.rowPaddingY);
		const iconSize = this.#sanitizeCssLength(preset.density.iconSize);
		return `.vm-theme-${safeId} {
  --vm-popup-bg-opacity: ${bgOpacity};
  --vm-popup-backdrop-blur: ${blur};
  --vm-popup-bg-tint: ${bgTint};
  --vm-row-height: ${rowHeight};
  --vm-row-padding-y: ${rowPaddingY};
  --vm-icon-size: ${iconSize};
}`;
	}

	#sanitizeCssLength(value: string): string {
		return /^-?\d+(\.\d+)?(px|em|rem|%|vh|vw)$|^0$/.test(value) ? value : '0';
	}

	#sanitizeNumber01(value: number): string {
		if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
		if (value < 0) return '0';
		if (value > 1) return '1';
		return String(value);
	}
}
