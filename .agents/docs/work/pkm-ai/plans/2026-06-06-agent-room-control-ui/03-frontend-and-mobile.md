---
title: Agent Room Control UI plan part 3 - frontend and mobile
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

# Part 3 - Frontend And Mobile

Before editing `.svelte` files, use the repo Svelte skills required by AGENTS/skills. Then continue with this plan.

### Task 5: Frontend API And Preferences

**Files:**
- Create: `.agents/tools/pkm-ai/room-ui/src/lib/api.ts`
- Create: `.agents/tools/pkm-ai/room-ui/src/lib/preferences.ts`

- [ ] **Step 1: Create frontend API helper**

Create `src/lib/api.ts`:

```ts
export interface ApiOptions {
  passphrase?: string;
}

export async function fetchStatus(options: ApiOptions = {}): Promise<unknown> {
  const response = await fetch("/api/status", { headers: authHeaders(options) });
  if (!response.ok) throw new Error(`Status request failed: ${response.status}`);
  return response.json();
}

export async function executeAction(args: string[], options: ApiOptions = {}): Promise<unknown> {
  const response = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(options) },
    body: JSON.stringify({ args }),
  });
  if (!response.ok) throw new Error(`Action request failed: ${response.status}`);
  return response.json();
}

function authHeaders(options: ApiOptions): Record<string, string> {
  return options.passphrase ? { "x-room-ui-passphrase": options.passphrase } : {};
}
```

- [ ] **Step 2: Create preference defaults**

Create `src/lib/preferences.ts`:

```ts
export interface RoomUiPreferences {
  mode: "overview" | "command" | "streams";
  pollMs: number;
  operatorAgentId: string;
  showLeftAgents: boolean;
}

export const DEFAULT_PREFERENCES: RoomUiPreferences = {
  mode: "overview",
  pollMs: 5000,
  operatorAgentId: "human-controller",
  showLeftAgents: false,
};

export function loadPreferences(storage: Storage = localStorage): RoomUiPreferences {
  const raw = storage.getItem("room-ui-preferences");
  if (!raw) return DEFAULT_PREFERENCES;
  return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
}

export function savePreferences(preferences: RoomUiPreferences, storage: Storage = localStorage): void {
  storage.setItem("room-ui-preferences", JSON.stringify(preferences));
}
```

### Task 6: Svelte Shell And Modes

**Files:**
- Create: `.agents/tools/pkm-ai/room-ui/src/main.ts`
- Create: `.agents/tools/pkm-ai/room-ui/src/App.svelte`
- Create: `.agents/tools/pkm-ai/room-ui/src/styles.css`

- [ ] **Step 1: Create mount entry**

Create `src/main.ts`:

```ts
import App from "./App.svelte";
import "./styles.css";

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app mount point");

new App({ target });
```

- [ ] **Step 2: Create app shell**

Create `src/App.svelte` with this initial structure:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { fetchStatus } from "./lib/api.ts";
  import { DEFAULT_PREFERENCES, loadPreferences, savePreferences, type RoomUiPreferences } from "./lib/preferences.ts";

  type Mode = RoomUiPreferences["mode"];

  let preferences = DEFAULT_PREFERENCES;
  let mode: Mode = "overview";
  let snapshot: any = null;
  let error = "";
  let lastRefresh = "";
  let passphrase = "";

  onMount(() => {
    preferences = loadPreferences();
    mode = preferences.mode;
    void refresh();
    const id = window.setInterval(refresh, preferences.pollMs);
    return () => window.clearInterval(id);
  });

  async function refresh() {
    try {
      error = "";
      const result: any = await fetchStatus({ passphrase });
      snapshot = result.snapshot ?? result;
      lastRefresh = new Date().toLocaleTimeString();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function setMode(next: Mode) {
    mode = next;
    preferences = { ...preferences, mode: next };
    savePreferences(preferences);
  }
</script>

<main class="room-ui-shell">
  <header class="room-ui-header">
    <div>
      <h1>Agent Room Control</h1>
      <p>{snapshot?.runId ?? "No room snapshot"} · acting as {preferences.operatorAgentId}</p>
    </div>
    <div class="room-ui-header-actions">
      <span>{lastRefresh ? `Updated ${lastRefresh}` : "Not refreshed"}</span>
      <button type="button" on:click={refresh}>Refresh now</button>
    </div>
  </header>

  <nav class="room-ui-tabs" aria-label="Agent room modes">
    <button class:active={mode === "overview"} type="button" on:click={() => setMode("overview")}>Overview</button>
    <button class:active={mode === "command"} type="button" on:click={() => setMode("command")}>Command</button>
    <button class:active={mode === "streams"} type="button" on:click={() => setMode("streams")}>Streams</button>
  </nav>

  {#if error}
    <section class="room-ui-auth">
      <p>{error}</p>
      <label>
        LAN passphrase
        <input bind:value={passphrase} type="password" />
      </label>
      <button type="button" on:click={refresh}>Authenticate</button>
    </section>
  {:else if mode === "overview"}
    <section class="room-ui-grid">
      <article class="room-ui-card"><h2>Agents</h2><p>{snapshot?.agents?.length ?? 0}</p></article>
      <article class="room-ui-card"><h2>Tasks</h2><p>{snapshot?.tasks?.length ?? 0}</p></article>
      <article class="room-ui-card"><h2>Claims</h2><p>{snapshot?.activeClaims?.length ?? 0}</p></article>
      <article class="room-ui-card"><h2>Mailbox</h2><p>{snapshot?.unreadMessages?.length ?? 0}</p></article>
    </section>
  {:else if mode === "command"}
    <section class="room-ui-panel"><h2>Guided actions</h2><p>Create task, send message, claim scope, change status, or ack message.</p></section>
  {:else}
    <section class="room-ui-streams"><h2>Streams</h2><p>stable · beta · canary · goal · unknown</p></section>
  {/if}
</main>
```

- [ ] **Step 3: Create responsive styles**

Continue in [[03-frontend-and-mobile-styles|frontend and mobile styles]] for CSS and the first frontend build check.

Continue in [[03-frontend-and-mobile-part-2|frontend and mobile part 2]] for guided forms, mobile command-sheet behavior, and the frontend-layer commit.
