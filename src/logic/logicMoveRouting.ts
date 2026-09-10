/**
 * U130-02: cada Scene DECLARA que destinos admite, en vez de forzarlo
 * manipulando el filtro de la vista -- que es lo que hace hoy fileScene con
 * `folders-only` (el hack de U121-102).
 *
 * No hay guard de aciclicidad global: exigiria un grafo cross-explorer, que es
 * el "global provider registry" que el glosario prohibe, y ademas no compra
 * nada porque la aciclicidad es distinta en cada Scene. Cada guard vive donde
 * significa algo.
 */

export interface MoveNodeRef {
	id: string;
	/** `file` | `folder` | `tag` | `prop` | `value` | `root` */
	kind: string;
	/** Ruta, tag path o clave, segun el kind. */
	canonicalId: string;
}

export type MoveRejectionReason =
	| 'origin-is-destination'
	| 'incompatible-kind'
	| 'would-create-cycle';

export type MoveValidation =
	| { ok: true }
	| { ok: false; reason: MoveRejectionReason };

export interface MoveRoutingStrategy {
	/** Solo informativo: hace visible que propScene no necesita guard. */
	guardsCycles: boolean;
	validate(origin: MoveNodeRef, destination: MoveNodeRef): MoveValidation;
}

/**
 * Ancestro por SEGMENTO, no por substring. `proyectos` no es ancestro de
 * `proyecto/alfa` aunque comparta prefijo textual: sin este corte, un nombre
 * que empiece igual bloquearia movimientos legitimos.
 */
function isAncestorPath(ancestor: string, descendant: string): boolean {
	if (!ancestor) return true;
	if (ancestor === descendant) return true;
	return descendant.startsWith(ancestor + '/');
}

export const fileMoveStrategy: MoveRoutingStrategy = {
	guardsCycles: true,
	validate(origin, destination) {
		if (origin.id === destination.id) {
			return { ok: false, reason: 'origin-is-destination' };
		}
		if (destination.kind !== 'folder' && destination.kind !== 'root') {
			return { ok: false, reason: 'incompatible-kind' };
		}
		if (
			origin.kind === 'folder' &&
			isAncestorPath(origin.canonicalId, destination.canonicalId)
		) {
			return { ok: false, reason: 'would-create-cycle' };
		}
		return { ok: true };
	},
};

export const tagMoveStrategy: MoveRoutingStrategy = {
	guardsCycles: true,
	validate(origin, destination) {
		if (origin.id === destination.id) {
			return { ok: false, reason: 'origin-is-destination' };
		}
		if (destination.kind !== 'tag' && destination.kind !== 'root') {
			return { ok: false, reason: 'incompatible-kind' };
		}
		if (isAncestorPath(origin.canonicalId, destination.canonicalId)) {
			return { ok: false, reason: 'would-create-cycle' };
		}
		return { ok: true };
	},
};

export const propMoveStrategy: MoveRoutingStrategy = {
	// Heterogeneo y de un solo salto: un value no puede ser ancestro de un prop,
	// asi que no hay ciclo posible. No le anadas un guard "por simetria".
	guardsCycles: false,
	validate(origin, destination) {
		if (origin.kind !== 'value') {
			return { ok: false, reason: 'incompatible-kind' };
		}
		if (destination.kind !== 'prop') {
			return { ok: false, reason: 'incompatible-kind' };
		}
		if (origin.canonicalId.split('/')[0] === destination.canonicalId) {
			return { ok: false, reason: 'origin-is-destination' };
		}
		return { ok: true };
	},
};
