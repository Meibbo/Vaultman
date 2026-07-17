import test from "node:test";
import assert from "node:assert/strict";
import { agentIdentity, agentStatusText, taskActor } from "../src/lib/roomPresentation.ts";

test("task actor prefers active claim, then completed and historical actors", () => {
  assert.deepEqual(
    taskActor({
      taskId: "task_001",
      title: "Active task",
      status: "in-progress",
      claim: { owner: "codex-gpt-5", token: "claim_1", leasedUntil: "2026-06-06T13:00:00" }
    }),
    { label: "Claim", value: "codex-gpt-5" }
  );

  assert.deepEqual(
    taskActor({
      taskId: "task_002",
      title: "Completed task",
      status: "done",
      completedBy: "codex-gpt-5-room-ui-inline",
      lastActor: "codex-gpt-5-room-ui-inline"
    }),
    { label: "Completed", value: "codex-gpt-5-room-ui-inline" }
  );

  assert.deepEqual(
    taskActor({
      taskId: "task_003",
      title: "Legacy task",
      status: "done",
      lastActor: "codex-gpt5-shard06-hotfix-aware"
    }),
    { label: "Last actor", value: "codex-gpt5-shard06-hotfix-aware" }
  );
});

test("agent identity exposes model-thread id, stream, worktree, and stale state", () => {
  const identity = agentIdentity({
    agentId: "codex-gpt-5-room-ui-inline",
    displayName: "codex-gpt-5-room-ui-inline",
    role: "worker",
    stream: "canary",
    worktree: "agent-room-control-ui"
  });

  assert.equal(identity.name, "codex-gpt-5-room-ui-inline");
  assert.equal(identity.meta, "worker / canary");
  assert.equal(identity.detail, "worktree agent-room-control-ui");
  assert.equal(agentStatusText({ agentId: "codex-gpt-5", status: "active" }, new Set(["codex-gpt-5"])), "active / stale");
  assert.equal(agentStatusText({ agentId: "codex-gpt-5", status: "left" }, new Set(["codex-gpt-5"])), "left");
});
