import type { ExplorerSortState, ExplorerTabId, ExplorerViewMode } from './typeUI';
import type { InteractionMode } from '../logic/logicInteractionMode';

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
}

export interface WorkspaceInstanceRecord {
	id: WorkspaceInstanceId;
	/** epoch ms de creación; solo para orden estable y depuración. */
	createdAt: number;
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
}

export interface InstanceRegistryData {
	schema: 1;
	instances: Record<WorkspaceInstanceId, WorkspaceInstanceRecord>;
}
