import type { PluginMeta, TreeNode } from '../types/typeTree';
import type { ScopeSort } from '../types/typeUI';
import type { NodeGroupDef } from './logicNodeGroup';
import { filterAddonEntries, sortAddonEntries } from './logicAddonExplorer';

/** Non-plugin providers supply data and actions, not another explorer implementation. */
export interface AddonExplorerDataSource {
	readonly providerId: string;
	readonly groups: readonly NodeGroupDef[];
	nodes(): readonly TreeNode<PluginMeta>[];
	memberships(): Readonly<Record<string, readonly string[]>>;
	urnOf(node: TreeNode<PluginMeta>): string;
	activate(id: string): void;
	cell(id: string, cellId: string): void;
	tooltip(node: TreeNode<PluginMeta>): string;
}

export function projectAddonDataNodes(nodes: readonly TreeNode<PluginMeta>[], term: string, sort: ScopeSort): TreeNode<PluginMeta>[] {
	const filtered = term.trim() === '' ? nodes : nodes.flatMap((node) => {
		const children = projectAddonDataNodes(node.children ?? [], term, sort);
		const matches = filterAddonEntries([node], term, (row) => `${row.label} ${row.id} ${row.typeText ?? ''}`).length > 0;
		if (!matches && children.length === 0) return [];
		return node.children?.length ? [{ ...node, children, showCaret: children.length > 0 }] : [node];
	});
	return sortAddonEntries(filtered.map((node) => ({ ...node.meta, name: node.label, node })), sort)
		.map((entry) => entry.node);
}
