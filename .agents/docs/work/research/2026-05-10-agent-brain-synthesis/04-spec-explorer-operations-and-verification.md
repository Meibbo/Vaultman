---
title: Spec - Explorer Operations And Verification
status: draft
created: 2026-05-09T23:45:00
updated: 2026-05-09T23:45:00
created_by: codex
updated_by: codex
parent: "[[work/research/2026-05-10-agent-brain-synthesis/index|Agent Brain Synthesis]]"
---

# Spec - Explorer Operations And Verification

## Problem

Multiple old triages name explorer, file, grid, queue, and filter regressions.
Some are fixed, but many remain as verification debt. The current codebase has more capabilities than the archived docs assume, so the right next move is not blind reimplementation. It is a verification-led cut.

## Scope

This spec covers cuts 12-15 and the still-valid parts of old file/grid/queue regression records.

## Current Superseded Items

- `showSelectedOnly` exists in current explorer/file surfaces.
- Node grid hierarchy and sorting have current tests.
- FnR services/UI exist, so old "FnR not implemented" notes are stale.
- Read-only table MVP moved to TanStack; older generic table ambitions should not be restored directly.

## Pending Behavior To Verify Or Implement

### Explorer Search And Hierarchy

- Search filters preserve parent reachability/ancestors.
- Search category toggles behave consistently.
- Nested Files hierarchy works with active filters.
- Non-note files have an explicit scope decision.
- Last visible tree node edge case is tested.

### External Metadata Refresh

- Properties and tags views update visible virtual rows after external metadata edits.
- Active filter badges/bubbling update after metadata-driven changes.
- Stale counts do not persist after queue or vault changes.

### Selection And Bulk Actions

- Selected-only isolation works across search/filter changes.
- Select-all variants are clear: all visible, all filtered, all selected scope.
- Master checkbox supports indeterminate state where applicable.
- Queue row focus/filter behavior is stable after bulk operations.

### Grid/Table Operations

- Rename, move, delete, tag, and property operations have parity across file, grid, and table surfaces where the UI presents them.
- Sort arrows, default alpha sort, and sort target controls are verified.
- Column controls do not desync from current view state.

### Queue Contract

- `size` is no longer the old zero-count bug, but `pending` remains a drifted public surface.
- Decide whether `pending` is retired or restored.
- Tests should cover logical operation counts and any visible queue grouping.

## Acceptance Criteria

- A targeted verification plan exists before product edits.
- Tests prove search ancestor preservation, selected-only isolation, queue counts, and active filter badge updates.
- Any unfixed behavior becomes a concrete backlog item with reproduction steps.
- Old regression docs are annotated as `superseded`, `partial`, or `pending` instead of remaining ambiguous.

## Implementation Order

1. Add failing tests for one explorer/search behavior and one queue/count behavior.
2. Fix only the behavior that fails.
3. Repeat for selection and active-filter badge bubbling.
4. Update hardening backlog records with evidence.

## Explicit Non-Goals

- Do not implement Pretext card layout here.
- Do not migrate table editing unless a failing file/grid parity test requires it.
- Do not redesign the explorer visual system during verification.
