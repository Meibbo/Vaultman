---
title: Notebook Navigator API research for first LUPA add-on
type: research-index
status: active
created: 2026-06-15
updated: 2026-06-15
created_by: codex-gpt5
initiative: hardening
tags:
  - agent/research
  - initiative/hardening
  - lupa/addon
  - interop/notebook-navigator
---

# Notebook Navigator API research for first LUPA add-on

## Executive read

Notebook Navigator is a good first LUPA add-on target if we treat it as an external navigation and context bridge, not as a replacement data provider or cache backend. Its public API is stable enough for Obsidian plugin interop around active navigation, current selection, context-menu extension, pinned files, and visual metadata. It does not expose public methods for full file listing, search, tree snapshots, previews, thumbnails, or raw cache reads.

The first add-on should therefore be a `NotebookNavigatorBridge` that:

- probes whether Notebook Navigator is installed, enabled, and API-compatible;
- exposes LUPA commands/actions inside Notebook Navigator context menus;
- mirrors Notebook Navigator navigation and selection events into LUPA-owned snapshots;
- lets LUPA reveal or navigate to files, folders, tags, and property nodes in Notebook Navigator;
- never reads undocumented runtime properties, Notebook Navigator IndexedDB, internal React state, or private services.

## Detail shards

- [[01-api-surface|01 API surface and source-backed limits]]
- [[02-lupa-addon-plan|02 LUPA add-on architecture and first slice]]

## Source map

Primary sources inspected on 2026-06-15:

- [Notebook Navigator public API page](https://notebooknavigator.com/docs.html?doc=developer%2Fapi-reference) - official docs entrypoint requested by the user.
- [GitHub docs/api-reference.md](https://github.com/johansan/notebook-navigator/blob/main/docs/api-reference.md) - API reference content behind the public docs page.
- [GitHub src/api/public/notebook-navigator.d.ts](https://github.com/johansan/notebook-navigator/blob/main/src/api/public/notebook-navigator.d.ts) - TypeScript compatibility contract.
- [GitHub README documentation section](https://github.com/johansan/notebook-navigator#4-documentation) - lists official developer/architecture docs.
- [Storage Architecture](https://github.com/johansan/notebook-navigator/blob/main/docs/storage-architecture.md) - cache/storage boundaries.
- [Metadata Pipeline](https://github.com/johansan/notebook-navigator/blob/main/docs/metadata-pipeline.md) - indexing and derived-content pipeline.
- [Service Architecture](https://github.com/johansan/notebook-navigator/blob/main/docs/service-architecture.md) - service ownership and public API relation.

Local extraction cache used for this note:

- `C:\tmp\nn-api-research\api-reference.md`
- `C:\tmp\nn-api-research\notebook-navigator.d.ts`
- `C:\tmp\nn-api-research\storage-architecture.md`
- `C:\tmp\nn-api-research\metadata-pipeline.md`
- `C:\tmp\nn-api-research\service-architecture.md`

## Decision

Proceed with Notebook Navigator as LUPA add-on 1, scoped to public interop:

- yes: menus, navigation, selection snapshots, events, pins;
- maybe later: opt-in metadata styling;
- no: direct cache reads, private services, internal runtime methods, or using Notebook Navigator as LUPA's search/index backend.
