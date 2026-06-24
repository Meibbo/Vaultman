---
title: Verification And Rollout
type: spec-shard
status: draft
parent: "[[index|Explorer Node Video Provider Media And Cache Settings]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/media
  - explorer/video
  - explorer/testing
---

# Verification And Rollout

## Rollout Slices

### Slice 1: Local Video Poster

- Add video source descriptors for local video file nodes and property values.
- Generate static poster only.
- No providers, no animated preview, no iframe.

### Slice 2: Cache Settings UI

- Add display size vs generated pixel size settings.
- Add cache stats, rebuild, clear, and prune controls.
- Ensure quality/size changes create new variant keys and schedule background
  regeneration.

### Slice 3: YouTube Provider

- Parse YouTube URL variants into one canonical video id.
- Resolve configured poster quality candidates.
- Cache provider poster as a local blob.
- No iframe in rows.

### Slice 4: Social Providers And Generic URLs

- Add Facebook, Instagram, Twitter/X, Reddit URL recognizers.
- Add generic OpenGraph/Twitter metadata resolver.
- Fail closed when provider metadata is inaccessible.

### Slice 5: Animated Previews

- Add hover/selected animated preview generation.
- Enforce frame count, duration, byte size, and visible-range activation.

## Required Tests

- `vid` codeblocks are ignored.
- Configured node property resolves local image and local video paths.
- First document media resolves standard links/embeds but ignores custom
  codeblocks.
- Only one primary media is active per node.
- YouTube URL variants converge to the same source key.
- Provider fetches are skipped when provider remote fetching is disabled.
- Social providers fail as `provider-unresolved`, not as render errors.
- Changing generated pixel size produces a new variant key.
- Old variant can continue rendering until a new variant is ready.
- Clear cache removes blob records and memory LRU entries.
- Rebuild cache stops active queue work before clearing stores.
- Tree/list/card rows never mount iframes.

## Performance Acceptance

- Row render must not fetch remote URLs.
- Row render must not decode source media.
- Visible-range hydration must be bounded by virtualizer overscan.
- Provider/generic page resolution runs only in queue/background work.
- Animated previews activate only for hover/selected/focused policy, never for
  every visible row by default.

## Manual QA Dataset

Create a fixture vault with:

- local image file node;
- local video file node;
- note with `media: [[clip.mp4]]`;
- note with `cover: [[image.png]]`;
- note with first standard video embed;
- note containing a `vid` codeblock that must be ignored;
- YouTube, Facebook, Instagram, Twitter/X, Reddit, and generic page URLs;
- remote fetching disabled and enabled runs;
- low/medium/high generated pixel size runs.

