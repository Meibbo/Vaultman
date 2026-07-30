---
title: Spec - Polish And Surface UX
status: draft
created: 2026-05-09T23:45:00
updated: 2026-05-09T23:45:00
created_by: codex
updated_by: codex
parent: "[[work/research/2026-05-10-agent-brain-synthesis/index|Agent Brain Synthesis]]"
---

# Spec - Polish And Surface UX

## Problem

Archived UX plans contain a mix of already-fixed visuals, current polish requirements, and product ideas that should wait until v1 polish. The current codebase now has badges, command surfaces, overlay services, TanStack table, and an active Pretext card plan, so UX work must be routed by current surfaces.

## Scope

This spec maps cuts 10, 11, 16, 17, 20, 21, 22, and 23 onto current code.

## Active Or Pending UX Items

### View Size Control

Status: `pending`.

Expose or verify a user-facing view-size control. It should connect to current view sizing services rather than inventing local per-view state.

### Cursor Affordance And Hover Cost

Status: `pending`.

Cursor affordance remains named in hardening docs. Hover work must stay cheap and should not trigger layout-heavy recomputation in virtual views.

### Rename Surface

Status: `pending`.

Old docs oscillate between inline rename and in-frame rename. Current spec should decide one product path:

- inline only where the current view already owns row/cell editing; or
- in-frame modal/surface for consistency with queue and command flows.

Do not implement both unless a clear user workflow requires both.

### Overlay And Menu Behavior

Status: `pending`.

Verify popup/overlay behavior across menus, modals, queue details, and mobile widths. Current overlay service exists, so the work is consistency and tests, not invention.

### Navbar And Workspace Polish

Status: `pending`.

Archived nav, workspace strip, command center, sidebar/mobile, and bottom-bar ideas should be translated into one coherent workspace spec before UI edits.

### Table Density And Editing

Status: `partial`.

Read-only TanStack table MVP is done. Editable matrix, copy/paste, range selection, persisted column layout, resizing/reordering, summaries, and formulas are pending polish work.

### Theme Variants

Status: `pending`.

Theme work should follow current styling research: targeted tokens/primitives, not broad palette rewrites. Avoid one-note palette changes and preserve dense operational UI.

### Pretext Cards

Status: `active`, owned elsewhere.

Field visibility and text measurement are present in dirty worktree. Card layout and UI integration are still pending/in-flight. This spec should defer to the active Pretext plan and not duplicate edits.

## Superseded UX Items

- FAB accent and basic badge visibility gaps are fixed or superseded by current multi-facet badges.
- Old "coming soon everywhere" plans should be replaced by explicit disabled states only where the user can reach a nonfunctional surface.
- Broad SCSS mega-refactors are superseded by targeted current-code styling specs.

## Acceptance Criteria

- Each UX cut has a current owner surface: service, view, modal, navbar, table, or Pretext plan.
- Cursor/hover changes have a cheapness check or test.
- Overlay/menu behavior is verified at desktop and narrow widths.
- Table polish is separated from Pretext card layout.
- Superseded visual tasks are marked in source backlog docs instead of carried forward as open work.
