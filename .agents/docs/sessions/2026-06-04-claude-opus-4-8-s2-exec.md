---
title: Session shard — claude-opus-4-8 — S2 coordination execution
type: agent-journal
status: active
parent: "[[docs/sessions/session-log|session-log]]"
created: 2026-06-04T09:45:00
updated: 2026-06-04T09:45:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/journal
  - agent/sessions
  - initiative/pkm-ai
---

# Session shard — claude-opus-4-8 — S2 execution (working memory, append-only)

Continuation of the 2026-06-04 PKM-AI orchestration upgrade. Executing S2 Tasks 1-7 from [[docs/work/pkm-ai/plans/2026-06-04-orchestration-upgrade/02-S2-coordination|02-S2-coordination]].
Parallel Codex on stable+proto streams in this SAME worktree → do not touch status.md/handoff.md or hardening docs.

## Startup (dogfood)
- Registered presence in `room_20260526_000000_321c3c` (the workspace's only running run) as `claude-opus-4-8`: `agent join --run current` + `agent heartbeat`. Tool = `agent-room.ts` (Node 24.15 type-stripping, no build). STEP-0 mandate satisfied.
- Richer coordination dogfood (task/scope/mailbox) deferred to T6 in the NEW `.git/vaultman-room` root.

## Verified facts (2026-06-04)
- Test baseline: 35 tests green (`node --test .agents/tools/pkm-ai/test/*.test.mjs`).
- `tsconfig.json` has `erasableSyntaxOnly: true` → erasable types only (no enums/namespaces/param-props).
- Test harness (`test/agent-room.test.mjs`) uses `makeTempRoot()` = a **non-git** tmp dir; CLI spawned with `cwd: root`. So `git rev-parse --git-common-dir` FAILS there → resolveStateRoot falls back to `<cwd>/.agents/state`. **All 6 existing agent-room tests stay green unchanged** under T1.
- Main worktree: `git rev-parse --git-common-dir` = `.git` → stateRoot = `<cwd>/.git/vaultman-room` (INSIDE cwd). Linked worktrees point at the MAIN `.git` (OUTSIDE their cwd).
- `.agents/state` is NOT gitignored and IS tracked (old room files committed → the "sandbox accumulation" noted in session-log). Moving the room to `.git/vaultman-room` (never tracked) fixes it.
  FOLLOW-UP for dev: `git rm -r --cached .agents/state` + gitignore it (deletion of files I didn't create → out of scope for my commits).

## Design decisions (T1/T2) — the subtle parts
- **resolveStateRoot computed ONCE in createContext** (not per resolveRunPaths call) → stored on `Context.stateRoot`. Rationale: resolveRunPaths is called many times/command; spawning git each call is wasteful. Exported `resolveStateRoot(cwd,args)` stays a pure fn (testable).
- **resolveRunPaths(cwd,runId) → resolveRunPaths(stateRoot,runId)**: drop the hardcoded `path.join(cwd,".agents","state")`; derive runRoot/locksRoot from stateRoot. `loadManifest` and `latestRunId` change their first param cwd→stateRoot too. `handleRun list` uses `path.join(context.stateRoot,"runs")`.
- **WRITE-GUARD FIX (the crux the plan under-specified):** `assertPathInsideWorkspace(cwd,filePath)` blocks writes outside cwd. A linked worktree's shared stateRoot lives in the MAIN repo `.git` → OUTSIDE its cwd → every write throws → T6 impossible. Fix: confine writes to **stateRoot** instead of cwd (ALL room writes already target stateRoot — manifest/tasks/events/agents/mailbox/locks/delivery).
  Rename guard → assert inside stateRoot; thread `context.stateRoot` into writeJsonAtomic/appendJsonl/ appendEvent/writeDelivery (was `context.cwd`). This is TIGHTER (confines to room dir) AND enables cross-worktree. cwd still used by normalizeScope (workspace-relative scopes) + runManageTasks.
- **ensureRun (T2):** `<stateRoot>/ensure.lock` workspace-level lock (reuse atomic-write+age-stale idiom, but WAIT/spin if held — withRunLock currently THROWS, so a dedicated wait-acquire). Under the lock: newest run with status==="running" → join; else createRun (extract from handleRun start) then join. Wire `agent join --run current` (the "current" sentinel) through ensureRun. Returns {runId, created}. No-double-room guaranteed by the lock spanning find+create.
- **Tests = black-box** (spawn CLI, assert stdout JSON + filesystem). NO `.ts` test file, NO import-the-module. Per user directive + plan L31-36 (the `.ts` snippets are illustrative). The plan's "Files: test/agent-room.test.ts" line is superseded.
- **Commits per task** (user guardrail) overrides plan T7's single `git add -A` — scoped adds only;
  before each commit `git status --short` to confirm only intended files; never stage `.agents/state` dogfood churn or the parallel-Codex `hardening/index.md`.
- **Micro-fix:** HELP usage text still prints `agent-room.mjs` → change to `agent-room.ts` (fold into T1).

## Progress
- [ ] T1 resolveStateRoot + thread stateRoot + guard fix (+ micro-fix HELP) — IN PROGRESS
- [ ] T2 ensureRun (atomic) — two-stage review
- [ ] T3 stream/worktree tags
- [ ] T4 coordination.md
- [ ] T5 verify AGENTS.md link
- [x] T6 cross-worktree 2-agent verification — LIVE PASS (vaultman + vm-s2-test → one room); Codex also converged (real proof)
- [x] T7 / wrap: plan index DONE, session-log, hub update — commit `4aebaaa`

## S3 — memory lifecycle (ADR 0002) — STARTED 2026-06-05
- **Ground truth:** health = FAIL(123) = 54 line-limit + 40 timestamp-offset + 29 parent-shape (+2 frontmatter-parse, FIXED). ALL 123 auto-repairable via `--repair-residuals` BUT 85 in Codex's `work/hardening` + 1 in `current/` + 0 in pkm-ai → prune is contended.
- **Status reality:** 818 docs, ~23 free-form `status` values (295 draft, 265 active, 71 done…) → `status` is NOT lifecycle vocab.
- **Dev decisions (AskUserQuestion 2026-06-05):** (1) **new additive `lifecycle:` field** (not migrate `status`); (2) **DEFER the prune** (don't touch Codex/current).
- **S3a DONE (mine):** fixed ADR 0003+0006 colon-title YAML parse fails (123→ was 125); `check-doc-health.mjs`
  + `lifecycle-state` FAIL (invalid value) + `stale-active` WARN (`--stale-active-days`, default 30); 7 doc-health tests green; amended ADR 0002 (status→lifecycle field); docs.md lifecycle policy section;
  dogfood `lifecycle: active` on ADR 0002 + coordination.md. Opt-in field → corpus stays FAIL(123), 0 new.
- **S3b DEFERRED:** the 123-fail prune (coordinate w/ Codex; never touch status/handoff). FAIL→0 deferred.
- **Next:** S4 (versioning) / S5 (.ts migration) parallel; or coordinate S3b prune window.
