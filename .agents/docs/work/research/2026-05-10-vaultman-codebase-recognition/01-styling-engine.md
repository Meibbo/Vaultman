---
title: Shard 1 - Styling Engine & Primitives (Exhaustive)
type: research-shard
parent: "[[docs/work/research/2026-05-10-vaultman-codebase-recognition/index|index]]"
created: 2026-05-10
---

# Shard 1: Styling Engine & Primitives

## Current State Analysis

Vaultman implements a strict **ITCSS (Inverted Triangle CSS)** architecture to manage styles across its complex UI. This system is currently 100% dependent on SCSS and manual Svelte-to-CSS variable bridges.

### 1. The Token Layer (`src/styles/_tokens.scss`)
Tokens are the "Settings" layer of ITCSS. They define the core design system but are manually synchronized with Obsidian's internal theme variables.

```scss
// src/styles/_tokens.scss (Key Tokens)
$radius-s: 4px;
$radius-m: 8px;
$radius-l: 12px;

$font-interface: var(--font-interface);
$text-normal: var(--text-normal);
$text-muted: var(--text-muted);
$text-accent: var(--text-accent);
$interactive-accent: var(--interactive-accent);

$bg-primary: var(--background-primary);
$bg-secondary: var(--background-secondary);
$bg-modifier-hover: var(--background-modifier-hover);
$bg-modifier-active: var(--background-modifier-active);
$bg-modifier-border: var(--background-modifier-border);

// Vaultman Specifics
$vm-brand: #7c3aed; // Primary purple
$vm-success: #10b981;
$vm-warning: #f59e0b;
$vm-error: #ef4444;
```

### 2. Manual Primitive Implementation
Primitives are not just visual; they are state-aware components that bridge the Gap between Svelte 5 Runes and CSS.

**Example: `Badge.svelte` (Contract Analysis)** The `Badge` primitive uses a `$derived` rune to compute inline styles, creating a scoped "CSS API" for each instance.

```svelte
<script lang="ts">
	let {
		label,
		accent,
		size,
	}: {
		label: string;
		accent?: string;
		size?: string;
	} = $props();

	// Transversal Logic: Maps Obsidian variables or raw hex to --badge-accent
	let style = $derived(
		(accent ? `--badge-accent: var(${accent}, ${accent});` : '') +
			(size ? `--badge-size: ${size};` : ''),
	);
</script>

<span class="vm-badge" {style}>{label}</span>
```

### 3. ITCSS Organization
Styles are strictly modularized into the following structure:
- **Generic:** `_global.scss`, `_animations.scss` (Resets and base animations).
- **Elements:** `layout/` (Structural CSS like `.vm-glass`, `.vm-container`).
- **Components:** `components/`, `nav/`, `explorer/`, `data/`, `panel/`, `popup/`.

### 4. Transition Friction: SCSS to Tailwind v4
- **Current Pattern:** Class composition via SCSS `@extend` or mixins.
- **Tailwind Pattern:** Utility-first composition.
- **The Obsidian Constraint:** Tailwind's default Preflight resets elements like `img`, `button`, and `h1-h6`. In Vaultman, we must ensure that `tailwind.css` is imported without the base layer or with a strict `tw-` prefix to prevent collateral damage to the host application.

### 5. Implementation Sharding Vector
The "Alpha" sub-agent must recreate these ITCSS layers in Tailwind:
1.  **Prefixing:** Every shadcn component and utility MUST use the `tw-` prefix.
2.  **Variable Mapping:** `tailwind.config.js` (or v4 `@theme`) must map `colors.accent` to `var(--text-accent)`.
3.  **Primitive Porting:** Port `Badge`, `Button`, `Input`, and `Toggle` from shadcn-svelte while preserving the existing Svelte 5 `$props` and logic contracts.
