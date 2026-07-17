---
title: BT3-010 — Research compat snippet rainbow
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish, research]
---

# BT3-010 — Research compat snippet `fancyfile-explorer-rainbow` [research only]

**Problema (D19).** El CSS snippet `fancyfile-explorer-rainbow` colorea el Files
nativo pero no nuestro files explorer (fileScene/files_tab_explorer). El dev quiere
research EXHAUSTIVO de cómo hacer que snippets/themes que targetean el File Explorer
nativo funcionen sobre nuestros explorers — aceptable una config muy específica
(p. ej. solo Files).

**Método (sin código de producto):**
1. **Fuente del snippet**: leer el snippet real en el vault del dev
   (`.obsidian/snippets/`) — inventariar sus selectores (`.nav-folder`,
   `.nav-file-title`, `data-path`, nth-child por nivel, CSS vars propias, etc.).
2. **web-lab** (`Desktop/obsidian-web-lab`, app.js+app.css reales): DOM canónico del
   File Explorer nativo (jerarquía de clases + attrs por fila/indent) vs nuestro DOM
   virtualizado (`NodeRow`/tree rows). Mapear delta selector-por-selector.
3. **obsidian-cli** (vault `plugin-dev`): DOM vivo de nuestro files tab para verificar
   el mapeo (read-only; smokes visuales siguen delistados — esto es inspección DOM).
4. **Mecanismos candidatos a evaluar** (mínimo): (a) adopción controlada de clases
   nativas `nav-*` + `data-path` en las FILAS files-only (lección BT3-001: JAMÁS
   heredar el contenedor con padding sin override); (b) capa de alias CSS que
   re-emite reglas del snippet hacia nuestros selectores; (c) doc de config "snippet
   compat mode" opt-in; (d) descartar con razones si el costo rompe virtualización.
5. Riesgos: filas virtualizadas (nth-child inestable) · specificity wars con themes ·
   coste de mantener paridad de DOM nativo.

**Deliverable:** research doc en
`docs/work/polish/research/2026-07-XX-native-css-compat/` (index + hallazgos +
recomendación de mecanismo + config propuesta + qué NO cubre). Cero código de
producto. Se convierte en issue de implementación solo tras review del dev.
