## Events

Subscribe to navigator events to react to user actions.

Tag strings in events use canonical form (no `#` prefix, lowercase path) for real tags. Some tag events may also use
aggregate tag collection ids (`'__tagged__'` or `'__untagged__'`). Property node ids use canonical lowercase node ids.

| Event                  | Payload                                         | Description                  |
| ---------------------- | ----------------------------------------------- | ---------------------------- |
| `storage-ready`        | `void`                                          | Storage system is ready      |
| `nav-item-changed`     | `{ item: NavItem }`                             | Navigation selection changed |
| `selection-changed`    | `{ state: SelectionState }`                     | Selection changed            |
| `pinned-files-changed` | `{ files: Readonly<Pinned> }`                   | Pinned files changed         |
| `folder-changed`       | `{ folder: TFolder, metadata: FolderMetadata \| null }` | Folder metadata changed |
| `tag-changed`          | `{ tag: string, metadata: TagMetadata \| null }`        | Tag metadata changed    |
| `property-changed`     | `{ nodeId: string, metadata: PropertyMetadata \| null }` | Property metadata changed |

```typescript
// Subscribe to pin changes
nn.on('pinned-files-changed', ({ files }) => {
  console.log(`Total pinned files: ${files.size}`);
  for (const [path, context] of files) {
    console.log(`${path} - folder: ${context.folder}, tag: ${context.tag}`);
  }
});

// Use 'once' for one-time events (auto-unsubscribes)
nn.once('storage-ready', () => {
  // Wait for storage to be ready before storage-backed navigation/tag/property lookups
  console.log('Storage is ready - initial mirror bootstrap is complete');
  // No need to unsubscribe, it's handled automatically
});

// Use 'on' for persistent listeners
const navRef = nn.on('nav-item-changed', ({ item }) => {
  if (item.type === 'folder') {
    console.log('Folder selected:', item.folder.path);
  } else if (item.type === 'tag') {
    console.log('Tag selected:', item.tag);
  } else if (item.type === 'property') {
    console.log('Property selected:', item.property);
  } else {
    console.log('Navigation selection cleared');
  }
});

const selectionRef = nn.on('selection-changed', ({ state }) => {
  // TypeScript knows 'state' is SelectionState with files and focused
  console.log(`${state.files.length} files selected`);
});

// Unsubscribe from persistent listeners
nn.off(navRef);
nn.off(selectionRef);
```

## Core API Methods

| Method                                                                                                       | Description                                      | Returns    |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ---------- |
| `getVersion()`                                                                                               | Get API version                                  | `string`   |
| `isStorageReady()`                                                                                           | Check if initial storage bootstrap is complete   | `boolean`  |
| `whenReady()`                                                                                                | Resolve when the initial storage bootstrap completes | `Promise<void>` |
| `on<T extends NotebookNavigatorEventType>(event: T, callback: (data: NotebookNavigatorEvents[T]) => void)`   | Subscribe to typed event                         | `EventRef` |
| `once<T extends NotebookNavigatorEventType>(event: T, callback: (data: NotebookNavigatorEvents[T]) => void)` | Subscribe once (auto-unsubscribes after trigger) | `EventRef` |
| `off(ref)`                                                                                                   | Unsubscribe from event                           | `void`     |

## TypeScript Support

Since Obsidian plugins don't export types like npm packages, you have two options:

### Option 1: With Type Definitions (Recommended)

Download the TypeScript definitions file:

**[📄 notebook-navigator.d.ts](https://github.com/johansan/notebook-navigator/blob/main/src/api/public/notebook-navigator.d.ts)**

Save it to your plugin project and import:

```typescript
import type { NotebookNavigatorAPI, IconString } from './notebook-navigator';

const nn = app.plugins.plugins['notebook-navigator']?.api as NotebookNavigatorAPI | undefined;
if (!nn) {
  return;
}

await nn.whenReady();

const folder = app.vault.getFolderByPath('Projects');
if (!folder) {
  return;
}

// Icon strings are type-checked at compile time
const icon: IconString = 'ph-folder';
await nn.metadata.setFolderMeta(folder, { color: '#FF5733', icon });

// Events have full type inference
nn.on('selection-changed', ({ state }) => {
  console.log(state.files.length);
});
```

### Option 2: Without Type Definitions

```javascript
// Works without type definitions
const nn = app.plugins.plugins['notebook-navigator']?.api;
if (nn) {
  // Wait for storage if you need storage-backed navigation/tag/property reads
  await nn.whenReady();

  const folder = app.vault.getFolderByPath('Projects');
  if (!folder) {
    return;
  }

  await nn.metadata.setFolderMeta(folder, { color: '#FF5733' });
}
```

### Type Safety Features

The type definitions provide:

- **Template literal types** for short provider frontmatter icon input (`IconString`)
- **Typed event names and payloads** (`NotebookNavigatorEventType`, `NotebookNavigatorEvents`)
- **Readonly return types** (selected files arrays, pinned map)
- **Menu extension context types** (file, folder, tag, and property menus)

**Note**: These type checks are compile-time only. At runtime, the API is permissive and accepts any values (see Runtime
Behavior sections for each API).

## Changelog

### Version 2.0.0 (2026-03-07)

- Added `whenReady()`
- Added `tagCollections` helper namespace
- Added `propertyNodes` helper namespace
- `propertyNodes.parse(rootId)` returns a root descriptor
- Added `NavItem.type`
- Added `navigation.reveal(filePath)` and `navigation.navigateToFolder(folderPath)` support
- Changed navigation methods to return `Promise<boolean>`
- Added `FolderMetadataUpdate`, `TagMetadataUpdate`, and `PropertyMetadataUpdate`
- Added `menus.registerTagMenu(callback)`
- Added `menus.registerPropertyMenu(callback)`
- Changed `folder-changed`, `tag-changed`, and `property-changed` to allow `metadata: null`

### Version 1.3.0 (2026-02-14)

- Added `metadata.getPropertyMeta(nodeId)`
- Added `metadata.setPropertyMeta(nodeId, meta)`
- Added `navigation.navigateToProperty(nodeId)`
- Added `property-changed` event

### Version 1.2.0 (2025-12-22)

- Added `navigation.navigateToFolder(folder)`
- Added `navigation.navigateToTag(tag)`
- Added `menus.registerFileMenu(callback)`
- Added `menus.registerFolderMenu(callback)`

### Version 1.0.1 (2025-09-16)

- Added `backgroundColor` property to `FolderMetadata` and `TagMetadata` interfaces

### Version 1.0.0 (2025-09-15)

- Initial public API release
