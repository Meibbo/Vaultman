---
title: Performance Testing & Monitoring Design
type: design-spec
status: draft
created: 2026-05-08T22:00:00
updated: 2026-05-08T22:00:00
tags:
  - agent/spec
  - performance
  - monitoring
---

# Performance Testing & Monitoring Design

## 1. Overview
The goal is to implement a robust system for monitoring, testing, and preventing performance regressions in the Vaultman plugin. This system prioritizes perceived performance (startup, UI lag) and scalability (large vaults).

## 2. Startup & Lifecycle Monitoring
We will leverage the existing `PerfMeter` and `OpsLogService` to capture detailed boot metrics.

### Automated Boot Marks
- `vaultman:boot:start`: Recorded at the beginning of `onload`.
- `vaultman:boot:settings-loaded`: Recorded after `loadSettings`.
- `vaultman:boot:index-refresh:start`: Before core indexing (files, tags, props).
- `vaultman:boot:index-refresh:end`: After core indexing is complete.
- `vaultman:boot:end`: Recorded in `onLayoutReady`.

### Verification Logic
- **Baseline Comparison:** Compare `totalBootMs` against a threshold (e.g., 100ms for small vaults, 500ms for large).
- **Service Bottlenecks:** Identify if any specific index or service registration takes $>20\%$.

## 3. Large Vault Stress Testing
To prevent "O(N) traps", we will introduce a performance regression test suite that runs against generated large-scale vaults.

### Vault Generation Strategy
- **Scripted Generation:** A helper script (`test/helpers/gen-large-vault.ts`) to create a temporary Obsidian vault with:
  - 10,000 Markdown files.
  - Deep folder hierarchies (5+ levels).
  - High metadata density (10+ properties per file).
  - Extensive tagging (1,000+ unique tags).

### Stress Test Scenarios
- **Cold Boot Indexing:** Measures time from `boot:start` to `boot:end` in the large vault.
- **Search Latency:** Measures time to filter 10,000 nodes using `filter-evaluator.ts`.
- **Render Pressure:** Measures `view.flatten` and `decoration.decorate` time for a virtualized list of 10,000 items.
- **Aggressive Interaction Set:**
  - **View Flipping:** Rapidly switching between Tree, Grid, and Table views to catch mounting/unmounting leaks or layout thrashing.
  - **Selection Flood:** Sending large batches of nodes from `NodeSelectionService` to the `OperationQueue` to test ingest latency.
  - **Drastic Scrolling:** High-velocity scrolling across all view modes to stress the `serviceVirtualizer`.
  - **Search Thrashing:** Rapidly updating the search query in `TabContent` to verify debounce effectiveness and filter cancellation.

## 4. UI Responsiveness & Instrumentation
Extend `PerfProbe` to detect "Long Tasks" and layout thrashing in Svelte components.

### Frame Budget Monitoring
- Instrument the `ViewService` and `PanelExplorer` to record frame drops during scrolling and filtering.
- **Metric:** `droppedFrames` (frames $>16.6ms$).

### Svelte 5 Rune Flushing
- In component tests, enforce strict `flushSync` usage to verify that reactive chains settle within acceptable timeframes.

## 5. Integration Depth (Wave 2)
Deepen `wdio-obsidian-service` tests to cover:
- **Mobile Emulation:** Automate verification that touch interactions (swipe to delete, mobile navbar) are responsive.
- **Workspace State:** Verify that independent leaves restore correctly without redundant indexing.

## 6. Acceptance Criteria
- [ ] Ops Log includes detailed breakdown of `onload` phases.
- [ ] Performance regression test suite fails if `filter` or `index` times increase by $>25\%$ from baseline.
- [ ] `PerfProbe` captures scroll latency metrics in large virtualized lists.
- [ ] E2E tests verify mobile view functionality using `app.emulateMobile`.
