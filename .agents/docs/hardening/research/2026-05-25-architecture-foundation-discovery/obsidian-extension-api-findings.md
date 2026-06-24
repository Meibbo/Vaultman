---
title: Obsidian Extension-API Findings (injection surface + Bases dev API)
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]]"
created: 2026-05-27T00:00:00
updated: 2026-05-27T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/research
  - initiative/hardening
  - explorer/interop
  - explorer/engines
---

# Obsidian Extension-API Findings

Resolves the logical gap raised 2026-05-27: "how do we form engines correctly if external sources can
inject their own engines+modes+orientations?" Two read-only agents mapped (1) Obsidian's full plugin
injection surface and (2) the Bases developer API from `obsidian.d.ts` (github obsidianmd/obsidian-api).
**Supersedes `bases-interop-findings` Finding 5's "API UNKNOWN" verdict** — the API is DOCUMENTED.

## 1. Injection surface — Obsidian has NO pluggable "engine" abstraction

Every way a plugin injects UI, and whether the injected thing is reusable by another plugin:

| Extension point | Injects | Opacity |
|---|---|---|
| `registerView(type, viewCreator)` + `ItemView`/`WorkspaceLeaf`/`setViewState` | a custom leaf view | **OPAQUE** (black box; not hostable/introspectable) |
| `registerMarkdownCodeBlockProcessor(lang, handler)` | fills an `el: HTMLElement` for a fenced block | **semi-structured** (you own YOUR codeblock's DOM; foreign ones = opaque subtree) |
| `registerEditorExtension(ext)` | CodeMirror 6 decorations/widgets | **OPAQUE** (pipeline-integrated middleware) |
| `registerBasesView(viewId, reg)` | a data-aware Bases view | **structured DATA contract** (schema known; rendering still yours) |
| `registerExtensions(exts[], viewType)` | file-ext → view-type routing | transparent routing → opaque view |
| `registerHoverLinkSource(id, info)` | hover-preview event hook | event-driven |

**Key finding:** Obsidian has no notion of a pluggable render-engine/mode. Foreign plugin views are fully
opaque — you cannot host a foreign view inside your tile, re-render another plugin's codeblock output, or
compose editor extensions.

## 2. Resolution of the engine-injection gap

Nobody injects "engines+modes+orientations" into us — that mechanism does not exist. Foreign content enters
our world ONLY via three seams, so **our engine abstraction stays orthogonal** (design engines for OUR
render-projection + Bases query-results, NOT for arbitrary foreign engines):

1. **opaque ForeignEmbed** — a foreign leaf mounted as a black box in our tile via a PlatformAdapter (ADR 0004).
2. **Bases-registered** — WE call `registerBasesView` so OUR engines render Bases query results (the inverse
   of injection: we register INTO Bases, Obsidian feeds us typed data).
3. **our own codeblock** — `registerMarkdownCodeBlockProcessor('vaultman', …)`; we own that DOM.

This confirms the model's locked stance ("only Bases-registered third-party views are reachable") — Bases is
genuinely the only structured interop seam.

## 3. Bases developer API — DOCUMENTED (`obsidian.d.ts` v1.10.0+)

```typescript
Plugin.registerBasesView(viewId: string, registration: BasesViewRegistration): boolean;

interface BasesViewRegistration {
  name: string;
  icon: IconName;
  factory: (controller: QueryController, containerEl: HTMLElement) => BasesView;
  options?: (config: BasesViewConfig) => BasesAllOptions[];   // user toolbar options
}

abstract class BasesView extends Component {
  abstract type: string;
  app: App;
  config: BasesViewConfig;             // user-set options (order, toolbar)
  allProperties: BasesPropertyId[];
  data: BasesQueryResult;              // filtered/sorted/limited results
  protected constructor(controller: QueryController);
  abstract onDataUpdated(): void;      // re-render hook on query change
  createFileForView(fileName?, frontmatterProcessor?): Promise<void>;
}

class BasesViewConfig {
  get(key): unknown; set(key, value): void;
  getAsPropertyId(key): BasesPropertyId | null;
  getEvaluatedFormula(view, key): Value;   // eval a formula in context ("embedded bases" mentioned)
  getOrder(): BasesPropertyId[]; getDisplayName(propertyId): string;
}

class BasesEntry implements FormulaContext {     // one row
  file: TFile;
  getValue(propertyId: BasesPropertyId): Value | null;
}

type BasesPropertyId = `${'note' | 'formula' | 'file'}.${string}`;   // e.g. note.status · file.size · formula.calc

class BasesQueryResult {
  data: BasesEntry[];
  get groupedData(): BasesEntryGroup[];          // grouped by user groupBy
  get properties(): BasesPropertyId[];           // visible columns
  getSummaryValue(controller, entries, prop, summaryKey): Value;
}
```

**`Value` system** — `StringValue` / `NumberValue` / `BooleanValue` / `DateValue` / `DurationValue` /
`ListValue` / `LinkValue` / `FileValue` / `NullValue` / `ErrorValue` (+ subtypes). All expose
`toString()` · `isTruthy()` · `equals()` · **`renderTo(el: HTMLElement, ctx: RenderContext)`** — i.e. a
Bases value renders ITSELF to the DOM (this is how formulas like `html()`/`link()`/`image()` display).

## 4. Implications for our model + roadmap

- **Bases-OUT is now spec-able (B.P).** Implement `BasesView` subclasses that adapt OUR engines: read
  `data` (`BasesEntry[]` + `groupedData`), honor `config.getOrder()`/options, re-render on `onDataUpdated()`.
  Concrete contract — no more "API unknown."
- **Formulas / cell-source language** has a concrete target: `Value` subtypes + `Value.renderTo(el, ctx)`.
  Our Cell can wrap/host a Bases `Value` for display; formula evaluation = `config.getEvaluatedFormula`.
  Strengthens ADR 0003 (cell/view-config) + C.D.
- **`BasesPropertyId` `note.`/`file.`/`formula.` namespacing** = exactly our cross-provider cell source model.
- **`groupedData`** maps to `serviceGroup` → ContainerNodes; **summaries** → a dashboard/aggregation cell (new).
- **Min-version constraint:** `registerBasesView` = Obsidian **1.10.0+**. Bases-OUT gates `minAppVersion`
  (manifest / publish track).

## 5. Residual UNKNOWNs (not in public docs)

- **Third-party Bases-view discovery**: `registerBasesView` returns `boolean` (plugins CAN register), but no
  public confirmation that Bases *discovers/lists* third-party view types in its selector. So
  "third-party-views-via-Bases reachable" is **plausible but UNCONFIRMED**.
- **Markdown embedding of Bases views**: no public `registerMarkdownBasesBlock`; `config` comments hint at
  "embedded bases" internally → rendering a Bases view inside an arbitrary codeblock looks **internal-only**.
- No community plugin using `registerBasesView` was found (GitHub search was auth-blocked) — check
  forum/Discord for a real example before building B.P.

## Sources

- `obsidian.d.ts` (github.com/obsidianmd/obsidian-api) v1.10.0+ — lines ~685–4966.
- docs.obsidian.md/Reference + /Plugins (Workspace API · Markdown post-processing · Editor extensions · Bases).

## Status

Gap resolved. Bases-OUT + cell-source now have documented contracts. Feeds B.P (Bases Parity) + V.D engine
abstraction (orthogonal — foreign = opaque embed or Bases-registered). Corrects `bases-interop-findings`
Finding 5. Pending de-stale (one line each): open-inventory + zoom-out-map "Bases-OUT API UNKNOWN" → DOCUMENTED.
