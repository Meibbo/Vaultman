/**
 * U130-04: lo que la Status Bar pinta. Puro: la barra no calcula nada ni posee
 * estado, solo proyecta la transaccion activa.
 */

export interface BarNode {
	id: string;
	label: string;
	childIds: readonly string[];
}

export interface BarRejection {
	destination: string;
	reason: string;
}

export interface TransactionTelemetry {
	originCount: number;
	originLabels: readonly string[];
	destinationCount: number;
	destinationLabels: readonly string[];
	rejection: BarRejection | null;
}

function expand(
	ids: readonly string[],
	byId: Map<string, BarNode>,
): string[] {
	// Set: seleccionar un padre Y un hijo suyo no puede contar el hijo dos
	// veces, o el numero que el usuario ve antes de escribir estaria inflado.
	const seen = new Set<string>();
	const walk = (id: string) => {
		const node = byId.get(id);
		if (!node || seen.has(id)) return;
		seen.add(id);
		for (const child of node.childIds) walk(child);
	};
	for (const id of ids) walk(id);
	return [...seen];
}

export function buildTransactionTelemetry({
	originIds,
	destinationIds,
	nodes,
	rejection,
}: {
	originIds: readonly string[];
	destinationIds: readonly string[];
	nodes: readonly BarNode[];
	rejection: BarRejection | null;
}): TransactionTelemetry {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	const origins = expand(originIds, byId);
	const destinations = destinationIds.filter((id) => byId.has(id));
	return {
		originCount: origins.length,
		originLabels: origins.map((id) => byId.get(id)!.label),
		destinationCount: destinations.length,
		destinationLabels: destinations.map((id) => byId.get(id)!.label),
		rejection,
	};
}

/** Las tres variantes reales del searchbox (`searchControl.svelte:11`). */
export type SearchVariant = 'inline' | 'phone' | 'row';
export type BarPlacement = 'above-search' | 'below-search';

/**
 * U130-04: la barra se coloca respecto al SEARCHBOX, no respecto al toolbar
 * generico, porque el searchbox es un nodo especial con sus propios modos y
 * reglas de overflow.
 *
 * En movil va ENCIMA: alli el searchbox es el elemento que el pulgar alcanza, y
 * empujarlo hacia abajo con una barra de telemetria lo aleja.
 */
export function resolveBarPlacement(variant: SearchVariant): BarPlacement {
	return variant === 'phone' ? 'above-search' : 'below-search';
}

export interface BarOwner {
	instanceId: string;
	scene: string;
}
export type BarVisibility = 'visible' | 'hidden' | 'unmounted';

/**
 * U130-04: `hidden` y `unmounted` NO son lo mismo.
 *
 *   hidden    -> la transaccion existe y esta suspendida en otra Scene de esta
 *                instancia. Vuelve con su estado al volver.
 *   unmounted -> no hay nada que pintar aqui.
 *
 * Colapsarlos perderia la distincion que hace util a esta barra: la de que hay
 * trabajo pendiente en otro sitio de tu misma instancia.
 */
export function barVisibility(
	transaction: BarOwner | null,
	current: BarOwner,
): BarVisibility {
	if (!transaction) return 'unmounted';
	if (transaction.instanceId !== current.instanceId) return 'unmounted';
	return transaction.scene === current.scene ? 'visible' : 'hidden';
}


