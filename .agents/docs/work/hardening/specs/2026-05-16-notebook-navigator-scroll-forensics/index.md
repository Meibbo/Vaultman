---
title: Notebook Navigator Scroll Forensics
type: spec-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/performance
  - explorer/virtualization
---

# Notebook Navigator Scroll Forensics

This spec captures a forensic reading of Notebook Navigator's scroll model and turns it into Vaultman acceptance criteria. It exists because the previous Vaultman scroll pass improved some intermediate jumps but still leaves the Explorer list blank for roughly 2+ seconds after repeated large jumps.

The important conclusion is narrow: Notebook Navigator is not fast because it stores scroll positions or pre-rendered rows in IndexedDB. It is fast because it keeps scroll math synchronous, bounded, and version-gated, while moving preview/image/blob work out of the positioning path.

## Shards

1. [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/01-notebook-navigator-scroll-mechanisms|Notebook Navigator scroll mechanisms]]
2. [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/02-vaultman-gap-analysis|Vaultman gap analysis]]
3. [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/03-repro-and-acceptance|Repro and acceptance criteria]]

## Source Map

Notebook Navigator source read:

- `C:\Users\vic_A\Desktop\notebook-navigator\docs\storage-architecture.md`
- `C:\Users\vic_A\Desktop\notebook-navigator\docs\scroll-orchestration.md`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\hooks\useListPaneScroll.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\hooks\useNavigationPaneScroll.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\listPane\ListPaneVirtualContent.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\FileItem.tsx`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\components\fileItem\useFileItemContentState.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\utils\listPaneMeasurements.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\types\scroll.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\storage\IndexedDBStorage.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\storage\MemoryFileCache.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\styles\sections\layout-virtual-list.css`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\styles\sections\list-files.css`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\styles\sections\list-file-thumbnails.css`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\styles\sections\navigation-tree.css`
- `C:\Users\vic_A\Desktop\notebook-navigator\src\styles\sections\platform-ios.css`
- `C:\Users\vic_A\Desktop\notebook-navigator\tests\hooks\useListPaneScroll.test.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\tests\utils\listPaneMeasurements.test.ts`
- `C:\Users\vic_A\Desktop\notebook-navigator\tests\styles\listPaneMeasurementsCssSync.test.ts`

Vaultman source read:

- `src/components/views/viewTree.svelte`
- `src/components/views/ViewNodeList.svelte`
- `src/components/views/ViewNodeTable.svelte`
- `src/components/views/ViewNodeGrid.svelte`
- `src/components/views/ViewNodeCards.svelte`
- `src/services/serviceScroll.ts`
- `src/dev/perfProbe.ts`
- `test/unit/performance/explorerNotebookNavigatorComparison.test.ts`
- `test/component/viewTreeScrollFallback.test.ts`

## Key Findings

1. Notebook Navigator renders only virtual rows. It does not have a path that renders the entire list when TanStack returns no virtual rows.
2. Notebook Navigator's list and navigation scrolls are intent queues, not raw reactive effects. Pending scrolls are resolved late against current path-to-index maps and gated by `indexVersion`.
3. Notebook Navigator's row height estimation is deterministic and synchronous.
   It reads from memory cache and CSS-synced constants, not from IndexedDB or image decode during scroll.
4. Notebook Navigator treats images and GIF-capable resource paths as row content, not scroll prerequisites. Image blob/object URL loading is async, cancelable, and height-reserved.
5. Notebook Navigator suppresses hover/quick action churn while scrolling, but it does not remove the core row identity from visible rows.
6. Vaultman currently has several gaps that can explain blank/jank under repeated jumps: all-row fallback in cards, O(n) fallback/offset loops in grid/cards/ table, incomplete live test coverage for repeated jump bursts, and perfProbe scenarios that still do not assert visible rows after every jump.

## Decision For The Next Implementation Pass

The next code pass should not tune overscan first. It should first make Vaultman's scroll invariant match Notebook Navigator:

- no mode may render zero rows while `rowCount > 0` and the viewport is visible;
- no mode may fall back to rendering all rows;
- jump/reveal work must be O(visible rows) or O(log n) for variable heights;
- scroll commands must be version-gated and coalesced by intent;
- media/preview/icon hydration must not be a prerequisite for text row paint;
- tests must include repeated direct jumps and visible-row assertions in plugin-dev, not only unit bridge timing.

