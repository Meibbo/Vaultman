---
title: Thumbnail Generation
type: spec-shard
status: draft
parent: "[[index|Explorer Node Media Index And Thumbnail Cache]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/media
  - explorer/performance
---

# Thumbnail Generation

## Generation Invariant

Explorer must never decode full-size media while computing row layout or
handling a scroll event. Thumbnail generation is queue work.

## Thumbnail Settings

Configurable settings:

- maximum thumbnail width;
- maximum thumbnail height;
- output format: `webp`, `jpeg`, or `png`;
- quality from `0.1` to `1.0`;
- device-pixel-ratio multiplier cap;
- animated GIF thumbnails: off/static/animated;
- maximum animated thumbnail bytes;
- maximum animated duration/frames;
- SVG handling mode: rasterize/safe-inline/off;
- remote image enablement and page extraction enablement.

Default recommendation:

- max `256 x 256`;
- format `webp` if supported, otherwise `jpeg` for raster images and `png` for
  transparency-sensitive sources;
- quality `0.72`;
- GIF static first frame;
- remote images disabled until user opts in.

## Static Raster Images

Pipeline:

1. Read source bytes from vault or remote cache.
2. Decode off the immediate render path.
3. Downscale to configured dimensions.
4. Encode to configured thumbnail format.
5. Write record and blob through `ExplorerMediaCacheService`.
6. Notify subscribers for visible targets.

Implementation can use browser APIs such as `createImageBitmap` and canvas where
available. If worker/off-main-thread support is available, prefer it for decode
and resize.

## GIF And Animated Sources

Modes:

- `static`: generate a still first-frame thumbnail.
- `animated`: cache a reduced animated thumbnail.
- `off`: show generic image icon only.

Default is `static`. Animated mode can be expensive and must enforce:

- max source bytes;
- max output bytes;
- max dimensions;
- max frame count or duration;
- cancellation when row leaves visible range.

Animated thumbnails should not start playback for offscreen rows.

## SVG

Physical SVG files inside the vault are common image nodes. Remote SVGs can be
unsafe. Rules:

- local SVG can be rasterized to a bitmap thumbnail;
- remote SVG must be sanitized or rasterized in an isolated path;
- never inject remote SVG markup directly into Explorer DOM;
- cache a raster thumbnail by default;
- preserve source dimensions if discoverable.

## Remote Images

Remote direct images:

- prefer HEAD to validate type/size when possible;
- cap response bytes;
- enforce timeout;
- cache by URL and fingerprint;
- use TTL when no remote validators exist.

Remote page images:

- fetch page only when remote page extraction is enabled;
- parse only metadata needed for image discovery;
- resolve relative `og:image`/`img src` against page URL;
- then process the selected image as a remote direct image.

## Layout Reservation

Every media descriptor with dimensions should reserve aspect-ratio space before
the blob is loaded. If dimensions are unknown, use the configured thumbnail box
ratio.

Tree/List rows should remain fixed-height unless a future view explicitly
supports variable media rows. Cards/Grid may use reserved media boxes but still
must not depend on decode completion for row measurement.

## Error Thumbnail

Do not render broken image icons from browser default behavior. For failed
media, render one of:

- generic image icon;
- file-type icon;
- hidden media slot if the view mask disables media;
- warning badge only if the failure is actionable and the view enables warning
  badges.

