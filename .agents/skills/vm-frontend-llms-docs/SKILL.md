---
name: vm-frontend-llms-docs
description: Use when Svelte or SvelteKit frontend work needs LLM-optimized docs for shadcn-svelte, Bits UI, daisyUI, LayerChart, headless components, copied UI components, charts, Tailwind component classes, components.json, theming, accessibility primitives, component APIs, migration, or registry references.
---

# VM Frontend LLM Docs

## Overview

Route Svelte frontend work to LLM-ready docs for shadcn-svelte, Bits UI, daisyUI, and LayerChart. Treat local references as indexes, then verify upstream pages for version-sensitive APIs, CLI commands, class names, migration steps, chart APIs, or package behavior.

## When To Use

- User mentions `shadcn-svelte`, Bits UI, `bits-ui`, daisyUI, `daisyui`, LayerChart, `layerchart`, `tailwind-variants`, `components.json`, `llms.txt`, registries, copied UI, charts, data visualization, headless primitives, Tailwind theming, Svelte 5, or Tailwind v4.
- Svelte UI work needs accessible components, themeable utility classes, charts, chart interactions, or docs for component APIs.
- A project already has a shadcn-style `src/lib/components/ui/` tree, direct Bits UI primitive usage, or daisyUI/Tailwind component classes.

Do not use this skill for generic Svelte syntax alone. For `.svelte`, `.svelte.ts`, or `.svelte.js` creation or edits, also use `svelte-code-writer` and `svelte-core-bestpractices`.

## Reference Map

| Need | Read |
| --- | --- |
| shadcn-svelte CLI, setup, components, theming, registry | [SHADCN_SVELTE.md](SHADCN_SVELTE.md) |
| Bits UI headless primitives, component APIs, utilities, type helpers | [BITS_UI.md](BITS_UI.md) |
| daisyUI components, Tailwind CSS plugin setup, class names, themes | [DAISYUI.md](DAISYUI.md) |
| LayerChart charts, data visualization, chart interactions, exports, examples | [LAYERCHART.md](LAYERCHART.md) |
| Svelte syntax, runes, stores, lifecycle, compiler feedback | `svelte-code-writer` |
| Svelte architecture and reactivity choices | `svelte-core-bestpractices` |

## Workflow

1. Identify the project type: SvelteKit, Vite, Astro, or manual setup.
2. Inspect versions: Svelte, Tailwind, TypeScript/JavaScript, shadcn-svelte, Bits UI, daisyUI, LayerChart, and D3 packages.
3. Inspect local conventions: `components.json`, aliases, CSS variables, `@plugin "daisyui"`, `data-theme`, `src/lib/components/ui/`, `bits-ui` imports, `layerchart` imports, LayerChart CSS imports, and daisyUI classes.
4. Choose the smallest relevant docs page from the reference files.
5. Verify current official docs for unstable or version-sensitive facts.
6. Prefer shadcn-svelte CLI for copied components, Bits UI docs for headless primitive behavior, daisyUI docs for Tailwind classes and themes, and LayerChart docs for chart composition, scales, interactions, exports, and examples.
7. After code edits, run the repo verifier plus Svelte autofixer for changed Svelte components.

## Quick Commands

Verify current docs before running these in a real project:

```bash
npx shadcn-svelte@latest init
npx shadcn-svelte@latest add button
npm i -D daisyui@latest
pnpm i layerchart
```

## Component Guidance

Use native controls when they satisfy the interaction and accessibility requirement. Use shadcn-svelte for copied styled components, Bits UI for headless accessible primitives, daisyUI for Tailwind component classes, fast themeable styling, and minimal source ownership, and LayerChart for composable Svelte charts built on D3.

## Common Mistakes

- Treating copied shadcn components as immutable package exports.
- Mixing Tailwind v3 docs into a Tailwind v4/Svelte 5 project.
- Editing generated components without checking aliases and CSS variables.
- Using shadcn docs when the bug is in Bits UI state, focus, portal, or child snippets.
- Treating daisyUI as headless or Svelte-specific; it is Tailwind classes and plugin config.
- Mixing daisyUI theme tokens with hardcoded colors that break dark themes.
- Using LayerChart examples without checking current Svelte, Tailwind, and package versions.
- Forgetting keyboard behavior, focus management, labels, and accessible names for icon-only controls.
