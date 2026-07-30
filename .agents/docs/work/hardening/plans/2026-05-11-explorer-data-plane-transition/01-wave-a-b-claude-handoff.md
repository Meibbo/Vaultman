---
title: Wave A/B Claude handoff
type: handoff-plan
status: draft
parent: "[[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/index|explorer-data-plane-transition-plans]]"
created: 2026-05-11T22:10:13
updated: 2026-05-11T22:10:13
tags:
  - agent/plan
  - initiative/hardening
  - explorer/views
  - handoff
created_by: codex
updated_by: codex
---

# Wave A/B Claude Handoff

This handoff is for Claude or another planning agent. Its job is to prepare the implementation plan for `EDP-002`. It must not implement product code.

## Mission

Prepare Vaultman to start the Explorer data-plane transition.

- Wave A: dispatch read-only scout subagents over independent code domains.
- Wave B: synthesize those reports into a detailed `EDP-002` implementation plan.
- Wave C: leave implementation to Codex in a later session.

## Required Startup

Read these first:

1. `AGENTS.md`
2. `.agents/docs/start.md`
3. `.agents/docs/current/status.md`
4. `.agents/docs/current/handoff.md`
5. [[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]
6. [[docs/work/hardening/issues/explorer-data-plane/001-approve-issue-set-and-supersession-notes|EDP-001]]
7. [[docs/work/hardening/issues/explorer-data-plane/002-files-snapshot-data-plane-foundation|EDP-002]]
8. [[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/14-wave-4-files-tree-snapshot-first-slice|Wave 4 Files tree snapshot first slice]]

Use skills equivalent to:

- architecture research/spec workflow;
- dispatching parallel agents;
- writing implementation plans;
- Svelte code analysis for `.svelte` or `.svelte.ts` files.

## Hard Constraints

- Do not edit product code.
- Do not start Wave C.
- Do not create GitHub issues.
- Do not move AI docs toward `main`.
- Do not revert unrelated dirty work.
- Keep structural snapshots memory-first.
- Do not put media cache DB work into `EDP-002`; that belongs to `EDP-007`.
- Do not treat stale `serviceViews` plan wording as current authority when it conflicts with `NodeSelectionService`.

Allowed writes:

- Scout reports under this plan folder.
- The final `EDP-002` implementation plan under this plan folder.
- Compact links in current status/handoff if useful.

## Wave A - Scout Dispatch

Dispatch four read-only scouts. Each scout must cite files read, summarize current responsibilities, name risks, and propose exact files/tests the plan should touch. They must not edit files.

### Scout A1 - Files Source And Tree Contracts

Scope:

- `src/types/typeExplorer.ts`
- `src/types/typeContracts.ts`
- `src/providers/explorerFiles.ts`
- `src/index/indexNodeCreate.ts`
- Files index/source modules found by `rg "createFilesIndex|flatIds|byId|revision|subscribe"`

Questions:

- What is the current `TreeNode` shape and metadata expectation?
- Where does Files currently mix source facts, search/sort/hidden projection, adopted children, and decoration?
- What exact source method or adapter should `EDP-002` add without breaking `getTree()`?
- What tests already cover Files provider behavior?

Expected report:

- `reports/a1-files-source-tree-contracts.md`

### Scout A2 - Panel Selection And Reveal Integration

Scope:

- `src/components/containers/panelExplorer.svelte`
- `src/components/views/viewTree.svelte`
- selection, prune, range, box-selection, and reveal helpers found by `rg`.
- `src/services/serviceScroll.ts`
- `src/services/serviceNodeSelection*` or equivalent selection service files.

Questions:

- Which recursive scans can be replaced by snapshot maps in `EDP-002`?
- Which paths must remain fallback for non-snapshot providers?
- What shape should a revisioned reveal target use?
- Which component tests must remain green?

Expected report:

- `reports/a2-panel-selection-reveal.md`

### Scout A3 - Tests And Verification Gates

Scope:

- `test/unit/components/explorerFiles.test.ts`
- `test/component/panelExplorerSelection.test.ts`
- tree/view tests found by `rg "viewTree|panelExplorer|selection|reveal" test`
- package scripts in `package.json`

Questions:

- Which tests should be extended versus newly created?
- What exact focused commands should the plan require?
- Are there existing test factories for `TreeNode`, Files provider, or panel state?
- What is the smallest red-green sequence for `EDP-002`?

Expected report:

- `reports/a3-tests-verification.md`

### Scout A4 - ViewService And Overlay Boundary Guard

Scope:

- `src/services/serviceViews.svelte.ts`
- `src/types/typeView*`
- badge/overlay services used by Files decoration.
- Wave 4 overlay spec shard 15.

Questions:

- What must `EDP-002` avoid so overlay batching stays in `EDP-004`?
- Which existing decoration behavior must remain compatible through `getTree()`?
- What signatures or output terms should the plan reserve for later without implementing them?

Expected report:

- `reports/a4-viewservice-overlay-boundary.md`

## Wave B - Plan Writing

After all scout reports exist, write:

`02-edp-002-files-snapshot-data-plane-implementation-plan.md`

The plan must follow the `writing-plans` standard:

- exact files to create/modify;
- TDD steps with red/green commands and expected outputs;
- code-level contracts for `typeExplorerDataPlane.ts`, `logicExplorerSnapshot.ts`, and `serviceExplorerDataPlane.svelte.ts`;
- compatibility steps for `explorerFiles.ts`, `panelExplorer.svelte`, and `viewTree.svelte`;
- focused verification commands;
- no placeholders, no broad "add tests" steps.

The plan must explicitly defer:

- media cache database (`EDP-007`);
- overlay projection extraction (`EDP-008`);
- adapter row contract migration (`EDP-009`);
- selection mirror cleanup (`EDP-010`);
- persistent structural snapshot storage;
- generic row-level subscriptions.

## Final Output To Leave For Codex

Claude must finish by updating this file or adding a short final handoff note with:

- links to the four scout reports;
- link to the `EDP-002` implementation plan;
- unresolved questions, if any;
- proposed Wave C worker split with disjoint write scopes;
- exact first command Codex should run before implementation.

Do not mark `EDP-002` as complete. If the plan is ready for implementation, update the issue label/status to `ready-for-agent` only if the local tracker convention is clear and `EDP-001` has been satisfied.

## Wave A/B Completion (2026-05-12)

Wave A scout reports:

- [[reports/a1-files-source-tree-contracts|A1 Files source and tree contracts]]
- [[reports/a2-panel-selection-reveal|A2 Panel selection and reveal]]
- [[reports/a3-tests-verification|A3 Tests and verification gates]]
- [[reports/a4-viewservice-overlay-boundary|A4 ViewService and overlay boundary]]

Wave B output:

- [[02-edp-002-files-snapshot-data-plane-implementation-plan|EDP-002 Files snapshot data-plane implementation plan]]

Locked decisions resolved during synthesis:

- Provider method names: `getStructuralTree()` (mirrors `getTree()`) and `getStructuralRevisions()`. Scout A3's alternate `getStructuralSource()` name was rejected for symmetry.
- `ExplorerDataPlaneRevisions` field set: `filesRevision` required;
  `propsRevision`/`tagsRevision`/`contentRevision` optional carry-throughs.
  `queueRevision`, `filterRevision`, `decorationRevision` explicitly excluded (reserved for `EDP-004`).
- `subscribe(explorerId, cb)` API is per-explorer, matching spec shard 14.
- `viewTree.svelte` reveal resolution stays unchanged; only the type `ExplorerRevealTarget` lands in this slice. View adoption is deferred to `EDP-009`.
- `panelExplorer.svelte` `visibleNodeIds()` is the only helper rewired for Files in EDP-002. The other 11 recursive scans listed by Scout A2 are reserved for `EDP-003`.

Unresolved questions deferred to Codex:

- Auto-publish wiring inside `panelExplorer.refreshData()`. The plan installs `ExplorerDataPlaneService` and the consumer branch, but the publish trigger (subscribe to `filesIndex.subscribe` + republish on structural revision change) is intentionally minimal in EDP-002. The test stubs install the snapshot directly. Document the chosen wiring in the Task 5 commit message.
- Whether `getStructuralRevisions()` should include `propsRevision` only when `sortBy === 'count'`. The plan unconditionally includes it.

Proposed Wave C worker split:

- Worker 1: Tasks 1–3 — types, pure builder, service. Writes only in `src/types/`, `src/logic/`, `src/services/`, `test/unit/`.
- Worker 2: Tasks 4–5 — Files provider + main wiring + Files provider test extensions. Writes only in `src/providers/explorerFiles.ts`, `src/main.ts`, `test/unit/components/explorerFiles.test.ts`.
- Worker 3: Task 6 — panel wiring + panel test extensions. Writes only in `src/components/containers/panelExplorer.svelte` and `test/component/panelExplorerSelection.test.ts`.
- Worker 4: Task 7 — final verification. Read-only on code.

Workers 1 and 2 may run in parallel; Worker 3 starts after both merge;
Worker 4 runs last.

Exact first command Codex should run before implementation:

```sh
pnpm run test:unit -- test/unit/logic/logicExplorerSnapshot.test.ts
```

Expected: FAIL with module-resolution error. This is the RED gate for Task 2.1 in the plan.

`EDP-002` issue status: keep at `needs-triage` until `EDP-001` is satisfied and the user explicitly approves promotion to `ready-for-agent`.
