---
title: BT5-011 — Cells por activación y menús por posición
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

# BT5-011 — Cells por activación y menús por posición

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Añadir en Settings/Explorer `Order cells by activation`, default off. En modo activation, los cells activos renderizan en el orden en que fueron activados; en fixed usan la posición canónica del registro. Los menús de cell y sort proyectan el mismo orden visual: activos primero en orden de render y luego inactivos en su posición fixed potencial.

## Acceptance criteria

- [ ] Con solo Icon activo, activar Props→Words→Label renderiza Icon→Props→Words→Label.
- [ ] Desactivar el setting vuelve inmediatamente al orden fixed sin perder el historial de activación.
- [ ] Reactivarlo restaura el orden previo; desactivar/reactivar un cell lo mueve al final de los activos.
- [ ] El setting define el modo global; cada explorer/Saved View config conserva su propia secuencia de activación y migra arrays existentes.
- [ ] Cell options lista activos primero según render y después inactivos por posición fixed.
- [ ] Sort options usa la posición del cell asociado; sorts sin cell reciben una posición canónica explícita.
- [ ] Opciones contextualmente invisibles no dejan huecos ni alteran el orden persistido.
- [ ] Todos los renderers soportados consumen un resolver compartido, no hardcodes divergentes.

## Blocked by

[[010-shared-cell-registry-hover-info|BT5-010]].
