---
title: "PV13-012 — Persistencia real: wiring snapshot onStateChange/onOpen + Reset"
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
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, persistence, settings]
---

# PV13-012 — Persistencia real del estado del prototipo

## What to build

Convertir el wiring mínimo de PV13-010 en persistencia real: snapshot con debounce desde `AppV4` hacia `settings.protoState` + `saveSettings`, restauración en `onOpen`, y botón Reset funcional en el setting tab.

## Acceptance criteria

- [x] **`app.tsx`**: helper `commit(field)` con debounce 300 ms y timer independiente por campo de nivel superior (`mode/theme/accent/customAccent/controlOpen/bothOpen/state`) vía `useRef` map; `buildSnapshot()` reconstruye el snapshot completo; wrappers `commitMode/commitTheme/commitAccent/commitCustomAccent/commitControlOpen/commitBothOpen/commitSetState` inyectados en todos los call-sites (ControlFab, ControlIsland, SidebarV4, both-toggle) y cleanup de timers en unmount.
- [x] **`main.ts`**: `mountPrototype(contentEl, { initialState: this.plugin.settings.protoState, onStateChange: (s) => { this.plugin.settings.protoState = s; void this.plugin.saveSettings(); } })`; `onClose` → `disposeMount()` + empty; `disposeMount: (() => void) | null = null` declarado (líneas 106-118).
- [x] **Setting tab**: botón Reset → `resetProtoState()` (setea `protoState = null` + `saveSettings()`) en `src/settings.ts:73-74` + handler en `main.ts:37-40`.
- [x] **`state.ts`**: `mergedProtoState(saved)` aplica shallow-merge de `saved` sobre `createDefaultProtoState()` (intencional; documentado en el docstring).
- [x] Restauración: `AppV4` inicia `useState` de top-level desde `initial?.mode/theme/accent/customAccent` y hace shallow-merge de `initial` sobre los defaults literales del estado (líneas 35-105).
- [ ] Verificación manual: cambiar modo/tema + esperar 300 ms → cerrar/reabrir Obsidian → restaurado (smoke del dev, PV13-013).
- [x] `npm run build` + `npm run lint` exit 0 (169 tsc / esbuild production / sync artifacts).

## Blocked by

- PV13-010 (mount), PV13-011 (aislamiento previo estable).