import type { App } from 'obsidian';
import type { IDecorationManager, DecorationOutput, NodeBase } from '../types/typeContracts';
import { getActivePerfProbe } from '../dev/perfProbe';
import { resolveIcon } from '../logic/logicIconResolver';
import type { IconOverrideStore } from './serviceIconOverrides';

type DecorationContext = {
	kind?: 'prop' | 'tag' | 'file';
	highlightQuery?: string;
	propType?: string;
	isValueNode?: boolean;
	iconicIcon?: string | null;
	isFolder?: boolean;
	extension?: string;
	/** D6 namespaced id (`file.X`/`folder.X`/`tag.X`/`prop.X`) — PAI-002 override lookup key. */
	nodeKey?: string;
	/** Provider id for the per-provider default override fallback (PAI-002). */
	providerId?: string;
};

export class DecorationManager implements IDecorationManager {
	private app: App;
	private subs = new Set<() => void>();
	private highlightQuery = '';
	private overrides: IconOverrideStore | undefined;

	constructor(app: App, overrides?: IconOverrideStore) {
		this.app = app;
		this.overrides = overrides;
	}

	// reserved for decorator plugins (v1.1+)
	getApp(): App {
		return this.app;
	}

	setHighlightQuery(q: string): void {
		this.highlightQuery = q;
		for (const cb of this.subs) cb();
	}

	decorate<TNode extends NodeBase>(node: TNode, context?: unknown): DecorationOutput {
		return (
			getActivePerfProbe()?.measure('decoration.decorate', { nodes: 1 }, () =>
				this.decorateNode(node, context),
			) ?? this.decorateNode(node, context)
		);
	}

	private decorateNode<TNode extends NodeBase>(node: TNode, context?: unknown): DecorationOutput {
		const ctx = (context ?? {}) as DecorationContext;
		const out: DecorationOutput = { icons: [], badges: [], highlights: [] };
		const label =
			(node as { label?: string; tag?: string; property?: string; basename?: string }).label ??
			(node as { tag?: string }).tag ??
			(node as { property?: string }).property ??
			(node as { basename?: string }).basename ??
			'';
		const query = ctx.highlightQuery ?? this.highlightQuery;
		const override = ctx.nodeKey
			? this.overrides?.resolve(ctx.nodeKey, ctx.providerId)
			: undefined;

		if (ctx.kind === 'prop' && !ctx.isValueNode) {
			// Override is EXPLICIT user intent: it wins over Iconic (issue PAI-002).
			// Absence of an override falls through to today's exact precedence
			// (Iconic wins over the resolver chain).
			out.icons.push(
				override
					? resolveIcon({ kind: 'prop', propType: ctx.propType, override }).iconId
					: (ctx.iconicIcon ?? resolveIcon({ kind: 'prop', propType: ctx.propType }).iconId),
			);
		} else if (ctx.kind === 'tag') {
			out.icons.push(
				override
					? resolveIcon({ kind: 'tag', override }).iconId
					: (ctx.iconicIcon ?? resolveIcon({ kind: 'tag' }).iconId),
			);
		} else if (ctx.kind === 'file') {
			out.icons.push(
				resolveIcon({
					kind: 'file',
					isFolder: ctx.isFolder,
					extension: ctx.extension,
					override,
				}).iconId,
			);
		}

		if (query && label) {
			const haystack = label.toLowerCase();
			const needle = query.toLowerCase();
			let i = 0;
			while ((i = haystack.indexOf(needle, i)) !== -1) {
				out.highlights.push({ start: i, end: i + query.length });
				i += query.length;
			}
		}
		return out;
	}

	subscribe(cb: () => void): () => void {
		this.subs.add(cb);
		return () => this.subs.delete(cb);
	}
}
