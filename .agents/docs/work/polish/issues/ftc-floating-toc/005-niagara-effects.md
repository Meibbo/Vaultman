---
title: FTC-005 — Efectos Niagara como opción (off-default)
type: issue
status: open
parent: "[[docs/work/polish/issues/ftc-floating-toc/index|FTC index]]"
created: 2026-07-14T00:00:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish, floating-toc]
---

# FTC-005 — Niagara effects (AFK; veredicto perf = HITL)

## Goal

Port del paquete de efectos del proto como opción "Niagara effects" (default OFF — preset minimal = estático; usuarios que la activan ven el rail vivo). Gated por datos de perf de `1.2.0-beta.1` en device real.

## Scope

- Setting `floatingTocNiagara` (default `false`) en la sección Floating TOC.
- Port desde `explorer.jsx` L83-285 + CSS (anatomía 2026-07-13), adaptado Svelte 5:
  magnificación gaussiana (`scaleFor`, σ fija) · displacement hacia el puntero (`offsetFor`/perp clamp) · spread de vecinos (tanh) · rail-follow/HWM · glow radial `blur(3px)` (`.has-glow`) · name-pill (`backdrop-filter blur(6px)`) · reveal falloff · pila vertical de letras · bounce easing · haptics `navigator.vibrate(3)` (gate capability) · gate "engage" (~150ms hold o >6px) para que tap rápido salte sin onda.
- Scrub táctil (`touch-action:none` en el rail SOLO con efectos ON).
- Estático OFF↔ON sin remount del explorer (solo el rail cambia de modo).

## DoD (tool-checkable)

- [ ] Toggle OFF = cero regresión visual/perf vs FTC-001 (snapshot comparado).
- [ ] ON: onda/glow/pill funcionan en desktop; `emulateMobile` sin overflow.
- [ ] Haptics solo si `navigator.vibrate` existe (no throw en desktop).
- [ ] Perf: scrub sostenido sin blank frames del explorer (probe/HUD si disponible en 1.1.6; mínimo: sin long-tasks >100ms atribuibles al rail en DevTools).
- [ ] HITL: veredicto dev en device real (beta.2) — queda anotado aquí.
- [ ] Gates comunes.

## No hacer

Posición configurable/glyph-modes/labelMode (backlog) · efectos como scene propia (2.0).
