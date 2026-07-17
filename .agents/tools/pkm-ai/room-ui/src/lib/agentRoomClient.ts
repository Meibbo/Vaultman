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
  status(run: string): Promise<any>;
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
    }
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
    child.on("error", (error) => resolve({ status: 1, stdout, stderr: error.message }));
    child.on("close", (code) => resolve({ status: code ?? 1, stdout, stderr }));
  });
}
