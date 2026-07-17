---
title: BT3-011 — Regresiones beta.3 y corrective beta.4
type: issue
status: pending
lifecycle: active
parent: "[[docs/work/polish/issues/bt3-beta3-batch/index|BT3 index]]"
created: 2026-07-17T16:49:17
updated: 2026-07-17T16:49:17
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/issue
  - initiative/polish
  - release/1.2.0
  - regression
---

# BT3-011 — Regresiones beta.3 y corrective beta.4

## Reporte del dev

Después del cierre automático de BT3-001→009, el dev informó que la implementación
generó errores nuevos e implementó incorrectamente varias solicitudes. Por tanto, los
gates automatizados registrados para `v12/bt3` prueban compilación y contratos cubiertos,
pero **no prueban aceptación funcional**. La validación previa queda revocada como señal
de readiness.

El dev no enumeró todavía en esta sesión cada error o solicitud desviada. El siguiente
agente no debe inventarlos ni inferir que BT3-006 es el único origen: primero debe
capturar la lista concreta, reproducción, comportamiento esperado y severidad.

## Estado verificable al cierre

- Candidato de producto: `C:/tmp/vaultman-release-beta2-final2`, rama `v12/bt3`,
  worktree limpio, HEAD `7ba6a3c9`.
- La rama contiene ocho commits code-only sobre `dev` @ `14e87dc7`; está nueve commits
  por delante de `origin/dev` porque `origin/dev` sigue en beta.2 @ `5e5fa1df`.
- `package.json` y `manifest.json` todavía dicen `1.2.0-beta.2`.
- El remoto sólo tiene tags `1.2.0-beta.1` y `1.2.0-beta.2`; beta.3 no fue publicada.
- No hubo push, merge, tag ni PR de `v12/bt3`.

## Decisión de release

Recomendación técnica: **no publicar beta.3 como candidata sana**. Si el dev decide
publicarla de todos modos para fijar el artefacto exacto que se va a corregir, debe ser
GitHub pre-release/BRAT, con release notes que declaren regresiones conocidas y sin
promoción a stable.

Runbook autorizado para una publicación intencional de beta.3:

1. Crear un worktree limpio de `dev` y hacer `git merge --ff-only v12/bt3`.
2. Confirmar que el rango público no contiene `.agents/` y revisar las release notes.
3. Ejecutar primero `pnpm release -- 1.2.0-beta.3 --dry-run`.
4. Si el dry-run y la revisión manual son correctos, ejecutar
   `pnpm release -- 1.2.0-beta.3 --yes`.
5. Verificar que GitHub marcó el release como pre-release y que publicó los assets.

El comando canónico actualiza versiones/changelog, ejecuta verify/audit/build, crea el
commit de release, sube `dev` y el tag, espera `release.yml` y valida assets. No ejecutar
estos pasos automáticamente desde este cierre.

## Corrective beta.4 — brief para Claude

1. Partir del tag/commit exacto publicado como beta.3; si beta.3 no se publica, partir
   de `v12/bt3` y mantener explícita esa diferencia.
2. Pedir al dev la lista concreta de errores y solicitudes mal implementadas. Convertir
   cada punto en caso esperado, reproducción y test de regresión antes del fix.
3. Revisar el diff completo BT3-001→009 contra D1-D20; no limitarse a reparar crashes.
4. Probar rutas reales que los source-guards no cubren: Obsidian, upgrade de settings,
   clean install y mobile real cuando corresponda.
5. Publicar `1.2.0-beta.4` sólo después de aceptación HITL explícita del dev, además de
   gates automatizados verdes.

## Fuera de alcance de este cierre

- Diagnóstico o corrección de las regresiones, porque aún falta el inventario concreto.
- Publicar beta.3, crear beta.4, push, tag, merge o PR.
- BT3-010 rainbow research, que continúa separado.
