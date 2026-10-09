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
}

interface InsertedAlias {
	container: CSSStyleSheet | CSSGroupingRule;
	rule: CSSRule;
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

	constructor(doc: Document, scenes: readonly NativeSceneId[]) {
		this.doc = doc;
		this.scenes = [...scenes];
	}

	/**
	 * Start watching: head mutations + the workspace `css-change` event.
	 * Pass the registrar, e.g. `(cb) => plugin.app.workspace.on('css-change', cb)`.
	 */
	watch(registerCssChange?: (cb: () => void) => () => void): void {
		this.unwatch();
		if (typeof MutationObserver !== 'undefined' && this.doc.head) {
			this.observer = new MutationObserver(() => this.scheduleRebuild());
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
		clearNativeVirtualState(this.doc);
	}

	rebuild(): NativeBridgeRebuildReport {
		this.clear();
		const report: NativeBridgeRebuildReport = {
			scannedSheets: 0,
			scannedRules: 0,
			aliasedRules: 0,
			skippedSheets: 0,
			truncated: false,
		};
		const sheets = this.doc.styleSheets ? Array.from(this.doc.styleSheets) : [];
		const rootNthExpressions = new Set<string>();
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
				this.aliasInContainer(sheet, report, rootNthExpressions);
			} catch {
				report.skippedSheets += 1;
			}
			if (report.truncated) break;
		}
		// Logical ordinals are live before trees re-measure on the pinch below.
		setNativeRootNthExpressions(this.doc, rootNthExpressions);
		// Stylesheets changed, so cached row geometry is stale. Trees keep
		// their anchor node and viewport position through the invalidation.
		notifyGeometryInvalidated(this.doc);
		return report;
	}

	private aliasInContainer(
		container: CSSStyleSheet | CSSGroupingRule,
		report: NativeBridgeRebuildReport,
		rootNthExpressions: Set<string>,
	): void {
		const rules = eachRuleText(container);
		// Walk a snapshot: insertion shifts indices, so collect first.
		const matches: { index: number; declarations: string; alias: string }[] = [];
		for (let index = 0; index < rules.length; index += 1) {
			const rule = rules[index];
			if (!rule) continue;
			report.scannedRules += 1;
			if (isGroupingRule(rule)) {
				this.aliasInContainer(rule, report, rootNthExpressions);
				if (report.truncated) return;
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
			if (aliases.length) matches.push({ index, declarations, alias: aliases.join(', ') });
		}
		// Insert back-to-front so earlier indices stay valid.
		for (let i = matches.length - 1; i >= 0; i -= 1) {
			const match = matches[i];
			if (report.aliasedRules >= NATIVE_BRIDGE_RULE_LIMIT) {
				report.truncated = true;
				return;
			}
			try {
				const at = container.insertRule(
					`${match.alias} { ${match.declarations} }`,
					match.index + 1,
				);
				const insertedRule = container.cssRules[at];
				if (insertedRule) {
					this.inserted.push({ container, rule: insertedRule });
					report.aliasedRules += 1;
				}
			} catch {
				// Unparseable alias (e.g. `:has()` hostory) — skip, keep going.
			}
		}
	}
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
