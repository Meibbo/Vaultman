---
title: Agent Room Control UI plan part 1 - backend contracts
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

# Part 1 - Backend Contracts

### Task 0: Baseline And Guardrails

**Files:**
- Read: `.agents/docs/work/pkm-ai/specs/2026-06-06-agent-room-control-ui/index.md`
- Read: `.agents/docs/architecture/policies/coordination.md`
- Read: `.agents/tools/pkm-ai/package.json`

- [ ] **Step 1: Confirm worktree scope**

Run:

```powershell
git status --short --branch
```

Expected: existing dirty files may exist, but do not edit or stage unrelated files.

- [ ] **Step 2: Confirm agent-room baseline**

Run:

```powershell
node .agents\tools\pkm-ai\agent-room.ts status --run current --json
```

Expected: JSON with `runId`, `agents`, `tasks`, `activeClaims`, and `unreadMessages`.

- [ ] **Step 3: Run existing PKM-AI tool tests**

Run:

```powershell
Push-Location .agents\tools\pkm-ai
node --test "test/*.test.mjs"
Pop-Location
```

Expected: existing tests pass before the new tool changes begin.

### Task 1: Scaffold Room UI Tool

**Files:**
- Create: `.agents/tools/pkm-ai/room-ui/package.json`
- Create: `.agents/tools/pkm-ai/room-ui/tsconfig.json`
- Create: `.agents/tools/pkm-ai/room-ui/vite.config.ts`
- Create: `.agents/tools/pkm-ai/room-ui/index.html`
- Modify: `.agents/tools/pkm-ai/package.json`

- [ ] **Step 1: Create `package.json`**

Use this content:

```json
{
  "name": "vaultman-agent-room-ui",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "node server.ts --host 127.0.0.1",
    "dev:lan": "node server.ts --lan",
    "test": "node --test \"test/*.test.mjs\"",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

Use this content:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "es2023",
    "strict": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "noEmit": true,
    "types": ["node", "svelte"]
  },
  "include": ["server.ts", "src/**/*.ts", "src/**/*.svelte", "test/**/*.mjs", "vite.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

Use this content:

```ts
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
```

- [ ] **Step 4: Create `index.html`**

Use this content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Room Control</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Add parent package scripts**

Add these scripts to `.agents/tools/pkm-ai/package.json`:

```json
"room-ui:build": "cd room-ui && vite build",
"room-ui:dev": "cd room-ui && node server.ts --host 127.0.0.1",
"room-ui:dev:lan": "cd room-ui && node server.ts --lan",
"room-ui:test": "cd room-ui && node --test \"test/*.test.mjs\"",
"room-ui:typecheck": "cd room-ui && tsc --noEmit"
```

- [ ] **Step 6: Verify scaffold**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node --test "test/*.test.mjs"
Pop-Location
```

Expected: no test files yet or empty test run behavior. If Node errors because the glob has no matches,
continue after Task 2 creates tests.

### Task 2: Risk Policy, Command Preview, And Alert Tests

**Files:**
- Create: `.agents/tools/pkm-ai/room-ui/src/lib/types.ts`
- Create: `.agents/tools/pkm-ai/room-ui/src/lib/riskPolicy.ts`
- Create: `.agents/tools/pkm-ai/room-ui/src/lib/commandPreview.ts`
- Create: `.agents/tools/pkm-ai/room-ui/src/lib/alerts.ts`
- Create: `.agents/tools/pkm-ai/room-ui/test/riskPolicy.test.mjs`
- Create: `.agents/tools/pkm-ai/room-ui/test/commandPreview.test.mjs`
- Create: `.agents/tools/pkm-ai/room-ui/test/alerts.test.mjs`

- [ ] **Step 1: Write failing risk policy test**

Create `test/riskPolicy.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { classifyAction } from "../src/lib/riskPolicy.ts";

test("classifies MVP actions by risk", () => {
  assert.equal(classifyAction({ type: "snapshot.read" }).level, "low");
  assert.equal(classifyAction({ type: "task.add" }).level, "medium");
  assert.equal(classifyAction({ type: "scope.claim", conflict: true }).level, "high");
  assert.equal(classifyAction({ type: "run.close" }).level, "outside-mvp");
});
```

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node --test test/riskPolicy.test.mjs
Pop-Location
```

Expected: FAIL because `riskPolicy.ts` does not exist.

- [ ] **Step 2: Implement shared types and risk policy**

Create `src/lib/types.ts` with the action and risk types used by all later tasks:

```ts
export type RiskLevel = "low" | "medium" | "high" | "outside-mvp";

export interface RoomUiAction {
  type: string;
  ownerMatchesOperator?: boolean;
  conflict?: boolean;
}

export interface RiskDecision {
  level: RiskLevel;
  requiresFreshSnapshot: boolean;
  requiresConfirmation: boolean;
  requiresDryRun: boolean;
  reason: string;
}
```

Create `src/lib/riskPolicy.ts`:

```ts
import type { RiskDecision, RoomUiAction } from "./types.ts";

const LOW = new Set(["snapshot.read", "preferences.update", "mailbox.ack.own"]);
const MEDIUM = new Set(["task.add", "mailbox.send", "task.claim", "scope.conflicts"]);
const OUTSIDE = new Set(["run.close", "run.delete", "state.delete", "git.run", "build.run", "release.run", "force"]);

export function classifyAction(action: RoomUiAction): RiskDecision {
  if (OUTSIDE.has(action.type)) return decision("outside-mvp", "Action is outside the MVP boundary.");
  if (LOW.has(action.type)) return decision("low", "Read-only or UI-local action.");
  if (action.type === "scope.claim" && action.conflict) {
    return decision("high", "Scope claim conflicts with an existing lease.");
  }
  if (action.type === "task.status" && action.ownerMatchesOperator === false) {
    return decision("high", "Changing another agent's task is high risk.");
  }
  if (action.type === "task.release" && action.ownerMatchesOperator === false) {
    return decision("high", "Releasing another agent's claim is high risk.");
  }
  if (MEDIUM.has(action.type) || action.type === "scope.claim" || action.type === "task.status" || action.type === "task.release") {
    return decision("medium", "Mutates room state within the MVP boundary.");
  }
  return decision("outside-mvp", "Unknown action is not exposed by the MVP.");
}

function decision(level: RiskDecision["level"], reason: string): RiskDecision {
  return {
    level,
    reason,
    requiresFreshSnapshot: level === "medium" || level === "high",
    requiresConfirmation: level === "medium" || level === "high",
    requiresDryRun: level === "high",
  };
}
```

- [ ] **Step 3: Verify risk policy test passes**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node --test test/riskPolicy.test.mjs
Pop-Location
```

Expected: PASS.

Continue in [[01-backend-contracts-part-2|backend contracts part 2]] for command previews,
alert derivation, combined verification, and the backend-contract commit.
