import type { AgentSummary, RoomSnapshot, TaskSummary } from "./types.ts";

export type TaskFilter = "all" | "in-progress" | "blocked" | "completed";

export interface ProjectPanel {
  id: string;
  name: string;
  branch: string;
  stream: string;
  activeAgents: number;
  completionPct: number;
  taskCount: number;
}

export interface AgentCard {
  agentId: string;
  name: string;
  model: string;
  statusKind: "active" | "waiting" | "idle";
  claimedScope: string;
  recentActivity: string;
  stream: string;
  worktree: string;
  hasConflict: boolean;
}

export interface GraphNode {
  id: string;
  kind: "agent" | "task";
  label: string;
  status: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: "message" | "claim" | "dependency";
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const projectSpecs = [
  { id: "hardening", name: "Hardening", branch: "sandbox", stream: "canary", match: /hardening|current\/status|agent-room/i },
  { id: "feature-publish", name: "Feature-Publish", branch: "dev", stream: "beta", match: /feature-publish|publish|room-ui|control ui/i },
  { id: "core-backend", name: "Core-Backend", branch: "main", stream: "stable", match: /core|backend|src\//i },
  { id: "pkm-ai", name: "PKM-AI Orchestration", branch: "agent-room-control-ui", stream: "goal", match: /pkm-ai|agent room|orchestration/i },
];

export function deriveProjectPanels(snapshot: RoomSnapshot): ProjectPanel[] {
  const agents = snapshot.agents ?? [];
  const tasks = snapshot.tasks ?? [];
  return projectSpecs.map((spec) => {
    const projectTasks = tasks.filter((task) => spec.match.test(taskSearchText(task)));
    const done = projectTasks.filter((task) => task.status === "done").length;
    return {
      id: spec.id,
      name: spec.name,
      branch: spec.branch,
      stream: spec.stream,
      activeAgents: agents.filter((agent) => (agent.stream ?? "unknown") === spec.stream && agent.status !== "left").length,
      completionPct: projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0,
      taskCount: projectTasks.length,
    };
  });
}

export function deriveAgentCards(snapshot: RoomSnapshot, now: string): AgentCard[] {
  const claims = snapshot.activeClaims ?? [];
  const conflicts = new Set((snapshot.scopeConflicts ?? []).flatMap((conflict) => [conflict.leftTaskId, conflict.rightTaskId]));
  const tasksById = new Map((snapshot.tasks ?? []).map((task) => [task.taskId, task]));
  return (snapshot.agents ?? []).map((agent) => {
    const claim = claims.find((entry) => entry.owner === agent.agentId);
    const task = claim ? tasksById.get(claim.taskId) : undefined;
    return {
      agentId: agent.agentId,
      name: agent.displayName ?? agent.agentId,
      model: inferModel(agent),
      statusKind: statusKind(agent),
      claimedScope: claim ? `Lock: ${scopeLabel(claim.scopes?.[0] ?? task?.scope?.[0])}` : "Lock: none",
      recentActivity: `${agent.lastMessage ?? "Idle in agent-room"} · ${relativeTime(agent.lastHeartbeatAt, now)}`,
      stream: agent.stream ?? "unknown",
      worktree: agent.worktree ?? "unknown",
      hasConflict: Boolean(claim && conflicts.has(claim.taskId)),
    };
  });
}

export function deriveGraphModel(snapshot: RoomSnapshot): GraphModel {
  const agents = snapshot.agents ?? [];
  const tasks = (snapshot.tasks ?? []).slice(0, 10);
  const agentNodes = agents.map((agent, index): GraphNode => ({
    id: `agent:${agent.agentId}`,
    kind: "agent",
    label: agent.displayName ?? agent.agentId,
    status: agent.status ?? "unknown",
    x: 120 + (index % 2) * 210,
    y: 90 + Math.floor(index / 2) * 110,
  }));
  const taskNodes = tasks.map((task, index): GraphNode => ({
    id: `task:${task.taskId}`,
    kind: "task",
    label: task.taskId,
    status: task.status,
    x: 560 + (index % 2) * 220,
    y: 80 + Math.floor(index / 2) * 96,
  }));
  const messageEdges = (snapshot.unreadMessages ?? []).flatMap((message): GraphEdge[] => {
    if (!message.from || !message.to) return [];
    return [{ id: `message:${message.messageId}`, from: `agent:${message.from}`, to: `agent:${message.to}`, kind: "message" }];
  });
  const claimEdges = (snapshot.activeClaims ?? []).map((claim): GraphEdge => ({
    id: `claim:${claim.owner}:${claim.taskId}`,
    from: `agent:${claim.owner}`,
    to: `task:${claim.taskId}`,
    kind: "claim",
  }));
  const dependencyEdges = tasks.flatMap((task): GraphEdge[] =>
    (task.dependsOn ?? []).map((dependency) => ({
      id: `dependency:${dependency}:${task.taskId}`,
      from: `task:${dependency}`,
      to: `task:${task.taskId}`,
      kind: "dependency",
    })),
  );
  return { nodes: [...agentNodes, ...taskNodes], edges: [...messageEdges, ...claimEdges, ...dependencyEdges] };
}

export function filterTasks(tasks: TaskSummary[], filter: TaskFilter, query: string): TaskSummary[] {
  const needle = query.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesQuery = !needle || taskSearchText(task).toLowerCase().includes(needle);
    if (!matchesQuery) return false;
    if (filter === "completed") return task.status === "done";
    if (filter === "in-progress") return task.status === "in-progress";
    if (filter === "blocked") return isBlockedTask(task);
    return true;
  });
}

function isBlockedTask(task: TaskSummary): boolean {
  return ["blocked", "question", "waiting"].includes(task.status) || /conflict|blocked|waiting/i.test(taskSearchText(task));
}

function taskSearchText(task: TaskSummary): string {
  return [task.taskId, task.title, task.status, ...(task.scope ?? []).map(scopeLabel)].filter(Boolean).join(" ");
}

function scopeLabel(scope: { kind?: string; path?: string; name?: string } | undefined): string {
  if (!scope) return "none";
  return scope.path ?? scope.name ?? scope.kind ?? "unknown";
}

function statusKind(agent: AgentSummary): AgentCard["statusKind"] {
  if (agent.status === "left") return "idle";
  if (agent.status === "waiting" || agent.status === "blocked" || agent.status === "question") return "waiting";
  return agent.status === "active" ? "active" : "idle";
}

function inferModel(agent: AgentSummary): string {
  const text = `${agent.agentId} ${agent.displayName ?? ""}`.toLowerCase();
  if (text.includes("gemini")) return "Gemini 3.5 Flash";
  if (text.includes("claude") || text.includes("opus")) return "Claude Opus";
  if (text.includes("codex") || text.includes("gpt-5")) return "GPT-5";
  return "Provider model unknown";
}

function relativeTime(timestamp: string | undefined, now: string): string {
  if (!timestamp) return "sin heartbeat";
  const elapsed = Math.max(0, Date.parse(now) - Date.parse(timestamp));
  if (elapsed < 1000) return "hace <1s";
  if (elapsed < 60000) return `hace ${Math.round(elapsed / 1000)}s`;
  if (elapsed < 3600000) return `hace ${Math.round(elapsed / 60000)}m`;
  return `hace ${Math.round(elapsed / 3600000)}h`;
}
