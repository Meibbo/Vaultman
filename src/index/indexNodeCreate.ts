import type { INodeIndex, NodeBase } from '../types/typeContracts';
import { getActivePerfProbe } from '../dev/perfProbe';

export interface NodeIndexOptions<TNode extends NodeBase> {
	build: () => TNode[] | Promise<TNode[]>;
	debugName?: string;
	searchText?: (node: TNode) => string;
}

export function createNodeIndex<TNode extends NodeBase>(
	opts: NodeIndexOptions<TNode>,
): INodeIndex<TNode> {
	let _nodes: TNode[] = [];
	let _flatIds: string[] = [];
	let _byId = new Map<string, TNode>();
	let _searchById = new Map<string, string>();
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
		get flatIds(): readonly string[] {
			return _flatIds;
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
			_flatIds = built.map((n) => n.id);
			_byId = new Map(built.map((n) => [n.id, n]));
			_searchById = new Map(
				built.map((n) => [
					n.id,
					normalizeSearchText(opts.searchText?.(n) ?? defaultNodeSearchText(n)),
				]),
			);
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
		getSearchBuffer(id: string): string {
			return _searchById.get(id) ?? '';
		},
	};
}

function normalizeSearchText(text: string): string {
	return text.toLowerCase();
}

function defaultNodeSearchText<TNode extends NodeBase>(node: TNode): string {
	const record = node as Record<string, unknown>;
	const parts = [node.id];
	for (const key of [
		'label',
		'name',
		'path',
		'basename',
		'tag',
		'property',
		'pluginId',
		'description',
		'author',
	]) {
		const value = record[key];
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			parts.push(String(value));
		}
	}
	const values = record.values;
	if (Array.isArray(values)) {
		for (const value of values) {
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
				parts.push(String(value));
			}
		}
	}
	return parts.join('\n');
}
