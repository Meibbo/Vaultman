import { createSasiRegistry, type SasiRegistry } from './logicSasiRegistry';
import { registerAddonGroupToggleActions } from './logicAddonGroupToggle';
import { registerMoveActions } from './logicSasiMoveActions';
import { registerSceneInstanceActions } from './logicSasiSceneActions';
import { registerToolbarMenuActions } from './logicSasiToolbarActions';
import { registerSearchActions } from './logicSasiSearchActions';
import { registerHoverActions } from './logicSasiHoverActions';
import { registerSettingsActions } from './logicSasiSettingsActions';
import { registerSettingSceneCatalog } from './logicSasiSettingScene';
import { registerGroupSasiActions } from './logicGroupSelectionTransaction';
import {
	createSasiProvider,
	type SasiProvider,
} from '../services/serviceSasiProvider';

/**
 * U130: el UNICO sitio donde se decide que existe en SASI.
 *
 * Es una fabrica y no un singleton de modulo a proposito: `register()` lanza
 * con `id duplicado`, asi que un registro compartido entre dos arranques del
 * plugin -- recarga en caliente, tests -- reventaria el segundo. Cada
 * VaultmanPlugin trae el suyo y muere con el.
 */
export interface VaultmanSasi {
	registry: SasiRegistry;
	provider: SasiProvider;
}

/**
 * U130L correctiva: identidades de los ejes que el bootstrap historico
 * dejaba vacios. Estables y sin duplicar kinds (el `kind` de function
 * `action`/`operation`/`command` no es un id del eje `kind`).
 *
 * - Eje `kind`: la identidad `node_apis` (URN `sasi:node_apis:...`).
 * - Eje `provider`: los proveedores de datos del contrato Scene
 *   (`ExplorerTabId`: files, props, tags, snippets, plugins).
 * - Eje `surface`: las superficies chrome concretas. Son superficies,
 *   no function/action ni p-nodes `node_groups` (virtuales, nunca registro).
 */
const IDENTITY_KIND_ID = 'vaultman.kind.node_apis';

const PROVIDER_SCENES = [
	'files',
	'props',
	'tags',
	'snippets',
	'plugins',
	'lupapi',
] as const;

export const CHROME_SURFACES = [
	'chrome:left-sidebar',
	'chrome:right-sidebar',
	'chrome:left-ribbon',
	'chrome:right-ribbon',
	'chrome:tabbar',
	'chrome:navbar',
	'chrome:statusbar',
] as const;

export type ChromeSurface = (typeof CHROME_SURFACES)[number];

function registerIdentityKinds(registry: SasiRegistry): void {
	registry.register({
		id: IDENTITY_KIND_ID,
		axis: 'kind',
		labelKey: 'sasi.kind.node_apis',
		supports: [],
	});
}

function registerProviders(registry: SasiRegistry): void {
	for (const scene of PROVIDER_SCENES) {
		registry.register({
			id: `vaultman.provider.${scene}`,
			axis: 'provider',
			labelKey: `sasi.provider.${scene}`,
			supports: [],
		});
	}
}

function registerChromeSurfaces(registry: SasiRegistry): void {
	for (const surface of CHROME_SURFACES) {
		const short = surface.slice('chrome:'.length);
		registry.register({
			id: surface,
			axis: 'surface',
			labelKey: `sasi.surface.chrome.${short}`,
			supports: [],
		});
	}
}

export function createVaultmanSasi(): VaultmanSasi {
	const registry = createSasiRegistry();
	registerIdentityKinds(registry);
	registerProviders(registry);
	registerChromeSurfaces(registry);
	registerMoveActions(registry);
	registerSceneInstanceActions(registry);
	registerToolbarMenuActions(registry);
	registerSearchActions(registry);
	registerAddonGroupToggleActions(registry);
	registerHoverActions(registry);
	registerSettingsActions(registry);
	registerSettingSceneCatalog(registry);
	registerGroupSasiActions(registry);
	return { registry, provider: createSasiProvider(registry) };
}
