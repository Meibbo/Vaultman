import test from "node:test";
import assert from "node:assert/strict";
import { deriveAgentCards, deriveGraphModel, deriveProjectPanels, filterTasks } from "../src/lib/dashboardModel.ts";

const snapshot = {
  runId: "room_20260604_110423_e9c65d",
  runStatus: "running",
  agents: [
    {
      agentId: "antigravity-gemini-research",
      displayName: "antigravity-gemini-research",
      role: "worker",
      status: "active",
      stream: "canary",
      worktree: "vaultman-rust-anchor-v12",
      lastHeartbeatAt: "2026-06-06T13:50:00",
      lastMessage: "Buscando documentos en PKM"
    },
    {
      agentId: "codex-gpt-5-room-ui-inline",
      displayName: "codex-gpt-5-room-ui-inline",
      role: "worker",
      status: "active",
      stream: "beta",
      worktree: "agent-room-control-ui",
      lastHeartbeatAt: "2026-06-06T13:50:01",
      lastMessage: "Rebuilding tactical UI"
    },
    { agentId: "claude-opus-4-8", role: "coordinator", status: "left", stream: "stable", worktree: "vaultman" }
  ],
  tasks: [
    {
      taskId: "task_001",
      title: "Hardening docs checkpoint",
      status: "done",
      updatedAt: "2026-06-06T13:40:00",
      scope: [{ kind: "path", path: ".agents/docs/work/hardening/index.md" }],
      completedBy: "antigravity-gemini-research"
    },
    {
      taskId: "task_002",
      title: "Hardening lock conflict review",
      status: "in-progress",
      updatedAt: "2026-06-06T13:41:00",
      scope: [{ kind: "path", path: ".agents/docs/current/status.md" }],
      claim: { owner: "antigravity-gemini-research", token: "claim_a", leasedUntil: "2026-06-06T14:10:00" },
      claimedBy: "antigravity-gemini-research"
    },
    {
      taskId: "task_003",
      title: "Feature publish queue",
      status: "todo",
      updatedAt: "2026-06-06T13:42:00",
      scope: [{ kind: "path", path: ".agents/docs/work/feature-publish/spec.md" }]
    },
    {
      taskId: "task_004",
      title: "Core backend release gate",
      status: "done",
      updatedAt: "2026-06-06T13:43:00",
      scope: [{ kind: "path", path: "src/core/backend.ts" }]
    }
  ],
  activeClaims: [
    {
      taskId: "task_002",
      owner: "antigravity-gemini-research",
      leasedUntil: "2026-06-06T14:10:00",
      scopes: [{ kind: "path", path: ".agents/docs/current/status.md" }]
    }
  ],
  staleAgents: [],
  scopeConflicts: [{ leftTaskId: "task_002", rightTaskId: "task_009", scope: ".agents/docs/current/status.md" }],
  unreadMessages: [
    {
      messageId: "msg_1",
      from: "antigravity-gemini-research",
      to: "codex-gpt-5-room-ui-inline",
      priority: "high",
      body: "{\"kind\":\"handoff\",\"scope\":\".agents/docs/current/status.md\"}",
      createdAt: "2026-06-06T13:49:30",
      status: "queued"
    }
  ]
};

test("derives tactical project panels with branch, stream agent count, and task completion", () => {
  const projects = deriveProjectPanels(snapshot);
  const hardening = projects.find((project) => project.id === "hardening");
  const feature = projects.find((project) => project.id === "feature-publish");
  const core = projects.find((project) => project.id === "core-backend");

  assert.equal(hardening.branch, "sandbox");
  assert.equal(hardening.activeAgents, 1);
  assert.equal(hardening.completionPct, 50);
  assert.equal(feature.branch, "dev");
  assert.equal(feature.activeAgents, 1);
  assert.equal(feature.completionPct, 0);
  assert.equal(core.branch, "main");
  assert.equal(core.activeAgents, 0);
  assert.equal(core.completionPct, 100);
});

test("derives agent cards with model names, claimed scope, recent activity, and conflict state", () => {
  const cards = deriveAgentCards(snapshot, "2026-06-06T13:50:02");
  const antigravity = cards.find((card) => card.agentId === "antigravity-gemini-research");

  assert.equal(antigravity.model, "Gemini 3.5 Flash");
  assert.equal(antigravity.statusKind, "active");
  assert.equal(antigravity.claimedScope, "Lock: .agents/docs/current/status.md");
  assert.equal(antigravity.recentActivity, "Buscando documentos en PKM · hace 2s");
  assert.equal(antigravity.hasConflict, true);
});

test("builds graph nodes and communication/dependency edges from room snapshot", () => {
  const graph = deriveGraphModel(snapshot);

  assert.equal(graph.nodes.some((node) => node.id === "agent:antigravity-gemini-research" && node.kind === "agent"), true);
  assert.equal(graph.nodes.some((node) => node.id === "task:task_002" && node.kind === "task"), true);
  assert.equal(graph.edges.some((edge) => edge.kind === "message" && edge.from === "agent:antigravity-gemini-research" && edge.to === "agent:codex-gpt-5-room-ui-inline"), true);
  assert.equal(graph.edges.some((edge) => edge.kind === "claim" && edge.from === "agent:antigravity-gemini-research" && edge.to === "task:task_002"), true);
});

test("filters orchestration tasks by state and text query", () => {
  assert.deepEqual(filterTasks(snapshot.tasks, "blocked", "").map((task) => task.taskId), ["task_002"]);
  assert.deepEqual(filterTasks(snapshot.tasks, "completed", "backend").map((task) => task.taskId), ["task_004"]);
});
