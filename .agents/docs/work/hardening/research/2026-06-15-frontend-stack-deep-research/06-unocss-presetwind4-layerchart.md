---
title: 06 — UnoCSS (already wired) + presetWind4 (it exists) + LayerChart
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]"
created: 2026-06-15T00:00:00
updated: 2026-06-15T00:00:00
created_by: opus-4-8
updated_by: opus-4-8
tags:
  - agent/research
  - style/unocss
  - frontend/charts
---

# 06 — UnoCSS + presetWind4 + LayerChart

## UnoCSS — ALREADY WIRED (corrects tooling-libraries "research pending")

`uno.config.ts` (verified) + `@unocss/vite` plugin + deps `unocss`/`@unocss/vite` 66.6.8 +
`unocss-preset-theme` 0.14.1. Current config:
- `presetWind3({ preflight: false })` — Tailwind-v3 utilities, **reset disabled** (protects Obsidian styles).
- `presetAttributify()` + `presetIcons({warn:false})`.
- `presetTheme({prefix:'--vm', theme:{native,vaultman}, selectors:{native:'.vm-theme-native', vaultman:'.vm-theme-vaultman'}})`
  — two presets' tokens (row-height/icon-size/popup-blur…) as `--vm-*` vars.
- `safelist`: `vm-root`, `vm-mode-*`, `vm-id-*`, `obsidian-mimic-*`, `vm-theme-*`.
- `shortcuts`: `obsidian-mimic-file-layout`, `vm-btn-squircle`, `vm-card`, `vm-btn-primary` (utility bridges;
  partial adoption — most components still use SCSS).

**Layered style model (the architecture):** Obsidian CSS vars → UnoCSS utilities (layout/spacing) →
structural SCSS (`.vm-*` component classes, complex state/animation) → `data-vm-*` (semantic hooks for JS +
community snippets; verified: NO SCSS currently selects on `[data-vm-*]`, so they're pure hooks). Utility-first
fits layout; structural SCSS keeps component encapsulation + animations. This hybrid is sound — keep it.

## presetWind4 — IT EXISTS (corrects the agent's stale-cutoff "doesn't exist")

`@unocss/preset-wind4`, shipped with UnoCSS 66.1+ (we're on 66.6.8 → **available now**). Facts (web-verified):
- **Compatible with all presetWind3 features**, enhances them. Theme nearly identical (some keys adjusted).
- New layers: **base, theme, properties** (CSS-property-based rules → better perf, smaller output).
- **oklch** color model (better contrast/perception). `presetRemToPx` is built-in (no separate preset).
- Growing ecosystem (unocss-preset-shadcn v1.0+ defaults to Wind4).

### D-FE-3 — migration Wind3 → Wind4

Viable now. Plan: swap `presetWind3` → `presetWind4`, **pilot behind a visual diff** (the team's tooling
discipline). Watch: (a) keep `preflight:false` / confirm Wind4's reset story doesn't leak into Obsidian;
(b) re-check the `obsidian-mimic-*-layout` + `vm-btn-*` shortcuts still resolve under Wind4 token keys;
(c) oklch values vs Obsidian's themed colors — we reference Obsidian vars in shortcuts (`var(--interactive-accent)`),
so color-model change is low-risk there. Defer only if the visual diff surfaces regressions.

## LayerChart — NOT installed; dashboard candidate (R-CHARTS / S-23)

Composable Svelte 5 charts on D3 (high-level `BarChart`/`LineChart`/`PieChart` + low-level marks/scales/
interactions). Svelte-5-ready ($bindable/$derived/snippets). Needs D3 (~50–60KB) + ~18KB; optional design-system
CSS (shadcn/daisy/Tailwind4) — **not Obsidian-aware**, so map `--chart-*` to Obsidian vars + scope under `.vm-root`.
We have `FrameDashboardShell.svelte` / `Dashboard3Column.svelte` shells but no charting lib.

### D-FE-5 — defer + pilot

Defer to a single dashboard panel pilot (vault-stats) when N3 dashboard work starts: theme-map to Obsidian
vars, lazy-load (dynamic import) to keep it off the default bundle. Re-verify the LayerChart Svelte-5 API +
llms.txt at pilot time.

## Recommendations

- **Keep** the hybrid UnoCSS(Wind3)+SCSS model now (sound, already shipping).
- **Pilot** the presetWind3→presetWind4 migration behind a visual diff (it's available + Wind3-compatible).
- **Defer** LayerChart to an N3 dashboard pilot, Obsidian-theme-mapped + lazy-loaded.

## Citations

- unocss.dev/presets/wind4; npmjs.com/package/@unocss/preset-wind4; github.com/unocss/unocss discussions (Tailwind v4).
- layerchart.com + next.layerchart.com/docs/llms.txt; local .claude/skills/vm-frontend-llms-docs/LAYERCHART.md.
- In-repo: uno.config.ts, vite.config.ts, src/main.scss, src/styles/**, FrameDashboardShell.svelte.
</content>
