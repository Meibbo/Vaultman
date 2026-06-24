---
title: Thread 3 - VFS & Review UX
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|index]]"
created: 2026-05-11
tags:
  - agent/plan
  - logic/vfs
  - ui/diff
---

# Thread 3: VFS & Review UX

## 1. Goal
Implement Spec 12: Refactor the Virtual File System (VFS) to use snapshots (structural immutability) and build an interactive Diff Review Navbar (Cursor-style).

## 2. Dependencies
- Gate: Spec 12 exists and is consumed.
- Shard ALPHA: Theme tokens for Faint Mode colors.

## 3. Tasks

### 3.1. VFS Immutability Refactor
- [ ] Refactor `VirtualFileState` to treat `fm` and `body` as snapshots.
- [ ] Refactor `StagedOp.apply` to return a new `VirtualFileState` instead of mutating the existing one.
- [ ] Implement `applyVfsChain(ops)` helper in `OperationQueueService` to compute the final state from a sequence of snapshots.

### 3.2. Staging & Acceptance Map
- [ ] Add `reviewStatus = new SvelteMap<string, 'pending' | 'accepted' | 'discarded'>()` to `OperationQueueService`.
- [ ] Update `execute()` and `commitFile()` to skip operations marked as `'discarded'`.

### 3.3. Interactive Diff Navbar
- [ ] Implement `ViewDiffNavbar.svelte` using Bits UI.
- [ ] Add buttons: "Keep [Op]", "Discard [Op]", and navigation arrows.
- [ ] Integrate navbar into `viewDiff.svelte`.

### 3.4. Navigation & Foul Detection
- [ ] Implement `Alt + Down / Up` to jump between `BodyHunk` headers in the diff.
- [ ] Implement pre-commit check: compare `vfs.hydrationMtime` with current `file.stat.mtime`.
- [ ] Show "Cache Outdated" notice if discrepancy found.

## 4. Verification
- [ ] Unit test: VFS snapshots remain consistent after operation removal.
- [ ] Component test: Navbar triggers status change in `reviewStatus` map.
- [ ] Integration test: Discarded operations are NOT written to disk during `execute()`.
