---
title: BT3-001 — Quitar nav-files-container (padding Files)
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT3-001 — Quitar `nav-files-container` (padding Files) [micro]

**Bug.** beta.2 (`c7c7da26`) añadió `this.containerEl.addClass('nav-files-container')`
en `explorerFiles.ts:151` (+ `removeClass` L483), solo Files. Clase nativa del File
Explorer core; su CSS (`app.css`) mete `padding: var(--size-4-1) var(--size-4-3)
var(--size-4-6)` (4/12/24px) + `overflow-y:auto`. El scroller real
(`.vaultman-tree-virtual-viewport`) vive DENTRO → todo inset, scrollbar incluido.
beta.1 = 0px. Sin dependencia funcional: nada más en `src/` la referencia.

**Fix (D1).** Eliminar ambas líneas (add/remove). Nada más.

**DoD (AFK):**
- Grep `nav-files-container` en `src/` = 0 matches.
- Source-guard test: `explorerFilesSource.test.ts` asegura ausencia de la clase.
- Gates estándar del batch.

**Nota.** La motivación original probable (herencia de estilos de themes/snippets
nativos) se estudia bien en [[010-rainbow-research|BT3-010]]; si ese research decide
re-adoptar clases nativas, será con override explícito de padding (lección de este bug).
