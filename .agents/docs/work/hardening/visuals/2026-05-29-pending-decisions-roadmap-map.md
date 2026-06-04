---
title: Pending Decisions, Research, Tooling, Subsystems, Roadmap Map — 2026-05-29
type: visual-map
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-29T23:45:00
updated: 2026-05-29T23:58:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/visual
  - initiative/hardening
  - agent/checkpoint
---

# Pending Decisions, Research, Tooling, Subsystems, Roadmap Map — 2026-05-29

Source-backed visual checkpoint for the current architecture grill state.

## Sources

- [[docs/architecture/pending-decisions|pending-decisions]]
- [[docs/architecture/research-inventory|research-inventory]]
- [[docs/architecture/tooling-libraries|tooling-libraries]]
- [[docs/architecture/zoom-out-map|zoom-out-map]]
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|roadmap-dispatch]]
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/index|feature-request architecture fit]]
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/01-api-patterns-paneldata-membership|API patterns and repeated membership]]
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/02-identity-occurrence-membership-cases|identity, occurrence, membership cases]]
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/03-paneldata-primitives-presets|PanelData, primitive adapters, presets]]
- [[docs/work/hardening/items/2026-05-29-dev-pending-question-inventory|dev pending question inventory]]

## Vertical Coverage

| Area | Source | Status |
|---|---|---|
| Pending decisions | `pending-decisions.md` | covered |
| Feature-grill questions | `feature-request-architecture-fit/` | covered |
| Pending research | `research-inventory.md` | covered |
| Tooling/libraries | `tooling-libraries.md` | covered |
| Subsystems | `zoom-out-map.md` | covered |
| Roadmap DAG | `roadmap-dispatch.md` | covered |
| Product code files | `src/` | not in scope for this checkpoint |

## Decision Inventory Map

```mermaid
flowchart LR
  PD["pending-decisions"] --> Storage["S1-S7 Storage + file formats"]
  PD --> Process["S8-S14 Reconstruction + pkm-ai + publish process"]
  PD --> API["S15-S17 External APIs + remote providers"]
  PD --> UX["S18-S25 UX/features from intake"]
  PD --> Data["S27-S30 panelData + primitives + toolbar"]
  PD --> Memory["S31 edge-case capture"]
  Locked["S26 LOCKED identity / occurrence / membership"] --> Intake["feature-intake source record"]

  Storage --> ADR10["ADR0010 candidate"]
  Process --> Recon["reconstruction wave"]
  API --> LaterMajor["LATER / MAJOR"]
  UX --> NowNext["NOW / NEXT / LATER split"]
  Data --> NextGrill["next grills"]
  Memory --> PKMAI["pkm-ai routing upgrade"]
```

## Question Order For Next Session

```mermaid
flowchart TD
  Start["resume"] --> S27["S27 panelData contract"]
  S27 --> S29["S29 primitive adapter strategy"]
  S29 --> S10["S10 DnD library lock"]
  S10 --> S11["S11 monkey-around + interact.js"]
  S11 --> S15["S15 external engine API"]
  S15 --> S16["S16 provider / index API"]
  S16 --> Storage["S1-S7 storage grill"]

  S27 -. feeds .-> S23["S23 Charts/DataViz"]
  S29 -. feeds .-> S30["S30 toolbar presets"]
  S10 -. feeds .-> S19["S19 gestures / input binding"]
  Storage -. feeds .-> S17["S17 remote provider cache/privacy"]
```

## Pending Research Map

```mermaid
flowchart LR
  RI["research-inventory"] --> StorageR["Storage architecture + Dataview/Datacore"]
  RI --> InteractionR["DnD / gestures / PlatformAdapter targets"]
  RI --> DataR["panelData / charts / properties parity"]
  RI --> UIR["UI primitives / UnoCSS / Notion toolbars / mobile widgets"]
  RI --> APIR["external engine + provider APIs"]
  RI --> OpsR["agent-write + chunk acceptance"]

  StorageR --> S1S7["S1-S7"]
  InteractionR --> S10S19["S10-S11 + S19"]
  DataR --> S23S27["S23 + S25 + S27"]
  UIR --> S29S30["S29 + S30"]
  APIR --> S15S17["S15-S17"]
  OpsR --> S21["S21"]
```

## Tooling / Library Decision Map

```mermaid
flowchart LR
  Current["current stack"] --> Svelte["Svelte 5"]
  Current --> TS["TypeScript"]
  Current --> TanStack["TanStack Virtual/Table"]
  Current --> Vitest["Vitest + lint"]

  Candidate["candidate stack"] --> DND["dnd-kit-svelte"]
  Candidate --> Patch["monkey-around"]
  Candidate --> Interact["interact.js"]
  Candidate --> Uno["UnoCSS"]
  Candidate --> Charts["LayerChart / D3 / Plot"]
  Candidate --> UI["Bits UI / shadcn-svelte / custom"]

  DND --> S10["S10"]
  Patch --> S11["S11"]
  Interact --> S11
  Uno --> RUNO["R-UNOCSS"]
  Charts --> RCharts["R-CHARTS + R-PANELDATA"]
  UI --> RUI["R-UI-PRIMITIVES + S29"]
```

## Subsystems + Roadmap DAG

```mermaid
flowchart LR
  AR["A.R complete"] --> LX["NOW Q4 logic extraction"]
  PUB["NOW publish"]
  PA["NOW PlatformAdapter"]

  LX --> NR["NEXT N.R NodeRow"]
  NR --> VD["NEXT V.D views + render-runtime"]
  VD --> PD2["LATER P.D panels / scenes"]
  VD --> SF["LATER Surface foundation"]
  VD --> BO["LATER Bases-OUT"]
  PA --> SF
  PA --> MC["LATER menu-curator"]
  AR --> MC
  VD --> Caches["LATER caches"]
  Caches --> Icon["iconize absorb"]
  Ops["LATER Operations"]
  AR --> BP["MAJOR Bases Parity"]
  NR --> BP
  BP --> CD["MAJOR cross-provider cells"]
```

## Feature Intake Placement

```mermaid
flowchart TD
  Intake["feature requests"] --> Clean["clean NOW/NEXT"]
  Intake --> Later["LATER after spine"]
  Intake --> Major["MAJOR / deeper grill"]

  Clean --> Alias["S18 alias labels/search"]
  Clean --> Frontmatter["S25 FrontmatterScene"]

  Later --> Onboarding["S20 onboarding"]
  Later --> Graph["S22 outline graph"]
  Later --> Scenes["S24 ScenesManager/LayoutBuilder"]
  Later --> Charts2["S23 charts if panelData"]

  Major --> EngineAPI["S15 engine API"]
  Major --> ProviderAPI["S16/S17 provider API"]
  Major --> Gestures["S19 gestures"]
  Major --> AgentWrite["S21 agent write"]
```

## Checkpoint State

```mermaid
flowchart TD
  LockedS26["S26 locked"] --> Item["dev question inventory item"]
  Item --> Visual["this visual map"]
  Visual --> Handoff["current handoff checkpoint"]
  Handoff --> NextAgent["next agent resumes at S27"]
```

## Verification

| Check | Status | Source |
|---|---|---|
| Mermaid fences balanced | passed | 14 Mermaid/code fences counted; even fence count |
| Source paths exist | passed | all listed source paths exist |
| `git diff --check` | passed | touched docs only; LF-to-CRLF warnings only |
| Feature-intake shard line caps | passed | continuation shards are 123, 192, and 116 lines |
| Full doc health | failed | pre-existing hard line caps/parent-shape/timestamp/glossary issues remain; current docs show soft warnings |
