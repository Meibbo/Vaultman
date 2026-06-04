---
title: Pending Decisions Registry (dev-blocked)
type: architecture
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-27T00:00:00
updated: 2026-05-29T23:45:00
created_by: claude-opus-4-7
updated_by: codex-gpt-5
tags:
  - agent/architecture
  - agent/navigation
  - agent/decisions
---
# Pending Decisions Registry

Durable cross-agent-visible registry of decisions parked **awaiting the dev**. Any agent can read this,
see what is blocking which design pass, and either pick up the decision or skip to the next actionable
item. Created 2026-05-27 at dev request: "déjalas en algún lugar que no se te olviden, para que otro
agente también los pueda ver."

Format per entry: ID · question · options · recommendation (if any) · context-doc · status.

## Storage Architecture (raised 2026-05-27 from `storage-architecture-findings`)

The grill decisions from the storage recon. Dev is sending additional analysis before answering.

### S-1. Per-subsystem storage tier table — confirm or revise
- **Proposed map**: see `storage-architecture-findings` §8 (now 6 tiers after dev added note-frontmatter
  on 2026-05-27, see S-6).
- **Options**: accept · revise · per-subsystem changes.
- **Status**: open — dev to answer.

### S-2. Media-cache strategy
- (a) IDB-only thumbnails + on-demand fetch (no full assets persisted).
- (b) **HYBRID: IDB thumbnails + vault-FS sidecar for full assets** (REC — balances perf + portability).
- (c) Vault sidecar everything + user opt-in for no-sync via 3rd-party (Syncthing / Git on a non-vault
  folder).
- (d) Other / mixed.
- **Context**: `storage-architecture-findings` §2, §4, §7.
- **Status**: open.

### S-3. Schema-aware deep-merge for settings
- **Question**: implement our own schema-aware deep-merge at the settings layer instead of trusting
  Obsidian's raw "last-modified wins" for `data.json`?
- **Recommendation**: yes — mitigates the mobile-overwrites-desktop bug class (see iconize #565).
- **Status**: open.

### S-4. Cache-controls UX scope
- **Question**: scope a cache-controls UX — size cap · quality ladder (e.g. 32 / 128 / 512 / full) ·
  LRU + TTL eviction · clear-cache UI?
- **Recommendation**: yes — innovation gap (no community plugin has it per `storage-architecture-findings`
  §3).
- **Status**: open.

### S-5. Write ADR 0010 (Storage tiering) once S-1..S-4 lock?
- **Recommendation**: yes — hard-to-reverse, surprising-without-context, trade-off-driven.
- **Status**: open.

---

**Newly raised by dev 2026-05-27 (analysis-in-progress, scope still being shaped):**

### S-6. Note-frontmatter as a storage tier (NEW)
- **Dev input**: YAML frontmatter (and pure-frontmatter `.md` files) as a candidate storage for
  **node-level variables only** — cell-as-node-attribute (media-cell → node background, color-cell →
  node color), per-container engine choice for children, per-note overrides. **Not** for subsystem-wide
  configs (risk: user accidentally deletes the note → corrupts settings). Power-user option: per-setting
  "storage-selector" (we provide a default; the user can override where each thing goes).
- **Open sub-questions**:
  - Scope: confirm "node-attribute cells only" (REC) vs broader.
  - Namespace inside frontmatter (e.g. `vm:` prefix or nested key) to avoid collisions.
  - Pure-frontmatter `.md` files supported? Implies full YAML parser (arrays + nested) → a
    load/unload-toggleable sub-system (reinforces `serviceUnload` importance).
  - Per-setting storage-selector — v1 or later?
- **Status**: dev to refine scope. Tier #6 is already PROPOSED in `storage-architecture-findings` §8.

### S-7. Our own scene file formats (NEW)
- **Dev input**: don't alter `.base` / `.canvas` (rejected — Bases refuses to render an altered `.base`).
  Create OUR own per-scene format. Pairs with import/export (ADR 0009 hybrid).
- **Recommended shape** (REC): single polymorphic extension `.vmscene` with
  `{type: filter|queue|sort|view|composite, name, version, payload}`; YAML (consistent with Bases +
  frontmatter); `registerExtensions(['vmscene'], 'vaultman-scene')` so opening a `.vmscene` mounts our
  renderer; bidirectional bridges to `.base` / `.canvas` / `.json` / dataview-codeblock /
  datacore-codeblock (latter two depend on R-1).
- **Open sub-questions**: single polymorphic ext vs per-scene `.vmfilter`/`.vmqueue`/...; YAML vs JSON;
  top-level shape.
- **Status**: just raised — needs a scoping pass.

---

### S-8. Reconstruction-not-refactor framing + preview-prototype strategy (NEW 2026-05-27)
- **Dev input**: with everything we've decided, this is no longer a decomposition / refactor — it's a
  **reconstruction** at our current level. The stable `main` line vs `sandbox` (then called beta; now
  canary per `version-streams`) already differs
  abysmally in tooling / libraries / build process / functions; proto design is CSS+React+HTML, an
  ultra-complex translation step before anything lands in stable. The goal stream's eventual `main`
  result will be a paradigm shift away from current `main`.
- **Open**:
  - **Frame**: do we keep calling it "hardening / decomposition" or rename to "reconstruction wave"?
    Honest framing helps planning + sets contributor expectations.
  - **Preview / prototype mechanic**: each sub-system spec should include a UX/architecture **preview**
    (mockup · structural snippet · walkthrough) BEFORE the full implementation plan, so the dev sees
    how aggressive each change is before authorizing it. Especially load-bearing for style/UI heavy
    sub-systems (proto-design integration → V.D → P.D → Surface foundation → ThemeBuilder).
  - **Visual prototyping artifacts** allowed before code? (Figma / Stitch / plain `.svelte`
    sketch-files / images?)
- **Recommendation** (REC): yes — rename internally to "reconstruction wave" within hardening; require
  preview artifact per spec for any style/UI-heavy slice; allow `.svelte` sketch files + Figma-style
  mockups in a `docs/work/<initiative>/previews/` folder so the dev can react before authorizing build.
- **Status**: just raised — dev to refine + decide.

### S-10. DnD library lock (NEW 2026-05-27 — now UNBLOCKED)
- **Dev input** (proposed by R-DND-C + R-DND-A): adopt **`dnd-kit-svelte` (HanielU port)** as the
  canonical Svelte DnD library. Full dnd-kit feature parity. Maps cleanly to the locked axons +
  `InteractionPolicy` + `PanelHandle` model. Foreign-target drops covered by `EditorSurfaceAdapter`
  (CodeMirror `domEventHandlers`) and `HoverFloatAdapter` / `ForeignEmbedAdapter` (hover-editor
  template via `monkey-around` + `interact.js`) — see S-11.
- **Recommendation**: **LOCK** — R-DND-A confirmed the foreign-drop adapter shape; nothing else
  blocks.
- **Context**: `dnd-library-findings` + `obsidian-dnd-findings` + `tooling-libraries`.
- **Status**: open — dev to confirm.

### S-11. Adopt `monkey-around` + `interact.js` for PlatformAdapters (NEW 2026-05-27)
- **Dev input** (proposed by R-DND-A): adopt **`monkey-around`** for safe prototype wrapping in all
  PlatformAdapters (probe + revert via the returned `unpatch`, matching ADR 0004 `serviceUnload`); and
  adopt **`interact.js`** (or the `@nothingislost/interactjs` Obsidian fork) for floating-tile
  drag/resize in `HoverFloatAdapter` + `ForeignEmbedAdapter`.
- **Invariant**: ALWAYS load patches in `onLayoutReady()` to avoid racing Obsidian's internal init
  (added to `operational-watch-list` §6).
- **Recommendation**: **yes** — battle-tested by hover-editor + pane-relief; cleanly composes with
  `serviceUnload` + Fragility Registry.
- **Open sub-question**: which `interact.js` variant — upstream `interactjs.io` or the
  `@nothingislost/interactjs` Obsidian fork (and do we eventually upstream the fork's patches)?
- **Status**: open — dev to confirm.

### S-12. Append-only status / handoff writes (NEW 2026-05-28, best-practices P1)
- **Dev input** (from `agent-memory-routing-best-practices`): adopt append-only writes — each session
  writes its own `.agents/sessions/YYYY-MM-DD-<agent>.md` shard + appends a one-liner index to
  [[docs/sessions/session-log|session-log]]; `status.md` / `handoff.md` never overwritten in place.
  Eliminates last-write-wins races when parallel agents run.
- **Recommendation**: adopt INCREMENTALLY — start with session-log (already done); migrate
  status/handoff to journal-line appends only when parallel-agent friction surfaces.
- **Status**: open — workflow change, dev confirm.

### S-13. Semantic topic index for cross-session queries (NEW 2026-05-28, best-practices P2)
- **Dev input**: create `docs/architecture/topic-index.md` listing all key docs by tag (`#sync` ·
  `#dnd` · `#bases` · `#perf` · `#identity` · `#storage` · `#publish` · …). Lets a fresh agent answer
  "all decisions about persistence" or "all research about DnD" without exhaustive linear scans.
- **Recommendation**: yes — cheap (2 hr equiv), big payoff once the doc set crosses ~30 surfaces.
- **Status**: open.

### S-14. Evaluate queryable memory MCP server (NEW 2026-05-28, best-practices P3)
- **Dev input**: evaluate [Memorix](https://github.com/AVIDS2/memorix) or AgentMemory.dev as an MCP
  server providing a queryable memory layer (works with Claude Code · Cursor · Codex · Gemini CLI ·
  Windsurf). Reduces cold-start time vs re-reading markdown.
- **Recommendation**: defer — re-evaluate when (a) parallel agents become routine, or (b) doc count
  outpaces semantic indexing.
- **Status**: open · low priority.

### S-9. Periodic "stability promotion" mechanic (NEW 2026-05-27)
- **Dev input**: promote main's stability (security, tests, release infra) periodically into `dev` +
  `sandbox` so canary/beta don't drift behind on fundamentals. Was offered earlier; reminded today.
- **Open sub-questions**: cadence (weekly · monthly · ad-hoc on stable releases)? Which classes of
  fixes (security only · CI · all) promote? Owned by the transition-agent within the publish
  initiative.
- **Status**: open — needs a small spec under `publish/`.

## Feature Request Intake (raised 2026-05-28)

Full evaluation source:
[[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/index|feature-request architecture fit]].

### S-15. Public external engine API scope
- **Question**: should Vaultman expose external engines only as pure renderers over a render-projection +
  shared runtime, or allow plugins to bring custom projection/runtime hooks too?
- **Recommendation**: renderer-only first; projection/provider/runtime extensions are separate APIs.
- **Status**: open.

### S-16. Public provider/index API scope
- **Question**: should external plugins register providers/indexes that emit Node snapshots/cells, and what
  is the minimum stable contract?
- **Recommendation**: yes eventually, but start with internal provider registry stabilization during
  logic-extraction; public API after the spine is stable.
- **Status**: open.

### S-17. Remote/fetched provider privacy, auth, and cache policy
- **Question**: what permissions, OAuth/token storage, cache tier, and offline behavior are required for
  remote providers such as YouTube/Spotify playlists?
- **Recommendation**: block public remote providers until Storage Architecture + privacy rules lock.
- **Status**: open.

### S-18. Alias label/search behavior
- **Question**: should alias display be global, per-explorer, per-view-config, or per-node; and what is the
  fallback order when aliases are missing?
- **Recommendation**: per-explorer/view-config default with per-node override; search should include title +
  aliases unless the user explicitly narrows it.
- **Status**: open.

### S-19. Gesture/InputBinding grammar and mobile defaults
- **Question**: which gestures become first-class InputBinding primitives (long-press, swipe, slide,
  directional drag, shake, accelerometer/gyroscope), and what are the mobile defaults?
- **Recommendation**: define a gesture grammar feeding InputRouter; keep ActionNode unchanged.
- **Status**: open.

### S-20. Onboarding overlay vs notification center scope
- **Question**: are tutorial coach-marks, timed helper overlays, and notification center one Scene family
  or separate surfaces?
- **Recommendation**: separate: tutorial overlay/coach is onboarding; notification center is a durable
  Process/Operations surface.
- **Status**: open.

### S-21. Privacy-preserving agent writing API
- **Question**: can an LLM/agent write at the cursor using only cursor/selection/action-index context,
  without reading user files, and does it go through OperationNode preview or an immediate cursor-write mode?
- **Recommendation**: yes in principle; require explicit privacy mode + editor-scope context contract.
- **Status**: open.

### S-22. Outline graph placement
- **Question**: is outline graph a Canvas engine mode over Content/Adopted nodes, or its own engine?
- **Recommendation**: Canvas mode unless research proves it needs a separate runtime.
- **Status**: open.

### S-23. Charts/DataViz engine decision
- **Question**: should charts/stats become a fifth engine, or a `panelData` runtime family?
- **Recommendation**: start as `panelData`/DataViz runtime; promote to fifth engine only if node/cell
  projection semantics match other engines.
- **Status**: open.

### S-24. ScenesManager/LayoutBuilder family scope
- **Question**: does `ScenesManagerScene` equal LayoutBuilder, or is it only a scene registry inside the
  larger LayoutBuilder / Workspace-profile track?
- **Recommendation**: treat it as LayoutBuilder-family until its responsibilities are split.
- **Update 2026-06-03 (CR-1 grill, ADR 0011)**: scenesManager confirmed **CORE + its own lever**
  (visibility show/hide ≠ LUPA unload ≠ LayoutBuilder spatial-arrange). Its explorer renders scenes
  (incl. native-as-chameleon: editorScene / fileScene / ribbon / statusbar) as nodes with an action-cell
  (visibility toggle) + cell_media thumbnail; redesign_mode edits propagate to those thumbnails
  (perf invariant → operational-watch-list §7). Source: [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/decisions/CR-1-core-vs-companion|CR-1]].
- **Status**: open (scenesManager-core part resolved; LayoutBuilder / Workspace-profile track scope still open).

### S-25. FrontmatterScene native parity scope
- **Question**: what exact native Properties behaviors must FrontmatterScene match before polish features
  are allowed?
- **Recommendation**: first target global/native preset parity over focused-editor key/value nodes, backed
  by `logicProps` and WorkspaceMediator.
- **Status**: open.

### S-27. PanelData data contract
- **Question**: should dashboards/charts/widgets use ordinary Node projections or a separate
  `MetricProvider`/`DataSnapshot` contract?
- **Recommendation**: do not lock yet. Working hypothesis: `panelExplorer` is a collection/navigation
  workbench over many NodeOccurrences; `panelData` is a computed/interactive data unit that can consume
  nodes/selections/queries/time and emit Operations back to nodes. Needs its own grill, especially for
  charts, spreadsheet-like tables, dashboard widgets, timers, and scriptable logic.
- **Status**: open.

### S-28. External provider remote actions
- **Question**: can external providers register account-backed actions such as "like YouTube video" or
  "save Spotify track", and what preview/undo/offline guarantees apply?
- **Recommendation**: yes via ActionNode → RemoteOperationNode with declared auth scopes, retry/offline
  behavior, and honest undo limitations.
- **Status**: open.

### S-29. UI primitive adapter strategy
- **Question**: do we keep Bits UI, use shadcn-svelte copied components, or build custom primitives?
- **Recommendation**: wrap whichever implementation behind VM primitive contracts; decide libraries by
  prototype, not theory.
- **Status**: open.

### S-30. Toolbar preset targets
- **Question**: should Vaultman support quick switching between Obsidian-native and Notion-like toolbar
  layouts as presets?
- **Recommendation**: yes as Toolbar model resolver + primitive registry + placement policy + Style/Theme
  preset; same ActionNodes, different composition.
- **Status**: open.

### S-31. Anecdotal edge-case capture / model-thinking routing
- **Question**: should PKM-AI capture dev examples that are used to test model boundaries even when they
  are not yet decisions/specs?
- **Recommendation**: yes. Add an anecdotal edge-case ledger indexed by topic and route into it only when
  a relevant term/topic appears. This preserves examples such as zebra/chess decoration without bloating
  active architecture docs.
- **Context**: [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|agent memory routing upgrade]].
- **Status**: open — pkm-ai workflow decision.

## Cross-cutting research blocking decisions

### R-1. Dataview / Datacore interop research (NEW 2026-05-27)
- **Need**: gather the Dataview + Datacore query language, codeblock syntax, value model, JS API, and
  common plugin import/export patterns. Feeds S-7 (scene-file-format bridges) and the broader interop
  story.
- **Status**: PENDING in `research-inventory`.

## Process

- Any agent may append entries here when they encounter dev-blocked decisions.
- When the dev answers, **move the entry to its source-of-truth doc** (`open-inventory`, the
  decision-ledger, or the corresponding ADR) and DELETE the row here — this registry is for OPEN items
  only.
- Pair with `research-inventory` (research backlog), `open-inventory` (locked + pending state),
  `zoom-out-map` (subsystems), `operational-watch-list` (invariants).
