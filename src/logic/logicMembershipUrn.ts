/**
 * U130-03: la pertenencia de un nodo a un grupo custom, serializada.
 *
 * Formato (dev, 2026-09-04):  providerId:kind:canonicalId|displayLabel
 *
 * El `displayLabel` va DENTRO a proposito: es lo que permite que una referencia
 * rota siga diciendo como se llamaba, sin depender de que algo externo recuerde
 * la etiqueta. Sin el, un miembro perdido solo puede mostrarse como una ruta
 * muerta, que no le dice nada al usuario.
 */

export interface MembershipRef {
	providerId: string;
	kind: string;
	canonicalId: string;
	displayLabel: string;
}

export function formatMembershipUrn(ref: MembershipRef): string {
	return `${ref.providerId}:${ref.kind}:${ref.canonicalId}|${ref.displayLabel}`;
}

/** Devuelve `null` en vez de lanzar: una URN corrupta no puede tumbar el layout. */
export function parseMembershipUrn(urn: string): MembershipRef | null {
	// Los DOS primeros `:` separan; el resto pertenece al canonicalId, porque
	// una ruta puede llevarlos. Y el label es todo lo que sigue a la PRIMERA
	// barra, para que un titulo con `|` no corrompa la URN.
	const first = urn.indexOf(':');
	if (first < 0) return null;
	const second = urn.indexOf(':', first + 1);
	if (second < 0) return null;
	const bar = urn.indexOf('|', second + 1);
	if (bar < 0) return null;
	const providerId = urn.slice(0, first);
	const kind = urn.slice(first + 1, second);
	const canonicalId = urn.slice(second + 1, bar);
	const displayLabel = urn.slice(bar + 1);
	if (!providerId || !kind || !canonicalId || !displayLabel) return null;
	return { providerId, kind, canonicalId, displayLabel };
}

/** Reconciliacion por evento de rename: cambia la ruta, conserva la etiqueta. */
export function rewriteCanonicalId(
	urn: string,
	nextCanonicalId: string,
): string | null {
	const ref = parseMembershipUrn(urn);
	if (!ref) return null;
	return formatMembershipUrn({ ...ref, canonicalId: nextCanonicalId });
}

export type MembershipState = 'live' | 'ghost' | 'tombstone';

export interface ResolvedMembership {
	state: MembershipState;
	ref: MembershipRef | null;
}

/**
 * U130-03: una pertenencia NUNCA se borra en silencio (regla dev-locked del
 * 2026-08-21: "la referencia rota se CONSERVA, no se limpia").
 *
 *   ghost     -> no se encuentra. Puede volver: renombrar de vuelta la repara.
 *   tombstone -> la entidad fue borrada. Se puede deshacer o purgar a mano.
 *
 * Los dos son el mismo objeto degradado; lo que los separa es si la entidad
 * puede volver. Y los dos conservan el displayLabel, que es lo que hace el
 * hueco legible en vez de una ruta muerta.
 */
export function resolveMembership(
	urn: string,
	status: { exists: boolean; deleted: boolean },
): ResolvedMembership {
	const ref = parseMembershipUrn(urn);
	if (status.exists && ref) return { state: 'live', ref };
	if (status.deleted) return { state: 'tombstone', ref };
	return { state: 'ghost', ref };
}

