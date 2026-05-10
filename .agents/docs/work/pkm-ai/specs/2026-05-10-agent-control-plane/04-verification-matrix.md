---
title: Agent control plane - verification matrix
type: spec-shard
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index|Agent Control Plane]]"
created: 2026-05-10T03:29:53
updated: 2026-05-10T03:29:53
created_by: codex
updated_by: codex
tags:
  - agent/spec
  - initiative/pkm-ai
  - agent/workflow
---

## Purpose

This matrix is the shared verification contract for Agent Control Plane work. Future plans should cite this shard instead of inventing slice-local command sets, sequencing, or residual-risk rules.

| Change type | Focused check | Broad check | Runtime/live check | Sequencing | Residual rule | Evidence record path |
| --- | --- | --- | --- | --- | --- | --- |
| docs-only | `node .agents\tools\pkm-ai\check-doc-health.mjs`; scoped `git diff --check` | Review affected shard links, frontmatter, parent references, and line count. | Not required unless docs describe runtime behavior that can be sampled. | Run doc health first, then whitespace/diff checks. | Residual risk is limited to stale references or missing index integration; record any coordinator-owned index follow-up. | `docs/work/<initiative>/items/<item>/verification.md` or plan verification section |
| agent-tooling script | `node --test ".agents/tools/pkm-ai/test/*.test.mjs"` | Run adjacent script tests when the script changes shared parsing, routing, or validation helpers. | Dry-run against fixture or disposable docs when the script mutates files. | Run focused tests before any live mutation or broad doc health pass. | Residual risk must name untested file shapes, path conventions, or mutation modes. | `docs/work/<initiative>/items/<tooling-item>/verification.md` |
| Svelte component | Focused component test with `--fileParallelism=false`. | `pnpm run check` | Obsidian smoke when the component depends on Obsidian APIs, DOM mounting, or plugin runtime wiring. | Run focused component test first, then `pnpm run check`, then runtime smoke when applicable. | Residual risk must identify untested interaction states, viewport assumptions, or host-runtime gaps. | `docs/work/<initiative>/items/<ui-item>/verification.md` |
| Svelte lifecycle/reactivity | Mounted component test that exercises lifecycle, subscriptions, teardown, and reactive updates. | `pnpm run check`; broaden to related component tests when state is shared. | Obsidian smoke when available. | Verify mount/update/destroy behavior before relying on static checks. | Residual risk must state whether teardown, remount, async resolution, or Obsidian pane transitions remain unsampled. | `docs/work/<initiative>/items/<reactivity-item>/verification.md` |
| service logic | Focused unit test for the changed service behavior. | `pnpm run test:unit` when the service is shared. | Runtime smoke only when service behavior depends on Obsidian APIs, vault state, or file system side effects. | Prove the service contract locally before broad shared-service tests. | Residual risk must name consumers not covered by focused or shared tests. | `docs/work/<initiative>/items/<service-item>/verification.md` |
| queue/file operation | Focused unit and component tests for queue state, file writes, failure paths, and retry or cancellation behavior. | `pnpm run test:unit` when shared file helpers or queue contracts change. | Obsidian smoke for live vault mutation paths. | Test pure queue/file behavior first, then UI integration, then live vault mutation. | Residual risk must name any live mutation path, concurrent operation, rollback, or file-conflict case not exercised. | `docs/work/<initiative>/items/<queue-item>/verification.md` |
| settings/persistence | Focused unit/component test for read, write, defaults, and validation. | `pnpm run test:unit` when shared settings helpers or schemas change. | Migration check when settings shape changes; Obsidian smoke if plugin settings UI or saved data is involved. | Verify old/default/new settings paths before runtime smoke. | Residual risk must identify unsupported legacy shapes, migration assumptions, or manual settings steps. | `docs/work/<initiative>/items/<settings-item>/verification.md` |
| performance-sensitive path | Focused perf or integration probe covering the hot path and representative data volume. | Broaden to related unit/integration tests that protect algorithmic shape. | Runtime smoke with realistic vault size when performance depends on Obsidian rendering, indexing, or file access. | Establish baseline or threshold before broad checks; run CodeQL shape review if applicable. | Residual risk must state data-size limits, missing stress cases, and whether the check is qualitative or thresholded. | `docs/work/<initiative>/items/<perf-item>/verification.md` |
| CodeQL guardrail | `codeql test run --additional-packs codeql\queries\javascript codeql\tests --threads=0` | Review changed query fixtures and expected outputs. | Not required; CodeQL guardrails are static-analysis contracts. | Run CodeQL tests after query or fixture edits and before claiming the guardrail is valid. | Residual risk must name unsupported syntax, framework patterns, or query false-positive/false-negative boundaries. | `docs/work/<initiative>/items/<codeql-item>/verification.md` |
| Obsidian runtime behavior | Focused runtime smoke with Obsidian CLI or WDIO smoke. | Pair with relevant unit/component/check command for the changed surface. | Obsidian CLI or WDIO smoke is the runtime/live check. | Run static/unit checks first when they are cheap, then smoke the integrated behavior in Obsidian. | Residual risk must name host-version, workspace-state, vault-content, or plugin-load cases not sampled. | `docs/work/<initiative>/items/<runtime-item>/verification.md` |
| dependency/package change | Install/build/check command appropriate to the package manager and changed package surface. | `pnpm run check`; relevant unit/build commands; lockfile scope review. | Runtime smoke when the dependency affects plugin load, UI rendering, file access, or Obsidian integration. | Verify install and lockfile first, then build/check, then focused runtime behavior. | Residual risk must identify transitive dependency impact, lockfile noise, platform assumptions, and untested runtime entry points. | `docs/work/<initiative>/items/<dependency-item>/verification.md` |
