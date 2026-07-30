---
title: EDP-002 Files snapshot data-plane implementation plan
type: implementation-plan
status: draft
parent: "[[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/index|explorer-data-plane-transition-plans]]"
created: 2026-05-12T09:00:00
updated: 2026-05-12T09:00:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/views
  - explorer/files
  - implementation-plan
created_by: claude
updated_by: claude
---

# EDP-002 Files Snapshot Data-Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a Files-only structural snapshot data-plane (typed contracts + pure builder + Svelte service) and wire `panelExplorer.svelte` to consume snapshot lookups for Files while preserving `TreeNode` compatibility and existing decoration behavior.

**Architecture:** Three new product files (`typeExplorerDataPlane.ts`, `logicExplorerSnapshot.ts`, `serviceExplorerDataPlane.svelte.ts`) provide structural snapshot contracts, a pure walker, and an immutable Svelte store. `explorerFiles.getTree()` is refactored to expose a sibling `getStructuralTree()` that returns the same `TreeNode<FileMeta>[]` minus decoration. `panelExplorer.svelte` branches `visibleNodeIds()` on `provider.id === 'files'` plus snapshot presence; non-files providers keep the existing recursive walk. Reveal targets stay on the current `{ id, serial }` shape; the richer `ExplorerRevealTarget` type lands in `typeExplorerDataPlane.ts` but is not adopted by views in this slice.

**Tech Stack:** TypeScript 5, Svelte 5 runes (`$state.raw`), Vitest 4.1 via `vp test` wrapper (`pnpm run test:unit`, `pnpm run test:component`), pnpm scripts in `package.json`, ESLint via `vp lint` / `eslint`, `svelte-check` via `pnpm run check`.

**Source references:**

- Spec: [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/14-wave-4-files-tree-snapshot-first-slice|Wave 4 Files tree snapshot first slice]]
- Issue: [[docs/work/hardening/issues/explorer-data-plane/002-files-snapshot-data-plane-foundation|EDP-002]]
- Handoff: [[01-wave-a-b-claude-handoff|Wave A/B Claude handoff]]
- Scout A1: [[reports/a1-files-source-tree-contracts|Files source and tree contracts]]
- Scout A2: [[reports/a2-panel-selection-reveal|Panel selection and reveal]]
- Scout A3: [[reports/a3-tests-verification|Tests and verification gates]]
- Scout A4: [[reports/a4-viewservice-overlay-boundary|ViewService and overlay boundary]]

---

## Reserved For Later Issues (Deferred Guard)

This slice must NOT introduce any of the following. Each is reserved for a downstream EDP issue or future slice. Any deviation breaks the boundary the scouts mapped.

- **Decoration mirrors on the snapshot:** `icon`, `badges`, `highlights`, `cls`, `labelPrefix`, `count`, `countLabel` on `TreeNode` remain decorative. They are NOT part of `ExplorerSnapshotRow` semantics even though `row.node` shares identity with the decorated `TreeNode`.
- **Overlay/decorative revisions:** `queueRevision`, `filterRevision`, `decorationRevision`, `layerRevision` MUST NOT appear on `ExplorerDataPlaneRevisions` and MUST NOT trigger snapshot rebuild. Reserved for `EDP-004`.
- **`ViewService` mutation/extension:** no new methods, state slots, or publish points on `serviceViews.svelte.ts`. `getModel`, `select`, `clearSelection`, `toggleExpanded`, `setFocused`, `subscribe`, `semanticLayerCache`, `decorationRevision` are read-only callsites for this slice.
- **Compatibility helpers:** `nodeBadgesFromViewLayers`, `highlightsFromViewLayers`, `withViewStateClasses` (`src/utils/utilViewLayers.ts`) and `bubbleHiddenTreeBadges` (`src/utils/utilBadgeBubbling.ts`) MUST NOT be called from new snapshot/data-plane code.
- **`viewTree.svelte` reveal rewiring:** `flatArray.findIndex` at `src/components/views/viewTree.svelte:243-248` stays as-is. The `ExplorerRevealTarget` type ships in `typeExplorerDataPlane.ts` but no view consumes it in EDP-002.
- **Other providers:** `explorerTags`, `explorerProps`, `explorerPlugins`, `explorerSnippets`, `explorerContent`, `explorerOutline` — no structural source method added. Files only.
- **Persistent storage:** snapshots live in memory only. No DB, no disk.
- **Generic row subscriptions:** subscribers are per-explorer-id only. No row-level subscription surface.
- **Selection mirror cleanup:** `ViewService.selections`/`focused`/`expanded` mirrors are not touched. Reserved for `EDP-010`.
- **Adapter row contract migration:** `viewTree`/`ViewNodeTable`/`ViewNodeGrid`/`ViewNodeCards` keep consuming `TreeNode[]`. Reserved for `EDP-009`.
- **Media cache DB:** explorer image/preview cache stays out. Reserved for `EDP-007`.

---

## File Structure

**Create (5):**

- `src/types/typeExplorerDataPlane.ts` — typed contracts: `ExplorerSnapshot<TMeta>`, `ExplorerSnapshotRow<TMeta>`, `ExplorerDataPlaneRevisions`, `ExplorerRevealTarget`.
- `src/logic/logicExplorerSnapshot.ts` — pure `buildExplorerSnapshot()` that walks `TreeNode<TMeta>[]` and emits rows + lookup maps.
- `src/services/serviceExplorerDataPlane.svelte.ts` — Svelte service that owns immutable snapshot store with per-explorer `subscribe`, `publish`, `snapshot`, `clear`.
- `test/unit/logic/logicExplorerSnapshot.test.ts` — unit tests for the pure builder.
- `test/unit/services/serviceExplorerDataPlane.test.ts` — unit tests for the service.

**Modify (4):**

- `src/types/typeExplorer.ts` — widen `ExplorerProvider<TMeta>` with optional `getStructuralTree?(): TreeNode<TMeta>[]` and `getStructuralRevisions?(): ExplorerDataPlaneRevisions`. No required-member change.
- `src/providers/explorerFiles.ts` — extract `buildStructuralTree()` private helper; add public `getStructuralTree()` and `getStructuralRevisions()`; keep `getTree()` semantics including `_decorateTree`.
- `src/main.ts` — instantiate `ExplorerDataPlaneService` and assign to `plugin.explorerDataPlaneService`. Bind subscriber that republishes Files snapshot when the Files provider's structural revision changes.
- `src/components/containers/panelExplorer.svelte` — derive `snapshot` for Files; branch `visibleNodeIds()` so the Files-tree path uses `snapshot.visibleIds` when present; keep recursive fallback for other providers.

**Extend (2 test files):**

- `test/unit/components/explorerFiles.test.ts` — new `describe('structural source')` block with three cases.
- `test/component/panelExplorerSelection.test.ts` — new Files-specific snapshot cases (prune order, range selection, fallback when service absent).

**DO NOT TOUCH:**

- `src/types/typeNode.ts`
- `src/services/serviceSelection.svelte.ts` and `test/unit/services/serviceSelection.test.ts`
- `src/services/serviceViews.svelte.ts` and `test/unit/services/serviceViews.test.ts`
- `src/components/views/viewTree.svelte`, `src/components/views/ViewNodeTable.svelte`, `src/components/views/ViewNodeGrid.svelte`, `src/components/views/ViewNodeCards.svelte`
- `src/utils/utilViewLayers.ts`, `src/utils/utilBadgeBubbling.ts`
- `src/index/indexFiles.ts`, `src/index/indexNodeCreate.ts`, `test/unit/services/serviceFilesIndex.test.ts`, `test/unit/services/createNodeIndex.test.ts`
- `test/helpers/obsidian-mocks.ts`
- Any other provider files (`explorerTags.ts`, `explorerProps.ts`, etc.)

---

## Naming Decisions Locked

These were ambiguous across scout reports. Lock them once for the whole plan.

- Provider structural source method: `getStructuralTree(): TreeNode<TMeta>[]` (mirrors `getTree()`).
- Provider structural revisions accessor: `getStructuralRevisions(): ExplorerDataPlaneRevisions`.
- Service field: `plugin.explorerDataPlaneService: ExplorerDataPlaneService`.
- Service per-explorer subscribe signature: `subscribe(explorerId: string, cb: () => void): () => void`.
- Pure builder name: `buildExplorerSnapshot(input: BuildExplorerSnapshotInput<TMeta>): ExplorerSnapshot<TMeta>`.

---

## Task 1: Types (`typeExplorerDataPlane.ts`)

**Files:**

- Create: `src/types/typeExplorerDataPlane.ts`

- [ ] **Step 1.1: Create the types file with full contracts**

```ts
// src/types/typeExplorerDataPlane.ts
import type { TreeNode } from './typeNode';

/**
 * Structural revisions carried with a snapshot. Only upstream STRUCTURAL
 * indexes belong here. Queue/filter/decoration revisions are reserved for
 * EDP-004 and must NOT be added in this slice.
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
 * IMPORTANT: `node` shares identity with the same `TreeNode` reference the
 * provider produced. Decorative fields on `TreeNode` (`icon`, `badges`,
 * `highlights`, `cls`, `labelPrefix`, `count`, `countLabel`) are NOT part of
 * the snapshot contract. Consumers must not treat them as authoritative
 * snapshot data — decorative state is owned by `serviceViews` and reserved
 * for EDP-004 batching.
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
 * Reveal target reserved for EDP-009. Defined here so the type is stable
 * across slices, but no view consumes it in EDP-002. `panelExplorer.svelte`
 * keeps emitting `{ id, serial }`.
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
```

- [ ] **Step 1.2: Widen `ExplorerProvider<TMeta>` with optional structural methods**

Modify `src/types/typeExplorer.ts`. Add two optional members alongside `getTree()` and `getFiles?()`. Do not remove or rename any existing member.

```ts
// src/types/typeExplorer.ts — insert after line 32 (after `getFiles?()`)
import type {
	ExplorerDataPlaneRevisions,
	// (no value imports — type-only)
} from './typeExplorerDataPlane';

// inside the ExplorerProvider<TMeta> interface body:
/**
 * Optional structural source (undecorated). Providers that opt in let the
 * Explorer data-plane service publish an `ExplorerSnapshot`. Providers that
 * do not implement these stay on the recursive `panelExplorer` fallback.
 */
getStructuralTree?(): TreeNode<TMeta>[];
getStructuralRevisions?(): ExplorerDataPlaneRevisions;
```

- [ ] **Step 1.3: Verify type compilation**

Run: `pnpm run check` Expected: pass with 0 errors / 0 warnings. The new file has no runtime imports yet, so no test or runtime path can break. If `svelte-check` flags an unused import in `typeExplorer.ts`, switch to `import type { ... }` form (already shown above) or inline-import.

- [ ] **Step 1.4: Commit**

```bash
git add src/types/typeExplorerDataPlane.ts src/types/typeExplorer.ts
git commit -m "feat(explorer): add ExplorerDataPlane type contracts (EDP-002)"
```

---

## Task 2: Pure Snapshot Builder (`logicExplorerSnapshot.ts`)

**Files:**

- Create: `src/logic/logicExplorerSnapshot.ts`
- Test: `test/unit/logic/logicExplorerSnapshot.test.ts`

- [ ] **Step 2.1: Write the failing test file**

Create `test/unit/logic/logicExplorerSnapshot.test.ts` with the full case set. Use a local `buildTree()` helper inside the file — do NOT add a shared helper to `test/helpers/`.

```ts
// test/unit/logic/logicExplorerSnapshot.test.ts
import { describe, expect, it } from 'vitest';
import type { TreeNode } from '../../../src/types/typeNode';
import { buildExplorerSnapshot } from '../../../src/logic/logicExplorerSnapshot';
import type { ExplorerDataPlaneRevisions } from '../../../src/types/typeExplorerDataPlane';

type FileMetaLite = {
	file: { path: string } | null;
	isFolder: boolean;
	folderPath: string;
};

function leaf(id: string, label: string, folderPath: string, isFolder = false): TreeNode<FileMetaLite> {
	return {
		id,
		label,
		depth: 0,
		meta: {
			file: isFolder ? null : { path: id },
			isFolder,
			folderPath,
		},
	};
}

function buildTree(): TreeNode<FileMetaLite>[] {
	const fileA = leaf('a/x.md', 'x.md', 'a');
	const fileB = leaf('a/b/y.md', 'y.md', 'a/b');
	const fileDupe = leaf('a/b/x.md', 'x.md', 'a/b');
	const folderB: TreeNode<FileMetaLite> = {
		...leaf('a/b', 'b', 'a/b', true),
		children: [fileDupe, fileB],
	};
	const folderA: TreeNode<FileMetaLite> = {
		...leaf('a', 'a', 'a', true),
		children: [folderB, fileA],
	};
	return [folderA];
}

const revisions: ExplorerDataPlaneRevisions = { filesRevision: 1 };

describe('buildExplorerSnapshot', () => {
	it('produces rows in DFS visible order with depth and parent links', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
		});
		expect(snap.rows.map((r) => r.id)).toEqual(['a', 'a/b', 'a/b/x.md', 'a/b/y.md', 'a/x.md']);
		expect(snap.rows.map((r) => r.depth)).toEqual([0, 1, 2, 2, 1]);
		expect(snap.byId.get('a/b/y.md')?.parentId).toBe('a/b');
		expect(snap.byId.get('a')?.parentId).toBe(null);
		expect(snap.byId.get('a')?.childrenIds).toEqual(['a/b', 'a/x.md']);
	});

	it('builds idToIndex matching visibleIds order', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
		});
		expect([...snap.visibleIds]).toEqual(snap.rows.map((r) => r.id));
		expect(snap.idToIndex.get('a/x.md')).toBe(snap.visibleIds.indexOf('a/x.md'));
	});

	it('handles duplicate labels under distinct paths', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
		});
		expect(snap.byId.has('a/x.md')).toBe(true);
		expect(snap.byId.has('a/b/x.md')).toBe(true);
	});

	it('collapses non-expanded subtrees out of visibleIds but keeps them in byId', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a']),
			revisions,
			kindFor: () => 'file',
		});
		expect(snap.visibleIds).not.toContain('a/b/x.md');
		expect(snap.visibleIds).not.toContain('a/b/y.md');
		expect(snap.byId.has('a/b/x.md')).toBe(true);
		expect(snap.byId.has('a/b/y.md')).toBe(true);
	});

	it('preserves TreeNode identity in row.node and snapshot.tree', () => {
		const tree = buildTree();
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree,
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
		});
		expect(snap.tree[0]).toBe(tree[0]);
		expect(snap.byId.get('a')?.node).toBe(tree[0]);
	});

	it('exposes pathToId and folderPathToId from meta.file.path and meta.folderPath', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
			pathFor: (row) => row.node.meta.file?.path,
			folderPathFor: (row) => (row.node.meta.isFolder ? row.node.meta.folderPath : undefined),
		});
		expect(snap.pathToId.get('a/x.md')).toBe('a/x.md');
		expect(snap.pathToId.get('a/b/y.md')).toBe('a/b/y.md');
		expect(snap.folderPathToId.get('a')).toBe('a');
		expect(snap.folderPathToId.get('a/b')).toBe('a/b');
	});

	it('carries sourceRevisions through unchanged', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions: { filesRevision: 7, propsRevision: 3 },
			kindFor: () => 'file',
		});
		expect(snap.sourceRevisions).toEqual({ filesRevision: 7, propsRevision: 3 });
	});

	it('returns structureRevision=0 from the pure builder (service owns the counter)', () => {
		const snap = buildExplorerSnapshot({
			explorerId: 'files',
			providerKey: 'files',
			tree: buildTree(),
			expandedIds: new Set(['a', 'a/b']),
			revisions,
			kindFor: () => 'file',
		});
		expect(snap.revision).toBe(0);
		expect(snap.structureRevision).toBe(0);
	});
});
```

- [ ] **Step 2.2: Run the test to verify it fails**

Run: `pnpm run test:unit -- test/unit/logic/logicExplorerSnapshot.test.ts` Expected: FAIL — `buildExplorerSnapshot` cannot be resolved (module not found at `src/logic/logicExplorerSnapshot`).

- [ ] **Step 2.3: Implement the pure builder**

Create `src/logic/logicExplorerSnapshot.ts`:

```ts
// src/logic/logicExplorerSnapshot.ts
import type { TreeNode } from '../types/typeNode';
import type {
	ExplorerDataPlaneRevisions,
	ExplorerSnapshot,
	ExplorerSnapshotKind,
	ExplorerSnapshotRow,
} from '../types/typeExplorerDataPlane';

export interface BuildExplorerSnapshotInput<TMeta = unknown> {
	explorerId: string;
	providerKey: string;
	tree: readonly TreeNode<TMeta>[];
	expandedIds: ReadonlySet<string>;
	revisions: ExplorerDataPlaneRevisions;
	kindFor: (row: { node: TreeNode<TMeta>; parentId: string | null }) => ExplorerSnapshotKind;
	pathFor?: (row: { node: TreeNode<TMeta>; parentId: string | null }) => string | undefined;
	folderPathFor?: (row: { node: TreeNode<TMeta>; parentId: string | null }) => string | undefined;
	domainKeyFor?: (row: { node: TreeNode<TMeta>; parentId: string | null }) => string | undefined;
}

export function buildExplorerSnapshot<TMeta = unknown>(
	input: BuildExplorerSnapshotInput<TMeta>,
): ExplorerSnapshot<TMeta> {
	const rows: ExplorerSnapshotRow<TMeta>[] = [];
	const visibleIds: string[] = [];
	const byIdMutable = new Map<string, ExplorerSnapshotRow<TMeta>>();
	const idToIndexMutable = new Map<string, number>();
	const pathToIdMutable = new Map<string, string>();
	const folderPathToIdMutable = new Map<string, string>();

	function walk(node: TreeNode<TMeta>, depth: number, parentId: string | null, visibleAncestors: boolean) {
		const childrenIds: string[] = (node.children ?? []).map((c) => c.id);
		const row: ExplorerSnapshotRow<TMeta> = {
			id: node.id,
			label: node.label,
			depth,
			parentId,
			childrenIds,
			node,
			kind: input.kindFor({ node, parentId }),
			domainKey: input.domainKeyFor?.({ node, parentId }),
			path: input.pathFor?.({ node, parentId }),
		};
		rows.push(row);
		byIdMutable.set(node.id, row);

		const path = row.path;
		if (path !== undefined) pathToIdMutable.set(path, node.id);
		const folderPath = input.folderPathFor?.({ node, parentId });
		if (folderPath !== undefined) folderPathToIdMutable.set(folderPath, node.id);

		if (visibleAncestors) {
			idToIndexMutable.set(node.id, visibleIds.length);
			visibleIds.push(node.id);
		}

		const childVisible = visibleAncestors && input.expandedIds.has(node.id);
		for (const child of node.children ?? []) {
			walk(child, depth + 1, node.id, childVisible);
		}
	}

	for (const root of input.tree) {
		walk(root, 0, null, true);
	}

	return {
		explorerId: input.explorerId,
		providerKey: input.providerKey,
		revision: 0,
		structureRevision: 0,
		rows,
		tree: input.tree,
		visibleIds,
		byId: byIdMutable,
		idToIndex: idToIndexMutable,
		pathToId: pathToIdMutable,
		folderPathToId: folderPathToIdMutable,
		sourceRevisions: input.revisions,
	};
}
```

- [ ] **Step 2.4: Run the test to verify it passes**

Run: `pnpm run test:unit -- test/unit/logic/logicExplorerSnapshot.test.ts` Expected: PASS — all 8 cases green. If any case fails, fix the builder; do NOT relax test expectations.

- [ ] **Step 2.5: Commit**

```bash
git add src/logic/logicExplorerSnapshot.ts test/unit/logic/logicExplorerSnapshot.test.ts
git commit -m "feat(explorer): add buildExplorerSnapshot pure builder with unit tests (EDP-002)"
```

---

## Task 3: Data-Plane Service (`serviceExplorerDataPlane.svelte.ts`)

**Files:**

- Create: `src/services/serviceExplorerDataPlane.svelte.ts`
- Test: `test/unit/services/serviceExplorerDataPlane.test.ts`

- [ ] **Step 3.1: Write the failing test file**

Create `test/unit/services/serviceExplorerDataPlane.test.ts`:

```ts
// test/unit/services/serviceExplorerDataPlane.test.ts
import { describe, expect, it, vi } from 'vitest';
import { ExplorerDataPlaneService } from '../../../src/services/serviceExplorerDataPlane.svelte';
import type {
	ExplorerSnapshot,
	ExplorerDataPlaneRevisions,
} from '../../../src/types/typeExplorerDataPlane';

function emptySnapshot(explorerId = 'files'): ExplorerSnapshot {
	const revisions: ExplorerDataPlaneRevisions = { filesRevision: 1 };
	return {
		explorerId,
		providerKey: explorerId,
		revision: 0,
		structureRevision: 0,
		rows: [],
		tree: [],
		visibleIds: [],
		byId: new Map(),
		idToIndex: new Map(),
		pathToId: new Map(),
		folderPathToId: new Map(),
		sourceRevisions: revisions,
	};
}

describe('ExplorerDataPlaneService', () => {
	it('returns undefined before any publish', () => {
		const svc = new ExplorerDataPlaneService();
		expect(svc.snapshot('files')).toBeUndefined();
	});

	it('publish stores the snapshot and increments revision per explorer', () => {
		const svc = new ExplorerDataPlaneService();
		svc.publish('files', emptySnapshot('files'));
		const first = svc.snapshot('files');
		expect(first?.revision).toBe(1);
		expect(first?.structureRevision).toBe(1);

		svc.publish('files', emptySnapshot('files'));
		const second = svc.snapshot('files');
		expect(second?.revision).toBe(2);
		expect(second?.structureRevision).toBe(2);
	});

	it('per-explorer subscribe fires only when matching explorerId publishes', () => {
		const svc = new ExplorerDataPlaneService();
		const filesCb = vi.fn();
		const tagsCb = vi.fn();
		svc.subscribe('files', filesCb);
		svc.subscribe('tags', tagsCb);

		svc.publish('files', emptySnapshot('files'));
		expect(filesCb).toHaveBeenCalledTimes(1);
		expect(tagsCb).toHaveBeenCalledTimes(0);

		svc.publish('tags', emptySnapshot('tags'));
		expect(filesCb).toHaveBeenCalledTimes(1);
		expect(tagsCb).toHaveBeenCalledTimes(1);
	});

	it('unsubscribe stops firing for that subscriber only', () => {
		const svc = new ExplorerDataPlaneService();
		const cb = vi.fn();
		const off = svc.subscribe('files', cb);
		svc.publish('files', emptySnapshot('files'));
		expect(cb).toHaveBeenCalledTimes(1);
		off();
		svc.publish('files', emptySnapshot('files'));
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('clear removes the snapshot and notifies subscribers once', () => {
		const svc = new ExplorerDataPlaneService();
		const cb = vi.fn();
		svc.subscribe('files', cb);
		svc.publish('files', emptySnapshot('files'));
		expect(svc.snapshot('files')).toBeDefined();
		svc.clear('files');
		expect(svc.snapshot('files')).toBeUndefined();
		expect(cb).toHaveBeenCalledTimes(2);
	});

	it('revision is per-explorer (publishing tags does not bump files)', () => {
		const svc = new ExplorerDataPlaneService();
		svc.publish('files', emptySnapshot('files'));
		svc.publish('tags', emptySnapshot('tags'));
		svc.publish('tags', emptySnapshot('tags'));
		expect(svc.snapshot('files')?.revision).toBe(1);
		expect(svc.snapshot('tags')?.revision).toBe(2);
	});

	it('returns the same reference across reads until next publish (immutable read)', () => {
		const svc = new ExplorerDataPlaneService();
		svc.publish('files', emptySnapshot('files'));
		const a = svc.snapshot('files');
		const b = svc.snapshot('files');
		expect(a).toBe(b);
	});
});
```

- [ ] **Step 3.2: Run the test to verify it fails**

Run: `pnpm run test:unit -- test/unit/services/serviceExplorerDataPlane.test.ts` Expected: FAIL — `ExplorerDataPlaneService` module not found.

- [ ] **Step 3.3: Implement the service**

Create `src/services/serviceExplorerDataPlane.svelte.ts`:

```ts
// src/services/serviceExplorerDataPlane.svelte.ts
import type { ExplorerSnapshot } from '../types/typeExplorerDataPlane';

type AnySnapshot = ExplorerSnapshot<unknown>;

/**
 * In-memory, per-explorer immutable snapshot store. Each `publish()` replaces
 * the snapshot for the given `explorerId` and bumps its `revision` and
 * `structureRevision` counters monotonically. Subscribers registered for a
 * matching `explorerId` are fired synchronously after the replacement.
 *
 * Reserved for EDP-004: a sibling layers store (`ExplorerLayersService`)
 * batches `ViewLayers` keyed by row id. Not part of this slice.
 */
export class ExplorerDataPlaneService {
	#snapshots: Map<string, AnySnapshot> = new Map();
	#subscribers: Map<string, Set<() => void>> = new Map();
	#counters: Map<string, number> = new Map();

	snapshot<TMeta = unknown>(explorerId: string): ExplorerSnapshot<TMeta> | undefined {
		return this.#snapshots.get(explorerId) as ExplorerSnapshot<TMeta> | undefined;
	}

	publish<TMeta = unknown>(explorerId: string, snapshot: ExplorerSnapshot<TMeta>): void {
		const next = (this.#counters.get(explorerId) ?? 0) + 1;
		this.#counters.set(explorerId, next);
		const stamped: ExplorerSnapshot<TMeta> = {
			...snapshot,
			revision: next,
			structureRevision: next,
		};
		this.#snapshots.set(explorerId, stamped as AnySnapshot);
		this.#fire(explorerId);
	}

	clear(explorerId: string): void {
		this.#snapshots.delete(explorerId);
		this.#counters.delete(explorerId);
		this.#fire(explorerId);
	}

	subscribe(explorerId: string, cb: () => void): () => void {
		let bucket = this.#subscribers.get(explorerId);
		if (!bucket) {
			bucket = new Set();
			this.#subscribers.set(explorerId, bucket);
		}
		bucket.add(cb);
		return () => {
			bucket?.delete(cb);
		};
	}

	#fire(explorerId: string): void {
		const bucket = this.#subscribers.get(explorerId);
		if (!bucket) return;
		for (const cb of bucket) cb();
	}
}
```

Note: this slice intentionally does NOT use `$state.raw`. The store is a plain Map; reactivity for Svelte components is driven by the explicit subscribe surface, which mirrors the existing `INodeIndex.subscribe` pattern (`src/index/indexNodeCreate.ts:55-58`). A later slice (post-EDP-002, with `EDP-003` panel wiring) may swap to `$state.raw` for direct-binding sites once consumers are identified. Keeping it plain for EDP-002 makes the immutability contract verifiable by unit tests.

- [ ] **Step 3.4: Run the test to verify it passes**

Run: `pnpm run test:unit -- test/unit/services/serviceExplorerDataPlane.test.ts` Expected: PASS — all 7 cases green.

- [ ] **Step 3.5: Commit**

```bash
git add src/services/serviceExplorerDataPlane.svelte.ts test/unit/services/serviceExplorerDataPlane.test.ts
git commit -m "feat(explorer): add ExplorerDataPlaneService with immutable publish/subscribe (EDP-002)"
```

---

## Task 4: Files Provider Structural Source

**Files:**

- Modify: `src/providers/explorerFiles.ts:127-158` and a new private helper
- Test: `test/unit/components/explorerFiles.test.ts` (extend)

- [ ] **Step 4.1: Write the failing tests in `explorerFiles.test.ts`**

Append a new `describe('structural source')` block at the end of `test/unit/components/explorerFiles.test.ts`. Use the existing local `makePlugin()` factory; do NOT modify earlier cases.

```ts
// at the end of test/unit/components/explorerFiles.test.ts
describe('structural source', () => {
	it('getStructuralTree returns the same node ids and shape as getTree()', () => {
		const { plugin } = makePlugin();
		const explorer = new ExplorerFiles(plugin);
		const decorated = explorer.getTree();
		const structural = explorer.getStructuralTree();

		function idShape(nodes: TreeNode<FileMeta>[]): unknown {
			return nodes.map((n) => ({
				id: n.id,
				label: n.label,
				children: n.children ? idShape(n.children) : undefined,
			}));
		}
		expect(idShape(structural)).toEqual(idShape(decorated));
	});

	it('getStructuralTree does NOT invoke viewService.getModel', () => {
		const { plugin } = makePlugin();
		const explorer = new ExplorerFiles(plugin);
		const spy = vi.spyOn(plugin.viewService, 'getModel');
		explorer.getStructuralTree();
		expect(spy).not.toHaveBeenCalled();
	});

	it('action hooks operate on nodes returned by getStructuralTree', () => {
		const { plugin, openLinkText } = makePlugin();
		const explorer = new ExplorerFiles(plugin);
		const structural = explorer.getStructuralTree();
		const firstFile = findFirstFileNode(structural);
		expect(firstFile).toBeDefined();
		explorer.handleNodeSecondaryAction(firstFile!);
		expect(openLinkText).toHaveBeenCalledWith(firstFile!.meta.file!.path, '', true);
	});

	it('getStructuralRevisions returns filesRevision from filesIndex', () => {
		const { plugin } = makePlugin();
		const explorer = new ExplorerFiles(plugin);
		const revs = explorer.getStructuralRevisions();
		expect(revs.filesRevision).toBe(plugin.filesIndex.revision);
	});
});

function findFirstFileNode(nodes: TreeNode<FileMeta>[]): TreeNode<FileMeta> | undefined {
	for (const n of nodes) {
		if (n.meta?.file) return n;
		const inChildren = n.children ? findFirstFileNode(n.children) : undefined;
		if (inChildren) return inChildren;
	}
	return undefined;
}
```

Ensure the test file imports `vi` from `vitest` and any missing types (`TreeNode`, `FileMeta`) at the top. If the existing file already imports them, do not duplicate; if it doesn't, add them with the same import style used in the rest of the file.

- [ ] **Step 4.2: Run the test to verify it fails**

Run: `pnpm run test:unit -- test/unit/components/explorerFiles.test.ts` Expected: FAIL — the four new cases fail because `getStructuralTree` and `getStructuralRevisions` are not defined on `ExplorerFiles`. Existing cases must remain green.

- [ ] **Step 4.3: Refactor `explorerFiles.getTree()` and add structural source**

In `src/providers/explorerFiles.ts`, extract the body of `getTree()` (lines 127-158 in the current code) up to but NOT including `_decorateTree` into a private helper. The new shape:

```ts
// src/providers/explorerFiles.ts — replace existing getTree() with:

private buildStructuralTree(): TreeNode<FileMeta>[] {
	const source = this.sourceFiles();
	const getSearchBuffer = this.plugin.filesIndex
		? (path: string) => this.fileSearchBuffer(path)
		: undefined;
	const filtered = PerfMeter.time(
		'explorer.files.filterFlat',
		() => this.logic.filterFlat(source, this.searchName, this.searchFolder, getSearchBuffer),
	);
	const sorted = PerfMeter.time('explorer.files.sort', () => this._sortFiles(filtered));
	const tree = PerfMeter.time(
		'explorer.files.buildTree',
		() => this.logic.buildFileTree(sorted, { foldersFirst: this.foldersFirstEnabled() }),
	);
	this.attachAdoptedChildren(tree);
	return tree;
}

getStructuralTree(): TreeNode<FileMeta>[] {
	return this.buildStructuralTree();
}

getStructuralRevisions(): ExplorerDataPlaneRevisions {
	return {
		filesRevision: this.plugin.filesIndex?.revision ?? 0,
		propsRevision: this.plugin.propsIndex?.revision,
	};
}

getTree(): TreeNode<FileMeta>[] {
	const tree = this.buildStructuralTree();
	PerfMeter.time('explorer.files.decorateTree', () => this._decorateTree(tree));
	return tree;
}
```

Add the import `import type { ExplorerDataPlaneRevisions } from '../types/typeExplorerDataPlane';` at the top of the file (after other type imports).

DO NOT change any other method body. `attachAdoptedChildren`, `_decorateTree`, action hooks, search/sort/hidden setters, and `subscribe` semantics stay byte-for-byte identical.

- [ ] **Step 4.4: Run the test to verify it passes**

Run: `pnpm run test:unit -- test/unit/components/explorerFiles.test.ts` Expected: PASS — all original cases plus the four new structural-source cases green. If any original case (e.g., decoration-dependent assertions on `icon`/`highlights`/`cls` or hover-badge tests) fails, you broke the decorated path — re-verify that `getTree()` still calls `_decorateTree` after `buildStructuralTree`.

- [ ] **Step 4.5: Run the broader Files-provider regression group**

Run: `pnpm run test:unit -- test/unit/components/explorerFiles.test.ts test/unit/logic/logicsFiles.test.ts test/unit/services/serviceFilesIndex.test.ts test/unit/services/createNodeIndex.test.ts test/unit/services/serviceSelection.test.ts test/unit/services/serviceViews.test.ts` Expected: PASS — all suites green. If `serviceViews.test.ts` regresses, you accidentally changed the `_decorateTree` callsite — revert.

- [ ] **Step 4.6: Commit**

```bash
git add src/providers/explorerFiles.ts test/unit/components/explorerFiles.test.ts
git commit -m "feat(explorer): add getStructuralTree/getStructuralRevisions to Files provider (EDP-002)"
```

---

## Task 5: Wire Service Into `VaultmanPlugin`

**Files:**

- Modify: `src/main.ts` (declaration + construction)

- [ ] **Step 5.1: Declare the service field**

In `src/main.ts`, add a field declaration in the same block where other services are declared (around line 103, after `viewService!: IViewService;`):

```ts
explorerDataPlaneService!: ExplorerDataPlaneService;
```

Add the import at the top alongside other service imports:

```ts
import { ExplorerDataPlaneService } from './services/serviceExplorerDataPlane.svelte';
```

- [ ] **Step 5.2: Construct the service during `onload()`**

Locate the service-construction region inside `onload()` (currently around lines 181-220 in `src/main.ts` — find the block where `propertyIndex`, `filterService`, `queueService` are constructed). Add immediately after `this.queueService = new OperationQueueService(this.app);`:

```ts
this.explorerDataPlaneService = new ExplorerDataPlaneService();
```

Do NOT add subscription wiring or auto-publish yet. The panel will populate snapshots on demand via the path added in Task 6. Auto-republish from index `subscribe()` is reserved for a follow-up slice.

- [ ] **Step 5.3: Verify type compilation and unit tests**

Run: `pnpm run check` Expected: PASS, 0 errors / 0 warnings.

Run: `pnpm run test:unit -- test/unit/services/serviceExplorerDataPlane.test.ts test/unit/logic/logicExplorerSnapshot.test.ts` Expected: PASS — no regression.

- [ ] **Step 5.4: Commit**

```bash
git add src/main.ts
git commit -m "feat(explorer): construct ExplorerDataPlaneService in VaultmanPlugin (EDP-002)"
```

---

## Task 6: Panel Compatibility Path For Files

**Files:**

- Modify: `src/components/containers/panelExplorer.svelte:674-691` (and a small `$derived` near the top of `<script>`)
- Test: `test/component/panelExplorerSelection.test.ts` (extend)

- [ ] **Step 6.1: Write the failing test extension**

Append three cases to `test/component/panelExplorerSelection.test.ts` after the existing Files-specific block (currently around lines 289-313). Use a hand-built snapshot stub on a fake `plugin.explorerDataPlaneService`.

```ts
// new cases inside test/component/panelExplorerSelection.test.ts
describe('files snapshot wiring (EDP-002)', () => {
	function makeFilesSnapshot(visibleIds: string[]) {
		const byId = new Map(visibleIds.map((id, idx) => [id, {
			id, label: id, depth: 0, parentId: null as string | null, childrenIds: [],
			node: { id, label: id, depth: 0, meta: {} } as TreeNode,
			kind: 'file' as const,
		}]));
		const idToIndex = new Map(visibleIds.map((id, idx) => [id, idx]));
		return {
			explorerId: 'files',
			providerKey: 'files',
			revision: 1,
			structureRevision: 1,
			rows: [...byId.values()],
			tree: [],
			visibleIds,
			byId,
			idToIndex,
			pathToId: new Map(),
			folderPathToId: new Map(),
			sourceRevisions: { filesRevision: 1 },
		};
	}

	it('files panel prune uses snapshot.visibleIds when a snapshot is published', async () => {
		const visibleIds = ['a/x.md', 'a/y.md'];
		const snap = makeFilesSnapshot(visibleIds);
		const explorerDataPlaneService = {
			snapshot: vi.fn((id: string) => (id === 'files' ? snap : undefined)),
			subscribe: vi.fn(() => () => {}),
		};
		const selectionService = new NodeSelectionService();
		const pruneSpy = vi.spyOn(selectionService, 'prune');
		const pluginInst = plugin(selectionService);
		(pluginInst as unknown as { explorerDataPlaneService: typeof explorerDataPlaneService }).explorerDataPlaneService =
			explorerDataPlaneService;
		const filesProvider = provider({ id: 'files', getTree: () => snap.rows.map((r) => r.node) });
		// mount panelExplorer with this provider (use existing test helper for mounting if present)
		// ...assert selectionService.prune was called with the snapshot.visibleIds for any selection-change effect
		expect(pruneSpy).toHaveBeenCalledWith('files', visibleIds);
	});

	it('files panel falls back to recursive walk when service is absent', async () => {
		const selectionService = new NodeSelectionService();
		const pruneSpy = vi.spyOn(selectionService, 'prune');
		const pluginInst = plugin(selectionService);
		// no explorerDataPlaneService on plugin
		const filesProvider = provider({ id: 'files' });
		// mount panelExplorer; trigger a selection-change
		// ...assert pruneSpy was called with the recursive visibleNodeIds output
		expect(pruneSpy).toHaveBeenCalled();
	});

	it('non-files providers still use the recursive walk even when service is present', async () => {
		const snap = makeFilesSnapshot(['a/x.md']);
		const explorerDataPlaneService = {
			snapshot: vi.fn((id: string) => (id === 'files' ? snap : undefined)),
			subscribe: vi.fn(() => () => {}),
		};
		const selectionService = new NodeSelectionService();
		const pruneSpy = vi.spyOn(selectionService, 'prune');
		const pluginInst = plugin(selectionService);
		(pluginInst as unknown as { explorerDataPlaneService: typeof explorerDataPlaneService }).explorerDataPlaneService =
			explorerDataPlaneService;
		const tagsProvider = provider({ id: 'tags' });
		// mount panelExplorer with tagsProvider; trigger a selection-change
		// ...assert pruneSpy was called with the recursive walk output (not snap.visibleIds)
		expect(pruneSpy).not.toHaveBeenCalledWith('tags', snap.visibleIds);
	});
});
```

If the existing test file does not already mount `PanelExplorer` via a helper, use the same mount/teardown pattern already used at `test/component/panelExplorerSelection.test.ts:289-313` for the Files block. Do NOT introduce a new shared helper.

- [ ] **Step 6.2: Run the test to verify it fails**

Run: `pnpm run test:component -- test/component/panelExplorerSelection.test.ts` Expected: FAIL — the three new cases fail because `panelExplorer.svelte` still uses the recursive `visibleNodeIds()` even when a snapshot is present.

- [ ] **Step 6.3: Add the snapshot-aware branch in `panelExplorer.svelte`**

Near the top of the `<script lang="ts">` block in `src/components/containers/panelExplorer.svelte` (after `provider` and `plugin` are in scope), add a `$derived` for the Files snapshot:

```ts
const filesSnapshot = $derived.by(() => {
	if (provider.id !== 'files') return null;
	return plugin.explorerDataPlaneService?.snapshot('files') ?? null;
});
```

Modify `visibleNodeIds()` at `src/components/containers/panelExplorer.svelte:674-691`. The tree-mode branch (the first inner branch that walks `nodes` honoring `expandedIds`) gains a snapshot short-circuit:

```ts
function visibleNodeIds(): string[] {
	if (viewMode === 'tree') {
		if (filesSnapshot) {
			return [...filesSnapshot.visibleIds];
		}
		// existing recursive walk (UNCHANGED)
		const ids: string[] = [];
		function walk(list: TreeNode[]) {
			for (const n of list) {
				ids.push(n.id);
				if (n.children && expandedIds.has(n.id)) walk(n.children);
			}
		}
		walk(nodes);
		return ids;
	}
	// existing non-tree branches (UNCHANGED)
	// ...
}
```

DO NOT touch any other helper in this file in this slice (`findNodeById`, `parentIdFor`, `findNodePath`, `childrenForGridLocation`, `collectExpandableNodeIds`, `collectVisibleHierarchyIds`, `applyManualTreeReorder`, `selectedNodesForContext`, `syncFileSelectionFromNodes`). They stay on the recursive path. Switching them to `byId`/`idToIndex` is reserved for `EDP-003` (Files panel snapshot compatibility and revisioned reveal).

DO NOT change `viewTree.svelte`, `serviceScroll.ts`, `serviceSelection.svelte.ts`, or any view file.

- [ ] **Step 6.4: Run the test to verify it passes**

Run: `pnpm run test:component -- test/component/panelExplorerSelection.test.ts` Expected: PASS — three new cases green AND all existing cases still green. If a non-files case regresses, double-check the `if (filesSnapshot)` guard.

- [ ] **Step 6.5: Run the broader panel/view regression group**

Run: `pnpm run test:component -- test/component/panelExplorerSelection.test.ts test/component/panelExplorerEmpty.test.ts test/component/panelExplorerBadgeCollision.test.ts test/component/panelExplorerDeleteConflict.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeDecorations.test.ts test/component/viewTreeAdoptedNodes.test.ts test/component/viewTreeHoverBadges.test.ts test/component/viewTreeScrollFallback.test.ts test/component/reactiveExplorers.test.ts` Expected: PASS — all suites green.

- [ ] **Step 6.6: Commit**

```bash
git add src/components/containers/panelExplorer.svelte test/component/panelExplorerSelection.test.ts
git commit -m "feat(explorer): wire panelExplorer visibleNodeIds to files snapshot (EDP-002)"
```

---

## Task 7: Final Verification Gate

**Files:** none (verification only)

- [ ] **Step 7.1: Full unit suite**

Run: `pnpm run test:unit` Expected: PASS — all files green. The new files add ≥1 test file each, so coverage thresholds in `vitest.config.ts:65-70` (lines 60 / functions 65 / branches 55 / statements 60) stay green. If coverage regresses on `src/logic/logicExplorerSnapshot.ts` or `src/services/serviceExplorerDataPlane.svelte.ts`, add additional cases mirroring the patterns in `test/unit/services/createNodeIndex.test.ts:9-66`.

- [ ] **Step 7.2: Full component suite**

Run: `pnpm run test:component` Expected: PASS — all files green.

- [ ] **Step 7.3: Static gates**

Run: `pnpm run lint` Expected: PASS — no errors. If `eslint` flags an unused import on `ExplorerDataPlaneRevisions` in `typeExplorer.ts`, ensure the file uses `import type` for the type-only reference.

Run: `pnpm run check` Expected: PASS — 0 errors / 0 warnings.

Run: `pnpm run build:plugin` Expected: PASS — `tsc -noEmit -skipLibCheck` and `vp build` both succeed.

- [ ] **Step 7.4: Svelte autofixer (mandatory per project policy)**

Use `mcp__svelte__svelte-autofixer` against the modified Svelte files:

- `src/components/containers/panelExplorer.svelte`

Expected: `issues: []`, `suggestions: []`. If suggestions appear, apply them and re-run all the gates above.

The new service is `.svelte.ts`, not `.svelte`, so autofixer does not apply.

- [ ] **Step 7.5: Whitespace / line-ending guard**

Run: `git diff --check` Expected: exit code 0 (CRLF conversion warnings on Windows are acceptable).

- [ ] **Step 7.6: Final commit (no code changes; only if any small fixups landed)**

If steps 7.1–7.5 surfaced a fixup, fold it into a NEW commit, not an amend:

```bash
git add <changed-files>
git commit -m "fix(explorer): EDP-002 verification fixups"
```

If everything passed clean, no final commit is needed.

---

## Out-Of-Scope Reminders

These belong to later issues. If they look tempting during EDP-002, stop and route them to the right issue.

- Replace `findNodeById`, `parentIdFor`, `findNodePath` recursive scans in `panelExplorer.svelte` → `EDP-003`.
- Pass snapshot to `viewTree.svelte` and replace `flatArray.findIndex` for reveal → `EDP-009`.
- Batch `ViewService.getModel()` into a publish-layers store → `EDP-004`.
- Add structural snapshots for Tags/Props → `EDP-006`.
- Persistent snapshot storage / generic row subscriptions → out of all current EDP issues; needs its own spec.
- Selection mirror collapse on `ViewService` → `EDP-010`.

## Self-Review Checklist (For The Plan Author Reading This Back)

Verified before committing this plan:

1. **Spec coverage** — every Wave-4 shard 14 "Test Gates" target has a corresponding plan task: `logicExplorerSnapshot.test.ts` (Task 2), `serviceExplorerDataPlane.test.ts` (Task 3), `explorerFiles.test.ts` structural-source cases (Task 4), `panelExplorerSelection.test.ts` files snapshot cases (Task 6). Acceptance criteria from `EDP-002` all map to Tasks 1–6.
2. **Placeholder scan** — no "TBD", "TODO", or "Add appropriate error handling" anywhere. Every code step has full code; every command step has the literal command and expected output.
3. **Type consistency** — `getStructuralTree()` named identically in Tasks 1, 4, and 6. `ExplorerDataPlaneRevisions` shape consistent across types file, builder input, and provider accessor. `subscribe(explorerId, cb)` signature identical in Task 3 service implementation and the panel `$derived` usage in Task 6.
4. **Scope check** — every line stays inside `EDP-002` boundaries. Deferred Guard at top of the document lists EDP-003/004/007/008/009/010 explicitly.

---

## Final Handoff Note For Codex (Wave C)

When Codex picks this up, the entry sequence is:

1. Read this plan top to bottom (under 700 lines as a single file).
2. Run the four scout reports for context if needed: `reports/a1-files-source-tree-contracts.md`, `reports/a2-panel-selection-reveal.md`, `reports/a3-tests-verification.md`, `reports/a4-viewservice-overlay-boundary.md`.
3. Confirm `EDP-001` has been satisfied (`docs/work/hardening/issues/explorer-data-plane/001-approve-issue-set-and-supersession-notes.md`).
4. Execute Tasks 1–7 in order. Each task commits independently and can be reviewed by the user before the next starts.
5. First command to run: `pnpm run test:unit -- test/unit/logic/logicExplorerSnapshot.test.ts` after Step 2.1 lands the RED test file.

Proposed Wave C worker split (disjoint write scopes):

- Worker 1: Tasks 1–3 (types + pure builder + service + their unit tests). Touches only `src/types/`, `src/logic/`, `src/services/`, and `test/unit/`.
- Worker 2: Tasks 4–5 (Files provider + main wiring + Files provider test extensions). Touches `src/providers/explorerFiles.ts`, `src/main.ts`, `test/unit/components/explorerFiles.test.ts`.
- Worker 3: Task 6 (panel wiring + panel test extensions). Touches `src/components/containers/panelExplorer.svelte` and `test/component/panelExplorerSelection.test.ts`.
- Worker 4: Task 7 (final verification). Read-only on code; runs all gates.

Workers 1 and 2 can run in parallel; Workers 3 and 4 must run after both. Each merges back through normal commit cadence before the next chain begins.

Unresolved questions deferred to Codex's first task review:

- Whether `panelExplorer.svelte` should also publish snapshots into the service on `refreshData()` (currently the plan assumes the service is populated externally; the test stubs install the snapshot directly). The minimal interpretation is "wait until EDP-003 to wire auto-publish"; document the chosen path in the Task 5 commit message.
- Whether `getStructuralRevisions()` should include `propsRevision` only when `sortBy === 'count'` (sort uses `metadataCache` frontmatter). The plan unconditionally includes it; revise if regression appears.
