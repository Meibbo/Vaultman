import type { NodeGroupDef } from './logicNodeGroup';

/**
 * U130-GGC-011: nucleo puro de identidad custom por target.
 *
 * El mapa persistido sigue siendo plano (`Record<string, readonly string[]>`)
 * para minimizar ruptura: la CLAVE es la identidad interna del grupo y el
 * valor sus URNs de pertenencia (intocables por este modulo).
 *
 * Formato canonico: `vaultman.custom.v1:<enc(target)>:<enc(nombre)>`.
 * El prefijo largo y versionado evita reinterpretar nombres legacy como
 * `all:Foo` o `level:2:Foo`, que eran nombres perfectamente validos.
 *
 * Claves legacy: cualquier clave sin prefijo reconocido se lee como target
 * `all` con `nombre = clave completa` (p. ej. `Favoritos` -> all/Favoritos).
 * El `id` de `NodeGroupDef` es SIEMPRE la clave de almacenamiento tal cual
 * (canonica o legacy), para que `memberships[group.id]` siga casando en
 * `projectGroupedTree` con mapas sin normalizar.
 *
 * CONFLICTO DOCUMENTADO: dos claves crudas distintas pueden describir el
 * mismo par (target, nombre) — p. ej. la legacy `Foo` y la canonica
 * `vaultman.custom.v1:all:Foo`.
 * `normalizeScopedCustomGroups` las colapsa a UNA canonica y lo REPORTA en
 * `conflicts`; nunca fusiona URNs en silencio. Si existe cualquiera,
 * devuelve el mapa original intacto para que el llamador resuelva el
 * conflicto antes de persistir. Un nombre legacy que
 * imite incluso el prefijo reservado sigue siendo ambiguo; la normalizacion
 * debe detenerse si reporta conflicto, nunca descartar datos automaticamente.
 */

export type ScopedCustomTarget =
	| 'all'
	| `level:${number}`
	| `level:${number}+${number}`
	| `parent:${string}`;

const SCOPED_GROUP_PREFIX = 'vaultman.custom.v1:';

export interface ParsedScopedGroupKey {
	target: ScopedCustomTarget;
	name: string;
	/** `true` cuando la clave no trae prefijo reconocido (legacy). */
	legacy: boolean;
}

export interface ScopedKeyConflict {
	/** Clave canonica a la que colapsaron varias claves crudas. */
	canonical: string;
	/** Claves crudas que colisionaron, en orden de insercion. */
	sources: readonly string[];
	/** Clave cruda conservada (siempre la primera). */
	kept: string;
	/** Claves descartadas con las URNs que portaban (no se fusionan). */
	dropped: ReadonlyArray<{ key: string; urns: readonly string[] }>;
}

export interface NormalizedScopedCustomGroups {
	memberships: Record<string, readonly string[]>;
	conflicts: readonly ScopedKeyConflict[];
}

function encodePart(part: string): string {
	return encodeURIComponent(part);
}

function decodePart(part: string): string | null {
	try {
		return decodeURIComponent(part);
	} catch {
		return null;
	}
}

/**
 * Construye la clave interna canonica para (target, nombre). Lanza si el
 * nombre o el parentId vienen vacios o si el nivel no es entero >= 1
 * (error de programador, nunca de datos de usuario).
 */
export function makeScopedGroupKey(
	target: ScopedCustomTarget,
	name: string,
): string {
	if (!name) {
		throw new Error(
			'makeScopedGroupKey: el nombre del grupo no puede ser vacio.',
		);
	}
	if (target === 'all')
		return `${SCOPED_GROUP_PREFIX}${encodePart(target)}:${encodePart(name)}`;
	if (target.startsWith('level:')) {
		const raw = target.slice('level:'.length);
		if (!/^\d+(\+\d+)?$/.test(raw)) {
			throw new Error(
				`makeScopedGroupKey: target de nivel invalido (${target}).`,
			);
		}
		const normalized = raw
			.split('+')
			.map((part) => String(Number(part)))
			.join('+');
		return `${SCOPED_GROUP_PREFIX}${encodePart(`level:${normalized}`)}:${encodePart(name)}`;
	}
	const parentId = target.slice('parent:'.length);
	if (!parentId) {
		throw new Error(
			`makeScopedGroupKey: target de parent invalido (${target}).`,
		);
	}
	return `${SCOPED_GROUP_PREFIX}${encodePart(target)}:${encodePart(name)}`;
}

/**
 * Lee una clave de almacenamiento (canonica o legacy). Nunca lanza: una
 * clave malformada se degrada a legacy (`all` con la clave como nombre).
 */
export function parseScopedGroupKey(key: string): ParsedScopedGroupKey {
	const legacy = (): ParsedScopedGroupKey => ({
		target: 'all',
		name: key,
		legacy: true,
	});
	if (!key.startsWith(SCOPED_GROUP_PREFIX)) return legacy();
	const rest = key.slice(SCOPED_GROUP_PREFIX.length);
	const sep = rest.indexOf(':');
	if (sep < 0) return legacy();
	const target = decodePart(rest.slice(0, sep));
	const name = decodePart(rest.slice(sep + 1));
	if (!target || !name) return legacy();
	if (target === 'all') return { target, name, legacy: false };
	if (target.startsWith('level:')) {
		const raw = target.slice('level:'.length);
		if (!/^\d+(\+\d+)?$/.test(raw))
			return legacy();
		return { target: target as ScopedCustomTarget, name, legacy: false };
	}
	if (target.startsWith('parent:') && target.length > 'parent:'.length)
		return { target: target as ScopedCustomTarget, name, legacy: false };
	return legacy();
}

/** `true` si la clave es legacy (sin prefijo scoped reconocido). */
export function isLegacyCustomGroupKey(key: string): boolean {
	return parseScopedGroupKey(key).legacy;
}

/** `true` si la clave ya esta en forma canonica (estable ante normalize). */
export function isCanonicalScopedGroupKey(key: string): boolean {
	const parsed = parseScopedGroupKey(key);
	if (parsed.legacy) return false;
	return makeScopedGroupKey(parsed.target, parsed.name) === key;
}

/** Target de una clave (legacy -> `all`). */
export function scopedTargetOf(key: string): ScopedCustomTarget {
	return parseScopedGroupKey(key).target;
}

/** Nombre visible de una clave (legacy -> la clave completa). */
export function scopedNameOf(key: string): string {
	return parseScopedGroupKey(key).name;
}

/**
 * Normaliza un mapa plano a claves canonicas. Idempotente:
 * `normalize(normalize(m).memberships)` devuelve el mismo mapa con
 * `conflicts` vacio. Las URNs se preservan (mismo contenido y orden; se
 * copian los arrays para no aliasar el mapa de entrada). Ante colision se
 * conserva el mapa original completo y reporta cada colision en `conflicts`.
 * Solo una normalizacion sin conflictos produce el mapa canonico.
 */
export function normalizeScopedCustomGroups(
	memberships: Readonly<Record<string, readonly string[]>>,
): NormalizedScopedCustomGroups {
	const out: Record<string, readonly string[]> = {};
	const byCanonical = new Map<string, ScopedKeyConflict & { sources: string[]; dropped: Array<{ key: string; urns: readonly string[] }> }>();
	for (const [raw, urns] of Object.entries(memberships)) {
		const parsed = parseScopedGroupKey(raw);
		const canonical = parsed.legacy
			? makeScopedGroupKey('all', parsed.name)
			: makeScopedGroupKey(parsed.target, parsed.name);
		const existing = byCanonical.get(canonical);
		if (!existing) {
			out[canonical] = [...urns];
			byCanonical.set(canonical, {
				canonical,
				sources: [raw],
				kept: raw,
				dropped: [],
			});
			continue;
		}
		existing.sources.push(raw);
		existing.dropped.push({ key: raw, urns: [...urns] });
	}
	const conflicts: ScopedKeyConflict[] = [...byCanonical.values()]
		.filter((entry) => entry.dropped.length > 0)
		.map((entry) => ({
			canonical: entry.canonical,
			sources: [...entry.sources],
			kept: entry.kept,
			dropped: entry.dropped.map((item) => ({
				key: item.key,
				urns: [...item.urns],
			})),
		}));
	return {
		memberships: conflicts.length > 0
			? Object.fromEntries(Object.entries(memberships).map(([key, urns]) => [key, [...urns]]))
			: out,
		conflicts,
	};
}

/** Filtra defs por target (`def.scope === target`). */
export function groupsForTarget(
	defs: readonly NodeGroupDef[],
	target: ScopedCustomTarget,
): readonly NodeGroupDef[] {
	return defs.filter((def) => def.scope === target);
}

/**
 * Submapa plano con solo las entradas de un target (legacy cuentan como
 * `all`). Las arrays se comparten por referencia (vista de lectura).
 */
export function membershipsForTarget(
	memberships: Readonly<Record<string, readonly string[]>>,
	target: ScopedCustomTarget,
): Record<string, readonly string[]> {
	return Object.fromEntries(
		Object.entries(memberships).filter(
			([key]) => parseScopedGroupKey(key).target === target,
		),
	);
}
