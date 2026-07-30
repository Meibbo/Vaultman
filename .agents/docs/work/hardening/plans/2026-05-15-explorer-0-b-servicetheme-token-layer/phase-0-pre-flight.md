---
title: Phase 0 — Pre-flight
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B plan]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/plan
  - explorer/theme
---

# Phase 0 — Pre-flight

Run these checks before T1. They establish a baseline and verify the branch state matches assumptions in the spec.

- [ ] **Step 1: Confirm branch**

Run: `git branch --show-current` Expected: `claude/explorer`

- [ ] **Step 2: Confirm worktree**

Run: `git rev-parse --show-toplevel` Expected: ends with `.claude/worktrees/jovial-wilson-f81c67`

- [ ] **Step 3: Confirm working tree clean**

Run: `git status --short` Expected: empty (or only doc-state changes from this brainstorm — which should already be committed if executing fresh). If there are unrelated uncommitted changes, stop and ask the user.

- [ ] **Step 4: Confirm key files exist**

Run:

```bash
ls src/services/serviceTheme.ts \
   src/services/serviceTheme.svelte.ts \
   src/types/typeElasticUi.ts \
   src/types/typeSettings.ts \
   src/styles/_elastic.scss \
   src/styles/popup/_islands.scss \
   src/styles/explorer/_virtual-list.scss \
   src/main.ts \
   src/main.scss \
   src/components/frame/frameVaultman.svelte \
   src/components/settings/SettingsUI.svelte \
   uno.config.ts \
   test/unit/services/serviceTheme.test.ts \
   test/unit/services/serviceThemeRunes.test.ts
```

Expected: all listed.

- [ ] **Step 5: Run baseline gate**

Run: `pnpm verify` Expected: pass.

Record the exact unit and component test counts in your local notes (needed for verification at the end — counts must not regress except by the deletions called out in T13/T14).

- [ ] **Step 6: Confirm the spec is committed**

Run: `git log --oneline -1 -- .agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/` Expected: a recent commit exists. If the spec is uncommitted, commit it before starting T1:

```bash
git add .agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/ \
        .agents/docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index.md
git commit -m "$(cat <<'EOF'
docs(0-b): brainstorm output — spec and backlog entries

Spec for sub-system 0-B (serviceTheme unification + theme preset
registry). See .agents/docs/work/hardening/specs/2026-05-15-explorer-
0-b-servicetheme-token-layer/index.md for the decision summary.

Backlog updated with 11 new sub-systems (5–12 + M, N, O).
EOF
)"
```

- [ ] **Step 7: Read the spec**

Read each file in `.agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/` once before T1. They are the contract this plan implements.

When all 7 pre-flight steps pass, proceed to [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-1-types-and-builtins|Phase 1]].
