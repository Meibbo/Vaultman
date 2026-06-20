---
title: Shard 5 - State & Reactivity (Exhaustive)
type: research-shard
parent: "[[docs/work/research/2026-05-10-vaultman-codebase-recognition/index|index]]"
created: 2026-05-10
---

# Shard 5: State & Reactivity (Svelte 5)

## Current State Analysis

Vaultman's architecture is built on **Svelte 5 Runes**, providing a highly reactive and performant core that manages thousands of objects with microsecond latency.

### 1. Rune-Based Services
Services in Vaultman are not just utilities; they are the "Global State" of the application, replacing patterns like Redux or Svelte Stores with Class-based reactivity.

**Example: `ExplorerService.svelte.ts` (The Reactive Engine)**
```typescript
export class ExplorerService<TNode> {
    // STATE: Fine-grained reactivity
	selectedIds = $state(new Set<string>());
	expandedIds = $state(new Set<string>());
	search = $state('');

    // DERIVED: Automatic recomputation on state change
	filteredNodes: readonly TNode[] = $derived.by(() => {
        // High-performance filter logic
        if (!this.search) return this.idx.nodes;
        return this.idx.nodes.filter(n => n.label.includes(this.search));
    });
}
```

### 2. High-Performance Maps (`SvelteMap`)
For the operation queue, Vaultman uses `SvelteMap` to ensure that updates to a single file among thousands do not trigger a full UI re-render.

```typescript
// serviceQueue.svelte.ts snippet
export class OperationQueueService extends Component {
    // Reactive map for file transactions
    readonly transactions = new SvelteMap<string, VirtualFileState>();
    
    // Staged operations
    pending = $state<PendingChange[]>([]);

    private emitChanged(): void {
        // Manual trigger for non-rune subscribers (backward compatibility)
        for (const callback of this.listeners.get('changed') ?? []) callback();
    }
}
```

### 3. Transversal Metric Tracking (`PerfMeter`)
Every major state transition is timed to ensure Vaultman remains the fastest tool for vault management.

```typescript
// perfMeter.ts - Transversal Instrumentation
export class PerfMeter {
    static time<T>(label: string, fn: () => T, kind: string): T {
        const start = performance.now();
        const res = fn();
        // ... latency tracking
        return res;
    }
}
```

## Transversal Impact
- **shadcn-svelte v1.0:** Since shadcn-svelte v1.0 is built natively for Svelte 5, it supports Runes. However, it often follows the "Controlled Component" pattern (passing `value` and an `onValueChange` callback).
- **Friction: State Synchronization:** We must avoid the anti-pattern of "Syncing Runes to Props". Instead, we should pass the service's `$state` directly into shadcn components using `$bindable()` or direct reference.
- **Virtualization Performance:** The "Beta" shard (Data Grid) depends on this reactivity to re-render only the rows that change. The transition to `shadcn-svelte` must not introduce "Reactivity Leaks" (unnecessary `$effect` triggers).

### Key Snippet: Reactive Binding Strategy
```svelte
<!-- Pattern to avoid: Prop Drilling -->
<Input value={explorer.search} oninput={(e) => explorer.search = e.target.value} />

<!-- Pattern to implement: Direct Rune Binding -->
<Input bind:value={explorer.search} /> 
```

### 4. Implementation Sharding Vector
The "Epsilon" sub-agent (or a horizontal check across all shards) must:
1.  **Audit Runes:** Ensure shadcn components do not break the `$derived` chains of the services.
2.  **Performance Check:** Verify that the "Total Height" of virtualized lists (computed via Runes) remains stable when using shadcn's Table/Grid components.
3.  **Handoff Logic:** Ensure that the `OperationQueueService` remains the single source of truth even when complex shadcn-based forms are editing multiple fields.
