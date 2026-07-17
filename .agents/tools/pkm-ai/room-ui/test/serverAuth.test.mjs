import test from "node:test";
import assert from "node:assert/strict";
import { createRoomUiServer } from "../server.ts";

test("LAN server blocks status without passphrase", async () => {
  const server = createRoomUiServer({
    cwd: "C:/repo",
    host: "127.0.0.1",
    port: 0,
    mode: "lan",
    passphrase: "secret",
    client: {
      status: async () => ({ runId: "room_1" }),
      execute: async () => ({ status: 0, stdout: "ok", stderr: "" })
    }
  });
  await server.start();
  try {
    const response = await fetch(`${server.url()}/api/status`);
    assert.equal(response.status, 401);
  } finally {
    await server.stop();
  }
});

test("LAN server returns status with passphrase", async () => {
  const server = createRoomUiServer({
    cwd: "C:/repo",
    host: "127.0.0.1",
    port: 0,
    mode: "lan",
    passphrase: "secret",
    client: {
      status: async () => ({ runId: "room_1" }),
      execute: async () => ({ status: 0, stdout: "ok", stderr: "" })
    }
  });
  await server.start();
  try {
    const response = await fetch(`${server.url()}/api/status`, { headers: { "x-room-ui-passphrase": "secret" } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, snapshot: { runId: "room_1" } });
  } finally {
    await server.stop();
  }
});

test("server rejects outside-MVP action args", async () => {
  let executed = false;
  const server = createRoomUiServer({
    cwd: "C:/repo",
    host: "127.0.0.1",
    port: 0,
    mode: "local",
    passphrase: "",
    client: {
      status: async () => ({ runId: "room_1" }),
      execute: async () => {
        executed = true;
        return { status: 0, stdout: "ok", stderr: "" };
      }
    }
  });
  await server.start();
  try {
    const response = await fetch(`${server.url()}/api/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args: ["run", "close", "--run", "current", "--force"] })
    });
    assert.equal(response.status, 400);
    assert.equal(executed, false);
  } finally {
    await server.stop();
  }
});
