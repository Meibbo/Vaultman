---
title: "PV13-013 — Smoke funcional en Obsidian + gates finales"
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: HITL
parent: "[[docs/work/proto-v13-obsidian-plugin/issues/pv13-wave-1/index|PV13 wave 1]]"
dateCreated: 2026-08-07T00:00:00
dateUpdated: 2026-08-07T00:00:00
updated_by: deepseek-v4-flash-free
created_by: deepseek-v4-flash-free
tags: [agent/issue, triage/needs-triage, initiative/proto-v13-obsidian-plugin, verification, hitl]
---

# PV13-013 — Smoke funcional en Obsidian + gates finales

## What to build

Validación manual (dev) del plugin completo dentro de Obsidian. Cierra la wave. El resto de slices garantiza build/lint verdes; este verifica comportamiento real del prototipo portado.

## Acceptance criteria (validación manual del dev)

- [ ] `.obsidian/plugins/vaultman-prototype/` con `main.js` + `manifest.json` + `styles.css` copiados; activar plugin, ejecutar command "Open Vaultman Prototype".
- [ ] El render es idéntico al del HTML standalone en el primer paint (mock data), con `data-theme` aplicado en `.vm-view` (no en `body`).
- [ ] FAB control: cambiar mode/theme/accent funciona (CSS vars en `.vm-view`).
- [ ] Tabs stats/filters/tools, islands, drawer, grid Nautilus, drag resizer, paneles que cierran: funcionales (idempotente tras reload; sin listeners colgados).
- [ ] Persistencia: cambiar algo + esperar 300 ms → cerrar/reabrir Obsidian → estado restaurado; Reset en settings lo limpia.
- [ ] Consola de devtools sin errores del plugin.
- [ ] Resultado del smoke (+ desviaciones) documentado en el index del plan (shards 01-03 completados).
- [ ] `npm run build` y `npm run lint` exit 0 en el commit de cierre.

## Blocked by

- PV13-012 (persistencia).