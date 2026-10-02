import type {
	Workspace,
	WorkspaceLeaf,
	WorkspaceParent,
} from 'obsidian';
import type { SurfaceAddress } from '../types/typeSurface';

export function addressForLeaf(
	workspace: Workspace,
	leaf: WorkspaceLeaf,
	isRtl: boolean,
): SurfaceAddress<WorkspaceLeaf> {
	let current: WorkspaceParent | null = leaf.parent;
	while (current) {
		if (current === workspace.leftSplit) {
			return {
				kind: 'sidebar',
				edge: isRtl ? 'end' : 'start',
				leaf,
			};
		}
		if (current === workspace.rightSplit) {
			return {
				kind: 'sidebar',
				edge: isRtl ? 'start' : 'end',
				leaf,
			};
		}
		if (current === workspace.rootSplit) break;
		current = current.parent;
	}
	return { kind: 'main', leaf };
}
