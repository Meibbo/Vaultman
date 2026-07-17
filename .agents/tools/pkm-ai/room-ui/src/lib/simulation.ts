export type QuickAction = "start-run" | "heartbeat" | "release-scopes" | "pause" | "join-agent" | "remove-agent";
export type LogLevel = "INFO" | "WARN" | "ERROR" | "LOCK";

export interface SimAgent {
  agentId: string;
  status: string;
  lastMessage?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  agentId: string;
  message: string;
}

export interface SimulationState {
  paused: boolean;
  agents: SimAgent[];
  logs: LogEntry[];
}

export function runQuickAction(state: SimulationState, action: QuickAction, at = new Date().toISOString()): SimulationState {
  if (action === "join-agent") {
    const exists = state.agents.some((agent) => agent.agentId === "Scout-GPT");
    return {
      ...state,
      agents: exists ? state.agents : [...state.agents, { agentId: "Scout-GPT", status: "active", lastMessage: "Joined current agent-room" }],
      logs: appendLog(state.logs, createLogEntry({ level: "INFO", agentId: "Scout-GPT", message: "join current room success", at })),
    };
  }
  if (action === "remove-agent") {
    const removable = state.agents.find((agent) => agent.agentId === "Scout-GPT") ?? state.agents.at(-1);
    return {
      ...state,
      agents: removable ? state.agents.filter((agent) => agent.agentId !== removable.agentId) : state.agents,
      logs: appendLog(state.logs, createLogEntry({ level: "WARN", agentId: removable?.agentId ?? "room-control", message: "agent left simulated room", at })),
    };
  }
  if (action === "heartbeat") {
    return {
      ...state,
      agents: state.agents.map((agent) => ({ ...agent, lastMessage: "Heartbeat manual recibido" })),
      logs: appendLog(state.logs, createLogEntry({ level: "INFO", agentId: "room-control", message: "heartbeat success join active agents", at })),
    };
  }
  if (action === "pause") {
    return {
      ...state,
      paused: true,
      agents: state.agents.map((agent) => ({ ...agent, status: "waiting", lastMessage: "Orquestacion pausada por operador" })),
      logs: appendLog(state.logs, createLogEntry({ level: "WARN", agentId: "room-control", message: "orchestration paused waiting agents", at })),
    };
  }
  if (action === "release-scopes") {
    return {
      ...state,
      agents: state.agents.map((agent) => ({ ...agent, lastMessage: "Scopes liberados por simulacion segura" })),
      logs: appendLog(state.logs, createLogEntry({ level: "LOCK", agentId: "scope-manager", message: "released all simulated scopes", at })),
    };
  }
  return {
    ...state,
    paused: false,
    logs: appendLog(state.logs, createLogEntry({ level: "INFO", agentId: "run-controller", message: "start-run simulated current room", at })),
  };
}

export function createLogEntry(input: { level: LogLevel; agentId: string; message: string; at?: string }): LogEntry {
  const at = input.at ?? new Date().toISOString();
  return {
    id: `${Date.parse(at)}-${input.level}-${input.agentId}-${input.message}`,
    timestamp: formatLogTime(at),
    level: input.level,
    agentId: input.agentId,
    message: input.message,
  };
}

export function appendLog(logs: LogEntry[], entry: LogEntry): LogEntry[] {
  return [...logs, entry].slice(-200);
}

export function nextSyntheticLog(logs: LogEntry[], agents: SimAgent[], at = new Date().toISOString()): LogEntry[] {
  const templates: Array<{ level: LogLevel; agentId: string; message: string }> = [
    { level: "INFO", agentId: "Scout-GPT", message: "join retrieval-first docs success" },
    { level: "INFO", agentId: "Codex-Executor-3", message: "heartbeat current run success" },
    { level: "LOCK", agentId: "scope-manager", message: "lock .agents/docs/current/status.md acquired" },
    { level: "WARN", agentId: "Claude-Reviewer", message: "conflict detected waiting for scope release" },
    { level: "ERROR", agentId: "query-docs", message: "failed transformer package missing" },
  ];
  const template = templates[logs.length % templates.length];
  const fallbackAgent = agents[logs.length % Math.max(1, agents.length)]?.agentId;
  return appendLog(logs, createLogEntry({ ...template, agentId: fallbackAgent ?? template.agentId, at }));
}

function formatLogTime(timestamp: string): string {
  const date = new Date(timestamp);
  const pad = (value: number, width = 2): string => String(value).padStart(width, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}
