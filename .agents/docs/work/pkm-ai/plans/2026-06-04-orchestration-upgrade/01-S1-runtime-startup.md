---
title: S1 — Runtime-startup mandate (AGENTS.md) — plan shard
type: plan-shard
status: active
parent: "[[docs/work/pkm-ai/plans/2026-06-04-orchestration-upgrade/index|orchestration-upgrade plan]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/plan
  - initiative/pkm-ai
---

# S1 — Runtime-Startup Mandate (ADR 0004)

**Goal:** Replace AGENTS.md's passive "Start Here" with a MANDATORY, numbered runtime-startup sequence that enforces presence (agent-room), retrieval-first, and the own/shared memory boundary — the visible priority hierarchy every zero-context agent runs. Docs/config change (not code) → structural verification, not unit TDD.

**Note:** AGENTS.md is the load-bearing bootloader on `sandbox`. Execution applies the change as a **diff shown to the dev for approval first** (Task 2, Step 2). Uses only tools that exist today (agent-room smoke ✓, query-docs, session-log); version.json (S4) / coordination.md (S2) are referenced + degrade gracefully until those slices land.

---

### Task 1: Compose the new "Runtime Startup" section

**Files:** none yet (draft only).

- [ ] **Step 1: Adopt this exact section** (replaces the "## Start Here" block in `AGENTS.md`):

```markdown
## Runtime Startup (MANDATORY — every agent, every new thread, in order)

Zero-context agents execute this BEFORE any work. Not advisory. Detail:
`.agents/docs/architecture/policies/coordination.md` + `.agents/docs/work/pkm-ai/adr/`.

0. **Identify** — your agent+model · git stream (goal/proto/canary=sandbox/beta=dev/stable=main) · task_size.
   If `.agents/pkm-ai.version.json` exists, read it; on a MAJOR version mismatch re-read the protocol docs.
1. **Register presence (join-or-create — deterministic; no prompt needed)** — join the workspace's CURRENT
   active run, else start one: `node .agents/tools/pkm-ai/agent-room.mjs agent join --run current --agent <id>`;
   if it reports no active run, `... run start --agent <id>` then join. Then `agent heartbeat`. **One active
   room per workspace — all agents of this project converge on it (5 agents = same room).** (ADR 0003.)
2. **Retrieval-first** — query the index for the top-k relevant docs; do NOT read the whole tree:
   `node .agents/tools/pkm-ai/query-docs.mjs <topic>`. (Lifecycle-ranked once S6 lands; ADR 0002/0006.)
3. **Route docs** — `current/status.md` + `current/handoff.md` are route indexes ONLY; read the latest
   `docs/sessions/session-log.md` entry.
4. **Memory boundary** —
   - editing SHARED memory (status/handoff/architecture/specs) → `agent-room scope claim` FIRST (resolve
     conflicts/leases);
   - your OWN working memory → your session shard `docs/sessions/<date>-<agent>.md` — never overwrite shared
     in place. (ADR 0002/0003.)
5. **Route by mode/intent** (see Session Modes below).
6. **Exit** — append a `session-log` line + `agent-room scope` release + `agent leave`.

Micro-commands (`status:` · `next:` · `qq:` · `question:` · `help:`) may take a read-only fast path but still
register presence (step 1).
```

---

### Task 2: Replace AGENTS.md "Start Here" with "Runtime Startup"

**Files:** Modify `AGENTS.md` (the "## Start Here" section).

- [ ] **Step 1: Apply the replacement.** Old block to replace:

```markdown
## Start Here

1. Read `.agents/docs/start.md`.
2. Always read `.agents/docs/current/status.md`.
3. Always read `.agents/docs/current/handoff.md`.
4. Route by the user's explicit mode or inferred intent.
5. Read only the smallest relevant docs before editing.
```

Replace with the full "## Runtime Startup" section from Task 1. (The old steps 1–3 are absorbed into new steps 1–3; step 4 → new step 5; step 5 → new step 2 "retrieval-first".)

- [ ] **Step 2: GATE — show the dev the AGENTS.md diff and get explicit approval before saving.**

- [ ] **Step 3: Keep AGENTS.md lean.** Leave Session Modes / Communication Policy / Size-And-Context / Line Limits / Branch Policy / Project Rules sections unchanged.

---

### Task 3: Point start.md at the mandate

**Files:** Modify `.agents/docs/start.md` (top, after the H1).

- [ ] **Step 1: Add this banner line** near the top of `start.md`:

```markdown
> **Before routing, run the mandatory Runtime Startup sequence in `AGENTS.md` (presence · retrieval-first · scope-claim).**
```

---

### Task 4: Verify

- [ ] **Step 1: Structural check** — confirm the sequence + tool calls are present:

Run (PowerShell): `Select-String -Path AGENTS.md -Pattern 'Runtime Startup','agent-room','scope claim','Retrieval-first','session-log'` Expected: matches for all five.

- [ ] **Step 2: Leanness** — `(@(Get-Content AGENTS.md)).Count` → expected ≤ ~140 lines.

- [ ] **Step 3: Fresh-agent dry-run** — execute step 1 as a new agent would:
`node .agents/tools/pkm-ai/agent-room.mjs run start --agent s1-verify --now 2026-06-04T12:00:00 --json` then `... status --run latest --json` → expected `agents` contains `s1-verify`.
Cleanup: `Remove-Item -Recurse -Force .agents/state/runs/<that-runId>`.

---

### Task 5: Commit

- [ ] **Step 1: Whole-worktree commit (dev-requested).** Review first, then add all:

```bash
git status --short                       # review everything going in
git add -A
git commit -m "feat(pkm-ai): orchestration upgrade — ADRs 0001-0006 + spec + plan + S1 runtime-startup mandate; onenote/companion megadump (CR-1/CR-2) + research + mind-routing audit"
```

On `sandbox` (AI files allowed; NOT main). Whole-worktree per dev request → includes this session's PKM-AI work + S1 (AGENTS.md, start.md) + pre-existing dirty (`status.md`/`handoff.md`, `.vscode`, tooling `package.json`, metrics). Surface the `git status` to the dev before committing.

## Open sub-decisions → S2 coordination
- **DECIDED (dev 2026-06-04): cross-stream SHARED room** — state-root @ `git rev-parse --git-common-dir` (shared by all worktrees); configurable for separate clones; agents tag `stream`/`worktree`. (ADR 0003.)
- S2 builds: agent-room `--state-root` resolution + atomic race-safe `ensure-run` (join-or-create, no double-room).
- S1 mechanism unchanged (deterministic join-or-create); it resolves against the shared root once S2 wires it (until then, per-worktree default).

---

## Acceptance (spec S1)
Fresh agent following AGENTS.md performs join + scope-claim + exit; AGENTS.md ≤ ~140 lines; dev approved the diff.

## Done-when
PKM-1 checked in the plan index; ready to load as an agent-room task (dogfood ADR 0003) once executed.
