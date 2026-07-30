---
title: Zoom-Out Map — Subsystem & Question Registry
type: architecture
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-27T00:00:00
updated: 2026-05-28T21:24:03
created_by: claude-opus-4-7
updated_by: codex-gpt-5
tags:
  - agent/architecture
  - agent/navigation
  - agent/roadmap
---

# Zoom-Out Map — Subsystem & Question Registry

The navigation layer. One screen that says: what subsystems/features are on the table, where each one's doc lives, what status it's in, what's still open to discuss, and **what is solid to build now**. Built to stop re-deriving and repeating. This indexes source docs — it does not restate them. Regenerate it whenever the ledger/open-inventory/roadmap move (candidate for a `vm-zoom-out` skill — see end).

## Where we are (mode)

The **goal-anchor** (the north-star spec in `docs/architecture/`) is mature: 8-dimension model + ADRs 0001–0008 (Accepted) + glossary + explorer-model (4 shards) + decision-ledger/changelog/open-inventory + roadmap-dispatch + style-source-reconciliation + version-streams + bases-interop-findings. Three days of grill/brainstorm closed the foundation.

**Remaining grill = small opens only** (minutes each, listed below). The high-value move now is to **converge to ACTION** on the NOW-tier — write its SPEC→PLAN→Issues and implement, not keep polishing goal.

## Subsystem registry (the explorer-decomposition spine + interop + ops)

Source: [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|roadmap-dispatch]] (DAG + tiers).

| ID | Slice | Tier | Status | Home |
|---|---|---|---|---|
| publish | release safety: 1.0.0-continuation reconcile · branch/channel · mis-release fix | NOW | **stable 1.0.1 SHIPPED (Codex, 2026-05-27)**; remaining = beta-channel CI · 5-stream reconcile · mobile gate · security (backlog 2–7) | [[docs/work/publish/index|publish]] |
| PlatformAdapter | adapters + Fragility Registry (ADR 0004) | NOW | ready, unstarted | model 03/04 + ADR 0004 |
| Q4 logic-extraction | logicFiles/Props/Tags/Badge/FnR out of god-providers | NOW | **ready, brownfield** (`typeFilter.ts` exists) | 01-responsibility-map + bases-findings |
| N.R | NodeRow primitive (cell = node-element) | NEXT | spec-pending | model 02 |
| V.D | view shells (engines×modes×orient) + shared render-runtime (= perf fix) | NEXT | spec-pending | model 02 + ADR 0008 |
| P.D | panel/scene: controllers + kinds + axons + InputRouter + PanelHandle | LATER | locked design | model 03/04 |
| SF | Surface foundation: page(0007) + tile-tree + WorkspaceMediator + InteractionPolicy + adapters | LATER | locked design | model 03 + ADR 0007 |
| Bases-OUT | `registerBasesView` + emit `bases-*` | LATER | **API DOCUMENTED (`obsidian.d.ts` 1.10.0+); opt-in add-on per [[docs/architecture/adr/0009-bases-interop-hybrid\|ADR 0009]]** | obsidian-extension-api-findings + bases-findings |
| caches | render-projection → media/video/icon → iconize-absorb | LATER | spec-pending | roadmap lane C |
| menu-curator | ActionProvider over Obsidian menu surfaces | LATER | locked design | ADR 0005 |
| Operations | queue/diff/VFS + agent-action API + skill + diffview/chunk-acceptance | LATER | partial source records | model 04 |
| T.G | test invariant gates (anti-drift) | cont. | ongoing | code policy |
| B.P | Bases Parity (namespaced IDs) — BREAKING; + formulas = cell-source language | MAJOR | scope sharpened, blocked | bases-findings |
| C.D | cross-provider cell data | MAJOR | design noted | model 02 |

## Roadmap gaps — NOT yet folded into roadmap-dispatch

- **Style/Theme axis**: N (SCSS→UnoCSS) · ThemeBuilder (#10) · color governance (#8) · bits-ui (#12) · Settings UI (#5) · snippet UX (#9). Hard constraint: proto-style breaking changes land BEFORE N.
- **Keyboard / API / NN**: K.B (keyboard) · public API · I.E (NN engine swap / NN-interop).
- **Feature-request intake 2026-05-28**:
  [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/index|feature-request architecture fit]] adds public engine API, public provider/index API, alias labels/search, gesture/InputBinding, onboarding/agent-write API, outline graph, Charts/DataViz, ScenesManager/LayoutBuilder, and FrontmatterScene; dev-blocked decisions S-15..S-25.
- **Filter/Scene (2026-05-27 session)**: FilterGroup synthesis + Scene-family + 1:1/2:1 + replace-list — see open-inventory "LOCKED 2026-05-27 (later)" + bases-interop-findings.
- **Storage architecture (cross-cutting, scoped 2026-05-27)**: storage tiers across `serviceMark` (NOT built), indexes, media-cache (with quality tiers + IndexedDB controls — own research running), explorer pipeline, settings. Pending the media-cache/IndexedDB recon → then a **holistic Storage Architecture grill + ADR**. `serviceMark` storage decision deferred to fold into it.

## Open-questions inventory (what's LEFT to discuss vs done)

Source: [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/open-inventory|open-inventory]].

**Small open decisions (grill-able in minutes):**
- style matrix row 7 — selection color: restore accent (stable) vs keep text-faint (beta).
- ActionNode refinements — `opensOverlay` · anim-by-order · binding-cell (dev to define).
- islands top/bottom on a large surface (main-leaf) — defer to Surface-foundation spec.
- version-streams — promotion-gate checklist + canary feature-flags. (Pre-release labels + per-channel versioning RESOLVED 2026-06-11, PSS grill Q10: `alpha`(sandbox) → `beta`(dev) → `rc` → stable; canary = stream name only.)
- Bases replace-vs-interop risk (1:1 replicate → user can disable core, but upstream-break exposure → Fragility Registry).
- serviceGroup → `logicGroup`? (naming, low-stakes, dev's call).

**Parking-lot (each its own grill/brainstorm session):**
- ~~preset taxonomy~~ RESOLVED 2026-06-11 (PSS grill: 6 facetas style/layout/load/view/workspace/input + Profile + cascada — [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/05-pss-grill-notes|notas]]) · install-preset selector (barebones/native/polish — barebones = {config_scene, snippet_scene, plugin_scene}) · serviceUnload/load-preset granularity (user-facing; ahora = faceta load/LUPA) · plugin-provider intercepts CORE plugins · serviceMark god-object decomposition (frontera con PSS ya definida: mark = dato de nodo, infra compartida) · LayoutBuilder + Workspace-profiles (Workspace-profile = Profile a scope workspace, glossary) · ~~Bookmarks~~ → marks_scene + mark kinds (PSS grill §21) · ~~proto-deep grill~~ DONE como v12 (synthesis umbrella 2026-06-10) · EditorScene · Hometab.

**Deferred:** minisearch fork (H1) · Bases interop release order · Nav3D / InputBindingNode · NN-interop.

**Meta:** reconcile ADR 0006 (2-channel → 5-stream) · pkm-ai memory-routing upgrade · this zoom-out skill.

## NOW-actionable — the "solid to build" answer

Three slices are ready (∥ independent; roadmap says start 2–3 agents, git worktree each):

1. **logic-extraction (Q4)** — MOST concrete. Brownfield: `typeFilter.ts` / `serviceBasesInterop.ts` already exist. First move: reconcile the FilterGroup synthesis against `typeFilter.ts`, then spec `logicProps`/`logicTags`/`logicFiles`/`logicBadge`/`logicFnR*` extraction (tracer-bullet). Gates the whole spine.
2. **publish** — release safety. First move: hand to a dedicated agent; reconcile stable = 1.0.0-continuation; branch-protect main + husky manifest-block.
3. **PlatformAdapter** — first move: scaffold the adapter interface + Fragility Registry + capability probe + serviceUnload-revert (ADR 0004).

## Already-locked — do NOT re-litigate

8-dim model · View=pure-renderer · 2-layer render ownership (ADR 0008) · page=editor-group (ADR 0007) · Cell+view-config Bases-aligned (ADR 0003) · ActionNode unification (ADR 0005) · PlatformAdapter+Fragility (ADR 0004) · panel-scoped controllers + panel kinds · WorkspaceMediator + stateless InteractionPolicy · Selection/Dnd scope-generic axons · InputRouter (nav = subset of action) · unified mutation pipeline · two tiling levels · queue+filters = Scenes · FilterGroup synthesis · Scene-family · 1:1/2:1 parity.

## Proposed skill — `vm-zoom-out` (question-inventory + roadmap)

Generate/refresh THIS map + a question-inventory from the ledger/open-inventory/roadmap-dispatch on demand, so a session can answer "what's on the table / what's open / what's buildable" in one hop. Folds into the [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|memory-routing upgrade]]. Write via the write-a-skill skill (own task).

## Status

Navigation map created 2026-05-27. Keep it current as items lock/close. Next: dev picks a NOW slice to act on; remaining small opens are grill-able anytime but no longer block action.
