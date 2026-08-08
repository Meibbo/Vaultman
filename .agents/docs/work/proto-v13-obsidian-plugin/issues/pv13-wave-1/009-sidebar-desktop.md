---
title: "PV13-009 — sidebar.tsx, desktop.tsx"
type: issue
status: done
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/proto-v13-obsidian-plugin/issues/pv13-wave-1/index|PV13 wave 1]]"
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-08T00:00:00
updated_by: opencode-m2
created_by: deepseek-v4-flash-free
tags: [agent/issue, initiative/proto-v13-obsidian-plugin, modules, sidebar, desktop]
---

# PV13-009 — `sidebar.tsx`, `desktop.tsx`

## What to build

Portar `sidebar.jsx` (SidebarV4, DrawerNav, FilterFab, NavPillIcon, flattenRows) y `desktop.jsx` (DesktopV2) al árbol `src/proto/`.

## Done — port completo + smoke del dev

`sidebar.tsx` (38.082 B, 779 líneas) y `desktop.tsx` (12.219 B, 267 líneas) portados a `src/proto/`. Build exit 0. Smoke del dev en Obsidian aprobado (2026-08-08): drawer, FAB control y islands funcionales.

## Acceptance criteria

- [x] `sidebar.tsx`: imports de stack (FiltersIslandV4/QueueIslandV4/ViewIslandV4/SortIslandV4), pages (StatsPage/FiltersPage/ToolsPage), icons, popups (IconPickerIsland); `window.addEventListener('vm-queue-replace'/'vm-search-submit'/'vm-surface-action')` (198/199/335) → `protoBus.on` (`vp13-queue-replace`, `vp13-search-submit`, `vp13-surface-action`) con cleanup; dispatch de `vm-toggle-collapse-all` (328), `vm-toggle-expand-all` (422), `vm-redesign-cells` (767) → `protoBus.emit`; `window.__vmIconOverrides` (746) → `protoState.iconOverrides`; los listeners globales `keydown` (344) y `mousedown` (345) se conservan con su cleanup (aislamiento final en PV13-011); `document.querySelector('.vm-tab-content')` (308/403) se conserva (aislamiento en PV13-011); exports `NavPillIcon`, `DrawerNav`, `FilterFab`, `SidebarV4`, `flattenRows` (779).
- [x] `desktop.tsx`: `window.__vmIconOverrides` (114) → `protoState.iconOverrides`; export `Desktop` + alias `DesktopV2` (267); deps de nautilus (NautilusIconsGrid) y data (VAULT_*).
- [x] Tras cada módulo: `npm run build` verde. Cierre: build + lint exit 0.

## Verification log

- `npm run build` → tsc + esbuild + `scripts/sync-test-build.mjs` → exit 0, sync a `plugin-dev/.obsidian/plugins/vaultman-prototype` OK (verificado 2026-08-08).
- `npm run lint` → **NO exit 0** en el estado post-verificación: 84 errors/53 warnings, todos fuera del override `src/proto/**` (artefactos de verificación en raíz `sim.cjs`/`sim.js`/`test.cjs`/`src/data.ts`/`src/state.ts` + `src/settings.ts` pre-existente). Los módulos de este issue solo aportan warnings de paridad aceptados.
- Smoke dev 2026-08-08: OK (sidebar/drawer/islands renderizan; FAB control responde).

## Notes

- Eventos del bus renombrados `vm-*` → `vp13-*` (coherentes emisores/receptores).
- Deuda pendiente (no bloqueante): limpiar/ignorar los 5 artefactos de raíz que rompen el lint global.

## Blocked by

- PV13-008 (explorer/pages).