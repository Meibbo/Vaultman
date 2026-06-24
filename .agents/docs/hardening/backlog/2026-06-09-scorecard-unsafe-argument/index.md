---
title: Scorecard unsafe argument warning in Files DnD
type: backlog-item
status: completed
lifecycle: archived
parent: "[[docs/work/hardening/index|Hardening]]"
created: 2026-06-09T21:25:00
updated: 2026-06-13T18:02:00
tags:
  - agent/backlog
  - initiative/hardening
  - release/post-1.1.1
  - scorecard
  - typescript
  - explorer/files
labels:
  - completed
  - scorecard-warning
  - small
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Scorecard Unsafe Argument Warning In Files DnD

## Source

Obsidian Scorecard reported one remaining warning after the stable `1.1.1` release:

- **Warning:** Passes unsafe values into typed parameters
- **Rule:** `@typescript-eslint/no-unsafe-argument`
- **Location:** `src/components/containers/explorerFiles.ts:784`

Relevant code at release commit `33d9d23`:

```ts
const nodes = this._dragNodes(payload).filter(
  (node) => node.kind === 'file' || node.kind === 'folder',
);

for (const node of nodes) {
  const source = this.plugin.app.vault.getAbstractFileByPath(node.path);
  // ...
}
```

## Triage

This is a valid hardening item, not an urgent release blocker.

The local TypeScript gate passes, but Scorecard's stricter analysis sees `node.path`
as insufficiently refined before it is passed to Obsidian's typed
`getAbstractFileByPath(path: string)` API.

The immediate local cause is that `_moveDraggedNodesIntoFolder()` uses an inline
boolean `.filter()` instead of the existing `_fileDragNodes()` helper. That helper
already returns:

```ts
Array<Extract<VaultmanDragNodePayload, { kind: 'file' | 'folder' }>>
```

## Recommended Patch

Replace the inline filter in `_moveDraggedNodesIntoFolder()` with the existing
typed helper:

```ts
const nodes = this._fileDragNodes(payload);
```

If Scorecard still flags the call, add a tiny named type predicate such as
`isFileDragNodePayload()` in the drag payload module and reuse it from both
`_fileDragNodes()` and this move path.

Do not silence the rule with `as string` or an eslint disable comment unless a
typed guard has first been proven insufficient.

## Acceptance

- `pnpm run lint` passes with no `@typescript-eslint/no-unsafe-argument` warning.
- `pnpm run verify` passes.
- Obsidian Scorecard no longer reports the unsafe typed-parameter warning at
  `src/components/containers/explorerFiles.ts:784`.
- Existing Files internal DnD behavior still works:
  - file into folder;
  - folder into folder;
  - file/folder back to vault root;
  - self/descendant folder moves remain guarded.

## Suggested Test Guard

Add or extend a source-level unit guard around `explorerFiles.ts` so
`_moveDraggedNodesIntoFolder()` uses `_fileDragNodes(payload)` rather than a local
boolean filter that widens back to `VaultmanDragNodePayload[]`.

## Resolution - 2026-06-13

Implemented in product worktree `hotfix-1.0.2-css-scorecard` on branch `dev`:

- commit `b92fd98 fix(scorecard): narrow file drag payloads`;
- `_moveDraggedNodesIntoFolder()` now uses `this._fileDragNodes(payload)`;
- `test/unit/explorerFilesSource.test.ts` now guards that the move path uses the typed helper before calling `getAbstractFileByPath(node.path)`.

Verification:

- focused guard: `corepack pnpm exec vitest run --config vitest.unit.config.mts test/unit/explorerFilesSource.test.ts` passed (`1` file / `6` tests);
- `corepack pnpm run lint` passed;
- `corepack pnpm run verify` passed (`51` unit files / `197` tests; Scorecard regression scan `17` checks);
- `corepack pnpm run build` passed and synced to `plugin-dev`.

Runtime note:

- `obsidian vault=plugin-dev plugin:reload id=vaultman` and `obsidian vault=plugin-dev dev:errors` returned `Command not found`; the Obsidian CLI dev bridge was unavailable in this instance, so runtime reload/error smoke was not completed.
