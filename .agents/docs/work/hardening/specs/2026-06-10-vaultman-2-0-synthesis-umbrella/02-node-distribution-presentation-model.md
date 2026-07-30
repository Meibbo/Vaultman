---
title: Node Distribution & Presentation Model — digitalización del whiteboard 2026-06-02
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|Vaultman 2.0 Synthesis Umbrella]]"
created: 2026-06-10T00:00:00
updated: 2026-06-10T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
source_image: "C:/Users/vic_A/My Drive/Start of The Road/x/Pictures/IMG_20260602_101400.jpg"
tags:
  - agent/spec
  - explorer/model
  - goal-stream
  - wsa
---

# 02 — Node Distribution & Presentation Model

Digitalización del whiteboard del dev "Explorer Panel Node Distribution" (2026-06-02).
Design-input #2 de la umbrella (D7). Pertenece al dominio **Symbiont Explorer** (taxonomía de nodos/relaciones) con superficie en **WSA** (interacciones de presentación). Tras review del dev, promover como shard de `docs/architecture/explorer-model/`.

## Definiciones (verbatim del whiteboard, normalizadas)

| Término | Definición |
|---|---|
| **Cell** | retrieved data or actionable unit — coincide con N.R: cell = node-element |
| **Slot** | rigid position for node placement — régimen actual de list/table/grid |
| **GrandParent (G.P.)** | holarchy virtual grouping containers — contenedores virtuales por encima de la jerarquía (group-by buckets como nodos reales) |
| **Parent/Children (P./C.)** | recursive hierarchy subsequent nodes — jerarquía recursiva L0..LN |
| **GrandChildren (G.C.)** | nivel descendiente profundo de la recursión (L3+ en el diagrama) |
| **Adopted (A.D.)** | a node placed from external providers — ya existe en sandbox (outline→files); se generaliza a contrato |
| **Related (R.)** | heterarchy links throughout levels — edges no-árbol cruzando niveles (links/backlinks; alimenta graph engine) |
| **Coordinates** | 3D node placement flexible form — `x\|y\|z` fixed/dynamic, colocación no rígida (floating tiles); conecta con el Nav3D DEFERRED de explorer-model |

## Interacciones del panel (superficie WSA)

- **Pagination** = X|Y splits + **Z layers**.
- **Pan** · **Zoom** · **Rotation** · **Selection** (box y lasso ya existen en sandbox + proto).
- Estas son exactamente las del "Layout Design API" del megadump: WSA + UPV + Live Redesign + paginate/layers/pan/zoom/rotate.

## Layers (modelo Krita genérico)

- En explorer: capas de nodos; desactivar capa oculta su contenido.
- En editor (CodeMirror): desactivar capa oculta chunks de markdown escritos en esa capa. Compatibilidad objetivo con Excalidraw (add-on candidato; ya es "markdown por capas" — escribe su información así).
- Clasificación (D7): layers explorer/floating = flag experimental en 2.0.0;
  **editor-layers = post-2.0** (brainstorm + research propio: viabilidad CodeMirror decorations, interop formato Excalidraw, seguridad de mutación por capa — requiere queue/diff maduro).

## Mapeo a la arquitectura

| Pieza | Impacto | Nivel pirámide |
|---|---|---|
| Node contract (N.R) | relation kinds más allá del árbol: holarchy (GrandParent), heterarchy (Related), Adopted — entra al spec de N.R | N0 |
| ViewConfig | régimen de colocación (slot vs coordinates) = capability del engine; campos reservados `layerId`, coordenadas, relations — designed-for en wave 1, implementación diferida | N0 (schema) |
| PSS | los presets deben poder persistir posición de cada cosa cuando no hay orden rígido de slots (xyz por nodo, asignación de capas, z-order) — requisito del dev para el PSS grill | N1 |
| WSA | paginate X\|Y + Z layers + pan/zoom/rotate + Live Redesign como interacciones genéricas del panel | N3 |
| Graph engine | Related/heterarchy alimenta graph; puede requerir librerías nuevas → disciplina de tooling primero | N4 |

## Notas laterales del whiteboard

- "Helper Docs / real bookmarks" → candidato: provider de Bookmarks core. Registrar en el ledger Fase B.

## Pendiente

- Review del dev de esta digitalización contra la foto original.
- Promoción a `docs/architecture/explorer-model/` (nuevo shard) tras review.
- Resolver keying de identidad para coordinates/overrides (provider id · domain key · path · depth · parent id · occurrence id) — misma pregunta abierta que dejó el shard 04 §31 para parentViews.
