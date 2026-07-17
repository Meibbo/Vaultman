import test from "node:test";
import assert from "node:assert/strict";
import { deriveAlerts } from "../src/lib/alerts.ts";

test("derives critical and attention alerts from snapshot", () => {
  const alerts = deriveAlerts({
    now: "2026-06-06T10:00:00",
    snapshot: {
      scopeConflicts: [{ leftTaskId: "task_1", rightTaskId: "task_2", scope: "docs/work" }],
      staleAgents: [{ agentId: "codex-a" }],
      tasks: [
        { taskId: "task_3", title: "Wait", status: "waiting", dependsOn: ["task_4"] },
        { taskId: "task_4", title: "Done", status: "done", dependsOn: [] }
      ],
      unreadMessages: [{ messageId: "msg_1", priority: "high", body: "Need decision" }]
    }
  });

  assert.equal(alerts.some((alert) => alert.severity === "critical" && alert.kind === "scope-conflict"), true);
  assert.equal(alerts.some((alert) => alert.severity === "critical" && alert.kind === "high-message"), true);
  assert.equal(alerts.some((alert) => alert.severity === "attention" && alert.kind === "stale-agent"), true);
  assert.equal(alerts.some((alert) => alert.severity === "attention" && alert.kind === "waiting-ready"), true);
});
