---
title: Verification And Rollout
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

# Verification And Rollout

## Rollout Slices

### Slice 1: Local Source Index

Build source descriptor resolution for:

- image-file nodes;
- cover property wikilinks/paths;
- first document image behind a setting.

No remote fetches. No animated thumbnails. Persist records if storage is ready;
otherwise use memory store and keep the interface stable.

### Slice 2: Local Thumbnail Generation

Build thumbnail generation for:

- PNG/JPEG/WebP;
- static GIF first frame;
- local SVG rasterization if safe.

Attach descriptors to projections and hydrate visible blobs only.

### Slice 3: Remote Direct Images

Add opt-in remote direct image fetching with domain policy, size caps, timeout,
TTL, and cache fingerprints.

### Slice 4: Remote Page Extraction

Add opt-in page extraction through OpenGraph/Twitter metadata and safe image
candidate filtering.

### Slice 5: Animated Thumbnails

Add animated GIF thumbnails as an explicit opt-in. Keep static first frame as
default.

## Unit Tests

Required areas:

- source precedence resolution;
- cover property parsing;
- wikilink/path/URL normalization;
- first markdown image extraction;
- media target key generation;
- settings fingerprint invalidation;
- stale record handling;
- LRU budget behavior;
- remote URL policy rejection;
- SVG safety mode selection.

## Component Tests

Required areas:

- media NodeElement hidden when mask disables media;
- media slot reserves dimensions before blob loads;
- row text renders when thumbnail is missing/stale/error;
- visible-only hydration uses virtual visible ids;
- failed media renders fallback, not broken browser image UI.

## Performance Tests

Required checks:

- enabling media descriptors does not increase Tree projection p99 beyond the
  V.D baseline by more than an agreed threshold;
- scrolling a large image-heavy folder does not synchronously decode full-size
  images;
- thumbnail queue yields while scrolling;
- cache hit path is bounded and does not touch full source files.

## Live Smoke

Create a test vault subset with:

- local PNG/JPEG image nodes;
- local GIF image node;
- local SVG image node;
- note with `cover: [[image.png]]`;
- note with first embedded image;
- note with invalid cover;
- note with remote direct image URL;
- note with remote page URL.

Run with remote disabled and remote enabled separately. Capture:

- row paint behavior;
- thumbnail cache record count;
- blob cache size;
- dev errors;
- scroll blank/delay metrics for Tree/List/Cards.

## Acceptance

The subsystem is accepted when:

- all local source kinds resolve through one descriptor model;
- thumbnails are generated at configured low resolution;
- full-size media is not decoded during render or scroll;
- media visibility is controlled by NodeElement settings;
- remote sources are opt-in and policy-gated;
- cache invalidation responds to source/settings changes;
- large-vault scroll performance remains within the V.D budget.

