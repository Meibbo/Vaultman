---
title: "PV13-013 — Smoke funcional en Obsidian + gates finales"
type: issue
status: done
lifecycle: active
priority: P1
execution: HITL
parent: "[[docs/work/proto-v13-obsidian-plugin/issues/pv13-wave-1/index|PV13 wave 1]]"
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-08T00:00:00
updated_by: opencode-m2
created_by: deepseek-v4-flash-free
tags: [agent/issue, initiative/proto-v13-obsidian-plugin, verification, hitl]
---

# PV13-013 — Smoke funcional en Obsidian + gates finales

## What to build

Validación manual (dev) del plugin completo dentro de Obsidian. Cierra la wave. El resto de slices garantiza build/lint verdes; este verifica comportamiento real del prototipo portado.

## Done — smoke validado por el dev (2026-08-08)

Wave cerrada. El dev activó `vaultman-prototype` en Obsidian y validó el comportamiento completo: render, control, tabs/islands, persistencia y Reset en settings, sin desviaciones reportadas.

## Acceptance criteria (validación manual del dev)

- [x] `.obsidian/plugins/vaultman-prototype/` con `main.js` + `manifest.json` + `styles.css` copiados (sync automático de `scripts/sync-test-build.mjs` a `plugin-dev`); activar plugin, ejecutar command "Open Vaultman Prototype".
- [x] El render es idéntico al del HTML standalone en el primer paint (mock data), con `data-theme` aplicado en `.vm-view` (no en `body`).
- [x] FAB control: cambiar mode/theme/accent funciona (CSS vars en `.vm-view`).
- [x] Tabs stats/filters/tools, islands, drawer, grid Nautilus, drag resizer, paneles que cierran: funcionales (idempotente tras reload; sin listeners colgados).
- [x] Persistencia: cambiar algo + esperar 300 ms → cerrar/reabrir Obsidian → estado restaurado; Reset en settings lo limpia.
- [x] Consola de devtools sin errores del plugin.
- [x] Resultado del smoke (+ desviaciones) documentado en el index del plan (shards 01-03 completados). Sin desviaciones reportadas por el dev.
- [x] `npm run build` exit 0 en el commit de cierre. Nota: `npm run lint` en el estado post-verificación no pasa a nivel repo por 5 artefactos de verificación en raíz fuera del override `src/proto/**` (ver deuda en issues 008-010; no afecta al bundle).

## Blocked by

- PV13-012 (persistencia).