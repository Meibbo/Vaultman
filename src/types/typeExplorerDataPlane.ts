import type { TreeNode } from './typeNode';

/**
 * Structural revisions carried with a snapshot. Only upstream STRUCTURAL
 * indexes belong here. Queue/filter/decoration revisions are reserved for
 * EDP-004 and must not be added in this slice.
 */
export interface ExplorerDataPlaneRevisions {
	filesRevision?: number;
	propsRevision?: number;
	tagsRevision?: number;
	contentRevision?: number;
}

export type ExplorerSnapshotSearchMode = 'all' | 'leaf';
export type ExplorerSnapshotSortDirection = 'asc' | 'desc';
export type ExplorerSnapshotSortTarget = 'top' | 'children';

/**
 * Provider projection state that can change visible rows without changing the
 * underlying source index. Tags and Props use the same search/sort vocabulary,
 * so the shared data-plane contract records it once for downstream adapters.
 */
export interface ExplorerSnapshotProjection {
	searchTerm: string;
	searchMode: ExplorerSnapshotSearchMode;
	sortBy: string;
	sortDirection: ExplorerSnapshotSortDirection;
	sortTarget: ExplorerSnapshotSortTarget;
}

export const DEFAULT_EXPLORER_SNAPSHOT_PROJECTION: ExplorerSnapshotProjection = {
	searchTerm: '',
	searchMode: 'all',
	sortBy: 'name',
	sortDirection: 'asc',
	sortTarget: 'top',
};

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
	domainKeyToId: ReadonlyMap<string, string>;
	projection: ExplorerSnapshotProjection;
	sourceRevisions: ExplorerDataPlaneRevisions;
}

export type ExplorerRevealReason = 'keyboard' | 'selection' | 'expansion' | 'command' | 'restore';
export type ExplorerRevealAlign = 'auto' | 'start' | 'center' | 'end';

/**
 * Revision-aware reveal request shared by explorer containers and virtualized
 * views. The Wave 2 identifiers stay optional so non-files views can keep using
 * the lightweight `{ id, serial }` shape while files explorer reveals can bind
 * themselves to the current ExplorerDataPlane snapshot.
 */
export interface ExplorerRevealTarget {
	id: string;
	serial: number;
	minSnapshotRevision?: number;
	reason?: ExplorerRevealReason;
	align?: ExplorerRevealAlign;
	providerKey?: string;
	explorerId?: string;
	structureRevision?: number;
	path?: string;
	folderPath?: string;
}
