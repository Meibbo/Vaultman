import type { App } from 'obsidian';
import type { IDecorationManager, DecorationOutput, NodeBase } from '../types/typeContracts';
import { getActivePerfProbe } from '../dev/perfProbe';
import { resolveIcon } from '../logic/logicIconResolver';

type DecorationContext = {
	kind?: 'prop' | 'tag' | 'file';
	highlightQuery?: string;
	propType?: string;
	isValueNode?: boolean;
	iconicIcon?: string | null;
	isFolder?: boolean;
	extension?: string;
};

export class DecorationManager implements IDecorationManager {
	private app: App;
	private subs = new Set<() => void>();
	private highlightQuery = '';

	constructor(app: App) {
		this.app = app;
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

		if (ctx.kind === 'prop' && !ctx.isValueNode) {
			out.icons.push(ctx.iconicIcon ?? resolveIcon({ kind: 'prop', propType: ctx.propType }).iconId);
		} else if (ctx.kind === 'tag') {
			out.icons.push(ctx.iconicIcon ?? resolveIcon({ kind: 'tag' }).iconId);
		} else if (ctx.kind === 'file') {
			out.icons.push(
				resolveIcon({ kind: 'file', isFolder: ctx.isFolder, extension: ctx.extension }).iconId,
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
