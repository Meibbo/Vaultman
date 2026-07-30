---
title: FTC-004 — Persistencia viewConfigByTab + sección settings
type: issue
status: open
parent: "[[docs/work/polish/issues/ftc-floating-toc/index|FTC index]]"
created: 2026-07-14T00:00:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish, floating-toc]
---

# FTC-004 — Save config (AFK)

## Goal

Persistir view options + sorts por tab (hoy 100% volátil) igual que filters/action presets, como semilla PSS view-config (facetas VIECO.modes + NAVCO.sorts; cells TBD).

## Scope

- `typeSettings.ts`: clave `viewConfigByTab?: Record<'files'|'props'|'tags', { viewMode; sortState; visibleCells }>` + default ausente (= comportamiento actual).
- Guardado: acción "Save config" (view-menu FTC-003 + botón en la sección settings) = snapshot manual del estado vivo → `saveSettings()` (semántica confirmada por dev:
  análogo a filter templates, NO auto-persist continuo).
- Rehidratación: `navbarFilters` inicializa `viewModeByTab`/`sortStateByTab`/ `visibleCellsByTab` desde settings si existen (anchors shard §estado — :273/278/283).
- ⚠️ guard anti-loop: `saveSettings → onSettingsChange → pageRenderKey++` REMONTA la página; snapshot idéntico = no-op (precedente SDF-014); verificar que el remount rehidrata (es el mecanismo que hace visible el efecto, no un bug — documentarlo).
- Sección settings "Saved view config": mostrar/limpiar el snapshot por tab (patrón lista de Action presets).
- Nombres PSS-shaped (catálogo): comentario en el tipo mapeando faceta destino v2.

## DoD (tool-checkable)

- [ ] Unit: round-trip snapshot→settings→rehidratación por tab; merge con DEFAULT_SETTINGS sano (instalaciones viejas sin la clave).
- [ ] Smoke plugin-dev: cambiar view/sort/cells en 2 tabs → Save config → reload Obsidian → estado restaurado exacto; sin snapshot → defaults actuales.
- [ ] Clear snapshot desde settings vuelve a defaults.
- [ ] Sin loop de remount (guard no-op probado).
- [ ] Gates comunes.

## No hacer

Auto-persist por faceta (PSS 2.0) · scroll/expansion snapshot (view-state, no config).
