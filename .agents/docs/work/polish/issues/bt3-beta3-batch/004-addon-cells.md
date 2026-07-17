---
title: BT3-004 — Addon cells: toggle nativo + gear config
type: issue
status: completed
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
updated: 2026-07-17T14:40:00-05:00
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish]
---

# BT3-004 — Addon cells: toggle nativo + gear config

Depende de [[003-addons-parity|BT3-003]] (estructura de cells addons).

**Estado hoy.** Cell on/off = `NodeBadge` custom (`explorerSnippets.ts:48-59`,
`explorerPlugins.ts:53-74`: `lucide-toggle-right/left`); enable/disable via
double-click o cmenu. Cero uso de markup nativo toggle en `src/`.

**Objetivo (D6/D7).**
- Cell on/off con **markup nativo Obsidian** (`checkbox-container` + `is-enabled`,
  mismo DOM que Settings core) por defecto. Setting nuevo en **Layout Settings**
  (naming provisional `addonCellStyle: 'native' | 'badge'`, default `native`) togglea
  a la versión badge actual.
- Enable/disable = **un solo click** sobre el cell toggle (double-click se retira como
  gesto; cmenu conserva su item).
- Plugins: cell **gear** (config) → `app.setting.open()` + `openTabById(pluginId)`.
  **Oculto** si el plugin no registra settings-tab (lookup runtime de tabs registrados;
  la detección exacta se resuelve en implementación — `app.setting.pluginTabs` o
  equivalente, verificar contra API real, no memoria).
- Vaultman self-node conserva shield/protección actual.

**DoD (AFK):**
- Toggle nativo renderiza y togglea con un click (unit sobre handler + snapshot DOM).
- Setting cambia el render en caliente (sin reload).
- Gear presente solo para plugins con settings-tab (test con stub de registry).
- Source-guard: double-click handler de toggle retirado.
- Gates estándar.

**HITL dev:** look del toggle nativo dentro de la fila + copy del setting.

## Cierre de implementación — 2026-07-17

Commit code-only: `d98d28e4 feat(addons): add native state cells` sobre
`v12/bt3`.

- `TreeNode` incorpora un modelo discriminado de cells (`toggle` / `action`) y
  `UnifiedTreeView` las renderiza dentro de su badge zone sólo si la cell está
  visible. El signature de fila incluye estilo, estado, disponibilidad y copy, por
  lo que una mutación hot invalida el DOM reutilizado sin desmontar el árbol.
- El estilo default `addonCellStyle: 'native'` produce el DOM nativo
  `checkbox-container` + `is-enabled` + `input[type=checkbox]`; el setting de Layout
  Settings ofrece Native toggle / Badge y persiste el union `'native' | 'badge'`.
  `pageFilters.svelte` propaga el cambio de settings a ambos adapters mediante
  `setCellStyle`, además del mecanismo general de settings revision.
- Enable/disable pasa al callback `onCellClick` de la cell `state`. Se retiró
  completamente `onRowDoubleClick` de Snippets/Plugins; el context menu conserva su
  acción. Un lock `pendingToggleIds` por add-on impide que un doble clic físico envíe
  dos mutaciones concurrentes y deshabilita el control mientras espera.
- Plugins añade gear `config` sólo cuando el runtime registry contiene el id. La
  frontera fue verificada contra BRAT instalado: `Object.values(app.setting.pluginTabs)`
  devuelve tabs `{id,name}`; apertura real = `setting.open()` +
  `openTabById(pluginId)`. `logicAddonCells.ts` encapsula esa API interna y acepta el
  registry tanto como object como array.
- Vaultman conserva shield warning deshabilitado y la protección vuelve a validarse
  en el handler, de modo que ni cell ni llamada programática pueden desactivarlo.
  El gear propio puede abrir settings cuando su tab está registrado.
- i18n inglés/español añadido para setting, opciones y acción gear. CSS nuevo se
  limita a escala/alineación del toggle, input pointer routing y tamaño del gear;
  la geometría exacta permanece HITL.

### Evidencia AFK

- RED observado: módulo registry ausente, DOM native ausente y source guard todavía
  encontraba `onRowDoubleClick`. GREEN focal final: 3 files / 16 tests.
- Snapshot inline verifica estructura native + click único; test adicional verifica
  rerender hot native→badge sobre la misma fila. Registry/gear cubre id presente,
  ausente y orden `open`→`openTabById`.
- `pnpm run check`: 0 errors / 0 warnings; autofixer de `pageFilters.svelte`:
  `issues:[]`.
- ESLint, Prettier, Stylelint y `git diff --check`: verdes; build production verde.
- Suite unitaria integrada: 95 files / 501 tests.
- Adversarial C2: cubiertos doble-click residual, mutación concurrente, setting
  legacy/invalid (fallback native), registry object/array, falta de tab, foco/ARIA,
  lazy panel y self-node. Visual/UI/Obsidian/mobile sigue delistado; look/copy HITL.
