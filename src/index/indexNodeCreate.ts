import type { INodeIndex, NodeBase } from '../types/typeContracts';
import { getActivePerfProbe } from '../dev/perfProbe';

export interface NodeIndexOptions<TNode extends NodeBase> {
	build: () => TNode[] | Promise<TNode[]>;
	debugName?: string;
}

export function createNodeIndex<TNode extends NodeBase>(
	opts: NodeIndexOptions<TNode>,
): INodeIndex<TNode> {
	let _nodes: TNode[] = [];
	let _byId = new Map<string, TNode>();
	const subs = new Set<() => void>();
	let refreshVersion = 0;
	let publishedRevision = 0;

	const fire = (): void => {
		for (const cb of subs) cb();
	};

	return {
		get nodes(): readonly TNode[] {
			return _nodes;
		},
		get revision(): number {
			return publishedRevision;
		},
		async refresh(): Promise<void> {
			const currentVersion = ++refreshVersion;
			const probe = getActivePerfProbe();
			const debugName = opts.debugName ?? 'node';
			const built =
				(await probe?.measureAsync(`index.${debugName}.build`, undefined, async () =>
					opts.build(),
				)) ?? (await opts.build());
			if (refreshVersion !== currentVersion) return;
			_nodes = built;
			_byId = new Map(built.map((n) => [n.id, n]));
			publishedRevision += 1;
			if (probe) {
				probe.measure(`index.${debugName}.fire`, { nodes: built.length }, fire);
			} else {
				fire();
			}
		},
		subscribe(cb: () => void): () => void {
			subs.add(cb);
			return () => subs.delete(cb);
		},
		byId(id: string): TNode | undefined {
			return _byId.get(id);
		},
	};
}
