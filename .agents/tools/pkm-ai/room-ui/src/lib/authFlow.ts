export type AuthStatus = "unknown" | "locked" | "ready";

export function shouldPollStatus(authStatus: AuthStatus, authenticatedPassphrase: string): boolean {
  return authStatus !== "locked" || authenticatedPassphrase.trim().length > 0;
}

export function isAuthenticationError(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error && error.status === 401) return true;
  return error instanceof Error && /authentication required/i.test(error.message);
}
