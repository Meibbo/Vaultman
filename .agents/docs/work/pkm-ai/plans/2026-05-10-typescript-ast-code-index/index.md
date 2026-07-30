---
title: TypeScript AST code index
type: implementation-plan
status: done
parent: "[[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]]"
created: 2026-05-10T08:35:50
updated: 2026-05-10T08:44:08
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent/workflow
---

# TypeScript AST Code Index

## Goal

Add a PKM-AI `code-index` tool that uses the TypeScript compiler API for local-code retrieval evidence: exports, imports, resolved relative dependency edges, and dependents.

## Scope

In scope:

- Parse `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.svelte.ts`, and `.svelte.js` files with TypeScript AST.
- Extract static `import`, `export ... from`, exported declarations, and top-level declarations.
- Resolve relative import specifiers to repository-relative paths.
- Answer "what imports this file" from resolved dependency edges.
- Expose a CLI with human output and `--json`.
- Register the command in `pkm.mjs` and package bin/scripts.
- Update tool contracts so `code-index.mjs` is evidence-bearing and the old regex tools remain heuristic.

Out of scope:

- Full Svelte `.svelte` prop/event extraction.
- Type checker symbol resolution across `paths` aliases.
- Runtime call graph or dataflow analysis.
- Rewriting `analyze-code.mjs` or `traverse-graph.mjs`.

## Files

- Create `.agents/tools/pkm-ai/lib/code-index.mjs`.
- Create `.agents/tools/pkm-ai/code-index.mjs`.
- Create `.agents/tools/pkm-ai/test/code-index.test.mjs`.
- Modify `.agents/tools/pkm-ai/pkm.mjs`.
- Modify `.agents/tools/pkm-ai/package.json`.
- Modify [[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/06-tool-contracts|Tool contracts]].
- Modify [[docs/work/pkm-ai/index|PKM-AI index]].
- Modify [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]].

## TDD Plan

1. RED: add `code-index.test.mjs` that imports the future library and spawns the future CLI.
2. Assert AST extraction handles multiline static imports, type-only imports, default imports, namespace imports, exported interfaces, exported consts, default exports, and export lists.
3. Assert relative dependency edges resolve to repo-relative paths and `dependentsFor(index, target)` returns the importer.
4. Assert CLI `--json` returns `confidence: "evidence-bearing"` and file entries.
5. GREEN: implement the smallest library and CLI that pass those tests.
6. Refactor only inside the new library if needed for clarity.

## Verification Plan

- `node --test .agents/tools/pkm-ai/test/code-index.test.mjs`
- `npm --prefix .agents/tools/pkm-ai test`
- `node .agents/tools/pkm-ai/code-index.mjs --json .agents/tools/pkm-ai/lib/code-index.mjs`
- `node .agents/tools/pkm-ai/pkm.mjs code-index --json .agents/tools/pkm-ai/lib/code-index.mjs`
- `git diff --check -- .agents/tools/pkm-ai/lib/code-index.mjs .agents/tools/pkm-ai/code-index.mjs .agents/tools/pkm-ai/test/code-index.test.mjs .agents/tools/pkm-ai/pkm.mjs .agents/tools/pkm-ai/package.json .agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/06-tool-contracts.md .agents/docs/work/pkm-ai/plans/2026-05-10-typescript-ast-code-index/index.md .agents/docs/work/pkm-ai/index.md .agents/docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index.md`
- `node .agents/tools/pkm-ai/check-doc-health.mjs`

## Status

- [x] Read route docs, current status/handoff, engineering context, Agent Control Plane retrieval/tool-contract specs, and existing PKM-AI scripts.
- [x] Create this plan.
- [x] Add RED tests.
- [x] Implement AST code-index library and CLI.
- [x] Register CLI command.
- [x] Update tool contracts and indexes.
- [x] Run verification.
- [x] Record evidence here.

## Evidence

RED:

- `node --test .agents/tools/pkm-ai/test/code-index.test.mjs` failed with `ERR_MODULE_NOT_FOUND` for `.agents/tools/pkm-ai/lib/code-index.mjs`.

GREEN and regression:

- `node --test .agents/tools/pkm-ai/test/code-index.test.mjs` passed:
  2 tests.
- `npm --prefix .agents/tools/pkm-ai test` passed: 16 tests.
- `node .agents/tools/pkm-ai/code-index.mjs --json .agents/tools/pkm-ai/lib/code-index.mjs` exited 0 and emitted `confidence: "evidence-bearing"`, parsed imports, exports, declarations, and edges.
- `node .agents/tools/pkm-ai/pkm.mjs code-index --json .agents/tools/pkm-ai/lib/code-index.mjs` exited 0 through the dispatcher.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- Scoped `git diff --check` passed with only CRLF warnings on existing files.
- `node .agents/tools/pkm-ai/check-doc-health.mjs` still reports global `doc health: FAIL (48)`, with no `typescript-ast-code-index` path hit.

Implemented:

- `.agents/tools/pkm-ai/lib/code-index.mjs`
- `.agents/tools/pkm-ai/code-index.mjs`
- `.agents/tools/pkm-ai/test/code-index.test.mjs`
- `pkm.mjs` command registration and package bin/script registration.
- Tool contract/routing docs now classify `code-index.mjs` as evidence-bearing and keep regex-only code tools heuristic.
