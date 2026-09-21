import type {
	PanelWidgetNode,
	PanelWidgetProjection,
	PanelWidgetPvpuiConfig,
} from '../types/typePanelWidget';

export const PANEL_WIDGET_HOST_ID = 'vaultman-frame-navbar';

/**
 * The Props panelWidget keeps one slot between `search` and `collapse/expand`
 * for the control that acts on the current file. `reveal this file` occupies it
 * at rest; a composing operation mode takes it over, because revealing the
 * active file's own properties is meaningless while a cross-property move is
 * being composed. Reusing the slot is what makes the two mutually exclusive by
 * construction instead of by a rule someone has to remember.
 */
export const PANEL_WIDGET_EXCLUSIVE_SLOT_ORDER = 20;

export interface PanelWidgetExclusiveSlot {
	/** What holds the slot at rest, or `null` when nothing does. */
	idleNode: PanelWidgetNode | null;
	/** The controls of an active operation mode, which take the slot over. */
	moveMode: { proceed: PanelWidgetNode; cancel: PanelWidgetNode } | null;
}

export function resolveExclusiveSlotNodes({
	idleNode,
	moveMode,
}: PanelWidgetExclusiveSlot): readonly PanelWidgetNode[] {
	if (moveMode) return Object.freeze([moveMode.proceed, moveMode.cancel]);
	return Object.freeze(idleNode ? [idleNode] : []);
}

/**
 * U130 toolbar alt-cmenu: mezcla los nodos ocultos globales (pvpui, ids
 * completos `provider:local`) con los ocultos per-instance de la scene (ids
 * locales). El resultado alimenta la proyección, así los nodos ocultos
 * desaparecen antes del ordenamiento, la medición y el overflow condensed.
 */
export function resolveToolbarHiddenIds(
	globalHidden: readonly string[] | undefined,
	instanceHiddenLocalIds: readonly string[] | undefined,
	providerId: string,
): string[] {
	const merged = new Set(globalHidden ?? []);
	for (const localId of instanceHiddenLocalIds ?? []) {
		merged.add(`${providerId}:${localId}`);
	}
	return [...merged];
}

export function resolvePanelWidgetProjection({
	providerId,
	nodes,
	config,
}: {
	providerId: string;
	nodes: readonly PanelWidgetNode[];
	config: PanelWidgetPvpuiConfig;
}): PanelWidgetProjection {
	const seen = new Set<string>();
	for (const node of nodes) {
		if (seen.has(node.id)) {
			throw new Error(`Duplicate panelWidget node id: ${node.id}`);
		}
		seen.add(node.id);
	}

	const hidden = new Set(config.hiddenNodeIds ?? []);
	const configuredOrder = new Map(
		(config.nodeOrder ?? []).map((id, index) => [id, index]),
	);
	const fallbackOffset = configuredOrder.size;
	const resolvedNodes = nodes
		.map((node, sourceIndex) => ({ node, sourceIndex }))
		.filter(({ node }) => !hidden.has(node.id))
		.sort((left, right) => {
			const leftConfigured = configuredOrder.get(left.node.id);
			const rightConfigured = configuredOrder.get(right.node.id);
			const leftOrder =
				leftConfigured ?? fallbackOffset + left.node.order;
			const rightOrder =
				rightConfigured ?? fallbackOffset + right.node.order;
			return leftOrder - rightOrder || left.sourceIndex - right.sourceIndex;
		})
		.map(({ node }) => node);

	return {
		hostId: PANEL_WIDGET_HOST_ID,
		providerId,
		nodes: resolvedNodes,
	};
}

/**
 * U130 polishing: orden per-instance del panelWidget_bar. Los ids LOCALES
 * de la scene van PRIMERO (proyectados a `provider:local`); detrás, los
 * globales de pvpui que la scene no declara. La capa que declara decide la
 * lista entera (igual que `visibleCells` en la cascada): un reorden por
 * arrastre pisa el orden global solo en esta scene. Sin lista per-instance,
 * manda el global. Sin pérdida: lo global no declarado sobrevive detrás.
 */
export function resolveToolbarNodeOrder(
	globalFullIds: readonly string[] | undefined,
	instanceLocalIds: readonly string[] | undefined,
	providerId: string,
): string[] {
	const merged = (instanceLocalIds ?? []).map(
		(localId) => `${providerId}:${localId}`,
	);
	for (const full of globalFullIds ?? []) {
		if (!merged.includes(full)) merged.push(full);
	}
	return merged;
}

/**
 * U130 polishing: índice de inserción al estilo `Gv` de app.js (el ribbon
 * nativo), en eje horizontal. `ends` son los bordes derechos de los
 * hermanos en orden visual, SIN el arrastrado. Devuelve el primer índice
 * cuyo borde supera `pointer - grabOffset + draggedSize / 2` (el punto
 * medio del fantasma); si ninguno, el final. Puro y probado sin DOM.
 */
export function dropIndexForPointer(
	ends: readonly number[],
	pointer: number,
	grabOffset: number,
	draggedSize: number,
): number {
	const threshold = pointer - grabOffset + draggedSize / 2;
	for (let index = 0; index < ends.length; index += 1) {
		if (threshold < (ends[index] ?? Number.POSITIVE_INFINITY)) return index;
	}
	return ends.length;
}

/**
 * U130 polishing: mueve `draggedLocalId` delante de `anchorLocalId` (al
 * final si el ancla es `null` o ya no se ve) dentro del orden visible y
 * conserva detrás los ids guardados que ya no se ven (sin pérdida al
 * ocultar/mostrar nodos). Puro y probado sin DOM.
 */
export function reorderLocalIds(
	visibleLocalIds: readonly string[],
	storedIds: readonly string[],
	draggedLocalId: string,
	anchorLocalId: string | null,
): string[] {
	const without = visibleLocalIds.filter((id) => id !== draggedLocalId);
	const anchorIndex =
		anchorLocalId === null ? -1 : without.indexOf(anchorLocalId);
	const clamped =
		anchorIndex < 0
			? without.length
			: Math.max(0, Math.min(anchorIndex, without.length));
	const next = [
		...without.slice(0, clamped),
		draggedLocalId,
		...without.slice(clamped),
	];
	const seen = new Set(next);
	for (const id of storedIds) {
		if (!seen.has(id)) {
			seen.add(id);
			next.push(id);
		}
	}
	return next;
}
