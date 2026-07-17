---
title: FTC-003 — Sección nueva en view-menu (toolbar/index/save)
type: issue
status: open
parent: "[[docs/work/polish/issues/ftc-floating-toc/index|FTC index]]"
created: 2026-07-14T00:00:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish, floating-toc]
---

# FTC-003 — Sección view-menu (AFK; copy final = HITL dev)

## Goal

Sección nueva AL PRINCIPIO del menú view-mode, separada por divisor del bloque de
engine de vista, con: "Toolbar" on/off · "Index" on/off · "Save config".

## Scope

- Camino minimal (menú nativo): insertar items + `addSeparator()` ANTES del loop de
  view-modes (`openNativeViewMenu`, anchors shard §menú — antes de L598 en 1.1.6).
  Patrón `setChecked/onClick` de los items existentes.
- Camino no-minimal (popup): fila nueva equivalente en `popupView.svelte`.
- "Toolbar on/off": setting `showToolbar` (default `true`) + render condicional de
  `navbarFilters` (precedente shape `showDock`). Toggle TAMBIÉN en settings (Q2=ambos).
  Copy anticipa S-24 (visibility manager futuro) — redacción final HITL.
- "Index on/off": mismo setting de FTC-001 (`floatingTocEnabled`) desde el menú.
- "Save config": entrada que dispara el guardado de FTC-004 (si 004 aún no aterrizó,
  item disabled con tooltip — mantener slice independiente).
- ⚠️ ocultar toolbar NO debe dejar el view-menu inalcanzable: si `showToolbar=false`,
  restaurarlo queda accesible vía settings (documentar en el copy del setting).

## DoD (tool-checkable)

- [ ] Paridad de la sección en AMBOS caminos (nativo minimal + popup).
- [ ] Toggle toolbar oculta/muestra `navbarFilters` sin romper layout (sticky/scroll) ni
      búsqueda activa; estado persiste (setting).
- [ ] Restauración vía settings verificada con toolbar oculta.
- [ ] Smoke: sección aparece primera, divisor presente, checks reflejan estado.
- [ ] Gates comunes.

## No hacer

Persistencia de view config (FTC-004) · sceneManager real (S-24, 2.0).
