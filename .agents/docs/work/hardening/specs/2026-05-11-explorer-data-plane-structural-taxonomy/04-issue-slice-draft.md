---
title: Issue slice draft
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/index|explorer-data-plane-structural-taxonomy]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T19:56:34
tags:
  - agent/spec
  - explorer/views
  - needs-triage
---

# Issue Slice Draft

These are draft tracer-bullet slices from the `to-issues` workflow. They are
not published issues yet. The user explicitly wants final issue/PRD creation
after the Notebook Navigator research wave and after comparison with existing
architectural plans.

Wave 2 spec-writing slices are now captured in this folder. They remain source
records for later implementation specs, not published tracker issues.

## Draft Slices

1. **Explorer plan reconciliation**
   - Type: HITL
   - Status: source captured in
     [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/12-wave-2-plan-reconciliation-spec|Wave 2 plan reconciliation spec]].
   - Blocked by: user approval before final issue publication.
   - Covers: stale `serviceViews` plan, completed selection/table/cards/scroll
     work, parent PRD alignment.
   - Acceptance: a doc records done/stale/superseded/in-progress items and the
     user approves the source of truth.

2. **Files tree vertical codebase spec**
   - Type: AFK
   - Status: source captured in
     [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/06-wave-2-files-tree-vertical-spec|Wave 2 files tree vertical spec]].
   - Blocked by: none for Wave 4 Files-first implementation spec.
   - Covers: Files source facts through tree render and tests.
   - Acceptance: spec maps current files, target seams, snapshot contract,
     compatibility adapter, and test gates.

3. **Provider adapter taxonomy spec**
   - Type: AFK
   - Status: source captured across Files and Tags/Props vertical specs.
   - Blocked by: Files-first architecture decision.
   - Covers: Files, Tags, Props provider split into source facts and domain
     actions.
   - Acceptance: spec names what stays in adapters and what moves into data
     plane for each provider family.

4. **Overlay and invalidation spec**
   - Type: AFK
   - Status: source captured in
     [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/08-wave-2-overlay-invalidation-spec|Wave 2 overlay invalidation spec]].
   - Blocked by: Files snapshot contract for concrete implementation.
   - Covers: queue operations, active filters, `ViewLayers`, badge registry,
     inherited badges, structural/decorative/control invalidation.
   - Acceptance: spec defines overlay inputs, output layers, revision keys, and
     affected-node invalidation strategy.

5. **View adapter and virtualizer spec**
   - Type: AFK
   - Status: source captured in
     [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/09-wave-2-view-adapter-virtualizer-spec|Wave 2 view adapter and virtualizer spec]].
   - Blocked by: snapshot-backed row contract.
   - Covers: tree/grid/table/cards/list/SVAR adapters and reveal-by-id.
   - Acceptance: spec defines row input contracts, adapter responsibilities,
     virtualizer key requirements, and compatibility risks.

6. **Selection and control-state spec**
   - Type: AFK
   - Status: source captured in
     [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/10-wave-2-selection-control-spec|Wave 2 selection and control state spec]].
   - Blocked by: snapshot order and lookup maps.
   - Covers: `NodeSelectionService`, focus, active node, hover, expansion,
     keyboard flows, DnD context.
   - Acceptance: spec confirms `NodeSelectionService` authority and defines
     how snapshots project into data-plane/view-adapter state.

7. **Test and performance gate spec**
   - Type: AFK
   - Status: source captured in
     [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/11-wave-2-test-performance-gates|Wave 2 test and performance gates]].
   - Blocked by: concrete implementation spec command choices.
   - Covers: unit snapshot tests, layer tests, component projection tests,
     performance probes, and live smoke boundaries.
   - Acceptance: spec lists red/green gates and identifies which existing tests
     remain compatibility gates.

8. **Notebook Navigator React-to-Svelte research**
   - Type: HITL
   - Blocked by: Wave 2 specs for final integration conclusions; initial
     source-backed pass exists in
     [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/05-notebook-navigator-react-to-svelte-research|Notebook Navigator React to Svelte research]].
   - Covers: external architecture comparison and Svelte-native translation.
   - Acceptance: research record explains what to adopt, adapt, or reject.

9. **Explorer data plane implementation spec set**
   - Type: HITL
   - Status: draft captured in
     [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/13-wave-4-implementation-spec-set|Wave 4 implementation spec set]].
   - Blocked by: Wave 5 plan comparison before tracker issue publication.
   - Covers: first implementation specs, not code.
   - Acceptance: user approves the implementation slices before issue
     publication.

10. **Final issue publication**
    - Type: HITL
    - Status: draft candidates captured in
      [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/19-wave-5-issue-prd-candidates|Wave 5 issue and PRD candidates]].
    - Blocked by: user approval and issue tracker target.
    - Covers: converting approved specs into tracker issues.
    - Acceptance: issues are published in dependency order with `needs-triage`.

## Granularity Notes

- Slices 2 through 7 are spec-writing work and can be assigned to parallel
  agents after slice 1 resolves doc truth. This capture is complete enough to
  seed Wave 4 specs.
- Slices 8 through 10 should remain sequential because each depends on the
  previous wave's conclusions.
- The first code implementation issue should not be created until slice 9 is
  approved.
