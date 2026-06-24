---
title: P112 Closeout — file actions, simple tags, sort labels, 1.1.6 bump
type: implementation-plan
status: active
lifecycle: active
created: 2026-06-20
created_by: claude-sonnet-4-6
tags:
  - vaultman/p112
  - vaultman/plan
  - vaultman/hardening
---

# P112 Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Land the remaining work on `p112-type-view-loop-fix` that GPT-5.5 left uncommitted, add the missing file open context-menu actions, fix simple-tags direct-occurrence logic, add dynamic sort labels, then bump to `1.1.6` stable.

**Architecture:** All work lives in the worktree at `.claude/worktrees/hotfix-1.0.2-css-scorecard`. Zero changes to sandbox or dev. Each task ends in a commit in that worktree. Verify (`pnpm run check` + `pnpm test:unit`) runs after every commit.

**Tech Stack:** TypeScript, Svelte 5, Obsidian plugin API (`app.workspace.getLeaf`, `leaf.openFile`), Vitest source-guard tests.

## Ejecución — Estado actual (2026-06-20, sesión Claude Sonnet 4.6)

| Tarea | Estado | Commit |
|---|---|---|
| **T1** | ✅ DONE | `68c5481` |
| **T2** | ⏭ NEXT | — |
| T3–T6 | pending | — |

**Worktree:** `.claude/worktrees/hotfix-1.0.2-css-scorecard` rama `p112-type-view-loop-fix`

**Fix extra descubierto en T1 (no estaba en el plan original):** El test `pageFiltersSource.test.ts:62` fallaba pre-existente — esperaba `{onOpenFilters}` pasado a `<TabContent>`. Fix: `src/components/pages/pageFilters.svelte` agrega `{onOpenFilters}` al call de `<TabContent>`; `src/components/pages/tabContent.svelte` agrega prop `onOpenFilters?: () => void` y convierte el `<span class="vaultman-content-filter-context">` en `<button>` que llama `onOpenFilters?.()`. Incluido en commit `68c5481`. No requiere acción adicional.

**Próximo agente: empieza en T2.** El plan a continuación está completo para T2–T6.

---

## Global Constraints

- All commands run inside `.claude/worktrees/hotfix-1.0.2-css-scorecard` (referred to as `WT` below).
- Never `git add -A` — always stage specific files.
- LF→CRLF-only snapshot diffs are NOT staged.
- `pnpm run check` must show `0 errors / 0 warnings` before every commit.
- `pnpm test:unit` must be green before every commit.
- No changes to sandbox, dev, or main.

---

## Spec (what to build)

### S-1 Commit pre-coded wave 2+3 (already in diff)
GPT-5.5 left 7 files modified but uncommitted. They contain:
- **Wave 2** (`_getMatchingFolders`): `return []` → `return folders` so empty folders like `calo/create` appear in default nested Files view.
- **Wave 3** (folder create actions): `folder.new_note`, `folder.new_folder`, `folder.new_canvas`, `folder.new_base`, `folder.make_copy` registered via `contextMenuService`; `separatorBefore: true` on `folder.filter_exclude`; private helpers `_createFileInFolder`, `_createFolderInFolder`, `_copyFolder`, `_ensureFolderExists`, `_parentPath`, `_joinPath`; `_uniquePath` fixed to handle any extension.

### S-2 Dead code cleanup
`src/components/layout/tabContent.svelte` and `src/components/containers/panelContent.svelte` are orphaned (the active code path uses `src/components/pages/tabContent.svelte`). Safe to delete.

### S-3 File open context-menu actions
Vaultman file context menu only has `rename`, `delete`, `move`. Missing: open in new tab, open to the right, open in new window. These should be registered via `contextMenuService` for `nodeTypes: ['file']`, `surfaces: ['panel']`.

API pattern (confirmed in `src/main.ts:346-347`):
```typescript
const leaf = this.plugin.app.workspace.getLeaf('tab');
await leaf.openFile(file, { active: true });
```

### S-4 Dynamic sort-popup labels
`popupSort.svelte` shows a static `aria-label` on the vert-col toggle button:
- Props tab: always `'sort.vertcol.props_values'` = "Toggle Props / Values"
- Tags tab: always `'sort.vertcol.node_level'` = "Toggle node level"

Desired: show which axis is currently active:
- Props, `vertTopActive=false` → "Sort Props"
- Props, `vertTopActive=true`  → "Sort Values"
- Tags,  `vertTopActive=false` → "Sort root"
- Tags,  `vertTopActive=true`  → "Sort nested"

### S-5 Simple tags fix — parents with direct occurrences
`groupRootHierarchy(nodes, 'simple')` in `src/logic/logicExplorerHierarchy.ts` currently returns only leaf nodes (`children?.length === 0`). Desired: also include parent nodes where `node.count > 0` (the tag is used directly, not only as a prefix). In simple mode, returned parent nodes appear WITHOUT their children (shown as leaves).

Example: `#type` used 5× directly AND having child `#type/journal` → appears in simple mode with `children: []`.

### S-6 Version bump to 1.1.6
Bump `manifest.json`, `package.json`, `versions.json` to `1.1.6`. Commit.

---

## File Map

| File | Task | Action |
|---|---|---|
| `src/components/containers/explorerFiles.ts` | S-1 (already in diff), S-3 | modify |
| `src/types/typeCMenu.ts` | S-1 (already in diff) | modify |
| `src/services/serviceContextMenu.ts` | S-1 (already in diff) | modify |
| `src/i18n/en.ts` | S-1 (already in diff), S-3, S-4 | modify |
| `src/i18n/es.ts` | S-1 (already in diff), S-3, S-4 | modify |
| `test/unit/explorerFilesSource.test.ts` | S-1 (already in diff), S-3 | modify |
| `test/unit/contextMenuSource.test.ts` | S-1 (already in diff) | modify |
| `src/components/layout/tabContent.svelte` | S-2 | delete |
| `src/components/containers/panelContent.svelte` | S-2 | delete |
| `src/logic/logicExplorerHierarchy.ts` | S-5 | modify |
| `test/unit/explorerHierarchy.test.ts` | S-5 | modify |
| `src/components/layout/popupSort.svelte` | S-4 | modify |
| `test/unit/sortUiSource.test.ts` | S-4 | modify |
| `manifest.json` | S-6 | modify |
| `package.json` | S-6 | modify |
| `versions.json` | S-6 | modify |

---

## Task 1: Verify + commit pre-coded wave 2+3

**Files:** 7 already-modified files in the worktree diff.

- [ ] **Step 1: Verify check passes**

```
cd "C:/Users/vic_A/Desktop/vaultman/.claude/worktrees/hotfix-1.0.2-css-scorecard"
pnpm run check
```
Expected: `Found 0 errors and 0 warnings`

- [ ] **Step 2: Verify unit tests pass**

```
pnpm test:unit
```
Expected: all green (same count as before, ≥130 tests).

- [ ] **Step 3: Stage files and commit**

```
cd "C:/Users/vic_A/Desktop/vaultman/.claude/worktrees/hotfix-1.0.2-css-scorecard"
git add src/components/containers/explorerFiles.ts
git add src/types/typeCMenu.ts
git add src/services/serviceContextMenu.ts
git add src/i18n/en.ts
git add src/i18n/es.ts
git add test/unit/explorerFilesSource.test.ts
git add test/unit/contextMenuSource.test.ts
git commit -m "fix(files): expose empty folders and add folder create/copy context actions"
```

---

## Task 2: Remove orphaned content-tab components

**Files:**
- Delete: `src/components/layout/tabContent.svelte`
- Delete: `src/components/containers/panelContent.svelte`

- [ ] **Step 1: Confirm no live import of the old layout version**

```
grep -rn "layout/tabContent\|containers/panelContent" src/
```
Expected: one line — `layout/tabContent.svelte:4: import ContentOpsComponent from '../containers/panelContent.svelte';`. Nothing from `pages/`.

- [ ] **Step 2: Delete files**

```
rm src/components/layout/tabContent.svelte
rm src/components/containers/panelContent.svelte
```

- [ ] **Step 3: Verify check still passes**

```
pnpm run check
```
Expected: `Found 0 errors and 0 warnings`

- [ ] **Step 4: Commit**

```
git add -u src/components/layout/tabContent.svelte
git add -u src/components/containers/panelContent.svelte
git commit -m "chore: remove orphaned layout/tabContent and containers/panelContent"
```

---

## Task 3: File open context-menu actions

**Files:**
- Modify: `src/components/containers/explorerFiles.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`
- Modify: `test/unit/explorerFilesSource.test.ts`

- [ ] **Step 1: Write the failing test**

In `test/unit/explorerFilesSource.test.ts`, add after the last `it(...)`:

```typescript
it('exposes file open-mode actions for new tab, split-right, and new window', () => {
    expect(explorerFilesSource).toContain("id: 'file.open_tab'");
    expect(explorerFilesSource).toContain("id: 'file.open_right'");
    expect(explorerFilesSource).toContain("id: 'file.open_window'");
    expect(explorerFilesSource).toContain("workspace.getLeaf('tab')");
    expect(explorerFilesSource).toContain("workspace.getLeaf('split', 'vertical')");
    expect(explorerFilesSource).toContain('workspace.openPopoutLeaf()');
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
pnpm test:unit -- explorerFilesSource
```
Expected: FAIL — `AssertionError: expected string to include "id: 'file.open_tab'"`

- [ ] **Step 3: Add i18n strings**

In `src/i18n/en.ts`, after the line `'file.ctx.open_tab': ...` does not exist yet — find a logical position (near other `file.ctx.*` keys or top of file section). Add:

```typescript
'file.ctx.open_tab': 'Open in new tab',
'file.ctx.open_right': 'Open to the right',
'file.ctx.open_window': 'Open in new window',
```

In `src/i18n/es.ts`, add:

```typescript
'file.ctx.open_tab': 'Abrir en pestaña nueva',
'file.ctx.open_right': 'Abrir a la derecha',
'file.ctx.open_window': 'Abrir en ventana nueva',
```

- [ ] **Step 4: Register file open actions in `explorerFiles.ts`**

In `src/components/containers/explorerFiles.ts`, inside `onload()`, **before** the `file.rename` action (line ~91), add:

```typescript
svc.registerAction({
    id: 'file.open_tab',
    nodeTypes: ['file'],
    surfaces: ['panel'],
    label: translate('file.ctx.open_tab'),
    icon: 'lucide-panel-top',
    run: async (ctx: MenuCtx) => {
        const meta = ctx.node.meta as FileMeta;
        if (!meta.file) return;
        const leaf = this.plugin.app.workspace.getLeaf('tab');
        await leaf.openFile(meta.file, { active: true });
    },
});

svc.registerAction({
    id: 'file.open_right',
    nodeTypes: ['file'],
    surfaces: ['panel'],
    label: translate('file.ctx.open_right'),
    icon: 'lucide-panel-right',
    run: async (ctx: MenuCtx) => {
        const meta = ctx.node.meta as FileMeta;
        if (!meta.file) return;
        const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
        await leaf.openFile(meta.file, { active: true });
    },
});

svc.registerAction({
    id: 'file.open_window',
    nodeTypes: ['file'],
    surfaces: ['panel'],
    label: translate('file.ctx.open_window'),
    icon: 'lucide-app-window',
    run: async (ctx: MenuCtx) => {
        const meta = ctx.node.meta as FileMeta;
        if (!meta.file) return;
        const leaf = this.plugin.app.workspace.openPopoutLeaf();
        await leaf.openFile(meta.file, { active: true });
    },
});
```

- [ ] **Step 5: Run check**

```
pnpm run check
```
Expected: `0 errors / 0 warnings`

If `openPopoutLeaf` is not found in the `@types/obsidian` types, cast:
```typescript
const leaf = (this.plugin.app.workspace as any).openPopoutLeaf() as WorkspaceLeaf;
```

- [ ] **Step 6: Run the focal test**

```
pnpm test:unit -- explorerFilesSource
```
Expected: PASS

- [ ] **Step 7: Run full unit suite**

```
pnpm test:unit
```
Expected: all green.

- [ ] **Step 8: Commit**

```
git add src/components/containers/explorerFiles.ts
git add src/i18n/en.ts
git add src/i18n/es.ts
git add test/unit/explorerFilesSource.test.ts
git commit -m "feat(cmenu): add file open-mode actions (tab, split-right, window)"
```

---

## Task 4: Dynamic sort-popup labels

**Files:**
- Modify: `src/components/layout/popupSort.svelte`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`
- Modify: `test/unit/sortUiSource.test.ts`

- [ ] **Step 1: Write the failing test**

In `test/unit/sortUiSource.test.ts`, add after the last `it(...)`:

```typescript
it('shows dynamic sort-axis labels on the Props and Tags vert-col toggle', () => {
    expect(popupSource).toContain("translate('sort.vertcol.by_props')");
    expect(popupSource).toContain("translate('sort.vertcol.by_values')");
    expect(popupSource).toContain("translate('sort.vertcol.by_root')");
    expect(popupSource).toContain("translate('sort.vertcol.by_nested')");
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
pnpm test:unit -- sortUiSource
```
Expected: FAIL

- [ ] **Step 3: Add i18n keys**

In `src/i18n/en.ts`, near the existing `sort.vertcol.*` keys (around line 588), add:

```typescript
'sort.vertcol.by_props': 'Sort Props',
'sort.vertcol.by_values': 'Sort Values',
'sort.vertcol.by_root': 'Sort root',
'sort.vertcol.by_nested': 'Sort nested',
```

In `src/i18n/es.ts`, add at the equivalent position:

```typescript
'sort.vertcol.by_props': 'Ordenar propiedades',
'sort.vertcol.by_values': 'Ordenar valores',
'sort.vertcol.by_root': 'Ordenar raíz',
'sort.vertcol.by_nested': 'Ordenar anidados',
```

- [ ] **Step 4: Update `popupSort.svelte` vert-col top button aria-label**

In `src/components/layout/popupSort.svelte`, find the top vert-col button (around line 238):

```svelte
aria-label={activeTab === 'props'
    ? translate('sort.vertcol.props_values')
    : translate('sort.vertcol.node_level')}
```

Replace with:

```svelte
aria-label={activeTab === 'props'
    ? (vertTopActive
        ? translate('sort.vertcol.by_values')
        : translate('sort.vertcol.by_props'))
    : (vertTopActive
        ? translate('sort.vertcol.by_nested')
        : translate('sort.vertcol.by_root'))}
```

- [ ] **Step 5: Run check**

```
pnpm run check
```
Expected: `0 errors / 0 warnings`

- [ ] **Step 6: Run focal test**

```
pnpm test:unit -- sortUiSource
```
Expected: PASS (all 4 tests green)

- [ ] **Step 7: Run full unit suite**

```
pnpm test:unit
```
Expected: all green.

- [ ] **Step 8: Commit**

```
git add src/components/layout/popupSort.svelte
git add src/i18n/en.ts
git add src/i18n/es.ts
git add test/unit/sortUiSource.test.ts
git commit -m "feat(sort): show active sort-axis label on Props and Tags vert-col toggle"
```

---

## Task 5: Simple tags — include parents with direct occurrences

**Files:**
- Modify: `src/logic/logicExplorerHierarchy.ts`
- Modify: `test/unit/explorerHierarchy.test.ts`

### Context (do NOT skip)

`logicTags.ts` builds the tag tree. When it processes tag entries from Obsidian's `getTags()` map, a parent path gets `count = 0` unless that exact path also appears in the map. Example:
- `#type` used 5× → `count: 5` on the `type` node
- `#type/journal` used 3× → `count: 3` on `type/journal`, `type` node gets `count` ADDED to at line 94-95 IF `#type` was already in the map

In simple mode we should show a tag if it has no children OR if it has direct uses (`count > 0`). In the returned result, always strip children (simple = flat view).

Current broken code:
```typescript
const wantsNested = group === 'nested';
return nodes
    .filter((node) => Boolean(node.children?.length) === wantsNested)
    .map(...)
```
For `simple`: `wantsNested = false`, filter keeps only nodes where `children?.length` is falsy → leaves only.

- [ ] **Step 1: Write the failing test**

In `test/unit/explorerHierarchy.test.ts`, add a helper inside the `describe` block and a new `it`:

```typescript
function tagNode(
    id: string,
    count: number,
    children: TreeNode[] = [],
): TreeNode {
    return { id, label: id, count, children, depth: 0, meta: { id } };
}

it('includes parent tags with direct occurrences in simple mode, stripping their children', () => {
    const tree = [
        tagNode('daily', 2),
        tagNode('type', 5, [tagNode('type/journal', 3)]),
        tagNode('status', 0, [tagNode('status/done', 1)]),
    ];

    const simple = groupRootHierarchy(tree, 'simple');

    expect(simple.map((n) => n.id)).toEqual(['daily', 'type']);
    expect(simple.find((n) => n.id === 'type')?.children).toEqual([]);
    expect(simple.find((n) => n.id === 'status')).toBeUndefined();
});
```

- [ ] **Step 2: Run test to confirm it fails**

```
pnpm test:unit -- explorerHierarchy
```
Expected: FAIL — `expected [ 'daily' ] to equal [ 'daily', 'type' ]`

- [ ] **Step 3: Fix `groupRootHierarchy` in `logicExplorerHierarchy.ts`**

Replace the current body with:

```typescript
export function groupRootHierarchy<TMeta>(
    nodes: TreeNode<TMeta>[],
    group: RootHierarchyGroup,
): TreeNode<TMeta>[] {
    if (group === 'all') return cloneTree(nodes);
    if (group === 'nested') {
        return nodes
            .filter((node) => Boolean(node.children?.length))
            .map((node) => ({
                ...node,
                children: node.children ? cloneTree(node.children) : [],
            }));
    }
    // simple: keep leaves + parents that have direct occurrences (count > 0)
    return nodes
        .filter((node) => !node.children?.length || (node.count ?? 0) > 0)
        .map((node) => ({ ...node, children: [] }));
}
```

- [ ] **Step 4: Run focal tests**

```
pnpm test:unit -- explorerHierarchy
```
Expected: PASS (both existing tests + new test green)

Note: existing test uses `node()` helper without `count`, so `count` is `undefined` → `(undefined ?? 0) > 0` = false → parent-only nodes without count still excluded. Confirm existing assertions still pass.

- [ ] **Step 5: Run full unit suite**

```
pnpm test:unit
```
Expected: all green.

- [ ] **Step 6: Run check**

```
pnpm run check
```
Expected: `0 errors / 0 warnings`

- [ ] **Step 7: Commit**

```
git add src/logic/logicExplorerHierarchy.ts
git add test/unit/explorerHierarchy.test.ts
git commit -m "fix(tags): show parent tags with direct occurrences in simple mode"
```

---

## Task 6: Version bump to 1.1.6

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `versions.json`

- [ ] **Step 1: Run pnpm version**

```
cd "C:/Users/vic_A/Desktop/vaultman/.claude/worktrees/hotfix-1.0.2-css-scorecard"
pnpm version 1.1.6 --no-git-tag-version
```

This triggers the `"version"` lifecycle script in package.json (`node version-bump.mjs && git add manifest.json versions.json`), which updates `manifest.json` + `versions.json` and stages them. It also updates `package.json`.

- [ ] **Step 2: Verify manifest.json and versions.json**

```
grep '"version"' manifest.json package.json
grep '1.1.6' versions.json
```
Expected: `"version": "1.1.6"` in manifest and package, `"1.1.6": "1.12.0"` in versions.json.

- [ ] **Step 3: Run full verify**

```
pnpm run check
pnpm test:unit
```
Expected: all green.

- [ ] **Step 4: Commit**

```
git add manifest.json package.json versions.json
git commit -m "chore(release): prepare 1.1.6"
```

---

## Release Instructions (post-plan)

After all 6 tasks pass:

1. **PR from `p112-type-view-loop-fix` → `main`** (or whichever stable integration branch is used — see AGENTS.md/handoff for policy).
2. **Review checklist before PR:**
   - `pnpm run verify` (full: check + lint + test + build) green
   - `pnpm run security:audit` exit 0 for high+
   - DOM smoke: `obsidian vault=plugin-dev` — confirm folder right-click shows New note/folder/canvas/base, Make a copy, separator; file right-click shows Open in new tab / to the right / in new window; simple tag `#type` with direct use appears in Simple mode; sort popup vert-col shows "Sort Props"/"Sort Values" dynamically.
3. **On merge to main:** push tag `1.1.6` (bare, no `v` prefix per release.yml convention). CI `release.yml` triggers automatically.

---

## Changelog Candidate

### New
- Folder context menu: **New note**, **New folder**, **New canvas**, **New base** — creates the respective file type inside the right-clicked folder, opens it, and expands the tree to reveal it.
- Folder context menu: **Make a copy** — duplicates the folder and all its contents with a `copy` suffix.
- File context menu: **Open in new tab**, **Open to the right**, **Open in new window**.
- Sort popup now shows the active sort axis: **Sort Props** / **Sort Values** (Properties view) and **Sort root** / **Sort nested** (Tags view).

### Implemented
- Empty folders (e.g. `calo/create`) now appear in the default nested Files tree when no folder-search term is active.
- Files context-menu filter actions now have a visual separator between **Filter to this folder** and **Exclude this folder**.
- File path deduplication (`_uniquePath`) now handles any extension, not only `.md`.

### No longer broken
- Tags with direct occurrences (e.g. `#type` used both directly and as a prefix for `#type/journal`) now appear correctly in **Simple tags** mode.
- **Clear filters** resets content search input, replace field, preview results, and regex error state.
- Content search result headers show **"with active filters"** when non-content filters are active, so the file scope is clear.
