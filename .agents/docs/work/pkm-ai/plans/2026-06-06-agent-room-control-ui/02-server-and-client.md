---
title: Agent Room Control UI plan part 2 - server and client
type: implementation-plan
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/plans/2026-06-06-agent-room-control-ui/index|agent-room-control-ui-plan]]"
created: 2026-06-06T10:24:00
updated: 2026-06-06T10:24:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent-room
---

# Part 2 - Server And Client Wrapper

### Task 3: Structured `agent-room.ts` Client

**Files:**
- Create: `.agents/tools/pkm-ai/room-ui/src/lib/agentRoomClient.ts`
- Create: `.agents/tools/pkm-ai/room-ui/test/agentRoomClient.test.mjs`

- [ ] **Step 1: Write failing client test**

Create `test/agentRoomClient.test.mjs`:

```js
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
        stdout: JSON.stringify({ runId: "room_1", runStatus: "running", agents: [], tasks: [], activeClaims: [], staleAgents: [], scopeConflicts: [], unreadMessages: [] }),
        stderr: "",
      };
    },
  });

  const snapshot = await client.status("current");
  assert.equal(snapshot.runId, "room_1");
  assert.deepEqual(calls[0], ["status", "--run", "current", "--json"]);
});
```

Run it and expect FAIL because `agentRoomClient.ts` does not exist.

- [ ] **Step 2: Implement client wrapper with structured args**

Create `src/lib/agentRoomClient.ts`:

```ts
import { spawn } from "node:child_process";
import path from "node:path";

export interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
}

export interface AgentRoomClientOptions {
  cwd: string;
  runAgentRoom?: (args: string[]) => Promise<CommandResult>;
}

export interface AgentRoomClient {
  status(run: string): Promise<unknown>;
  execute(args: string[]): Promise<CommandResult>;
}

export function createAgentRoomClient(options: AgentRoomClientOptions): AgentRoomClient {
  const runner = options.runAgentRoom ?? ((args) => runAgentRoomTool(options.cwd, args));
  return {
    async status(run: string) {
      const result = await runner(["status", "--run", run, "--json"]);
      if (result.status !== 0) throw new Error(result.stderr || "agent-room status failed");
      return JSON.parse(result.stdout);
    },
    async execute(args: string[]) {
      return runner(args);
    },
  };
}

function runAgentRoomTool(cwd: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    const script = path.join(cwd, ".agents", "tools", "pkm-ai", "agent-room.ts");
    const child = spawn("node", [script, ...args], { cwd, shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => resolve({ status: code ?? 1, stdout, stderr }));
  });
}
```

- [ ] **Step 3: Verify client test**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node --test test/agentRoomClient.test.mjs
Pop-Location
```

Expected: PASS.

### Task 4: HTTP Server, Auth, And API Routes

**Files:**
- Create: `.agents/tools/pkm-ai/room-ui/server.ts`
- Create: `.agents/tools/pkm-ai/room-ui/test/serverAuth.test.mjs`

- [ ] **Step 1: Write failing auth test**

Create `test/serverAuth.test.mjs`:

```js
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
    client: { status: async () => ({ runId: "room_1" }), execute: async () => ({ status: 0, stdout: "ok", stderr: "" }) },
  });
  await server.start();
  try {
    const response = await fetch(`${server.url()}/api/status`);
    assert.equal(response.status, 401);
  } finally {
    await server.stop();
  }
});
```

Run it and expect FAIL because `server.ts` does not exist.

- [ ] **Step 2: Implement minimal server API**

Create `server.ts`:

```ts
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createAgentRoomClient, type AgentRoomClient } from "./src/lib/agentRoomClient.ts";

export interface RoomUiServerOptions {
  cwd: string;
  host: string;
  port: number;
  mode: "local" | "lan";
  passphrase: string;
  client?: AgentRoomClient;
}

export function createRoomUiServer(options: RoomUiServerOptions) {
  const client = options.client ?? createAgentRoomClient({ cwd: options.cwd });
  const server = http.createServer(async (request, response) => {
    try {
      if (request.url === "/api/status" && request.method === "GET") {
        if (!isAuthorized(options, request)) return sendJson(response, 401, { ok: false, error: "authentication required" });
        return sendJson(response, 200, { ok: true, snapshot: await client.status("current") });
      }
      if (request.url === "/api/action" && request.method === "POST") {
        if (!isAuthorized(options, request)) return sendJson(response, 401, { ok: false, error: "authentication required" });
        const body = await readJson(request);
        const result = await client.execute(body.args);
        return sendJson(response, result.status === 0 ? 200 : 500, { ok: result.status === 0, result });
      }
      return serveStatic(options.cwd, request, response);
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });
  return {
    start: () => new Promise<void>((resolve) => server.listen(options.port, options.host, resolve)),
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
    url: () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : options.port;
      return `http://${options.host === "0.0.0.0" ? "localhost" : options.host}:${port}`;
    },
  };
}

function isAuthorized(options: RoomUiServerOptions, request: http.IncomingMessage): boolean {
  if (options.mode === "local") return true;
  return request.headers["x-room-ui-passphrase"] === options.passphrase;
}

async function readJson(request: http.IncomingMessage): Promise<any> {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response: http.ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data));
}

function serveStatic(cwd: string, request: http.IncomingMessage, response: http.ServerResponse): void {
  const dist = path.join(cwd, ".agents", "tools", "pkm-ai", "room-ui", "dist", "client");
  const requestPath = request.url && request.url !== "/" ? request.url.slice(1) : "index.html";
  const filePath = path.join(dist, path.basename(requestPath));
  if (!fs.existsSync(filePath)) return sendJson(response, 404, { ok: false, error: "not found" });
  response.end(fs.readFileSync(filePath));
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const lan = process.argv.includes("--lan");
  const hostArg = process.argv[process.argv.indexOf("--host") + 1];
  const options = {
    cwd: path.resolve("../../.."),
    host: lan ? "0.0.0.0" : hostArg || "127.0.0.1",
    port: 8787,
    mode: lan ? "lan" as const : "local" as const,
    passphrase: crypto.randomBytes(4).toString("hex"),
  };
  const app = createRoomUiServer(options);
  await app.start();
  console.log(JSON.stringify({ type: "room-ui-started", mode: options.mode, url: app.url(), passphrase: options.mode === "lan" ? options.passphrase : undefined }));
}
```

- [ ] **Step 3: Verify server auth test**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node --test test/serverAuth.test.mjs
Pop-Location
```

Expected: PASS.

- [ ] **Step 4: Verify all room-ui backend tests**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node --test "test/*.test.mjs"
Pop-Location
```

Expected: all tests PASS.

- [ ] **Step 5: Commit server layer**

Run:

```powershell
git add .agents/tools/pkm-ai/room-ui
git commit -m "feat: add agent room ui server"
```
