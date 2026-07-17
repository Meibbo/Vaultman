---
title: FTC-009 Spec — Niagara track composition, placement, and option deferral
type: spec-shard
status: approved
parent: "[[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/index|beta.1 corrective batch]]"
created: 2026-07-15T00:00:00
created_by: codex-gpt-5
tags: [agent/spec, niagara, floating-toc, release/1.2.0-beta.1]
---

# FTC-009 — Niagara track composition, placement, and option deferral

## Verified prototype comparison

The Gaussian kernel in `floatingToc.svelte` is a literal port of proto-v12
`explorer.jsx` lines 83-285:

```ts
const sigma = Math.min(7, Math.max(3, N * 0.28));
const gauss = (d) => Math.exp(-(d * d) / (2 * sigma * sigma));
const scaleFor = (i) => activeIdx < 0 ? 1 : 1 + 0.5 * gauss(Math.abs(i - activeIdx));
const offsetFor = (i) => activeIdx < 0 ? 0 : dir * perp * gauss(Math.abs(i - activeIdx));
```

The perceived loss of the bell is not a different Gaussian formula. The product port
split action nodes from `.vaultman-floating-toc-glyphs`; `Nodes join scrub` applies
only `scale()` to those external nodes, while indexed nodes receive offset, spread,
scale, track shift, and pointer hit-testing. Horizontal positions also lost the proto's
centering and top/bottom transform origins.

## Track entry model

Keep semantic action and group data distinct:

```ts
type FloatingTocActionId = 'close' | 'toggle-kind' | 'drill' | 'back';

type FloatingTocTrackEntry =
	| { kind: 'action'; id: FloatingTocActionId }
	| { kind: 'group'; id: string; groupIndex: number };
```

Available actions always have the order `close`, `toggle-kind`, `drill`, `back`.
Unavailable conditional actions are omitted without changing the relative order.
Close is therefore literal first under every state.

When `floatingTocNiagaraNodes=false`, actions remain a separate widget before the
indexed-group track. When true, actions render inside the same geometry track before
the groups. Every joined entry participates in pointer-center lookup, Gaussian offset,
spread, scale, transform origin, and signed track shift.

Action entries remain click-only behaviors. A scrub may make an action entry active
for wave geometry, but movement never invokes close/toggle/drill/back. Group entries
alone route `reveal-node`. Quick action taps still invoke the action once.

Rename the user-facing option:

- English: `Join action nodes to slide`.
- Spanish: `Unir acciones al deslizamiento`.

The stored `floatingTocNiagaraNodes` key remains unchanged.

## Bidirectional slide

Remove the monotonic positive `shiftHWM`. It explicitly prevents reverse movement
during a gesture and only follows the pointer beyond the final node.

For every pointer move, derive signed along-axis shift from the first and last track
entry centers:

- Pointer before the first center: negative shift, clamped to the frame start.
- Pointer after the last center: positive shift, clamped to the frame end.
- Pointer inside the track span: shift returns toward zero and normal nearest-entry
  scrubbing resumes.
- Pointer direction may reverse any number of times during the same gesture.
- Release animates the track back to zero.

The perpendicular pull remains clamped to the frame and continues to control Gaussian
amplitude. Numerical kernel constants and `tanh` neighbor spread remain the proto-v12
values; tests freeze representative distances so future changes cannot silently
reshape the bell.

## Position contract

Vertical right/left positions keep the current explorer-height strip. Horizontal
top/bottom wrappers span the available frame width and center the rail with
`justify-content:center`.

Bottom means the bottom edge of the available explorer frame: immediately above the
visible dock when the dock is on, or the frame inset when the dock is off. It must not
fall back to the wrapper's left X origin. Top and bottom use the proto transform origins
`center top` and `center bottom` respectively.

## Plain rail contract

Non-plain style gives both action entries and indexed entries the normal compact cell
background. Plain style removes the background/box treatment from both entry kinds.
The option must never affect only toggle/drill while leaving indexed entries unchanged.

## Deferred UI/UX

Remove the following five Settings rows and disable their effective runtime output in
beta.1, even if old persisted values are true:

- Name Pill (`tocNamePill`).
- Scrub Glow (`tocGlow`).
- Name Cell (`tocLabelMode`).
- Name Reveal Range (`tocReveal`).
- Name Letters (`tocNameOrder`).

The implementation code and stored fields may remain for patch work, but effective
beta.1 options force `namePill=false`, `glow=false`, and `labelMode='off'`; reveal and
name-order values are therefore dormant.

Name Pill is not an independent Niagara capability. In proto-v12 it only adds padding,
background, shadow, and backdrop blur to a Name Cell that another option has already
made visible. With Name Cell absent, Name Pill has no rendered target and correctly
appears to do nothing.

Visible Floating TOC settings after deferral are: enable, Niagara slide, plain rail
style, rail position, glyph mode, Soft scroll, and Join action nodes to slide.

## Acceptance tests

- Entry ordering tests cover every conditional-action combination and always place
  close first.
- Joined mode uses one ordered track and applies the same complete transform function
  to action and group entries.
- Scrubbing across an action never invokes its callback.
- Signed shift tests cover before-first, inside-span, after-last, reversal, and clamps.
- Numeric wave fixtures cover active, immediate neighbor, sigma-distance, and far node.
- CSS/source tests cover centered top/bottom, proper transform origins, and plain style
  selectors for both entry kinds.
- Settings/source tests prove all five deferred rows are absent and persisted values
  cannot enable their runtime effects.
