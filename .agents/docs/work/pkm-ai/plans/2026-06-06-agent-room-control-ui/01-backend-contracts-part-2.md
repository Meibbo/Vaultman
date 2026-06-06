---
title: Agent Room Control UI plan part 1b - command previews and alerts
type: implementation-plan
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/plans/2026-06-06-agent-room-control-ui/index|agent-room-control-ui-plan]]"
created: 2026-06-06T10:24:00
updated: 2026-06-06T10:31:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent-room
---

# Part 1b - Command Previews And Alerts

### Task 2 Continued: Command Preview And Alert Contracts

**Files:**
- Create: `.agents/tools/pkm-ai/room-ui/src/lib/commandPreview.ts`
- Create: `.agents/tools/pkm-ai/room-ui/src/lib/alerts.ts`
- Create: `.agents/tools/pkm-ai/room-ui/test/commandPreview.test.mjs`
- Create: `.agents/tools/pkm-ai/room-ui/test/alerts.test.mjs`

- [ ] **Step 4: Write command preview test**

Create `test/commandPreview.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildCommandPreview } from "../src/lib/commandPreview.ts";

test("builds structured task add command preview", () => {
  const preview = buildCommandPreview({
    type: "task.add",
    run: "current",
    agent: "human-controller",
    title: "Write plan",
    scope: ".agents/docs/work/pkm-ai/plans/example",
  });

  assert.deepEqual(preview.args, [
    "task",
    "add",
    "--run",
    "current",
    "--agent",
    "human-controller",
    "--title",
    "Write plan",
    "--scope",
    ".agents/docs/work/pkm-ai/plans/example",
  ]);
  assert.match(preview.display, /agent-room\.ts task add/);
});
```

Run it and expect FAIL because `commandPreview.ts` does not exist.

- [ ] **Step 5: Implement command preview**

Create `src/lib/commandPreview.ts`:

```ts
export interface CommandPreviewInput {
  type: string;
  run: string;
  agent: string;
  title?: string;
  scope?: string;
  task?: string;
  status?: string;
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
    display: ["node", ".agents/tools/pkm-ai/agent-room.ts", ...args.map(quoteIfNeeded)].join(" "),
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
    return ["task", "status", "--run", input.run, "--agent", input.agent, "--task", input.task, "--status", input.status];
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
```

- [ ] **Step 6: Verify command preview test passes**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node --test test/commandPreview.test.mjs
Pop-Location
```

Expected: PASS.

- [ ] **Step 7: Write alert derivation test**

Create `test/alerts.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { deriveAlerts } from "../src/lib/alerts.ts";

test("derives critical and attention alerts from snapshot", () => {
  const alerts = deriveAlerts({
    now: "2026-06-06T10:00:00",
    snapshot: {
      scopeConflicts: [{ leftTaskId: "task_1", rightTaskId: "task_2", scope: "docs/work" }],
      staleAgents: [{ agentId: "codex-a" }],
      tasks: [{ taskId: "task_3", title: "Wait", status: "waiting", dependsOn: ["task_4"] }, { taskId: "task_4", title: "Done", status: "done", dependsOn: [] }],
      unreadMessages: [{ messageId: "msg_1", priority: "high", body: "Need decision" }],
    },
  });

  assert.equal(alerts.some((alert) => alert.severity === "critical" && alert.kind === "scope-conflict"), true);
  assert.equal(alerts.some((alert) => alert.severity === "critical" && alert.kind === "high-message"), true);
  assert.equal(alerts.some((alert) => alert.severity === "attention" && alert.kind === "stale-agent"), true);
  assert.equal(alerts.some((alert) => alert.severity === "attention" && alert.kind === "waiting-ready"), true);
});
```

Run it and expect FAIL because `alerts.ts` does not exist.

- [ ] **Step 8: Implement alert derivation**

Create `src/lib/alerts.ts`:

```ts
export interface AlertInput {
  now: string;
  snapshot: {
    scopeConflicts?: Array<{ leftTaskId: string; rightTaskId: string; scope?: string }>;
    staleAgents?: Array<{ agentId: string }>;
    tasks?: Array<{ taskId: string; title: string; status: string; dependsOn?: string[] }>;
    unreadMessages?: Array<{ messageId: string; priority?: string; body?: string }>;
  };
}

export interface RoomAlert {
  severity: "critical" | "attention" | "info";
  kind: string;
  title: string;
  detail: string;
  ref?: string;
}

export function deriveAlerts(input: AlertInput): RoomAlert[] {
  const alerts: RoomAlert[] = [];
  for (const conflict of input.snapshot.scopeConflicts ?? []) {
    alerts.push({
      severity: "critical",
      kind: "scope-conflict",
      title: "Scope conflict",
      detail: conflict.scope ?? `${conflict.leftTaskId} conflicts with ${conflict.rightTaskId}`,
      ref: conflict.scope,
    });
  }
  for (const message of input.snapshot.unreadMessages ?? []) {
    alerts.push({
      severity: message.priority === "high" ? "critical" : "attention",
      kind: message.priority === "high" ? "high-message" : "unread-message",
      title: message.priority === "high" ? "High-priority message" : "Unread message",
      detail: message.body ?? message.messageId,
      ref: message.messageId,
    });
  }
  for (const agent of input.snapshot.staleAgents ?? []) {
    alerts.push({ severity: "attention", kind: "stale-agent", title: "Stale agent", detail: agent.agentId, ref: agent.agentId });
  }
  const doneTasks = new Set((input.snapshot.tasks ?? []).filter((task) => task.status === "done").map((task) => task.taskId));
  for (const task of input.snapshot.tasks ?? []) {
    if (task.status === "waiting" && (task.dependsOn ?? []).some((id) => doneTasks.has(id))) {
      alerts.push({ severity: "attention", kind: "waiting-ready", title: "Waiting task may be ready", detail: task.title, ref: task.taskId });
    }
  }
  return alerts;
}
```

- [ ] **Step 9: Verify backend contract tests**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node --test test/riskPolicy.test.mjs test/commandPreview.test.mjs test/alerts.test.mjs
Pop-Location
```

Expected: all three tests PASS.

- [ ] **Step 10: Commit backend contract layer**

Run:

```powershell
git add .agents/tools/pkm-ai/package.json .agents/tools/pkm-ai/room-ui
git commit -m "feat: scaffold agent room ui contracts"
```
