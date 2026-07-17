---
title: FTC-006 — DIFERIDA — scope option del index (1.2.x)
type: issue
status: deferred
parent: "[[docs/work/polish/issues/ftc-floating-toc/index|FTC index]]"
created: 2026-07-14T00:00:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish, floating-toc]
---

# FTC-006 — Scope option (DIFERIDA a patch 1.2.x)

Decisión dev 2026-07-14: v1.2.0 = solo parent L1; las opciones de scope se difieren.

## Contenido futuro

- Opción de scope del index en la sección settings Floating TOC: target kind
  (`parent L1` default ↔ `gc_file` = primer FILE cuyo label matchea la letra) +
  `hierarchy_level` distinto al default.
- Vocabulario canon (catálogo 2026-07-14, corrección dev): GP/P/C/GC/AD son **estados
  posicionales computados, no kinds** (un nodo puede ser P y C a la vez); GC = último
  eslabón sin importar nivel; AD = condición externa por config/state; adjuntar AD
  debajo de un GC le quita el estado GC (el AD mismo puede ser GC) — el scope debe
  **re-evaluar estados** cuando lleguen AD_nodes (feature futura del stream main).
- Primer candidato real de mediación cross-panel más rica (scope conditional rules =
  NAVCO.scope) — si crece, evaluar contra el ActionNode shape mini-grill.

## Preparación ya presente

`logicIndexGroups` recibe `{id,label}[]` genérico (FTC-001) — cambiar la colección de
entrada (L1 → files hoja) NO toca el rail ni el router (`reveal-node` opera por id).
