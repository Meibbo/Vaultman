---
title: Bases Interop Findings (filter + formula grounding)
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
  - explorer/bases
---

# Bases Interop Findings

Ground truth for the FilterGroup / `logicProps`/`logicTags` extraction grill (2026-05-27), gathered by two read-only agents (official Bases docs + codebase/web-lab sweep) after the dev flagged that we lacked solid Bases knowledge. These are FACTS; decisions built on them stay PROPOSED in [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/open-inventory|open-inventory]] until confirmed.

## Finding 0 — We are BROWNFIELD (existing interop + a Bases skill)

The extraction is NOT greenfield. The codebase already has a filter type system + a Bases import path, and the project already captured Bases syntax in a skill:

- `src/types/typeFilter.ts` — `FilterRule { type:'rule', filterType, property, values[], enabled? }`.
  `filterType` enum: `has_property | missing_property | specific_value | multiple_values | folder | file_name | file_path | file_folder | has_tag`. Filter groups support **unbounded nesting** (`combineFilters()` recurses via a `children[]` array).
- `src/types/typeBasesInterop.ts` — `BasesImportedFilterGroup { type:'group', logic:'and'|'or'|'not', children, id?, label?, enabled? }`; `BasesImportedFilterNode = group | FilterRule`.
- `src/services/serviceBasesInterop.ts` — **IN only**: parses `.base` YAML → our FilterNode tree (lines ~19-43, 132-224). No OUT (no `registerBasesView`) today.
- `.agents/skills/obsidian-bases/SKILL.md` — project's Bases syntax/functions/namespacing reference.

Implication: the `FilterProvider` / FilterGroup synthesis must RECONCILE with `typeFilter.ts`, not invent a parallel model. The "arbitrary nesting" decision is partly pre-answered — the **data model is already unbounded**; the proto UI just shows 1 level. So: model = arbitrary depth, UI = progressive.

## Finding 1 — Bases filter model

- Logical operators: `and` / `or` / `not`, **recursive, no documented depth limit** (base-level + view-level, combined by AND).
- Two predicate shapes:
  - **comparisons**: `note.price > 100` — ops `==` `!=` `>` `<` `>=` `<=`.
  - **function-calls**: `file.hasTag("x")`, `file.hasLink("Textbook")`, `file.inFolder("path")`.
- Our `filterType` enum already encodes both shapes (`has_tag`/`folder` = function-predicates;
  `specific_value` = comparison). Maps cleanly to per-provider extraction: `logicTags`=hasTag, `logicFiles`=inFolder/hasLink/file_*, `logicProps`=comparisons over note properties.
- Namespacing: `note.<prop>` (frontmatter) · `file.<name|folder|path|ext|mtime…>` · `formula.<name>`.

## Finding 2 — Bases formulas = a cell-source language, NOT filters

Display-mutating functions: `html()` · `link(path,display?)` · `icon(name)` (Lucide) · `image(path)` · `badge()` · date `format()`. Plus a large catalog (temporal/string/number/list/object/regex/util:
`if`, `date`, `now`, `contains`, `replace`, `map`, `filter`, `reduce`, `round`, `join`, `asLink`, …).
Formulas live in the `.base` `formulas:` section and are referenced as `formula.<name>` in `order` / `properties`. **Scope call: formulas are a `Cell.source` language (ADR 0003) + decoration, NOT FilterGroup.** They belong to a later cell-source / B.P grill, not the NOW filter extraction.

## Finding 3 — .base view-def shape

```yaml
filters: <string | recursive and/or/not group>
formulas: { <name>: '<expression>' }
properties: { <prop>: { displayName: "…" } }
views:
  - type: table | cards | list | map
    name: "…"
    filters?: <group>
    order: [<property refs incl. formula.x>]
    groupBy?: { property, direction: ASC|DESC }
    summaries?: { <property>: <summary> }
    limit?: <number>
```
Confirms `view-config` ⊇ Bases view-def (ADR 0003): `groupBy` → `serviceGroup`; `order` → cell columns;
`type` → engine+mode; `summaries` → dashboard/aggregation cell (new).

## Finding 4 — Interactivity gap (our differentiator)

Bases' filter editor is a **static dropdown form + a raw-YAML "advanced" mode**. No drag-drop reorder, no group/collapse UI (an open Bases feature-request). Our drag-drop predicate builder rendered as a collapsible ContainerNode tree is a **strict superset UX** — validates "islands = Scenes" as the value-add.

## Finding 5 — OUT is unbuilt + API shape NOT reverse-engineered (REAL gap)

> **SUPERSEDED 2026-05-27 (same day):** the API shape is **DOCUMENTED** in `obsidian.d.ts` v1.10.0+
> (`registerBasesView`, `BasesView`, `BasesViewConfig`, `BasesEntry.getValue`, `BasesPropertyId`,
> `BasesQueryResult`, the `Value` system + `Value.renderTo`). web-lab `app.js` was the wrong source
> (minified); the official TYPINGS have it. Full contract:
> [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/obsidian-extension-api-findings|obsidian-extension-api-findings]].
> OUT is still UNBUILT (no code yet) and gates Obsidian `minAppVersion` 1.10.0. Original (now-stale) note kept below.

- Today = IN only. `registerBasesView`, the `BasesView` object methods, and `entry.getValue` are **not** in our code and **could not** be reverse-engineered from web-lab `app.js` (minified, not statically analysable).
- So the ledger's "Bases OUT = registerBasesView (confirmed in app.js)" is a **direction/target**, not implemented, and the **API method shapes remain unknown**. B.P translator spec must source these from Obsidian's **official API docs**, not minified app.js. This is the residual API-shape gap the ledger flagged — now confirmed open.

## Sources

- Official docs: obsidian.md/help/bases/syntax · /help/bases/functions · Bases forum feature-requests.
- Codebase: `src/types/typeFilter.ts` · `src/types/typeBasesInterop.ts` · `src/services/serviceBasesInterop.ts` · `.agents/skills/obsidian-bases/SKILL.md`.

## Bases-view ecosystem + Path A/B strategy (recon 2026-05-27; **APPROVED 2026-05-27** → [[docs/architecture/adr/0009-bases-interop-hybrid|ADR 0009]])

Read-only recon of the `registerBasesView` ecosystem + the strategic fork (interop vs replace).

**Ecosystem — early but converging (~6–10 plugins on the official API):**
- **Dynamic Views** (github `churnish/dynamic-views`) — grid + masonry cards, image covers/slideshows, text previews; extends `BasesView`, implements `onDataUpdated()`, consumes `this.data.groupedData` / `BasesEntry`;
  user options **auto-persist to the `.base` config**; Style Settings integration. Proof the API is usable.
- **obsidian-bases-views** (kanban/gantt/calendar, drag-drop, persists to frontmatter) · **Kanban Bases View** · **Planner** (calendar/kanban/timeline/tasks) · **Chronos** (timeline) · **Life Tracker**. Bases is ~1.5y old;
  community is **consolidating on the official API, not fragmenting** — but no massive convergence yet.

**Path A — interop IN+OUT:** moderate effort; free persistence/UI plumbing; Vaultman = a peer view-provider;
users stack our views + others in one base. Risk: **young API churn** (~1–2 breaking bumps over 12–18mo; e.g.
`BaseOption#shouldHide` already changed).
**Path B — native recreate + full replace (no OUT):** full UI control, no API-churn; BUT 2–3× effort, **forfeits third-party interop**, lock-in, and assumes we out-pace core Obsidian (unlikely — they have resources).

**Key insight:** Vaultman's bulk-ops + interactive filter/config builder + content logic are **orthogonal to view rendering**. The moat is the builder + operations, not grid pixels.

**PROPOSED — hybrid (Path A philosophy; achieves the replace goal WITHOUT forfeiting ecosystem):**
1. Native view-shells = **PRIMARY** renderer → a user CAN disable core Bases and still get list/grid/table/cards/masonry from us (the replace win the dev wants).
2. Keep **Bases-IN** (read `.base`) + **import/export** (.base / json / xml / dataview-codeblock) ALWAYS → portability + don't strand the existing Bases user base.
3. **Bases-OUT** (`registerBasesView`) = opt-in **ADD-ON**, behind a PlatformAdapter + Fragility Registry (ADR 0004), serviceUnload-gated → ecosystem citizen; our views appear in Bases; API churn isolated to one adapter + the config-abstraction layer.
4. Do NOT try to HOST other plugins' Bases views as engines (extension-API recon: foreign views are opaque → only an opaque ForeignEmbed). Coexistence = same `.base`, Obsidian switches view-type.
- Reject **pure Path B** (full replace forfeiting interop): worst of both — high effort + ecosystem loss + still churn-exposed (we read `.base` anyway).

**Import/export is DECOUPLED from Bases-OUT:** export = serialization (no `registerBasesView` needed); import = Bases-IN parse. Dropping OUT would NOT drop import/export. "Set aside Bases-as-viewer" ≠ "lose import/export."

Sources: github churnish/dynamic-views · AlexandrBukhtatyy/obsidian-bases-views · docs.obsidian.md bases-view guide + BasesViewRegistration.

## Status

Facts captured. Feeds the FilterGroup synthesis (PROPOSED) + B.P translator spec (formulas + OUT API).
Open: confirm FilterGroup synthesis; the dev's "2:1" term; whether to study the existing `typeFilter.ts`/`serviceBasesInterop.ts` in depth before the logic-extraction spec.
