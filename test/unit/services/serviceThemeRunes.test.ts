import { describe, expect, it } from 'vitest';
import { ThemeService } from '../../../src/services/serviceTheme.svelte';

describe('ThemeService (runes-backed elastic theme)', () => {
	it('defaults to thin mode + native identity, faint off', () => {
		const svc = new ThemeService();
		expect(svc.mode).toBe('thin');
		expect(svc.identity).toBe('native');
		expect(svc.faintActive).toBe(false);
		expect(svc.reducedMotion).toBe(false);
	});

	it('reports the canonical root class set', () => {
		const svc = new ThemeService();
		svc.mode = 'balanced';
		svc.identity = 'outline';
		svc.windowFocused = false;
		svc.faintModeEnabled = true;
		svc.reducedMotion = true;
		const classes = svc.rootClasses;
		expect(classes).toContain('vm-root');
		expect(classes).toContain('vm-mode-balanced');
		expect(classes).toContain('vm-id-outline');
		expect(classes).toContain('vm-faint');
		expect(classes).toContain('vm-reduced-motion');
	});

	it('faintActive flips only when windowFocused is false AND faintModeEnabled is true', () => {
		const svc = new ThemeService();
		svc.faintModeEnabled = true;
		svc.windowFocused = true;
		expect(svc.faintActive).toBe(false);
		svc.windowFocused = false;
		expect(svc.faintActive).toBe(true);
		svc.faintModeEnabled = false;
		expect(svc.faintActive).toBe(false);
	});

	it('useUtilities is true when mode is balanced or thick', () => {
		const svc = new ThemeService();
		svc.mode = 'thin';
		expect(svc.useUtilities).toBe(false);
		svc.mode = 'balanced';
		expect(svc.useUtilities).toBe(true);
		svc.mode = 'thick';
		expect(svc.useUtilities).toBe(true);
	});

	it('useNativeDom is true when mode is thin OR identity is native', () => {
		const svc = new ThemeService();
		svc.mode = 'thin';
		svc.identity = 'bases';
		expect(svc.useNativeDom).toBe(true);
		svc.mode = 'thick';
		svc.identity = 'native';
		expect(svc.useNativeDom).toBe(true);
		svc.mode = 'thick';
		svc.identity = 'bases';
		expect(svc.useNativeDom).toBe(false);
	});

	it('hydrate copies all 5 settings fields', () => {
		const svc = new ThemeService();
		svc.hydrate({
			mode: 'thick',
			identity: 'bases',
			faintModeEnabled: true,
			reducedMotion: true,
			foulDetection: true,
		});
		expect(svc.mode).toBe('thick');
		expect(svc.identity).toBe('bases');
		expect(svc.faintModeEnabled).toBe(true);
		expect(svc.reducedMotion).toBe(true);
		expect(svc.foulDetection).toBe(true);
	});
});
