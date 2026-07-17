export interface AlertInput {
  now: string;
  snapshot: {
    scopeConflicts?: Array<{ leftTaskId: string; rightTaskId: string; scope?: string }>;
    staleAgents?: Array<{ agentId: string }>;
    tasks?: Array<{ taskId: string; title: string; status: string; dependsOn?: string[] }>;
    unreadMessages?: Array<{ messageId: string; priority?: string; body?: string }>;
  };
}

export interface RoomAlert {
  severity: "critical" | "attention" | "info";
  kind: string;
  title: string;
  detail: string;
  ref?: string;
}

export function deriveAlerts(input: AlertInput): RoomAlert[] {
  const alerts: RoomAlert[] = [];
  for (const conflict of input.snapshot.scopeConflicts ?? []) {
    alerts.push({
      severity: "critical",
      kind: "scope-conflict",
      title: "Scope conflict",
      detail: conflict.scope ?? `${conflict.leftTaskId} conflicts with ${conflict.rightTaskId}`,
      ref: conflict.scope
    });
  }
  for (const message of input.snapshot.unreadMessages ?? []) {
    const highPriority = message.priority === "high";
    alerts.push({
      severity: highPriority ? "critical" : "attention",
      kind: highPriority ? "high-message" : "unread-message",
      title: highPriority ? "High-priority message" : "Unread message",
      detail: message.body ?? message.messageId,
      ref: message.messageId
    });
  }
  for (const agent of input.snapshot.staleAgents ?? []) {
    alerts.push({
      severity: "attention",
      kind: "stale-agent",
      title: "Stale agent",
      detail: agent.agentId,
      ref: agent.agentId
    });
  }
  const doneTasks = new Set((input.snapshot.tasks ?? []).filter((task) => task.status === "done").map((task) => task.taskId));
  for (const task of input.snapshot.tasks ?? []) {
    if (task.status === "waiting" && (task.dependsOn ?? []).some((id) => doneTasks.has(id))) {
      alerts.push({
        severity: "attention",
        kind: "waiting-ready",
        title: "Waiting task may be ready",
        detail: task.title,
        ref: task.taskId
      });
    }
  }
  return alerts;
}
