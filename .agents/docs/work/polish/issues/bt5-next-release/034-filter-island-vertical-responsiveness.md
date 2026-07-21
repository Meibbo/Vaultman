---
title: BT5-034 — El island de filtros no se ajusta a la altura del frame
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-20T22:05:00
updated: 2026-07-21T08:00:00
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

## Outcome 2026-07-21

**Commit `2bdea929`.** Los islands de active-filters y queue capaban su alto en
60vh/70vh de la **ventana**; en un split vertical corto la ventana es alta pero el
frame es bajo, así que rebasaban el borde. El frame publica su alto medido como
`--vaultman-frame-height` desde el ResizeObserver existente; ambos islands clampan su
max-height a ese alto (menos el offset de la bottom-bar), con viewport como fallback.
La lista interna conserva su scroll → toda entrada alcanzable. **Smoke en split
pequeño pendiente** (verificado por gate, no por observación). Detalle:
[[docs/work/polish/plans/2026-07-19-bt5-next-10/11-post-beta6-bubbledot-island-iconscope-folder-totals|shard 11]].

## Blocked by

None — done (smoke visual pendiente del dev).
