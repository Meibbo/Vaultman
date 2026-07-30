---
title: Notebook Navigator Evidence
type: spec-shard
status: draft
parent: "[[index|Explorer Node Video Provider Media And Cache Settings]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/media
  - explorer/cache
  - research/notebook-navigator
---

# Notebook Navigator Evidence

Local reference tree: `C:\Users\vic_A\Desktop\notebook-navigator`.

## Settings UI Pattern

`src/settings/tabs/NotesTab.ts` exposes feature-image settings:

- `showFeatureImage`
- `featureImageProperties`
- `featureImageExcludeProperties`
- `featureImageSize`
- `featureImagePixelSize`
- `forceSquareFeatureImage`
- `downloadExternalFeatureImages`

Important lesson: display size and generated pixel size are separate settings.
NN can render a 64/96/128px visual thumbnail while generating 256/384/512px stored assets for crispness and scaling.

`src/i18n/locales/en.ts` describes `featureImagePixelSize` as the resolution used when generating stored thumbnails, with larger values recommended when bigger previews look blurry.

## Advanced Cache Controls

`src/settings/tabs/AdvancedTab.ts` provides a rebuild-cache button and displays local cache statistics through `SettingsDiagnosticsController`.

`src/storage/statistics.ts` streams:

- main file records;
- feature image blob records;
- preview text records.

It only counts feature-image blobs when the blob key matches the current main record key. Vaultman should apply the same rule for media variants so stale poster/animated-preview blobs do not inflate useful-cache counts.

## Storage Shape

`docs/storage-architecture.md` documents NN's cache database:

- main store: file records and derived-content status;
- preview store: preview strings;
- feature image blob store: `{ featureImageKey, blob }`;
- memory cache mirrors main records but does not keep blobs in the main record;
- thumbnail blobs load on demand through bounded LRUs.

`src/storage/FeatureImageBlobStore.ts` and `src/storage/FeatureImageBlobCache.ts` implement key-validated blob reads, LRU memory caching, in-flight read deduplication, and epoch invalidation so stale requests do not repopulate caches after a clear.

Vaultman should reuse the pattern, not the exact image-only shape:

- media records store status and variant keys;
- blob store stores poster/animated-preview bytes;
- memory LRU validates expected variant key;
- cache clear bumps epochs and cancels obsolete in-flight reads.

## Thumbnail Generation Pattern

`src/services/content/FeatureImageContentProvider.ts` shows several useful policies:

- relevant settings drive regeneration, especially `featureImagePixelSize`;
- local references include source mtime in their key;
- external references normalize HTTPS URLs;
- YouTube references use video id keys;
- external downloads are deduplicated by in-flight request key;
- request timeouts and external concurrency limits protect the UI;
- image decode/resize work uses pixel budgets and canvas concurrency limits.

`src/constants/limits.ts` centralizes thumbnail output format, quality, request timeouts, byte limits, decode budgets, and memory LRU defaults.

## What Vaultman Should Not Copy

- Do not copy NN's Markdown feature-image scope directly; Vaultman media is node-owned.
- Do not add `vid` codeblock compatibility.
- Do not limit provider support to YouTube.
- Do not store cache blobs in settings or synced data.
- Do not regenerate all variants synchronously after settings changes.

