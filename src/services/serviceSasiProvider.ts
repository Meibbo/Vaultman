import type {
	SasiAxis,
	SasiFunctionKind,
	SasiRegistry,
} from '../logic/logicSasiRegistry';

/** Un nodo proyectable desde SASI. Plano y serializable a proposito. */
export interface SasiNode {
	id: string;
	labelKey: string;
	icon?: string;
	kind?: SasiFunctionKind;
	mutatesVault?: true;
}

export interface SasiProvider {
	nodesFor(axis: SasiAxis): readonly SasiNode[];
}

/**
 * U130-01: SASI expuesto por el mismo contrato que cualquier otro provider,
 * para que WAR le consulte sin un canal especial. Es lo que permite no depender
 * de la unificacion del panelExplorer, que es de otro agente.
 */
export function createSasiProvider(registry: SasiRegistry): SasiProvider {
	return {
		nodesFor(axis) {
			return registry.list(axis).map((def) => ({
				id: def.id,
				labelKey: def.labelKey,
				...(def.icon ? { icon: def.icon } : {}),
				...(def.kind ? { kind: def.kind } : {}),
				...(def.mutatesVault ? { mutatesVault: def.mutatesVault } : {}),
			}));
		},
	};
}
