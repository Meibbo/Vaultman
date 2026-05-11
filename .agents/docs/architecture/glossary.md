---
title: Glossary
type: architecture
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-10T20:20:23
tags:
  - agent/architecture
---

# Glossary

- Active agent doc: current operational Markdown under `docs` that agents
  may route through today.
- Active node: node currently targeted for primary action, context, or focus
  semantics; distinct from selected, hovered, or filter-matched nodes.
- Archive: non-current records kept for history, attempts, superseded work, or
  discarded drafts.
- Archive source: frontmatter field or explicit link from a compact replacement
  back to the preserved source record.
- Bootloader: root file that only points agents to the real router.
- Bases import choose mode: constrained filters-page state where Vaultman shows
  only compatible `.base`, Bases view, or markdown fenced `bases` import
  targets and applies selected compatible filters immediately.
- Bases interop report: structured import/export report that records applied
  rules, preserved-but-unapplied expressions, rejected candidates, and lossiness
  between Obsidian Bases and Vaultman.
- CMenu queue repair: hardening slice that restores context-menu actions so
  tag and file operations stage queue-visible work through Vaultman's queue.
- Chameleon architecture: Elastic UI architecture where Vaultman can render the
  same service-backed surface through native-like Thin mode, balanced utility
  mode, or richer Thick mode while preserving stable node semantics.
- Continuation shard: a follow-on shard that preserves the rest of the same
  topic when the topic itself exceeds the active page size.
- Controlled row selection: table selection mode where Vaultman owns the row
  selection state and passes it through TanStack APIs as controlled UI state.
- Current handoff: concise next-agent continuity file under `current/`.
- Current status: concise state snapshot under `current/`.
- Durable norm: repeated or approved behavior recorded in a policy, router, or
  skill so future agents can rely on it.
- Elastic UI: Vaultman's planned Thin/Balanced/Thick UI spectrum for adapting
  density, DOM shape, and styling identity to Obsidian Core, Bases, Outline, or
  richer management surfaces.
- External/test term: a term intentionally not promoted into the project
  glossary, usually because it belongs to another chat, source, or validation
  probe.
- Faint Mode: root-scoped visual state where Vaultman remaps accent CSS
  variables to Obsidian faint or muted tokens when the owning window or
  workspace focus context is inactive.
- File delete queue operation: queue representation for deleting a file that
  keeps destructive file work inside Vaultman's staged operation flow.
- FnR rename state: find-and-replace or navbar state that carries a pending
  rename handoff until the user confirms or cancels it.
- Glossary gate: required lookup before explaining unfamiliar domain terms.
- Hybrid view mode: view strategy that keeps an existing explorer mode
  available while adding a comparable alternative, such as measured cards.
- Initiative: a named workstream under `docs/work/`.
- Lossy summary: compressed rewrite that replaces detailed source material
  without preserving a path back to the source. This is a regression.
- Long-term agent memory: compact specs, policies, plans, archive records, and
  skills that survive across sessions.
- Main: release branch/path that must contain zero AI files.
- Measured card layout: card layout whose rendered height or text budget comes
  from explicit text measurement and stable layout buckets.
- Micro command: read-only short command such as `status:` or `next:`.
- Metric event: JSONL record under `metrics/` used as evidence that a
  workflow action or verification actually happened.
- Node selection service: shared service that owns per-explorer node selection,
  focus, anchor, and active-node state for tree, grid, table, and card views.
- Operational observation: environment or workflow fact noticed during a session;
  starts as a hypothesis until repeated or approved.
- Parent link: one Obsidian wikilink in frontmatter `parent`.
- Perf loop: repeatable performance diagnosis loop that gathers measurements
  before architecture rewrites or optimization claims.
- Policy: prescriptive architecture rule file.
- PretextJS: `@chenglou/pretext`, the text layout engine evaluated for
  measuring Vaultman card content.
- Primary node action: default activation command for a node when the user uses
  the main click or keyboard activation path.
- Queue builder: pure helper that converts a UI or domain intent into the
  operation payload expected by `OperationQueueService`.
- Quick-action badge: compact node, row, or card badge that shows queue/filter
  state and can expose a small direct action.
- Rename handoff: transfer of rename intent from an explorer/provider action to
  a shared confirmation surface before queue construction.
- Render hot path: rendering code path exercised frequently during scroll,
  search, filter selection, or badge updates.
- Route summary: compact active note that helps agents find the right detailed
  source, shard, policy, item, or archive record.
- Route: smallest set of docs needed for a mode or intent.
- Selected node: node included in the current selection set; distinct from the
  active, focused, hovered, or filter-matched node.
- Shard: folder manifest plus numbered slices for large docs.
- Source record: full-detail raw or canonical material preserved for inspection,
  reconstruction, audit, or future distillation.
- SVAR filemanager: `@svar-ui/svelte-filemanager`, the reference or
  command-opened filemanager surface tracked separately from core explorer work.
- TanStack Table Core: `@tanstack/table-core`, the framework-agnostic table
  engine wrapped by Vaultman's local table adapter.
- User-facing recovery wave: hardening wave that restores visible broken
  workflows before deeper architecture, interop, or polish work.
- View adapter: component or module that translates a service model into a
  concrete tree, grid, table, card, or overlay render surface.
- Viewgrid: explorer grid or tile surface that should share node semantics with
  the tree instead of owning a separate file-only model.
- Working memory: short-term agent memory in current status, handoff, and active
  work notes; it guides the next moves without replacing source records.
