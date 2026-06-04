#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { SpawnSyncReturns } from "node:child_process";

type Json = unknown;

interface CliArgs {
  _: string[];
  [key: string]: string | string[] | boolean | undefined;
}

interface Context {
  cwd: string;
  stateRoot: string;
  args: CliArgs;
  now: string;
}

interface RunPaths {
  stateRoot: string;
  runRoot: string;
  locksRoot: string;
  artifactsRoot: string;
  agentsRoot: string;
  manifestPath: string;
  tasksPath: string;
  eventsPath: string;
  lockPath: string;
}

interface Manifest {
  schemaVersion: number;
  runId: string;
  title: string;
  goal: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  workspace?: string;
  source?: { kind: string };
  activeAgents?: string[];
  summary?: string;
  stateRoot?: string;
}

interface AgentStatus {
  agentId: string;
  displayName?: string;
  role?: string;
  status?: string;
  currentTaskId?: string;
  lastHeartbeatAt?: string;
  staleAfterMs?: number;
  activeScopes?: Scope[];
  lastMessage?: string;
}

interface Scope {
  kind: string;
  name?: string;
  path?: string;
}

interface Claim {
  owner: string;
  token: string;
  claimedAt: string;
  leasedUntil: string;
}

interface Task {
  taskId: string;
  objectiveId?: string;
  objectivePath?: string;
  objectiveLine?: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  dependsOn: string[];
  scope?: Scope[];
  notes?: string;
  claim?: Claim;
}

interface RoomEvent {
  type: string;
  runId?: string;
  taskId?: string;
  agentId?: string;
  message?: string;
  time: string;
  data?: Record<string, Json>;
}

interface MailboxMessage {
  messageId: string;
  runId: string;
  taskId?: string;
  direction: string;
  from: string;
  to: string;
  body: string;
  createdAt: string;
  status: string;
  kind: string;
  priority: string;
  deliveryMode: string;
}

interface Delivery {
  messages: Record<string, string>;
  updatedAt: string;
}

interface Objective {
  objective: string;
  path?: string;
  line?: number;
  description: string;
  status: string;
}

interface ScopeConflict {
  scope?: string;
  existingScope?: string;
  owner: string;
  taskId: string;
  leasedUntil: string;
}

interface InternalScopeConflict {
  leftTaskId: string;
  rightTaskId: string;
  scope?: string;
}

interface ActiveClaim {
  taskId: string;
  owner: string;
  leasedUntil: string;
  scopes: Scope[];
}

interface StatusSnapshot {
  runId: string;
  runStatus: string;
  agents: AgentStatus[];
  tasks: Task[];
  activeClaims: ActiveClaim[];
  staleAgents: AgentStatus[];
  scopeConflicts: InternalScopeConflict[];
  unreadMessages: MailboxMessage[];
}

const TERMINAL_TASK_STATUSES = new Set(["done", "failed", "cancelled", "skipped"]);
const LOCK_STALE_MS = 60000;
const LOCK_WAIT_TIMEOUT_MS = 120000;
const OBJECTIVE_STATUS_MAP: Record<string, string> = {
  todo: "todo",
  "in-progress": "in-progress",
  waiting: "on-hold",
  blocked: "blocked",
  question: "question",
  done: "done",
  failed: "blocked",
  cancelled: "cancelled",
  skipped: "on-hold",
};

const HELP = `Usage: node .agents/tools/pkm-ai/agent-room.ts <resource> <action> [options]

Resources:
  run start|list|status|ensure
  agent join|heartbeat|leave
  task add|claim|status|release
  scope claim|conflicts
  mailbox send|read|ack
  objectives list|import|sync
  status
  dashboard
  handoff

Global options:
  --run <runId|latest|current>
  --agent <agentId>
  --json
  --now <YYYY-MM-DDTHH:mm:ss>
  --lease-ms <ms>
  --force
  --state-root <dir>   shared room state root (default: <git-common-dir>/vaultman-room, else cwd/.agents/state)
`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) return print(HELP);

  try {
    const context = createContext(process.cwd(), args);
    const [resource, action] = args._;

    if (resource === "status") return handleStatus(context);
    if (resource === "dashboard") return handleStatus(context);
    if (resource === "handoff") return handleHandoff(context);
    if (resource === "start") return handleRun(context, "start");
    if (resource === "list") return handleRun(context, "list");
    if (resource === "run") return handleRun(context, action);
    if (resource === "agent") return handleAgent(context, action);
    if (resource === "task") return handleTask(context, action);
    if (resource === "scope") return handleScope(context, action);
    if (resource === "mailbox") return handleMailbox(context, action);
    if (resource === "objectives") return handleObjectives(context, action);

    throw new CliError(`unknown resource: ${resource}`, 2);
  } catch (error) {
    if (error instanceof ConflictResult) {
      writeOutput(args, { ok: false, conflicts: error.conflicts });
      process.exit(1);
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(error instanceof CliError ? error.exitCode : 1);
  }
}

function handleRun(context: Context, action: string | undefined): void {
  if (action === "start") {
    requireOption(context.args, "agent");
    const manifest = createRun(context);
    writeOutput(context.args, { ok: true, runId: manifest.runId, status: manifest.status, stateRoot: manifest.stateRoot });
    return;
  }

  if (action === "ensure") {
    requireOption(context.args, "agent");
    const ensured = ensureRun(context);
    const manifest = loadManifest(context.stateRoot, ensured.runId);
    writeOutput(context.args, { ok: true, runId: ensured.runId, created: ensured.created, status: manifest?.status ?? "running" });
    return;
  }

  if (action === "list") {
    fs.mkdirSync(path.join(context.stateRoot, "runs"), { recursive: true });
    const runsRoot = path.join(context.stateRoot, "runs");
    const runs = fs
      .readdirSync(runsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => loadManifest(context.stateRoot, entry.name))
      .filter(Boolean);
    writeOutput(context.args, { ok: true, runs });
    return;
  }

  if (action === "status") {
    const manifest = loadRequiredManifest(context);
    requireOption(context.args, "agent");
    const status = requiredValue(context.args, "status");
    const next = { ...manifest, status, updatedAt: context.now, summary: context.args.reason ?? manifest.summary };
    withRunLock(context, manifest.runId, () => {
      writeJsonAtomic(resolveRunPaths(context.stateRoot, manifest.runId).manifestPath, next, context.stateRoot);
      appendEvent(resolveRunPaths(context.stateRoot, manifest.runId).eventsPath, context.stateRoot, {
        type: "run.status_changed",
        runId: manifest.runId,
        agentId: context.args.agent,
        message: `Run status changed to ${status}`,
        time: context.now,
        data: { status, reason: context.args.reason },
      });
    });
    writeOutput(context.args, { ok: true, run: next });
    return;
  }

  throw new CliError(`unknown run action: ${action}`, 2);
}

// Create a fresh run (manifest + tasks + run.created event + creator agent status). Extracted from
// `run start` so `ensureRun` can reuse the exact same creation path.
function createRun(context: Context) {
  const runId = createRunId(context.now);
  const paths = resolveRunPaths(context.stateRoot, runId);
  fs.mkdirSync(paths.runRoot, { recursive: true });
  fs.mkdirSync(paths.agentsRoot, { recursive: true });
  fs.mkdirSync(paths.artifactsRoot, { recursive: true });
  fs.mkdirSync(paths.locksRoot, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    runId,
    title: context.args.title ?? runId,
    goal: context.args.goal ?? "",
    status: "running",
    createdAt: context.now,
    updatedAt: context.now,
    createdBy: context.args.agent,
    workspace: toPosixPath(context.cwd),
    source: { kind: "agent-room" },
    activeAgents: [context.args.agent],
    summary: context.args.summary ?? "",
    stateRoot: toPosixPath(path.relative(context.cwd, paths.runRoot)),
  };
  writeJsonAtomic(paths.manifestPath, manifest, context.stateRoot);
  writeJsonAtomic(paths.tasksPath, [], context.stateRoot);
  appendEvent(paths.eventsPath, context.stateRoot, {
    type: "run.created",
    runId,
    agentId: context.args.agent,
    message: `Run created by ${context.args.agent}`,
    time: context.now,
    data: { title: manifest.title, goal: manifest.goal },
  });
  writeAgentStatus(context, manifest, {
    agentId: context.args.agent,
    displayName: context.args.agent,
    role: "coordinator",
    status: "active",
    lastHeartbeatAt: context.now,
    staleAfterMs: numberOption(context.args, "staleAfterMs", 300000),
    activeScopes: [],
    lastMessage: "run started",
  });
  return manifest;
}

// Deterministic join-or-create: under a workspace-level lock, find the newest running run for this
// state root, else create one. The lock spans find+create so concurrent agents never produce two
// rooms for the same workspace (ADR 0003 — "one active room per project; 5 agents = same room").
function ensureRun(context: Context): { runId: string; created: boolean } {
  return withEnsureLock(context, () => {
    const existing = findActiveRunId(context.stateRoot);
    if (existing) return { runId: existing, created: false };
    return { runId: createRun(context).runId, created: true };
  });
}

// Newest run still marked "running". Runs are long-lived and closed explicitly (`run status`); agent
// liveness is tracked per-agent via heartbeat leases, NOT per-run — so an idle running room is
// deliberately not treated as stale here. Joining the existing room is what keeps every agent in ONE.
function findActiveRunId(stateRoot: string): string | undefined {
  const runsRoot = path.join(stateRoot, "runs");
  if (!fs.existsSync(runsRoot)) return undefined;
  const running = fs
    .readdirSync(runsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => loadManifest(stateRoot, entry.name))
    .filter((manifest): manifest is Manifest => manifest !== undefined && manifest.status === "running")
    .sort((a, b) => String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt)));
  return running[0]?.runId;
}

// Workspace-level lock for ensureRun, built on the shared cooperative file lock below.
function withEnsureLock<T>(context: Context, fn: () => T): T {
  return withFileLock(path.join(context.stateRoot, "ensure.lock"), context.now, Boolean(context.args.force), fn);
}

// Generic cooperative file lock. Acquires with an atomic O_EXCL create (only one writer wins), WAITS
// for the holder if contended (spin), and steals a stale/abandoned lock. Both the per-run lock
// (withRunLock) and the workspace ensure lock use it, so concurrent agents serialize cleanly instead
// of failing — the basis for "5 agents = same room" and for never double-rooming (ADR 0003).
function withFileLock<T>(lockPath: string, now: string, force: boolean, fn: () => T): T {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  acquireFileLock(lockPath, now, force);
  try {
    return fn();
  } finally {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // Best-effort lock cleanup.
    }
  }
}

function acquireFileLock(lockPath: string, now: string, force: boolean): void {
  const startedAt = Date.now();
  for (;;) {
    try {
      const fd = fs.openSync(lockPath, "wx"); // atomic create-exclusive: exactly one writer wins
      try {
        fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: now, host: os.hostname() }));
      } finally {
        fs.closeSync(fd);
      }
      return;
    } catch (error) {
      if ((error as { code?: string }).code !== "EEXIST") throw error;
    }
    if (force || isFileLockStale(lockPath, now)) {
      // Reclaim a stale/abandoned lock (crashed holder), or steal unconditionally under --force.
      // Inherent unlink-steal window: this could in theory delete a lock another process just
      // freshly created — unreachable in practice given ms-scale critical sections vs a 60s stale
      // threshold. Note: --force therefore defeats the no-double-room guarantee; never pass it to join.
      try {
        fs.unlinkSync(lockPath);
      } catch {
        // Another waiter stole it first — just retry.
      }
      continue;
    }
    if (Date.now() - startedAt > LOCK_WAIT_TIMEOUT_MS) throw new CliError(`lock is stuck: ${lockPath}`, 1);
    sleepSync(50);
  }
}

function isFileLockStale(lockPath: string, now: string): boolean {
  try {
    const lock = readJson(lockPath) as { createdAt?: string };
    const ageMs = Date.parse(now) - Date.parse(String(lock.createdAt));
    return !Number.isFinite(ageMs) || ageMs > LOCK_STALE_MS;
  } catch {
    return true; // corrupt/unreadable lock — treat as stale and reclaim
  }
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function handleAgent(context: Context, action: string | undefined): void {
  requireOption(context.args, "agent");
  // join-or-create: `--run current` resolves to the workspace's active run, creating one atomically
  // if none exists. Pin the resolved id so the join below targets exactly that run (ADR 0003).
  if (action === "join" && context.args.run === "current") {
    context.args.run = ensureRun(context).runId;
  }
  const manifest = loadRequiredManifest(context);

  if (action === "join" || action === "heartbeat") {
    const paths = resolveRunPaths(context.stateRoot, manifest.runId);
    const existing = readAgentStatus(context, manifest.runId, context.args.agent);
    const activeAgents = new Set(manifest.activeAgents ?? []);
    activeAgents.add(context.args.agent);
    const nextManifest = { ...manifest, activeAgents: [...activeAgents], updatedAt: context.now };
    const status = {
      agentId: context.args.agent,
      displayName: context.args.agent,
      role: context.args.role ?? existing?.role ?? "worker",
      status: "active",
      currentTaskId: context.args.task ?? existing?.currentTaskId,
      lastHeartbeatAt: context.now,
      staleAfterMs: numberOption(context.args, "staleAfterMs", existing?.staleAfterMs ?? 300000),
      activeScopes: existing?.activeScopes ?? [],
      lastMessage: context.args.message ?? existing?.lastMessage ?? (action === "join" ? "joined" : "heartbeat"),
    };
    withRunLock(context, manifest.runId, () => {
      writeJsonAtomic(paths.manifestPath, nextManifest, context.stateRoot);
      writeAgentStatus(context, nextManifest, status);
      appendEvent(paths.eventsPath, context.stateRoot, {
        type: action === "join" ? "agent.joined" : "agent.heartbeat",
        runId: manifest.runId,
        taskId: context.args.task,
        agentId: context.args.agent,
        message: status.lastMessage,
        time: context.now,
      });
    });
    writeOutput(context.args, { ok: true, agent: status });
    return;
  }

  if (action === "leave") {
    const paths = resolveRunPaths(context.stateRoot, manifest.runId);
    const activeAgents = (manifest.activeAgents ?? []).filter((agentId) => agentId !== context.args.agent);
    const existing = readAgentStatus(context, manifest.runId, context.args.agent);
    const status = { ...(existing ?? { agentId: context.args.agent }), status: "left", lastHeartbeatAt: context.now };
    withRunLock(context, manifest.runId, () => {
      writeJsonAtomic(paths.manifestPath, { ...manifest, activeAgents, updatedAt: context.now }, context.stateRoot);
      writeAgentStatus(context, manifest, status);
      appendEvent(paths.eventsPath, context.stateRoot, {
        type: "agent.left",
        runId: manifest.runId,
        agentId: context.args.agent,
        message: `${context.args.agent} left`,
        time: context.now,
      });
    });
    writeOutput(context.args, { ok: true, agent: status });
    return;
  }

  throw new CliError(`unknown agent action: ${action}`, 2);
}

function handleTask(context: Context, action: string | undefined): void {
  const manifest = loadRequiredManifest(context);
  requireOption(context.args, "agent");
  const paths = resolveRunPaths(context.stateRoot, manifest.runId);

  if (action === "add") {
    const title = requiredValue(context.args, "title");
    const tasks = loadTasks(context, manifest.runId);
    const scopes = arrayOption(context.args, "scope").map((scope) => normalizeScope(context.cwd, scope));
    const task = {
      taskId: nextTaskId(tasks),
      objectiveId: context.args.objectiveId,
      objectivePath: context.args.objectivePath,
      title,
      status: context.args.status ?? "todo",
      createdAt: context.now,
      updatedAt: context.now,
      dependsOn: [],
      scope: scopes,
      notes: context.args.notes ?? "",
    };
    withRunLock(context, manifest.runId, () => {
      writeJsonAtomic(paths.tasksPath, [...tasks, task], context.stateRoot);
      appendEvent(paths.eventsPath, context.stateRoot, {
        type: "task.created",
        runId: manifest.runId,
        taskId: task.taskId,
        agentId: context.args.agent,
        message: `Task created: ${title}`,
        time: context.now,
      });
    });
    writeOutput(context.args, { ok: true, task });
    return;
  }

  if (action === "claim") {
    const taskId = requiredValue(context.args, "task");
    const tasks = loadTasks(context, manifest.runId);
    const index = findTaskIndex(tasks, taskId);
    let task = tasks[index];
    const claim = task.claim;
    if (claim && !isClaimExpired(claim, context.now) && claim.owner !== context.args.agent && !context.args.force) {
      throw new CliError(`task ${taskId} is already claimed by ${claim.owner}`, 1);
    }
    if (TERMINAL_TASK_STATUSES.has(task.status) && !context.args.reopen) {
      throw new CliError(`task ${taskId} is terminal; pass --reopen to claim it`, 1);
    }
    task = {
      ...task,
      status: "in-progress",
      updatedAt: context.now,
      claim: createClaim(context.args.agent, numberOption(context.args, "leaseMs", 300000), context.now),
    };
    tasks[index] = task;
    withRunLock(context, manifest.runId, () => {
      writeJsonAtomic(paths.tasksPath, tasks, context.stateRoot);
      appendEvent(paths.eventsPath, context.stateRoot, {
        type: "task.claimed",
        runId: manifest.runId,
        taskId,
        agentId: context.args.agent,
        message: `Task claimed by ${context.args.agent}`,
        time: context.now,
        data: { leasedUntil: task.claim.leasedUntil, forced: Boolean(context.args.force) },
      });
      for (const scope of task.scope ?? []) {
        appendEvent(paths.eventsPath, context.stateRoot, {
          type: "scope.claimed",
          runId: manifest.runId,
          taskId,
          agentId: context.args.agent,
          message: `Scope claimed: ${scope.path ?? scope.name}`,
          time: context.now,
          data: scope,
        });
      }
    });
    writeOutput(context.args, { ok: true, task });
    return;
  }

  if (action === "status") {
    const taskId = requiredValue(context.args, "task");
    const status = requiredValue(context.args, "status");
    const tasks = loadTasks(context, manifest.runId);
    const index = findTaskIndex(tasks, taskId);
    let task = tasks[index];
    assertTaskClaim(task, context.args.agent, requiredValue(context.args, "token"), context.now);
    if (TERMINAL_TASK_STATUSES.has(task.status) && !context.args.reopen) {
      throw new CliError(`task ${taskId} is terminal; pass --reopen to change it`, 1);
    }
    task = { ...task, status, updatedAt: context.now };
    tasks[index] = task;
    withRunLock(context, manifest.runId, () => {
      writeJsonAtomic(paths.tasksPath, tasks, context.stateRoot);
      appendEvent(paths.eventsPath, context.stateRoot, {
        type: "task.status_changed",
        runId: manifest.runId,
        taskId,
        agentId: context.args.agent,
        message: `Task status changed to ${status}`,
        time: context.now,
        data: { status },
      });
    });
    writeOutput(context.args, { ok: true, task });
    return;
  }

  if (action === "release") {
    const taskId = requiredValue(context.args, "task");
    const tasks = loadTasks(context, manifest.runId);
    const index = findTaskIndex(tasks, taskId);
    let task = tasks[index];
    assertTaskClaim(task, context.args.agent, requiredValue(context.args, "token"), context.now);
    const { claim: _claim, ...released } = task;
    task = { ...released, updatedAt: context.now };
    tasks[index] = task;
    withRunLock(context, manifest.runId, () => {
      writeJsonAtomic(paths.tasksPath, tasks, context.stateRoot);
      appendEvent(paths.eventsPath, context.stateRoot, {
        type: "task.claim_released",
        runId: manifest.runId,
        taskId,
        agentId: context.args.agent,
        message: `Task claim released by ${context.args.agent}`,
        time: context.now,
      });
    });
    writeOutput(context.args, { ok: true, task });
    return;
  }

  throw new CliError(`unknown task action: ${action}`, 2);
}

function handleScope(context: Context, action: string | undefined): void {
  const manifest = loadRequiredManifest(context);
  const scopes = arrayOption(context.args, "scope").map((scope) => normalizeScope(context.cwd, scope));

  if (action === "conflicts") {
    const conflicts = findScopeConflicts(loadTasks(context, manifest.runId), scopes, context.now);
    if (conflicts.length) throw new ConflictResult(conflicts);
    writeOutput(context.args, { ok: true, conflicts: [] });
    return;
  }

  if (action === "claim") {
    requireOption(context.args, "agent");
    const taskId = requiredValue(context.args, "task");
    const paths = resolveRunPaths(context.stateRoot, manifest.runId);
    const tasks = loadTasks(context, manifest.runId);
    const index = findTaskIndex(tasks, taskId);
    const conflicts = findScopeConflicts(tasks.filter((task) => task.taskId !== taskId), scopes, context.now);
    if (conflicts.length && !context.args.force) throw new ConflictResult(conflicts);
    const existing = tasks[index].scope ?? [];
    const existingKeys = new Set(existing.map(scopeKey));
    const merged = [...existing];
    for (const scope of scopes) {
      if (!existingKeys.has(scopeKey(scope))) merged.push(scope);
    }
    tasks[index] = { ...tasks[index], scope: merged, updatedAt: context.now };
    withRunLock(context, manifest.runId, () => {
      writeJsonAtomic(paths.tasksPath, tasks, context.stateRoot);
      for (const scope of scopes) {
        appendEvent(paths.eventsPath, context.stateRoot, {
          type: "scope.claimed",
          runId: manifest.runId,
          taskId,
          agentId: context.args.agent,
          message: `Scope claimed: ${scope.path ?? scope.name}`,
          time: context.now,
          data: scope,
        });
      }
    });
    writeOutput(context.args, { ok: true, task: tasks[index], conflicts });
    return;
  }

  throw new CliError(`unknown scope action: ${action}`, 2);
}

function handleMailbox(context: Context, action: string | undefined): void {
  const manifest = loadRequiredManifest(context);
  const paths = resolveRunPaths(context.stateRoot, manifest.runId);

  if (action === "send") {
    requireOption(context.args, "agent");
    const message = {
      messageId: createId("msg"),
      runId: manifest.runId,
      taskId: context.args.task,
      direction: "inbox",
      from: context.args.agent,
      to: requiredValue(context.args, "to"),
      body: requiredValue(context.args, "body"),
      createdAt: context.now,
      status: "queued",
      kind: context.args.kind ?? "message",
      priority: context.args.priority ?? "normal",
      deliveryMode: context.args.deliveryMode ?? "next_turn",
    };
    withRunLock(context, manifest.runId, () => {
      appendJsonl(mailboxPath(paths.runRoot, "inbox", message.taskId), message, context.stateRoot);
      const delivery = readDelivery(paths.runRoot);
      delivery.messages[message.messageId] = message.status;
      delivery.updatedAt = context.now;
      writeDelivery(paths.runRoot, delivery, context.stateRoot);
      appendEvent(paths.eventsPath, context.stateRoot, {
        type: "mailbox.message",
        runId: manifest.runId,
        taskId: message.taskId,
        agentId: context.args.agent,
        message: `Message sent to ${message.to}`,
        time: context.now,
        data: { messageId: message.messageId, to: message.to },
      });
    });
    writeOutput(context.args, { ok: true, message });
    return;
  }

  if (action === "read") {
    const messages = readMailboxMessages(paths.runRoot).filter((message) => {
      if (!context.args.agent) return true;
      return message.to === context.args.agent || message.from === context.args.agent;
    });
    writeOutput(context.args, { ok: true, messages });
    return;
  }

  if (action === "ack") {
    requireOption(context.args, "agent");
    const messageId = requiredValue(context.args, "message");
    const delivery = readDelivery(paths.runRoot);
    if (!delivery.messages[messageId]) throw new CliError(`message not found: ${messageId}`, 1);
    delivery.messages[messageId] = "acknowledged";
    delivery.updatedAt = context.now;
    withRunLock(context, manifest.runId, () => {
      writeDelivery(paths.runRoot, delivery, context.stateRoot);
      appendEvent(paths.eventsPath, context.stateRoot, {
        type: "mailbox.ack",
        runId: manifest.runId,
        agentId: context.args.agent,
        message: `Message acknowledged: ${messageId}`,
        time: context.now,
        data: { messageId },
      });
    });
    writeOutput(context.args, { ok: true, delivery });
    return;
  }

  throw new CliError(`unknown mailbox action: ${action}`, 2);
}

function handleObjectives(context: Context, action: string | undefined): void {
  if (action === "list") {
    writeOutput(context.args, { ok: true, objectives: listObjectives(context) });
    return;
  }

  const manifest = loadRequiredManifest(context);
  const paths = resolveRunPaths(context.stateRoot, manifest.runId);

  if (action === "import") {
    requireOption(context.args, "agent");
    const objectives = listObjectives(context);
    const tasks = loadTasks(context, manifest.runId);
    const existing = new Set(tasks.map((task) => task.objectiveId).filter(Boolean));
    const imported = [];
    for (const objective of objectives) {
      if (existing.has(objective.objective)) continue;
      const task = {
        taskId: nextTaskId([...tasks, ...imported]),
        objectiveId: objective.objective,
        objectivePath: objective.path,
        objectiveLine: objective.line,
        title: objective.description,
        status: mapObjectiveStatusToTask(objective.status),
        createdAt: context.now,
        updatedAt: context.now,
        dependsOn: [],
        scope: objective.path ? [normalizeScope(context.cwd, objective.path)] : [],
        notes: `Imported from ${objective.path}:${objective.line}`,
      };
      imported.push(task);
    }
    withRunLock(context, manifest.runId, () => {
      writeJsonAtomic(paths.tasksPath, [...tasks, ...imported], context.stateRoot);
      for (const task of imported) {
        appendEvent(paths.eventsPath, context.stateRoot, {
          type: "task.created",
          runId: manifest.runId,
          taskId: task.taskId,
          agentId: context.args.agent,
          message: `Task imported from objective ${task.objectiveId}`,
          time: context.now,
        });
        appendEvent(paths.eventsPath, context.stateRoot, {
          type: "objective.synced",
          runId: manifest.runId,
          taskId: task.taskId,
          agentId: context.args.agent,
          message: `Objective imported: ${task.objectiveId}`,
          time: context.now,
          data: { objectiveId: task.objectiveId, path: task.objectivePath },
        });
      }
    });
    writeOutput(context.args, { ok: true, tasks: imported });
    return;
  }

  if (action === "sync") {
    requireOption(context.args, "agent");
    const tasks = loadTasks(context, manifest.runId);
    const task = tasks[findTaskIndex(tasks, requiredValue(context.args, "task"))];
    assertTaskClaim(task, context.args.agent, requiredValue(context.args, "token"), context.now);
    if (!task.objectiveId || !task.objectivePath) {
      throw new CliError(`task ${task.taskId} is not linked to an objective`, 1);
    }
    const mappedStatus = OBJECTIVE_STATUS_MAP[task.status];
    if (!mappedStatus) throw new CliError(`cannot map task status to objective status: ${task.status}`, 1);
    runManageTasks(context.cwd, [
      "--file",
      task.objectivePath,
      "--toggle",
      task.objectiveId,
      "--task-status",
      mappedStatus,
      "--agent",
      context.args.agent,
      "--now",
      context.now,
    ]);
    appendEvent(paths.eventsPath, context.stateRoot, {
      type: "objective.synced",
      runId: manifest.runId,
      taskId: task.taskId,
      agentId: context.args.agent,
      message: `Objective synced: ${task.objectiveId}`,
      time: context.now,
      data: { objectiveId: task.objectiveId, status: mappedStatus },
    });
    writeOutput(context.args, { ok: true, objectiveId: task.objectiveId, status: mappedStatus });
    return;
  }

  throw new CliError(`unknown objectives action: ${action}`, 2);
}

function handleStatus(context: Context): void {
  const snapshot = buildStatusSnapshot(context);
  if (context.args.json) return writeOutput(context.args, snapshot);

  print(
    [
      `Run ${snapshot.runId} [${snapshot.runStatus}]`,
      `Agents: ${snapshot.agents.map((agent) => `${agent.agentId} ${isAgentStale(agent, context.now) ? "stale" : agent.status}`).join(", ") || "none"}`,
      `Tasks: ${snapshot.tasks.map((task) => `${task.taskId} ${task.status} ${task.title}${task.claim ? ` owner=${task.claim.owner}` : ""}`).join(", ") || "none"}`,
      `Conflicts: ${snapshot.scopeConflicts.length || "none"}`,
      `Unread: ${snapshot.unreadMessages.length}`,
    ].join("\n"),
  );
}

function handleHandoff(context: Context): void {
  const snapshot = buildStatusSnapshot(context);
  const lines = [
    "## Agent Room Handoff",
    "",
    `- Run: ${snapshot.runId}`,
    `- Status: ${snapshot.runStatus}`,
    `- Agents: ${snapshot.agents.map((agent) => `${agent.agentId} ${isAgentStale(agent, context.now) ? "stale" : agent.status}`).join(", ") || "none"}`,
    `- Active claims: ${snapshot.activeClaims.length}`,
    `- Scope conflicts: ${snapshot.scopeConflicts.length}`,
    `- Unread messages: ${snapshot.unreadMessages.length}`,
    "",
    "### Tasks",
    "",
    ...(snapshot.tasks.length
      ? snapshot.tasks.map((task) => `- ${task.taskId} [${task.status}]${task.claim ? ` owner=${task.claim.owner}` : ""} ${task.title}`)
      : ["- none"]),
  ];
  const markdown = lines.join("\n");
  if (context.args.json) writeOutput(context.args, { ok: true, markdown, snapshot });
  else print(markdown);
}

function buildStatusSnapshot(context: Context): StatusSnapshot {
  const manifest = loadRequiredManifest(context);
  const paths = resolveRunPaths(context.stateRoot, manifest.runId);
  const tasks = loadTasks(context, manifest.runId);
  const agents = readAllAgentStatuses(context, manifest.runId);
  const activeClaims = tasks
    .filter((task) => task.claim && !isClaimExpired(task.claim, context.now))
    .map((task) => ({ taskId: task.taskId, owner: task.claim.owner, leasedUntil: task.claim.leasedUntil, scopes: task.scope ?? [] }));
  const staleAgents = agents.filter((agent) => isAgentStale(agent, context.now));
  const scopeConflicts = findInternalScopeConflicts(tasks, context.now);
  const unreadMessages = readMailboxMessages(paths.runRoot).filter((message) => readDelivery(paths.runRoot).messages[message.messageId] !== "acknowledged");
  return {
    runId: manifest.runId,
    runStatus: manifest.status,
    agents,
    tasks,
    activeClaims,
    staleAgents,
    scopeConflicts,
    unreadMessages,
  };
}

function listObjectives(context: Context): Objective[] {
  const args = ["--list-objectives", "--json"];
  if (context.args.initiative) args.push("--initiative", context.args.initiative);
  if (context.args.file) args.push("--file", context.args.file);
  if (context.args.status) args.push("--status", context.args.status);
  return JSON.parse(runManageTasks(context.cwd, args).stdout || "[]");
}

function runManageTasks(cwd: string, args: string[]): SpawnSyncReturns<string> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const result = spawnSync(process.execPath, [path.join(scriptDir, "manage-tasks.mjs"), ...args], { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new CliError((result.stderr || result.stdout || "manage-tasks failed").trim(), result.status ?? 1);
  }
  return result;
}

function createContext(cwd: string, args: CliArgs): Context {
  const resolvedCwd = path.resolve(cwd);
  const now = (args.now as string | undefined) ?? formatLocalTimestamp(new Date());
  assertTimestamp(now);
  return { cwd: resolvedCwd, stateRoot: resolveStateRoot(resolvedCwd, args), args, now };
}

// Resolve the room state root. Precedence: explicit --state-root > VAULTMAN_ROOM_STATE_ROOT env >
// git common dir (shared by every worktree of the repo) > per-worktree cwd/.agents/state fallback.
// Using the git COMMON dir means all linked worktrees converge on ONE room (ADR 0003).
export function resolveStateRoot(cwd: string, args: CliArgs): string {
  if (args.stateRoot && args.stateRoot !== true) return path.resolve(String(args.stateRoot));
  const envRoot = process.env.VAULTMAN_ROOM_STATE_ROOT;
  if (envRoot) return path.resolve(envRoot);
  try {
    const result = spawnSync("git", ["rev-parse", "--git-common-dir"], { cwd, encoding: "utf8" });
    if (result.status === 0 && result.stdout.trim()) {
      return path.join(path.resolve(cwd, result.stdout.trim()), "vaultman-room");
    }
  } catch {
    // not a git repository — fall through to the per-worktree default
  }
  return path.join(cwd, ".agents", "state");
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[i + 1];
    if (value && !value.startsWith("--")) {
      if (args[key] === undefined) args[key] = value;
      else if (Array.isArray(args[key])) args[key].push(value);
      else args[key] = [args[key], value];
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function resolveRunPaths(stateRoot: string, runId: string): RunPaths {
  assertSafeId("runId", runId);
  const runRoot = path.join(stateRoot, "runs", runId);
  const locksRoot = path.join(stateRoot, "locks");
  return {
    stateRoot,
    runRoot,
    locksRoot,
    artifactsRoot: path.join(runRoot, "artifacts"),
    agentsRoot: path.join(runRoot, "agents"),
    manifestPath: path.join(runRoot, "manifest.json"),
    tasksPath: path.join(runRoot, "tasks.json"),
    eventsPath: path.join(runRoot, "events.jsonl"),
    lockPath: path.join(locksRoot, `${runId}.lock`),
  };
}

function loadRequiredManifest(context: Context): Manifest {
  const runId = resolveRequestedRunId(context);
  const manifest = loadManifest(context.stateRoot, runId);
  if (!manifest) throw new CliError(`run not found: ${runId}`, 1);
  return manifest;
}

function resolveRequestedRunId(context: Context): string {
  if (context.args.run && context.args.run !== true && !["latest", "current"].includes(String(context.args.run))) {
    return String(context.args.run);
  }
  const runId = latestRunId(context.stateRoot);
  if (!runId) throw new CliError("--run is required because no agent-room runs exist", 2);
  return runId;
}

function latestRunId(stateRoot: string): string | undefined {
  const runsRoot = path.join(stateRoot, "runs");
  if (!fs.existsSync(runsRoot)) return undefined;
  const manifests = fs
    .readdirSync(runsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => loadManifest(stateRoot, entry.name))
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt)));
  return manifests[0]?.runId;
}

function loadManifest(stateRoot: string, runId: string): Manifest | undefined {
  const filePath = resolveRunPaths(stateRoot, runId).manifestPath;
  if (!fs.existsSync(filePath)) return undefined;
  return readJson(filePath) as Manifest;
}

function loadTasks(context: Context, runId: string): Task[] {
  const filePath = resolveRunPaths(context.stateRoot, runId).tasksPath;
  if (!fs.existsSync(filePath)) return [];
  return readJson(filePath) as Task[];
}

function withRunLock<T>(context: Context, runId: string, fn: () => T): T {
  const paths = resolveRunPaths(context.stateRoot, runId);
  return withFileLock(paths.lockPath, context.now, Boolean(context.args.force), fn);
}

function writeAgentStatus(context: Context, manifest: Manifest, status: AgentStatus): void {
  const paths = resolveRunPaths(context.stateRoot, manifest.runId);
  const filePath = path.join(paths.agentsRoot, status.agentId, "status.json");
  writeJsonAtomic(filePath, status, context.stateRoot);
}

function readAgentStatus(context: Context, runId: string, agentId: string): AgentStatus | undefined {
  const filePath = path.join(resolveRunPaths(context.stateRoot, runId).agentsRoot, agentId, "status.json");
  if (!fs.existsSync(filePath)) return undefined;
  return readJson(filePath) as AgentStatus;
}

function readAllAgentStatuses(context: Context, runId: string): AgentStatus[] {
  const root = resolveRunPaths(context.stateRoot, runId).agentsRoot;
  if (!fs.existsSync(root)) return [];
  return (fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readAgentStatus(context, runId, entry.name))
    .filter(Boolean) as AgentStatus[])
    .sort((a, b) => a.agentId.localeCompare(b.agentId));
}

function appendEvent(eventsPath: string, stateRoot: string, event: RoomEvent): void {
  fs.mkdirSync(path.dirname(eventsPath), { recursive: true });
  const seq = fs.existsSync(eventsPath) ? fs.readFileSync(eventsPath, "utf8").split(/\r?\n/).filter(Boolean).length + 1 : 1;
  const complete = {
    eventId: `evt_${String(seq).padStart(6, "0")}`,
    seq,
    time: event.time,
    type: event.type,
    runId: event.runId,
    taskId: event.taskId,
    agentId: event.agentId,
    message: event.message,
    data: event.data ?? {},
  };
  appendJsonl(eventsPath, complete, stateRoot);
}

function createRunId(now: string): string {
  return `room_${now.replace(/[-:]/g, "").replace("T", "_")}_${Math.random().toString(16).slice(2, 8)}`;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createClaim(owner: string, leaseMs: number, now: string): Claim {
  const claimedAt = now;
  const leasedUntil = new Date(Date.parse(now) + leaseMs).toISOString().slice(0, 19);
  return { owner, token: createId("claim"), claimedAt, leasedUntil };
}

function isClaimExpired(claim: Claim, now: string): boolean {
  return Date.parse(claim.leasedUntil) <= Date.parse(now);
}

function assertTaskClaim(task: Task, owner: string, token: string, now: string): void {
  if (!task.claim) throw new CliError(`task ${task.taskId} has no active claim`, 1);
  if (isClaimExpired(task.claim, now)) throw new CliError(`task ${task.taskId} claim expired`, 1);
  if (task.claim.owner !== owner || task.claim.token !== token) {
    throw new CliError(`invalid claim token for task ${task.taskId}`, 1);
  }
}

function nextTaskId(tasks: Task[]): string {
  return `task_${String(tasks.length + 1).padStart(3, "0")}`;
}

function findTaskIndex(tasks: Task[], taskId: string): number {
  const index = tasks.findIndex((task) => task.taskId === taskId);
  if (index < 0) throw new CliError(`task not found: ${taskId}`, 1);
  return index;
}

function normalizeScope(cwd: string, value: string): Scope {
  if (!value) throw new CliError("scope is required", 1);
  if (/^[A-Za-z0-9_-]+:[A-Za-z0-9._/@-]+$/u.test(value) && !value.includes("\\") && !value.includes("/")) {
    const [kind, name] = value.split(":", 2);
    return { kind, name };
  }
  const absolute = path.resolve(cwd, value);
  const relative = path.relative(cwd, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new CliError(`scope is outside workspace: ${value}`, 1);
  }
  return { kind: "path", path: toPosixPath(relative) };
}

function findScopeConflicts(tasks: Task[], scopes: Scope[], now: string): ScopeConflict[] {
  const conflicts: ScopeConflict[] = [];
  for (const task of tasks) {
    if (!task.claim || isClaimExpired(task.claim, now)) continue;
    for (const existing of task.scope ?? []) {
      for (const requested of scopes) {
        if (!scopesConflict(existing, requested)) continue;
        conflicts.push({
          scope: requested.path ?? requested.name,
          existingScope: existing.path ?? existing.name,
          owner: task.claim!.owner,
          taskId: task.taskId,
          leasedUntil: task.claim!.leasedUntil,
        });
      }
    }
  }
  return conflicts;
}

function findInternalScopeConflicts(tasks: Task[], now: string): InternalScopeConflict[] {
  const active = tasks.filter((task) => task.claim && !isClaimExpired(task.claim, now));
  const conflicts: InternalScopeConflict[] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const left = active[i];
      const right = active[j];
      for (const leftScope of left.scope ?? []) {
        for (const rightScope of right.scope ?? []) {
          if (!scopesConflict(leftScope, rightScope)) continue;
          conflicts.push({ leftTaskId: left.taskId, rightTaskId: right.taskId, scope: leftScope.path ?? leftScope.name });
        }
      }
    }
  }
  return conflicts;
}

function scopesConflict(left: Scope, right: Scope): boolean {
  if (left.kind !== "path" || right.kind !== "path") {
    return left.kind === right.kind && left.name === right.name;
  }
  const a = left.path!.toLowerCase();
  const b = right.path!.toLowerCase();
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function scopeKey(scope: Scope): string {
  return scope.kind === "path" ? `path:${scope.path!.toLowerCase()}` : `${scope.kind}:${scope.name}`;
}

function mailboxPath(runRoot: string, direction: string, taskId: string | undefined): string {
  if (taskId) return path.join(runRoot, "mailbox", "tasks", taskId, `${direction}.jsonl`);
  return path.join(runRoot, "mailbox", `${direction}.jsonl`);
}

function deliveryPath(runRoot: string): string {
  return path.join(runRoot, "mailbox", "delivery.json");
}

function readMailboxMessages(runRoot: string): MailboxMessage[] {
  const mailboxRoot = path.join(runRoot, "mailbox");
  const files = [path.join(mailboxRoot, "inbox.jsonl"), path.join(mailboxRoot, "outbox.jsonl")];
  const tasksRoot = path.join(mailboxRoot, "tasks");
  if (fs.existsSync(tasksRoot)) {
    for (const entry of fs.readdirSync(tasksRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      files.push(path.join(tasksRoot, entry.name, "inbox.jsonl"));
      files.push(path.join(tasksRoot, entry.name, "outbox.jsonl"));
    }
  }
  return (files.flatMap(readJsonl) as MailboxMessage[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function readDelivery(runRoot: string): Delivery {
  const filePath = deliveryPath(runRoot);
  if (!fs.existsSync(filePath)) return { messages: {}, updatedAt: "" };
  return readJson(filePath) as Delivery;
}

function writeDelivery(runRoot: string, delivery: Delivery, stateRoot: string): void {
  writeJsonAtomic(deliveryPath(runRoot), delivery, stateRoot);
}

function isAgentStale(agent: AgentStatus, now: string): boolean {
  if (!agent.lastHeartbeatAt || agent.status === "left") return false;
  return Date.parse(now) - Date.parse(agent.lastHeartbeatAt) > (agent.staleAfterMs ?? 300000);
}

function mapObjectiveStatusToTask(status: string): string {
  if (status === "on-hold") return "waiting";
  if (status === "cancelled") return "cancelled";
  if (status === "done") return "done";
  if (status === "in-progress") return "in-progress";
  if (status === "blocked") return "blocked";
  if (status === "question") return "question";
  return "todo";
}

function readJson(filePath: string): Json {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath: string): Json[] {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeJsonAtomic(filePath: string, value: Json, stateRoot: string): void {
  assertPathInsideStateRoot(stateRoot, filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function appendJsonl(filePath: string, value: Json, stateRoot: string): void {
  assertPathInsideStateRoot(stateRoot, filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

// Confine every write to the resolved room state root. All room artifacts (manifest, tasks, events,
// agents, mailbox, locks, delivery) live under stateRoot, which may legitimately sit OUTSIDE the cwd
// when worktrees share one room via the git common dir — so the guard tracks stateRoot, not cwd.
function assertPathInsideStateRoot(stateRoot: string, filePath: string): void {
  const relative = path.relative(stateRoot, path.resolve(filePath));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new CliError(`write path is outside the room state root: ${filePath}`, 1);
  }
}

function assertSafeId(name: string, value: string): void {
  if (!/^[A-Za-z0-9_.-]+$/u.test(value)) throw new CliError(`${name} contains unsafe characters: ${value}`, 1);
}

function assertTimestamp(timestamp: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/u.test(timestamp)) {
    throw new CliError("--now must use YYYY-MM-DDTHH:mm:ss", 2);
  }
}

function formatLocalTimestamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function requiredValue(args: CliArgs, key: string): string {
  if (args[key] === undefined || args[key] === true || args[key] === "") throw new CliError(`--${toKebab(key)} is required`, 2);
  return String(args[key]);
}

function requireOption(args: CliArgs, key: string): void {
  requiredValue(args, key);
}

function numberOption(args: CliArgs, key: string, fallback: number): number {
  if (args[key] === undefined || args[key] === true) return fallback;
  const value = Number(args[key]);
  if (!Number.isFinite(value)) throw new CliError(`--${toKebab(key)} must be a number`, 2);
  return value;
}

function arrayOption(args: CliArgs, key: string): string[] {
  const value = args[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function writeOutput(args: CliArgs, value: Json): void {
  if (args.json) print(JSON.stringify(value, null, 2));
  else print(formatOutput(value));
}

function formatOutput(value: Json): string {
  if (typeof value === "string") return value;
  if ((value as { ok?: unknown })?.ok !== undefined) return (value as { ok?: unknown }).ok ? "ok" : "failed";
  return JSON.stringify(value, null, 2);
}

function print(value: string): void {
  process.stdout.write(`${value}\n`);
}

function toKebab(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

class CliError extends Error {
  exitCode: number;
  constructor(message: string, exitCode: number = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

class ConflictResult {
  conflicts: ScopeConflict[];
  constructor(conflicts: ScopeConflict[]) {
    this.conflicts = conflicts;
  }
}

await main();
