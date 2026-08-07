---
title: "PV13-010 — app.tsx (AppV4) + index.tsx mount: primer render end-to-end"
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
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, modules, app, mount]
---

# PV13-010 — `app.tsx` (AppV4) + `index.tsx` mount: primer render end-to-end

## What to build

Portar `app.jsx` → `src/proto/app.tsx` quitando el `ReactDOM.createRoot(document.getElementById('root')).render(<AppV4/>)` (línea 189) y exportando `AppV4`; crear `src/proto/index.tsx` con `mountPrototype(container, opts)`; conectar en `main.ts` el TODO del `onOpen` (PV13-003) para montar el prototipo dentro del ItemView. Resultado: el prototipo renderiza completo dentro de Obsidian por primera vez.

## Acceptance criteria

- [ ] `app.tsx`: `AppV4` exportado; los effects `document.body.dataset.theme`/`style.setProperty` (123-132) → vía `useTheme()` (ThemeProvider); acepta props `initial` + `onSnapshot` (shallow); el resto del estado copiado literalmente.
- [ ] `index.tsx`: `mountPrototype(container, { initialState, onStateChange })` que monta `<ThemeProvider container>…<AppV4/></ThemeProvider>`, devuelve `{ unmount }`; exports también `defaultProtoSnapshot` y `snapshotFromAppState`.
- [ ] `main.ts`: en `VaultmanPrototypeView.onOpen` sustituir el TODO por `mountPrototype(this.contentEl, { initialState: this.plugin.settings.protoState, onStateChange: (s) => { …saveSettings… } })` (la persistencia real con debounce es PV13-012; aquí basta el wiring mínimo); `onClose` llama `unmount`.
- [ ] `npm run build` + `npm run lint` exit 0.
- [ ] Smoke (si Obsidian disponible): command abre el leaf y el prototipo se renderiza completo (mock data), sin errores de consola.

## Blocked by

- PV13-009 (sidebar/desktop completan el grafo), PV13-003 (shell del ItemView).