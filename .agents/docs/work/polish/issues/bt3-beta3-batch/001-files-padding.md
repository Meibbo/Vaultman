---
title: BT3-001 — Quitar nav-files-container (padding Files)
type: issue
status: completed
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
updated: 2026-07-17T11:21:20
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish]
---

# BT3-001 — Quitar `nav-files-container` (padding Files) [micro]

**Bug.** beta.2 (`c7c7da26`) añadió `this.containerEl.addClass('nav-files-container')` en `explorerFiles.ts:151` (+ `removeClass` L483), solo Files. Clase nativa del File Explorer core; su CSS (`app.css`) mete `padding: var(--size-4-1) var(--size-4-3) var(--size-4-6)` (4/12/24px) + `overflow-y:auto`. El scroller real (`.vaultman-tree-virtual-viewport`) vive DENTRO → todo inset, scrollbar incluido.
beta.1 = 0px. Sin dependencia funcional: nada más en `src/` la referencia.

**Fix (D1).** Eliminar ambas líneas (add/remove). Nada más.

**DoD (AFK):**
- Grep `nav-files-container` en `src/` = 0 matches.
- Source-guard test: `explorerFilesSource.test.ts` asegura ausencia de la clase.
- Gates estándar del batch.

**Nota.** La motivación original probable (herencia de estilos de themes/snippets nativos) se estudia bien en [[010-rainbow-research|BT3-010]]; si ese research decide re-adoptar clases nativas, será con override explícito de padding (lección de este bug).

## Implementation closeout (2026-07-17)

- Code-only commit: `03fe92bc fix(explorer): remove files inset and tighten index lane`.
- Eliminados `addClass` y `removeClass`; `src/` queda con cero referencias a `nav-files-container`.
- TDD: el source-guard nuevo falló primero por las dos referencias presentes y pasó después del fix. El guard stale de integración Iconic que exigía la clase se corrigió al contrato D1.
- Gate del slice BT3-001+007: focal 3 files / 43 tests; full unit 92 files / 473 tests;
  `pnpm run check` 0/0; ESLint dirigido, Stylelint, build y diff-check verdes.
- Testing visual/UI/Obsidian/mobile no ejecutado por policy; el build sí sincronizó los artefactos a `plugin-dev` mediante el script estándar.

### Adversarial pass C2

La clase removida podía ser consumida por themes/snippets de terceros aunque `src/` no la usara. Esa compatibilidad no se conserva en este slice: es el tradeoff aceptado por D1 y queda exclusivamente en BT3-010, que no se ejecutó. No se retiró ninguna clase de fila ni atributo de nodo, solo el contrato de contenedor que introducía padding/scroll nativo.
