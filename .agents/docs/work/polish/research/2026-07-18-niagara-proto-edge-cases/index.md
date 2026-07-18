---
title: BT4-017 — Niagara proto edge cases (research)
type: research
status: complete
parent: "[[docs/work/polish/index|polish]]"
created: 2026-07-18T00:00:00
created_by: claude-fable-5
tags: [agent/research, initiative/polish]
---

# BT4-017 — Niagara: proto vs actual (deformación gaussiana)

Canon proto: `Downloads/vaultman/proto-v12/explorer.jsx` `NiagaraIndex` (L54-285).
Actual: `logicNiagaraTrack.ts` + `floatingToc.svelte` + styles.css 6215-6600.

## Inventario proto (23 edge cases, constantes load-bearing)

σ=`min(7,max(3,N*0.28))` (:211) · gauss `exp(-d²/2σ²)` (:212) · scale `1+0.5g`
(:214) · perp `dir·perp·g` (:215) · spread `7·tanh(d/1.5)·g` firmado (:218) · dir
por posición (:213) · mapping ejes (:219-222) · **clamp perp
`p=min(raw,max(40,frame-54))`** (:141-143) · **overshoot `over=raw-cap`→perpOver**
(:146-148, gated a `.vm-monitor-screen`) · **rail-follow monotónico HWM con room
`frameEnd-8`** (:153-170) · composición trackShift (:237-239) · engage 150ms/6px
(:186,:192) · nearest-center (:110-123) · jump continuo + haptic (:174-175) · glow
(:150-152) · reset release (:197) · touch non-passive (:201-202) · sin transition
en scrub (:265) · reveal R {1.1,2.2,3.6,7} (:81) · label modes (:231-236) · letter
stack (:248-258) · dedupe acrónimo ≤2 chars (:268-270) · nodeSize focused
`max(9,round(nodeSize*0.32))` (:244,:983).

## Cobertura actual

Cubiertos: σ/gauss/scale/perp/spread/dir/ejes/clamp-perp/composición/engage/
nearest/glow/reset/reveal/labels/letters (refs en tabla del agente, ver abajo).
**Gaps reales:**

1. **perpOver SIN TOPE** (`floatingToc.svelte:302-304`): el proto lo acotaba de
   facto por el gate `.vm-monitor-screen`; nosotros lo aplicamos incondicional →
   arrastrar lejos SACA el rail del frame. Fix: cap `railFarEdge + dir·perpOver ≤
   frameEnd − inset` (espejo del room del eje along, proto :164-166).
2. **Falta room-cap del eje along** en `updateTrackShift`
   (`floatingToc.svelte:232-280`): no acota el shift al espacio restante del frame
   (proto: `room = frameEnd−8 − lastN`; `want=min(along−lastN, room)`).
3. **HWM monotónico vs hysteresis bidireccional**: proto = high-water-mark (solo
   crece; vuelve solo al soltar). Actual = hysteresis reversible **INTENCIONAL**
   (FTC-009 `58193e14`, guard `not.toContain('shiftHWM')`). ⚠ DECISIÓN DEV
   pendiente: cuál es canon.
4. Menores: nodeSize focused ausente · dedupe acrónimo simplificado · transition
   springy por nodo (proto = sin transition, sigue el dedo 1:1) — cosmético.

## Plan BT4-017 (mínimo = 1+2)

1. Cap perpOver — helper puro en `logicNiagaraTrack.ts` + unit (S, 1-2h).
2. Room-cap along en `updateTrackShift` (S, 1-2h; misma medición far-edge).
3. HWM vs hysteresis — SOLO tras decisión dev (M; choca con tests FTC-009).
4/5. nodeSize + transition — opcionales, juicio visual dev.

Constantes a preservar: 54 (headroom widen) · 40 (floor min-width) · 8 (inset
frame) · σ · spread 7,knee 1.5 · scale 0.5 · reveal R · engage (ahora 450/8 por
D25, supersede el 150/6 del proto).

Nota BT4-005 (`62429f1a`): tap ya no deforma/slide — `activeIdx` y
`updateTrackShift` gated a `engaged`; thresholds 450ms/8px.

## Addendum 2026-07-18 — canon v13 (supersede parcial de este doc)

Research v13 (`proto-v13/explorer.jsx` — el HTML v13 NO es self-contained, carga
la carpeta hermana): **único delta rail v12→v13 = pared bidireccional del eje
along** (`firstN` + roomUp con HWM negativo, L161/169-173). El plugin YA contiene
el eje along vía `niagaraClampToFrame` (reversible por decisión D42-retirada).
La pared perpendicular NO existe en ningún proto (el monitor de demo la acotaba);
se derivó del idiom room de v13 (`want=max(0,min(raw,room))`, inset 8px) →
`niagaraClampOverdrive` + `perpRoom` en `4cf7937c`. El doble-clamp del eje along
del fix revertido (`247b4b1d`) era el culpable de romper el slide libre. Los
demás "edge cases sospechados" NO existen en v13 (diff completo limpio).
