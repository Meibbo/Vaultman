---
title: Open Inventory + Iteration Review (2026-05-25 → 27)
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]]"
created: 2026-05-27T00:00:00
updated: 2026-05-28T21:24:03
created_by: claude-opus-4-7
updated_by: codex-gpt-5
tags:
  - agent/research
  - initiative/hardening
  - agent/decision-ledger
---

# Open Inventory + Iteration Review

The single consolidated view of the 2026-05-25→27 grill: what LOCKED this iteration, what was pending from before, and what is newly pending. Per-decision detail + rationale: the [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-ledger|decision-ledger]];
what changed + why: the [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-changelog|decision-changelog]].

## LOCKED this iteration

**Architecture / orchestration** (model: [[docs/architecture/explorer-model/index|explorer-model]] + 4 shards):
- Orchestrators = **Panel-scoped controllers** (not Scene-scoped); Scene composes via `PanelHandle`.
- Panel **kinds** (panelExplorer / panelData / panelContent / custom); host concerns per-kind;
  Projection + Expansion = panelExplorer-kind controllers.
- `panelContent` ≠ `ContentNode` (data atom vs editor-runtime panel).
- `PanelHandle` = minimal core + optional capability members gated by kind.
- Selection + Dnd = **scope-generic axons** (panel nodes + workspace layout-edit elements).
- **input→action = `InputRouter`**; **navigation = a subset of action** (nav-kind ActionNode, transient view-state, handled by Selection/Expansion) — no separate nav branch.
- **Unified mutation pipeline**: → `OperationNode` → preview (`serviceDecorate` + `diffview`) → chunk-acceptance → execute (VFS/queue). + single-node inline rename (no FnR island) + bypass-queue mode.
- Cross-panel = **one scene-agnostic mechanism**: `WorkspaceMediator` + stateless `InteractionPolicy`;
  Obsidian editor + foreign leaves = first-class drop targets.
- **Two tiling levels**: native split (`page` = editor-group, ADR 0007) + Scene tile-tree (maximize-one/partial-split); ForeignEmbed via PlatformAdapter.
- queue + filter-lists → **Scenes** (mountable on any surface).
- grid drill-nav: decompose as-is into ExpansionController; only Nav3D / InputBinding deferred.
- **ADRs 0007 + 0008 → Accepted** ([[docs/architecture/adr/README|all 0001–0008 Accepted]]).
- Linear engine gains a `tiles` mode (proto viewTiles).

**Process / roadmap / style:**
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|roadmap-dispatch]] = dispatch-ready DAG + Now/Next/Later + cost-of-unblock priority + task contracts.
- Line-limit policy **tiered** (≤200 clean / 201–300 soft-WARN dev-decides / >300 hard) — health script + `policies/docs.md`.
- [[docs/work/hardening/research/2026-05-26-style-source-reconciliation/index|style-source-reconciliation]] method + matrix (proto-design + stable↔beta evidence); theme palettes DROP; search = transient decoration; selection-color regression found; vocab = ADOPT/RESHAPE/MAP/ADD/FIX/DROP/DEFER/SUPERSEDE.
- proto-v6-sidebar-map: islands = Scenes; FiltersIsland → logicProps/Tags, FnR → logicFnR* (near-term UX targets); flip = enumerate only DROP/DEFER/FIX, default RESHAPE.
- [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]]:
  5 streams (goal/proto/canary/beta/stable); distillation flow; branch map main=stable/dev=beta/ sandbox=canary; flow discipline (upward-only promotion, branch-protect main, husky manifest-block, shared lock main+dev); proto = "proto design" (rolling, snapshot-mapped).
- `decision-changelog` created (supersession audit trail).

## LOCKED — 2026-05-27 (later) proto/filter grill

Lead proto-integration grill, option B (lock near-term targets; defer proto-deep to v7). Full Bases facts:
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/bases-interop-findings|Bases interop findings]].

- **FilterGroup synthesis**: the FiltersIsland model = a **recursive, Bases-shaped boolean predicate tree** (and/or/none + nested groups + orphans), produced by a synthetic **`FilterProvider`** (projects the active panel's filter-config → editable tree; writes back; savable as preset/template; NOT a serviceMark).
  Rendered as a **ContainerNode tree**; **predicate leaf = a generic Cell (no new NodeKind)**.
- **No new engine-modes** (E): predicate-tree + queue-builder both render via the existing **Linear tree-indent** mode + Scene **rule-primitives** (AND/OR/NONE chip = primitive bound to the container, cycles via an ActionNode; composer; apply). View stays pure (ADR 0002).
- **Scene family** = `filterScene` · `queueScene` · `sortScene` · `viewScene` (proto islands as Scenes on overlay surfaces). Scene = preset-agnostic logic; floating-island look (curved corners + optional backdrop) = **polish preset only** (native = menu/submenu; barebones = minimal).
- **Squircle/island actions** (save-template/clear/apply/add-group/play/import-export) = **ActionNodes** indexed in the ActionProvider (ADR 0005); bindable to inputs / InputBinding.
- **1:1 / 2:1 parity vocab** locked (see glossary): 1:1 native parity (chameleon native preset; core CSS reused as pseudo-snippet, not reimplemented) vs 2:1 superset (all replaced-core caps + extras + full builder). barebones preset = load/unload service UI = the add-on-explorer with function categories (one = plugin bridges) — fuses install-selector + serviceUnload-granularity + plugin-provider.
- **Brownfield**: `typeFilter.ts` (FilterRule + filterType enum + unbounded nesting), `typeBasesInterop.ts`, `serviceBasesInterop.ts` (IN-only), and a `.agents/skills/obsidian-bases/SKILL.md` already exist.
- **Core-plugin replace-list** (scopes 2:1): File Explorer · Search · Tags · Outline · Properties · Workspaces · **Bookmarks** (in scope, grill later). Not-yet-planned (no idea yet): Backlinks · Outgoing Links · Page Preview. Interop-not-replace / tension: Bases · Canvas · Graph.
- **Bases differentiators** (vs read-only Bases): operations/mutation pipeline (THE founding gap:
  inter-plugin interaction + orchestrated mass actions) + content/block/outline logic + interactive builder UX + cross-surface generality. Formulas (`html()`/`badge()`/`icon()`/`image()`) = a Cell-source language (ADR 0003 + B.P), not filter scope.
- **Bases interop strategy LOCKED** ([[docs/architecture/adr/0009-bases-interop-hybrid|ADR 0009]], 2026-05-27): hybrid — native shells PRIMARY (user can disable core Bases) · Bases-IN + import/export ALWAYS · Bases-OUT (`registerBasesView`) = opt-in add-on behind a PlatformAdapter (ADR 0004) · foreign Bases views from other plugins stay OPAQUE (coexist via Obsidian's view-type switch, not absorbed). Reshapes B.P scope (config translator + BasesView subclasses).

New opens from this session:
- **Bases replace-vs-interop risk** — **RESOLVED 2026-05-27 via ADR 0009** (hybrid: native primary; OUT only as PlatformAdapter add-on → API churn isolated to one adapter + the config-abstraction layer).
- **soft-lock / locked-combos backdrop** (LayoutBuilder invalid-combo UX + advanced/raw escape) = **parked as idea** until real cases demand it.
- **Storage architecture (cross-cutting open, scoped 2026-05-27)** — storage tiers across subsystems:
  `serviceMark` (NOT BUILT YET; 0 refs in `src/`), indexes (`servicePropertyIndex`), media-cache (quality tiers + IndexedDB controls — own research running), explorer pipeline, settings. Durable pattern in tree today = `Plugin.saveData()` → `data.json` (synced via `.obsidian/plugins/`, the user's `pageOrder` + `serviceLeafDetach` already use it). Risk at scale: `data.json` bloat + sync churn for high-cardinality / binary data. Pending the media-cache/IndexedDB research → then a **holistic Storage Architecture grill + ADR**. `serviceMark` storage decision DEFERRED to fold into that.
- **Pending dev decisions (durable registry)** → [[docs/architecture/pending-decisions|pending-decisions]]:
  storage S-1..S-5 (tier table · media-cache strategy · settings deep-merge · cache-controls UX · ADR 0010);
  newly raised S-6 note-frontmatter as a tier (node-attribute cells only — never subsystem configs) + S-7 own `.vmscene` format (single polymorphic ext, YAML, `registerExtensions`); R-1 Dataview/Datacore interop research. Dev is sending more analysis before answering.
- Persist-pending (next agent): fold the FilterGroup synthesis into explorer-model shards (02/04); sharpen B.P + logic-extraction cards in `roadmap-dispatch`; reconcile the extraction against `typeFilter.ts`.

## Pending — carried from the previous iteration

- Hand [[docs/work/publish/index|publish]] to a dedicated agent (stable = v1.0.0-continuation reconcile + branch/channel mechanics + the mis-release fix). PENDING.
- Per-sub-system SPEC → PLAN → Issues (logic-extraction → N.R → V.D → P.D). PENDING (gated on greenlight).
- 0-A.S scroll harness fine-grained marks (Tree/List/Grid). PENDING.
- Branch 3: minisearch fork (H1: own index vs Omnisearch bridge) + Bases interop release order. DEFERRED.
- Pre-existing health residuals (umbrella / vertical-threads line-limits, timestamp-offsets). NOT ours.

## Pending — new this iteration

**Parking-lot (each needs its own grill):**
- preset taxonomy: style / layout / load / workspace presets; style-diffs as pseudo-snippets.
- install preset selector: barebones / core-native / polish.
- `serviceUnload` / load-preset full mechanic = **USER-FACING granularity** (lite/bloated, anti-uninstall) — NOT publish.
- plugin-provider intercepts **core** plugins.
- `serviceMark` god-object decomposition.
- LayoutBuilder + Workspace-profiles (own brainstorm; research Obsidian Workspaces + Notion).
- proto design integration grill (islands-as-Scenes; proto v7 ships 2026-05-28).
- [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|pkm-ai memory-routing upgrade]] (logged).

**Open decisions:**
- ActionNode refinements (`opensOverlay`, anim-by-order, binding-cell) — dev to define.
- islands top/bottom rule on a large surface (main-leaf) — defer to Surface-foundation spec.
- style matrix row 7: selection color = restore accent (stable) vs keep text-faint (beta).
- version-streams: pre-release labels + per-channel versioning; promotion-gate checklist; canary feature-flags.
- Feature-request intake 2026-05-28:
  [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/index|feature-request architecture fit]] captured public engine/provider API, aliases, gestures/InputBinding, onboarding/agent-write, outline graph, charts/DataViz, ScenesManager/LayoutBuilder, and FrontmatterScene. Dev-blocked decisions are parked as S-15..S-25.

**Roadmap gaps:**
- `roadmap-dispatch` does NOT yet include the Style/Theme axis (N/UnoCSS, ThemeBuilder, color, bits-ui) or Keyboard/API/NN.
- N (UnoCSS) sequenced AFTER proto-design integration + V.D.

**Meta:**
- Reconcile ADR 0006 (2-channel → 5-stream).

## Status

This is the consolidated review surface. Update it as items lock / close. Soft-WARN residuals:
decision-ledger 204, current/status ~293, current/handoff ~282 (dev-decided per the tiered policy).
