---
title: BT5-027 — Mover tab actual entre main leaf y sidebars
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: HITL
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T10:02:50
updated: 2026-07-19T10:02:50
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, workspace]
---

# BT5-027 — Mover tab actual entre main leaf y sidebars

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Añadir una action y command de Obsidian para mover el tab/leaf actual entre el área main y
los sidebars sin recrear su view state. La action ofrece destinos explícitos compatibles
con el workspace actual; el command no debe elegir un sidebar arbitrario ni mover un leaf
pinneado/incompatible silenciosamente.

## Acceptance criteria

- [ ] La action opera sobre el leaf activo y conserva view type, state, history y focus.
- [ ] Main, left sidebar y right sidebar aparecen solo cuando son destinos válidos.
- [ ] El command tiene semántica determinista y comparte el mismo servicio que la action.
- [ ] Leaf pinneado, popout, root vacío y view no movible degradan con Notice, sin pérdida.
- [ ] Mover ida/vuelta no duplica leaves ni listeners y mantiene el tab activo.
- [ ] Tests cubren cada región, no-op de mismo destino y fallos de workspace adapter.

## Blocked by

None. HITL: fijar si Command Palette expone un selector único o comandos por destino según
las capacidades reales de la API de Workspace.
