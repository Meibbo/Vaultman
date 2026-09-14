import type { SasiRegistry } from './logicSasiRegistry';

/**
 * U130-? las acciones de `serviceHoverSurfaces.ts`: hide + hover + pin por
 * superficie, lock global y nested-ribbon.
 *
 * El servicio expone 4 surfaces (`sidebars`, `ribbons`, `tabbar`, `statusbar`),
 * cada una con tres conmutadores (`hide`, `hover`, `pin`), un `lock` global y
 * el `nestedRibbon` (ribbon oculto como disparador de la sidebar): 14
 * entradas SASI. Ninguna escribe en el vault: son cambios
 * de estado del workspace (clases CSS, listeners), asi que se registran como
 * `kind: 'action'` y nunca llevan `mutatesVault`.
 *
 * El handler concreto (leer/actualizar `HoverSurfacesAdapter.updateConfig`)
 * NO se registra aqui: SASI guarda la IDENTIDAD (id + labelKey), la ejecucion
 * es del publicador de comandos. Asi este modulo no toca
 * `serviceHoverSurfaces.ts` (que es de otro carril) y mantiene la frontera
 * del modelo: el registry describe, el publisher ejecuta.
 */

const HOVER = 'hover';
const PIN = 'pin';
const HIDE = 'hide';

export const HOVER_LOCK_ID = 'vaultman.hover.lock';
export const HOVER_NESTED_RIBBON_ID = 'vaultman.hover.nested-ribbon';

export const HOVER_SURFACE_IDS = [
	'sidebars',
	'ribbons',
	'tabbar',
	'statusbar',
] as const;

export type HoverSurface = (typeof HOVER_SURFACE_IDS)[number];

export interface HoverActionKey {
	surface: HoverSurface;
	kind: 'hide' | 'hover' | 'pin';
}

const LABEL_KEYS: Record<HoverSurface, { hide: string; hover: string; pin: string }> = {
	sidebars: {
		hide: 'sasi.hover.sidebars.hide',
		hover: 'sasi.hover.sidebars.hover',
		pin: 'sasi.hover.sidebars.pin',
	},
	ribbons: {
		hide: 'sasi.hover.ribbons.hide',
		hover: 'sasi.hover.ribbons.hover',
		pin: 'sasi.hover.ribbons.pin',
	},
	tabbar: {
		hide: 'sasi.hover.tabbar.hide',
		hover: 'sasi.hover.tabbar.hover',
		pin: 'sasi.hover.tabbar.pin',
	},
	statusbar: {
		hide: 'sasi.hover.statusbar.hide',
		hover: 'sasi.hover.statusbar.hover',
		pin: 'sasi.hover.statusbar.pin',
	},
};

const ICONS: Record<HoverSurface, { hide: string; hover: string; pin: string }> = {
	sidebars: { hide: 'lucide-panel-left-close', hover: 'lucide-panel-left', pin: 'lucide-pin' },
	ribbons: { hide: 'lucide-panel-left-close', hover: 'lucide-ribbon', pin: 'lucide-pin' },
	tabbar: { hide: 'lucide-panel-top', hover: 'lucide-rectangle-horizontal', pin: 'lucide-pin' },
	statusbar: { hide: 'lucide-panel-top', hover: 'lucide-bottom-bar', pin: 'lucide-pin' },
};

export function hoverActionId(key: HoverActionKey): string {
	if (key.kind === HIDE) return `vaultman.hover.${key.surface}.hide`;
	return `vaultman.hover.${key.surface}.${key.kind === HOVER ? 'toggle' : 'pin'}`;
}

export function surfaceForHoverId(id: string): HoverSurface | null {
	for (const surface of HOVER_SURFACE_IDS) {
		if (id === hoverActionId({ surface, kind: HIDE })) return surface;
		if (id === hoverActionId({ surface, kind: HOVER })) return surface;
		if (id === hoverActionId({ surface, kind: PIN })) return surface;
	}
	return null;
}

export function kindForHoverId(id: string): 'hide' | 'hover' | 'pin' | null {
	for (const surface of HOVER_SURFACE_IDS) {
		if (id === hoverActionId({ surface, kind: HIDE })) return HIDE;
		if (id === hoverActionId({ surface, kind: HOVER })) return HOVER;
		if (id === hoverActionId({ surface, kind: PIN })) return PIN;
	}
	return null;
}

export function registerHoverActions(registry: SasiRegistry): void {
	for (const surface of HOVER_SURFACE_IDS) {
		registry.register({
			id: hoverActionId({ surface, kind: HIDE }),
			axis: 'function',
			kind: 'action',
			labelKey: LABEL_KEYS[surface].hide,
			icon: ICONS[surface].hide,
			supports: [{ surface: 'chrome' }],
		});
		registry.register({
			id: hoverActionId({ surface, kind: HOVER }),
			axis: 'function',
			kind: 'action',
			labelKey: LABEL_KEYS[surface].hover,
			icon: ICONS[surface].hover,
			supports: [{ surface: 'chrome' }],
		});
		registry.register({
			id: hoverActionId({ surface, kind: PIN }),
			axis: 'function',
			kind: 'action',
			labelKey: LABEL_KEYS[surface].pin,
			icon: ICONS[surface].pin,
			supports: [{ surface: 'chrome' }],
		});
	}
	registry.register({
		id: HOVER_LOCK_ID,
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.hover.lock',
		icon: 'lucide-lock',
		supports: [{ surface: 'chrome' }],
	});
	registry.register({
		id: HOVER_NESTED_RIBBON_ID,
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.hover.nested-ribbon',
		icon: 'lucide-panel-left',
		supports: [{ surface: 'chrome' }],
	});
}
