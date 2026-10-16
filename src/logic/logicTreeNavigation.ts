/**
 * U130 tree Navco: smallest typed key/action override seam plus letter-jump
 * helpers gated on the EFFECTIVE sibling sort.
 *
 * The native path stays the default: absent `NavcoPort` the tree behaves
 * exactly as `handleTreeKeyboardKey` dictates. The override seam runs BEFORE
 * the legacy `keyboardExtensions` lookup; returning `true` consumes the key,
 * returning `false` falls through to native.
 *
 * Letter matching/cycling itself is NOT implemented here. It is delegated to
 * the injected `TreeLetterJumpFn`, whose structural contract mirrors the
 * shared Floating Index helper (`nextIndexJump`): first key or changed member
 * order -> first; repeat same -> next/wrap. Initial-glyph normalization
 * (Unicode, case-fold, digits/symbols) lives in that helper; this lane passes
 * the pressed key through literally and keeps rendered order for both asc and
 * desc sorts (no re-sort).
 */

import type { TreeKeyboardRow } from './logicTreeKeyboard';
import type { IndexTreeNode } from './logicIndexGroups';
import { findNodeLevel, findParentId } from './logicIndexGroups';
import { buildIndexGroups, indexKeyFor } from './logicIndexGroups';
import { nextIndexJump } from './logicIndexJump';
import { parseScopeLevel } from './logicScopedSort';

export interface NavcoActionContext {
	readonly focusedId: string | null;
	readonly rows: readonly TreeKeyboardRow[];
}

export type NavcoKeyHandler = (
	event: KeyboardEvent,
	context: NavcoActionContext,
) => boolean;

export type NavcoKeyOverrides = Readonly<Record<string, NavcoKeyHandler>>;

/** Structural mirror of the shared Floating Index jump contract. */
export interface TreeLetterGroup {
	readonly key: string;
	readonly memberIds: readonly string[];
}

export interface TreeLetterCursor {
	readonly key: string;
	readonly memberIds: readonly string[];
	readonly targetId: string;
}

export type TreeLetterJumpFn = (
	group: Pick<TreeLetterGroup, 'key' | 'memberIds'>,
	previous: TreeLetterCursor | null,
) => TreeLetterCursor | null;

export interface TreeLetterScope {
	readonly parentId: string | null;
	readonly level: number;
}

export interface TreeLetterSort {
	readonly sortBy: string;
	readonly direction: 'asc' | 'desc';
	/**
	 * U200-L4 (cluster teclado): tiebreak alfabetico que la escena declara
	 * sobre su comparador (ej. addons: `state` primario, `name` secundario
	 * en `sortAddonEntries`). Ausente = el primario manda solo (conducta
	 * historica).
	 */
	readonly fallbackSortBy?: string | undefined;
}

/** Scene-owned wiring: the view asks, the scene resolves from live sortState. */
export interface NavcoLetterJumpPort {
	readonly resolveScope: (focusedId: string, fallbackDepth: number) => TreeLetterScope;
	readonly sortOf: (scope: TreeLetterScope) => TreeLetterSort;
	readonly labelOf: (id: string) => string | null;
	/**
	 * Shared jump helper (Floating Index lane). Optional until that lane
	 * lands: absent = letter keys bubble. Production passes an adapter that
	 * composes the shared buildIndexGroups/indexKeyFor/nextIndexJump, keeping
	 * glyph normalization in one place.
	 */
	readonly jump?: TreeLetterJumpFn | undefined;
}

/** Smallest typed Navco port. Absent = exact native behavior. */
export interface NavcoPort {
	readonly keyOverrides?: NavcoKeyOverrides | undefined;
	readonly letterJump?: NavcoLetterJumpPort | undefined;
}

export interface TreeLetterMember {
	readonly id: string;
	readonly label: string;
}

/**
 * Run the Navco override for one key. `true` = consumed (native skipped),
 * `false` = fall through to legacy extensions, then native.
 */
export function runNavcoKeyOverrides(
	overrides: NavcoKeyOverrides | null | undefined,
	event: KeyboardEvent,
	context: NavcoActionContext,
): boolean {
	const handler = overrides?.[event.key];
	if (!handler) return false;
	return handler(event, context);
}

/**
 * Printable single-glyph gate. Shift case is permitted; Ctrl/Meta/Alt are
 * never letter navigation (they stay global hotkeys). Space is excluded: it
 * is native activation. IME/composing and editable targets are guarded by the
 * caller, which owns the DOM.
 */
export function isLetterJumpKey(event: KeyboardEvent): boolean {
	if (event.ctrlKey || event.metaKey || event.altKey) return false;
	if (event.isComposing || Array.from(event.key).length !== 1 || event.key === ' ') return false;
	return true;
}

/** Letter jump is allowed only on sibling levels effectively sorted by name. */
export function shouldLetterJump(sortBy: string): boolean {
	return sortBy === 'name';
}

/**
 * U200-L4 (cluster teclado): gate con fallback declarado. El primario
 * `name` deja pasar como siempre; si no, un tiebreak `name` del comparador
 * de la escena (ej. addon sort `state` con secundario `name`) tambien
 * ordena a los hermanos por nombre dentro de cada bloque y el tecleo salta
 * al primer match renderizado. Sin fallback declarado la conducta es la
 * historica.
 */
export function allowsLetterJump(
	sort: Pick<TreeLetterSort, 'sortBy' | 'fallbackSortBy'>,
): boolean {
	if (shouldLetterJump(sort.sortBy)) return true;
	return (
		sort.fallbackSortBy !== undefined && shouldLetterJump(sort.fallbackSortBy)
	);
}

function parentIndexOfRow(rows: readonly TreeKeyboardRow[], index: number): number {
	const depth = rows[index]?.depth ?? 0;
	for (let i = index - 1; i >= 0; i -= 1) {
		if ((rows[i]?.depth ?? 0) < depth) return i;
	}
	return -1;
}

/**
 * Collect the focused row's visible siblings in RENDERED order. Desc sorts
 * keep rendered order too: the caller already sorted, we never re-sort.
 */
export function collectSiblingMembers(
	rows: readonly TreeKeyboardRow[],
	focusedIndex: number,
	labelOf: (id: string) => string | null,
): TreeLetterMember[] {
	const focused = rows[focusedIndex];
	if (!focused) return [];
	const parent = parentIndexOfRow(rows, focusedIndex);
	const members: TreeLetterMember[] = [];
	for (let i = parent + 1; i < rows.length; i += 1) {
		const row = rows[i];
		if (row.depth < focused.depth) break;
		if (row.depth !== focused.depth) continue;
		members.push({ id: row.id, label: labelOf(row.id) ?? row.id });
	}
	return members;
}

/**
 * Group-aware (parent, level) for the EFFECTIVE-sort gate. Group headers own
 * their children structurally, so the structural parent plus the logical
 * level (group strings mapped to base+offset) resolve correctly instead of
 * blindly using depth+1. Without roots, fall back to flat depth+1.
 */
export function resolveGroupAwareScope(
	roots: readonly IndexTreeNode[] | null | undefined,
	focusedId: string,
	fallbackDepth: number,
): TreeLetterScope {
	if (roots && roots.length > 0) {
		const parentId = findParentId(roots, focusedId);
		const rawLevel = findNodeLevel(roots, focusedId);
		if (typeof rawLevel === 'number') return { parentId, level: rawLevel };
		if (typeof rawLevel === 'string') {
			const parsed = parseScopeLevel(rawLevel);
			return { parentId, level: parsed.base + parsed.offset };
		}
	}
	return { parentId: null, level: fallbackDepth + 1 };
}

export interface NextLetterTargetArgs {
	readonly key: string;
	readonly rows: readonly TreeKeyboardRow[];
	readonly focusedIndex: number;
	readonly labelOf: (id: string) => string | null;
	readonly sortBy: string;
	/** U200-L4: tiebreak declarado por la escena (ver `TreeLetterSort`). */
	readonly fallbackSortBy?: string | undefined;
	readonly jump: TreeLetterJumpFn | null | undefined;
	readonly previous: TreeLetterCursor | null;
}

/**
 * One letter-jump step. Returns `null` (bubble) for non-name sorts,
 * non-glyph keys and no-match levels. Matching/cycling runs inside the
 * injected jump helper — production wires the shared
 * buildIndexGroups/indexKeyFor/nextIndexJump composition, so this lane never
 * duplicates glyph normalization. Never mutates selection; the caller focuses
 * the target through the existing reveal/focus path.
 */
export function nextLetterTarget(args: NextLetterTargetArgs): TreeLetterCursor | null {
	if (!allowsLetterJump({ sortBy: args.sortBy, fallbackSortBy: args.fallbackSortBy })) return null;
	if (Array.from(args.key).length !== 1 || args.key === ' ') return null;
	const members = collectSiblingMembers(args.rows, args.focusedIndex, args.labelOf);
	if (members.length === 0) return null;
	const key = indexKeyFor(args.key);
	const group = buildIndexGroups(members.map(member => ({ ...member, isContainer: false }))).find(group => group.key === key);
	return group ? (args.jump ?? nextIndexJump)(group, args.previous) : null;
}

export interface TreeLetterCursorStore {
	readonly previous: TreeLetterCursor | null;
	advance(key: string, memberIds: readonly string[]): TreeLetterCursor | null;
	reset(): void;
}

/**
 * Owner-local cursor: first key or changed member order -> first, repeat
 * same -> next/wrap. Cycling itself runs inside the injected jump helper; a
 * no-match `null` leaves the previous cursor untouched so a retry re-attempts.
 */
export function createTreeLetterCursorStore(jump: TreeLetterJumpFn): TreeLetterCursorStore {
	let previous: TreeLetterCursor | null = null;
	return {
		get previous(): TreeLetterCursor | null {
			return previous;
		},
		advance(key: string, memberIds: readonly string[]): TreeLetterCursor | null {
			const next = jump({ key, memberIds: [...memberIds] }, previous);
			if (next) previous = next;
			return next;
		},
		reset(): void {
			previous = null;
		},
	};
}

/** Order fingerprint so model sync can reset the cursor on member changes. */
export function rowOrderFingerprint(rows: readonly TreeKeyboardRow[]): string {
	return JSON.stringify(rows.map((row) => [row.id, row.depth]));
}
