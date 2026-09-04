import type { SortScopeKey } from '../types/typeUI';

export type NodeGroupFlavor = 'preset' | 'custom';

export interface NodeGroupDef {
	/** Id propio y estable. NO es el label: el label es editable. */
	id: string;
	flavor: NodeGroupFlavor;
	label: string;
	parentId: string | null;
	scope: SortScopeKey;
}

export type NestRejection = 'would-create-cycle' | 'preset-is-terminal';
export type NestVerdict = { ok: true } | { ok: false; reason: NestRejection };

function ancestors(
	groups: readonly NodeGroupDef[],
	id: string,
): readonly string[] {
	const byId = new Map(groups.map((g) => [g.id, g]));
	const out: string[] = [];
	let cur = byId.get(id)?.parentId ?? null;
	while (cur) {
		if (out.includes(cur)) break; // ya corrupto: no dar vueltas
		out.push(cur);
		cur = byId.get(cur)?.parentId ?? null;
	}
	return out;
}

/**
 * U130-03: los custom anidan infinito entre si. Un preset anidado bajo un
 * custom es un `gc-node` TERMINAL: contiene hojas y no admite subgrupos.
 *
 * Eso reduce el guard a ancestro sobre custom, y hace el ciclo inexpresable en
 * vez de detectado -- un preset nunca puede estar en mitad de una cadena.
 */
export function canNest(
	groups: readonly NodeGroupDef[],
	childId: string,
	intoId: string,
): NestVerdict {
	const into = groups.find((g) => g.id === intoId);
	if (into?.flavor === 'preset') {
		return { ok: false, reason: 'preset-is-terminal' };
	}
	if (childId === intoId || ancestors(groups, intoId).includes(childId)) {
		return { ok: false, reason: 'would-create-cycle' };
	}
	return { ok: true };
}

/**
 * Un grupo con `scope: 'properties'` no admite `node_value`s. Sin esta puerta,
 * el arrastre crea grupos incoherentes que luego no se pueden proyectar.
 */
export function canAddMember(
	group: NodeGroupDef,
	node: { kind: string },
): boolean {
	if (group.scope === 'properties') return node.kind === 'prop';
	if (group.scope === 'values') return node.kind === 'value';
	return true;
}
