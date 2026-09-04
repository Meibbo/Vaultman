/**
 * U130-01: SASI = Services Actions Scripts Indexing (mapa de sistemas del dev,
 * `x/Excalidraw/vm-systems.excalidraw.md`). Vive bajo MyConfig, hermano de PSS
 * y LUPAPI; WAR le CONSULTA, no lo contiene.
 *
 * Tres ejes. Este paquete solo rellena `function`, pero el registro nace con los
 * tres porque el eje `kind` es lo que consultara el futuro sceneBuilder para
 * saber que tipos de nodo existen sin preguntarselo a otros agentes.
 *
 * La forma es la de `logicCellRegistry.ts`: declarativo, indexado por id
 * estable, y cada entrada declara en que superficies aplica.
 */

export type SasiAxis = 'provider' | 'kind' | 'function';

/** Categoria dentro del eje FUNCTIONS. Son tres cosas distintas: */
export type SasiFunctionKind =
	/** altera estados o procesos sobre el workspace */
	| 'action'
	/** realiza cambios sobre los FICHEROS */
	| 'operation'
	/** hace alcanzable lo anterior desde cualquier parte de Obsidian */
	| 'command';

export interface SasiSupport {
	surface: string;
}

export interface SasiDef {
	/** Estable y con namespace: `vaultman.move.proceed`. */
	id: string;
	axis: SasiAxis;
	/** Solo cuando `axis === 'function'`. */
	kind?: SasiFunctionKind;
	labelKey: string;
	icon?: string;
	/** Solo `operation`: declara que escribe en el vault. Obliga a confirmar. */
	mutatesVault?: true;
	supports: readonly SasiSupport[];
	/** `command`: los ids de action/operation que compone. */
	composes?: readonly string[];
}

export interface SasiResolved {
	def: SasiDef | null;
	available: boolean;
	id?: string;
}

export interface SasiRegistry {
	register(def: SasiDef): void;
	list(axis: SasiAxis): readonly SasiDef[];
	listActions(): readonly SasiDef[];
	listOperations(): readonly SasiDef[];
	resolve(id: string): SasiResolved;
}

export function createSasiRegistry(): SasiRegistry {
	const byId = new Map<string, SasiDef>();
	const order: string[] = [];

	const ofKind = (kind: SasiFunctionKind): readonly SasiDef[] =>
		order
			.map((id) => byId.get(id)!)
			.filter((d) => d.axis === 'function' && d.kind === kind);

	return {
		register(def) {
			// Pisar un alta en silencio deja dos definiciones distintas del mismo
			// id vivas segun el orden de carga, que es indepurable.
			if (byId.has(def.id)) {
				throw new Error(`SASI: id duplicado: ${def.id}`);
			}
			byId.set(def.id, def);
			order.push(def.id);
		},
		list(axis) {
			return order.map((id) => byId.get(id)!).filter((d) => d.axis === axis);
		},
		listActions: () => ofKind('action'),
		listOperations: () => ofKind('operation'),
		resolve(id) {
			const def = byId.get(id);
			// Contrato de logicCommandActions.ts: retirado != inexistente.
			if (!def) return { def: null, available: false, id };
			return { def, available: true };
		},
	};
}
