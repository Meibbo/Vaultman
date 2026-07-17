export type RiskLevel = "low" | "medium" | "high" | "outside-mvp";

export interface RoomUiAction {
  type: string;
  ownerMatchesOperator?: boolean;
  conflict?: boolean;
}

export interface RiskDecision {
  level: RiskLevel;
  requiresFreshSnapshot: boolean;
  requiresConfirmation: boolean;
  requiresDryRun: boolean;
  reason: string;
}

export interface AgentSummary {
  agentId: string;
  displayName?: string;
  role?: string;
  status?: string;
  lastHeartbeatAt?: string;
  lastMessage?: string;
  staleAfterMs?: number;
  stream?: string;
  worktree?: string;
}

export interface TaskSummary {
  taskId: string;
  title: string;
  status: string;
  updatedAt?: string;
  dependsOn?: string[];
  scope?: Array<{ kind: string; path?: string; name?: string }>;
  claim?: {
    owner: string;
    token: string;
    leasedUntil: string;
  };
  createdBy?: string;
  claimedBy?: string;
  claimedAt?: string;
  completedBy?: string;
  completedAt?: string;
  closedBy?: string;
  closedAt?: string;
  releasedBy?: string;
  releasedAt?: string;
  lastActor?: string;
  lastActorAt?: string;
  lastActorEvent?: string;
}

export interface ActiveClaimSummary {
  taskId: string;
  owner: string;
  leasedUntil: string;
  scopes?: Array<{ kind: string; path?: string; name?: string }>;
}

export interface RoomSnapshot {
  runId?: string;
  runStatus?: string;
  agents?: AgentSummary[];
  tasks?: TaskSummary[];
  activeClaims?: ActiveClaimSummary[];
  staleAgents?: AgentSummary[];
  scopeConflicts?: Array<{ leftTaskId: string; rightTaskId: string; scope?: string }>;
  unreadMessages?: Array<{ messageId: string; from?: string; to?: string; priority?: string; body?: string; createdAt?: string; status?: string; kind?: string }>;
}

export interface StatusResponse {
  ok: boolean;
  snapshot: RoomSnapshot;
  error?: string;
}
