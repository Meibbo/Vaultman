import { createSasiRegistry, type SasiRegistry } from './logicSasiRegistry';
import { registerAddonGroupToggleActions } from './logicAddonGroupToggle';
import { registerMoveActions } from './logicSasiMoveActions';
import { registerSceneInstanceActions } from './logicSasiSceneActions';
import { registerToolbarMenuActions } from './logicSasiToolbarActions';
import { registerSearchActions } from './logicSasiSearchActions';
import { registerHoverActions } from './logicSasiHoverActions';
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

export function createVaultmanSasi(): VaultmanSasi {
	const registry = createSasiRegistry();
	registerMoveActions(registry);
	registerSceneInstanceActions(registry);
	registerToolbarMenuActions(registry);
	registerSearchActions(registry);
	registerAddonGroupToggleActions(registry);
	registerHoverActions(registry);
	return { registry, provider: createSasiProvider(registry) };
}
