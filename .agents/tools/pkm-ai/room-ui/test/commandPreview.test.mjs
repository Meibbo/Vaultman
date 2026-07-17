import test from "node:test";
import assert from "node:assert/strict";
import { buildCommandPreview } from "../src/lib/commandPreview.ts";

test("builds structured task add command preview", () => {
  const preview = buildCommandPreview({
    type: "task.add",
    run: "current",
    agent: "human-controller",
    title: "Write plan",
    scope: ".agents/docs/work/pkm-ai/plans/example"
  });

  assert.deepEqual(preview.args, [
    "task",
    "add",
    "--run",
    "current",
    "--agent",
    "human-controller",
    "--title",
    "Write plan",
    "--scope",
    ".agents/docs/work/pkm-ai/plans/example"
  ]);
  assert.match(preview.display, /agent-room\.ts task add/);
});

test("builds task status preview with claim token", () => {
  const preview = buildCommandPreview({
    type: "task.status",
    run: "current",
    agent: "human-controller",
    task: "task_011",
    status: "done",
    token: "claim_123"
  });

  assert.deepEqual(preview.args, [
    "task",
    "status",
    "--run",
    "current",
    "--agent",
    "human-controller",
    "--task",
    "task_011",
    "--status",
    "done",
    "--token",
    "claim_123"
  ]);
});
