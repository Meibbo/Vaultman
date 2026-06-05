---
title: PKM-AI orchestration upgrade — S5 checkpoint + next-agent prompt
type: agent-checkpoint
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-05T12:00:00
updated: 2026-06-05T12:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/sessions
  - initiative/pkm-ai
---

# PKM-AI Orchestration Upgrade — S5 Checkpoint (2026-06-05, claude-opus-4-8)

Resume surface for the next agent. Full slice detail: session-log entries (2026-06-05) +
[[docs/work/pkm-ai/plans/2026-06-04-orchestration-upgrade/index|orchestration-upgrade plan]].

## Done this session — 12 commits on `sandbox` (all verified, scope-clean)

| Slice | Status | Commits |
|---|---|---|
| **S2** coordination (ADR 0003) | ✅ COMPLETE + cross-worktree verified live | `0baad20` `8df2d3a` `c31c2e3` `71fc085` `a778f48` `4aebaaa` |
| **S3a** memory lifecycle (ADR 0002) | ✅ DONE (S3b prune DEFERRED) | `40405a9` `8d5aad2` `e694a06` |
| **S4** versioning (ADR 0005) | ✅ DONE — PKM-AI v1.0.0 | `4cf25ef` |
| **S5** `.ts` migration (ADR 0001) | 🔄 STARTED — agent-room + manage-tasks | `2c15819` `97473ef` |

- agent-room is the cross-stream shared brain: state-root = `<git-common-dir>/vaultman-room` (all
  worktrees → ONE room), atomic `ensureRun` (no double-room), `withRunLock` waits not throws,
  stream/worktree tags, `task --depends-on`, `coordination.md` policy.
- `lifecycle:` frontmatter field (active/deferred/triaged/blocked/superseded/archived) + `check-doc-health`
  `lifecycle-state` FAIL + `stale-active` WARN (`--stale-active-days`, default 30). Opt-in.
- `.agents/pkm-ai.version.json` v1.0.0 + `CHANGELOG.md`; AGENTS.md step 0 reads it.
- Verify gates: `node --test .agents/tools/pkm-ai/test/*.test.mjs` (was 48 green) ·
  `npx tsc -p .agents/tools/pkm-ai/tsconfig.json --noEmit` = **47 errors == baseline** (pre-existing
  CliArgs-union debt; keep at 47, add none) · `node .agents/tools/pkm-ai/check-doc-health.mjs` (corpus
  FAIL ~123, all in OTHER streams — see DEFERRED).

## RESUME HERE — continue S5 (phased `.mjs`→`.ts`)

The hard part (the pattern) is PROVEN. Remaining tools, in order:
`check-doc-health` → `split-shard` → `update-frontmatter` → `query-docs` → `index-docs` → `record-metric`
→ `pkm.mjs`. **The `lib/*.mjs` (frontmatter/glossary/metrics) can STAY `.mjs`** — `.ts` tools import them
fine via tsconfig `allowJs:true` (no forced rename ripple). Bump `toolingVersion` in `pkm-ai.version.json`
+ a CHANGELOG entry when S5 completes.

### Per-tool migration recipe (proven on manage-tasks `2c15819`)

1. Baseline: `node .agents/tools/pkm-ai/<tool>.mjs --help > /tmp/<tool>-help.txt`.
2. Find callers: `grep -rn "<tool>.mjs" .agents/tools/pkm-ai` (update each ref `.mjs`→`.ts`: the test
   `toolPath`, any `spawnSync(... "<tool>.mjs")` in agent-room/pkm, etc.).
3. `git mv .agents/tools/pkm-ai/<tool>.mjs .agents/tools/pkm-ai/<tool>.ts`.
4. **Read the `.ts` path** (harness requires it post-mv), then add a FULL erasable type layer:
   - `strict` ⇒ every function param/return annotated (else TS7006). Add interfaces for the data shapes.
   - Dynamic object-index lookups ⇒ type the const `Record<string, string>` (else TS7053).
   - Erasable ONLY: interfaces, annotations, `as`, `import type`, `x is T`, `!` — NO enums / namespaces /
     parameter-properties. `import ... from "./lib/frontmatter.mjs"` stays `.mjs` (allowJs resolves it).
   - Update the HELP banner string `<tool>.mjs`→`.ts`.
5. Verify (ALL must hold): `tsc` stays **47** · `node <tool>.ts --help` parity · the tool's test suite
   (`node --test test/<tool>.test.mjs`) green · any cross-suite caller (e.g. agent-room objectives spawns
   manage-tasks) green.
6. Commit per tool: `refactor(pkm-ai): <tool>.mjs -> .ts (S5, ADR 0001)` + `Co-Authored-By: <model>`.
   ⚠️ `git mv` already stages the rename; after the typed Write, `git add` the `.ts` + caller files (do
   NOT pass the deleted `.mjs` path — it aborts the add). Verify `git diff --cached --stat` shows the
   typing insertions BEFORE committing (a bare-rename 0-change diff means the content wasn't staged).

## DEFERRED (dev-gated — do NOT start without the dev)

- **S3b prune** — clear the ~123 health fails (54 line-limit + 40 timestamp-offset + 29 parent-shape, all
  `check-doc-health --repair-residuals`-able). **BLOCKED:** 85 are in Codex's `work/hardening` (contended)
  + 1 in `current/` (status/handoff — never touch). Needs a coordinated window. Dev confirmed DEFER.
- **S6 retrieval** (ADR 0006) — local tri-layer: wikilink graph (`traverse-graph`) + BM25 (`query-docs`) +
  pluggable local embeddings (transformers.js + Orama), lifecycle-weighted, zero-API. Large/complex.
- **`.agents/state` is git-tracked** — dev should `git rm -r --cached .agents/state` + gitignore (the live
  room now lives untracked in `.git/vaultman-room`). Pre-existing **task-claim TOCTOU** in agent-room
  (read-modify-write outside `withRunLock`) worth tightening.

## Guardrails carried forward

- Branch `sandbox`; stay on it. Parallel **Codex** works stable+proto in THIS worktree → never touch
  `current/status.md` · `current/handoff.md` · `work/hardening/*` · `metrics/*`. Commit per slice; before
  each commit `git status --short` → only intended files, nothing deleted (renames OK).
- Dogfood the room: `node .agents/tools/pkm-ai/agent-room.ts agent join --run current --agent <you>
  --stream goal --json` at start; `agent leave` at exit. (Live proof it works: Codex + this agent
  converged on `room_20260604_110423_e9c65d` independently.)
- Node 24 runs `.ts` natively (type-stripping, no build). Tests = black-box `node --test test/*.test.mjs`.

## Copy-pasteable next-agent starter prompt

```
Continue the Vaultman PKM-AI orchestration upgrade on branch `sandbox` (Windows; Node 24 runs .ts
natively, no build). READ FIRST: AGENTS.md "Runtime Startup" + register presence
(node .agents/tools/pkm-ai/agent-room.ts agent join --run current --agent <you> --stream goal --json),
then .agents/docs/sessions/2026-06-05-pkm-ai-s5-checkpoint.md (this file) + the plan
.agents/docs/work/pkm-ai/plans/2026-06-04-orchestration-upgrade/index.md.

DONE: S2 (coordination) complete; S3a (lifecycle field + health checks) done; S4 (versioning v1.0.0) done;
S5 (.ts migration) STARTED — agent-room + manage-tasks migrated.

YOUR JOB: continue S5 — migrate the remaining .mjs tools to .ts in order (check-doc-health → split-shard →
update-frontmatter → query-docs → index-docs → record-metric → pkm.mjs), each via the proven per-tool
recipe in the checkpoint doc (allowJs lets .ts import the .mjs lib; lib stays .mjs). Verify per tool: tsc
stays 47, --help parity, that tool's tests green, cross-suite callers green. Commit per tool
"refactor(pkm-ai): <tool>.mjs -> .ts (S5, ADR 0001)". When S5 done: bump toolingVersion in
pkm-ai.version.json + CHANGELOG, mark S5 DONE in the plan, session-log entry.

GUARDRAILS: never touch current/status.md, current/handoff.md, work/hardening/*, metrics/* (parallel Codex).
Commit per tool; git status --short before each (only intended files; renames OK; a bare-rename 0-change
diff = content not staged, re-add the .ts). DEFERRED (do NOT start without dev): S3b doc-health prune
(123 fails, mostly Codex-contended), S6 retrieval. If blocked or the plan looks wrong, stop and ask the dev.
```
