# Notebook Navigator API Reference

Updated: April 30, 2026

The Notebook Navigator plugin exposes a public API for other plugins and scripts to interact with navigator features.

**Current API Version:** 2.0.0

## Table of Contents

- [Quick Start](#quick-start)
- [API Overview](#api-overview)
- [Metadata API](#metadata-api)
  - [Folder, Tag, and Property Metadata](#folder-tag-and-property-metadata)
  - [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/api-reference/02-pins-navigation#Pinned Files|Pinned Files]]
- [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/api-reference/02-pins-navigation#Navigation API|Navigation API]]
- [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/api-reference/03-collections-selection-menus#Tag Collections API|Tag Collections API]]
- [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/api-reference/03-collections-selection-menus#Property Nodes API|Property Nodes API]]
- [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/api-reference/03-collections-selection-menus#Selection API|Selection API]]
- [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/api-reference/03-collections-selection-menus#Menus API|Menus API]]
- [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/api-reference/04-events-core-typescript-changelog#Events|Events]]
- [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/api-reference/04-events-core-typescript-changelog#Core API Methods|Core API Methods]]
- [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/api-reference/04-events-core-typescript-changelog#TypeScript Support|TypeScript Support]]
- [[docs/work/hardening/research/2026-06-15-notebook-navigator-api-lupa-addon/sources/api-reference/04-events-core-typescript-changelog#Changelog|Changelog]]

## Quick Start

### Accessing the API

The Notebook Navigator API is available at runtime through the Obsidian app object. Here's a practical example using
Templater:

```javascript
<%* // Templater script to pin the current file in Notebook Navigator
const nn = app.plugins.plugins['notebook-navigator']?.api;

if (nn) {
  // Pin the current file in folder, tag, and property contexts
  const file = tp.config.target_file;
  await nn.metadata.pin(file);
  new Notice('File pinned in Notebook Navigator');
}
%>
```

Or set a folder color based on the current date:

```javascript
<%* // Set folder color based on day of week
const nn = app.plugins.plugins['notebook-navigator']?.api;
if (nn) {
  const folder = tp.config.target_file.parent;
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
  const dayColor = colors[new Date().getDay()];

  await nn.metadata.setFolderMeta(folder, { color: dayColor });
}
%>
```

## API Overview

The API provides six main namespaces:

- **`metadata`** - Folder, tag, and property node colors/icons, and pinned files
- **`navigation`** - Navigate to files in the navigator
- **`tagCollections`** - Work with aggregate tag rows such as "Tags" and "Untagged"
- **`propertyNodes`** - Build and parse property node ids
- **`selection`** - Query current selection state
- **`menus`** - Add items to Notebook Navigator context menus

### Public surface

The supported public surface is the API described in this document and in `src/api/public/notebook-navigator.d.ts`. The
runtime `api` object may contain additional methods and properties; treat them as internal.

### Stability policy

- The documented API and `src/api/public/notebook-navigator.d.ts` are the compatibility contract.
- API version `2.x` is additive-only. New methods, events, and type exports may be added without a major version bump.
- Breaking changes to documented members require a major version bump.
- Undocumented runtime properties may change without notice.

Core methods:

- **`getVersion()`** - Get the API version string
- **`isStorageReady()`** - Check if the initial storage bootstrap is complete
- **`whenReady()`** - Resolve when the initial storage bootstrap completes

## Metadata API

Customize folder, tag, and property node appearance, manage pinned files.

### Runtime Behavior

- **Icon input format**: Setter methods parse the same icon value format Notebook Navigator writes to frontmatter.
  Use `IconString` when you want compile-time validation for short provider-prefixed values such as `ph-folder`,
  `bi-alarm`, `fas-user`, `mi-crop_16_9`, `ra-harpoon-trident`, and `si-github`. Lucide icons use bare slugs such as
  `folder-open`. Emoji icons use bare emoji such as `📁`.
- **Legacy Iconize input**: Setter methods also accept supported legacy Iconize compact IDs such as `LiHome`,
  `PhAppleLogo`, `FasUser`, `MiCrop169`, and `SiGithub`. These values are normalized before saving and are returned in
  frontmatter format, not Iconize format.
- **Icon output format**: `FolderMetadata.icon`, `TagMetadata.icon`, and `PropertyMetadata.icon` use `IconValue`
  because returned values are normalized strings. Supported icons are returned in the same format Notebook Navigator
  writes to frontmatter: Lucide slug (`folder-open`), short provider-prefixed slug (`ph-folder`), or bare emoji (`📁`).
  Supported providers are not returned with colon-separated IDs.
- **Icon normalization**: Icon values are normalized before saving (for example, short provider values are converted to
  the internal render ID, redundant external-provider prefixes like `ph-` and `ra-` are stripped, and `material-icons`
  identifiers are stored as snake case internally).
- **Unsupported providers**: Setter methods ignore values outside the frontmatter icon format and supported legacy
  Iconize compact IDs. Existing unsupported or malformed settings values may be returned unchanged.
- **Color values**: Any string is accepted and saved. Invalid CSS colors will not render correctly but won't throw
  errors.
- **Tag normalization**: The `getTagMeta()` and `setTagMeta()` methods automatically normalize tags:
  - Both `'work'` and `'#work'` are accepted as input
  - Tags are case-insensitive: `'#Work'` and `'#work'` refer to the same tag
  - Tags are stored internally without the '#' prefix as lowercase paths
- **Property node normalization**: The `getPropertyMeta()` and `setPropertyMeta()` methods normalize property node ids:
  - Both key ids (`'key:Status'`) and key/value ids (`'key:Status=Done'`) are accepted
  - Keys and values are normalized to lowercase
  - Metadata is stored under canonical node ids (`'key:status'`, `'key:status=done'`)

### Folder, Tag, and Property Metadata

| Method                        | Description                          | Returns                  |
| ----------------------------- | ------------------------------------ | ------------------------ |
| `getFolderMeta(folder)`       | Get all folder metadata              | `FolderMetadata \| null` |
| `setFolderMeta(folder, meta)` | Set folder metadata (partial update) | `Promise<void>`          |
| `getTagMeta(tag)`             | Get all tag metadata                 | `TagMetadata \| null`    |
| `setTagMeta(tag, meta)`       | Set tag metadata (partial update)    | `Promise<void>`          |
| `getPropertyMeta(nodeId)`     | Get all property node metadata       | `PropertyMetadata \| null` |
| `setPropertyMeta(nodeId, meta)` | Set property node metadata (partial update) | `Promise<void>`          |

`setFolderMeta()`, `setTagMeta()`, and `setPropertyMeta()` use `FolderMetadataUpdate`,
`TagMetadataUpdate`, and `PropertyMetadataUpdate`.

When `useFrontmatterMetadata` is enabled, `getFolderMeta()` resolves current folder display data through
`MetadataService`. `setFolderMeta()` writes through `metadataService.setFolderStyle(...)` whenever `MetadataService` is
available. Folder metadata can therefore reflect folder-note frontmatter, not only the raw settings maps.

#### Property Update Behavior

When using `setFolderMeta`, `setTagMeta`, or `setPropertyMeta`, partial updates follow this pattern:

- **`color: 'red'`** - Sets the color to red
- **`color: null`** - Clears the color (removes the property)
- **`color: undefined`** or property not present - Leaves the color unchanged

This applies to all metadata properties (color, backgroundColor, icon). Only properties explicitly included in the
update object are modified.
