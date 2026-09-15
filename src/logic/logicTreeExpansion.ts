import type { ExplorerTabId } from '../types/typeUI';
import type { TreeNode } from '../types/typeTree';

/** Return every expandable node in a subtree, including the pressed root. */
export function collectExpandableSubtreeIds(root: TreeNode): string[] {
	const expandableIds: string[] = [];
	const pending: TreeNode[] = [root];
	while (pending.length > 0) {
		const node = pending.pop();
		if (!node?.children?.length) continue;
		expandableIds.push(node.id);
		for (let index = node.children.length - 1; index >= 0; index -= 1) {
			pending.push(node.children[index]);
		}
	}
	return expandableIds;
}

/** Toggle every expandable node in a subtree, including the pressed root. */
export function toggleExpandableSubtreeIds(
	root: TreeNode,
	expandedIds: Set<string>,
): { expanded: boolean; changedIds: string[] } {
	const changedIds = collectExpandableSubtreeIds(root);
	const expanded = !expandedIds.has(root.id);
	for (const id of changedIds) {
		if (expanded) expandedIds.add(id);
		else expandedIds.delete(id);
	}
	return { expanded, changedIds };
}

export function expansionActionAvailable(
	tab: ExplorerTabId,
	visibleCells: readonly string[] | undefined,
	/**
	 * U130-t33 (L-PNODE): un grupo es un p-node independientemente de si la
	 * anidacion esta activa. Con el scope `groups` la proyeccion fabrica
	 * cabeceras con hijos aunque `nested` este apagado, y el toggle tiene que
	 * seguir vivo para ellas. Sin agrupacion, el toggle apagado con anidacion
	 * apagada sigue muerto: una lista plana no tiene nada que plegar.
	 */
	groupingActive = false,
): boolean {
	// A07b-1: B-groups2 doto a los explorers de addons de la misma
	// maquinaria de expansion que files/props/tags (las cabeceras de grupo
	// son sus unicos nodos expandibles y `preset !== 'none'` el
	// interruptor), asi que la lista ya no puede excluirlos: con grupos
	// activos el boton aparece en las cinco scenes.
	return (
		(tab === 'files' ||
			tab === 'props' ||
			tab === 'tags' ||
			tab === 'snippets' ||
			tab === 'plugins') &&
		(visibleCells?.includes('nested') === true || groupingActive)
	);
}
