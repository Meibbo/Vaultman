---
title: Settings Security And Privacy
type: spec-shard
status: draft
parent: "[[index|Explorer Node Media Index And Thumbnail Cache]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/media
  - explorer/security
  - explorer/settings
---

# Settings Security And Privacy

## User-Facing Settings

Media source settings:

- enable media NodeElement;
- cover property names, ordered list;
- use image-file node as media;
- use first document image;
- enable remote direct images;
- enable remote page image extraction;
- source precedence order.

Thumbnail settings:

- thumbnail quality;
- maximum thumbnail dimensions;
- output format;
- cache size budget;
- cache TTL for remote images;
- animated GIF mode;
- regenerate thumbnails button;
- clear thumbnail cache button.

Network settings:

- remote fetch disabled/enabled;
- allowed domains;
- blocked domains;
- maximum remote bytes;
- timeout;
- whether to follow redirects;
- whether page extraction is allowed.

## Defaults

Safe defaults:

- media NodeElement off unless the current preset enables it;
- local image-file thumbnails enabled when media is enabled;
- cover property enabled;
- first document image disabled or conservative;
- remote direct images disabled;
- remote page extraction disabled;
- animated GIF mode `static`;
- small cache budget.

## Privacy Rules

Remote fetches can reveal vault content through URLs in notes. Therefore:

- remote fetching must be opt-in;
- page extraction must be a separate opt-in;
- settings UI must state that remote image fetching contacts third-party
  servers;
- remote cache records must not store note content beyond the resolved URL and
  source metadata required for invalidation.

## Network Safety Rules

Remote URL resolver must reject or require explicit override for:

- private IP ranges;
- localhost;
- file URLs;
- non-http protocols;
- very large responses;
- content types outside image/html for resolver stages;
- redirect chains beyond configured limit.

## SVG Safety Rules

Remote SVG is treated as active content unless sanitized or rasterized.

Rules:

- do not inject remote SVG markup into the DOM;
- do not execute scripts from SVG;
- prefer raster thumbnail output;
- local SVG may still be rasterized rather than inlined for consistency.

## Cache Storage Rules

Persistent cache should be scoped to this plugin and vault.

Records should include:

- version of thumbnail algorithm;
- settings fingerprint;
- source fingerprint;
- generated timestamp.

When cache schema changes, old records should be ignored or migrated lazily. Do
not perform a blocking full-cache migration on plugin load.

