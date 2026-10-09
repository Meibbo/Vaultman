/**
 * U130 native virtual bridge: bounded adapter for virtual root topology.
 *
 * Native folder trees nest; Vaultman mounts a flat virtual list
 * (`.vaultman-tree-virtual-spacer > .vaultman-tree-virtual-content >
 * .tree-item`). Structural native rules keyed to
 * `.nav-files-container > div > .nav-folder[...]` therefore never match.
 * This module rewrites exactly two generic shapes — a root folder with an
 * optional `:nth-child()` plus an optional trailing `.nav-folder-title`
 * descendant — into same-specificity aliases over the virtual content.
 * No theme, palette or snippet names are keyed here.
 *
 * Logical ordinals: DOM `:nth-child()` is meaningless across a flat,
 * windowed list (expanded descendants and offscreen roots shift sibling
 * positions), so `:nth-child(expr)` becomes the attribute
 * `[data-vaultman-native-root-nth~="expr"]`. The coordinator assigns each
 * mounted row the tokens of its logical root via getNativeRootNthTokens().
 *
 * Supported shapes (anything else returns null — explicit limitation):
 * - `.nav-files-container > div > .nav-folder[:nth-child(EXPR)]`
 * - the above plus ` .nav-folder-title` (descendant combinator only)
 * Unsupported: `nth-child(... of ...)` filters, extra classes or pseudos
 * on the structural segments, child (`>`) title combinators.
 */

import { gateSubject, selectorList } from './logicNativeSelectorBridge';
import type { NativeSceneId } from './logicNativeTreeCompat';

const NAV_CONTAINER = '.nav-files-container';
const CONTENT_WHERE = ':where(.vaultman-tree-virtual-content)';
const ROOT_TRUE_WHERE = ':where([data-vaultman-native-root="true"])';
export const NATIVE_ROOT_NTH_ATTR = 'data-vaultman-native-root-nth';

const STRUCTURAL_RULE =
	/^(?<prefix>.*)\.nav-files-container\s*>\s*div\s*>\s*\.nav-folder(?<nth>:nth-child\((?<expr>[^()]*)\))?(?<tail>.*)$/;
const TITLE_TAIL = /^\s+\.nav-folder-title\s*$/;
const INTEGER_NTH = /^[+-]?\d+$/;
const AN_PLUS_B_NTH = /^([+-]?\d*)n([+-]\d+)?$/;

/** Strip whitespace/case; null when the formula is not plain nth arithmetic. */
export function normalizeNativeNthExpression(raw: string): string | null {
	const expr = raw.trim().toLowerCase().replace(/\s+/g, '');
	if (!expr || expr.includes('(') || expr.includes(')')) return null;
	if (expr === 'odd' || expr === 'even') return expr;
	if (INTEGER_NTH.test(expr)) return expr;
	if (!AN_PLUS_B_NTH.test(expr)) return null;
	return expr;
}

function parseNth(expr: string): { a: number; b: number } | null {
	const norm = normalizeNativeNthExpression(expr);
	if (!norm) return null;
	if (norm === 'odd') return { a: 2, b: 1 };
	if (norm === 'even') return { a: 2, b: 0 };
	if (INTEGER_NTH.test(norm)) return { a: 0, b: Number.parseInt(norm, 10) };
	const match = AN_PLUS_B_NTH.exec(norm);
	if (!match) return null;
	const coef = match[1] ?? '';
	const offset = match[2] ?? '';
	const a =
		coef === '' || coef === '+' ? 1 : coef === '-' ? -1 : Number.parseInt(coef, 10);
	return { a, b: offset ? Number.parseInt(offset, 10) : 0 };
}

function nthMatches(a: number, b: number, ordinal: number): boolean {
	if (!Number.isInteger(ordinal) || ordinal < 1) return false;
	if (a === 0) return ordinal === b;
	const steps = (ordinal - b) / a;
	return Number.isInteger(steps) && steps >= 0;
}

const docNthExpressions = new WeakMap<Document, Set<string>>();

/** Replace the per-document expression set (called on every bridge rebuild). */
export function setNativeRootNthExpressions(doc: Document, exprs: Iterable<string>): void {
	const next = new Set<string>();
	for (const raw of exprs) {
		const norm = normalizeNativeNthExpression(raw);
		if (norm) next.add(norm);
	}
	docNthExpressions.set(doc, next);
}

export function getNativeRootNthExpressions(doc: Document): readonly string[] {
	return [...(docNthExpressions.get(doc) ?? [])];
}

export function clearNativeVirtualState(doc: Document): void {
	docNthExpressions.delete(doc);
}

/**
 * Space-separated nth tokens whose formula the 1-based logical root
 * ordinal satisfies. The caller mirrors this string onto the
 * `data-vaultman-native-root-nth` attribute of the root row and every
 * descendant slot (only when changed); the `~=` aliases do the rest.
 */
export function getNativeRootNthTokens(doc: Document, ordinal: number): string {
	if (!Number.isInteger(ordinal) || ordinal < 1) return '';
	const found: string[] = [];
	for (const expr of docNthExpressions.get(doc) ?? []) {
		const parsed = parseNth(expr);
		if (parsed && nthMatches(parsed.a, parsed.b, ordinal)) found.push(expr);
	}
	return found.join(' ');
}

interface StructuralMatch {
	prefix: string;
	nth: string | null;
	titled: boolean;
}

interface StructuralGroups {
	prefix?: string;
	nth?: string;
	expr?: string;
	tail?: string;
}

function matchStructural(selector: string): StructuralMatch | null {
	const groups = STRUCTURAL_RULE.exec(selector.trim())?.groups as
		| StructuralGroups
		| undefined;
	if (!groups) return null;
	const tail = groups.tail ?? '';
	let titled: boolean | null = null;
	if (tail === '') titled = false;
	else if (TITLE_TAIL.test(tail)) titled = true;
	if (titled === null) return null;
	let nth: string | null = null;
	if (groups.nth) {
		const norm = normalizeNativeNthExpression(groups.expr ?? '');
		if (!norm) return null;
		nth = norm;
	}
	return { prefix: groups.prefix ?? '', nth, titled };
}

function virtualAliasForSelector(selector: string, isCustomOnly: boolean): string | null {
	const parsed = matchStructural(selector);
	if (!parsed) return null;
	const token = parsed.nth ? `[${NATIVE_ROOT_NTH_ATTR}~="${parsed.nth}"]` : '';
	// The root gate lives in :where so root-only decoration keeps its specificity.
	const rootRow = `:where(.tree-item).nav-folder${token}${parsed.titled && !parsed.nth ? '' : ROOT_TRUE_WHERE}`;
	const head = `${parsed.prefix}${NAV_CONTAINER} > div > ${CONTENT_WHERE} > ${rootRow}`;
	const subject = parsed.titled
		? `${head} :where(.tree-item-self).nav-folder-title`
		: head;
	const rootAlias = gateSubject(subject, 'files');
	const stickyHead = `${parsed.prefix}${NAV_CONTAINER} > div:where(.vaultman-tree-sticky-layer) > ${rootRow}`;
	const stickyAlias = gateSubject(parsed.titled
		? `${stickyHead} :where(.tree-item-self).nav-folder-title` : stickyHead, 'files');
	// Custom properties inherit: one same-specificity alias lets every slot
	// under the logical root reuse the variable. Anything else stays root-only.
	if (isCustomOnly && parsed.nth && !parsed.titled) {
		const slotAlias = gateSubject(
			`${parsed.prefix}${NAV_CONTAINER} > div > ${CONTENT_WHERE} > .tree-item[${NATIVE_ROOT_NTH_ATTR}~="${parsed.nth}"]`,
			'files',
		);
		const stickySlot = gateSubject(`${parsed.prefix}${NAV_CONTAINER} > div:where(.vaultman-tree-sticky-layer) > .tree-item[${NATIVE_ROOT_NTH_ATTR}~="${parsed.nth}"]`, 'files');
		return `${rootAlias}, ${slotAlias}, ${stickyAlias}, ${stickySlot}`;
	}
	return `${rootAlias}, ${stickyAlias}`;
}

/**
 * Same-condition virtual aliases for one rule's selector list. Files scene
 * only; null when no member matches a supported structural shape.
 */
export function virtualAliasesForRule(
	selectorText: string,
	scene: NativeSceneId,
	isCustomOnly: boolean,
): string | null {
	if (scene !== 'files') return null;
	const aliases: string[] = [];
	for (const selector of selectorList(selectorText)) {
		const alias = virtualAliasForSelector(selector, isCustomOnly);
		if (alias) aliases.push(alias);
	}
	return aliases.length ? aliases.join(', ') : null;
}

/** Normalized nth expressions behind supported structural selectors. */
export function extractNativeRootNthExpressions(selectorText: string): string[] {
	const found: string[] = [];
	for (const selector of selectorList(selectorText)) {
		const parsed = matchStructural(selector);
		if (parsed?.nth) found.push(parsed.nth);
	}
	return found;
}
