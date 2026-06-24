---
title: Draft non-canonical synthesis — LUPA, filters, providers, queues, VFS, WSA
type: research
status: draft
canonical: false
created: 2026-06-15
updated: 2026-06-15
created_by: codex-gpt5
initiative: hardening
tags:
  - agent/research
  - architecture/non-canonical
  - initiative/hardening
  - lupa/addon
  - pkm-ai/crosswalk
---

# Draft non-canonical synthesis: LUPA, filters, providers, queues, VFS, WSA

> [!warning] Non-canonical
> This captures a conversation hypothesis to discuss with Claude/dev. It does not replace the accepted 8-dimension model, D1-D9, D-PSS, D-C, N0-N4, ADR 0011, or the 2.0.0 umbrella.

## Why this note exists

The Notebook Navigator API research triggered a broader architecture question: should LUPA own filters, result lists, queues, provider operations, or search/input translation? Current answer from this conversation: probably not. LUPA should be a load/unload and add-on interop layer over stricter core subsystems.

The user also raised several omitted concepts: SASI, WSA, PLPZR, Live Redesign, NIB/NIBA, VFS, queues per provider, operations over non-file providers, fetched online information, internal add-ons, and the possibility that the names or "8 fundamentals" of 2.0.0 need to be revised.

## Current canonical docs checked

- [[docs/architecture/adr/0001-eight-dimension-model|ADR 0001 — Eight-dimension architecture model]]
- [[docs/architecture/explorer-model/index|Explorer Architecture Model]]
- [[docs/architecture/explorer-model/01-responsibility-map|Explorer Model — Responsibility Map]]
- [[docs/architecture/explorer-model/02-render-and-data|Explorer Model — Render + Data]]
- [[docs/architecture/explorer-model/03-surfaces-and-interaction|Explorer Model — Surfaces + Interaction]]
- [[docs/architecture/explorer-model/04-panels-axons-mutation-layout|Explorer Model — Panels / axons / mutation / layout]]
- [[docs/architecture/adr/0008-render-ownership-two-layer|ADR 0008 — Render ownership]]
- [[docs/architecture/adr/0011-modular-monolith-extraction-seams|ADR 0011 — Modular monolith with plugin-parity seams]]
- [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|Vaultman 2.0 Synthesis Umbrella]]
- [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/01-locked-decisions-grill|Locked decisions D1-D9 / D-PSS / D-C]]
- [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/02-node-distribution-presentation-model|Node Distribution & Presentation Model]]
- [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/03-dependency-pyramid-and-gates|Dependency Pyramid N0-N4]]
- [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/index|OneNote / companion-architecture megadump]]
- [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/01-triage-classification|Megadump triage]]
- [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/index|Notebook Navigator API research for LUPA add-on]]

PKM-AI `query-docs` did not return a hit for the compound query `LUPA SASI NIB WSA VFS queue provider snapshots filters 2.0.0`; the relevant records were found by direct source reading.

## Important correction: 8 dimensions vs N0-N4 vs D1-D9

There are at least three different architectural frames, and they should not be collapsed:

- **8 dimensions** are canonical ownership axes from ADR 0001: Surface, View, Node, Logic, Navigation, Style/Theme, Process, Operations.
- **N0-N4** is the 2.0.0 dependency/gate order: contracts/seams, data/mutation/persistence, render/interaction, MyWorkspace facade, extensions.
- **D1-D9 / D-PSS / D-C** are locked decisions and later refinements for the synthesis umbrella.

This conversation may suggest refinements to naming and subsystem cuts, but it should not casually rename the 8 dimensions or N0-N4 without a Claude/dev grill.

## Conversation hypothesis

The core should be organized around resources, providers, queries, result snapshots, operations, surfaces, and add-on boundaries. LUPA should not become the owner of filters, queues, result lists, or provider execution.

Proposed non-canonical chain:

```text
ResourceRef / VFS
  -> Provider Registry
  -> Query / Filter Engine
  -> Provider Queues + Global Scheduler
  -> Snapshot / ResultSet Runtime
  -> Render Projection + Shared Render Runtime
  -> Panel / Scene / WSA
  -> LUPA add-ons and external bridges
```

## Proposed responsibility split

| Concern | Current canonical home | Conversation hypothesis | Status |
|---|---|---|---|
| LUPA | N1; ADR 0011; virtual plugin load/unload | Add-on lifecycle and module isolation only; not filters or queues | Compatible, needs sharper API |
| SASI | N0 internal registry; ADR 0011 | Registry/facade for services, commands, scripts, providers, ActionNodes | Compatible |
| NIB / NIBA | N1 basic; input->action layer in explorer-model | API contract mapping raw input to `ActionNode` / `OperationIntent` | Compatible, name/API open |
| WSA | N3 MyWorkspace facade | Surface/workspace routing and live layout controls | Compatible |
| PLPZR | Whiteboard WSA interactions | Sub-capabilities of WSA: pagination/layers/pan/zoom/rotation, not data ownership | Compatible |
| Live Redesign | MyWorkspace / WSA / LayoutBuilder | Visual edit mode over panels/scenes/surfaces, not provider execution | Compatible |
| VFS | Operations domain; N1 gate | Resource substrate for files and non-file provider resources | Compatible, may need broader `ResourceRef` |
| Queue | Operations domain; N1 gate | Global scheduler with per-provider lanes/constraints | Extension of docs, not explicit yet |
| Filters/search | Panel-scoped orchestration, content search seam | `FilterAst` / `QueryPlan` central subsystem; panel consumes, LUPA translates | Needs grill |
| Result list | snapshots + render-projection + panel state | `ResultSetRuntime` owns ordered results, pagination, invalidation | Needs grill |
| Decoration/style | Logic decoration + N2 decoration layer | `DecorationResolver` can merge NN/user/provider styles into `NodeStyleSnapshot` | Compatible |
| Notebook Navigator | N4 interop; separate research says bridge only | Style source + external navigation target + menu surface | Compatible |

## PKM-AI/docs crosswalk and friction

### 1. LUPA as owner of filters would conflict with ADR 0011

ADR 0011 defines LUPA as load/unload for internal modules as virtual plugins. It also says cross-module communication goes through internal registries: SASI, provider/index registry, ActionNode index, WorkspaceMediator. That implies LUPA should not itself own filter language, queue execution, provider data, or panel state.

Verdict: the conversation's correction aligns with ADR 0011. LUPA should expose add-on lifecycle and capability boundaries.

### 2. Operations stays core; provider queue lanes are plausible but not canonical

ADR 0011 explicitly rejects moving operations out as `vm_operations` companion because operations is the mass-action moat. Explorer-model says queue + diff + VFS + agent-action layer form the Operations domain, and N1 gates queue/diff/VFS reconciliation.

The docs do not yet clearly say "queue is per provider." The conversation hypothesis adds this: a provider-backed operation system needs per-provider constraints for local files, remote fetchers, add-ons, online information, and plugin-owned resources.

Verdict: per-provider queues should be framed as an N1 design question under Operations, not a LUPA feature.

### 3. VFS should probably expand from file-path substrate to provider resource substrate

Canonical docs already place VFS in Operations and show operations over nodes, panels, editor targets, and provider pairs. The whiteboard includes Adopted nodes and Related/heterarchy links; Render + Data includes Plugin, Snippet, Action, Icon, InputBinding, Container, Operation, Theme, Layout as NodeKinds.

The conversation's `ResourceRef` proposal is not canon, but it fits the direction: operations can target files, folders, tags, props, fetched resources, add-on resources, operation nodes, theme/layout nodes, and external bridge resources.

Verdict: likely useful, but must be reconciled with existing NodeIdentity / NodeOccurrence / namespaced IDs work.

### 4. Filters/list runtime overlaps with panel-scoped controllers

Explorer-model currently assigns provider-tree sync, sort, view-engine select, and search forward to `panelExplorer` kind controllers. Scenes hold no panel state; WorkspaceMediator holds no panel state. The conversation proposes a central `FilterAst` / `QueryPlan` and `ResultSetRuntime`.

Potential conflict: if central runtime owns too much panel state, it violates the Surface/Scene/Panel rule. Better version: central filter/query contracts are stateless or service-owned; each Panel owns its active query/result state through `PanelHandle`.

Verdict: central contracts yes; central state no, unless scoped per Panel/provider.

### 5. WSA/PLPZR is later than the queue/provider foundation

Node Distribution says PLPZR-like behavior belongs to WSA and N3: pagination X/Y, Z layers, pan, zoom, rotation, selection. The N0-N4 pyramid puts WSA under N3 and marks complete WSA as flag in 2.0.0, not gate. Queue/diff/VFS is N1 gate.

Verdict: do not let WSA/PLPZR pull queue/filter/provider semantics upward. WSA should route and present; lower layers own data and operations.

### 6. Notebook Navigator should not pull NN interop into N1/N2

The N0-N4 pyramid places NN interop in N4. The Notebook Navigator research confirms public API support for style metadata, navigation, selection, events, pins, and menus, but not arbitrary list/search injection.

Verdict: NN can validate the bridge/add-on model, but it should not drive core filter/list architecture.

## Open questions for Claude/dev grill

1. Is `ResourceRef` the right umbrella shape for VFS/provider resources, or should we extend existing NodeIdentity/NodeOccurrence/namespaced IDs instead?
2. Should `FilterAst` / `QueryPlan` become an N1 contract, or stay as panelExplorer-kind controller detail until V.D/P.D?
3. Is a `ResultSetRuntime` a real subsystem, or should ordered result state remain strictly panel-scoped via `PanelHandle`?
4. Should queue lanes be explicit per provider, per operation kind, or both?
5. Does NIB need the public-facing name `NIBA`, or should docs keep NIB and define an internal `InputBindingAPI`?
6. Should SASI include provider capability discovery, or should provider registry remain separate and SASI index only commands/services/scripts?
7. Does PLPZR belong entirely under WSA, or does pagination/layers leak into render-runtime and result pagination?
8. Does the 8-dimension model need a refinement for "Resource/Provider" now that non-file resources are first-class?

## Suggested next artifact

Do not turn this into implementation yet. The next useful artifact is a Claude/dev grill or mini-spec:

- title: `N1 Resource, Query, Queue Boundary Grill`
- inputs: this note, ADR 0001, ADR 0011, N0-N4 pyramid, explorer-model 02/03/04, Notebook Navigator API research
- output: accepted/rejected definitions for `ResourceRef`, filter/query ownership, provider queue lanes, and the boundary between LUPA/SASI/NIB/WSA.
