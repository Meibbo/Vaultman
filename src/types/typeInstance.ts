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
	/** Spec 08 §3.2: el group preset seleccionado, per_instance. `none` por defecto. */
	groupPreset?: GroupPreset;
	/** Spec 08 §4: custom groups ocultos (no borrados) en esta instancia. */
	hiddenGroupIds?: string[];
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
