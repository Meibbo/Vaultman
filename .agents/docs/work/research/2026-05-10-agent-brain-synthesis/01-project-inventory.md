---
title: Agent Brain Project Inventory
status: active
created: 2026-05-09T23:45:00
updated: 2026-05-09T23:45:00
created_by: codex
updated_by: codex
parent: "[[work/research/2026-05-10-agent-brain-synthesis/index|Agent Brain Synthesis]]"
---

# Agent Brain Project Inventory

## Active Project Families

### PKM-AI Agent System

Status: `done` as a routing/documentation system, `active` as policy.

The branch has a bootloader, current status/handoff, mode routing, doc policies, backlog policy, and vault workflow rules. These fundamentals still apply: preserve detail, shard long records, keep current docs as indexes, and do not move AI files to `main`.

Current application: use this record as a source record, not as compressed current-doc content.

### Hardening Master And V1 Scope

Status: `partial`.

The archived hardening master drove test coverage, Svelte 5 service cleanup, index contracts, queue behavior, UI parity, and Obsidian lifecycle discipline.
Much landed across the codebase: typed contracts exist, many views exist, tests exist, and current status marks multiple hardening/performance lanes as closed.

Still valid: release-blocking verification and v1 polish backlogs were never fully exhausted. See [[work/research/2026-05-10-agent-brain-synthesis/02-pending-ledger]].

### V1 Scope Audit And Backlog Cut Ladder

Status: `active`.

The active hardening backlog keeps the most concrete remaining list. Cuts 10-18 are verification and regression-hardening work. Cuts 19-24 are v1 Polish. Cut 25 is post-rc.1 holding.

Current application: treat the cut ladder as the priority source unless a newer user plan explicitly overrides it.

### Performance And CodeQL Guardrails

Status: `partial`.

Current work has performance docs and CodeQL guardrail files in the dirty worktree. Earlier performance issues such as generic >1000-node rendering and tree rerenders are mostly superseded by later implementations and tests.

Still valid: full-vault render cost, inactive frame/page cost, expensive hover work, metadata-refresh behavior, and unsafe dynamic-code/path checks remain worth verifying before release.

### Node Notes Lane

Status: `done`, with one conditional pending item.

NN-0 through NN-4 are documented as done. NN-5 is a harness spike only if future changes need it.

Current application: do not reopen Node Notes unless a regression or missing test gives a specific reason.

### Polish - TanStack Node Table

Status: `active/done` for read-only MVP, `pending` for deferred spreadsheet features.

The read-only TanStack table was delivered. Deferred items remain: inline cell edit, copy/paste, rectangular range selection, persisted column layout, resizing/reordering, and Bases summaries/formulas.

Current application: table polish should build on the current table rather than revive the older generic grid plan.

### Polish - Pretext Grid Cards

Status: `active`, currently owned by another agent.

The accepted Pretext plan split field visibility, text measurement, and card layout. Current dirty worktree already contains field visibility and text measurement services/tests. Task 3 card layout and UI integration remain pending/in-flight.

Current application: do not duplicate or revert the other agent's Pretext changes. Treat them as in-progress external work.

### Research - Codebase Recognition And Vertical Analysis

Status: `active research`, not implementation approval.

Research captures the current design direction: shadcn/Tailwind-compatible primitives, service-based Svelte 5 state, virtualized views, overlays/portals, mouse/keyboard command infrastructure, and badge/filter surfaces.

Current application: use these as constraints for future specs, not as a blanket mandate to restyle the product.

## Archived Project Families

### 2026-04-28 V1.0 Scope Triage

Status: `historical`, with many still-valid pending items.

The triage categorized old backlog into `in-hardening`, `adjacent`, `out-hardening`, `already-fixed`, `cancelled`, and `post-rc.1`. The durable vision was Vaultman as a supervised bulk-ops harness for AI agents.

Current application: old `out-hardening` means successor v1 Polish unless explicitly cancelled, already fixed, or post-rc.1.

### Agent Memory Roadmap

Status: `partial`.

Several roadmap items are now done or superseded: stats dashboard, popups, ContextMenuService decisions, FAB/badges, filter badges, and parts of FnR.

Still pending: Search plugin augmentation, tag merge/bulk tag operations in queue, all-tree-node DnD, deeper keyboard/multi-select verification, health check for broken frontmatter/duplicates, central variable/settings surfaces, native context menu injection follow-through, sidebar tab editor/mobile work, and bottom-bar replacement.

### Public Lifecycle Specs

Status: `pending`.

Archived specs proposed service registry lifecycle and Svelte event leak prevention. Current code still uses functional index factories and manual metadataCache subscription inside `frameVaultman.svelte`.

Current application: see [[work/research/2026-05-10-agent-brain-synthesis/03-spec-lifecycle-and-indexing]].

### SCSS And Public Lifecycle Archive

Status: `partial/superseded`.

The styling direction is now more constrained by the current app, shadcn research, and existing SCSS/Tailwind mix. Broad SCSS mega-refactors should be treated as superseded unless they map to concrete current styling debt.

Current application: prefer targeted primitives/tokens migration over broad thematic rewrites.

## Superseded Buckets

- `dropDy` displacement and too-small toggle/drawer button fixes are cancelled.
- Generic >1000-node performance bugs are mostly superseded by newer virtual view work; keep only current full-vault measurements.
- Legacy grid-provider tree-node expansion plans are superseded by current node grid hierarchy and TanStack table direction.
- FnR "not implemented" notes are superseded where current FnR services/UI now exist; only missing integration details remain.
- Old visual badge/highlight docs are superseded by semantic active filter layers where those have current tests, but cut 15 verification still remains.
