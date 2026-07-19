---
title: BT5-030 — Micro-cuelgues al escribir con una leaf Vaultman abierta
type: issue
status: needs-triage
lifecycle: active
priority: P0
execution: HITL
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T13:38:07
updated: 2026-07-19T13:38:07
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, regression, performance, editor]
---

# BT5-030 — Micro-cuelgues al escribir con una leaf Vaultman abierta

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Regresión P0
reportada por el dev el 2026-07-19.

## Reported behavior

Después de reactivar el plugin Vaultman mientras su tab/leaf permanece abierto, reaparecen
micro-cuelgues esporádicos al escribir en una nota cualquiera. Al desactivar Vaultman la
experiencia vuelve a ser fluida. El bug degrada la interacción primaria de Obsidian y bloquea
beta.5/stable aunque el explorer parezca funcional.

## Diagnosis contract before fixing

No atribuirlo por intuición a Remaining tasks, al virtualizer o a un timer. Medir una matriz A/B:

1. plugin disabled;
2. plugin enabled sin leaf Vaultman;
3. leaf abierta pero no activa/oculta;
4. leaf visible mientras se escribe en otra leaf;
5. cada tab interno: Files, Props, Tags, Snippets, Plugins, Content y Statistics;
6. inmediatamente tras reload/reactivación versus estado ya asentado;
7. nota sin autosave/modificación de vault versus ciclo real modify/metadata/save.

Instrumentar input-to-next-paint, event-loop delay, long tasks y marcas de trabajo Vaultman.
Correlacionar cada spike con productor y stack antes de cambiar código. Candidatos confirmados
por source inspection, todavía **no causas demostradas**:

- polling cada 2500 ms en Snippets Explorer y Plugins Explorer;
- polling/fallback de Iconic;
- refresh de statistics tras `vault.modify` para archivos ya cacheados;
- `metadataCache`/filter invalidation y renders de Props/Tags;
- trabajo de proyección/virtualizer conservado por una leaf abierta aunque no sea la activa.

## Acceptance criteria

- [ ] Existe un repro automatizado y repetible en `plugin-dev`, más confirmación HITL del dev.
- [ ] El harness produce A/B comparable con el mismo overhead y reporta p50/p95/p99/max, long tasks y marcas Vaultman.
- [ ] La matriz identifica el menor estado que activa el problema: plugin, leaf, tab interno y evento disparador.
- [ ] Un perfil atribuye los stalls a uno o más productores concretos; una correlación temporal sola no cuenta como causa.
- [ ] Durante 60 s de escritura automatizada no quedan long tasks >=50 ms atribuibles a Vaultman ni periodicidad visible asociada a sus timers/eventos.
- [ ] El p95/p99 input-to-next-paint del caso reparado queda dentro del presupuesto relativo fijado contra el baseline disabled antes del fix.
- [ ] El fix cancela/suspende trabajo no visible y trocea el trabajo necesario; no se acepta sólo alargar un intervalo.
- [ ] Los contadores/cells visibles siguen actualizándose correctamente después de idle, save, cambio de leaf y reactivación.
- [ ] No se introduce starvation: índices/caches pendientes progresan cuando el editor está idle.
- [ ] Regression tests cubren reload con leaf preservada, unload/reload sin listeners/timers duplicados y cierre de la leaf.
- [ ] Toda prueba runtime de builds modificados usa explícitamente `vault=plugin-dev`; no se ejecuta `test:integrity` mientras pueda elegir otro vault.

## Blocked by

None. Es un release blocker independiente. Puede reutilizar instrumentación de
[[003-remaining-tasks-availability-pipeline|BT5-003]], pero no debe esperar al benchmark
del vault grande ni asumir que comparte root cause.
