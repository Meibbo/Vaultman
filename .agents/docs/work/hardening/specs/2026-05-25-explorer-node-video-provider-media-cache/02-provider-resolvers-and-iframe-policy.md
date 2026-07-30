---
title: Provider Resolvers And Iframe Policy
type: spec-shard
status: draft
parent: "[[index|Explorer Node Video Provider Media And Cache Settings]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/media
  - explorer/video
  - explorer/privacy
---

# Provider Resolvers And Iframe Policy

## Resolver Contract

Provider resolvers normalize known public URLs into thumbnail and playback metadata. They do not create DOM nodes.

```ts
export interface NodeMediaProviderResolver {
  id: NodeMediaProviderId;
  canResolve(url: URL): boolean;
  resolve(params: ProviderResolveParams): Promise<ProviderMediaResolution>;
}

export interface ProviderMediaResolution {
  provider: NodeMediaProviderId;
  canonicalUrl: string;
  providerItemId?: string;
  title?: string;
  author?: string;
  posterCandidates: ProviderPosterCandidate[];
  playback?: NodeVideoPlaybackDescriptor;
  failure?: ProviderResolutionFailure;
}

export interface ProviderPosterCandidate {
  url: string;
  width?: number;
  height?: number;
  qualityLabel?: string;
  mimeType?: string;
}
```

## Initial Provider Set

### YouTube

YouTube gets a first-class resolver because thumbnail URLs can be derived from the video id without iframe creation.

Quality policy should be configurable. Candidate order can include:

- `maxresdefault.jpg`
- `hqdefault.jpg`
- `mqdefault.jpg`
- `default.jpg`

The cache key must be based on the video id plus thumbnail quality variant, not on the original URL shape. `youtu.be`, `/watch?v=`, `/embed/`, and `/shorts/` URLs for the same id should converge.

### Facebook, Instagram, Twitter/X, Reddit

These providers get first-class URL recognizers, but resolution must be fail-closed:

- use public metadata only;
- prefer OpenGraph/Twitter card metadata when available;
- do not require login cookies;
- do not execute page JavaScript;
- do not scrape private/authenticated content;
- treat rate limits, consent walls, unavailable metadata, and blocked responses as `provider-unresolved`, not as UI failures.

The first implementation may resolve only posters and titles. Playback can remain external-open or provider-iframe-on-demand.

### Generic URLs

Generic URL resolver order:

1. Direct media URL by extension or response `Content-Type`.
2. OpenGraph image/video metadata.
3. Twitter card image/player metadata.
4. `<video poster>` when safe page parsing is enabled.
5. First safe `<img>` only as a last resort.

Generic page extraction must stay opt-in and network-policy gated.

## Iframe Policy

Explorer rows must not mount iframes.

Forbidden in tree/list/card row render:

- provider iframe;
- native embedded webview;
- full player component;
- autoplay preview loaded from provider page.

Allowed on explicit user action:

- open in Obsidian/external browser;
- mount provider iframe in a focused preview panel/popover;
- mount native Obsidian media player for local/direct video files;
- mount a direct `<video controls>` element in a detail surface if Obsidian's native player path is unavailable.

## Playback Descriptor

```ts
export type NodeVideoPlaybackDescriptor =
  | { mode: 'native-obsidian'; vaultPath: string }
  | { mode: 'direct-video-url'; url: string }
  | { mode: 'provider-iframe'; provider: NodeMediaProviderId; embedUrl: string }
  | { mode: 'external-open'; url: string };
```

Rows consume only poster/preview descriptors. Playback descriptors are inert metadata until the user asks to play.

