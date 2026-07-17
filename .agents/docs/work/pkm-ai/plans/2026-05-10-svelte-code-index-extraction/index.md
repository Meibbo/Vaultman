---
title: Svelte code index extraction
type: implementation-plan
status: done
parent: "[[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]]"
created: 2026-05-10T09:06:09
updated: 2026-05-10T09:13:55
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent/workflow
---

# Svelte Code Index Extraction

## Goal

Extend `code-index.mjs` so local-code retrieval can inspect Svelte component
interfaces, not only TypeScript modules.

## Scope

In scope:

- Include `.svelte` files in `code-index` targets.
- Parse Svelte instance/module scripts with `svelte/compiler`.
- Extract script imports/exports/declarations.
- Extract component props from legacy `export let` and Svelte 5 `$props()`
  object destructuring.
- Extract emitted component events from `createEventDispatcher()` dispatcher
  calls with string literal event names.
- Keep output explicitly limited to parsed static evidence.

Out of scope:

- Full Svelte template AST analysis.
- DOM event listeners such as `onclick`/`on:click`.
- Callback prop semantics beyond reporting them as props.
- Type checker symbol resolution or Svelte type inference.
- Modifying product `.svelte` files.

## Files

- Modify `.agents/tools/pkm-ai/lib/code-index.mjs`.
- Modify `.agents/tools/pkm-ai/test/code-index.test.mjs`.
- Modify [[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/05-route-retrieval-profiles|Route and retrieval profiles]].
- Modify [[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/06-tool-contracts|Tool contracts]].
- Modify [[docs/work/pkm-ai/index|PKM-AI index]].
- Modify [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]].

## TDD Plan

1. RED: add a fixture `.svelte` component to `code-index.test.mjs`.
2. Assert `.svelte` is discovered and reports `language: "svelte"`.
3. Assert imports from the component script still produce dependency edges.
4. Assert props include one `export-let` prop and several `$props()` props.
5. Assert events include dispatcher string-literal calls.
6. GREEN: implement Svelte parsing in `lib/code-index.mjs`.
7. Refactor only if the Svelte/TypeScript extraction boundary is unclear.

## Verification Plan

- `node --test .agents/tools/pkm-ai/test/code-index.test.mjs`
- `npm --prefix .agents/tools/pkm-ai test`
- `node .agents/tools/pkm-ai/code-index.mjs --json src/components/layout/navbarExplorer.svelte`
- `pnpm run lint`
- `git diff --check -- .agents/tools/pkm-ai/lib/code-index.mjs .agents/tools/pkm-ai/test/code-index.test.mjs .agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/05-route-retrieval-profiles.md .agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/06-tool-contracts.md .agents/docs/work/pkm-ai/plans/2026-05-10-svelte-code-index-extraction/index.md .agents/docs/work/pkm-ai/index.md .agents/docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index.md`
- `node .agents/tools/pkm-ai/check-doc-health.mjs`

## Status

- [x] Read route docs, current status/handoff, existing `code-index`, and
  Agent Control Plane retrieval/tool contracts.
- [x] Create this plan.
- [x] Add RED tests.
- [x] Implement Svelte extraction.
- [x] Update tool contracts and indexes.
- [x] Run verification.
- [x] Record evidence here.

## Evidence

RED:

- `node --test .agents/tools/pkm-ai/test/code-index.test.mjs` failed on the
  new Svelte test because `src/Widget.svelte` was not discovered.

GREEN and regression:

- `node --test .agents/tools/pkm-ai/test/code-index.test.mjs` passed:
  3 tests.
- `npm --prefix .agents/tools/pkm-ai test` passed: 17 tests.
- `node .agents/tools/pkm-ai/code-index.mjs --json src/components/layout/navbarExplorer.svelte`
  exited 0 and emitted imports, resolved edges, `$props()` props, exports, and
  empty dispatcher events for that component.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- Scoped `git diff --check` passed with only CRLF warnings on existing files.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still reports global
  `doc health: FAIL (48)`, with no `svelte-code-index-extraction` path hit.

Implemented:

- `.svelte` file discovery in `code-index`.
- Svelte parsing through `svelte/compiler`.
- Import/export/declaration extraction from Svelte scripts.
- Prop extraction for `export let` and `$props()` object destructuring.
- Event extraction for `createEventDispatcher` dispatcher string-literal calls.
- Updated local-code retrieval and tool-confidence docs.
