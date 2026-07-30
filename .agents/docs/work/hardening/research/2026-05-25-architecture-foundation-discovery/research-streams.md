---
title: Research Streams — Architecture Foundation Discovery
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]]"
created: 2026-05-25T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/research
  - initiative/hardening
  - explorer/view-decomposition
  - explorer/interop
---

# Research Streams — Architecture Foundation Discovery

Raw findings from the parallel read-only research streams (2026-05-25/26).
Index: [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]].

## Stream 1 — Explorer service / responsibility web

- ~13K LOC across the Explorer surface; the 4 axes are tangled.
- **God providers** mixing Node + Logic + Surface, with pure logic buried:
  `explorerProps.ts` 803, `explorerFiles.ts` 612, `explorerTags.ts` 448.
- Views: `viewTree` 1188, `ViewNodeGrid` 1260, `ViewNodeTable` 873, `ViewNodeCards` 627, `ViewNodeList` 459, `ViewMarkmap` 196.
- Containers: `panelExplorer.svelte` 1400+, `ViewHost.svelte` 900+ (Surface ⟂ View braided).
- Find & Replace = 5 files / 1144 LOC: `serviceFnR`, `serviceFnRTemplate`, `serviceFnRDateParser`, `serviceFnRIsland`, `serviceFnRPropSet`.
- Behaviors: `serviceDecorate` 107, `serviceDnd` 322 + `serviceManualDnd` 220, `serviceSelection.svelte.ts` 277, `serviceBadge` 218, `badgeRegistry` = **STUB (1 LOC)**.
- `serviceExplorerScrollGeometry` 257; Grid/Table/Cards each reimplement layout.
- **Key blocker**: provider contracts are implicit; no service↔view contract separation.
- **First structural move (recommended)**: extract pure logic (`logicFiles`/`logicProps`/`logicTags`/`logicBadge`/`logicFnR*`), then decouple view mounts from provider sync via an explicit host service.
- **7 split candidates**: the 3 god providers, `panelExplorer`+`ViewHost`, the FnR cluster, `serviceSelection`+`serviceBadge`, and Grid/Table/Cards geometry.

## Stream 2 — Surfaces / mount / Bases / addons (EXISTS vs ASPIRATIONAL)

EXISTS today:
- `registerView` → `VaultmanFrame` (`TYPE_FRAME_VM`, `src/main.ts:254`).
- 8 detachable tab-leaves `vaultman-tab-*` (`src/main.ts:258-260`, `src/registry/tabRegistry.ts`, `src/types/typeTabLeaf.ts`).
- Ribbon + statusbar item (`src/main.ts:247-250`).
- Hover link source on native tags/folders (`serviceNativeSurfaceBinding.ts:107`).
- Responsive 3-column dashboard `Dashboard3Column.svelte`, gated by `serviceLayout.resolveDashboardEnabled` (`serviceLayout.ts:6-14`), enabled ≥800px on main leaf.
- Pages `pageFilters/pageTools/pageStats` via `FrameDashboardShell.svelte`.
- `AddonsMarkdownPane.svelte` (static pane — NOT a plugin API).
- `DetachedTabHost.svelte` placeholder. Ad-hoc modals under `src/modals/`.
- Bases = **read-only import only**: `serviceBasesInterop.ts` (YAML parser), `indexBasesImportTargets.ts`, `explorerBasesImport.ts`, `typeBasesInterop.ts`.

NOT YET (aspirational / absent):
- No `registerMarkdownCodeBlockProcessor` (no in-editor codeblock surface).
- No addon / plugin-injection / dynamic-registration / `serviceUnload` system.
- No `registerBasesView`; no rendering of third-party Bases views; no modal registry.
- Unified toolbar (`ToolbarPrimitiveRegistry`) is aspirational ([[docs/work/polish/research/2026-05-17-toolbar-architecture/index|toolbar architecture]]).

## Stream 3 — Release / CI / mobile regression

- `ci.yml` triggers `[main, hardening, hardening-*]`; **`sandbox` is NOT in CI** (its ~180 commits never ran CI).
- `release.yml` on bare tags; `codeql` + `scorecard` weekly. AI-file guard on PRs to main.
- `package.json` + `manifest.json` are already at **`1.1.0-beta.1`**;
  `minAppVersion 1.12.0`; **`isDesktopOnly: false`** (still claims mobile support).
- Regression record:
  [[docs/work/v1-stable/items/2026-05-25-release-1-1-0-beta-relabel|1.1.0 beta relabel]] (notes regressions vs 1.0.0; no mobile specifics; "do not push/retag/delete release without explicit instruction").
- No `isMobile`/`Platform`/`isDesktopOnly` checks in `src/`.
- Dependabot weekly; `pnpm run security:audit` via `scripts/security-audit.mjs` (fails on high+); SBOM via cdxgen. Backlog policies under `hardening/backlog/regressions/` (7).
- Gaps for a safe beta channel: beta branch not in CI; `release.yml` does not mark `-beta` tags as prerelease; `isDesktopOnly` wrong if mobile is broken; no documented beta→stable promotion process.

## Stream 4 — Obsidian plugin platform (web, with verdicts)

- **Bases `registerBasesView`: SUPPORTED + documented** (extend `BasesView`, `onDataUpdated(entries)` yields query results). No API to embed another plugin's view → must build our own renderer. (docs.obsidian.md/plugins/guides/bases-view)
- Mounts: ItemView in side/main = SUPPORTED; **statusbar = NO MOBILE**; Modal supported but no float-island primitive (DIY positioning); codeblock processor supported.
- Third-party interop: Dataview `dv.view()` runs inside Dataview's context; Datacore has no documented embed API → **HACKY/INFEASIBLE to host their views**.
- Excalidraw Automate (`ea.addElementsToView`) injects elements **into** Excalidraw;
  cannot embed a live view → **direction = Vaultman → Excalidraw export only**.
- Beta distribution: `manifest-beta.json` **deprecated**; BRAT reads `manifest.json` from GitHub releases. **Safe beta = publish via release/BRAT without bumping `main`'s manifest `minAppVersion`** so stable-store users do not auto-update. Community store auto-scans.

Sources: docs.obsidian.md (Bases view guide, BasesView API, Views, Status bar, Modals, Versions, minAppVersion); github.com/TfTHacker/obsidian42-brat; github.com/obsidianmd/obsidian-releases;
github.com/blacksmithgu/obsidian-dataview; zsviczian.github.io/obsidian-excalidraw-plugin.

## Stream 5 — PKM-AI orchestration + RAG/LLM-wiki

- In-repo, already aligned:
  [[docs/work/pkm-ai/research/2026-05-24-llm-wiki-maintenance-best-practices|llm-wiki maintenance]] (Karpathy LLM-wiki; Nate Herk Four Cs; Anthropic context engineering; AGENTS.md;
  RAG-as-retrieval-only). pkm-ai specs: orchestration-refresh, agent-control-plane.
  `start.md` router + policies (backlog/context/docs/tools).
- Practices (2025-2026): context engineering (LLM=CPU, context=RAM, orchestrator=OS);
  orchestrator-worker dispatch with explicit output contracts; spec-driven development as drift prevention; RAG as a retrieval subsystem, not a compression replacement;
  knowledge-base health as an explicit workflow.
- Recommended evolutions: golden-question retrieval tests; per-subagent spec contracts (invariants + verification gates); health-script automation; add a vector RAG layer only when text retrieval demonstrably fails.

Sources: karpathy.bearblog.dev/year-in-review-2025; anthropic.com/engineering/multi-agent-research-system;
howaiworks.ai/blog/anthropic-context-engineering-for-agents; simonwillison.net/2025/Jun/14;
thoughtworks.com (spec-driven development 2025); microsoft.com/research (DRIFT search);
keerok.tech (enterprise RAG 2026); thenewstack.io (agentic knowledge base patterns).

## Stream 6 — Reference plugin mount patterns

- **Statusbar island (MySnippets)** — PATTERN CONFIRMED. Native Obsidian `Menu` + `showAtPosition({x,y})`; style via `(menu as any).dom` + optional backdrop blur;
  `Menu` handles click-outside/Escape. → StatusbarIslandSurface = thin wrapper over `Menu`, not a custom popover engine. (`src/ui/snippetsMenu.ts`)
- **Views + floating (TaskNotes)** — PATTERN CONFIRMED. `registerView`+ItemView wrapped in a service; floating = independent `Modal` subclasses; `onLayoutReady()` + readiness promise. **Reuse happens at the data/service layer, NOT the view layer.** → validates the Scene model: share the Scene (Node+Logic) across surfaces; each Surface mounts its own View instance.
- **Dataview/Datacore (cross-plugin)** — PATTERN CONFIRMED for a QUERY API only.
  `app.plugins.plugins.dataview.api` / `window["DataviewAPI"]` / `localApi(component)`.
  Consumable = query RESULTS, not interactive views; no plugin-to-plugin view registry exists in Obsidian. → reframe inbound "third-party views": ingest their DATA as a Node source, render in OUR view.
- **Excalidraw** — INFEASIBLE for embedding views; element injection only. Export direction confirmed.

Net: surfaces use native primitives (Menu/Modal/ItemView/codeblock); cross-plugin is data-level, not view-level. The shareable unit across surfaces is the **Scene** (Node+Logic); each surface mounts its own View.

## Interop feasibility verdicts

| Capability | Verdict | Note |
|---|---|---|
| Render our views as Bases views | SUPPORTED | `registerBasesView` (non-breaking; can precede v2.0.0) |
| Our own in-editor codeblock surface | SUPPORTED | `registerMarkdownCodeBlockProcessor` (new build) |
| Host third-party views (Dataview/Datacore/Dynamic-Views) | INFEASIBLE | no view-registry/embed API; only Bases-registered views reachable |
| Consume third-party query *results* as a Node source | SUPPORTED | Dataview `api.localApi()` / `window.DataviewAPI`; Bases `onDataUpdated` |
| Embed our view inside Excalidraw | INFEASIBLE | Excalidraw is inject-into-only; reframe to export |
| Beta channel without breaking stable users | SUPPORTED | BRAT + release manifest, no `main` manifest bump |
| Statusbar island on mobile | UNSUPPORTED | desktop only |

## Reference plugins (repos)

Studied (confirmed):
- MySnippets — https://github.com/chetachiezikeuzor/MySnippets-Plugin — statusbar island via native `Menu` + `showAtPosition`.
- TaskNotes — https://github.com/callumalpass/tasknotes — ItemView + Modal; reuse at service layer, not view layer.
- Dataview — https://github.com/blacksmithgu/obsidian-dataview — public query API (`localApi`); query results only, no view embedding.
- Excalidraw — https://github.com/zsviczian/obsidian-excalidraw-plugin — element injection only; no view embedding.

Studied (confirmed, 2nd pass):
- Hover Editor — https://github.com/nothingislost/obsidian-hover-editor — floating draggable/resizable leaves via `WorkspaceLeaf` monkey-patch + `interact.js`. CAVEAT: patches core → isolate behind an adapter + `serviceUnload`. Reference for floating-tile + node-resizer + reposition-anywhere.
- Commander — https://github.com/phibr0/obsidian-commander — command registry → per-surface ordered list → persist (ribbon/statusbar/titlebar/page-header/editor/file menus). Blueprint for LayoutBuilder "bars as agnostic primitive containers".
- Editing Toolbar — https://github.com/PKM-er/obsidian-editing-toolbar — primitive toolbar with positioning modes (top / following-cursor / fixed-bottom) + drag-reorder/add/remove/rename. Reference for bar positioning + primitive ordering.
- Mobile Emulator — https://github.com/Ssentiago/obsidian-mobile-emulator-toggle — wraps core `app.emulateMobile(bool)`. Platform gating via `Platform.isIosApp/isAndroidApp/isMobileApp` + manifest `isDesktopOnly` → the API for `serviceUnload` feature-gating (Q7).
