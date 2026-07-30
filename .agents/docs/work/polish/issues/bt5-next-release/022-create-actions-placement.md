---
title: "BT5-022 — Create File/Folder: searchbox o toolbar"
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

# BT5-022 — Create File/Folder: searchbox o toolbar

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Añadir una opción de placement para los action nodes built-in Create File y Create Folder:
mantenerlos en el searchbox o moverlos al toolbar. En toolbar conservan la semántica de creación actual y participan de la estrategia de overflow de BT5-021.

## Acceptance criteria

- [x] El setting mueve ambos nodos sin duplicarlos y tiene default compatible con beta.4.
- [x] En Searchbox conservan el comportamiento actual y usan el texto de búsqueda según hoy.
- [x] En Toolbar usan el texto actual cuando sea válido y el fallback/prompt existente cuando esté vacío.
- [x] Condensed los mueve al Tools menu por la misma prioridad responsive que otros nodos.
- [x] Horizontal scroll los mantiene en la barra y accesibles por keyboard/touch.
- [x] Crear file/folder limpia o conserva search según el contrato actual, sin alterar filtros por accidente.
- [x] Tests cubren ambos placements, ambos overflow modes y ausencia de duplicados.

## Blocked by

None — puede implementarse sobre condensed actual e integrarse con BT5-021 en cualquier orden.

## Outcome 2026-07-20 (tarde)

**Commit `546c376d`** (junto a 024). Gate verde. Test focal `test/unit/toolbarCommandsAndCreate.test.ts`. Setting `createActionsPlacement` (default searchbox). En toolbar, Create File/Folder son nodos del toolbar (Create File respeta el binding de BT5-023) y el create del searchbox de Files se retira sin duplicar. Montan sobre el overflow de BT5-021. Detalle: [[docs/work/polish/plans/2026-07-19-bt5-next-10/08-bt5-014-021-022-023-024|shard 08]].

Pendiente: smoke; relocalización a Tools en condensed (diferido).
