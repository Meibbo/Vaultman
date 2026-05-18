/* global $state, $derived */
import type { INodeIndex, IDecorationManager, NodeBase, IExplorer } from '../types/typeContracts';
import { ExplorerLogic } from '../logic/logicExplorer';
import { PerfMeter } from './perfMeter';

export interface ExplorerOptions<TNode extends NodeBase> {
	index: INodeIndex<TNode>;
	decorate: IDecorationManager;
}

export class ExplorerService<
	TNode extends NodeBase & { label?: string },
> implements IExplorer<TNode> {
	private logic = new ExplorerLogic();
	private idx: INodeIndex<TNode>;
	private dec: IDecorationManager;
	private subs = new Set<() => void>();

	selectedIds = $state(new Set<string>());
	expandedIds = $state(new Set<string>());
	search = $state('');
	normalizedSearch = $derived(this.search.trim().toLowerCase());
	filteredIds: readonly string[] = $derived.by(() =>
		PerfMeter.time(
			'explorer.service.filteredIds',
			() => {
				const q = this.normalizedSearch;
				const flatIds = this.idx.flatIds;
				if (!q) return flatIds;
				return flatIds.filter((id) => this.idx.getSearchBuffer(id).includes(q));
			},
			'service',
			{ nodes: this.idx.flatIds.length, queryLength: this.normalizedSearch.length },
		),
	);
	filteredNodes: readonly TNode[] = $derived.by(() =>
		PerfMeter.time('explorer.service.filteredNodes', () =>
			this.filteredIds.map((id) => this.idx.byId(id)).filter((node): node is TNode => Boolean(node)),
		),
	);

	constructor(opts: ExplorerOptions<TNode>) {
		this.idx = opts.index;
		this.dec = opts.decorate;
		this.idx.subscribe(() => this.fire());
		this.dec.subscribe(() => this.fire());
	}

	private fire(): void {
		for (const cb of this.subs) cb();
	}

	toggleSelect(id: string): void {
		this.logic.toggleSelect(id);
		this.selectedIds = new Set(this.logic.selectedIds);
		this.fire();
	}
	toggleExpand(id: string): void {
		this.logic.toggleExpand(id);
		this.expandedIds = new Set(this.logic.expandedIds);
		this.fire();
	}
	setSearch(q: string): void {
		this.logic.setSearch(q);
		this.search = q;
		this.fire();
	}
	clearSelection(): void {
		this.logic.clearSelection();
		this.selectedIds = new Set();
		this.fire();
	}
	subscribe(cb: () => void): () => void {
		this.subs.add(cb);
		return () => this.subs.delete(cb);
	}
}
