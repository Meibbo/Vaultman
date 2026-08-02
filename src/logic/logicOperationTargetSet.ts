export interface OperationTarget<TNode = unknown> {
	id: string;
	kind: string;
	node: TNode;
}

export interface OperationTargetSet<TNode = unknown> {
	targets: readonly OperationTarget<TNode>[];
	count: number;
}

export function buildOperationTargetSet<TNode = unknown>({
	selectedNodes,
	invokedNode,
}: {
	selectedNodes: readonly OperationTarget<TNode>[];
	invokedNode?: OperationTarget<TNode> | null;
}): OperationTargetSet<TNode> {
	const result: OperationTarget<TNode>[] = [];
	const seenIds = new Set<string>();

	for (const node of selectedNodes) {
		if (!seenIds.has(node.id)) {
			seenIds.add(node.id);
			result.push(node);
		}
	}

	if (invokedNode && !seenIds.has(invokedNode.id)) {
		seenIds.add(invokedNode.id);
		result.push(invokedNode);
	}

	return {
		targets: Object.freeze(result),
		count: result.length,
	};
}
