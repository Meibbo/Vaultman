---
title: R-GIT-VSCODE — VSCode/GitLens features + hunk staging + agent-diff curation
type: research-record
status: active
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/index|megadump research]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/research
  - initiative/draft
---

# R-GIT-VSCODE — VSCode + GitLens + chunk-selection

Feeds MD-O1 AND our own multi-agent diff-review workflow (the dev's "selección por chunks después del
trabajo de un agente" ask).

## Part A — user features

### VSCode native Source Control
- SCM view: two groups — **Changes** (working tree) vs **Staged Changes** (index).
- Gutter indicators: green=added, blue=modified, red triangle=deleted; clickable → inline diff. Tunable via
  `scm.diffDecorations*`.
- Diff editor has per-hunk **Stage / Revert** gutter buttons.
- **Stage Selected Ranges**: select lines in diff → gutter Stage, right-click, or command palette → stages
  only that block. Unstage equivalent.
- Source Control **Graph** (commits/branches), **Timeline** (per-file history), amend, undo-last-commit,
  AI commit-message, Code-Review button.

### GitLens
- Blame: current-line (end-of-line annotation), file blame (inline), gutter blame, **CodeLens** (author/
  commit above functions/classes).
- Visual: **file heatmap** (age color), **Visual File History** timeline.
- History: **Line History** view, **File History** view, revision navigation.
- **Commit Graph** (branches/commits/WIP/PRs), interactive rebase editor (drag reorder/squash/edit),
  **Worktrees UI**, Compare/Search&Compare, rich hovers.
- Collaboration: Launchpad (PRs by status), Code Suggest, Cloud Patches, deep links; AI commit/stash msgs.

## Part B — chunk / hunk-level selection (the key ask)

### Concept
A **hunk** = contiguous block of changed lines; git splits diffs into hunks that can be staged/skipped/
edited independently → partial staging → focused commits.

### git CLI — interactive staging
- `git add -i` menu; `git add -p` / `--patch` enters per-hunk mode. Prompt `Stage this hunk [y,n,a,d,s,e,?]`:
  **y** stage, **n** skip, **a** stage rest of file, **d** skip rest, **s** split into smaller hunks,
  **e** manually edit hunk (line-level surgical), **?** help.
- Also `git reset -p` (unstage), `git checkout -p` / `git restore -p` (discard), `git stash push -p` (stash hunks).

### VSCode UI
- Select lines in diff → **Stage Selected Ranges** (right-click / command / gutter), or per-hunk gutter
  Stage/Revert. Dual SCM sections show staged vs unstaged clearly.

### TUIs
- **lazygit**: Files panel → Enter → diff; `Space` stage a line, `v` visual-select range, `a` whole hunk;
  staged appear in Staged panel. Hunk vs line mode configurable. Converts many off `git add -p`.
- **gitui** (Rust): stage/unstage/revert/reset files, hunks, individual lines; fast.

### Jujutsu (jj) — AI-native post-hoc curation
- Working dir = current commit (no staging ceremony). Workflow: agent generates → everything auto-snapshots
  → `jj split` surgically divides into logical commits → `jj squash`/`jj rebase`/`jj absorb` to curate.
- Operation log (`jj obslog`) recovers any prior state → safety net for agent mistakes. Cheap `jj new`
  workspaces. Some workflows add temporary `INTENTS-*.md` capturing the prompts, deleted after curation.

### Agent-diff review loop (recommended)
1. **Isolate**: each agent in its own **git worktree** (own HEAD + index, shared object store) → parallel,
   no collisions.
2. **Review + stage**: fetch agent branch → VSCode SCM → review each hunk (gutter inline / diff editor) →
   stage accepted hunks (gutter Stage or Stage Selected Ranges); reject = leave unstaged / `git restore -p`.
3. **Iterate**: commit accepted hunks w/ intent-tied message; ask agent to redo rejected sections.
4. **Verify gate** before merge: diff touches only allowed files; tests exist; interfaces intact; human can
   articulate the semantic change; no formatting-mixed-with-logic.

| Scenario | Tools |
|----------|-------|
| GUI review | VSCode SCM + GitLens + Stage Selected Ranges |
| Terminal | lazygit or gitui |
| AI post-hoc curation | jujutsu `jj split`/`jj squash` |
| Automated gate | CI: `git diff --stat`, `git log --format=%B`, test runner |

## Applicability to Vaultman

- MD-O1: model VM's git add-on UX on VSCode+GitLens (per-hunk gutter stage, blame heatmap, line/file
  history, commit graph) — these are the proven primitives.
- Our workflow: adopt **worktree-per-agent + per-hunk accept/reject**; evaluate **jujutsu** for curating
  messy multi-agent commits (directly addresses the dev's chunk-selection concern). Possible future VM
  "operations/review" scene (cf. `vm_operations` companion, MD-F5) = in-Obsidian hunk-accept UI over agent diffs.

## Sources

- https://code.visualstudio.com/docs/sourcecontrol/overview · /staging-commits
- https://help.gitkraken.com/gitlens/gitlens-features/ · https://git-scm.com/book/en/v2/Git-Tools-Interactive-Staging
- https://github.com/gitui-org/gitui · jujutsu refs (ianbull.com/posts/jj-vibes, panozzaj.com jj for AI agents)
