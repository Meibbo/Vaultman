import type { SasiRegistry } from './logicSasiRegistry';

/**
 * U130-? las nueve acciones de `serviceHoverSurfaces.ts`.
 *
 * El servicio expone 4 surfaces (`sidebars`, `ribbons`, `tabbar`, `statusbar`),
 * cada una con dos conmutadores (`hover`, `pin`), y un `lock` global: 9
 * entradas SASI, una por conmutador. Ninguna escribe en el vault: son cambios
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

export const HOVER_LOCK_ID = 'vaultman.hover.lock';

export const HOVER_SURFACE_IDS = [
	'sidebars',
	'ribbons',
	'tabbar',
	'statusbar',
] as const;

export type HoverSurface = (typeof HOVER_SURFACE_IDS)[number];

export interface HoverActionKey {
	surface: HoverSurface;
	kind: 'hover' | 'pin';
}

const LABEL_KEYS: Record<HoverSurface, { hover: string; pin: string }> = {
	sidebars: {
		hover: 'sasi.hover.sidebars.hover',
		pin: 'sasi.hover.sidebars.pin',
	},
	ribbons: {
		hover: 'sasi.hover.ribbons.hover',
		pin: 'sasi.hover.ribbons.pin',
	},
	tabbar: {
		hover: 'sasi.hover.tabbar.hover',
		pin: 'sasi.hover.tabbar.pin',
	},
	statusbar: {
		hover: 'sasi.hover.statusbar.hover',
		pin: 'sasi.hover.statusbar.pin',
	},
};

const ICONS: Record<HoverSurface, { hover: string; pin: string }> = {
	sidebars: { hover: 'lucide-panel-left', pin: 'lucide-pin' },
	ribbons: { hover: 'lucide-ribbon', pin: 'lucide-pin' },
	tabbar: { hover: 'lucide-rectangle-horizontal', pin: 'lucide-pin' },
	statusbar: { hover: 'lucide-bottom-bar', pin: 'lucide-pin' },
};

export function hoverActionId(key: HoverActionKey): string {
	return `vaultman.hover.${key.surface}.${key.kind === HOVER ? 'toggle' : 'pin'}`;
}

export function surfaceForHoverId(id: string): HoverSurface | null {
	for (const surface of HOVER_SURFACE_IDS) {
		if (id === hoverActionId({ surface, kind: HOVER })) return surface;
		if (id === hoverActionId({ surface, kind: PIN })) return surface;
	}
	return null;
}

export function kindForHoverId(id: string): 'hover' | 'pin' | null {
	for (const surface of HOVER_SURFACE_IDS) {
		if (id === hoverActionId({ surface, kind: HOVER })) return HOVER;
		if (id === hoverActionId({ surface, kind: PIN })) return PIN;
	}
	return null;
}

export function registerHoverActions(registry: SasiRegistry): void {
	for (const surface of HOVER_SURFACE_IDS) {
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
}
