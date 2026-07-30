---
title: 02 — pretext (text measurement) + render-tag (the html-in-canvas answer)
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]"
created: 2026-06-15T00:00:00
updated: 2026-06-15T00:00:00
created_by: opus-4-8
updated_by: opus-4-8
tags:
  - agent/research
  - explorer/virtualization
  - explorer/measurement
---

# 02 — pretext + render-tag

## pretext (`@chenglou/pretext` 0.0.6) — IN USE

**What/why.** Measures multiline text height + line count **without DOM reflow** — the expensive `getBoundingClientRect`/`offsetHeight` path is replaced by Canvas `measureText()` glyph widths + `Intl.Segmenter` segmentation + pure arithmetic. ~500–2000× faster than DOM measurement; fast enough to call thousands of times per frame. This is what lets variable-height rows virtualize without thrash.

**API we use** (verified in `serviceTextMeasure.ts`): `prepare(text, font, options)` (one-time, expensive:
normalize/segment/measure glyphs → opaque handle) + `layout(prepared, width, lineHeight)` → `{height, lineCount}` (cheap arithmetic, re-run on width change without re-preparing). Our wrapper adds a **3-tier cache**:
prepared (by text+style), layout (by prepared+width), rowHeight (by text+style+width+padding) and a `fallbackTextMeasureEngine` (char-width approximation) for environments lacking the engine.

**`flag` — extended API.** The research agent listed many more methods (`prepareWithSegments`, `layoutWithLines`, `walkLineRanges`, `prepareRichInline`, `measureNaturalWidth`, `clearCache`, `setLocale`). Our code uses only `prepare`/`layout`. Treat the extended surface as **unverified** until checked against the actual package before use.

**Maturity / risk.** v0.0.6 = pre-1.0 → breaking changes possible; pinned `^0.0.6`. Zero deps, MIT, ~15KB.
Needs `Intl.Segmenter` + Canvas 2D (both present in Obsidian/Electron). Misses some CSS (font-feature/variation-settings, optical sizing; `system-ui` alias unreliable — use explicit font names).

**Actionable gotcha (high value).** Cache keys include the resolved font string, but **Obsidian theme switches (light/dark, font change) change measurements without auto-invalidating the cache.** Fix: on theme/font change, emit an event → `textMeasureService.clear()` (or theme-aware cache key). Also clear after `document.fonts.load()` for custom fonts. Without this, rows can mis-measure after a theme switch.

## pretext × TanStack Virtual (the official pattern)

Flow (from tanstack.com/virtual/.../pretext): pretext supplies the **pre-paint height estimate** that `estimateSize` returns, so the first frame is close and the virtualizer's measured correction is small.
1. `prepare(text, font, style)` once per unique text+style → cache.
2. `layout(prepared, containerWidth, lineHeight)` on width change (cheap) → height.
3. Feed height into `estimateSize(index)`; call `virtualizer.measure()` when width/text changes.
Pitfalls: switching fonts without `clearCache` → glyph-width mismatch; one sizing method per row (don't mix pretext estimate + live `measureElement` on the same row unintentionally); empty strings → zero height (special-case).
Our `serviceNodeCardLayout.ts` already buckets card heights from `lineCount` and feeds the estimate callback.

## render-tag (Polotno `render-tag`, v0.1.15) — NOT installed

**This is the dev's "html-in-canvas" question answered.** render-tag renders styled **HTML+CSS directly onto HTML5 Canvas 2D** — no SVG, no `foreignObject` (10–60× faster than the foreignObject path), synchronous, zero-dep.
API: `render({html, width, ...}) → {canvas, height, lines}`, with `layout()`/`drawLayout()` split for reuse.
Supports text formatting, gradients, lists, flex, basic tables, RTL/CJK/emoji, `-webkit-line-clamp`. Requires fonts pre-loaded (`document.fonts.load()`). Does NOT support interactive elements/iframes/images.

**Relevance = N4 only.** render-tag is for RENDERING to canvas, not measuring. Vaultman's tree/list/table/grid cells must stay **DOM** (native parity: Obsidian's `tree-item`/`bases-tr` classes, theming, a11y, text selection, native context menus). Canvas throws all that away. render-tag becomes relevant ONLY if/when a **canvas/graph/ spatial engine** is built (pyramid N4: "Canvas/matrix engines") — e.g. rendering node labels on a graph/3D canvas.
At that point render-tag is a strong candidate for the on-canvas text/label layer. `flag`: re-confirm version/API at adoption time.

## Recommendation

- **Keep pretext.** Add theme/font-change cache invalidation (the one real gap). Watch for the 1.0 release.
- **render-tag = parked N4 candidate.** Do not add to deps now. Record it as the on-canvas-text option for the future canvas engine. The DOM cell (N.R) does not touch it.

## Citations

- https://tanstack.com/virtual/latest/docs/pretext — pretext × TanStack guide.
- github.com/chenglou/pretext, npmjs.com/package/@chenglou/pretext, pretext.cool — pretext API/perf.
- polotno.com/render-tag, github.com/polotno-project/render-tag — render-tag identity (`npm view render-tag version` → 0.1.15).
- In-repo: serviceTextMeasure.ts, serviceNodeRowMeasure.ts, serviceNodeCardLayout.ts, serviceNodeCardStyle.ts.
</content>
