---
title: "BT3-005 — Settings IA: renames, defaults, blur gate"
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT3-005 — Settings IA: renames, defaults, blur gate

Todo sobre `VaultmanSettings.ts` (orden = secuencia literal de `new Setting(...)` en
`display()`), `typeSettings.ts`, `main.ts` (`updateGlassBlur`), i18n.

**Cambios (D9/D10/D11/D15):**
1. **Rename** heading `settings.style_config` "Style Config" → **"Layout Settings"**.
2. **Rename** heading `settings.saved_view_config` "View Config" → **"Layouts"**
   (posición en settings sin cambio; el reorder "de primero" aplica al view cmenu,
   BT3-006).
3. **Rename** `settings.badge_colors` "Colored badges" → **"Colored cell badges"**.
4. **Idioma fuera de UI**: quitar el bloque del selector (`VaultmanSettings.ts:32-45`).
   El setting `language` persiste internamente (default `'auto'`); i18n runtime
   intacto.
5. **Blur gate runtime (D9)**: preset minimal fuerza blur 0 — `updateGlassBlur()`
   (main.ts:451-455) corta a 0 cuando `minimalStyle===true`; el slider se oculta en
   minimal (sub-render condicional). `glassBlurIntensity` guardado NO se toca
   (experimental lo sigue usando; default 60 intacto).
6. **Sub-page "Toolbar" (D11)** dentro de Layout Settings (patrón files-hover /
   floating-toc): mueve show tab labels (`filtersShowTabLabels`) · show toolbar
   (`showToolbar`) · condense files tools (`toolbarToolsMenu`). El setting nuevo de
   BT3-004 (`addonCellStyle`) también vive en Layout Settings (inline, no en la
   sub-page).
7. **Files cell `count` → "Props" (D15)**: label del cell en `CELL_LABELS.files`
   (files-only; el binding interno ya usa `'props'`, `explorerFiles.ts:549,723`) +
   label del sort files-only si aplica; `DEFAULT_VISIBLE_CELLS.files` pierde `count`
   → `['name','ext','nested']` (usuarios nuevos). Estado visible-cells ya persistido
   de usuarios existentes no se migra (respeta su elección).

**DoD (AFK):**
- Source-guards de orden/presencia en `display()` (idioma ausente, headings renombrados,
  sub-page Toolbar con los 3 toggles).
- Unit: `updateGlassBlur` con minimal=true → var CSS 0; experimental → valor guardado.
- Unit: defaults nuevos (`DEFAULT_VISIBLE_CELLS.files` sin `count`).
- i18n en+es sincronizados; keys viejos retirados sin huérfanos (grep).
- Gates estándar.
