---
title: Feature Request Architecture Fit — 2026-05-28
type: research-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-28T21:24:03
updated: 2026-05-29T23:58:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/research
  - initiative/hardening
  - explorer/architecture
  - agent/feature-intake
---

# Feature Request Architecture Fit — 2026-05-28

Feature-request intake against the locked architecture after the 2026-05-25→28 foundation wave.
This is NOT a spec and creates no implementation greenlight. It classifies each request by axis,
locked-decision fit, conflict risk, S-8 reconstruction impact, roadmap tier, dev-blocked decisions,
and research queues.

Authoritative locks used: ADRs 0001–0009, explorer-model shards 01–04, operational-watch-list,
version-streams, decision-ledger/changelog, open-inventory, roadmap-dispatch.

## Publish Discipline Resolution

The dev clarified that the newer `version-streams` discipline is authoritative:
`main = stable`, `dev = beta/nightly`, `sandbox = canary`. Older publish/ADR text that said
`sandbox = beta` is superseded and must not guide future publish work.

## Intake Matrix

| ID | Request | Axis | Fit / conflict | S-8 impact | Tier | Follow-up |
|---|---|---|---|---|---|---|
| F-1 | Public API for external plugins to create custom engines | View · Process/API · Platform | Fits only if engines are pure renderers over our render-projection + shared runtime contracts. Conflicts if an external engine owns projection/data/runtime ad hoc, bypassing ADR 0002/0008. Bases API is a reference shape, not the whole contract. | Foundation change if public/stable; small if internal adapter first | LATER/MAJOR | S-15 · R-API-ENGINE |
| F-2 | Public API for custom indexes/providers, incl. YouTube/Spotify playlists | Node · Logic · Process/API · Operations | Fits the Node model: providers emit nodes/cells/snapshots. Conflicts if fetched/intercepted data bypasses storage tiers, cache controls, privacy/auth, or the OperationNode mutation path. | Foundation change for public API; internal provider extraction is already NOW/NEXT | NEXT internal, LATER/MAJOR external | S-16 · S-17 · R-REMOTE-PROVIDER |
| F-3 | Alias-based node labels and alias-search | Node · Logic · View | Clean fit: label is a Cell source / semantic role chosen by view-config; search can include alias tokens from metadataCache. No architecture conflict. | Small reshape | NOW/NEXT | S-18 if behavior needs dev preference |
| F-4 | Smart ActionNode/button gestures: slide/swipe/drag/shake/long-press/accelerometer bindings | Logic · Navigation · Process · Mobile | Validates the locked input-agnostic `InputRouter`: raw inputs map to ActionNodes; navigation remains a subset of actions. No A.R re-refactor if gesture recognizers are adapters feeding InputRouter. Mobile sensors require platform gates. | Medium; not foundation if grammar stays outside ActionProvider | LATER/MAJOR | S-19 · R-GESTURES |
| F-5 | Helper tutorial overlays + notification center + timed prev/next/backdrop onboarding | Surface · Process · Style/Theme · Navigation | Fits overlay/surface model. Must not hold panel state; should route through Surface capability profiles. Notification center is adjacent but separate from tutorial coach. | Small/medium reshape | LATER | S-20 · R-ONBOARDING |
| F-5a | Writing tool API + skill: agent writes at cursor without reading files, with VM actions index | Operations · EditorSurfaceAdapter · Process/API · Privacy | Fits the Operations public API and EditorSurfaceAdapter. Conflict risk: direct editor writes must not silently bypass preview/queue policy unless a privacy-safe immediate mode is explicitly allowed. | Foundation change in Operations/API | LATER/MAJOR | S-21 · R-AGENT-WRITE |
| F-6 | Outline graph view: headers/subheaders as nodes connected by hierarchy / `note#header` links | View · Node · Logic | Best fit = Canvas engine mode over Content/Adopted nodes (`mindmap`/`graph`). Do not create a separate engine if pan/zoom/rotate controls are shared. Native Graph interception is a PlatformAdapter research topic, not a dependency. | Small/medium; uses existing Canvas slot | LATER | S-22 · R-GRAPH |
| F-7 | Fifth engine for charts/stats; decide LayerChart vs D3 vs Plot | View · panelData · Tooling | Potential conflict with locked four-engine list. Safer framing: `Charts/DataViz` as a `panelData` engine or runtime family; if promoted to fifth engine, log a supersession. Avoid naming it `Graph` because Canvas already owns node-link graph mode. | Foundation change if fifth engine; small if panelData runtime | LATER | S-23 · R-CHARTS |
| F-8 | ScenesManagerScene / DrawerScene / callout manager / right-click checkbox variants / container nodes | Surface · Logic · Node · LayoutBuilder | Fits deferred LayoutBuilder/Scene-management family. ContainerNode answer: already a NodeKind; "group" is one producer/use, not a separate kind. Drawer/callout/checkbox variants need sub-scope before spec. | Medium; no foundation change unless Scene taxonomy expands | LATER | S-24 · R-CALLOUT-MANAGER |
| F-9 | FrontmatterScene replacing core Properties panel, real-time with focused editor | Node · Logic · Surface · View | Clean fit: `panelExplorer` over metadata nodes, driven by `logicProps`, with WorkspaceMediator tracking active editor/file. Native/global preset first; polish later. | Small/medium reshape | NEXT | S-25 · R-PROPERTIES-PARITY |

## Recommended Architecture Stance

- External engine API and external provider/index API are two different public surfaces. Keep them
  separate: engines render projections; providers construct nodes/cells/snapshots.
- For user-facing copy, "button" is fine. Internally, keep `ActionNode` as the contract term so
  actions remain bindable/renderable across menus, bars, FABs, gestures, and shortcuts.
- Gesture vocabulary should be normalized before implementation:
  - drag = continuous pointer movement with payload or element displacement.
  - swipe = short, velocity/threshold-based directional gesture.
  - slide = constrained drag along a track until a completion threshold.
  - shake/agitate = repeated oscillating motion pattern.
  - long-press = time threshold before activation or mode switch.
- Outline graph belongs under Canvas unless research proves graph controls need a separate runtime.
- Charts should be named `Charts` or `DataViz`, not `Graph`, to avoid collision with Canvas graph mode.
- ContainerNode is already a kind. Manual group, serviceGroup, FilterGroup, and future scene/layout
  containers are producers/usages of ContainerNodes.

## Roadmap Tier Summary

**NOW / NEXT absorb cleanly**
- Alias labels/search (F-3) — small, likely folds into logicFiles/logicProps + view-config.
- FrontmatterScene native parity (F-9) — NEXT after `logicProps` extraction.

**LATER absorb after spine**
- Onboarding overlays (F-5).
- Outline graph as Canvas mode (F-6).
- ScenesManager/LayoutBuilder family (F-8).
- Charts/DataViz if kept as panelData runtime (F-7).

**MAJOR / deeper grill before mega-refactor**
- Public external engine API (F-1).
- Public external provider/index API with remote/fetched providers (F-2).
- Gesture/InputBinding grammar across desktop/mobile (F-4).
- Agent writing API with privacy guarantees and cursor-write mode (F-5a).
- Charts as a fifth top-level engine (F-7, if accepted that way).

## Queued Decisions

Compact entries live in [[docs/architecture/pending-decisions|pending-decisions]] as S-15 through S-25.
This source record carries the full request-level reasoning.

Continuation shards:

- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/01-api-patterns-paneldata-membership|API patterns and repeated membership]] captures pattern stack, remote storage, external actions, node-notes, and repeated node membership.
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/02-identity-occurrence-membership-cases|Identity, occurrence, and membership cases]] captures physical-copy vs virtual-membership cases, same-label identity collisions, and the locked S-26 rationale.
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/03-paneldata-primitives-presets|PanelData, primitive adapters, and presets]] captures PanelData/DataViz, UI primitive libraries, Notion toolbar presets, and homescreen-widget layout analogies.

## Queued Research

Compact rows live in [[docs/architecture/research-inventory|research-inventory]]:
R-API-ENGINE, R-REMOTE-PROVIDER, R-GESTURES, R-ONBOARDING, R-AGENT-WRITE, R-GRAPH,
R-CHARTS, R-CALLOUT-MANAGER, and R-PROPERTIES-PARITY.

## Status

Captured as a grill/brainstorm intake. No per-subsystem specs created. Next move: dev answers the
blocked decisions only where a request is needed before the reconstruction wave starts; otherwise fold
small clean items into the existing NOW/NEXT spine.
