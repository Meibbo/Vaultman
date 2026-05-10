# daisyUI Reference

This catalog was checked against `https://daisyui.com/llms.txt` on 2026-05-10. Treat it as a routing index and verify official docs before relying on latest setup, class names, themes, or component rules.

## Complete Documentation

- [Complete LLM documentation](https://daisyui.com/llms.txt): daisyUI 5 documentation for Tailwind CSS 4, install notes, usage rules, config, colors, themes, components, and utilities.
- [Docs home](https://daisyui.com/): Main documentation.
- [Editor guide](https://daisyui.com/docs/editor/): How to use the LLM docs in editors.
- [daisyUI 5 release notes](https://daisyui.com/docs/v5/): Version 5 notes.
- [Upgrade guide](https://daisyui.com/docs/upgrade/): daisyUI 4 to 5 upgrade.
- [Install guide](https://daisyui.com/docs/install/): Installation.
- [Config docs](https://daisyui.com/docs/config/): Plugin configuration.

## Current Snapshot

- daisyUI 5 targets Tailwind CSS 4.
- Tailwind v4 setup is CSS-first: `@import "tailwindcss";` and `@plugin "daisyui";`.
- Prefer daisyUI semantic colors such as `primary`, `base-100`, `base-content`, `success`, `warning`, and `error` for theme-aware UI.
- Avoid hardcoded Tailwind colors when the UI must survive theme changes.
- daisyUI is not headless and not Svelte-specific; it provides Tailwind component class names.

## Component Areas

- Layout and structure: accordion, collapse, divider, drawer, footer, hero, indicator, join, mask, stack.
- Actions and inputs: button, checkbox, file input, input, radio, range, rating, select, textarea, toggle, validator.
- Navigation: breadcrumbs, dock, dropdown, link, menu, navbar, pagination, steps, tab.
- Feedback and status: alert, badge, countdown, loading, progress, skeleton, stat, status, tooltip.
- Display and data: avatar, card, carousel, chat, diff, kbd, list, table, timeline.
- Browser and mockups: browser, code, phone, window.

## Usage Notes

- Combine one component class with supported part, color, size, style, behavior, placement, and modifier classes.
- Use Tailwind utilities for layout, responsive behavior, and small customizations.
- Use `!` utility overrides only as a last resort for specificity conflicts.
- Check accessibility manually for interactive patterns because daisyUI styles HTML; it does not provide Svelte state or headless interaction logic.
- Use `data-theme="<theme>"` for theme selection when the project needs runtime theme switching.
