---
name: vm-frontend-llms-docs
description: Use when Svelte or SvelteKit frontend work needs LLM-optimized docs for shadcn-svelte, Bits UI, daisyUI, headless components, copied UI components, Tailwind component classes, components.json, theming, accessibility primitives, component APIs, migration, or registry references.
---

# VM Frontend LLM Docs

## Overview

Route Svelte frontend work to LLM-ready docs for shadcn-svelte, Bits UI, and daisyUI. Treat local references as indexes, then verify upstream pages for version-sensitive APIs, CLI commands, class names, migration steps, or package behavior.

## When To Use

- User mentions `shadcn-svelte`, Bits UI, `bits-ui`, daisyUI, `daisyui`, `tailwind-variants`, `components.json`, `llms.txt`, registries, copied UI, headless primitives, Tailwind theming, Svelte 5, or Tailwind v4.
- Svelte UI work needs accessible components, themeable utility classes, or docs for component APIs.
- A project already has a shadcn-style `src/lib/components/ui/` tree, direct Bits UI primitive usage, or daisyUI/Tailwind component classes.

Do not use this skill for generic Svelte syntax alone. For `.svelte`, `.svelte.ts`, or `.svelte.js` creation or edits, also use `svelte-code-writer` and `svelte-core-bestpractices`.

## Reference Map

| Need | Read |
| --- | --- |
| shadcn-svelte CLI, setup, components, theming, registry | [SHADCN_SVELTE.md](SHADCN_SVELTE.md) |
| Bits UI headless primitives, component APIs, utilities, type helpers | [BITS_UI.md](BITS_UI.md) |
| daisyUI components, Tailwind CSS plugin setup, class names, themes | [DAISYUI.md](DAISYUI.md) |
| Svelte syntax, runes, stores, lifecycle, compiler feedback | `svelte-code-writer` |
| Svelte architecture and reactivity choices | `svelte-core-bestpractices` |

## Workflow

1. Identify the project type: SvelteKit, Vite, Astro, or manual setup.
2. Inspect versions: Svelte, Tailwind, TypeScript/JavaScript, shadcn-svelte, Bits UI, and daisyUI.
3. Inspect local conventions: `components.json`, aliases, CSS variables, `@plugin "daisyui"`, `data-theme`, `src/lib/components/ui/`, `bits-ui` imports, and daisyUI classes.
4. Choose the smallest relevant docs page from the reference files.
5. Verify current official docs for unstable or version-sensitive facts.
6. Prefer shadcn-svelte CLI for copied components, Bits UI docs for headless primitive behavior, and daisyUI docs for Tailwind classes and themes.
7. After code edits, run the repo verifier plus Svelte autofixer for changed Svelte components.

## Quick Commands

Verify current docs before running these in a real project:

```bash
npx shadcn-svelte@latest init
npx shadcn-svelte@latest add button
npm i -D daisyui@latest
```

## Component Guidance

Use native controls when they satisfy the interaction and accessibility requirement. Use shadcn-svelte for copied styled components, Bits UI for headless accessible primitives, and daisyUI for Tailwind component classes, fast themeable styling, and minimal source ownership.

## Common Mistakes

- Treating copied shadcn components as immutable package exports.
- Mixing Tailwind v3 docs into a Tailwind v4/Svelte 5 project.
- Editing generated components without checking aliases and CSS variables.
- Using shadcn docs when the bug is in Bits UI state, focus, portal, or child snippets.
- Treating daisyUI as headless or Svelte-specific; it is Tailwind classes and plugin config.
- Mixing daisyUI theme tokens with hardcoded colors that break dark themes.
- Forgetting keyboard behavior, focus management, labels, and accessible names for icon-only controls.
