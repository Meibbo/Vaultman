import test from "node:test";
import assert from "node:assert/strict";
import { isAuthenticationError, shouldPollStatus } from "../src/lib/authFlow.ts";

test("pauses automatic polling while LAN auth is locked", () => {
  assert.equal(shouldPollStatus("unknown", ""), true);
  assert.equal(shouldPollStatus("ready", "secret"), true);
  assert.equal(shouldPollStatus("locked", ""), false);
  assert.equal(shouldPollStatus("locked", "secret"), true);
});

test("detects authentication failures from status-aware API errors", () => {
  assert.equal(isAuthenticationError({ status: 401 }), true);
  assert.equal(isAuthenticationError(new Error("authentication required")), true);
  assert.equal(isAuthenticationError(new Error("network failed")), false);
});
