---
title: Shard 3 - Overlays, Modals & Portals (Exhaustive)
type: research-shard
parent: "[[index]]"
created: 2026-05-10
---

# Shard 3: Overlays, Modals & Portals

## Current State Analysis

Vaultman manages a multi-layered UI where "Overlays" (modals, suggest modals, islands) coexist with Obsidian's native workspace.

### 1. The Overlay Service (`src/services/serviceOverlayState.svelte.ts`)
This service acts as the central coordinator for all floating UI elements.

```typescript
// serviceOverlayState.svelte.ts
export class OverlayStateService {
    // Reactive state for the currently active floating element
	activePopup = $state<PopupType | null>(null);

	open(type: PopupType) {
		this.activePopup = type;
	}

	close() {
		this.activePopup = null;
	}

    // Prevents "click-through" logic
	isAnyOpen(): boolean {
		return this.activePopup !== null;
	}
}
```

### 2. Integration with Obsidian Modals
Vaultman extends Obsidian's native `Modal` class to handle complex operations like "Property Management" and "File Renaming".

**Example: `modalPropertyManager.ts`**
```typescript
import { Modal } from 'obsidian';
export class PropertyManagerModal extends Modal {
    onOpen() {
        const { contentEl } = this;
        // Manual DOM construction or Svelte mount point
        this.component = new PropertyManager({
            target: contentEl,
            props: { ... }
        });
    }
    onClose() {
        this.component?.$destroy();
    }
}
```

### 3. The Island Pattern (`src/services/serviceFnRIsland.svelte.ts`)
Islands are persistent or semi-persistent UI blocks that float over the explorer. They carry their own complex state machines.

```typescript
// serviceFnRIsland.svelte.ts snippet
export class FnRIslandService {
	query = $state('');
	replace = $state('');
	flags = $state<FnRFlags>({
		regex: false,
		matchCase: false,
		wholeWord: false,
	});

    // Validation logic transversally linked to the "Crear" button
	get isValid(): boolean {
		if (this.flags.regex) {
			try { new RegExp(this.query); return true; } catch { return false; }
		}
		return this.query.length > 0;
	}
}
```

### 4. Transition Friction: Bits UI & Portaling
- **Bits UI (Headless Foundation):** shadcn-svelte components like `Dialog` (Modal) and `Popover` are built on Bits UI. These components handle portals internally.
- **Obsidian Conflict:** Obsidian uses its own portal management (the `active-window` and `document.body`). We must ensure that shadcn's `Portal` component targets the correct container (usually the plugin's root) to avoid "vanishing" modals when switching between sidebars and main leaves.
- **Z-Index War:** SCSS uses fixed z-indexes. Tailwind/shadcn must be configured to respect Obsidian's layer hierarchy (e.g., popups should be above 100 but below Obsidian's global notices).

### 5. Implementation Sharding Vector
The "Gamma" sub-agent must:
1.  **Migrate Islands:** Convert `FnRIsland.svelte` and `DropDScope.svelte` to shadcn `Popover` or `Card` layouts.
2.  **Unify Modal Strategy:** Decide whether to keep the Obsidian `Modal` wrapper or switch to pure shadcn `Dialog` (with Obsidian-compatible styling).
3.  **Controlled State:** Map `OverlayStateService.activePopup` to the `open` prop of shadcn components.
4.  **Port Portaling:** Ensure `Floating` and `Portal` logic in shadcn works across multiple windows (multi-leaf support).
