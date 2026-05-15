# Audit Report: Architectural Taxonomy & Technical Debt
**Date:** 2026-05-15
**Status:** Research & Audit Phase

## 1. Executive Summary
The Vaultman codebase exhibits a well-defined 4-layer architecture (Index -> Logic -> Provider -> Service), but suffers from **responsibility leakage** and **shallow abstractions**. High-priority technical debt includes a 30KB "God Service" (`serviceQueue`) and approximately 14 unused "dead" modules.

## 2. Module Taxonomy & Depth Analysis

### 2.1 God Services (High Friction)
*   **`src/services/serviceQueue.svelte.ts`**
    *   **Responsibilities:** File I/O, YAML parsing, transaction management (VFS), UI conflict resolution.
    *   **Shared Work:** Heavily coupled with `serviceFileQueue.ts` and `serviceDiff.ts`.
    *   **Issue:** Too many reasons to change. Violates Single Responsibility Principle.

### 2.2 Shallow Modules (Low Leverage)
*   **`src/services/serviceAPI.ts`**
    *   **Interface:** Defines 15+ complex types/interfaces.
    *   **Implementation:** 90% delegation to other services.
    *   **Friction:** Callers must understand a massive interface for very little behavioral leverage.

### 2.3 Deep Modules (High Leverage)
*   **`src/services/serviceFilter.svelte.ts`**
    *   **Interface:** Simple query/rule management.
    *   **Implementation:** Complex boolean logic evaluation across thousands of nodes.
    *   **Value:** High behavioral density.

## 3. Structural Contradictions
| Contradiction | Impact | Files Involved |
| :--- | :--- | :--- |
| **Search Redundancy** | Logic files implement searching independent of the Index. | `logicTags.ts` vs `indexTags.ts` |
| **Type-Safety Bypass** | Use of `as unknown as` to circumvent `no-explicit-any`. | `explorerFiles.ts`, `serviceQueue.svelte.ts` |
| **VFS Hybrid State** | Parallel existence of mutable and immutable VFS logic. | `serviceQueue.svelte.ts` (Thread 3 legacy) |

## 4. Dead Modules (Cleanup Candidates)
The following modules have no imports and are not entry points:
- `src/api/explorerProvider.ts`
- `src/components/pages/tabFiles.svelte`
- `src/components/pages/tabOutlines.svelte`
- `src/pluginEntry.ts`

## 5. Shared Work & Subsets
*   **The "Exploration" Subset:** `explorerFiles`, `explorerProps`, `explorerTags`. These share common decorator patterns but implement them independently, leading to "Bloated Providers".
*   **The "Modification" Subset:** `serviceQueue`, `serviceFnR`, `serviceTagQueue`. These share a dependency on the operation queue but have inconsistent validation logic.
