---
title: Megadump research records
type: research-index
status: active
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/index|onenote companion megadump]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/research
  - initiative/draft
---

# Megadump Research Records

Read-only Explore subagent research dispatched 2026-06-03 against the megadump asks.
Each record preserves the agent's technical findings + sources. Not decisions.

## Records

| ID | Topic | Feeds | Source |
|----|-------|-------|--------|
| R-CALLOUT | callout-manager plugin mechanics + API | MD-A2 ; theme-scene providers ; CR-1 | [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/R-CALLOUT|R-CALLOUT]] |
| R-STYLESET | style-settings CSS `/* @settings */` parsing | MD-A3 ; theme-builder ; CR-1 | [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/R-STYLESET|R-STYLESET]] |
| R-KRITA | krita license (GPLv3) + layer/canvas model | MD-D3 ; canvas/layers ; CR (legal) | [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/R-KRITA|R-KRITA]] |
| R-OBSIDIAN-GIT | obsidian-git features + architecture | MD-O1 git add-on | [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/R-OBSIDIAN-GIT|R-OBSIDIAN-GIT]] |
| R-GIT-VSCODE | VSCode/GitLens features + hunk staging + agent-diff curation | MD-O1 ; agent-diff review workflow | [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/R-GIT-VSCODE|R-GIT-VSCODE]] |

## Cross-cut takeaways

- **callout-manager + style-settings share one pattern** Vaultman should adopt for the theme-scene:
  scan stylesheets (theme + snippets + plugins) → parse declarative blocks (CSS-comment YAML or
  `.callout[data-callout]` selectors) → represent as typed controls → apply as `:root` CSS vars +
  `body` classes → persist to `data.json` → expose a provider/event API. This is the concrete spec
  basis for MD-A3/A5 and the "theme builder" (MD-A4).
- **style-settings has NO public read API** (other plugins can't read values; only trigger re-parse via
  `app.workspace.trigger("parse-style-settings")`). Vaultman's edge = a structured, queryable settings
  model + provider API (the bridge angle, MD-F2).
- **Krita = GPLv3**: concepts/UX freely referenceable; copying code forces GPLv3 on the plugin. Borrow
  the model/view split (Image=data+layers vs View=non-destructive viewport) as a reference only.
- **obsidian-git already ships** line-authoring (blame), diff view, history, hunk stage/reset. Vaultman's
  differentiation (MD-O1) = interactive line-evolution timeline, temporal "file-as-of-commit" view,
  structured line-history API, conflict-aware blame.
- **Agent-diff curation (the dev's chunk-selection ask)**: hunk staging = `git add -p` (y/n/a/d/s/e),
  VSCode "Stage Selected Ranges" + gutter Stage/Revert, lazygit/gitui TUIs, and jujutsu (`jj split`/
  `jj squash`) for post-hoc splitting of messy agent commits. Worktree-per-agent + per-hunk accept/reject
  is the recommended review loop. Directly relevant to our own multi-agent workflow AND a potential
  Vaultman feature.
