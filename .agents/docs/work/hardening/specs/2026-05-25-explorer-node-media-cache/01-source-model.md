---
title: Source Model And Precedence
type: spec-shard
status: draft
parent: "[[index|Explorer Node Media Index And Thumbnail Cache]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/media
  - explorer/node-elements
---

# Source Model And Precedence

## Media Source Kinds

The media index must normalize all supported image origins into one descriptor contract.

### 1. Image File Node

A node whose backing file is itself an image should use that file as its media source.

Supported initial extensions:

- `.png`
- `.jpg`
- `.jpeg`
- `.webp`
- `.gif`
- `.svg`
- `.avif`

Deferred extensions:

- `.bmp`
- `.tiff`
- `.heic`

Deferred types require explicit decoder support before inclusion.

### 2. Node-Note Property

A markdown-backed node can specify a cover image through configurable property names. Default order:

1. `cover`
2. `image`
3. `thumbnail`
4. `banner`

Supported property values:

- Obsidian wikilink: `[[imagen.png]]`
- Obsidian embed value: `![[imagen.png]]`
- vault-relative path: `Assets/imagen.png`
- note-relative path: `../assets/imagen.png`
- direct image URL: `https://example.com/image.png`
- page URL that contains the image, resolved by a remote page resolver.

### 3. First Document Image

If configured, the index can scan the markdown body and use the first resolvable image reference:

- `![[imagen.png]]`
- `![[imagen.png|300]]`
- `![alt](imagen.png)`
- `![alt](https://example.com/image.png)`
- simple HTML `<img src="...">` if the parser can extract it safely.

This source is lower priority than explicit properties because it is an inference, not author intent.

### 4. Remote Direct Image URL

A URL is direct-image if either:

- the extension strongly identifies an image file; or
- a HEAD/GET request returns an image `Content-Type`.

Direct URL thumbnails are cached by URL plus remote fingerprint when available:

- `ETag`;
- `Last-Modified`;
- response byte hash;
- configured TTL.

### 5. Remote Page Image URL

A URL can point to a page that contains the image. Resolution order:

1. OpenGraph `og:image`.
2. Twitter card image metadata.
3. first safe `<img>` candidate that passes size/type filters.

Remote page extraction must be opt-in and must obey the network policy in [[04-settings-security-and-privacy]].

## Source Precedence

Default source order:

1. explicit property image;
2. image file node;
3. first document image;
4. inherited/fallback provider image if a future provider supplies one;
5. no media.

The user can configure whether image-file nodes outrank explicit properties.
Default keeps explicit properties first so a note can override its cover.

## Descriptor Contract

Each resolved source should become a descriptor:

```ts
export type NodeMediaSourceKind =
  | 'image-file-node'
  | 'node-note-property'
  | 'document-first-image'
  | 'remote-direct-image'
  | 'remote-page-image';

export interface NodeMediaSourceDescriptor {
  nodeId: string;
  sourceKind: NodeMediaSourceKind;
  sourceUri: string;
  sourceVaultPath?: string;
  sourceProperty?: string;
  sourceNotePath?: string;
  remotePageUrl?: string;
  mimeType?: string;
  animated?: boolean;
  fingerprint?: string;
}
```

This descriptor is not the thumbnail. It is the stable explanation of where the thumbnail should come from.

## Failure Semantics

Failures must be indexed explicitly:

- source not found;
- unsupported format;
- remote disabled;
- remote denied by domain policy;
- fetch timeout;
- too large;
- decode failed;
- SVG rejected by safety policy.

Rows render without media when failures occur. Failure state must not block row text, selection, or scrolling.

