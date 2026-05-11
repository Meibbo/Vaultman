import type {
	ElasticUiSettings,
	VaultmanUiIdentity,
	VaultmanUiMode,
} from '../types/typeElasticUi';

export class ThemeService {
	mode = $state<VaultmanUiMode>('thin');
	identity = $state<VaultmanUiIdentity>('native');
	faintModeEnabled = $state(false);
	reducedMotion = $state(false);
	windowFocused = $state(true);
	foulDetection = $state(false);

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
