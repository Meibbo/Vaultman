---
title: Shard 4 - Interaction, Mouse & Commands (Exhaustive)
type: research-shard
parent: "[[index]]"
created: 2026-05-10
---

# Shard 4: Interaction, Mouse & Commands

## Current State Analysis

Vaultman handles interaction through a sophisticated gesture-routing system that separates physical input from semantic intent.

### 1. Mouse Gesture Routing (`src/services/serviceMouse.ts`)
This service is the gatekeeper for all clics. It handles timing-sensitive logic like double-click detection while respecting UI "ignore" zones.

```typescript
// serviceMouse.ts - The Logic of Time
export class MouseGestureService {
	handleClick(target: MouseGestureTarget, event: MouseEvent, handlers: MouseGestureHandlers, config?: MouseGestureConfig) {
		// IGNORE LOGIC: Prevents selection when clicking inputs, buttons, or toggles
		if (target.ignoreSelector && isIgnoredMouseTarget(target.eventTarget ?? event.target, target.ignoreSelector)) {
			return 'ignored';
		}

		// DOUBLE CLICK DETECTION: Pending state vs Secondary intent
		const existing = this.pending.get(target.key);
		if (existing) {
			this.cancel(target.key);
			handlers.secondary?.(event); // Triggers "Open" or "Expand"
			return 'secondary';
		}

		// PRIMARY TIMING: 'immediate' (select now) vs 'defer' (wait to see if it's a double click)
		if (resolved.primaryTiming === 'immediate') {
			handlers.primary?.(event);
			this.pending.set(target.key, { timer: ... });
			return 'primary';
		}
	}
}
```

### 2. Selection Logic (`src/logic/logicKeyboard.ts`)
This is the math behind multiselection (Shift+Click, Ctrl+Click, Keyboard navigation).

```typescript
// logicKeyboard.ts - Range Logic
export function applyPointerSelection(input: SelectionGestureInput): SelectionGestureResult {
	if (input.range) { // Shift + Click
		const rangeIds = idsInRange(input.orderedIds, input.anchorId, input.targetId);
		return {
			ids: input.additive ? unionSets(input.selectedIds, rangeIds) : rangeIds,
			anchorId: input.anchorId,
			focusedId: input.targetId,
		};
	}
	// ...
}
```

### 3. Command & i18n Bridge (`src/services/serviceCommands.ts`)
Commands must be i18n-aware and accessible via hotkeys.

```typescript
// serviceCommands.ts
plugin.addCommand({
    id: 'vaultman:process-queue',
    name: translate('command.process_queue'), // i18n binding
    callback: () => queueService.execute(),
});
```

## Transversal Impact
- **shadcn Buttons & Links:** Standard shadcn components handle clics directly. We must "hijack" these events to pass them through `serviceMouse`.
- **Keyboard Traps:** shadcn `Dialog` and `Select` use `radix-ui` logic to trap focus. This could conflict with Vaultman's global keyboard navigation (`logicKeyboard`).
- **Transition Sharding:** A specific effort is needed to ensure that every new shadcn component (Button, Row, Badge) includes the `on:click` handlers that route through `MouseGestureService`.

### Key Snippet: Integration Contract
```svelte
<!-- Current Manual Pattern -->
<div onclick={(e) => mouse.handleClick({ key: id }, e, { primary: onSelect }, config)}>

<!-- Future shadcn Pattern -->
<Button onclick={(e) => mouse.handleClick({ key: id }, e, { primary: onSelect }, config)}>
```

### 4. Implementation Sharding Vector
The "Delta" sub-agent must:
1.  **Update Handlers:** Ensure all ported components (from Shards 1 & 2) implement the `MouseGestureService` contract.
2.  **Sync Keyboards:** Verify that shadcn's accessibility features do not break the "Arrow Up/Down" navigation of the main Explorer.
3.  **i18n Injection:** Ensure all `shadcn-svelte` components use the `translate()` service for labels and tooltips.
4.  **A11y Audit:** Maintain Obsidian's standard for screen readers by leveraging shadcn's built-in ARIA support.
