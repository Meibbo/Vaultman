---
title: BT5-019 — Registro y picker propio de iconos addon
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
source_ids:
  - BT4-030-residual
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T08:02:57
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5]
---

# BT5-019 — Registro y picker propio de iconos addon

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Migra la mitad pendiente de BT4-030; el watcher externo Iconic ya cerró en beta.4.

## What to build

Dar a snippets y plugins un registro propio de overrides de icono y un picker accesible desde su context menu. Mantener precedencia explícita entre override Vaultman, override externo/Iconic, icono emitido por el plugin y fallback; no depender de que Iconic modele item-kinds que no conoce.

## Acceptance criteria

- [ ] Snippets y plugins abren un picker Vaultman y persisten override por id estable.
- [ ] Clear/reset vuelve al siguiente icono de la cadena de precedencia.
- [ ] Rename/disable/uninstall limpia o conserva overrides según identidad, sin colisiones por label.
- [ ] Cambios externos de Iconic siguen refrescando sin polling por timer en background.
- [ ] Context menu no se duplica ni abre dos pickers superpuestos.
- [ ] Tests cubren precedencia completa, persistencia, clear y addon ausente.

## Blocked by

None — can start immediately.
