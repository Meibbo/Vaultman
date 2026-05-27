# Contributing to Vaultman

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm
- [Obsidian](https://obsidian.md/) with developer mode enabled (Settings > Community Plugins > Turn on community plugins)

## Development Setup

1. Clone the repository into your vault's plugin directory:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/Meibbo/vaultman.git
   cd vaultman
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development build (watch mode with sourcemaps):
   ```bash
   npm run dev
   ```

4. Enable the plugin in Obsidian: Settings > Community Plugins > Vaultman

5. Use Ctrl+Shift+I to open the developer console for debugging.

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Continuous build with watch mode and sourcemaps |
| `npm run build` | Production build (type-check + minified bundle) |
| `npm run lint` | Run ESLint with Obsidian-specific rules |

## Architecture Overview

The sidebar view is built with **Svelte 5** (`$state`, `$derived`, `{#each}` blocks). All other views and components use Obsidian's TypeScript DOM helpers directly.

```
main.ts                    # Plugin entry point — lifecycle, commands, ribbon, services
src/
  services/                # Core business logic (extend Component, use addChild())
    PropertyIndexService   # Live frontmatter index (property name → Set<values>)
    FilterService          # Filter tree state + filteredFiles list
    OperationQueueService  # Stages and executes file/property operations
    SessionFileService     # Session .md file read/write
    BasesCheckboxInjector  # Injects checkboxes into Obsidian Bases table DOM
  views/                   # Obsidian ItemView subclasses
    VaultmanView.ts         # Thin shell — mounts/unmounts VaultmanView.svelte
    VaultmanView.svelte     # Main sidebar UI (Svelte 5): 3-page nav, all tabs
    VaultmanExplorerView.ts # Full-width property explorer (legacy, not in active use)
    VaultmanOpsView.ts      # Full-width operations panel (legacy, not in active use)
  components/              # Plain TypeScript UI classes (no framework)
    PropertyGridComponent  # Virtual-scrolled spreadsheet grid with inline editing
    FileListComponent      # Checkable file list with search filtering
    FilterTreeComponent    # Visual filter rule tree (rendered in Active Filters popup)
    QueueListComponent     # Pending operations mini-list (inside Ops tab)
  modals/                  # Modal dialogs (extend Modal)
    AddFilterModal         # Create filter rules/groups (property autocomplete)
    PropertyManagerModal   # Queue property operations (set/rename/delete/type)
    QueueDetailsModal      # Diff view + execute (property diffs + content snippets)
    FileRenameModal        # Batch file renaming
    FileMoveModal          # Move files to target folder
    LinterModal            # Obsidian Linter batch integration
    SaveTemplateModal      # Save filter template
  types/                   # TypeScript interfaces only
    filter.ts              # FilterNode, FilterGroup, FilterRule, FilterType
    operation.ts           # PendingChange, OperationResult, signal constants
    settings.ts            # VaultmanSettings, DEFAULT_SETTINGS
  utils/                   # Pure functions
    filter-evaluator.ts    # evalNode() — pure filter evaluation function
    autocomplete.ts        # PropertySuggest, FolderSuggest (AbstractInputSuggest)
  i18n/                    # Internationalization
    index.ts               # t() function, setLanguage(), auto-detect
    en.ts                  # English translations (source of truth)
    es.ts                  # Spanish translations
  settings/
    VaultmanSettingsTab.ts  # Plugin settings tab
```

### VaultmanView.svelte — key patterns

The sidebar Svelte component manages all page/tab state. Key rules:
- All user-visible strings use `t('key')` from `src/i18n/index.ts`
- DOM elements created by TypeScript components (FileListComponent, FilterTreeComponent, QueueListComponent) are initialized via Svelte `use:action` directives
- State is `$state` runes; derived values are `$derived.by()`
- Never assign `element.style.*` directly — use CSS classes

### Operation signals

`src/types/operation.ts` defines special string constants used as keys in `logicFunc()` return values to signal non-standard operations:

| Constant | Value | Effect |
|----------|-------|--------|
| `RENAME_FILE` | `_RENAME_FILE` | Rename file via `fileManager.renameFile` |
| `MOVE_FILE` | `_MOVE_FILE` | Move file to target folder |
| `FIND_REPLACE_CONTENT` | `_FIND_REPLACE_CONTENT` | Replace content in raw file via `vault.read/modify` |
| `DELETE_PROP` | `_DELETE_PROP` | Delete a frontmatter property |
| `REORDER_ALL` | `_REORDER_ALL` | Reorder all frontmatter keys |

## Key Development Patterns

### Service Lifecycle

All services extend Obsidian's `Component` class and are registered via `addChild()` in the plugin's `onload()`. This ensures automatic lifecycle management:

```typescript
// In main.ts onload():
this.myService = new MyService(this.app);
this.addChild(this.myService);  // Calls onload(), auto-calls onunload() later
```

### Event Registration

Always use `registerEvent()` for Obsidian events — this ensures automatic cleanup on unload:

```typescript
// Good — auto-cleaned
this.registerEvent(
  this.app.vault.on('modify', (file) => { ... })
);

// Bad — leaks on unload
this.app.vault.on('modify', (file) => { ... });
```

### DOM Construction

Use Obsidian's DOM helpers instead of raw HTML:

```typescript
// Good
const div = containerEl.createDiv({ cls: 'my-class' });
div.createEl('span', { text: 'Hello' });

// Bad
containerEl.innerHTML = '<div class="my-class"><span>Hello</span></div>';
```

### Class Management

Toggle specific CSS classes rather than overwriting `.className`:

```typescript
// Good
el.addClass('my-modifier');
el.removeClass('old-modifier');

// Bad — wipes all classes including Obsidian's
el.className = 'my-class my-modifier';
```

### File Lookups

Use O(1) path-based lookups instead of filtering the full vault:

```typescript
// Good — O(1)
const file = this.app.vault.getFileByPath(path);

// Bad — O(n) full vault scan
const file = this.app.vault.getMarkdownFiles().find(f => f.path === path);
```

### Performance Guidelines

- **Debounce** expensive operations triggered by vault events (metadata changes, file modifications)
- **Batch** updates when processing multiple files
- **Cache** computed values and invalidate on relevant events
- **Scope** DOM queries to component containers, not `document`
- **Virtual scroll** for large lists (see PropertyGridComponent)

## Testing Checklist

Before submitting changes, verify manually in Obsidian:

- [ ] Plugin reloads without console errors (`obsidian 'vault=...' 'plugin:reload' 'id=vaultman'` then `dev:errors`)
- [ ] Build passes: `npm run build` (1 pre-existing Svelte warning, 0 errors)
- [ ] Sidebar opens via ribbon icon
- [ ] All 3 pages navigate correctly (Ops | Files | Filters)
- [ ] Files page: file list renders with correct count
- [ ] Filters → Rules tab: property browser shows vault properties; clicking adds filter rules
- [ ] Filters → Scope tab: scope selection updates correctly
- [ ] Active Filters popup (FAB): shows current filter tree correctly
- [ ] Ops → File Ops tab: queue operations, review diff, execute
- [ ] Ops → Content tab: preview finds matches, queue replace stages correctly
- [ ] Queue Details: property diffs show for property ops; snippet diffs show for content ops
- [ ] Disable and re-enable plugin (no memory leaks / console errors)

## Release Process

1. Update version in `manifest.json`, `package.json`, and `versions.json`
2. Update `CHANGELOG.md` with the new version's changes
3. Commit and tag the release:
   ```bash
   git tag 1.2.3
   git push origin main --tags
   ```
4. Create a GitHub release with `main.js`, `manifest.json`, and `styles.css` attached
