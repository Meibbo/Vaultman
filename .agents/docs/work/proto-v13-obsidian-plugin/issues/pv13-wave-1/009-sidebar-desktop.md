---
title: "PV13-009 — sidebar.tsx, desktop.tsx"
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/proto-v13-obsidian-plugin/issues/pv13-wave-1/index|PV13 wave 1]]"
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-07T00:00:00
updated_by: deepseek-v4-flash-free
created_by: deepseek-v4-flash-free
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, modules, sidebar, desktop]
---

# PV13-009 — `sidebar.tsx`, `desktop.tsx`

## What to build

Portar `sidebar.jsx` (SidebarV4, DrawerNav, FilterFab, NavPillIcon, flattenRows) y `desktop.jsx` (DesktopV2) al árbol `src/proto/`.

## Acceptance criteria

- [ ] `sidebar.tsx`: imports de stack (FiltersIslandV4/QueueIslandV4/ViewIslandV4/SortIslandV4), pages (StatsPage/FiltersPage/ToolsPage), icons, popups (IconPickerIsland); `window.addEventListener('vm-queue-replace'/'vm-search-submit'/'vm-surface-action')` (167/168/317) → `protoBus.on`; dispatch de `vm-toggle-collapse-all` (310), `vm-toggle-expand-all` (404), `vm-redesign-cells` (749) → `protoBus.emit`; `window.__vmIconOverrides` (746) → `protoState.iconOverrides`; los listeners globales `keydown` (344) y `mousedown` (345) se conservan aquí (aislamiento en PV13-011) con su cleanup; `document.querySelector('.vm-tab-content')` (308/403) se conserva (aislamiento en PV13-011); exports `NavPillIcon`, `DrawerNav`, `FilterFab`, `SidebarV4`, `flattenRows`.
- [ ] `desktop.tsx`: `window.__vmIconOverrides` (114) → `protoState.iconOverrides`; export `Desktop`; deps de nautilus (NautilusIconsGrid) y data (VAULT_*).
- [ ] Tras cada módulo: `npm run build` verde. Cierre: build + lint exit 0.

## Blocked by

- PV13-008 (explorer/pages).