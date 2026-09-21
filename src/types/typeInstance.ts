import type { ExplorerSortState, ExplorerTabId, ExplorerViewMode } from './typeUI';
import type { InteractionMode } from '../logic/logicInteractionMode';
import type { SavedFloatingTocState } from './typeSettings';
import type { GroupPreset } from './typeGroupPreset';

/** ID opaco y durable de una instancia. Nunca se deriva de la posición ni de la hoja. */
export type WorkspaceInstanceId = string;

/**
 * Una scene se direcciona por `(WorkspaceInstanceId, SceneDefinitionId)`. Hoy las definiciones
 * estables coinciden con los tabs del explorer; el tipo se declara aparte porque el diseño
 * prevé más definiciones y no queremos que el día que lleguen haya que tocar cada consumidor.
 */
export type SceneDefinitionId = ExplorerTabId;

/** Configuración ESCASA: lo ausente se hereda de la capa de arriba en la cascada. */
export interface SceneConfig {
	viewMode?: ExplorerViewMode;
	interactionMode?: InteractionMode;
	visibleCells?: string[];
	sortState?: ExplorerSortState;
	/** Spec 08 §2: view_option del engine `tree`, per_instance. */
	stickyRows?: boolean;
	/** Spec 08 §2: view_option del engine `tree`, per_instance, solo Files. */
	compactFolders?: boolean;
	/**
	 * Spec 08: view_option del engine `tree`, per_instance. Colapsa el padding
	 * de fila a 4px e ignora la sangría por profundidad; el caret de un p-node
	 * se conserva, solo deja de desplazarse por `--depth`.
	 */
	indent?: boolean;
	/**
	 * U130 polishing: view_option `tooltips`, per_instance. `false` apaga
	 * los tooltips de todos los nodos y cells de la scene (toolbar, árbol
	 * nativo y badges). Ausente/`true` conserva los de hoy.
	 */
	tooltips?: boolean;
	/** Spec 08 §3.2: el group preset seleccionado, per_instance. `none` por defecto. */
	groupPreset?: GroupPreset;
	/** Spec 08 §4: custom groups ocultos (no borrados) en esta instancia. */
	hiddenGroupIds?: string[];
	/**
	 * U130 toolbar alt-cmenu: label del scene_menu (nodo `tabs`), per-instance.
	 * `auto` = derivado del layout. Tri-estado concreto (no `boolean | undefined`:
	 * `Required<>` pela el undefined hasta del explícito, así que la ausencia
	 * se expresa con `auto`).
	 */
	sceneLabelMode?: 'auto' | 'on' | 'off';
	/**
	 * U130 toolbar alt-cmenu: "always reveal" de Files (nodo
	 * `reveal-active-file`), per-instance. `auto` = el setting global
	 * `autoRevealActiveFile`. Mismo tri-estado concreto por la misma razón.
	 */
	autoRevealMode?: 'auto' | 'on' | 'off';
	/**
	 * U130 toolbar alt-cmenu: ids LOCALES de nodos (`tabs`, `view`, `sort`,
	 * `reveal-active-file`, `header:*`, ...) ocultos en esta scene. Se suman a
	 * los globales de pvpui antes de la proyección, así el overflow condensed
	 * los ignora igual que a los ocultos por el usuario.
	 */
	hiddenToolbarNodes?: string[];
	/**
	 * U130 toolbar alt-cmenu "change icon": overrides per-instance del icono
	 * de nodos (ids LOCALES → id de icono lucide). La ausencia de clave es el
	 * icono de serie del nodo.
	 */
	toolbarNodeIcons?: Record<string, string>;
	/**
	 * U130 polishing: ids de comandos Obsidian proyectados como nodos de
	 * acción en ESTA scene de ESTA instancia. Se suman a los globales de
	 * `plugin.settings.toolbarCommandActions` antes de resolver; la ausencia
	 * (undefined) = solo globales. Array con semántica de sustitución como
	 * `hiddenToolbarNodes`: la capa que lo declara decide la lista entera.
	 */
	toolbarCommandActions?: string[];
	/**
	 * U130 polishing: override per-instance de la ubicación de los nodos de
	 * creación (create-file/create-folder). `auto` = el setting global
	 * `createActionsPlacement` (searchbox = anidados en el searchbox,
	 * toolbar = nodos propios). Tri-estado concreto como sceneLabelMode.
	 */
	createActionsPlacement?: 'auto' | 'searchbox' | 'toolbar';
	/**
	 * U130 polishing: orden de los nodos del panelWidget_bar en ESTA scene
	 * de ESTA instancia (ids LOCALES, en orden visual). Se escribe por
	 * arrastre al estilo del ribbon nativo (mousedown + umbral + ghost +
	 * persist, ver `Gv` en app.js) y se suma al `nodeOrder` global de pvpui
	 * antes de la proyección. Vacío = orden de serie.
	 */
	toolbarNodeOrder?: string[];
	/**
	 * U130-09 (dev 2026-09-15): custom groups de ESTA scene de ESTA instancia.
	 * groupId -> URNs de sus miembros. Solo los custom: los presets son
	 * predicado en memoria. Las URNs ya llevan `providerId:kind:`
	 * (logicMembershipUrn), asi que un grupo de Tags nunca casa un nodo de
	 * Files. Antes vivian en `SavedLayout` (plano, por layout) y por eso no se
	 * podian crear sin layout activo y cruzaban de una scene a otra; el layout
	 * ahora solo los fotografia (`SavedViewConfig.groupMemberships`).
	 */
	groupMemberships?: Record<string, readonly string[]>;
}

export interface WorkspaceInstanceRecord {
	id: WorkspaceInstanceId;
	/** epoch ms de creación; solo para orden estable y depuración. */
	createdAt: number;
	/** epoch ms del último toque de actividad; la reconciliación usa esto para LRU.
	 * Migración: si falta (registro persisted de antes de esta fecha), se usa `createdAt`. */
	lastActiveAt: number;
	/** sube en cada commit; la reconciliación la usa para detectar escrituras interrumpidas. */
	revision: number;
	tombstoned: boolean;
	/** overrides de toda la instancia, por encima de global y por debajo de la scene. */
	self: SceneConfig;
	/**
	 * En que scene estaba la instancia. NO va dentro de `self` porque `self` es un `SceneConfig`
	 * -ajustes que una scene puede tener- y esto es una propiedad de la instancia: cual de ellas
	 * estaba delante. Se guarda como `string` y se valida al leer, porque el conjunto de tabs de
	 * la UI incluye alguno (`content`) que no es un `SceneDefinitionId`.
	 */
	activeScene?: string;
	/** una scene como mucho por definición estable. */
	scenes: Partial<Record<SceneDefinitionId, SceneConfig>>;
	/** Estado del índice flotante (floating TOC) para esta instancia. */
	floatingToc?: SavedFloatingTocState;
}

export interface InstanceRegistryData {
	schema: 1;
	instances: Record<WorkspaceInstanceId, WorkspaceInstanceRecord>;
}
