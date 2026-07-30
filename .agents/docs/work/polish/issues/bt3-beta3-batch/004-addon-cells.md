---
title: "BT3-004 — Addon cells: toggle nativo + gear config"
type: issue
status: pending
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T09:25:00
created_by: claude-fable-5
tags: [agent/issue, initiative/polish]
---

# BT3-004 — Addon cells: toggle nativo + gear config

Depende de [[003-addons-parity|BT3-003]] (estructura de cells addons).

**Estado hoy.** Cell on/off = `NodeBadge` custom (`explorerSnippets.ts:48-59`, `explorerPlugins.ts:53-74`: `lucide-toggle-right/left`); enable/disable via double-click o cmenu. Cero uso de markup nativo toggle en `src/`.

**Objetivo (D6/D7).**
- Cell on/off con **markup nativo Obsidian** (`checkbox-container` + `is-enabled`, mismo DOM que Settings core) por defecto. Setting nuevo en **Layout Settings** (naming provisional `addonCellStyle: 'native' | 'badge'`, default `native`) togglea a la versión badge actual.
- Enable/disable = **un solo click** sobre el cell toggle (double-click se retira como gesto; cmenu conserva su item).
- Plugins: cell **gear** (config) → `app.setting.open()` + `openTabById(pluginId)`.
  **Oculto** si el plugin no registra settings-tab (lookup runtime de tabs registrados;
  la detección exacta se resuelve en implementación — `app.setting.pluginTabs` o equivalente, verificar contra API real, no memoria).
- Vaultman self-node conserva shield/protección actual.

**DoD (AFK):**
- Toggle nativo renderiza y togglea con un click (unit sobre handler + snapshot DOM).
- Setting cambia el render en caliente (sin reload).
- Gear presente solo para plugins con settings-tab (test con stub de registry).
- Source-guard: double-click handler de toggle retirado.
- Gates estándar.

**HITL dev:** look del toggle nativo dentro de la fila + copy del setting.
