---
title: "PV13-005 — Capa de iconos: icons.tsx + nautilus.tsx"
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
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, modules, icons]
---

# PV13-005 — Capa de iconos: `icons.tsx` + `nautilus.tsx`

## What to build

Portar `icons.jsx` → `src/proto/icons.tsx` y `nautilus.jsx` → `src/proto/nautilus.tsx` como módulos ES con la tabla de exports del plan (index.md). Migrar los accesos `window.*` entre módulos a imports ES y el `document.body.dataset.theme` al contexto de tema.

## Acceptance criteria

- [ ] `icons.tsx`: reglas mecánicas 1-9 del plan; `React.useId` → `useId`; `window.FolderIconAdwaita`/`FileIconAdwaita` (líneas 386/387) → import desde `./folder-icons` (`FolderIconAdwaita as Folder`); `window.folderAccent` (392) se mantiene como fallback documentado `(window as any).folderAccent`; el `document.body.dataset.theme` (402/491) → `useTheme().container?.dataset.theme`; exports (Icon, LucideIcon, resolveIconPackKey, getIconSource, normalizeIconOverride, NODE_TYPE_ICONS, etc.).
- [ ] `nautilus.tsx`: `FolderIconAdwaita`/`FileIconAdwaita` importados desde `./folder-icons` (fuera de nautilus); exports `NautilusIconsGrid`, `NautilusTilesList`, `NautilusPathBar`, `buildNautilusEntries`, `NAUT_ICON_SIZES`/`NAUT_TILE_SIZES`.
- [ ] Sin aparecimientos de `window.*` excepto el fallback documentado de `folderAccent`.
- [ ] `npm run build` y `npm run lint` exit 0.

## Blocked by

- PV13-004 (folder-icons, events, theme-context, data).