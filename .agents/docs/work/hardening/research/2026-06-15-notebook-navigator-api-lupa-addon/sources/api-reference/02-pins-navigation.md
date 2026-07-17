### Pinned Files

Notes can be pinned in different contexts - they appear at the top of the file list when viewing folders, tags, or properties.

#### Pin Methods

| Method                     | Description                                         | Returns            |
| -------------------------- | --------------------------------------------------- | ------------------ |
| `pin(file, context?)`      | Pin a file (defaults to 'all' - all contexts)       | `Promise<void>`    |
| `unpin(file, context?)`    | Unpin a file (defaults to 'all' - all contexts)     | `Promise<void>`    |
| `isPinned(file, context?)` | Check if pinned (no context = any, 'all' = all)     | `boolean`          |
| `getPinned()`              | Get all pinned files with their context information | `Readonly<Pinned>` |

#### Understanding Pin Contexts

Pinned notes behave differently depending on the current view:

- **Folder Context**: When viewing folders in the navigator, only notes pinned in the 'folder' context appear at the top
- **Tag Context**: When viewing tags, only notes pinned in the 'tag' context appear at the top
- **Property Context**: When viewing properties, only notes pinned in the 'property' context appear at the top
- **Multiple Contexts**: A note can be pinned in multiple contexts and appears at the top in each matching view
- **Default Behavior**: Pin/unpin operations default to 'all' (folder, tag, and property contexts)

This supports separate pinned sets for folder, tag, and property views.

```typescript
// Set folder appearance
const folder = app.vault.getFolderByPath('Projects');
if (folder) {
  await nn.metadata.setFolderMeta(folder, {
    color: '#FF5733', // Hex, or 'red', 'rgb(255, 87, 51)', 'hsl(9, 100%, 60%)'
    backgroundColor: '#FFF3E0', // Light background color
    icon: 'folder-open'
  });

  // Update only specific properties (other properties unchanged)
  await nn.metadata.setFolderMeta(folder, { color: 'blue' });
}

// Pin a file
const file = app.workspace.getActiveFile();
if (file) {
  await nn.metadata.pin(file); // Pins in folder, tag, and property contexts by default

  // Or pin in specific context
  await nn.metadata.pin(file, 'folder');

  // Check if pinned
  if (nn.metadata.isPinned(file, 'folder')) {
    console.log('Pinned in folder context');
  }
}

// Get all pinned files with context info
const pinned = nn.metadata.getPinned();
// Returns: Map<string, { folder: boolean, tag: boolean, property: boolean }>
// Example: Map { "Notes/todo.md" => { folder: true, tag: false, property: true }, ... }

// Iterate over pinned files
for (const [path, context] of pinned) {
  if (context.folder) {
    console.log(`${path} is pinned in folder view`);
  }
}
```

## Navigation API

| Method                     | Description                            | Returns         |
| -------------------------- | -------------------------------------- | --------------- |
| `reveal(file)`             | Reveal and select file in navigator    | `Promise<boolean>` |
| `navigateToFolder(folder)` | Select a folder in the navigation pane | `Promise<boolean>` |
| `navigateToTag(tag)`       | Select a tag in the navigation pane    | `Promise<boolean>` |
| `navigateToProperty(nodeId)` | Select a property node in navigation | `Promise<boolean>` |

### Reveal Behavior

When calling `reveal(file)`:

- **Opens the Notebook Navigator view** if it is not already open
- **Switches to the file's parent folder** in the navigation pane
- **Expands parent folders** as needed to make the folder visible
- **Selects and focuses the file** in the file list
- **Switches to file list view** if in single-pane mode
- **Returns `false`** if the file path cannot be resolved
- **Returns `false`** if the navigator view cannot be opened or does not become ready
- **Returns `false`** if the file is hidden while Show hidden items is off
- **Keeps the current folder, tag, or property context** when a hidden file cannot be revealed
- **May still select the file as fallback** when a hidden file cannot be revealed

```typescript
// Navigate to active file
const activeFile = app.workspace.getActiveFile();
if (activeFile) {
  await nn.navigation.reveal(activeFile);
  // File is selected in its parent folder when reveal succeeds
}
```

### Folder Navigation Behavior

When calling `navigateToFolder(folder)`:

- Opens the Notebook Navigator view if it is not already open
- Selects the folder in the navigation pane
- Expands parent folders to make the folder visible
- Preserves navigation focus in single-pane mode
- Accepts either a `TFolder` or a folder path string
- Returns `false` if the folder path cannot be resolved
- Returns `false` if the navigator view cannot be opened or does not become ready

### Tag Navigation Behavior

When calling `navigateToTag(tag)`:

- Accepts `'work'`, `'#work'`, and aggregate tag collection ids from `nn.tagCollections`
- Requires tag data to be available (`storage-ready`)
- Expands the tags root when "All tags" is enabled and collapsed
- Expands parent tags for hierarchical tags (e.g. `'parent/child'`)
- Preserves navigation focus in single-pane mode
- Returns `false` if a real tag is not present in the current tag tree
- Returns `false` if the navigator view cannot be opened or does not become ready

### Property Navigation Behavior

When calling `navigateToProperty(nodeId)`:

- Accepts `nn.propertyNodes.rootId`, property key ids, and key/value node ids (e.g. `'key:status'`, `'key:status=done'`)
- Normalizes node ids to canonical lowercase form before selection
- Expands the properties root when "All properties" is enabled and collapsed
- Expands the parent key node for key/value selections when needed
- Preserves navigation focus in single-pane mode
- Returns `false` if a key or key/value target is not present in the current property tree
- Returns `false` if the navigator view cannot be opened or does not become ready

```typescript
// Wait for storage if needed, then navigate
await nn.whenReady();

await nn.navigation.navigateToTag('#work');
await nn.navigation.navigateToProperty('key:status=done');
```
