## Tag Collections API

Helpers for aggregate tag rows used by tag menus and navigation.

| Method | Description | Returns |
| ------ | ----------- | ------- |
| `taggedId` | Aggregate row id for notes with at least one tag | `'__tagged__'` |
| `untaggedId` | Aggregate row id for notes without tags | `'__untagged__'` |
| `isCollection(tag)` | Check whether a tag target is an aggregate row id | `boolean` |
| `getLabel(tag)` | Current localized label for an aggregate row id | `string` |

```typescript
nn.menus.registerTagMenu(({ tag, addItem }) => {
  if (!nn.tagCollections.isCollection(tag)) {
    return;
  }

  addItem(item => {
    item.setTitle(`Handle ${nn.tagCollections.getLabel(tag)}`);
  });
});
```

## Property Nodes API

Helpers for building and parsing canonical property node ids.

| Method | Description | Returns |
| ------ | ----------- | ------- |
| `rootId` | Property root node id | `'properties-root'` |
| `buildKey(key)` | Build a canonical key node id | `string \| null` |
| `buildValue(key, valuePath)` | Build a canonical key/value node id | `string \| null` |
| `parse(nodeId)` | Parse a property node id | `PropertyNodeParts \| null` |
| `normalize(nodeId)` | Normalize a property node id | `string \| null` |

```typescript
const statusKey = nn.propertyNodes.buildKey('Status');
const doneValue = nn.propertyNodes.buildValue('Status', 'Done');
const parsed = nn.propertyNodes.parse('key:Status=Done');
const root = nn.propertyNodes.parse(nn.propertyNodes.rootId);
```

## Selection API

Query the current selection state in the navigator.

`getNavItem()` and `getCurrent()` return the navigator's most recently known state. Selection updates while the navigator view is active, and navigation selection is restored from localStorage on startup.

When `navItem.type === 'tag'`, `navItem.tag` can be either a canonical tag path or an aggregate tag collection id (`'__tagged__'` or `'__untagged__'`).

| Method         | Description                  | Returns          |
| -------------- | ---------------------------- | ---------------- |
| `getNavItem()` | Get selected folder, tag, or property | `NavItem`        |
| `getCurrent()` | Get current file selection state | `SelectionState` |

```typescript
// Check what's selected
const navItem = nn.selection.getNavItem();
if (navItem.type === 'folder') {
  console.log('Folder selected:', navItem.folder.path);
} else if (navItem.type === 'tag') {
  console.log('Tag selected:', navItem.tag);
} else if (navItem.type === 'property') {
  console.log('Property selected:', navItem.property);
} else {
  console.log('Nothing selected in navigation pane');
}

// Get selected files
const { files, focused } = nn.selection.getCurrent();
```

## Menus API

Register callbacks that add items to Notebook Navigator's file, folder, tag, and property context menus.

File and folder menu hooks are available in API version 1.2.0. Tag and property menu hooks are available in API version 2.0.0.

| Method                      | Description                              | Returns                 |
| --------------------------- | ---------------------------------------- | ----------------------- |
| `registerFileMenu(callback)` | Add items to the file context menu      | `() => void`            |
| `registerFolderMenu(callback)` | Add items to the folder context menu  | `() => void`            |
| `registerTagMenu(callback)` | Add items to the tag context menu        | `() => void`            |
| `registerPropertyMenu(callback)` | Add items to the property context menu | `() => void`         |

Callbacks run synchronously during menu construction. Add menu items synchronously and do async work in `onClick` handlers.

### File context menu

The file callback receives the clicked file and the effective selection for this menu:

- `context.addItem(...)` - Add a menu item
- `context.file` - The file the menu was opened on
- `context.selection.mode` - `'multiple'` when multiple files are selected and the menu was opened on a selected file
- `context.selection.files` - Snapshot of files for this menu (`'single'` uses `[file]`)

Single selection example:

```typescript
import type { NotebookNavigatorAPI } from './notebook-navigator';

const nn = app.plugins.plugins['notebook-navigator']?.api as Partial<NotebookNavigatorAPI> | undefined;

const dispose = nn?.menus?.registerFileMenu(({ addItem, file, selection }) => {
  if (selection.mode !== 'single') {
    return;
  }

  if (file.extension !== 'md') {
    return;
  }

  addItem(item => {
    item.setTitle('My action').setIcon('lucide-wand').onClick(() => {
      console.log('Clicked', file.path);
    });
  });
});

// If dispose is defined, call dispose() when your plugin unloads
```

Multiple selection example:

```typescript
const dispose = nn?.menus?.registerFileMenu(({ addItem, selection }) => {
  if (selection.mode !== 'multiple') {
    return;
  }

  addItem(item => {
    item.setTitle('My batch action').setIcon('lucide-list-check').onClick(() => {
      console.log('Selected files', selection.files.map(f => f.path));
    });
  });
});
```

### Folder context menu

The folder callback receives:

- `context.addItem(...)` - Add a menu item
- `context.folder` - The folder the menu was opened on

```typescript
const dispose = nn?.menus?.registerFolderMenu(({ addItem, folder }) => {
  addItem(item => {
    item.setTitle('My folder action').setIcon('lucide-folder').onClick(() => {
      console.log('Folder', folder.path);
    });
  });
});
```

### Tag and property context menus

- `registerTagMenu(callback)` receives `context.tag`
- Use `nn.tagCollections.isCollection(context.tag)` to detect aggregate rows
- `registerPropertyMenu(callback)` receives `context.nodeId`
