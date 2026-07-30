---
title: FTC-002 — Jump vía mini-seam reveal-node
type: issue
status: open
parent: "[[docs/work/polish/issues/ftc-floating-toc/index|FTC index]]"
created: 2026-07-14T00:00:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish, floating-toc]
---

# FTC-002 — Jump / reveal (AFK)

## Goal

Click en letra → scroll del panel activo al primer nodo L1 de ese grupo, vía mini-seam con la MISMA forma del canon goal (WAR-shaped) para que el port a 2.0 sea move.

## Scope

- `src/services/routerFloatingToc.ts` (mini-router local): recibe invocación `{action:'reveal-node', targetId}` y resuelve contra un handle registrado (`revealNode(id): void` + razones tipadas `missing-reveal-port`/`reveal-rejected` — gemelo del router de sandbox, P.D slice 4).
- Handle-lite por panel: `revealNode(id)` despacha según viewMode → `UnifiedTreeView.scrollToId(id,'start')` (tree) · `scrollToPath(id)` (table/grid).
  PROHIBIDO el DOM-query jumping del proto (mandato docs: runtime virtualizado).
- Comportamiento default = hard jump (`behavior:'auto'`); smooth queda para backlog.
- Filas fuera de ventana virtual: cubiertas por `_scrollTopForIndex`/`_pendingScroll` (anchors shard §scroll) — test explícito.

## DoD (tool-checkable)

- [ ] Unit router: invocación válida → reveal; sin handle → razón tipada, no throw.
- [ ] Smoke plugin-dev por vista: tree/table/grid saltan al grupo correcto, incluidas letras cuyo primer nodo está FUERA de la ventana renderizada (vault stress).
- [ ] Cambio de tab re-registra el handle del panel activo (sin leaks: unregister en destroy).
- [ ] Gates comunes.

## No hacer

Auto-expand de ancestros (deep reveal = 2.0) · comandos palette · scope option.
