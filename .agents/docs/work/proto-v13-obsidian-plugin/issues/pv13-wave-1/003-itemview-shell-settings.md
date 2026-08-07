---
title: "PV13-003 — ItemView shell + contrato settings (VaultmanSettings, ProtoSnapshot)"
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
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, obsidian-api, settings, itemview]
---

# PV13-003 — ItemView shell + contrato settings

## What to build

Reescribir `src/main.ts` (sample → plugin real) con `VaultmanPrototypePlugin` y un `VaultmanPrototypeView extends ItemView` que monta el container con clase `vm-view`. Reescribir `src/settings.ts` con `VIEW_TYPE_VAULTMAN`, `VaultmanSettings`, `ProtoSnapshot`, `DEFAULT_SETTINGS` y un `VaultmanSettingTab` con botón Reset. El mount React queda como TODO comentado (se resuelve en PV13-010); el build debe pasar con el TODO.

## Acceptance criteria

- [ ] `settings.ts`: `VIEW_TYPE_VAULTMAN = 'vaultman-prototype-view'`; `VaultmanSettings { version:number; protoState: ProtoSnapshot|null }`; `DEFAULT_SETTINGS { version:1, protoState:null }`; `ProtoSnapshot` con los campos del objeto `state` de AppV4 (mode, theme, accent, customAccent, bothOpen, controlOpen, page, pageOrder, filterTab, toolsTab, openIsland, topIsland, bottomIsland, focusedIsland, azOpen, openSettings, drawerOpen, filterStack, queueStack, filterTabOrder, sort, view, settings — tipado laxo `unknown` salvo primitivos).
- [ ] `main.ts`: Plugin con `loadSettings/saveSettings`, `registerView`, ribbon icon 'vault', command `open-vaultman-prototype`, setting tab (wrapper `{ settings, resetProtoState }`; shim de tipos si tsc se queja), `onunload` → `detachLeavesOfType`.
- [ ] `VaultmanPrototypeView`: `onOpen` → `container.addClass('vm-view')` + TODO de mount (comentario); `onClose` → unmount del root (stub) + empty. `getRightLeaf(false)` si la API instalada lo depreca, usar `workspace.getLeaf(false)` (verificar contra `node_modules/obsidian/obsidian.d.ts`).
- [ ] `npm run build` → exit 0; `npm run lint` → sin errores nuevos.
- [ ] Smoke (si Obsidian disponible): command abre un leaf vacío con clase `vm-view` sin errores de consola (manual pending si no hay Obsidian en sesión).

## Blocked by

- PV13-001 (toolchain)