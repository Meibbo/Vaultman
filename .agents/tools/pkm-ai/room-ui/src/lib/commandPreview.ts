export interface CommandPreviewInput {
  type: string;
  run: string;
  agent: string;
  title?: string;
  scope?: string;
  task?: string;
  status?: string;
  token?: string;
  to?: string;
  body?: string;
  message?: string;
}

export interface CommandPreview {
  executable: "node";
  script: ".agents/tools/pkm-ai/agent-room.ts";
  args: string[];
  display: string;
}

export function buildCommandPreview(input: CommandPreviewInput): CommandPreview {
  const args = buildArgs(input);
  return {
    executable: "node",
    script: ".agents/tools/pkm-ai/agent-room.ts",
    args,
    display: ["node", ".agents/tools/pkm-ai/agent-room.ts", ...args.map(quoteIfNeeded)].join(" ")
  };
}

function buildArgs(input: CommandPreviewInput): string[] {
  if (input.type === "task.add") {
    requireValue(input.title, "title");
    const args = ["task", "add", "--run", input.run, "--agent", input.agent, "--title", input.title];
    if (input.scope) args.push("--scope", input.scope);
    return args;
  }
  if (input.type === "task.status") {
    requireValue(input.task, "task");
    requireValue(input.status, "status");
    requireValue(input.token, "token");
    return ["task", "status", "--run", input.run, "--agent", input.agent, "--task", input.task, "--status", input.status, "--token", input.token];
  }
  if (input.type === "mailbox.send") {
    requireValue(input.to, "to");
    requireValue(input.body, "body");
    return ["mailbox", "send", "--run", input.run, "--agent", input.agent, "--to", input.to, "--body", input.body];
  }
  if (input.type === "mailbox.ack") {
    requireValue(input.message, "message");
    return ["mailbox", "ack", "--run", input.run, "--agent", input.agent, "--message", input.message];
  }
  if (input.type === "scope.conflicts") {
    requireValue(input.scope, "scope");
    return ["scope", "conflicts", "--run", input.run, "--scope", input.scope];
  }
  if (input.type === "scope.claim") {
    requireValue(input.task, "task");
    requireValue(input.scope, "scope");
    return ["scope", "claim", "--run", input.run, "--agent", input.agent, "--task", input.task, "--scope", input.scope];
  }
  throw new Error(`Unsupported command preview type: ${input.type}`);
}

function requireValue<T>(value: T | undefined, name: string): asserts value is T {
  if (!value) throw new Error(`Missing required command preview field: ${name}`);
}

function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}
