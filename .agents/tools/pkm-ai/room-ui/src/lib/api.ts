import type { StatusResponse } from "./types.ts";

export interface ApiOptions {
  passphrase?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchStatus(options: ApiOptions = {}): Promise<StatusResponse> {
  const response = await fetch("/api/status", { headers: authHeaders(options) });
  const body = await readBody(response);
  if (!response.ok) throw new ApiError(errorMessage(body, `Status request failed: ${response.status}`), response.status, body);
  return body as StatusResponse;
}

export async function executeAction(args: string[], options: ApiOptions = {}): Promise<unknown> {
  const response = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(options) },
    body: JSON.stringify({ args })
  });
  const body = await readBody(response);
  if (!response.ok) throw new ApiError(errorMessage(body, `Action request failed: ${response.status}`), response.status, body);
  return body;
}

function authHeaders(options: ApiOptions): Record<string, string> {
  return options.passphrase ? { "x-room-ui-passphrase": options.passphrase } : {};
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
  return fallback;
}
