/**
 * U130 native polish: the compatibility bridge for host-scoped selectors.
 *
 * Unchanged themes/snippets ship selectors scoped to native hosts
 * (`.workspace-leaf-content[data-type="file-explorer"] ...`). Our homologous
 * containers expose the same native classes, but the host attribute differs,
 * so those rules never match. The bridge parses the live stylesheets and
 * inserts one alias rule per matched rule — same declarations, host segment
 * swapped — INTO THE SAME parent rule list, immediately after the original.
 * Same parent means media/supports conditions, cascade layers and source
 * order are preserved by construction; original theme/snippet files are
 * never modified.
 *
 * Rebuilds run only when stylesheets change (theme switch, snippet toggle,
 * `css-change`), debounced — never during scroll or per-row render. There is
 * deliberately no "copy all CSS after the originals" pass: that would
 * re-order the cascade.
 */

import {
	bridgeAliasesForRule,
	type NativeSceneId,
} from '../logic/logicNativeTreeCompat';
import { explorerCellStyleAliases } from './serviceExplorerCellContributions';
import {
	clearNativeVirtualState,
	extractNativeRootNthExpressions,
	setNativeRootNthExpressions,
	virtualAliasesForRule,
} from '../logic/logicNativeVirtualSelectors';

/** Hard ceiling per rebuild; overflow is reported, never silently dropped. */
export const NATIVE_BRIDGE_RULE_LIMIT = 2000;

export interface NativeBridgeRebuildReport {
	scannedSheets: number;
	scannedRules: number;
	aliasedRules: number;
	skippedSheets: number;
	truncated: boolean;
	/**
	 * U200 L1: wall-clock cost of this rebuild call (scan + apply).
	 * Lets the perf monitor and QA tell a no-op scan from real DOM churn.
	 */
	elapsedMs: number;
	/**
	 * U200 L1: true when the computed alias set was identical to the last
	 * applied one, so no sheet was touched and no geometry notification
	 * was emitted. Same CSS in, same CSS out: trees keep their measured
	 * heights instead of flashing through the estimate.
	 */
	unchanged: boolean;
}

interface InsertedAlias {
	container: CSSStyleSheet | CSSGroupingRule;
	rule: CSSRule;
}

/** U200 L1: one alias the pure scan phase collected, not yet inserted. */
interface PendingAlias {
	container: CSSStyleSheet | CSSGroupingRule;
	index: number;
	declarations: string;
	alias: string;
}

function isGroupingRule(rule: CSSRule): rule is CSSGroupingRule {
	return (
		'cssRules' in rule && 'insertRule' in rule &&
		typeof rule.insertRule === 'function'
	);
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
	return 'selectorText' in rule && typeof rule.selectorText === 'string' && 'style' in rule;
}

function eachRuleText(container: CSSStyleSheet | CSSGroupingRule): CSSRule[] {
	try {
		return Array.from(container.cssRules ?? []);
	} catch {
		return [];
	}
}

/** True when every declared property is a custom property (inheritable). */
function isCustomOnlyDeclarations(style: CSSStyleDeclaration): boolean {
	if (style.length === 0) return false;
	for (let index = 0; index < style.length; index += 1) {
		const name = style.item(index);
		if (!name || !name.startsWith('--')) return false;
	}
	return true;
}

export class NativeBridge {
	private readonly doc: Document;
	private readonly scenes: readonly NativeSceneId[];
	private inserted: InsertedAlias[] = [];
	private scheduled = false;
	private timer: ReturnType<typeof setTimeout> | number | null = null;
	private observer: MutationObserver | null = null;
	private cssChangeOff: (() => void) | null = null;
	/**
	 * U200 L1: fingerprint of the last APPLIED alias set. A rebuild whose
	 * scan produces the same fingerprint touches no sheet and emits no
	 * geometry notification (compute-then-compare-then-apply).
	 */
	private appliedSignature: string | null = null;

	constructor(doc: Document, scenes: readonly NativeSceneId[]) {
		this.doc = doc;
		this.scenes = [...scenes];
	}

	/**
	 * Start watching: head mutations + the workspace `css-change` event.
	 * Pass the registrar, e.g. `(cb) => plugin.app.workspace.on('css-change', cb)`.
	 *
	 * U200 L1: the head observer only schedules when a record touches a
	 * STYLE/LINK element (added/removed, its attributes, or its text
	 * content). Bare `<title>` swaps and other head noise — e.g. what
	 * Obsidian emits when a note takes focus — never reach the scan.
	 */
	watch(registerCssChange?: (cb: () => void) => () => void): void {
		this.unwatch();
		if (typeof MutationObserver !== 'undefined' && this.doc.head) {
			this.observer = new MutationObserver((records) => {
				if (records.some(isBridgeRelevantMutation)) this.scheduleRebuild();
			});
			this.observer.observe(this.doc.head, { childList: true, subtree: true });
		}
		if (registerCssChange) {
			this.cssChangeOff = registerCssChange(() => this.scheduleRebuild());
		}
	}

	unwatch(): void {
		this.observer?.disconnect();
		this.observer = null;
		this.cssChangeOff?.();
		this.cssChangeOff = null;
		if (this.timer !== null) {
			(this.doc.defaultView ?? window).clearTimeout(this.timer);
			this.timer = null;
			this.scheduled = false;
		}
	}

	scheduleRebuild(): void {
		if (this.scheduled) return;
		this.scheduled = true;
		const win = this.doc.defaultView ?? window;
		this.timer = win.setTimeout(() => {
			this.scheduled = false;
			this.timer = null;
			this.rebuild();
		}, 300);
	}

	/** Remove every alias this bridge inserted (sheets keep their originals). */
	clear(): void {
		for (const { container, rule } of this.inserted) {
			try {
				const list = Array.from(container.cssRules ?? []);
				const at = list.indexOf(rule);
				if (at >= 0) container.deleteRule(at);
			} catch {
				// A racing theme swap already dropped the sheet; nothing to do.
			}
		}
		this.inserted = [];
		// U200 L1: clearing forgets the applied set — the next rebuild must
		// re-apply from scratch, never no-op on a stale fingerprint.
		this.appliedSignature = null;
		clearNativeVirtualState(this.doc);
	}

	rebuild(): NativeBridgeRebuildReport {
		const started = elapsedNow();
		const report: NativeBridgeRebuildReport = {
			scannedSheets: 0,
			scannedRules: 0,
			aliasedRules: 0,
			skippedSheets: 0,
			truncated: false,
			elapsedMs: 0,
			unchanged: false,
		};
		const rootNthExpressions = new Set<string>();
		// U200 L1: pure scan first — no sheet is touched here.
		const pending = this.collectAliases(report, rootNthExpressions);
		const signature = fingerprintPendingAliases(pending);
		if (
			signature === this.appliedSignature &&
			this.appliedAliasesAlive()
		) {
			// Same CSS in, same CSS out: keep every inserted rule and, above
			// all, keep the trees' measured heights (no geometry ping).
			report.unchanged = true;
			report.elapsedMs = elapsedSince(started);
			return report;
		}
		this.clear();
		this.applyPendingAliases(pending, report);
		// Logical ordinals are live before trees re-measure on the pinch below.
		setNativeRootNthExpressions(this.doc, rootNthExpressions);
		// Stylesheets changed, so cached row geometry is stale. Trees keep
		// their anchor node and viewport position through the invalidation.
		notifyGeometryInvalidated(this.doc);
		this.appliedSignature = signature;
		report.elapsedMs = elapsedSince(started);
		return report;
	}

	/**
	 * U200 L1: self-healing guard for the no-op path. A matching fingerprint
	 * is not enough on its own: a same-content sheet swap would scan
	 * identical while the fresh sheet lacks our aliases. Verifies, once per
	 * distinct container, that the owning sheet is still connected and the
	 * inserted rule is still listed. Read-only; on any doubt the rebuild
	 * falls through to the full clear()+apply() below.
	 */
	private appliedAliasesAlive(): boolean {
		const byContainer = new Map<object, CSSRule[]>();
		for (const { container, rule } of this.inserted) {
			const list = byContainer.get(container);
			if (list) list.push(rule);
			else byContainer.set(container, [rule]);
		}
		for (const [container, rules] of byContainer) {
			const sheet =
				'ownerNode' in container
					? (container as CSSStyleSheet)
					: (container as CSSGroupingRule).parentStyleSheet;
			const owner = sheet?.ownerNode;
			if (
				owner?.nodeType === 1 &&
				typeof (owner as Element).isConnected === 'boolean' &&
				!(owner as Element).isConnected
			) {
				return false;
			}
			let live: CSSRule[];
			try {
				live = Array.from(
					(container as CSSStyleSheet | CSSGroupingRule).cssRules ?? [],
				);
			} catch {
				return false;
			}
			for (const rule of rules) {
				if (!live.includes(rule)) return false;
			}
		}
		return true;
	}

	/**
	 * U200 L1: read-only pass over every reachable sheet. Collects the
	 * alias insertions a rebuild WOULD perform (per container, ascending
	 * index) without mutating any rule list. Reading `cssRules`,
	 * `selectorText` and `cssText` never forces layout; the DOM churn
	 * stays in `applyPendingAliases`, which only runs on real change.
	 */
	private collectAliases(
		report: NativeBridgeRebuildReport,
		rootNthExpressions: Set<string>,
	): PendingAlias[] {
		const pending: PendingAlias[] = [];
		const sheets = this.doc.styleSheets ? Array.from(this.doc.styleSheets) : [];
		for (const sheet of sheets) {
			// Our own compiled bundle already targets Vaultman explicitly;
			// aliasing it would double every rule for no reason.
			const owner = sheet.ownerNode;
			if (
				owner?.nodeType === 1 &&
				(owner as Element).getAttribute('data-vaultman-native-bridge') ===
					'skip'
			) {
				continue;
			}
			report.scannedSheets += 1;
			try {
				// Touching cssRules throws for cross-origin sheets; probe
				// here so skipped sheets are counted, not silently empty.
				void sheet.cssRules;
				this.collectInContainer(sheet, report, rootNthExpressions, pending);
			} catch {
				report.skippedSheets += 1;
			}
		}
		return pending;
	}

	private collectInContainer(
		container: CSSStyleSheet | CSSGroupingRule,
		report: NativeBridgeRebuildReport,
		rootNthExpressions: Set<string>,
		pending: PendingAlias[],
	): void {
		const rules = eachRuleText(container);
		for (let index = 0; index < rules.length; index += 1) {
			const rule = rules[index];
			if (!rule) continue;
			report.scannedRules += 1;
			if (isGroupingRule(rule)) {
				this.collectInContainer(rule, report, rootNthExpressions, pending);
				// CSSStyleRule also has cssRules/insertRule for native nesting.
				// Its own declarations still need an alias, not just its children.
			}
			// STYLE_RULE only, duck-typed (no deprecated `type` read).
			if (!isStyleRule(rule)) continue;
			const selectorText = rule.selectorText;
			// Already-inserted virtual aliases carry the structural class but
			// must never be re-aliased on the next rebuild.
			if (
				selectorText.includes('vaultman-tree-virtual-content') ||
				selectorText.includes('data-vaultman-native-root')
			) {
				continue;
			}
			if (
				!selectorText.includes('data-type') &&
				!selectorText.includes('mod-settings') &&
				!selectorText.includes('.nav-files-container')
			) {
				continue;
			}
			const declarations = rule.style.cssText;
			if (!declarations) continue;
			const aliases: string[] = [];
			aliases.push(...explorerCellStyleAliases(this.doc, selectorText));
			for (const scene of this.scenes) {
				const alias = bridgeAliasesForRule(selectorText, scene);
				if (!alias) continue;
				aliases.push(alias);
			}
			if (this.scenes.includes('files')) {
				const virtual = virtualAliasesForRule(
					selectorText,
					'files',
					isCustomOnlyDeclarations(rule.style),
				);
				if (virtual) {
					aliases.push(virtual);
					for (const expr of extractNativeRootNthExpressions(selectorText)) {
						rootNthExpressions.add(expr);
					}
				}
			}
			if (!aliases.length) continue;
			pending.push({ container, index, declarations, alias: aliases.join(', ') });
		}
	}

	/**
	 * U200 L1: the only mutating half of a rebuild. Inserts back-to-front
	 * per container (collected ascending) so earlier indices stay valid —
	 * the same per-list order the old interleaved scan+insert produced.
	 * `report.aliasedRules` still counts successful insertions with the
	 * same limit/truncation semantics.
	 */
	private applyPendingAliases(
		pending: readonly PendingAlias[],
		report: NativeBridgeRebuildReport,
	): void {
		for (let i = pending.length - 1; i >= 0; i -= 1) {
			const match = pending[i];
			if (!match) continue;
			if (report.aliasedRules >= NATIVE_BRIDGE_RULE_LIMIT) {
				report.truncated = true;
				return;
			}
			try {
				const at = match.container.insertRule(
					`${match.alias} { ${match.declarations} }`,
					match.index + 1,
				);
				const insertedRule = match.container.cssRules[at];
				if (insertedRule) {
					this.inserted.push({ container: match.container, rule: insertedRule });
					report.aliasedRules += 1;
				}
			} catch {
				// Unparseable alias (e.g. `:has()` hostory) — skip, keep going.
			}
		}
	}
}

/**
 * U200 L1: order-independent fingerprint of the alias set a rebuild would
 * apply. Selector + declarations per alias: the same effective CSS always
 * fingerprints the same, whatever unrelated rules were added, removed or
 * moved around it. Positions are intentionally excluded — every alias is
 * re-anchored right after its source rule on apply, so relative cascade
 * order is preserved by construction.
 */
export function fingerprintPendingAliases(
	pending: readonly { alias: string; declarations: string }[],
): string {
	return pending
		.map((match) => `${match.alias}{${match.declarations}}`)
		.sort()
		.join('\n');
}

function elapsedNow(): number {
	return typeof performance !== 'undefined' &&
		typeof performance.now === 'function'
		? performance.now()
		: Date.now();
}

function elapsedSince(started: number): number {
	return Math.max(0, elapsedNow() - started);
}

/**
 * U200 L1: head-mutation prefilter for the bridge observer. Only STYLE/LINK
 * arrivals, departures and content swaps can change the alias scan; a bare
 * `<title>` swap (what Obsidian emits on every note focus) or any other
 * head noise must not schedule a 20k-rule scan.
 *
 * Exported for unit tests. Unknown shapes stay relevant (safe default).
 */
export function isBridgeRelevantMutation(record: MutationRecord): boolean {
	if (record.type !== 'childList') return true;
	const tag = (record.target as Partial<Element> | null)?.tagName;
	// A STYLE element swapping its text children edits live declarations.
	if (tag === 'STYLE') return true;
	// Title text is never CSS.
	if (tag === 'TITLE') {
		for (const list of [record.addedNodes, record.removedNodes]) {
			if (!list) continue;
			for (let i = 0; i < list.length; i += 1) {
				if (isStyleOrLinkNode(list[i])) return true;
			}
		}
		return false;
	}
	for (const list of [record.addedNodes, record.removedNodes]) {
		if (!list) continue;
		for (let i = 0; i < list.length; i += 1) {
			const node = list[i];
			if (!node || node.nodeType !== 1) continue;
			if (isStyleOrLinkNode(node)) return true;
		}
	}
	return false;
}

function isStyleOrLinkNode(node: Node): boolean {
	const tag = (node as { tagName?: unknown }).tagName;
	if (tag === 'STYLE' || tag === 'LINK') return true;
	const query = (node as Partial<Element>).querySelector;
	if (typeof query === 'function') {
		try {
			return query.call(node, 'style,link') !== null;
		} catch {
			return false;
		}
	}
	return false;
}

const documentBridges = new WeakMap<Document, { bridge: NativeBridge; users: number }>();

export function scheduleNativeBridgeRebuild(doc: Document): void {
	documentBridges.get(doc)?.bridge.scheduleRebuild();
}

/** Frames in one document share aliases; the final owner removes them. */
export function acquireNativeBridge(
	doc: Document,
	registerCssChange: (cb: () => void) => () => void,
): () => void {
	let entry = documentBridges.get(doc);
	if (!entry) {
		const bridge = new NativeBridge(doc, ['files', 'tags', 'props', 'snippets', 'plugins']);
		entry = { bridge, users: 0 };
		documentBridges.set(doc, entry);
		bridge.rebuild();
		bridge.watch(registerCssChange);
	}
	entry.users += 1;
	const owned = entry;
	return () => {
		owned.users -= 1;
		if (owned.users > 0) return;
		owned.bridge.unwatch();
		owned.bridge.clear();
		documentBridges.delete(doc);
	};
}

/** One-shot programmatic seam (lead QA + tests): rebuild synchronously. */
export function rebuildNativeBridge(
	doc: Document,
	scenes: readonly NativeSceneId[] = ['files', 'tags', 'props'],
): NativeBridgeRebuildReport {
	return new NativeBridge(doc, scenes).rebuild();
}

/**
 * U130 native polish: theme/font changes alter row geometry. Trees register
 * here per document; the bridge notifies them after every rebuild so cached
 * heights invalidate while the anchor node keeps its viewport position.
 */
const geometryListeners = new Map<Document, Set<() => void>>();

export function onBridgeGeometryInvalidated(
	doc: Document,
	listener: () => void,
): () => void {
	let set = geometryListeners.get(doc);
	if (!set) {
		set = new Set();
		geometryListeners.set(doc, set);
	}
	set.add(listener);
	return () => {
		set.delete(listener);
		if (set.size === 0) geometryListeners.delete(doc);
	};
}

function notifyGeometryInvalidated(doc: Document): void {
	for (const listener of [...(geometryListeners.get(doc) ?? [])]) {
		try {
			listener();
		} catch {
			// One tree's teardown race must not block its siblings.
		}
	}
}
