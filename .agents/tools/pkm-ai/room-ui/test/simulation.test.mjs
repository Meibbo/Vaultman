import test from "node:test";
import assert from "node:assert/strict";
import { createLogEntry, runQuickAction } from "../src/lib/simulation.ts";

test("quick actions mutate simulated room controls without losing existing agents", () => {
  const state = {
    paused: false,
    agents: [
      { agentId: "Scout-GPT", status: "active", lastMessage: "Indexando docs" },
      { agentId: "Codex-Executor-3", status: "waiting", lastMessage: "Esperando scope" }
    ],
    logs: []
  };

  const heartbeat = runQuickAction(state, "heartbeat", "2026-06-06T14:00:00");
  assert.equal(heartbeat.agents.length, 2);
  assert.equal(heartbeat.agents[0].lastMessage, "Heartbeat manual recibido");
  assert.equal(heartbeat.logs[0].level, "INFO");

  const paused = runQuickAction(heartbeat, "pause", "2026-06-06T14:00:01");
  assert.equal(paused.paused, true);
  assert.equal(paused.agents.every((agent) => agent.status === "waiting"), true);

  const released = runQuickAction(paused, "release-scopes", "2026-06-06T14:00:02");
  assert.equal(released.logs.at(-1).level, "LOCK");
  assert.equal(released.agents.every((agent) => agent.lastMessage.includes("Scopes liberados")), true);
});

test("log entries have aligned tactical metadata and prune to 200 records", () => {
  const logs = Array.from({ length: 205 }, (_, index) =>
    createLogEntry({
      level: index % 2 === 0 ? "INFO" : "WARN",
      agentId: "Codex-Executor-3",
      message: `heartbeat success ${index}`,
      at: `2026-06-06T14:00:${String(index % 60).padStart(2, "0")}`
    })
  );

  const state = runQuickAction({ paused: false, agents: [], logs }, "start-run", "2026-06-06T14:10:00");
  assert.equal(state.logs.length, 200);
  assert.equal(state.logs[0].message, "heartbeat success 6");
  assert.equal(state.logs.at(-1).level, "INFO");
});
