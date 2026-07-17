export interface RoomUiPreferences {
  mode: "room" | "graph" | "mailbox" | "logs" | "command";
  pollMs: number;
  operatorAgentId: string;
  showLeftAgents: boolean;
}

export const DEFAULT_PREFERENCES: RoomUiPreferences = {
  mode: "room",
  pollMs: 5000,
  operatorAgentId: "human-controller",
  showLeftAgents: true
};

export function loadPreferences(storage: Storage = localStorage): RoomUiPreferences {
  const raw = storage.getItem("room-ui-preferences");
  if (!raw) return DEFAULT_PREFERENCES;
  const parsed = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  if (parsed.mode === "overview" || parsed.mode === "streams") parsed.mode = "room";
  return parsed;
}

export function savePreferences(preferences: RoomUiPreferences, storage: Storage = localStorage): void {
  storage.setItem("room-ui-preferences", JSON.stringify(preferences));
}
