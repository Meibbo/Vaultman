---
title: "PV13-011 — Pase de aislamiento global: drags, mousedown/keydown, tab-content query"
type: issue
status: done
lifecycle: completed
priority: P1
execution: AFK
parent: "[[docs/work/proto-v13-obsidian-plugin/issues/pv13-wave-1/index|PV13 wave 1]]"
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-07T00:00:00
updated_by: deepseek-v4-flash-free
created_by: deepseek-v4-flash-free
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, isolation, obsidian-isolation]
---

# PV13-011 — Pase de aislamiento global (remanentes de window/document)

## What to build

Cerrar los últimos accesos globales al DOM de Obsidian que quedaron deliberadamente en los módulos 005-009, per el plan (shard 03 Task B). Dejar `window` SOLO para los 7 drags breves del gesto. El resto (mousedown de paneles, keydown Escape, `document.querySelector('.vm-tab-content')`) se aísla al `.vm-view`.

## Acceptance criteria

- [x] **Drags de window (7 sitios) se mantienen** con cleanup verificado sitio por sitio:
  - `explorer.tsx:220-224` (scrub), `1244-1246` (marquee).
  - `views.tsx:169-173` (drag resizer), `254-266` (panel drag).
  - `stack-island.tsx:66-71` (popup drag), `91-100` (sub-pill drag), `117-123` (resizer).
  - Cada `window.addEventListener('mousemove/mouseup/touchmove/touchend')` emparejado con su `removeEventListener` en el cleanup.
- [x] **`document.addEventListener('mousedown', …)` de paneles** → `container.addEventListener` vía `useTheme()`:
  - `control-island.tsx` outside-click → scoped `.vm-view`.
  - `stack-island.tsx` sub-pill / row-menu outside-clicks (2 sitios) → scoped `.vm-view`.
  - `sidebar.tsx` reorder exit click → scoped al container.
- [x] **`window.addEventListener('keydown', …)` Escape** → `container` keydown:
  - `search-island.tsx` Esc-to-close → `container.addEventListener('keydown')` (Escape solo con foco/en el view).
  - `sidebar.tsx` reorder Escape → `container.addEventListener('keydown')`.
  - `control-island.tsx` Escape → scoped (keydown en el container, no window).
- [x] **`document.querySelector('.vm-tab-content')`** → scoped:
  - `sidebar.tsx` (2 sitios: locate + scroll-top) → `container?.querySelector`.
  - `pages.tsx` locate → `e.target.closest('.vm-view')?.querySelector`.
- [x] **Gates finales** (verificados en este commit):
  - `document.body` en `src/` → 0 usos reales (solo referencias en comentarios/header).
  - `document.addEventListener` → 0.
  - `document.querySelector` → 0 (solo comentario de header).
  - `window.dispatchEvent/addEventListener` → SOLO los 7 drags (todos mousemove/mouseup/touchmove/touchend).
  - `window.keydown` global → 0.
- [x] `npm run build` + `npm run lint` exit 0 (build: tsc + esbuild production + sync artifacts; lint: 0 errors).
- [ ] Smoke render (drags + cerrar paneles click fuera del view) — manual del dev (PV13-013).

## Blocked by

- PV13-010 (render end-to-end estable para validar interacciones).