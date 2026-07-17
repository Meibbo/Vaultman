<script lang="ts">
  import { Dialog, Progress, ScrollArea, Switch, Tabs, Tooltip } from "bits-ui";
  import { onMount } from "svelte";
  import { deriveAlerts } from "./lib/alerts.ts";
  import { executeAction, fetchStatus } from "./lib/api.ts";
  import { isAuthenticationError, shouldPollStatus, type AuthStatus } from "./lib/authFlow.ts";
  import { buildCommandPreview, type CommandPreviewInput } from "./lib/commandPreview.ts";
  import {
    deriveAgentCards,
    deriveGraphModel,
    deriveProjectPanels,
    filterTasks,
    type GraphEdge,
    type GraphNode,
    type TaskFilter
  } from "./lib/dashboardModel.ts";
  import { DEFAULT_PREFERENCES, loadPreferences, savePreferences, type RoomUiPreferences } from "./lib/preferences.ts";
  import { classifyAction } from "./lib/riskPolicy.ts";
  import { taskActor } from "./lib/roomPresentation.ts";
  import { createLogEntry, nextSyntheticLog, runQuickAction, type LogEntry, type LogLevel, type QuickAction } from "./lib/simulation.ts";
  import type { AgentSummary, RoomSnapshot, TaskSummary } from "./lib/types.ts";

  type Mode = RoomUiPreferences["mode"];
  type ActionType = "task.add" | "mailbox.send" | "scope.conflicts" | "scope.claim" | "task.status" | "mailbox.ack";

  const modeOptions: Array<{ value: Mode; label: string }> = [
    { value: "room", label: "Room" },
    { value: "graph", label: "Graph" },
    { value: "mailbox", label: "Mailbox" },
    { value: "logs", label: "Logs" },
    { value: "command", label: "Command" }
  ];

  const actionOptions: Array<{ value: ActionType; label: string }> = [
    { value: "task.add", label: "Add task" },
    { value: "mailbox.send", label: "Send message" },
    { value: "scope.conflicts", label: "Check scope" },
    { value: "scope.claim", label: "Claim scope" },
    { value: "task.status", label: "Change status" },
    { value: "mailbox.ack", label: "Ack message" }
  ];

  const quickActions: Array<{ action: QuickAction; label: string; detail: string }> = [
    { action: "start-run", label: "Comenzar Run", detail: "Simula activacion del controlador" },
    { action: "heartbeat", label: "Heartbeat Manual", detail: "Actualiza actividad de agentes" },
    { action: "release-scopes", label: "Liberar Scopes", detail: "Simulacion segura de locks" },
    { action: "pause", label: "Pausar Orquestacion", detail: "Pasa agentes a waiting" },
    { action: "join-agent", label: "Join Scout-GPT", detail: "Agrega agente sintetico" },
    { action: "remove-agent", label: "Retirar Idle", detail: "Quita agente sintetico/idle" }
  ];

  const taskStatuses = ["todo", "in-progress", "waiting", "blocked", "question", "done", "failed", "cancelled", "skipped"];
  const taskFilters: Array<{ value: TaskFilter; label: string }> = [
    { value: "all", label: "Todas" },
    { value: "in-progress", label: "En Progreso" },
    { value: "blocked", label: "Bloqueadas" },
    { value: "completed", label: "Completadas" }
  ];
  const logLevelNames: LogLevel[] = ["INFO", "WARN", "ERROR", "LOCK"];

  let preferences = $state<RoomUiPreferences>(DEFAULT_PREFERENCES);
  let mode = $state<Mode>("room");
  let snapshot = $state<RoomSnapshot | null>(null);
  let error = $state("");
  let lastRefresh = $state("");
  let nowIso = $state(new Date().toISOString());
  let passphrase = $state("");
  let authenticatedPassphrase = $state("");
  let authStatus = $state<AuthStatus>("unknown");
  let busy = $state(false);
  let actionResult = $state("");
  let simulationPaused = $state(false);
  let syntheticAgents = $state<AgentSummary[]>([]);
  let agentOverrides = $state<Record<string, Partial<AgentSummary>>>({});
  let selectedGraphNode = $state("");
  let taskDrawerId = $state("");
  let taskDrawerOpen = $state(false);
  let taskFilter = $state<TaskFilter>("all");
  let taskSearch = $state("");
  let logQuery = $state("");
  let autoscroll = $state(true);
  let enabledLogLevels = $state<Record<LogLevel, boolean>>({ INFO: true, WARN: true, ERROR: true, LOCK: true });
  let simulatedLogs = $state<LogEntry[]>([
    createLogEntry({
      level: "INFO",
      agentId: "agent-room",
      message: "join current run success",
      at: new Date().toISOString()
    })
  ]);
  let form = $state({
    type: "task.add" as ActionType,
    title: "",
    scope: "",
    task: "",
    taskStatus: "done",
    token: "",
    to: "",
    body: "",
    message: "",
    conflictKnown: false,
    freshSnapshot: false,
    dryRun: false,
    confirmed: false
  });

  let agents = $derived(snapshot?.agents ?? []);
  let tasks = $derived(snapshot?.tasks ?? []);
  let activeClaims = $derived(snapshot?.activeClaims ?? []);
  let unreadMessages = $derived(snapshot?.unreadMessages ?? []);
  let alerts = $derived(snapshot ? deriveAlerts({ now: nowIso, snapshot }) : []);
  let effectiveAgents = $derived.by(() => mergeAgents(agents, syntheticAgents, agentOverrides));
  let effectiveSnapshot = $derived.by(() => ({
    ...(snapshot ?? {}),
    agents: effectiveAgents,
    tasks,
    activeClaims,
    staleAgents: snapshot?.staleAgents ?? [],
    scopeConflicts: snapshot?.scopeConflicts ?? [],
    unreadMessages
  }));
  let projectPanels = $derived(deriveProjectPanels(effectiveSnapshot));
  let agentCards = $derived(deriveAgentCards(effectiveSnapshot, nowIso));
  let graph = $derived(deriveGraphModel(effectiveSnapshot));
  let filteredTasks = $derived(filterTasks(tasks, taskFilter, taskSearch));
  let taskDrawer = $derived(tasks.find((task) => task.taskId === taskDrawerId));
  let visibleLogs = $derived(simulatedLogs.filter((log) => logVisible(log)));
  let previewState = $derived.by(() => {
    try {
      return { preview: buildCommandPreview(buildPreviewInput()), error: "" };
    } catch (err) {
      return { preview: null, error: err instanceof Error ? err.message : String(err) };
    }
  });
  let risk = $derived(classifyAction({ type: form.type, conflict: form.conflictKnown, ownerMatchesOperator: true }));
  let canExecute = $derived(
    Boolean(previewState.preview) &&
      risk.level !== "outside-mvp" &&
      (!risk.requiresFreshSnapshot || form.freshSnapshot) &&
      (!risk.requiresDryRun || form.dryRun) &&
      (!risk.requiresConfirmation || form.confirmed)
  );

  onMount(() => {
    try {
      preferences = loadPreferences();
      mode = preferences.mode;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    void refresh({ manual: true });
    const refreshId = window.setInterval(() => {
      if (!busy && shouldPollStatus(authStatus, authenticatedPassphrase)) void refresh();
    }, preferences.pollMs);
    const logId = window.setInterval(() => {
      simulatedLogs = nextSyntheticLog(simulatedLogs, toSimAgents(effectiveAgents), new Date().toISOString());
    }, 800);
    return () => {
      window.clearInterval(refreshId);
      window.clearInterval(logId);
    };
  });

  async function refresh(options: { manual?: boolean; passphrase?: string } = {}) {
    if (!options.manual && !shouldPollStatus(authStatus, authenticatedPassphrase)) return;
    try {
      busy = true;
      if (options.manual || authStatus !== "locked") error = "";
      const requestPassphrase = options.passphrase ?? authenticatedPassphrase;
      const result = await fetchStatus({ passphrase: requestPassphrase });
      snapshot = result.snapshot;
      authenticatedPassphrase = requestPassphrase;
      authStatus = "ready";
      error = "";
      nowIso = new Date().toISOString();
      lastRefresh = new Date().toLocaleTimeString();
    } catch (err) {
      if (isAuthenticationError(err)) {
        authStatus = "locked";
        authenticatedPassphrase = "";
        error = "Authentication required";
      } else {
        error = err instanceof Error ? err.message : String(err);
      }
    } finally {
      busy = false;
    }
  }

  async function authenticate() {
    const nextPassphrase = passphrase.trim();
    if (!nextPassphrase) {
      error = "Enter the LAN passphrase";
      return;
    }
    authStatus = "unknown";
    authenticatedPassphrase = nextPassphrase;
    await refresh({ manual: true, passphrase: nextPassphrase });
  }

  function setMode(next: Mode) {
    mode = next;
    preferences = { ...preferences, mode: next };
    savePreferences(preferences);
  }

  function setModeFromTabs(next: string) {
    if (!isMode(next)) return;
    setMode(next);
  }

  function setActionType(next: string) {
    if (!isActionType(next)) return;
    form.type = next;
    form.freshSnapshot = false;
    form.dryRun = false;
    form.confirmed = false;
    actionResult = "";
  }

  function triggerQuickAction(action: QuickAction) {
    const next = runQuickAction({ paused: simulationPaused, agents: toSimAgents(effectiveAgents), logs: simulatedLogs }, action, new Date().toISOString());
    simulationPaused = next.paused;
    simulatedLogs = next.logs;
    const liveIds = new Set(agents.map((agent) => agent.agentId));
    const overrides: Record<string, Partial<AgentSummary>> = {};
    const synthetic: AgentSummary[] = [];
    for (const agent of next.agents) {
      const update = { status: agent.status, lastMessage: agent.lastMessage, lastHeartbeatAt: new Date().toISOString() };
      if (liveIds.has(agent.agentId)) overrides[agent.agentId] = update;
      else synthetic.push({
        agentId: agent.agentId,
        displayName: agent.agentId,
        role: "worker",
        stream: "canary",
        worktree: "simulation",
        ...update
      });
    }
    agentOverrides = overrides;
    syntheticAgents = synthetic;
  }

  async function executeCurrent() {
    if (!previewState.preview || !canExecute) return;
    try {
      busy = true;
      error = "";
      if (risk.requiresFreshSnapshot) await refresh({ manual: true });
      const result = await executeAction(previewState.preview.args, { passphrase: authenticatedPassphrase });
      actionResult = JSON.stringify(result, null, 2);
      form.confirmed = false;
      form.freshSnapshot = false;
      form.dryRun = false;
      await refresh({ manual: true });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      busy = false;
    }
  }

  function buildPreviewInput(): CommandPreviewInput {
    const base = { type: form.type, run: "current", agent: preferences.operatorAgentId };
    if (form.type === "task.add") return { ...base, title: form.title.trim(), scope: optional(form.scope) };
    if (form.type === "mailbox.send") return { ...base, to: form.to.trim(), body: form.body.trim() };
    if (form.type === "scope.conflicts") return { ...base, scope: form.scope.trim() };
    if (form.type === "scope.claim") return { ...base, task: form.task.trim(), scope: form.scope.trim() };
    if (form.type === "task.status") return { ...base, task: form.task.trim(), status: form.taskStatus, token: form.token.trim() };
    return { ...base, message: form.message.trim() };
  }

  function optional(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  function isActionType(value: string): value is ActionType {
    return actionOptions.some((option) => option.value === value);
  }

  function isMode(value: string): value is Mode {
    return modeOptions.some((option) => option.value === value);
  }

  function mergeAgents(liveAgents: AgentSummary[], synthetic: AgentSummary[], overrides: Record<string, Partial<AgentSummary>>): AgentSummary[] {
    const merged = liveAgents.map((agent) => ({ ...agent, ...(overrides[agent.agentId] ?? {}) }));
    const seen = new Set(merged.map((agent) => agent.agentId));
    return [...merged, ...synthetic.filter((agent) => !seen.has(agent.agentId))];
  }

  function toSimAgents(source: AgentSummary[]) {
    return source.map((agent) => ({ agentId: agent.agentId, status: agent.status ?? "unknown", lastMessage: agent.lastMessage }));
  }

  function graphNode(id: string): GraphNode | undefined {
    return graph.nodes.find((node) => node.id === id);
  }

  function edgePath(edge: GraphEdge): string {
    const from = graphNode(edge.from);
    const to = graphNode(edge.to);
    if (!from || !to) return "";
    const fromX = from.x + (from.kind === "agent" ? 82 : 72);
    const toX = to.x - (to.kind === "agent" ? 82 : 72);
    const curve = Math.max(80, Math.abs(toX - fromX) * 0.45);
    return `M ${fromX} ${from.y} C ${fromX + curve} ${from.y}, ${toX - curve} ${to.y}, ${toX} ${to.y}`;
  }

  function nodeDimmed(node: GraphNode): boolean {
    if (!selectedGraphNode || node.id === selectedGraphNode) return false;
    return !graph.edges.some((edge) => (edge.from === selectedGraphNode && edge.to === node.id) || (edge.to === selectedGraphNode && edge.from === node.id));
  }

  function edgeDimmed(edge: GraphEdge): boolean {
    return Boolean(selectedGraphNode && edge.from !== selectedGraphNode && edge.to !== selectedGraphNode);
  }

  function openTaskDrawer(node: GraphNode) {
    if (node.kind !== "task") return;
    taskDrawerId = node.id.replace("task:", "");
    taskDrawerOpen = true;
  }

  function setTaskDrawerOpen(open: boolean) {
    taskDrawerOpen = open;
    if (!open) taskDrawerId = "";
  }

  function handleGraphNodeKey(event: KeyboardEvent, node: GraphNode) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (node.kind === "agent") selectedGraphNode = node.id;
    else openTaskDrawer(node);
  }

  function formatMessageBody(body: string | undefined): string {
    if (!body) return "{}";
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }

  function taskMark(task: TaskSummary): string {
    if (task.status === "done") return "[x]";
    if (task.status === "in-progress") return "[/]";
    return "[ ]";
  }

  function taskRowClass(task: TaskSummary): string {
    if (task.status === "done") return "done";
    if (task.status === "in-progress") return "running";
    if (["blocked", "waiting", "question"].includes(task.status)) return "blocked";
    return "queued";
  }

  function toggleLogLevel(level: LogLevel) {
    enabledLogLevels = { ...enabledLogLevels, [level]: !enabledLogLevels[level] };
  }

  function logVisible(log: LogEntry): boolean {
    if (!enabledLogLevels[log.level]) return false;
    const query = logQuery.trim();
    if (!query) return true;
    try {
      return new RegExp(query, "i").test(`${log.timestamp} ${log.level} ${log.agentId} ${log.message}`);
    } catch {
      return `${log.timestamp} ${log.level} ${log.agentId} ${log.message}`.toLowerCase().includes(query.toLowerCase());
    }
  }

  function autoscrollConsole(node: HTMLElement, options: { enabled: boolean; size: number }) {
    const scroll = () => {
      const target = node.parentElement ?? node;
      if (options.enabled) target.scrollTop = target.scrollHeight;
    };
    queueMicrotask(scroll);
    return {
      update(next: { enabled: boolean; size: number }) {
        options = next;
        queueMicrotask(scroll);
      }
    };
  }
</script>

<main class="room-ui-shell min-h-screen font-sans" data-paused={simulationPaused}>
  <Tooltip.Provider delayDuration={180}>
  <header class="room-ui-header">
    <div class="identity">
      <span class="eyebrow">Vaultman / Agent Orchestration</span>
      <h1>Agent Room Control</h1>
      <p>{snapshot?.runId ?? "current"} | {snapshot?.runStatus ?? "unknown"} | operator {preferences.operatorAgentId}</p>
    </div>
    <div class="room-ui-header-actions" aria-label="Room status controls">
      <span class="sync-pill">{lastRefresh ? `Updated ${lastRefresh}` : "Awaiting snapshot"}</span>
      <Tooltip.Root>
        <Tooltip.Trigger class="button tactical-button" type="button" disabled={busy || authStatus === "locked"} onclick={() => refresh({ manual: true })}>Refresh</Tooltip.Trigger>
        <Tooltip.Content class="tooltip-content" side="bottom">Fetch the latest room snapshot</Tooltip.Content>
      </Tooltip.Root>
    </div>
  </header>

  <Tabs.Root bind:value={mode} onValueChange={setModeFromTabs} class="room-ui-tabs-root">
    <Tabs.List class="room-ui-tabs" aria-label="Agent room modes">
      {#each modeOptions as option (option.value)}
        <Tabs.Trigger value={option.value} class={mode === option.value ? "active tactical-button" : "tactical-button"}>{option.label}</Tabs.Trigger>
      {/each}
    </Tabs.List>
  </Tabs.Root>

  {#if error && authStatus !== "locked"}
    <section class="room-ui-error" aria-live="polite">
      <strong>{error}</strong>
    </section>
  {/if}

  {#if authStatus === "locked"}
    <section class="room-ui-auth" aria-live="polite">
      <strong>{error || "Authentication required"}</strong>
      <label>
        LAN passphrase
        <input bind:value={passphrase} type="password" autocomplete="current-password" />
      </label>
      <button class="button primary" type="button" disabled={busy || !passphrase.trim()} onclick={authenticate}>Authenticate</button>
    </section>
  {:else if mode === "room"}
    <section class="room-ui-content room-grid" aria-label="Project and agent control room">
      <aside class="project-rail tactical-panel" aria-label="Projects and streams">
        <div class="panel-heading">
          <span>Projects</span>
          <strong>{projectPanels.length}</strong>
        </div>
        <div class="project-list">
          {#each projectPanels as project (project.id)}
            <article class="project-item">
              <div>
                <h2>{project.name}</h2>
                <code>branch {project.branch}</code>
              </div>
              <span class="stream-chip">{project.stream}</span>
              <div class="project-metrics">
                <span>{project.activeAgents} agents</span>
                <span>{project.completionPct}% queue</span>
              </div>
              <Progress.Root
                class="progress-track"
                value={project.completionPct}
                max={100}
                aria-label={`${project.name} queue completion`}
                style={`--pct: ${project.completionPct}%`}
              >
                <span></span>
              </Progress.Root>
            </article>
          {/each}
        </div>
      </aside>

      <section class="agent-room-stage tactical-panel" aria-label="Joined agents">
        <div class="metric-grid">
          <article class="metric-card"><span>Total Agents</span><strong>{effectiveAgents.length}</strong></article>
          <article class="metric-card"><span>Active Claims</span><strong>{activeClaims.length}</strong></article>
          <article class="metric-card"><span>Task Queue</span><strong>{tasks.length}</strong></article>
          <article class="metric-card"><span>Conflicts</span><strong>{snapshot?.scopeConflicts?.length ?? 0}</strong></article>
        </div>

        <section class="alerts-band">
          <h2>Operational Alerts</h2>
          {#if alerts.length}
            <ul class="alert-list">
              {#each alerts as alert (`${alert.kind}-${alert.ref ?? alert.detail}`)}
                <li class={alert.severity}>
                  <span>{alert.title}</span>
                  <strong>{alert.detail}</strong>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="empty">No active alerts</p>
          {/if}
        </section>

        <div class="agent-card-grid">
          {#each agentCards as card (card.agentId)}
            <article class={`agent-card ${card.statusKind}`} class:conflict={card.hasConflict}>
              <header>
                <div>
                  <h2>{card.name}</h2>
                  <p>{card.model}</p>
                </div>
                <span class={`agent-badge ${card.statusKind}`}>{card.statusKind}</span>
              </header>
              <dl>
                <div><dt>Scope</dt><dd>{card.claimedScope}</dd></div>
                <div><dt>Activity</dt><dd>{card.recentActivity}</dd></div>
                <div><dt>Stream</dt><dd>{card.stream} / {card.worktree}</dd></div>
              </dl>
              {#if card.hasConflict}
                <strong class="collision-label">LOCK CONFLICT</strong>
              {/if}
            </article>
          {/each}
        </div>
      </section>

      <aside class="quick-panel tactical-panel" aria-label="Quick actions">
        <div class="panel-heading">
          <span>Room Summary</span>
          <strong>{simulationPaused ? "paused" : "live"}</strong>
        </div>
        <dl class="room-summary">
          <div><dt>Run ID</dt><dd>{snapshot?.runId ?? "current"}</dd></div>
          <div><dt>Total Agentes</dt><dd>{effectiveAgents.length}</dd></div>
          <div><dt>Conflictos</dt><dd>{snapshot?.scopeConflicts?.length ?? 0}</dd></div>
          <div><dt>Mailbox</dt><dd>{unreadMessages.length}</dd></div>
        </dl>
        <div class="quick-actions">
          {#each quickActions as entry (entry.action)}
            <Tooltip.Root>
              <Tooltip.Trigger class="quick-action" type="button" onclick={() => triggerQuickAction(entry.action)}>
                <span>{entry.label}</span>
                <small>{entry.detail}</small>
              </Tooltip.Trigger>
              <Tooltip.Content class="tooltip-content" side="left">{entry.detail}</Tooltip.Content>
            </Tooltip.Root>
          {/each}
        </div>
      </aside>
    </section>
  {:else if mode === "graph"}
    <section class="room-ui-content graph-layout" aria-label="Agent graph visualizer">
      <div class="graph-toolbar tactical-panel">
        <div>
          <h2>Agent Dependency Graph</h2>
          <p>{selectedGraphNode || "Select an agent to isolate direct connections"}</p>
        </div>
        <button class="button tactical-button" type="button" onclick={() => { selectedGraphNode = ""; taskDrawerId = ""; taskDrawerOpen = false; }}>Reset Focus</button>
      </div>
      <div class="graph-surface tactical-panel">
        <svg class="graph-canvas" viewBox="0 0 980 620" role="img" aria-label="Agent and task graph">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z"></path>
            </marker>
          </defs>
          {#each graph.edges as edge (edge.id)}
            <path class={`graph-edge ${edge.kind}`} class:dimmed={edgeDimmed(edge)} d={edgePath(edge)} marker-end="url(#arrow)"></path>
          {/each}
          {#each graph.nodes as node (node.id)}
            <g
              class={`graph-node ${node.kind} ${node.status}`}
              class:selected={selectedGraphNode === node.id}
              class:dimmed={nodeDimmed(node)}
              transform={`translate(${node.x} ${node.y})`}
              role="button"
              tabindex="0"
              onclick={() => { if (node.kind === "agent") selectedGraphNode = node.id; }}
              onkeydown={(event) => handleGraphNodeKey(event, node)}
              ondblclick={() => openTaskDrawer(node)}
            >
              {#if node.kind === "agent"}
                <rect x="-82" y="-34" width="164" height="68" rx="18"></rect>
                <text y="-4" text-anchor="middle">{node.label.slice(0, 22)}</text>
                <text y="17" text-anchor="middle">{node.status}</text>
              {:else}
                <rect x="-72" y="-28" width="144" height="56" rx="12"></rect>
                <text y="-2" text-anchor="middle">{node.label}</text>
                <text y="18" text-anchor="middle">{node.status}</text>
              {/if}
            </g>
          {/each}
        </svg>
        <Dialog.Root bind:open={taskDrawerOpen} onOpenChange={setTaskDrawerOpen}>
          {#if taskDrawer}
            <Dialog.Portal>
              <Dialog.Overlay class="task-drawer-overlay" />
              <Dialog.Content class="task-drawer" aria-label="Task details">
                <Dialog.Close class="drawer-close tactical-button">Close</Dialog.Close>
                <span class="eyebrow">Task Detail</span>
                <Dialog.Title class="task-drawer-title">{taskDrawer.taskId}</Dialog.Title>
                <Dialog.Description class="task-drawer-description">{taskDrawer.title}</Dialog.Description>
                <dl>
                  <div><dt>Status</dt><dd>{taskDrawer.status}</dd></div>
                  <div><dt>Actor</dt><dd>{taskActor(taskDrawer).value}</dd></div>
                  <div><dt>Updated</dt><dd>{taskDrawer.updatedAt ?? "unknown"}</dd></div>
                  <div><dt>Commits</dt><dd>303fbbd, 039c16f, current working patch</dd></div>
                </dl>
              </Dialog.Content>
            </Dialog.Portal>
          {/if}
        </Dialog.Root>
      </div>
    </section>
  {:else if mode === "mailbox"}
    <section class="room-ui-content mailbox-layout" aria-label="Mailbox and orchestration queue">
      <section class="mailbox-panel tactical-panel">
        <div class="panel-heading">
          <span>Agent Mailbox</span>
          <strong>{unreadMessages.length}</strong>
        </div>
        <ScrollArea.Root class="message-feed-shell">
          <ScrollArea.Viewport class="message-feed">
            {#each unreadMessages as message (message.messageId)}
              <article class="message-row">
                <header>
                  <strong>{message.from ?? "unknown"} -> {message.to ?? "broadcast"}</strong>
                  <span>{message.createdAt ?? "no timestamp"}</span>
                </header>
                <details>
                  <summary>{message.priority ?? "normal"} / {message.status ?? "Pendiente"}</summary>
                  <pre>{formatMessageBody(message.body)}</pre>
                </details>
              </article>
            {:else}
              <p class="empty">No queued mailbox messages</p>
            {/each}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar class="scrollbar" orientation="vertical"><ScrollArea.Thumb class="scrollbar-thumb" /></ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </section>

      <section class="task-console tactical-panel">
        <div class="panel-heading">
          <span>Orchestration Queue</span>
          <strong>{filteredTasks.length}</strong>
        </div>
        <div class="task-controls">
          <input bind:value={taskSearch} aria-label="Search tasks" placeholder="Search title, scope, actor" />
          <div class="segmented-control" role="group" aria-label="Task filters">
            {#each taskFilters as filter (filter.value)}
              <button class:active={taskFilter === filter.value} type="button" onclick={() => { taskFilter = filter.value; }}>{filter.label}</button>
            {/each}
          </div>
        </div>
        <ScrollArea.Root class="table-scroll">
          <ScrollArea.Viewport class="table-scroll-viewport">
            <table>
              <thead>
                <tr><th>State</th><th>Task</th><th>Actor</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {#each filteredTasks as task (task.taskId)}
                  {@const actor = taskActor(task)}
                  <tr class={taskRowClass(task)}>
                    <td><span class="task-mark">{taskMark(task)}</span></td>
                    <td><span>{task.taskId}</span>{task.title}</td>
                    <td><strong>{actor.value}</strong><span>{actor.label}</span></td>
                    <td>{task.updatedAt ?? "-"}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar class="scrollbar" orientation="vertical"><ScrollArea.Thumb class="scrollbar-thumb" /></ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </section>
    </section>
  {:else if mode === "logs"}
    <section class="room-ui-content logs-layout" aria-label="Tactical diagnostics console">
      <div class="console-toolbar tactical-panel">
        <label class="switch-row">
          <Switch.Root class="switch-control" bind:checked={autoscroll} aria-label="Autoscroll">
            <span></span>
          </Switch.Root>
          Autoscroll
        </label>
        <button class="button tactical-button" type="button" onclick={() => { simulatedLogs = []; }}>Limpiar Consola</button>
        <div class="log-levels" role="group" aria-label="Severity filters">
          {#each logLevelNames as level (level)}
            <button class={`log-level ${level.toLowerCase()}`} class:muted={!enabledLogLevels[level]} type="button" onclick={() => toggleLogLevel(level)}>{level}</button>
          {/each}
        </div>
        <input bind:value={logQuery} aria-label="Search logs" placeholder="RegExp search: conflict|heartbeat|failed" />
      </div>
      <ScrollArea.Root class="log-console-shell">
        <ScrollArea.Viewport class="log-console-viewport">
          <section class="log-console" use:autoscrollConsole={{ enabled: autoscroll, size: simulatedLogs.length }} aria-live={autoscroll ? "polite" : "off"}>
            {#each visibleLogs as log (log.id)}
              <div class="log-line">
                <time>{log.timestamp}</time>
                <span class={`level ${log.level.toLowerCase()}`}>[{log.level}]</span>
                <span class="agent-token">{log.agentId}</span>
                <span class="log-message">{log.message}</span>
              </div>
            {/each}
          </section>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar class="scrollbar" orientation="vertical"><ScrollArea.Thumb class="scrollbar-thumb" /></ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </section>
  {:else}
    <section class="room-ui-content command-layout">
      <div class="room-ui-command-sheet tactical-panel">
        <div class="form-grid">
          <label>
            Action
            <select value={form.type} onchange={(event) => setActionType(event.currentTarget.value)}>
              {#each actionOptions as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>

          <label>
            Operator
            <input
              value={preferences.operatorAgentId}
              oninput={(event) => {
                preferences = { ...preferences, operatorAgentId: event.currentTarget.value };
                savePreferences(preferences);
              }}
            />
          </label>

          {#if form.type === "task.add"}
            <label class="wide">Title<input bind:value={form.title} /></label>
            <label class="wide">Scope<input bind:value={form.scope} /></label>
          {:else if form.type === "mailbox.send"}
            <label>To<input bind:value={form.to} /></label>
            <label class="wide">Body<textarea bind:value={form.body}></textarea></label>
          {:else if form.type === "scope.conflicts"}
            <label class="wide">Scope<input bind:value={form.scope} /></label>
          {:else if form.type === "scope.claim"}
            <label>Task<input bind:value={form.task} /></label>
            <label class="wide">Scope<input bind:value={form.scope} /></label>
            <label class="check-row wide"><input type="checkbox" bind:checked={form.conflictKnown} />Existing lease conflict</label>
          {:else if form.type === "task.status"}
            <label>Task<input bind:value={form.task} /></label>
            <label>
              Status
              <select bind:value={form.taskStatus}>
                {#each taskStatuses as status (status)}
                  <option value={status}>{status}</option>
                {/each}
              </select>
            </label>
            <label class="wide">Claim token<input bind:value={form.token} /></label>
          {:else}
            <label class="wide">Message<input bind:value={form.message} /></label>
          {/if}
        </div>

        <div class="preview-panel">
          <div class={`risk ${risk.level}`}>
            <span>{risk.level}</span>
            <strong>{risk.reason}</strong>
          </div>

          {#if previewState.preview}
            <pre>{previewState.preview.display}</pre>
          {:else}
            <p class="empty">{previewState.error}</p>
          {/if}

          <div class="confirmation-grid">
            {#if risk.requiresFreshSnapshot}
              <label class="check-row"><input type="checkbox" bind:checked={form.freshSnapshot} />Fresh snapshot reviewed</label>
            {/if}
            {#if risk.requiresDryRun}
              <label class="check-row"><input type="checkbox" bind:checked={form.dryRun} />Dry-run reviewed</label>
            {/if}
            {#if risk.requiresConfirmation}
              <label class="check-row"><input type="checkbox" bind:checked={form.confirmed} />Confirm command</label>
            {/if}
          </div>

          <button class="button primary" type="button" disabled={!canExecute || busy} onclick={executeCurrent}>Execute</button>
        </div>

        {#if actionResult}
          <pre class="result-panel">{actionResult}</pre>
        {/if}
      </div>
    </section>
  {/if}
  </Tooltip.Provider>
</main>
