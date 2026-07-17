import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAgentRoomClient, type AgentRoomClient } from "./src/lib/agentRoomClient.ts";

export interface RoomUiServerOptions {
  cwd: string;
  host: string;
  port: number;
  mode: "local" | "lan";
  passphrase: string;
  client?: AgentRoomClient;
}

export interface RoomUiServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  url(): string;
  urls(): string[];
}

interface ActionDescriptor {
  resource: string;
  action: string;
  requiredFlags: string[];
  allowedFlags: string[];
}

const ACTIONS: ActionDescriptor[] = [
  { resource: "task", action: "add", requiredFlags: ["run", "agent", "title"], allowedFlags: ["run", "agent", "title", "scope"] },
  { resource: "task", action: "status", requiredFlags: ["run", "agent", "task", "status", "token"], allowedFlags: ["run", "agent", "task", "status", "token"] },
  { resource: "mailbox", action: "send", requiredFlags: ["run", "agent", "to", "body"], allowedFlags: ["run", "agent", "to", "body"] },
  { resource: "mailbox", action: "ack", requiredFlags: ["run", "agent", "message"], allowedFlags: ["run", "agent", "message"] },
  { resource: "scope", action: "conflicts", requiredFlags: ["run", "scope"], allowedFlags: ["run", "scope"] },
  { resource: "scope", action: "claim", requiredFlags: ["run", "agent", "task", "scope"], allowedFlags: ["run", "agent", "task", "scope"] }
];

export function createRoomUiServer(options: RoomUiServerOptions): RoomUiServer {
  const client = options.client ?? createAgentRoomClient({ cwd: options.cwd });
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
      if (requestUrl.pathname === "/api/status" && request.method === "GET") {
        if (!isAuthorized(options, request)) return sendJson(response, 401, { ok: false, error: "authentication required" });
        return sendJson(response, 200, { ok: true, snapshot: await client.status("current") });
      }
      if (requestUrl.pathname === "/api/action" && request.method === "POST") {
        if (!isAuthorized(options, request)) return sendJson(response, 401, { ok: false, error: "authentication required" });
        const body = await readJson(request);
        const args = body && typeof body === "object" && "args" in body ? (body as { args: unknown }).args : undefined;
        const validation = validateActionArgs(args);
        if (!validation.ok) return sendJson(response, 400, { ok: false, error: validation.error });
        const result = await client.execute(validation.args);
        return sendJson(response, result.status === 0 ? 200 : 500, { ok: result.status === 0, result });
      }
      return serveStatic(options.cwd, requestUrl, response);
    } catch (error) {
      return sendJson(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  return {
    start: () =>
      new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(options.port, options.host, () => {
          server.off("error", reject);
          resolve();
        });
      }),
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
    url: () => serverUrl(server, options.host),
    urls: () => serverUrls(server, options.host)
  };
}

function isAuthorized(options: RoomUiServerOptions, request: http.IncomingMessage): boolean {
  if (options.mode === "local") return true;
  return request.headers["x-room-ui-passphrase"] === options.passphrase;
}

async function readJson(request: http.IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function validateActionArgs(args: unknown): { ok: true; args: string[] } | { ok: false; error: string } {
  if (!Array.isArray(args) || !args.every((value) => typeof value === "string")) {
    return { ok: false, error: "args must be a string array" };
  }
  if (args.includes("--force")) return { ok: false, error: "--force is outside the MVP boundary" };
  const [resource, action, ...rest] = args;
  const descriptor = ACTIONS.find((candidate) => candidate.resource === resource && candidate.action === action);
  if (!descriptor) return { ok: false, error: "action is outside the MVP boundary" };
  const seen = new Set<string>();
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag?.startsWith("--")) return { ok: false, error: "unexpected positional argument" };
    if (value === undefined || value.startsWith("--")) return { ok: false, error: `${flag} requires a value` };
    const key = flag.slice(2);
    if (!descriptor.allowedFlags.includes(key)) return { ok: false, error: `${flag} is not allowed for this action` };
    seen.add(key);
  }
  for (const flag of descriptor.requiredFlags) {
    if (!seen.has(flag)) return { ok: false, error: `missing required --${flag}` };
  }
  return { ok: true, args };
}

function sendJson(response: http.ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

function serveStatic(cwd: string, requestUrl: URL, response: http.ServerResponse): void {
  const dist = path.join(cwd, ".agents", "tools", "pkm-ai", "room-ui", "dist", "client");
  const requested = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.slice(1);
  const filePath = path.normalize(path.join(dist, requested));
  if (!filePath.startsWith(path.normalize(dist + path.sep))) {
    return sendJson(response, 403, { ok: false, error: "forbidden" });
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const fallback = path.join(dist, "index.html");
    if (!fs.existsSync(fallback)) return sendJson(response, 404, { ok: false, error: "not found" });
    return sendFile(response, fallback);
  }
  return sendFile(response, filePath);
}

function sendFile(response: http.ServerResponse, filePath: string): void {
  response.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(response);
}

function contentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function serverUrl(server: http.Server, host: string): string {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
}

function serverUrls(server: http.Server, host: string): string[] {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  if (host !== "0.0.0.0") return [serverUrl(server, host)];
  const urls = new Set([serverUrl(server, host)]);
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) urls.add(`http://${entry.address}:${port}`);
    }
  }
  return [...urls];
}

function defaultRepoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
}

function parseCliOptions(argv: string[]): RoomUiServerOptions {
  const lan = argv.includes("--lan");
  const host = optionValue(argv, "--host") ?? (lan ? "0.0.0.0" : "127.0.0.1");
  const port = Number(optionValue(argv, "--port") ?? "8787");
  if (!Number.isFinite(port)) throw new Error("--port must be a number");
  const passphrase = lan ? (optionValue(argv, "--passphrase") ?? crypto.randomBytes(4).toString("hex")) : "";
  return {
    cwd: defaultRepoRoot(),
    host,
    port,
    mode: lan ? "lan" : "local",
    passphrase
  };
}

function optionValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const options = parseCliOptions(process.argv.slice(2));
  const app = createRoomUiServer(options);
  await app.start();
  console.log(
    JSON.stringify({
      type: "room-ui-started",
      mode: options.mode,
      url: app.url(),
      urls: app.urls(),
      passphrase: options.mode === "lan" ? options.passphrase : undefined
    })
  );
}
