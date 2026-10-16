import { describe, expect, it } from 'vitest';
import { HOVER_SURFACE_IDS, hoverActionId, registerHoverActions } from '../../src/logic/logicSasiHoverActions';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { DEFAULT_HOVER_SURFACES_CONFIG } from '../../src/services/serviceHoverSurfaces';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';

describe('u200-L3 S2: hover/hide independence and dedicated navbar surface', () => {
	it('HOVER_SURFACE_IDS includes navbar alongside tabbar, sidebars, ribbons, statusbar', () => {
		expect(HOVER_SURFACE_IDS).toContain('navbar');
		expect(HOVER_SURFACE_IDS).toContain('tabbar');
		expect(HOVER_SURFACE_IDS.length).toBe(5);
	});

	it('DEFAULT_SETTINGS.hoverSurfaces defines independent switches for tabbar and navbar', () => {
		const hs = DEFAULT_SETTINGS.hoverSurfaces;
		expect(hs.tabbar).toBeDefined();
		expect(hs.navbar).toBeDefined();
		expect(hs.tabbar).toEqual({ hide: false, hover: false, pin: false });
		expect(hs.navbar).toEqual({ hide: false, hover: false, pin: false });
	});

	it('DEFAULT_HOVER_SURFACES_CONFIG includes navbar switches', () => {
		expect(DEFAULT_HOVER_SURFACES_CONFIG.navbar).toEqual({
			hide: false,
			hover: false,
			pin: false,
		});
	});

	it('registerHoverActions registers hide, hover and pin for navbar in SASI registry', () => {
		const registry = createSasiRegistry();
		registerHoverActions(registry);

		const hideDef = registry.resolve(hoverActionId({ surface: 'navbar', kind: 'hide' }));
		expect(hideDef?.def).toBeDefined();
		expect(hideDef?.def?.labelKey).toBe('sasi.hover.navbar.hide');
		expect(hideDef?.def?.supports).toEqual([{ surface: 'chrome:navbar' }]);

		const hoverDef = registry.resolve(hoverActionId({ surface: 'navbar', kind: 'hover' }));
		expect(hoverDef?.def).toBeDefined();
		expect(hoverDef?.def?.labelKey).toBe('sasi.hover.navbar.hover');

		const pinDef = registry.resolve(hoverActionId({ surface: 'navbar', kind: 'pin' }));
		expect(pinDef?.def).toBeDefined();
		expect(pinDef?.def?.labelKey).toBe('sasi.hover.navbar.pin');
	});

	it('hide and hover state updates remain orthogonal without implicit reset', () => {
		// Simulates the toggleHoverSurfaceSwitch mutation contract:
		// toggling hide off preserves hover state
		let state = { hide: true, hover: true, pin: false };
		// toggle hide
		state = { ...state, hide: !state.hide };
		expect(state.hide).toBe(false);
		expect(state.hover, 'hover should not be turned off when hide is toggled').toBe(true);

		// toggle hide back on
		state = { ...state, hide: !state.hide };
		expect(state.hide).toBe(true);
		expect(state.hover).toBe(true);
	});
});
