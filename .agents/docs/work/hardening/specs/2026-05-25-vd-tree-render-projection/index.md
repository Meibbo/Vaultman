---
title: V.D Tree Render Projection
type: spec-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/view-decomposition
  - explorer/performance
  - release/v1.3.0
created_by: codex
updated_by: codex
---

# V.D Tree Render Projection

Detail spec for the first V.D slice that makes `viewTree.svelte` behave like a render shell instead of a tree data pipeline. It is based on [[docs/work/hardening/research/2026-05-25-vd-tree-list-nn-pipeline-discovery/index|V.D Tree/List/Notebook Navigator Pipeline Discovery]].

V.D in the umbrella means **View Decomposition**. This spec is not the whole V.D workstream; it is the Tree performance slice that should happen before broader NodeRow primitive or Panel Decomposition work.

## Goal

Build a Tree render projection contract that supplies `viewTree.svelte` with visible, indexed, hierarchy-aware, predecorated rows so the view stops doing full-tree projection work during render.

## Architecture

Move tree flattening and row metadata into a service-level projection builder.
`panelExplorer.svelte` will create or request a visible Tree projection from the provider snapshot. `viewTree.svelte` will consume that projection directly, keeping TanStack Virtual and existing markup while deleting the expensive local projection path.

## Shards

1. [[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/01-target-architecture|Target architecture]]
2. [[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/02-contracts-and-files|Contracts and files]]
3. [[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/03-migration-sequence|Migration sequence]]
4. [[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/04-verification-and-acceptance|Verification and acceptance]]
5. [[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/05-risks-and-deferred|Risks and deferred work]]

## Scope

Build:

- `TreeRenderProjection` service type.
- Visible-row projection builder for Explorer Tree.
- Linear ancestry/subtree metadata computation.
- Tree path in `panelExplorer.svelte` that feeds visible render rows instead of raw `snapshot.rows`.
- `viewTree.svelte` consumption of the new projection.
- Perf marks around old and new projection work.
- Focused tests proving visible-row semantics and parity.

Preserve:

- Existing Tree DOM class vocabulary.
- Existing `ExplorerRowInput` compatibility for other views.
- Existing action routing, context menu, selection, rename, badges, fields, DnD view state, sticky ancestors, and scroll fallback behavior unless explicitly covered by this spec.
- TanStack Virtual.

Do not build:

- Full NodeRow primitive.
- Full V.D extraction of every view.
- Panel Decomposition.
- New virtualizer library.
- Notebook Navigator import/swap.
- Nautilus rewrite.

## Success Criteria

1. Tree projection cost scales with visible rows, not full structural rows, for collapsed branches.
2. `viewTree.svelte` no longer contains the all-row `flatProjectionRows` responsibility.
3. Sticky rows and reveal lookup still work from precomputed indices.
4. Tree remains zero-blank in the 50k stress matrix.
5. Tree event-loop delay improves materially against the current `1051 ms` p99/max baseline. Target for acceptance: p99 under `150 ms` in the same local matrix, with the raw run recorded.
6. List behavior does not regress.

## Relationship To Existing Specs

- Consumes A.R action routing completion:
  [[docs/work/hardening/specs/2026-05-20-explorer-AR-action-routing/index|A.R Action Routing Contract]].
- Builds on scroll forensics:
  [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator Scroll Forensics]].
- Extends multiview virtualization research:
  [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|Multiview virtualization research]].
- Feeds umbrella V.D:
  [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/03-dependency-graph|Dependency Graph]].

