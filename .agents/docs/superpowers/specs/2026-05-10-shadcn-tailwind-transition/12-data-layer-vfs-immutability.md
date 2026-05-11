---
title: Spec 12 - Interactive Diff Review & Robust VFS (Structural Immutability)
type: expansion-spec
parent: "[[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index|index]]"
created: 2026-05-11
tags:
  - architecture/vfs
  - immutability
  - diff-review
  - cursor-like
---

# Spec 12: Interactive Diff Review & Robust VFS

## 1. Problem

The current `VirtualFileState` is mutable. `StagedOp.apply(vfs)` writes in
place. `serviceDiff.buildOperationDiff` clones the state, replays prior ops,
then mutates the clone. That is correct today but fragile: any new caller that
forgets to clone can corrupt the head state.

As Vaultman adds a Cursor-like Diff Navbar that lets users walk snapshots by
operation, by file, and by snapshot index, history traversal must not mutate
the current head.

## 2. Goal

Migrate the VFS to structural immutability via op-replay snapshots.

Each immutable staged op returns a new state. The queue stores a chain of
states per file. The navbar queries snapshots by index. Old mutable code paths
are removed only after the strangler path is green and protected by an ESLint
rule.

## 3. Contracts

- `ImmutableVirtualFileState` is readonly at the type boundary.
- `ImmutableStagedOp.apply(vfs)` returns a new
  `ImmutableVirtualFileState`.
- `VfsChain` per file contains an initial state, immutable snapshots, and a
  head snapshot.
- `snapshots[i]` is the state after applying `ops[0..=i]`.
- The Diff Navbar walks snapshot indices and produces file diffs by comparing
  `snapshots[i-1]` to `snapshots[i]`.
- Existing mutable `VirtualFileState` remains available until the final
  cutover task.

## 4. Migration Strategy

Use a parallel strangler:

1. Introduce immutable types beside the mutable VFS.
2. Introduce `VfsChain` beside the queue transaction map.
3. Adapt diff review to consume immutable snapshots.
4. Convert queue operations one file at a time.
5. Cut over `serviceQueue.svelte.ts` last.
6. Delete legacy mutable signatures and add an ESLint rule banning direct
   field assignment on `VirtualFileState`.

## 5. UX: Cursor-Like Diff Navbar

- Top: file selector pills, one per changed file.
- Center: unified or side-by-side diff using the existing diff body where
  possible and `@git-diff-view/svelte` where the richer view is needed.
- Footer: snapshot timeline with operation summaries.
- Clicking an operation jumps to that snapshot index.
- Keyboard navigation:
  - `Alt+]`: next change.
  - `Alt+[`: previous change.
  - `Ctrl+Alt+]`: next file.
  - `Ctrl+Alt+[`: previous file.
- Modal hosting uses the T4 portal resolver so pop-out windows render into
  the active `.vm-root`.

## 6. Notes For Nodes Interaction

Notes for nodes (`#`, `$`, `%`, `[`) are created through operations that pass
through the chain. Alias logic stays canonical in `serviceNodeBinding.ts`.
The navbar groups these operations under "Linked notes" in the snapshot
timeline.

## 7. Acceptance

- All `serviceQueue` tests pass with the new chain semantics.
- A scripted operation sequence such as move, set-frontmatter, set-body
  produces `N+1` snapshots for `N` operations.
- `snapshots[i-1]` and `snapshots[i]` differ only by operation `i`.
- The ESLint rule fires on direct mutation patterns such as `vfs.fm = ...`
  and `vfs.ops.push(...)`.
- The Diff Navbar renders within the current frame and survives a pop-out
  window without losing its portal target.
