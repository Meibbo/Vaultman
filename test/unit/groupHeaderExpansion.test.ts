import { describe, expect, it } from 'vitest';

import { collectExpandableSubtreeIds } from '../../src/logic/logicTreeExpansion';
import {
	isGroupHeader,
	projectGroupedTree,
} from '../../src/logic/logicTreeGroupProjection';
import type { TreeNode } from '../../src/types/typeTree';

/**
 * U130-t33 (L-PNODE) guarda negativa: `expandAll` en explorerFiles/Tags/Props
 * camina por `collectExpandableSubtreeIds` (children-based), NO por
 * `node.meta.isFolder`. Antes de la correccion la cabecera de grupo se
 * excluia porque su meta prestada (`nodes[0]?.meta`) casi nunca traia
 * `isFolder: true`, y un test que solo comprobara "una carpeta se expande"
 * pasaba igual con ese bug puesto — nunca tocaba una cabecera de grupo.
 *
 * Este test construye una cabecera REAL con `projectGroupedTree` (el mismo
 * camino que usan los cinco explorers) y le da una meta SIN `isFolder: true`
 * -- el caso Tags/Props, y el caso Files cuando la sceneheaderMeta cambie --
 * para que la aserción falle si `expandAll` alguna vez vuelve a mirar
 * `meta.isFolder` en vez de si el nodo tiene hijos.
 */
describe('U130-t33 (L-PNODE): la cabecera de grupo no sale de expandAll', () => {
	const propLikeMember = (id: string, label: string): TreeNode => ({
		id,
		label,
		depth: 0,
		meta: { propName: label, propType: 'text', isValueNode: false },
	});

	function projectedHeader(): TreeNode {
		const [header] = projectGroupedTree({
			nodes: [propLikeMember('p1', 'alfa'), propLikeMember('p2', 'ancla')],
			groups: [],
			memberships: {},
			providerId: 'props',
			noGroupLabel: 'Sin grupo',
			filtered: false,
			// La meta propia de la cabecera de Props NO lleva `isFolder`. Si
			// `expandAll` mirara `meta.isFolder` en vez de children, esta
			// cabecera quedaria fuera aunque tenga hijos.
			headerMeta: { propName: '', propType: '', isValueNode: false },
			headerCoreCls: 'tree-item-self tappable is-clickable',
		});
		return header;
	}

	it('produce una cabecera de grupo real, con hijos y sin meta.isFolder', () => {
		const header = projectedHeader();
		expect(isGroupHeader(header.id)).toBe(true);
		expect(header.children?.length).toBeGreaterThan(0);
		expect((header.meta as { isFolder?: boolean }).isFolder).not.toBe(true);
	});

	it('collectExpandableSubtreeIds incluye la cabecera de grupo (el camino real de expandAll)', () => {
		const header = projectedHeader();
		const expandableIds = collectExpandableSubtreeIds(header);
		expect(expandableIds).toContain(header.id);
	});

	it('el predicado viejo (meta.isFolder) SI la habria dejado fuera — por eso no se usa', () => {
		const header = projectedHeader();
		const oldBuggyPredicate = (node: TreeNode): boolean =>
			(node.meta as { isFolder?: boolean })?.isFolder === true;
		// Esto documenta el bug, no lo reintroduce: si algun dia expandAll
		// volviera a `meta.isFolder`, esta asercion seguiria siendo true (el
		// predicado viejo sigue excluyendo la cabecera) mientras que el test
		// anterior (con `collectExpandableSubtreeIds`) empezaria a fallar si
		// alguien reescribe `collectExpandableSubtreeIds` para depender de
		// `isFolder` tambien.
		expect(oldBuggyPredicate(header)).toBe(false);
	});
});
