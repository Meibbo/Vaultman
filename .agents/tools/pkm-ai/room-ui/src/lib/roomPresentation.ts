import type { AgentSummary, TaskSummary } from "./types.ts";

export interface TaskActor {
  label: string;
  value: string;
}

export interface AgentIdentity {
  name: string;
  meta: string;
  detail: string;
}

export function taskActor(task: TaskSummary): TaskActor {
  if (task.claim?.owner) return { label: "Claim", value: task.claim.owner };
  if (task.completedBy) return { label: "Completed", value: task.completedBy };
  if (task.closedBy) return { label: "Closed", value: task.closedBy };
  if (task.lastActor) return { label: "Last actor", value: task.lastActor };
  if (task.claimedBy) return { label: "Last claim", value: task.claimedBy };
  if (task.createdBy) return { label: "Created", value: task.createdBy };
  return { label: "Actor", value: "-" };
}

export function agentIdentity(agent: AgentSummary): AgentIdentity {
  const name = agent.displayName ?? agent.agentId;
  const meta = `${agent.role ?? "worker"} / ${agent.stream ?? "unknown"}`;
  const detail = [agent.worktree ? `worktree ${agent.worktree}` : undefined, name !== agent.agentId ? agent.agentId : undefined].filter(Boolean).join(" / ");
  return { name, meta, detail: detail || agent.agentId };
}

export function agentStatusText(agent: Pick<AgentSummary, "agentId" | "status">, staleAgentIds: Set<string>): string {
  const status = agent.status ?? "unknown";
  if (status === "left" || !staleAgentIds.has(agent.agentId)) return status;
  return `${status} / stale`;
}
