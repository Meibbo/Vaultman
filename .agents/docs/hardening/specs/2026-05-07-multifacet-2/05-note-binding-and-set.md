---
title: Binding notes and explorer-wide set action
type: design-spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-07-multifacet-2/index|multifacet wave 2 spec]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/spec
  - explorer/note-binding
  - explorer/cmenu
created_by: claude
updated_by: claude
---

# Binding Notes And Explorer-Wide `set`

## Binding Note

Non-file nodes get a `cmenu` entry: **create / open binding note**.

### Alias Token Per Node Kind

| Kind | Alias token |
|------|-------------|
| `prop` | `[propname]` |
| `tag` | `#tagname` |
| `folder` | `label==filename` (fallback `/foldername`) |
| `value` | `label==filename` |
| `snippet` | `$snippetname` |
| `plugin` | `%pluginname` |
| `template` | `label==filename` |

`label==filename` means the note's filename equals the node's label.
For plugins, define `pluginname` as the stable Obsidian manifest id unless a
future product decision explicitly chooses display name aliases.

### Binding Algorithm (`NodeBindingService.bindOrCreate(node)`)

1. Compute alias token.
2. Search vault for notes whose `aliases` frontmatter contains the
   token.
3. Match cardinalities:
   - **0 matches** → create a new note in the configured target
     folder (default vault root). Frontmatter: `aliases: [token]`.
     Body: empty. Open the note in the active leaf.
   - **1 match** → open that note. Bind = open, no mutation.
   - **2+ matches** → route to filter pane with synthetic filter
     `aliases has <token>` and surface a notice: "Hay N notas con
     este alias. Filtrando…".

### Folder Setting

- `bindingNoteFolder: string`, default `""` (vault root).
- Settings entry validates that the folder exists or offers to
  create it.

## Explorer-Wide `set` Action

Every explorer's `cmenu` gets a `set` entry. Semantics by explorer:

### Tag explorer

- For each filtered file, queue `NATIVE_ADD_TAG { file, tag: node.label }`.
- If a file already has the tag, skip silently (no error).

### Prop explorer

- Open FnR with mode `add-prop`, query pre-filled
  `{{prop}}: ` where `{{prop}}` resolves to the selected prop node's
  label.
- Submit writes the rendered string as a frontmatter property line
  in every filtered file (queued as `NATIVE_SET_PROP { file, key,
  value }`).
- Conflict policy: existing key → overwrite; no key → insert at top
  of frontmatter.

### Value explorer

- Queue `NATIVE_SET_PROP { file, key: node.parentProp, value:
  node.label }` for every filtered file.

### File explorer

- "Add link" semantics: for every filtered file, queue
  `NATIVE_APPEND_LINK { file, links: selectedFiles.map(toWikilink) }`.
- Append happens at end of body; if file ends without trailing
  newline, insert one.

## pageTools Node Explorers

### Snippets explorer

- Add `tabSnippets` under `pageTools`.
- Source nodes from CSS files in `.obsidian/snippets/`, preferably through
  Obsidian's internal `app.customCss.snippets` and filesystem fallback.
- The visual slot normally used for a numeric counter becomes an
  enable/disable toggle. Toggling calls Obsidian's custom-CSS control
  surface and refreshes the snippets index.
- Binding-note alias token is `$snippetname`.

### Plugins explorer

- Add `tabPlugins` under `pageTools`.
- Source nodes from installed community plugin manifests.
- Label rows with plugin display name, but use the stable manifest id for
  the canonical token unless the user chooses display-name aliases later.
- Binding-note alias token is `%pluginname`.
- Plugin enable/disable controls must be explicit guarded actions; do not
  mutate Obsidian plugin state as an accidental row click.

## Acceptance

- Right-click on a non-file node shows **create / open binding
  note**.
- 0/1/N alias-match cases all behave as specified.
- `set` entry exists in cmenu of every explorer.
- All `set` writes go through `OperationQueueService`. No direct
  vault writes.
- Prop `set` lands in FnR with the correct `{{prop}}: ` template
  pre-filled.
- Snippet binding notes use `$snippetname`, not raw filename aliases.
- Plugin binding notes use `%pluginname`, with stable ids preferred over
  mutable display names.

## Anti-Goals

- No automatic merge of multiple matching notes.
- No vault writes outside the queue.
- No silent overwrite of an entire frontmatter block — only the
  targeted key.
- No handling of `prop` set when no prop node is selected.
