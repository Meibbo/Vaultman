---
title: FnR island and templating
type: design-spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-07-multifacet-2/index|multifacet wave 2 spec]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/spec
  - explorer/find-replace
  - ui/toolbar
created_by: claude
updated_by: claude
---

# FnR Island And Templating

## Surface Changes

- Remove standalone FnR island. The searchbox itself becomes the FnR
  surface. Mode pill at the searchbox left switches between
  `search`, `rename`, `replace`, `add`. The pill replaces the legacy
  category toggle for `content`.
- `content` explorer: drop the two duplicate inputs and the unnecessary
  third input. Keep one searchbox plus the mode pill. The pill swaps
  between `search` (searches body content) and `replace` (FnR replace
  flow over filtered files).
- When mode is `rename` or `replace`, the searchbox expands into a
  toolbar-wide island. The expanded island visually covers the toolbar
  menus until dismissed. View and sort menus move to the right side of
  the toolbar in minimalist style; FnR island grows from the left and
  occupies their previous space while open.
- New `crear` button: lucide-plus icon plus label `crear`, located right
  of the searchbox and left of `view`/`sort`. Submitting with `crear`
  reads the current FnR string, resolves any templating, and queues an
  `add` op for the active explorer's node kind via
  `OperationQueueService`.

## State Model

`FnRIslandService` (Svelte rune service) owns:

- `activeExplorerId: string`
- `mode: 'search' | 'rename' | 'replace' | 'add'`
- `query: string` (raw FnR text, may include `{{tokens}}`)
- `flags: { matchCase: bool, wholeWord: bool, regex: bool }`
- `expanded: bool` (toolbar takeover)
- `submit(): void` — resolves tokens, validates flags, dispatches op.

Service is panel-scoped, never mounted twice. `panelExplorer.svelte`
subscribes and renders the island bound to active explorer.

## Templating Tokens

All tokens use double brace `{{name}}`. Single brace `{name}` is
ignored (no legacy fallback). Unknown token = inline error, submit
disabled. Token resolution runs once per submit; result is plain text
spliced back into `query`.

| Token | Meaning |
|-------|---------|
| `{{base}}` | Selected node label (rename/replace) or about-to-create label (add). |
| `{{filter}}` | Snapshot of all currently filtered files: data + metadata, joined as fenced markdown blocks. Snapshot frozen at `submit()`. |
| `{{date[:expr]}}` | Default `now`. `expr` accepts `datejs`-style math (`+1d`, `-2h`, `+1mo`) or natural language (`today`, `tomorrow`, `in two hours`). Multi-node ops auto-increment by `+1d` unless overridden. |
| `{{counter[:pad]}}` | Per-op increment starting at 1. `pad` = digit width (e.g. `{{counter:3}}` → `001`). |
| `{{name}}` | Active node filename without extension. |
| `{{ext}}` | Extension. |
| `{{parent}}` | Immediate parent folder name. |
| `{{path}}` | Full vault path. |
| `{{ctime[:fmt]}}` | File creation timestamp; `fmt` Moment-compatible. |
| `{{mtime[:fmt]}}` | Modified timestamp; same format rules. |
| `{{exif:KEY}}` | EXIF tag value (image files only). Unknown KEY → empty. |
| `{{id3:KEY}}` | ID3 tag value (audio files only). KEY ∈ `title, artist, album, track, year`. |
| `{{doc:KEY}}` | Document metadata (e.g. PDF `title`, `author`). |
| `{{size[:unit]}}` | File size. `unit` ∈ `b, kb, mb, gb`. |
| `{{checksum:ALG}}` | `ALG` ∈ `md5, sha1, sha256`. Computed lazily. |

Token resolution lives in `serviceFnRTemplate.ts`. Date parsing is its
own module (`serviceFnRDateParser.ts`) wrapping `chrono-node` or a
custom mini-parser — engineer's choice as long as no `eval` or
`new Function` is used.

## Modifier Toggles

- `match case` — substring search/replace honors letter case.
- `whole word` — wraps token in `\b...\b` semantics.
- `regex (JS)` — interprets `query` as JS regex literal. Mutually
  exclusive with `whole word`. Invalid regex = inline error.

## Submit Semantics

- `search` → updates `serviceFilter` query.
- `rename` → for each selected node, queues `RENAME_*` op with
  resolved string per node (counter + base re-evaluated per iteration).
- `replace` → for each filtered file, queues `REPLACE_IN_FILE` op
  honoring flags.
- `add` → single `ADD_*` op for the active explorer's node kind. The
  string post-resolution becomes the new node label.

## Acceptance

- `content` explorer renders exactly one input. Toggling pill
  search/replace does not duplicate inputs.
- Toolbar takeover hides existing menus while expanded; menus restore
  on dismiss.
- Tokens with unknown name show inline error and disable submit.
- Snapshot of `{{filter}}` is captured at submit, not at every
  keystroke.
- Regex flag rejects malformed patterns and shows the JS error
  message inline.
- `crear` queues exactly one op per click and clears the input on
  success.

## Anti-Goals

- No `eval` or `Function`-based template resolution.
- No bypass of `OperationQueueService`.
- No vault-relative writes triggered from the searchbox without an op.
- No legacy single-brace `{name}` syntax.
