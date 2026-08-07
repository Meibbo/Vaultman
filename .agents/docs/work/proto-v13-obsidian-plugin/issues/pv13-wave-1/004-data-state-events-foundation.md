---
title: "PV13-004 — Capa base: data.ts, folder-icons.tsx, events.ts, theme-context.tsx, state.ts"
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
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, modules, data, events-bus]
---

# PV13-004 — Capa base: data, folder-icons, bus de eventos, theme-context, state

## What to build

Crear los cinco módulos fundacionales del port en `REFACTOR_DIR/src/proto/` que no dependen de otros módulos proto: `data.ts` (de data.jsx), `folder-icons.tsx` (extraído de nautilus.jsx, rompe el ciclo icons↔nautilus), `events.ts` (bus local + protoState), `theme-context.tsx` (aislamiento data-theme/accent) y `state.ts` (defaults + merge + snapshot).

## Acceptance criteria

- [ ] `data.ts`: copia literal de data.jsx; se eliminan los `window.VAULT_TAGS/VAULT_PROPS/VAULT_FILES/OPERATORS/TAB_TREES/flattenTree/leavesOf` (líneas 328-331, 589-591) y se exportan; helpers (`buildFileTree`, `buildTagTree`, etc.) con export; `grep -c "window\\." data.ts` → 0.
- [ ] `folder-icons.tsx`: `FolderIconAdwaita` + `FileIconAdwaita` copiados literalmente desde nautilus.jsx (líneas de cada `const ` hasta su cierre), exportados.
- [ ] `events.ts`: `protoBus` (on/off/emit) y `protoState` (iconOverrides, cellOrder, selMode, focusedParent, collapseHandled) según el shard 03 Task A del plan.
- [ ] `theme-context.tsx`: `ThemeProvider` (escribe `container.dataset.theme`, `--color-accent`, `--interactive-accent` en el `container`) y `useTheme()`; nunca toca `document.body`.
- [ ] `state.ts`: `createDefaultProtoState()` + `mergedProtoState(saved)` (shallow; extraído de app.jsx líneas 21-92) + `defaultProtoSnapshot()` + `snapshotFromAppState()`; tipado con `ProtoSnapshot` de `../settings`.
- [ ] Tras cada archivo: `npm run build` verde (tsc noEmit). Cierre: `npm run build` + `npm run lint` exit 0.

## Blocked by

- PV13-001 (toolchain), PV13-003 (ProtoSnapshot en settings).