---
title: Cache Settings And Storage Model
type: spec-shard
status: draft
parent: "[[index|Explorer Node Video Provider Media And Cache Settings]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/media
  - explorer/cache
  - explorer/settings
---

# Cache Settings And Storage Model

## Required Settings Sections

### Media Sources

- Enable media NodeElement.
- Ordered media property names.
- Use physical image/video file nodes.
- Use first document media.
- Enable remote direct URLs.
- Enable generic page extraction.
- Enable providers: YouTube, Facebook, Instagram, Twitter/X, Reddit.
- Domain allow/block list.

### Thumbnail Display And Generation

Follow Notebook Navigator's split between visual size and generated pixel size:

- display size: small/medium/large, e.g. `64`, `96`, `128` CSS px;
- generated poster size: e.g. `256x144`, `384x216`, `512x288`;
- output format: `webp`, `jpeg`, `png`, `source-safe`;
- quality profile: compact/balanced/high or numeric quality;
- force square/crop mode;
- image animated mode: off/static/animated for GIF-like image sources;
- video preview mode: off/static poster/hover animated/selected animated;
- animated preview frame count, max duration, max output bytes.

### Local Cache Management

- Show cache statistics: records, blobs, images, videos, provider posters, animated previews, total estimated size.
- Rebuild media cache button.
- Clear media cache button.
- Prune stale variants button.
- Regenerate missing posters button.
- Optional byte budget for persistent cache.
- Optional entry budget for memory LRU.
- Remote TTL and provider metadata TTL.

### Privacy And Network

- Remote fetching disabled by default.
- Provider fetching disabled by default unless the user explicitly enables it.
- Separate toggle for generic page extraction.
- Max remote response bytes.
- Request timeout and redirect limit.
- Warning text that provider/generic thumbnail resolution contacts third-party servers.

## Storage Model

Use two persistent stores plus memory LRU, following Notebook Navigator's shape.

### Media Record Store

Stores source and processing state, not blobs:

```ts
export interface NodeMediaCacheRecord {
  targetKey: string;
  nodeId?: string;
  vaultPath?: string;
  primaryKind: 'image' | 'video';
  source: NodeMediaSourceDescriptor;
  sourceFingerprint: string;
  settingsFingerprint: string;
  status: 'unprocessed' | 'none' | 'has' | 'error';
  posterVariantKey?: string;
  animatedPreviewVariantKey?: string;
  dimensions?: { width: number; height: number };
  generatedAt?: number;
  errorReason?: string;
}
```

### Media Blob Store

Stores variant blobs keyed by generated variant:

```ts
export interface NodeMediaBlobRecord {
  variantKey: string;
  sourceKey: string;
  mediaKind: 'image' | 'video';
  artifactKind: 'poster' | 'animated-preview';
  mimeType: string;
  width: number;
  height: number;
  byteLength: number;
  blob: Blob;
}
```

Variant keys must include source identity and generation settings:

```text
sourceKey |
artifact=poster |
size=256x144 |
format=webp |
quality=0.75 |
providerQuality=maxres
```

Changing thumbnail quality or size should produce a new variant key. Old variants may remain usable until pruned, allowing the UI to keep rendering while the background queue regenerates higher/lower quality assets.

## Sync Boundary

Cache blobs and local cache statistics are device-local and must not sync.

Potentially syncable settings:

- media element enabled;
- property names;
- provider enablement;
- display size preference.

Device-local settings:

- persistent cache byte budget;
- memory LRU entry budget;
- whether to download remote/provider thumbnails on this device;
- cache TTL overrides if the user wants privacy/performance differences per device.

