import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "agent-room.ts");
const pkmPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "pkm.ts");

test("agent-room creates runs, records agents, and reports stale heartbeats", () => {
  const root = makeTempRoot();
  const start = run(root, [
    "run",
    "start",
    "--agent",
    "codex-main",
    "--title",
    "Agent room smoke",
    "--goal",
    "Coordinate parallel agents",
    "--now",
    "2026-05-11T02:00:00",
    "--json",
  ]);

  assert.equal(start.status, 0, start.stderr);
  const created = JSON.parse(start.stdout);
  assert.equal(created.ok, true);
  assert.match(created.runId, /^room_20260511_020000_/);
  assert.equal(created.status, "running");

  const manifestPath = path.join(root, ".agents", "state", "runs", created.runId, "manifest.json");
  assert.equal(fs.existsSync(manifestPath), true);
  const manifest = readJson(manifestPath);
  assert.equal(manifest.title, "Agent room smoke");
  assert.equal(manifest.goal, "Coordinate parallel agents");
  assert.deepEqual(manifest.activeAgents, ["codex-main"]);

  const joined = run(root, [
    "agent",
    "join",
    "--run",
    created.runId,
    "--agent",
    "codex-worker-a",
    "--role",
    "worker",
    "--now",
    "2026-05-11T02:01:00",
    "--json",
  ]);
  assert.equal(joined.status, 0, joined.stderr);

  const heartbeat = run(root, [
    "agent",
    "heartbeat",
    "--run",
    created.runId,
    "--agent",
    "codex-worker-a",
    "--task",
    "task_001",
    "--message",
    "Writing tests",
    "--stale-after-ms",
    "60000",
    "--now",
    "2026-05-11T02:02:00",
    "--json",
  ]);
  assert.equal(heartbeat.status, 0, heartbeat.stderr);

  const status = run(root, [
    "status",
    "--run",
    created.runId,
    "--now",
    "2026-05-11T02:04:01",
    "--json",
  ]);
  assert.equal(status.status, 0, status.stderr);
  const snapshot = JSON.parse(status.stdout);
  assert.equal(snapshot.runId, created.runId);
  assert.equal(snapshot.runStatus, "running");
  assert.deepEqual(snapshot.staleAgents.map((agent) => agent.agentId), ["codex-worker-a"]);
  assert.equal(snapshot.agents.some((agent) => agent.agentId === "codex-main"), true);

  const events = readJsonl(path.join(root, ".agents", "state", "runs", created.runId, "events.jsonl"));
  assert.deepEqual(
    events.map((event) => event.type),
    ["run.created", "agent.joined", "agent.heartbeat"],
  );
});

test("agent-room claims tasks, guards transitions by token, and detects scope conflicts", () => {
  const root = makeTempRoot();
  const runId = createRun(root);

  const add = run(root, [
    "task",
    "add",
    "--run",
    runId,
    "--agent",
    "codex-main",
    "--title",
    "Implement lock helper",
    "--scope",
    "src/components/views/ViewNodeGrid.svelte",
    "--now",
    "2026-05-11T02:05:00",
    "--json",
  ]);
  assert.equal(add.status, 0, add.stderr);
  const task = JSON.parse(add.stdout).task;
  assert.equal(task.taskId, "task_001");
  assert.equal(task.status, "todo");

  const claim = run(root, [
    "task",
    "claim",
    "--run",
    runId,
    "--agent",
    "codex-worker-a",
    "--task",
    "task_001",
    "--lease-ms",
    "900000",
    "--now",
    "2026-05-11T02:06:00",
    "--json",
  ]);
  assert.equal(claim.status, 0, claim.stderr);
  const claimed = JSON.parse(claim.stdout).task;
  assert.equal(claimed.status, "in-progress");
  assert.equal(claimed.claim.owner, "codex-worker-a");
  assert.equal(typeof claimed.claim.token, "string");

  const duplicate = run(root, [
    "task",
    "claim",
    "--run",
    runId,
    "--agent",
    "codex-worker-b",
    "--task",
    "task_001",
    "--now",
    "2026-05-11T02:07:00",
    "--json",
  ]);
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /already claimed/);

  const wrongToken = run(root, [
    "task",
    "status",
    "--run",
    runId,
    "--agent",
    "codex-worker-a",
    "--task",
    "task_001",
    "--status",
    "done",
    "--token",
    "wrong",
    "--now",
    "2026-05-11T02:08:00",
    "--json",
  ]);
  assert.notEqual(wrongToken.status, 0);
  assert.match(wrongToken.stderr, /claim token/);

  const scopeConflict = run(root, [
    "scope",
    "conflicts",
    "--run",
    runId,
    "--scope",
    "src/components/views",
    "--now",
    "2026-05-11T02:09:00",
    "--json",
  ]);
  assert.equal(scopeConflict.status, 1);
  const conflict = JSON.parse(scopeConflict.stdout);
  assert.equal(conflict.ok, false);
  assert.equal(conflict.conflicts[0].owner, "codex-worker-a");

  const release = run(root, [
    "task",
    "release",
    "--run",
    runId,
    "--agent",
    "codex-worker-a",
    "--task",
    "task_001",
    "--token",
    claimed.claim.token,
    "--now",
    "2026-05-11T02:10:00",
    "--json",
  ]);
  assert.equal(release.status, 0, release.stderr);
  assert.equal(JSON.parse(release.stdout).task.claim, undefined);
});

test("agent-room supports mailbox send, read, and ack for run and task messages", () => {
  const root = makeTempRoot();
  const runId = createRun(root);
  addTask(root, runId, "Coordinate mailbox", "docs/work/pkm-ai/index.md");

  const runMessage = run(root, [
    "mailbox",
    "send",
    "--run",
    runId,
    "--agent",
    "codex-main",
    "--to",
    "codex-worker-a",
    "--body",
    "Pause before touching docs",
    "--now",
    "2026-05-11T02:11:00",
    "--json",
  ]);
  assert.equal(runMessage.status, 0, runMessage.stderr);

  const taskMessage = run(root, [
    "mailbox",
    "send",
    "--run",
    runId,
    "--agent",
    "codex-main",
    "--task",
    "task_001",
    "--to",
    "codex-worker-a",
    "--body",
    "Task scoped note",
    "--now",
    "2026-05-11T02:12:00",
    "--json",
  ]);
  assert.equal(taskMessage.status, 0, taskMessage.stderr);

  const read = run(root, ["mailbox", "read", "--run", runId, "--agent", "codex-worker-a", "--json"]);
  assert.equal(read.status, 0, read.stderr);
  const messages = JSON.parse(read.stdout).messages;
  assert.equal(messages.length, 2);
  assert.deepEqual(messages.map((message) => message.body), ["Pause before touching docs", "Task scoped note"]);

  const ack = run(root, [
    "mailbox",
    "ack",
    "--run",
    runId,
    "--agent",
    "codex-worker-a",
    "--message",
    messages[0].messageId,
    "--now",
    "2026-05-11T02:13:00",
    "--json",
  ]);
  assert.equal(ack.status, 0, ack.stderr);
  assert.equal(JSON.parse(ack.stdout).delivery.messages[messages[0].messageId], "acknowledged");
});

test("agent-room imports objectives and syncs claimed task state through manage-tasks", () => {
  const root = makeTempRoot();
  const runId = createRun(root);
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "example", "index.md"),
    `---
title: Example plan
type: implementation-plan-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T10:00:00
updated: 2026-05-10T10:00:00
tags:
  - agent/plan
---

# Example Plan

- [ ] Bridge objective #pkm-ai/objective/bridge-objective
`,
  );

  const imported = run(root, [
    "objectives",
    "import",
    "--run",
    runId,
    "--agent",
    "codex-main",
    "--initiative",
    "pkm-ai",
    "--status",
    "todo",
    "--now",
    "2026-05-11T02:14:00",
    "--json",
  ]);
  assert.equal(imported.status, 0, imported.stderr);
  const importedTasks = JSON.parse(imported.stdout).tasks;
  assert.equal(importedTasks.length, 1);
  assert.equal(importedTasks[0].objectiveId, "bridge-objective");

  const claim = run(root, [
    "task",
    "claim",
    "--run",
    runId,
    "--agent",
    "codex-main",
    "--task",
    importedTasks[0].taskId,
    "--now",
    "2026-05-11T02:15:00",
    "--json",
  ]);
  assert.equal(claim.status, 0, claim.stderr);
  const token = JSON.parse(claim.stdout).task.claim.token;

  const taskStatus = run(root, [
    "task",
    "status",
    "--run",
    runId,
    "--agent",
    "codex-main",
    "--task",
    importedTasks[0].taskId,
    "--status",
    "blocked",
    "--token",
    token,
    "--now",
    "2026-05-11T02:16:00",
    "--json",
  ]);
  assert.equal(taskStatus.status, 0, taskStatus.stderr);

  const synced = run(root, [
    "objectives",
    "sync",
    "--run",
    runId,
    "--agent",
    "codex-main",
    "--task",
    importedTasks[0].taskId,
    "--token",
    token,
    "--now",
    "2026-05-11T02:17:00",
    "--json",
  ]);
  assert.equal(synced.status, 0, synced.stderr);
  const updated = fs.readFileSync(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "example", "index.md"),
    "utf8",
  );
  assert.match(updated, /- \[!\] Bridge objective #pkm-ai\/objective\/bridge-objective/);
});

test("agent-room rejects scopes that escape the workspace", () => {
  const root = makeTempRoot();
  const runId = createRun(root);
  addTask(root, runId, "Unsafe scope", "docs/work/pkm-ai/index.md");

  const result = run(root, [
    "scope",
    "claim",
    "--run",
    runId,
    "--agent",
    "codex-main",
    "--task",
    "task_001",
    "--scope",
    "..\\outside.md",
    "--json",
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /outside workspace/);
});

test("agent-room comfort layer resolves latest run, dashboard, handoff, and pkm room wrapper", () => {
  const root = makeTempRoot();
  const runId = createRun(root);
  const task = addTask(root, runId, "Comfort layer task", ".agents/tools/pkm-ai/agent-room.mjs");
  const claim = run(root, [
    "task",
    "claim",
    "--run",
    runId,
    "--agent",
    "codex-main",
    "--task",
    task.taskId,
    "--now",
    "2026-05-11T02:20:00",
    "--json",
  ]);
  assert.equal(claim.status, 0, claim.stderr);

  const statusWithoutRun = run(root, ["status", "--json"]);
  assert.equal(statusWithoutRun.status, 0, statusWithoutRun.stderr);
  assert.equal(JSON.parse(statusWithoutRun.stdout).runId, runId);

  const dashboard = run(root, ["dashboard"]);
  assert.equal(dashboard.status, 0, dashboard.stderr);
  assert.match(dashboard.stdout, new RegExp(`Run ${runId} \\[running\\]`));
  assert.match(dashboard.stdout, /Comfort layer task/);

  const handoff = run(root, ["handoff"]);
  assert.equal(handoff.status, 0, handoff.stderr);
  assert.match(handoff.stdout, /## Agent Room Handoff/);
  assert.match(handoff.stdout, new RegExp(`- Run: ${runId}`));
  assert.match(handoff.stdout, /task_001 \[in-progress\] owner=codex-main/);

  const wrapped = spawnSync(process.execPath, [pkmPath, "room", "status", "--json"], { cwd: root, encoding: "utf8" });
  assert.equal(wrapped.status, 0, wrapped.stderr);
  assert.equal(JSON.parse(wrapped.stdout).runId, runId);
});

// --- S2 Task 1: cross-worktree state-root resolution -------------------------------------------

test("run honors --state-root and routes every write to the shared root (outside cwd)", () => {
  const cwd = makeTempRoot();
  const shared = path.join(makeTempRoot(), "shared-room"); // outside cwd, not yet existing
  const sr = ["--state-root", shared];

  const start = run(cwd, ["run", "start", "--agent", "A", "--title", "Shared", "--now", "2026-06-04T03:00:00", ...sr, "--json"]);
  assert.equal(start.status, 0, start.stderr);
  const runId = JSON.parse(start.stdout).runId;
  assert.equal(fs.existsSync(path.join(shared, "runs", runId, "manifest.json")), true);
  // nothing leaked to the per-worktree default location
  assert.equal(fs.existsSync(path.join(cwd, ".agents", "state")), false);

  const join = run(cwd, ["agent", "join", "--run", runId, "--agent", "B", "--now", "2026-06-04T03:01:00", ...sr, "--json"]);
  assert.equal(join.status, 0, join.stderr);
  assert.equal(fs.existsSync(path.join(shared, "runs", runId, "agents", "B", "status.json")), true);

  const add = run(cwd, ["task", "add", "--run", runId, "--agent", "A", "--title", "T", "--now", "2026-06-04T03:02:00", ...sr, "--json"]);
  assert.equal(add.status, 0, add.stderr);

  const send = run(cwd, ["mailbox", "send", "--run", runId, "--agent", "A", "--to", "B", "--body", "hi", "--now", "2026-06-04T03:03:00", ...sr, "--json"]);
  assert.equal(send.status, 0, send.stderr);

  const status = run(cwd, ["status", "--run", runId, "--now", "2026-06-04T03:04:00", ...sr, "--json"]);
  assert.equal(status.status, 0, status.stderr);
  const snap = JSON.parse(status.stdout);
  assert.equal(snap.runId, runId);
  assert.equal(snap.tasks.length, 1);
  assert.equal(snap.unreadMessages.length, 1);
  assert.equal(fs.existsSync(path.join(shared, "runs", runId, "events.jsonl")), true);
});

test("VAULTMAN_ROOM_STATE_ROOT env routes writes when no flag is given", () => {
  const cwd = makeTempRoot();
  const shared = path.join(makeTempRoot(), "env-room");
  const start = runEnv(cwd, ["run", "start", "--agent", "A", "--now", "2026-06-04T03:00:00", "--json"], { VAULTMAN_ROOM_STATE_ROOT: shared });
  assert.equal(start.status, 0, start.stderr);
  const runId = JSON.parse(start.stdout).runId;
  assert.equal(fs.existsSync(path.join(shared, "runs", runId, "manifest.json")), true);
});

test("--state-root beats VAULTMAN_ROOM_STATE_ROOT", () => {
  const cwd = makeTempRoot();
  const flagRoot = path.join(makeTempRoot(), "flag-room");
  const envRoot = path.join(makeTempRoot(), "env-room");
  const start = runEnv(
    cwd,
    ["run", "start", "--agent", "A", "--state-root", flagRoot, "--now", "2026-06-04T03:00:00", "--json"],
    { VAULTMAN_ROOM_STATE_ROOT: envRoot },
  );
  assert.equal(start.status, 0, start.stderr);
  const runId = JSON.parse(start.stdout).runId;
  assert.equal(fs.existsSync(path.join(flagRoot, "runs", runId, "manifest.json")), true);
  assert.equal(fs.existsSync(path.join(envRoot, "runs")), false);
});

test("resolves git --git-common-dir to .git/vaultman-room (shared across worktrees)", () => {
  const repo = makeTempRoot();
  initGitRepo(repo);
  const start = run(repo, ["run", "start", "--agent", "A", "--now", "2026-06-04T03:00:00", "--json"]);
  assert.equal(start.status, 0, start.stderr);
  const runId = JSON.parse(start.stdout).runId;
  assert.equal(fs.existsSync(path.join(repo, ".git", "vaultman-room", "runs", runId, "manifest.json")), true);
  assert.equal(fs.existsSync(path.join(repo, ".agents", "state", "runs", runId)), false);
});

test("VAULTMAN_ROOM_STATE_ROOT beats git --git-common-dir", () => {
  const repo = makeTempRoot();
  initGitRepo(repo);
  const envRoot = path.join(makeTempRoot(), "env-room");
  const start = runEnv(repo, ["run", "start", "--agent", "A", "--now", "2026-06-04T03:00:00", "--json"], { VAULTMAN_ROOM_STATE_ROOT: envRoot });
  assert.equal(start.status, 0, start.stderr);
  const runId = JSON.parse(start.stdout).runId;
  assert.equal(fs.existsSync(path.join(envRoot, "runs", runId, "manifest.json")), true);
  assert.equal(fs.existsSync(path.join(repo, ".git", "vaultman-room", "runs", runId)), false);
});

// --- S2 Task 2: atomic ensure-run (deterministic join-or-create, no double-room) --------------

test("agent join --run current creates a run, then a second join --run current reuses it", () => {
  const cwd = makeTempRoot();
  const shared = path.join(makeTempRoot(), "ensure-room");
  const sr = ["--state-root", shared];

  const j1 = run(cwd, ["agent", "join", "--run", "current", "--agent", "A", ...sr, "--now", "2026-06-04T03:00:00", "--json"]);
  assert.equal(j1.status, 0, j1.stderr);
  const list1 = JSON.parse(run(cwd, ["run", "list", ...sr, "--json"]).stdout).runs;
  assert.equal(list1.length, 1);
  const runId = list1[0].runId;

  const j2 = run(cwd, ["agent", "join", "--run", "current", "--agent", "B", ...sr, "--now", "2026-06-04T03:01:00", "--json"]);
  assert.equal(j2.status, 0, j2.stderr);
  const list2 = JSON.parse(run(cwd, ["run", "list", ...sr, "--json"]).stdout).runs;
  assert.equal(list2.length, 1, "second join --run current must NOT create a second room");

  const snap = JSON.parse(run(cwd, ["status", "--run", runId, ...sr, "--now", "2026-06-04T03:02:00", "--json"]).stdout);
  assert.deepEqual(snap.agents.map((a) => a.agentId).sort(), ["A", "B"]);
});

test("run ensure creates once (created:true) then reuses (created:false)", () => {
  const cwd = makeTempRoot();
  const shared = path.join(makeTempRoot(), "ensure-room");
  const sr = ["--state-root", shared];

  const e1 = JSON.parse(run(cwd, ["run", "ensure", "--agent", "A", ...sr, "--now", "2026-06-04T03:00:00", "--json"]).stdout);
  assert.equal(e1.ok, true);
  assert.equal(e1.created, true);

  const e2 = JSON.parse(run(cwd, ["run", "ensure", "--agent", "A", ...sr, "--now", "2026-06-04T03:01:00", "--json"]).stdout);
  assert.equal(e2.created, false);
  assert.equal(e2.runId, e1.runId);
});

test("concurrent agent join --run current never double-rooms (workspace lock)", async () => {
  const cwd = makeTempRoot();
  const shared = path.join(makeTempRoot(), "race-room");
  const sr = ["--state-root", shared];
  const agents = ["A", "B", "C", "D", "E"];

  const results = await Promise.all(
    agents.map((agent) => runAsync(cwd, ["agent", "join", "--run", "current", "--agent", agent, ...sr, "--json"])),
  );
  for (const result of results) assert.equal(result.status, 0, result.stderr);

  const runs = JSON.parse(run(cwd, ["run", "list", ...sr, "--json"]).stdout).runs;
  assert.equal(runs.length, 1, "race must collapse to exactly ONE room");
  const runId = runs[0].runId;
  for (const agent of agents) {
    assert.equal(
      fs.existsSync(path.join(shared, "runs", runId, "agents", agent, "status.json")),
      true,
      `agent ${agent} must have joined the single shared room`,
    );
  }
});

// --- S2: task dependsOn (poll-based coordination) ---------------------------------------------

test("task add --depends-on records dependencies surfaced in status and dashboard", () => {
  const root = makeTempRoot();
  const runId = createRun(root);
  const upstream = addTask(root, runId, "Upstream", "docs/a.md"); // task_001

  const dependent = run(root, ["task", "add", "--run", runId, "--agent", "codex-main", "--title", "Downstream", "--depends-on", upstream.taskId, "--now", "2026-05-11T02:06:00", "--json"]);
  assert.equal(dependent.status, 0, dependent.stderr);
  const task = JSON.parse(dependent.stdout).task;
  assert.deepEqual(task.dependsOn, [upstream.taskId]);

  const snap = JSON.parse(run(root, ["status", "--run", runId, "--now", "2026-05-11T02:07:00", "--json"]).stdout);
  const found = snap.tasks.find((entry) => entry.taskId === task.taskId);
  assert.deepEqual(found.dependsOn, [upstream.taskId]);

  const dash = run(root, ["dashboard", "--run", runId, "--now", "2026-05-11T02:07:30"]);
  assert.match(dash.stdout, new RegExp(`${task.taskId}.*depends=${upstream.taskId}`));
});

// --- S2 Task 3: stream / worktree agent tags --------------------------------------------------

test("agent join records stream + worktree tags and surfaces them in status/dashboard", () => {
  const root = makeTempRoot();
  const runId = createRun(root);

  const joined = run(root, ["agent", "join", "--run", runId, "--agent", "smoke-opus", "--stream", "goal", "--worktree", "sandbox", "--now", "2026-05-11T02:01:00", "--json"]);
  assert.equal(joined.status, 0, joined.stderr);
  const agent = JSON.parse(joined.stdout).agent;
  assert.equal(agent.stream, "goal");
  assert.equal(agent.worktree, "sandbox");

  const snap = JSON.parse(run(root, ["status", "--run", runId, "--now", "2026-05-11T02:02:00", "--json"]).stdout);
  const found = snap.agents.find((entry) => entry.agentId === "smoke-opus");
  assert.equal(found.stream, "goal");
  assert.equal(found.worktree, "sandbox");

  const dash = run(root, ["dashboard", "--run", runId, "--now", "2026-05-11T02:02:30"]);
  assert.match(dash.stdout, /smoke-opus \[goal @ sandbox\]/);

  // worktree auto-defaults (from git toplevel basename, else cwd basename) when not supplied
  const auto = JSON.parse(run(root, ["agent", "join", "--run", runId, "--agent", "auto-wt", "--now", "2026-05-11T02:03:00", "--json"]).stdout).agent;
  assert.equal(typeof auto.worktree, "string");
  assert.ok(auto.worktree.length > 0);
});

function createRun(root) {
  const result = run(root, [
    "run",
    "start",
    "--agent",
    "codex-main",
    "--title",
    "Test run",
    "--goal",
    "Test coordination",
    "--now",
    "2026-05-11T02:00:00",
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).runId;
}

function addTask(root, runId, title, scope) {
  const result = run(root, [
    "task",
    "add",
    "--run",
    runId,
    "--agent",
    "codex-main",
    "--title",
    title,
    "--scope",
    scope,
    "--now",
    "2026-05-11T02:05:00",
    "--json",
  ]);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).task;
}

function run(root, args) {
  return spawnSync(process.execPath, [toolPath, ...args], { cwd: root, encoding: "utf8" });
}

function runEnv(cwd, args, env) {
  return spawnSync(process.execPath, [toolPath, ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } });
}

function initGitRepo(dir) {
  const opts = { cwd: dir, encoding: "utf8" };
  spawnSync("git", ["init", "-q"], opts);
  spawnSync("git", ["config", "user.email", "test@example.com"], opts);
  spawnSync("git", ["config", "user.name", "Test"], opts);
}

function runAsync(cwd, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [toolPath, ...args], { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => resolve({ status: -1, stdout, stderr: String(error) }));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-agent-room-"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
