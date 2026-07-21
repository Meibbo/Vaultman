---
title: BT5-034 — El island de filtros no se ajusta a la altura del frame
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-20T22:05:00
updated: 2026-07-20T22:05:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags: [agent/issue, triage/needs-triage, initiative/polish, release/bt5, filters]
---

# BT5-034 — El island/overlay de la escena de filtros no se ajusta a la altura del frame

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]]. Reportado
por el dev el 2026-07-20.

## Reported behavior

El overlay modal de la escena de filtros (`filterScene`) no se ajusta a la altura
del frame. Al colocar Vaultman en un split pequeño (poca altura vertical), las
entradas del island quedan ocultas y no son alcanzables.

## Diagnóstico preliminar del dev

La escena de filtros **ya tiene un scroll por overflow**; lo que faltaría es la
**responsividad del island al tamaño vertical del frame** — que su alto máximo se
derive de la altura disponible del frame en vez de un valor fijo/contenido, para
que el scroll interno entre en juego cuando el frame es bajo.

## Acceptance criteria

- [ ] El island de filtros nunca excede la altura del frame; su contenido entra
      en su scroll interno cuando no cabe.
- [ ] En un split vertical pequeño todas las entradas del island son alcanzables
      por scroll; ninguna queda recortada fuera del viewport.
- [ ] Redimensionar el frame (o el split) recalcula el alto sin resize loop.
- [ ] La primera y última entrada siguen accesibles; el header/acciones del
      island no se solapan con el contenido scrollable.
- [ ] Tests/guards cubren el cálculo de alto responsivo y el clamp al frame.

## Notes

Verificar primero si el scroll por overflow ya existe (probable) y limitar el fix
a la responsividad del alto máximo del island respecto al frame. Requiere smoke en
un split pequeño para validar.

## Blocked by

None — can start immediately.
