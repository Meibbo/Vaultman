---
title: BT5-024 — Comandos Obsidian como acciones de toolbar
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-20T19:20:00
created_by: codex-gpt-5
updated_by: claude-opus-4-8
tags: [agent/issue, initiative/polish, release/bt5]
---

# BT5-024 — Comandos Obsidian como acciones de toolbar

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Añadir en Settings/Toolbar una lista ordenada de comandos de Obsidian que se proyecta como action nodes del toolbar. Reusar el resolver seguro de BT5-023 y metadata del command registry; soportar add/remove/reorder sin importar la arquitectura ActionNode 2.0.

## Acceptance criteria

- [x] El dev/usuario puede buscar, añadir, quitar y reordenar command ids; default lista vacía.
- [x] Añadir un comando es una acción explícita y Settings advierte que el toolbar lo ejecutará inmediatamente al activarlo.
- [x] Cada acción muestra label/icon disponibles del registry y ejecuta el command id correcto.
- [x] Duplicados se previenen o normalizan de forma explícita y testada.
- [x] Comandos retirados permanecen como entrada reparable/disabled con warning, no desaparecen silenciosamente.
- [x] Condensed menu y horizontal scroll tratan estas acciones como cualquier nodo del toolbar.
- [x] Keyboard, tooltip y aria exponen el nombre del comando.
- [x] Persistencia hace merge seguro entre desktop/mobile y plugins habilitados/deshabilitados.
- [x] No se soportan parámetros, macros ni auto-run; solo invocación manual del command id registrado.
- [x] Tests cubren orden, ejecución, missing command, overflow y teardown.

## Blocked by

[[023-create-file-command-binding|BT5-023]].

## Outcome 2026-07-20 (tarde)

**Commit `546c376d`** (junto a 022). Gate verde. Test focal `test/unit/toolbarCommandsAndCreate.test.ts`. Lista ordenada de comandos de Obsidian como nodos del toolbar, reusando el resolver de BT5-023. Settings: add (picker) / remove / reorder (DnD) por id, default vacío, dedupe; cada nodo ejecuta el id con label/aria del registry; comando retirado = nodo disabled reparable con warning.
Monta sobre el overflow de BT5-021. Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/08-bt5-014-021-022-023-024|shard 08]].

Pendiente: smoke; relocalización a Tools en condensed (diferido); sin parámetros/ macros/auto-run (fuera de alcance por AC).
