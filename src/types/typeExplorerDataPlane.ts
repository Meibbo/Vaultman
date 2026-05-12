import type { TreeNode } from './typeNode';

/**
 * Structural revisions carried with a snapshot. Only upstream STRUCTURAL
 * indexes belong here. Queue/filter/decoration revisions are reserved for
 * EDP-004 and must not be added in this slice.
 */
export interface ExplorerDataPlaneRevisions {
	filesRevision: number;
	propsRevision?: number;
	tagsRevision?: number;
	contentRevision?: number;
}

export type ExplorerSnapshotKind =
	| 'file'
	| 'folder'
	| 'tag'
	| 'prop'
	| 'value'
	| 'unknown';

/**
 * Structural row in an explorer snapshot.
 *
 * `node` shares identity with the same TreeNode reference the provider
 * produced. Decorative TreeNode fields are not part of the snapshot contract;
 * those stay owned by ViewService and later overlay slices.
 */
export interface ExplorerSnapshotRow<TMeta = unknown> {
	id: string;
	label: string;
	depth: number;
	parentId: string | null;
	childrenIds: readonly string[];
	node: TreeNode<TMeta>;
	kind: ExplorerSnapshotKind;
	domainKey?: string;
	path?: string;
}

export interface ExplorerSnapshot<TMeta = unknown> {
	explorerId: string;
	providerKey: string;
	/** Monotonic counter bumped each time the service replaces the snapshot. */
	revision: number;
	/** Monotonic counter bumped each time structural rows or maps change. */
	structureRevision: number;
	rows: readonly ExplorerSnapshotRow<TMeta>[];
	tree: readonly TreeNode<TMeta>[];
	visibleIds: readonly string[];
	byId: ReadonlyMap<string, ExplorerSnapshotRow<TMeta>>;
	idToIndex: ReadonlyMap<string, number>;
	pathToId: ReadonlyMap<string, string>;
	folderPathToId: ReadonlyMap<string, string>;
	sourceRevisions: ExplorerDataPlaneRevisions;
}

/**
 * Reveal target reserved for later slices. Defined here so the type is stable
 * across the data-plane transition, but no view consumes it in EDP-002.
 */
export interface ExplorerRevealTarget {
	providerKey: string;
	explorerId: string;
	structureRevision: number;
	id?: string;
	path?: string;
	folderPath?: string;
	serial: number;
}
