import test from "node:test";
import assert from "node:assert/strict";
import { classifyAction } from "../src/lib/riskPolicy.ts";

test("classifies MVP actions by risk", () => {
  assert.equal(classifyAction({ type: "snapshot.read" }).level, "low");
  assert.equal(classifyAction({ type: "scope.conflicts" }).level, "low");
  assert.equal(classifyAction({ type: "task.add" }).level, "medium");
  assert.equal(classifyAction({ type: "mailbox.ack" }).level, "medium");
  assert.equal(classifyAction({ type: "scope.claim", conflict: true }).level, "high");
  assert.equal(classifyAction({ type: "run.close" }).level, "outside-mvp");
});
