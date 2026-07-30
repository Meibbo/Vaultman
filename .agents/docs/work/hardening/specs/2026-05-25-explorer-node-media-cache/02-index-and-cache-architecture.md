---
title: Index And Cache Architecture
type: spec-shard
status: draft
parent: "[[index|Explorer Node Media Index And Thumbnail Cache]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/media
  - explorer/cache
---

# Index And Cache Architecture

## Target Services

Create or extend services around the existing `ExplorerMediaCacheService`.

Recommended service split:

- `serviceNodeMediaIndex.ts`
  - resolves media source descriptors for nodes;
  - watches vault metadata/file changes;
  - records source fingerprints and failure states.
- `serviceNodeThumbnailQueue.ts`
  - schedules thumbnail generation/fetch work by priority;
  - coalesces duplicate jobs;
  - cancels obsolete work.
- `serviceExplorerMediaCache.ts`
  - remains the record/blob storage boundary;
  - gains a persistent store implementation if one does not exist.
- `serviceNodeMediaProjection.ts`
  - attaches `ExplorerMediaRecord` descriptors to `ExplorerRowInput` or view projections without loading blobs.

## Two-Level Cache

### Level 1: Media Index Records

Records describe source state and thumbnail state:

- target key;
- node/file target;
- source descriptor;
- source fingerprint;
- thumbnail settings fingerprint;
- status;
- media key;
- dimensions;
- generated timestamp;
- error reason.

This level should persist across app reloads.

### Level 2: Thumbnail Blob Cache

Blobs hold low-resolution thumbnail bytes:

- `mediaKey`;
- bytes;
- byte length;
- mime type;
- intrinsic thumbnail dimensions;
- animation metadata when applicable.

This level should be byte-budgeted and LRU-managed. Existing `ExplorerMediaCacheService` already has an in-memory LRU. The implementation should add or use a persistent store so the plugin does not regenerate the same thumbnails on every launch.

## Projection Rule

Explorer projections may carry descriptors and media records, never decoded image elements and never full-size bytes.

Allowed in row/projection:

- `mediaDescriptor`;
- `mediaKey`;
- `status`;
- `dimensions`;
- `sourceKind`;
- `animated`;
- `error`.

Forbidden in row/projection:

- `Blob`;
- `Uint8Array`;
- object URL;
- `HTMLImageElement`;
- canvas object;
- decoded bitmap.

## Visible-Only Hydration

Views request blobs only for visible row ids or a small prefetch range:

```text
virtual row ids
  -> mediaById descriptors
  -> loadVisibleDescriptorBlobs
  -> NodeMediaSlot receives object URL/blob URL
```

The cache can index descriptors for many nodes, but blob hydration must be visible-range aware. Full-tree preloading is not allowed in the scroll path.

## Invalidation

Invalidate media records when any of these change:

- source file mtime/size/hash;
- note frontmatter or body mtime/hash;
- configured cover property names;
- source precedence settings;
- thumbnail size/format/quality settings;
- animated GIF setting;
- remote cache TTL expiry;
- remote `ETag` / `Last-Modified` changes.

Do not delete old blobs synchronously during render. Mark records stale and let the queue refresh them.

## Queue Priorities

Priority order:

1. currently visible rows;
2. selected/focused row;
3. rows in virtualizer overscan;
4. idle prefetch for recently visited folder/list context;
5. background maintenance.

Queue workers must yield between jobs and should not process large decode work while the user is actively scrolling.

## Object URL Lifecycle

If the UI creates object URLs for thumbnail blobs:

- object URLs are component-local;
- revoke on row unmount or blob replacement;
- do not store object URLs in the persistent cache;
- do not store object URLs in projection data.

