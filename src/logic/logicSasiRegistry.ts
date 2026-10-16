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

export type SasiAxis = 'provider' | 'kind' | 'function' | 'surface';

export type SasiCatalogKind =
	| 'settingScene'
	| 'panelExplorer'
	| 'panelContent'
	| 'settings-explorer'
	| 'settings-content'
	| 'settingScene.toolbar'
	| 'node_plugin.cmenu'
	| 'node_group.cmenu'
	| 'node_settings'
	| 'node_plugin'
	| 'node_plugin_core'
	| 'node_plugin_community'
	| 'node_group'
	| 'node_group_custom'
	| 'cell_badge_update'
	| 'cell_counter'
	| '_timesOpened';

export interface SasiAvailability {
	status: 'available' | 'unavailable';
	reason?: { code: string; labelKey: string };
}

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
	panelType?: 'panelExplorer' | 'panelContent';
	mode?: 'settings-explorer' | 'settings-content';
	context?: 'settingScene.toolbar' | 'node_plugin.cmenu' | 'node_group.cmenu';
}

/**
 * U200-L4: valor de compatibilidad por accion. Fuente unica de los limites de
 * cada accion (superficies soportadas, alcances, que queda explicitamente
 * fuera de rango). Se renderiza donde el catalogo ya muestra limites
 * (entrada del inspector + meta de nodos ApiScene).
 */
export interface SasiCompatibility {
	surfaces: readonly string[];
	scopes: readonly string[];
	outOfRange: readonly string[];
	/**
	 * U200-L5 (tabs-2): vocabulario display exacto por accion (fuente unica
	 * con `scopes`). `scope` = de donde sale el panel, `target` = adonde va.
	 * Solo los movimientos entre superficies lo rellenan
	 * (`surface_panel:current` / `→surface:X`); el resto lo deja undefined.
	 */
	scope?: string;
	target?: string;
}

export interface SasiDef {
	/** Authoritative implementation dates, when maintained explicitly by the owner. */
	lifecycle?: import('./logicSasiLifecycle').SasiLifecycle;
	/**
	 * Estable y con namespace: `vaultman.move.proceed`.
	 * Superficies concretas usan el id chrome tal cual
	 * (`chrome:left-sidebar`): ya es estable y con namespace.
	 */
	id: string;
	axis: SasiAxis;
	type?: SasiCatalogKind;
	catalogKind?: SasiCatalogKind;
	/** Solo cuando `axis === 'function'`. */
	kind?: SasiFunctionKind;
	labelKey: string;
	icon?: string;
	/** Solo `operation`: declara que escribe en el vault. Obliga a confirmar. */
	mutatesVault?: true;
	supports: readonly SasiSupport[];
	availability?: SasiAvailability;
	/** `command`: los ids de action/operation que compone. */
	composes?: readonly string[];
	/** Ambito/scope operacional de la accion o comando (ej. 'this.scene -> {scope_depth}'). */
	scope?: string;
	/** U200-L4: limites de la accion (superficies, alcances, fuera de rango). */
	compatibility?: SasiCompatibility;
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
	listCommands(): readonly SasiDef[];
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
		listCommands: () => ofKind('command'),
		resolve(id) {
			const def = byId.get(id);
			// Contrato de logicCommandActions.ts: retirado != inexistente.
			if (!def) return { def: null, available: false, id };
			return {
				def,
				available: def.availability?.status !== 'unavailable',
			};
		},
	};
}
