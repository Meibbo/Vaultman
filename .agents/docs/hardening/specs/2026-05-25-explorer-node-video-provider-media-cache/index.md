---
title: Explorer Node Video Provider Media And Cache Settings
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/media
  - explorer/video
  - explorer/cache
  - explorer/settings
created_by: codex
updated_by: codex
---

# Explorer Node Video Provider Media And Cache Settings

Addendum spec for node-owned video media, social/provider URL thumbnail
resolution, and user-facing local cache management. This spec is intentionally
separate from the already handed-off media thumbnail spec so the planning agent
can consume this as a new constraint package.

This spec supersedes any earlier chat suggestion to support `vid` codeblocks.
Vaultman media is a node quality, not a Markdown block feature. The resolver may
inspect normal note links/embeds when configured, but it must not add support for
custom `vid` codeblocks or mutate Markdown to store thumbnail metadata.

## User Decisions Captured

- No support for `vid` codeblocks.
- Initial provider resolvers: YouTube, Facebook, Instagram, Twitter/X, Reddit,
  and generic URLs.
- Do not include Vimeo in the initial resolver set.
- Image and video share the same `media` NodeElement; one node has one active
  primary media item, either image or video.
- Cache settings must let users manage local storage, quality variants, rebuilds,
  and privacy/network behavior.

## Shards

1. [[docs/work/hardening/specs/2026-05-25-explorer-node-video-provider-media-cache/01-scope-and-source-model|Scope and source model]]
2. [[docs/work/hardening/specs/2026-05-25-explorer-node-video-provider-media-cache/02-provider-resolvers-and-iframe-policy|Provider resolvers and iframe policy]]
3. [[docs/work/hardening/specs/2026-05-25-explorer-node-video-provider-media-cache/03-cache-settings-and-storage-model|Cache settings and storage model]]
4. [[docs/work/hardening/specs/2026-05-25-explorer-node-video-provider-media-cache/04-notebook-navigator-evidence|Notebook Navigator evidence]]
5. [[docs/work/hardening/specs/2026-05-25-explorer-node-video-provider-media-cache/05-verification-and-rollout|Verification and rollout]]

## Relationship To Existing Specs

- Extends [[docs/work/hardening/specs/2026-05-25-explorer-node-media-cache/index|Explorer Node Media Index And Thumbnail Cache]]
  from image-first media into a media union that includes video posters and
  optional animated previews.
- Keeps [[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/index|V.D Tree Render Projection]]
  unchanged: views still receive descriptors and cache-ready media records, not
  decoded blobs, players, iframes, or source bytes.
- Settings/cache lessons are based on Notebook Navigator's local source tree at
  `C:\Users\vic_A\Desktop\notebook-navigator`.

