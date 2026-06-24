---
title: Notebook Navigator API surface and source-backed limits
type: research
status: active
created: 2026-06-15
updated: 2026-06-15
parent: "[[index|Notebook Navigator API research for first LUPA add-on]]"
tags:
  - agent/research
  - lupa/addon
  - interop/notebook-navigator
---

# API surface and source-backed limits

## Contract boundary

The current public API version is `2.0.0`. The API reference states that the supported public surface is the documented API plus `src/api/public/notebook-navigator.d.ts`; undocumented runtime members must be treated as internal. The stability policy says API `2.x` is additive-only and breaking documented changes require a major version bump.

For LUPA this means:

- depend only on `NotebookNavigatorAPI`;
- use defensive optional access because the plugin may be absent or older;
- require `>= 2.0.0` for the first serious add-on because tag/property menus and `whenReady()` are part of 2.0.0;
- keep all Notebook Navigator calls behind one adapter interface so future API drift is isolated.

Minimal runtime acquisition:

```ts
const nn = app.plugins.plugins["notebook-navigator"]?.api as NotebookNavigatorAPI | undefined;
```

Guard pattern for LUPA:

```ts
export async function getNotebookNavigatorBridge(app: App): Promise<NotebookNavigatorAPI | null> {
  const api = app.plugins.plugins["notebook-navigator"]?.api as Partial<NotebookNavigatorAPI> | undefined;
  if (!api?.getVersion || !api?.whenReady) return null;
  if (!api.getVersion().startsWith("2.")) return null;
  await api.whenReady();
  return api as NotebookNavigatorAPI;
}
```

## Public API capability matrix

| Namespace | Calls | LUPA fit |
| --- | --- | --- |
| core | `getVersion()`, `isStorageReady()`, `whenReady()` | Probe and readiness gate. Use before tag/property navigation or storage-backed reads. |
| `metadata` | folder/tag/property `get*Meta`, `set*Meta`; `pin`, `unpin`, `isPinned`, `getPinned` | Useful for pin interoperability and optional visual metadata. Avoid overwriting user colors/icons unless user explicitly opts in. |
| `navigation` | `reveal(file)`, `navigateToFolder(folder)`, `navigateToTag(tag)`, `navigateToProperty(nodeId)` | Strong fit. Lets LUPA drive Notebook Navigator as an external explorer surface. |
| `selection` | `getNavItem()`, `getCurrent()` | Strong fit for current-context snapshots. Treat as last-known state, not a complete query API. |
| `menus` | `registerFileMenu`, `registerFolderMenu`, `registerTagMenu`, `registerPropertyMenu` | Best first add-on entrypoint. Lets LUPA add contextual actions directly where users browse. |
| `tagCollections` | `taggedId`, `untaggedId`, `isCollection`, `getLabel` | Required for robust tag menu handling, especially aggregate rows. |
| `propertyNodes` | `rootId`, `buildKey`, `buildValue`, `parse`, `normalize` | Required for property navigation/menu interop without string guessing. |
| events | `on`, `once`, `off` for seven event types | Strong fit for snapshot bridge and reactive sync. Must unsubscribe on unload. |

## API details relevant to LUPA

### Readiness

Use `whenReady()` when the operation depends on Notebook Navigator storage-backed state. This includes tag and property navigation, current selection sync during startup, and any logic that expects tag/property trees to exist. `isStorageReady()` is useful for status, but `whenReady()` is cleaner in command code.

### Navigation

`navigation.reveal(file)` accepts a `TFile` or path string and returns `Promise<boolean>`. It opens Notebook Navigator if needed, selects the file's parent folder, expands parents, focuses the file, and may return `false` for unresolved paths, hidden files, or view readiness failure.

`navigateToFolder(folder)` accepts `TFolder` or path string. `navigateToTag(tag)` accepts values with or without `#`, plus aggregate ids from `tagCollections`. `navigateToProperty(nodeId)` accepts `propertyNodes.rootId`, key nodes such as `key:status`, and key/value nodes such as `key:status=done`.

LUPA consequence: surface boolean failures in our add-on telemetry and UI state. Do not assume navigation succeeded.

### Selection snapshots

`selection.getNavItem()` returns folder, tag, property, or none. `selection.getCurrent()` returns selected files plus focused file. The docs say this is the navigator's most recently known state; it updates while the Navigator view is active and navigation selection restores from local storage on startup.

LUPA consequence: this is a good source for a `NotebookNavigatorContextSnapshot`, but it is not a vault query result. Mark snapshots as `source: "notebook-navigator"` and include `observedAt`.

Proposed DTO:

```ts
type NotebookNavigatorContextSnapshot = {
  source: "notebook-navigator";
  observedAt: number;
  nav:
    | { type: "folder"; path: string }
    | { type: "tag"; tag: string; aggregate: boolean }
    | { type: "property"; nodeId: string }
    | { type: "none" };
  selection: {
    focusedPath: string | null;
    filePaths: string[];
  };
};
```

### Menus

Notebook Navigator menu callbacks run synchronously during menu construction. Add menu items synchronously; do async LUPA work in `onClick`. File menu context includes the clicked file plus an effective selection snapshot. Folder, tag, and property contexts expose their target object/id.

This is the lowest-risk first add-on slice:

- file menu: `Send to LUPA`, `Open in LUPA`, `Create LUPA lens from selection`;
- folder menu: `Open folder in LUPA`;
- tag menu: `Open tag lens in LUPA`, with aggregate detection via `tagCollections.isCollection`;
- property menu: `Open property lens in LUPA`, parsing via `propertyNodes.parse`.

All registration functions return dispose callbacks. Store them and call them during plugin/add-on unload.

### Events

Available events:

- `storage-ready`
- `nav-item-changed`
- `selection-changed`
- `pinned-files-changed`
- `folder-changed`
- `tag-changed`
- `property-changed`

Tag event payloads use canonical tag paths without `#` for real tags, and may also use aggregate ids. Property ids are canonical lowercase node ids. LUPA should normalize all event payloads into its own snapshot model instead of leaking Notebook Navigator shapes into core code.

### Metadata and pins

Folder, tag, and property metadata supports `color`, `backgroundColor`, and `icon`. Update payloads are partial: a value sets, `null` clears, and omitted/`undefined` leaves unchanged. Tag inputs are normalized, and property node ids are normalized to canonical lowercase form.

Pins support contexts: `folder`, `tag`, `property`, and `all`. `getPinned()` returns a map keyed by file path to context booleans.

LUPA consequence: pin sync is viable. Visual metadata sync is risky unless opt-in because it may mutate user-owned Notebook Navigator appearance.

## Public API non-capabilities

Verified against `notebook-navigator.d.ts` and API docs: there is no public method for:

- full file search;
- current list-pane result enumeration;
- folder/tag/property tree traversal;
- reading preview text, feature images, thumbnails, or derived file metadata;
- accessing IndexedDB, `FileData`, `MemoryFileCache`, `ContentProviderRegistry`, or Omnisearch internals.

LUPA should keep its own provider snapshots and search/index abstractions. If we want to reuse Notebook Navigator's derived data later, that should become either:

- an upstream feature request to expose a public read/query API; or
- a deliberately unsupported experimental adapter kept outside stable LUPA.

## Architecture notes from Notebook Navigator internals

Notebook Navigator stores user settings in `.obsidian/plugins/notebook-navigator/data.json`, uses vault-scoped local storage for device-local UI state and migration markers, uses per-vault IndexedDB for rebuildable file-derived data, and mirrors main file records into memory for synchronous rendering. It builds tag/property trees from cached markdown metadata. The service layer coordinates storage and React UI through contexts, hooks, and the public API.

Important boundary: `ContentProviderRegistry` and storage caches are internal. They are created inside Navigator view trees and are not exposed through `ServicesContext` or the public API contract.

This aligns with LUPA's alpha architecture direction: LUPA snapshots should remain ours, and Notebook Navigator should be another external surface adapter.
