---
title: BT5-050 — Canonical Snippet Reveal action
type: issue
status: completed
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T14:32:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, initiative/polish, release/1.2.0, snippets, context-menu]
---

# BT5-050 — Canonical Snippet Reveal action

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

Keep a single Reveal in system explorer action for Snippets, with the same
localized label, semantic icon and action identity as the intercepted Files
equivalent. Remove duplicate or non-localized variants without conflating Reveal
with Open in default app.

## Acceptance criteria

- [x] Snippet context menu contains one Reveal in system explorer action.
- [x] Label is localized and never displays an i18n key.
- [x] Icon and stable id match the canonical reveal action policy.
- [x] The action resolves the snippet's config-dir path safely.
- [x] Open in default app remains a separate action when supported.
- [x] Tests cover catalog/config projection and unsupported platform fallback.

## Blocked by

None — can start immediately.

## Completion evidence — 2026-07-22

- Product commit: `70d36f56 fix(snippets): canonicalize reveal action`.
- The installed Obsidian `obsidian.asar` was inspected read-only: its intercepted Files
  action uses `lucide-arrow-up-right`, Windows/Linux “Show in system explorer”, and a
  Finder-specific macOS label. Vaultman now mirrors that contract through
  `logicSystemExplorer`.
- The registered label is a translated string rather than a context-free function, so both
  the live menu and Settings catalog render copy instead of the action id.
- `snippet.see-details` migrates to `snippet.reveal` during layout merge, preserving saved
  order and visibility; Open in default app remains a distinct action.
- The capability gate hides Reveal where `showInFolder` is unavailable, while path resolution
  uses `cssSnippetPath` and therefore honors a non-default `configDir`.
- Verification: 86/86 related tests green; dedicated behavior/config suite 3/3 green;
  changed-path ESLint and `git diff --check` green. Global type-check retains only the three
  previously attributed overflow diagnostics in the preserved foreign worktree edit.
