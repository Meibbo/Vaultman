---
title: Scope And Source Model
type: spec-shard
status: draft
parent: "[[index|Explorer Node Video Provider Media And Cache Settings]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/media
  - explorer/video
  - explorer/node-elements
---

# Scope And Source Model

## Hard Boundary

Do not support `vid` codeblocks. The feature belongs to node media resolution,
not Markdown syntax extension.

Allowed note scanning:

- standard Obsidian wikilink/embed media references;
- standard Markdown image/video links where the parser already supports them;
- configured frontmatter/properties;
- configured first image/video discovery.

Forbidden note scanning:

- custom `vid` fenced codeblocks;
- writing thumbnail metadata back into the note;
- creating synthetic Markdown blocks to drive node media.

## Unified Media Slot

The existing `media` NodeElement becomes a discriminated union:

```ts
export type NodeMediaPrimary =
  | NodeImageMediaPrimary
  | NodeVideoMediaPrimary;

export interface NodeImageMediaPrimary {
  kind: 'image';
  source: NodeMediaSourceDescriptor;
  posterKey: string;
}

export interface NodeVideoMediaPrimary {
  kind: 'video';
  source: NodeMediaSourceDescriptor;
  posterKey: string;
  animatedPreviewKey?: string;
  durationMs?: number;
  provider?: NodeMediaProviderId;
  playback?: NodeVideoPlaybackDescriptor;
}
```

Only one `NodeMediaPrimary` is active per node. A list/tree can still mix rows:
one node may render an image in the media slot and another may render a video
poster in the same slot.

## Source Kinds

```ts
export type NodeMediaSourceKind =
  | 'node-file-local-image'
  | 'node-file-local-video'
  | 'node-note-property'
  | 'document-first-media'
  | 'direct-url-image'
  | 'direct-url-video'
  | 'provider-url-video'
  | 'generic-page-url';

export type NodeMediaProviderId =
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'twitter-x'
  | 'reddit'
  | 'generic';
```

## Property Sources

The user configures an ordered property list. Recommended initial defaults:

1. `media`
2. `cover`
3. `thumbnail`
4. `video`
5. `image`
6. `banner`

Accepted property values:

- `[[asset.png]]` or `![[asset.png]]`
- `[[clip.mp4]]` or `![[clip.mp4]]`
- vault-relative or note-relative local paths;
- direct image/video URLs;
- provider URLs such as YouTube, Instagram, Twitter/X, Facebook, Reddit;
- generic page URLs that may expose OpenGraph/Twitter metadata.

## First Document Media

When enabled, the resolver can scan the body for first resolvable media:

- local image embed;
- local video embed;
- Markdown image link;
- direct remote image/video URL;
- provider URL if it appears as a normal link/embed and provider resolution is
  enabled.

This source is lower priority than explicit properties because it is inferred.
It must not parse custom `vid` codeblocks.

## Default Precedence

1. Explicit node-note property media.
2. Physical media file node.
3. First document media, if enabled.
4. Provider/generic metadata fallback for a property or document URL.
5. No media.

Direct URL and provider URL are source forms inside property/body discovery, not
separate visual elements.

