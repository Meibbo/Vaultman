import type { RiskDecision, RoomUiAction } from "./types.ts";

const LOW = new Set(["snapshot.read", "preferences.update", "mailbox.ack.own", "scope.conflicts"]);
const MEDIUM = new Set(["task.add", "mailbox.send", "mailbox.ack", "task.claim"]);
const OUTSIDE = new Set(["run.close", "run.delete", "state.delete", "git.run", "build.run", "release.run", "force"]);

export function classifyAction(action: RoomUiAction): RiskDecision {
  if (OUTSIDE.has(action.type)) return decision("outside-mvp", "Action is outside the MVP boundary.");
  if (LOW.has(action.type)) return decision("low", "Read-only or UI-local action.");
  if (action.type === "scope.claim" && action.conflict) {
    return decision("high", "Scope claim conflicts with an existing lease.");
  }
  if (action.type === "task.status" && action.ownerMatchesOperator === false) {
    return decision("high", "Changing another agent's task is high risk.");
  }
  if (action.type === "task.release" && action.ownerMatchesOperator === false) {
    return decision("high", "Releasing another agent's claim is high risk.");
  }
  if (MEDIUM.has(action.type) || action.type === "scope.claim" || action.type === "task.status" || action.type === "task.release") {
    return decision("medium", "Mutates room state within the MVP boundary.");
  }
  return decision("outside-mvp", "Unknown action is not exposed by the MVP.");
}

function decision(level: RiskDecision["level"], reason: string): RiskDecision {
  return {
    level,
    reason,
    requiresFreshSnapshot: level === "medium" || level === "high",
    requiresConfirmation: level === "medium" || level === "high",
    requiresDryRun: level === "high"
  };
}
