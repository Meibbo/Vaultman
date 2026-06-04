---
title: S2 — coordination conventions + cross-stream shared room — plan shard
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

# S2 — Coordination Conventions + Cross-Stream Shared Room (ADR 0003)

**Goal:** make agent-room the real cross-stream shared brain: state-root resolvable to the git common dir
(shared by all worktrees), atomic `ensure-run` (deterministic join-or-create, no double-room), `stream`/
`worktree` agent tags, + a `coordination.md` policy. Recommend executing **subagent-driven** (clean context
for agent-room code).

**S2 ↔ S5 coupling (decision):** we heavily edit `agent-room` here → migrate it to `.ts` FIRST (S5's first
script, ADR 0001) and write the new logic typed, instead of editing `.mjs` then re-typing. Task 0 below.

**Internals (verified):** `resolveRunPaths(cwd,runId)` hardcodes `stateRoot = path.join(cwd,".agents","state")`
(agent-room ~L681). Lock primitive exists (~L739–754: `writeJsonAtomic(lockPath,{pid,createdAt,host})` +
age-stale + unlink). `spawnSync` already imported. `latestRunId(cwd)` finds the newest run. Manifest has
`workspace`, `activeAgents`; agent records live per-run.

**Test convention (verified 2026-06-04):** runner = `node --test "test/*.test.mjs"` (node:test +
node:assert/strict). Style = **black-box subprocess** like `test/split-shard.test.mjs` (spawn the CLI via
`process.execPath` + tool path, assert stdout JSON + state files) — NOT unit-import. Test files stay `.mjs`
(they spawn `agent-room.ts`). The inline `.ts`/import test snippets below are ILLUSTRATIVE — implement them
black-box per this convention (export a pure helper only if a focused unit test genuinely needs it). Test
file: `test/agent-room.test.mjs`.

**Files:**
- Rename: `.agents/tools/pkm-ai/agent-room.mjs` → `agent-room.ts`
- Create: `.agents/tools/pkm-ai/tsconfig.json` · `.agents/tools/pkm-ai/test/agent-room.test.ts`
- Create: `.agents/docs/architecture/policies/coordination.md`
- Modify: `AGENTS.md` (already links coordination.md — verify)

---

### Task 0: Migrate agent-room → `.ts` (ADR 0001 / S5 first script)

- [ ] **Step 1: baseline** — capture current output:
`node .agents/tools/pkm-ai/agent-room.mjs --help > .tmp-agentroom-help.txt` (keep for parity diff).
- [ ] **Step 2: tsconfig** — create `.agents/tools/pkm-ai/tsconfig.json`:

```json
{ "compilerOptions": { "module": "nodenext", "target": "es2023", "strict": true,
  "erasableSyntaxOnly": true, "allowImportingTsExtensions": true, "noEmit": true, "checkJs": false } }
```

- [ ] **Step 3:** `git mv agent-room.mjs agent-room.ts`. Add erasable types only (annotations / `interface` /
  `import type`) — NO enums/namespaces/parameter-properties. Update internal imports to `.ts` extensions.
- [ ] **Step 4: parity** — `node .agents/tools/pkm-ai/agent-room.ts --help` matches the baseline; re-run the
  smoke (run start/status/leave) → same JSON shape. Commit `refactor(pkm-ai): agent-room.mjs -> .ts (ADR 0001)`.

**✅ DONE 2026-06-04 — commit `fce12fb`.** Parity identical · 35 tests green · erasable-clean. Also updated 2
live references (correct, necessary): `pkm.mjs` room map + `test/agent-room.test.mjs` toolPath. Nit: `--help`
usage text still prints `agent-room.mjs` (cosmetic) → micro-fix in a later task.

---

### Task 1: Cross-worktree state-root resolution

**Files:** `agent-room.ts` (add `resolveStateRoot`; use it in `resolveRunPaths`). Test: `test/agent-room.test.ts`.

- [ ] **Step 1: failing test** (node:test — match the runner used by `test/split-shard.test.mjs`):

```ts
import { test } from "node:test"; import assert from "node:assert/strict";
import { resolveStateRoot } from "../agent-room.ts";
test("explicit --state-root wins", () => {
  assert.equal(resolveStateRoot("/repo", { "state-root": "/shared/x" }), "/shared/x");
});
test("falls back to cwd/.agents/state when not git + no override", () => {
  assert.match(resolveStateRoot("/not-a-repo", {}), /[\\/]\.agents[\\/]state$/);
});
```

- [ ] **Step 2: implement** `resolveStateRoot(cwd, args)` (export it):

```ts
export function resolveStateRoot(cwd: string, args: Record<string, unknown>): string {
  if (args["state-root"]) return path.resolve(String(args["state-root"]));
  if (process.env.VAULTMAN_ROOM_STATE_ROOT) return path.resolve(process.env.VAULTMAN_ROOM_STATE_ROOT);
  try {
    const r = spawnSync("git", ["rev-parse", "--git-common-dir"], { cwd, encoding: "utf8" });
    if (r.status === 0 && r.stdout.trim()) {
      return path.join(path.resolve(cwd, r.stdout.trim()), "vaultman-room"); // shared across worktrees
    }
  } catch { /* not a git repo */ }
  return path.join(cwd, ".agents", "state");
}
```

- [ ] **Step 3:** in `resolveRunPaths`, replace `const stateRoot = path.join(cwd, ".agents", "state")` with
  `const stateRoot = resolveStateRoot(cwd, context.args)` (thread `args` through; `resolveRunPaths` callers
  pass the context/args). Run tests → pass. Commit.

---

### Task 2: Atomic `ensure-run` (deterministic join-or-create, no double-room)

**Files:** `agent-room.ts` (new `run ensure` action / `ensure-run`). Reuse the lock primitive at a
**workspace-level lock** (`<stateRoot>/ensure.lock`).

- [ ] **Step 1: failing test:**

```ts
test("two concurrent ensure -> ONE run", async () => {
  const root = mkTmpStateRoot();
  const [a, b] = await Promise.all([ ensureRun(root, "agentA"), ensureRun(root, "agentB") ]);
  assert.equal(a.runId, b.runId);                 // same room
});
```

- [ ] **Step 2: implement** `ensureRun(stateRoot, agentId, now)`:
  1. acquire workspace lock `<stateRoot>/ensure.lock` (reuse `writeJsonAtomic` + age-stale logic; spin/wait
     briefly if held; steal if stale per existing rule);
  2. resolve current active run = newest run in `<stateRoot>/runs` whose `status === "running"` and not stale;
  3. if found → join it; else → `run start` (create) then join;
  4. release lock (unlink). Return `{ runId }`.
  Wire `agent join --run current` to call `ensureRun` when no explicit run is given.

- [ ] **Step 3:** run tests → pass. Commit.

---

### Task 3: `stream` / `worktree` agent tags

**Files:** `agent-room.ts` (agent record in `handleAgent` join/heartbeat). Test: `test/agent-room.test.ts`.

- [ ] **Step 1: failing test:** joining with `--stream goal` stores `stream:"goal"` + a `worktree` on the
  agent record; `status --json` returns them.
- [ ] **Step 2: implement:** read `--stream` (string) + `--worktree` (default: `spawnSync('git',['rev-parse',
  '--show-toplevel'])` basename, else `path.basename(cwd)`); store on the agent object; surface in `status`/
  `dashboard` (e.g. `smoke-opus [goal @ sandbox]`). Run tests → pass. Commit.

---

### Task 4: `coordination.md` policy

**Files:** Create `.agents/docs/architecture/policies/coordination.md` (frontmatter: type policy, parent
pkm-ai). Content (sections): **shared-brain model** (peers, no master; ADR 0003) · **room resolution**
(`--run current` → `ensureRun`; state-root = git-common-dir; one room per project) · **presence**
(join+heartbeat; stale lease) · **memory boundary** (scope-claim shared / own session-shard) · **dependencies**
(`task ... --depends-on <id>`; B polls A each turn; waiting/blocked statuses) · **messaging** (`mailbox send
--to --body`; read/ack) · **poll-at-turn-boundary** (CLI ≠ sockets; semi-real-time) · **stream/worktree tags**.

- [ ] **Step 1:** write the policy (each section = the concrete command + rule). Commit.

---

### Task 5: Verify AGENTS.md link
- [ ] AGENTS.md step-1/Detail already points to `coordination.md` (from S1). Confirm the link resolves now
  that the file exists. No edit unless missing.

---

### Task 6: Cross-worktree verification

- [ ] **Step 1:** create a throwaway second worktree: `git worktree add ../vm-s2-test sandbox`.
- [ ] **Step 2:** from BOTH trees run `agent join --run current --agent A` (tree1, `--stream goal`) and
  `--agent B` (tree2, `--stream stable`) → assert **same runId** (shared room via common-dir).
- [ ] **Step 3:** `task add` in tree1; `task claim --depends-on` in tree2; `status` shows both agents +
  the dependency. `mailbox send --to A --body hi` from tree2 → `mailbox read` in tree1.
- [ ] **Step 4:** cleanup — `git worktree remove ../vm-s2-test`; remove the test run dir.

---

### Task 7: Commit
- [ ] `git add -A && git commit -m "feat(pkm-ai): cross-stream shared room + coordination policy (S2, ADR 0003)"`
  (+ `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`).

## Acceptance (spec S2)
Agents in different worktrees land in ONE room (common-dir state-root); `ensure-run` never double-rooms;
`dependsOn` + poll works; `coordination.md` documents it; agent-room runs as `.ts`.

## Notes
- Recommend **subagent-driven** execution (fresh context for agent-room.ts).
- Confirm the test runner matches `test/split-shard.test.mjs` (node:test vs vitest) before Task 1.
