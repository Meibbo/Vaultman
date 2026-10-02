import type {
	SasiAxis,
	SasiAvailability,
	SasiCatalogKind,
	SasiFunctionKind,
	SasiRegistry,
	SasiSupport,
} from '../logic/logicSasiRegistry';
import { sasiLifecycleFor, type SasiLifecycle } from '../logic/logicSasiLifecycle';

/** Un nodo proyectable desde SASI. Plano y serializable a proposito. */
export interface SasiNode {
	id: string;
	labelKey: string;
	icon?: string;
	kind?: SasiFunctionKind;
	type?: SasiCatalogKind;
	catalogKind?: SasiCatalogKind;
	mutatesVault?: true;
	availability?: SasiAvailability;
	supports?: readonly SasiSupport[];
	/**
	 * U130L apiScene: se conservan tal cual del def. Sin ellos el apiScene
	 * no puede decir en que superficies vive cada entrada ni que compone
	 * cada comando, que es la mitad de "que es cada cosa y DONDE ESTA".
	 */
	composes?: readonly string[];
	createdAt?: number;
	updatedAt?: number;
	dateSource?: string;
}

export interface SasiProvider {
	nodesFor(axis: SasiAxis): readonly SasiNode[];
	lifecycleFor(id: string): SasiLifecycle | undefined;
}

/**
 * U130-01: SASI expuesto por el mismo contrato que cualquier otro provider,
 * para que WAR le consulte sin un canal especial. Es lo que permite no depender
 * de la unificacion del panelExplorer, que es de otro agente.
 */
export function createSasiProvider(registry: SasiRegistry): SasiProvider {
	return {
		lifecycleFor: sasiLifecycleFor,
		nodesFor(axis) {
			return registry.list(axis).map((def) => ({
				id: def.id,
				labelKey: def.labelKey,
				...(def.icon ? { icon: def.icon } : {}),
				...(def.kind ? { kind: def.kind } : {}),
				...(def.type ? { type: def.type } : {}),
				...(def.catalogKind ? { catalogKind: def.catalogKind } : {}),
				...(def.mutatesVault ? { mutatesVault: def.mutatesVault } : {}),
				supports: def.supports,
				availability: def.availability ?? { status: 'available' },
				composes: def.composes ?? [],
				...(sasiLifecycleFor(def.id) ? {
					createdAt: sasiLifecycleFor(def.id)?.createdAt,
					updatedAt: sasiLifecycleFor(def.id)?.updatedAt,
					dateSource: sasiLifecycleFor(def.id)?.source,
				} : {}),
			}));
		},
	};
}
