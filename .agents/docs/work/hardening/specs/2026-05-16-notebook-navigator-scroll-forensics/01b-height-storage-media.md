---
title: Height Storage And Media Model
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/01-notebook-navigator-scroll-mechanisms|Notebook Navigator Scroll Mechanisms]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/performance
  - notebook-navigator
---

# Height Storage And Media Model

## 1. Deterministic Height Estimation

Notebook Navigator's list rows can contain title, date, parent folder line, preview text, tags, properties, word-count/task pills, feature image, file extension thumbnail/badge, group headers, and spacers.

Even with that variability, `estimateSize` remains synchronous. It reads:

- item type (`HEADER`, `HEADER_SPACER`, `TOP_SPACER`, `BOTTOM_SPACER`, `FILE`);
- CSS-mirrored constants from `getListPaneMeasurements()`;
- `db.getFile(file.path)`, which is memory cache, not IndexedDB;
- `hasPreview(file.path)`, which is a synchronous cache status;
- `featureImageStatus` and `featureImageKey` metadata;
- tags and properties from cached file data;
- visible property/tag settings;
- current selected tag/property values that should hide one visible pill.

The estimator delegates to `listPaneMeasurements.ts`:

- `getFileItemLayoutState()`;
- `calculateNormalListFileRowHeightEstimate()`;
- `shouldShowFeatureImageArea()`;
- `shouldShowExtensionBadgeThumbnail()`;
- `shouldShowFileItemParentFolderLine()`;
- `getPropertyRowCount()`.

The CSS is then forced to match those estimates:

- virtual file item height is `var(--item-height)`;
- `.nn-file` is `height: 100%`;
- `.nn-file-content` is `height: 100%`;
- thumbnail size is derived from `--item-height`;
- title/preview max heights are row-count based, not natural-flow unlimited.

NN has explicit tests to keep this true:

- `tests/utils/listPaneMeasurements.test.ts`
- `tests/styles/listPaneMeasurementsCssSync.test.ts`

## 2. Targeted `measure()` Calls

Notebook Navigator does not call `measure()` on every scroll.

List pane calls `rowVirtualizer.measure()` when:

- storage becomes ready after cold boot;
- `listLayoutSignature` changes;
- content changes include height-affecting fields for rows currently present in `filePathToIndex`.

Height-affecting fields are:

- `preview`;
- `featureImageKey`;
- `featureImageStatus`;
- `properties`;
- `tags`;
- `wordCount`.

Non-height fields like task counts and frontmatter metadata changes are ignored by `isListRowHeightAffectingContentChange()` unless they change one of the height-relevant properties above.

Navigation pane calls `measure()` when:

- path map effective contents change;
- measurement signature changes;
- vertical nav settings change.

This avoids scroll-time measurement churn.

## 3. IndexedDB Role

Notebook Navigator's IndexedDB cache is not a scroll-position store.

It stores:

- main `FileData` records in `keyvaluepairs`;
- preview text strings in `filePreviews`;
- feature image blobs in `featureImageBlobs`.

Main `FileData` includes row-height-affecting metadata:

- preview status;
- feature image status/key;
- tags;
- properties;
- word count;
- file metadata such as display name, icon, colors, hidden flag;
- mtimes for invalidation.

At runtime:

- `IndexedDBStorage.getFile(path)` is synchronous because it reads the `MemoryFileCache`.
- preview strings are held in a bounded memory LRU.
- feature image blobs use a separate blob store and memory LRU.
- file previews/blobs can be loaded lazily, but the row already knows whether it must reserve preview/image space.

Why it matters: IndexedDB is not making scroll fast directly. It makes the height estimator and row renderer deterministic by keeping the necessary metadata in memory. Without that, scroll would need either async reads or DOM measurement to learn row sizes.

## 4. Media, Images, And GIF-Capable Rows

`FileItem.tsx` is `React.memo`.

It uses memoized values for:

- display name;
- display date;
- extension-badge decisions;
- class names;
- feature image classes/styles.

`useFileItemContentState.ts` handles content state:

- loads initial cache snapshot synchronously;
- subscribes to per-file content changes;
- updates React state only when values actually change;
- calls `ensurePreviewTextLoaded()` for markdown previews after mount;
- creates object URLs for feature image blobs asynchronously;
- revokes object URLs on cleanup;
- ignores stale async blob results via an `isActive` flag;
- throttles feature-image regeneration attempts.

Images use normal browser loading. There is no explicit decode wait in the scroll path. Aspect ratio is computed after load:

- if force-square is enabled, no natural aspect ratio work is needed;
- otherwise `onLoad` reads natural dimensions and clamps to `16 / 9`;
- if the image is already complete, aspect ratio is computed without forcing a second decode.

Image/GIF load can change visual content, but the row's reserved height and thumbnail slot are known from cached metadata and CSS constraints. The list can scroll and paint text rows before blobs resolve.

