import test from "node:test";
import assert from "node:assert/strict";
import { createAgentRoomClient } from "../src/lib/agentRoomClient.ts";

test("agent room client parses status snapshots", async () => {
  const calls = [];
  const client = createAgentRoomClient({
    cwd: "C:/repo",
    runAgentRoom: async (args) => {
      calls.push(args);
      return {
        status: 0,
        stdout: JSON.stringify({
          runId: "room_1",
          runStatus: "running",
          agents: [],
          tasks: [],
          activeClaims: [],
          staleAgents: [],
          scopeConflicts: [],
          unreadMessages: []
        }),
        stderr: ""
      };
    }
  });

  const snapshot = await client.status("current");
  assert.equal(snapshot.runId, "room_1");
  assert.deepEqual(calls[0], ["status", "--run", "current", "--json"]);
});
