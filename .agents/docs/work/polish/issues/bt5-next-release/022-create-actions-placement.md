---
title: "BT5-022 — Create File/Folder: searchbox o toolbar"
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-022 — Create File/Folder: searchbox o toolbar

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Añadir una opción de placement para los action nodes built-in Create File y Create Folder:
mantenerlos en el searchbox o moverlos al toolbar. En toolbar conservan la semántica de
creación actual y participan de la estrategia de overflow de BT5-021.

## Acceptance criteria

- [ ] El setting mueve ambos nodos sin duplicarlos y tiene default compatible con beta.4.
- [ ] En Searchbox conservan el comportamiento actual y usan el texto de búsqueda según hoy.
- [ ] En Toolbar usan el texto actual cuando sea válido y el fallback/prompt existente cuando esté vacío.
- [ ] Condensed los mueve al Tools menu por la misma prioridad responsive que otros nodos.
- [ ] Horizontal scroll los mantiene en la barra y accesibles por keyboard/touch.
- [ ] Crear file/folder limpia o conserva search según el contrato actual, sin alterar filtros por accidente.
- [ ] Tests cubren ambos placements, ambos overflow modes y ausencia de duplicados.

## Blocked by

None — puede implementarse sobre condensed actual e integrarse con BT5-021 en cualquier orden.
