/**
 * U130 TAREA 7: incremental prefix jump (Windows Explorer style).
 *
 * Typeahead over the focused row's visible siblings: fast alphanumeric keys
 * accumulate into a case-insensitive prefix buffer inside a 500ms window
 * (typing `r`, `e`, `c`, `i` matches labels starting with `reci`). A repeated
 * single letter (`a`, `a`) cycles through that letter's matches instead of
 * growing the buffer. The buffer resets on timeout expiry or on any
 * non-alphanumeric key.
 *
 * Matching is deterministic: first member in RENDERED sibling order whose
 * label starts with the buffer (case-insensitive). Sibling collection itself
 * is owned by `collectSiblingMembers` in `logicTreeNavigation` — this lane
 * never re-sorts and never touches selection; the caller focuses the target
 * through the existing reveal/focus path.
 */

import {
	collectSiblingMembers,
	type TreeLetterMember,
} from './logicTreeNavigation';
import type { TreeKeyboardRow } from './logicTreeKeyboard';

/** Default accumulation window in milliseconds (Windows typeahead parity). */
export const PREFIX_JUMP_WINDOW_MS = 500;

export interface TreePrefixMember {
	readonly id: string;
	readonly label: string;
}

export interface PrefixJumpHit {
	readonly prefix: string;
	readonly targetId: string;
	/** True when the hit came from single-letter cycling, not prefix growth. */
	readonly cycled: boolean;
}

/**
 * Alphanumeric gate: exactly one Unicode code point and a letter or digit.
 * Space, modifiers-driven chords, multi-char keys (`Enter`, `ArrowLeft`) and
 * symbols all reset the buffer instead of extending it.
 */
export function isPrefixJumpChar(key: string): boolean {
	if (Array.from(key).length !== 1) return false;
	return /^[\p{L}\p{N}]$/u.test(key);
}

/**
 * Deterministic first-in-rendered-order prefix match (case-insensitive).
 * Empty prefixes and empty member lists never match.
 */
export function matchPrefixTarget(
	members: readonly TreePrefixMember[],
	prefix: string,
): TreePrefixMember | null {
	if (prefix.length === 0 || members.length === 0) return null;
	const wanted = prefix.toLocaleLowerCase();
	for (const member of members) {
		if (member.label.toLocaleLowerCase().startsWith(wanted)) return member;
	}
	return null;
}

/** True when every buffered char equals the incoming key (case-insensitive). */
function isSingleCharRepeat(buffer: string, key: string): boolean {
	if (buffer.length === 0) return false;
	const wanted = key.toLocaleLowerCase();
	return Array.from(buffer).every((ch) => ch.toLocaleLowerCase() === wanted);
}

/**
 * One prefix-jump step over already-collected visible siblings. Pure and
 * timeless: accumulation/cycling state lives in
 * `createIncrementalPrefixJumpStore`. `cycleFromId` is the previously focused
 * match for single-letter cycling; `null` restarts at the first match.
 */
export function nextPrefixTarget(
	members: readonly TreePrefixMember[],
	prefix: string,
	cycleFromId: string | null,
): TreePrefixMember | null {
	if (prefix.length === 0) return null;
	const singles = Array.from(prefix);
	const repeated =
		singles.length > 0 &&
		singles.every((ch) => ch.toLocaleLowerCase() === singles[0]?.toLocaleLowerCase());
	if (repeated && singles.length === 1 && cycleFromId !== null) {
		const hits = members.filter((member) =>
			member.label.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()),
		);
		if (hits.length === 0) return null;
		const at = hits.findIndex((hit) => hit.id === cycleFromId);
		const next = hits[(at + 1) % hits.length];
		return next ?? null;
	}
	return matchPrefixTarget(members, prefix);
}

export interface SiblingPrefixTargetArgs {
	readonly rows: readonly TreeKeyboardRow[];
	readonly focusedIndex: number;
	readonly labelOf: (id: string) => string | null;
	readonly prefix: string;
}

/**
 * Prefix match scoped to the focused row's visible siblings in RENDERED
 * order via `collectSiblingMembers`. Returns the member (not just the id)
 * so the caller keeps label context for logging/telemetry.
 */
export function nextSiblingPrefixTarget(
	args: SiblingPrefixTargetArgs,
): TreeLetterMember | null {
	const members = collectSiblingMembers(args.rows, args.focusedIndex, args.labelOf);
	return matchPrefixTarget(members, args.prefix);
}

export interface PrefixJumpStoreOptions {
	readonly windowMs?: number;
	readonly now?: () => number;
}

export interface PrefixJumpStore {
	readonly buffer: string;
	type(
		key: string,
		members: readonly TreePrefixMember[],
		at?: number,
	): PrefixJumpHit | null;
	reset(): void;
}

/**
 * Owner-local incremental prefix buffer. Clock is injectable (`now`/`at`)
 * so unit tests drive the 500ms window deterministically without timers.
 *
 * Rules:
 * - Non-alphanumeric key -> buffer reset, returns `null` (caller bubbles).
 * - Gap since the last accepted key beyond `windowMs` -> buffer restarts.
 * - Buffer holding only repeats of the incoming key -> cycle that letter's
 *   matches (first -> next -> wrap), buffer stays single-char.
 * - Otherwise the key appends; a no-match accumulated prefix returns `null`
 *   but keeps the buffer until timeout (further typing still extends it).
 */
export function createIncrementalPrefixJumpStore(
	options?: PrefixJumpStoreOptions,
): PrefixJumpStore {
	const windowMs = options?.windowMs ?? PREFIX_JUMP_WINDOW_MS;
	const clock = options?.now ?? ((): number => Date.now());
	let buffer = '';
	let lastAt = Number.NEGATIVE_INFINITY;
	let lastTargetId: string | null = null;

	function reset(): void {
		buffer = '';
		lastTargetId = null;
		lastAt = Number.NEGATIVE_INFINITY;
	}

	function type(
		key: string,
		members: readonly TreePrefixMember[],
		at?: number,
	): PrefixJumpHit | null {
		if (!isPrefixJumpChar(key)) {
			reset();
			return null;
		}
		const now = at ?? clock();
		if (now - lastAt > windowMs) {
			buffer = '';
			lastTargetId = null;
		}
		if (isSingleCharRepeat(buffer, key)) {
			const cycled = nextPrefixTarget(members, key, lastTargetId);
			buffer = key;
			lastAt = now;
			if (!cycled) {
				lastTargetId = null;
				return null;
			}
			lastTargetId = cycled.id;
			return { prefix: buffer, targetId: cycled.id, cycled: true };
		}
		const prefix = buffer + key;
		const hit = matchPrefixTarget(members, prefix);
		buffer = prefix;
		lastAt = now;
		if (!hit) {
			lastTargetId = null;
			return null;
		}
		lastTargetId = hit.id;
		return { prefix: buffer, targetId: hit.id, cycled: false };
	}

	return {
		get buffer(): string {
			return buffer;
		},
		type,
		reset,
	};
}
