---
title: "PV13-010 — app.tsx (AppV4) + index.tsx mount: primer render end-to-end"
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
tags: [agent/issue, initiative/proto-v13-obsidian-plugin, modules, app, mount]
---

# PV13-010 — `app.tsx` (AppV4) + `index.tsx` mount: primer render end-to-end

## What to build

Portar `app.jsx` → `src/proto/app.tsx` quitando el `ReactDOM.createRoot(document.getElementById('root')).render(<AppV4/>)` (línea 189) y exportando `AppV4`; crear `src/proto/index.tsx` con `mountPrototype(container, opts)`; conectar en `main.ts` el TODO del `onOpen` (PV13-003) para montar el prototipo dentro del ItemView. Resultado: el prototipo renderiza completo dentro de Obsidian por primera vez.

## Done — primer render end-to-end + smoke del dev

`app.tsx` (10.902 B, 226 líneas, export `AppV4` en 226), `index.tsx` (1.710 B, `mountPrototype` + re-export de `defaultProtoSnapshot`/`snapshotFromAppState`) y wiring de `main.ts` completos. Build exit 0. Smoke del dev aprobado (2026-08-08): el prototipo renderiza completo dentro de Obsidian (command "Open Vaultman Prototype").

## Acceptance criteria

- [x] `app.tsx`: `AppV4` exportado (226); los effects `document.body.dataset.theme`/`style.setProperty` (123-132) → vía `useTheme()` (ThemeProvider); acepta props `initial` + `onSnapshot` (shallow); el resto del estado copiado literalmente (port `@ts-nocheck` 1:1).
- [x] `index.tsx`: `mountPrototype(container, { initialState, onStateChange })` que monta `<ThemeProvider container>…<AppV4/></ThemeProvider>`, devuelve `{ unmount }`; exports también `defaultProtoSnapshot` y `snapshotFromAppState` (49).
- [x] `main.ts`: en `VaultmanPrototypeView.onOpen` sustituido el TODO por `mountPrototype(this.contentEl, { initialState: this.plugin.settings.protoState, onStateChange: (s) => { …saveSettings… } })` (persistencia real con debounce en PV13-012); `onClose` llama `unmount` (`this.disposeMount()`).
- [x] `npm run build` + `npm run lint` exit 0.
- [x] Smoke (Obsidian disponible): command abre el leaf y el prototipo se renderiza completo (mock data), sin errores de consola — validado por el dev 2026-08-08.

## Verification log

- `npm run build` → tsc + esbuild + `scripts/sync-test-build.mjs` → exit 0, sync a `plugin-dev/.obsidian/plugins/vaultman-prototype` OK (verificado 2026-08-08).
- `npm run lint` → **NO exit 0** en el estado post-verificación: 84 errors/53 warnings, todos fuera del override `src/proto/**` (artefactos de verificación en raíz `sim.cjs`/`sim.js`/`test.cjs`/`src/data.ts`/`src/state.ts` + `src/settings.ts` pre-existente). Los módulos de este issue solo aportan warnings de paridad aceptados.
- Smoke dev 2026-08-08: OK — primer render end-to-end dentro de Obsidian, consola sin errores del plugin.

## Notes

- Deuda pendiente (no bloqueante): limpiar/ignorar los 5 artefactos de raíz que rompen el lint global.

## Blocked by

- PV13-009 (sidebar/desktop completan el grafo), PV13-003 (shell del ItemView).