---
title: Phase 0 plan — Tasks 3-4 re-clone
type: plan-shard
status: ready
lifecycle: active
parent: "[[docs/work/pkm-ai/items/2026-08-13-node-sync-engine/plan/index|phase-0-plan]]"
created_by: claude-opus-5
updated_by: claude-opus-5
tags:
  - agent/work
  - initiative/pkm-ai
dateCreated: 2026-08-13T20:00:00
dateUpdated: 2026-08-13 20:00:00
---
# Tasks 3–4

### Task 3: Re-clone vaultman on m2

Cloning from `pc` rather than from GitHub is mandatory: `.agents/` is committed locally
and never pushed, so a GitHub clone would arrive without the agent tooling, policies and
docs history.

**Files:**
- Create: `~/vaultman-new` (becomes `~/vaultman`)
- Rename: `~/vaultman` → `~/vaultman-old-YYYYMMDD` (kept until Task 8)

- [ ] **Step 1: Confirm the failing state before the change**

Run on m2:

```bash
cd ~/vaultman
git status --porcelain | wc -l
git worktree list | wc -l
```

Expected before: `1854` and `31`. These are the two numbers this task must drive to
`0` and `1`.

- [ ] **Step 2: Confirm the rescue gate was passed**

```bash
ls -R ~/vaultman-preflight/rescued | head -20
```

Expected: the files Task 1 staged. **If this folder is empty and Task 1 Step 8 was not
confirmed by the dev, stop.**

- [ ] **Step 3: Clone from pc over git-direct**

```bash
cd ~
git clone --branch sandbox \
  ssh://vic@meibbopc:2222/mnt/c/Users/vic_A/Desktop/vaultman \
  ~/vaultman-new
```

Expected: `Cloning into '/data/data/com.termux/files/home/vaultman-new'...` followed by
object counts and `Checking out files: 100%`. Roughly 50 MB transferred.

Note: the clone brings the junction target's content as ordinary files, because git on
`pc` traverses the junction. That is expected and is undone by Task 5.

- [ ] **Step 4: Verify the clone is clean**

```bash
cd ~/vaultman-new
git status --porcelain | wc -l
git worktree list
git log --oneline -1
```

Expected: `0`; a single worktree line pointing at `~/vaultman-new`; and the tip commit
from Task 2 Step 4.

**If `git status` is not empty**, `.gitattributes` did not take effect — return to
Task 2 rather than continuing.

- [ ] **Step 5: Configure the remotes with logical names**

```bash
cd ~/vaultman-new
git remote remove origin
git remote add origin git@github.com:Meibbo/Vaultman.git
git remote add pc ssh://vic@meibbopc:2222/mnt/c/Users/vic_A/Desktop/vaultman
git remote add m1 ssh://u0_a315@poco-x6-pro-5g:8022/data/data/com.termux/files/home/vaultman
git remote -v
```

Expected: three remotes, each with fetch and push lines. `origin` uses SSH because
`gh auth status` reports `Git operations protocol: ssh` for account `Meibbo`.

- [ ] **Step 6: Verify each remote resolves**

```bash
cd ~/vaultman-new
git ls-remote origin refs/heads/dev | head -1
git ls-remote pc refs/heads/sandbox | head -1
```

Expected: one SHA line each. `git ls-remote m1` is expected to fail until Task 4
completes — that is normal and is re-checked in Task 8.

- [ ] **Step 7: Swap the trees**

```bash
cd ~
mv ~/vaultman ~/vaultman-old-$(date +%Y%m%d)
mv ~/vaultman-new ~/vaultman
cd ~/vaultman && git status --porcelain | wc -l
```

Expected: `0`.

The old tree is **kept**, not deleted, until Task 8 verifies everything. It holds the
only remaining copy of anything Task 1 might have missed.

- [ ] **Step 8: Restore the rescued files**

```bash
cd ~/vaultman-preflight/rescued
find . -type f -exec cp -a --parents {} ~/vaultman/ \;
cd ~/vaultman && git status --porcelain
```

Expected: only the rescued paths appear, as `??` or `M`. Nothing else.

- [ ] **Step 9: Reinstall dependencies**

`node_modules` (626 MB) is not in git and was not cloned.

```bash
cd ~/vaultman && pnpm install
```

Expected: pnpm resolves and links the workspace. Version in use: pnpm 11.1.2, node
v26.4.0 on m2.

- [ ] **Step 10: Commit the rescued content if it belongs in git**

For each rescued path that should be tracked (decided with the dev in Task 1 Step 8):

```bash
cd ~/vaultman
git add .mcp.json vite.mobile.config.ts
git commit -m "chore(m2): restore node-local config after re-clone"
```

Skip this step entirely if Task 1 concluded that nothing unique needed tracking.

---

### Task 4: Re-clone vaultman on m1

Identical to Task 3 with m1's paths and remotes. Repeated in full rather than
cross-referenced, because the executing agent may read tasks out of order.

**Files:**
- Create: `~/vaultman-new` on m1 (becomes `~/vaultman`)
- Rename: `~/vaultman` → `~/vaultman-old-YYYYMMDD` on m1

- [ ] **Step 1: Confirm the failing state**

Run on m1 (`ssh -p 8022 u0_a315@poco-x6-pro-5g`):

```bash
cd ~/vaultman && git status --porcelain | wc -l && git worktree list | wc -l
```

Expected: a large number and `31`.

- [ ] **Step 2: Clone from pc over git-direct**

```bash
cd ~
git clone --branch sandbox \
  ssh://vic@meibbopc:2222/mnt/c/Users/vic_A/Desktop/vaultman \
  ~/vaultman-new
```

Expected: the same clone output as Task 3 Step 3.

- [ ] **Step 3: Verify the clone is clean**

```bash
cd ~/vaultman-new && git status --porcelain | wc -l && git worktree list
```

Expected: `0` and a single worktree line.

- [ ] **Step 4: Configure the remotes with logical names**

```bash
cd ~/vaultman-new
git remote remove origin
git remote add origin git@github.com:Meibbo/Vaultman.git
git remote add pc ssh://vic@meibbopc:2222/mnt/c/Users/vic_A/Desktop/vaultman
git remote add m2 ssh://u0_a315@poco-f4-gt:8022/data/data/com.termux/files/home/vaultman
git remote -v
```

Expected: three remotes. Note m1 addresses m2 as `poco-f4-gt`, and m2 addresses m1 as
`poco-x6-pro-5g` — the logical names `m1`/`m2` are what the policy uses; the hostnames
stay local to each node, per decision D11.

- [ ] **Step 5: Verify the peer remotes resolve**

```bash
cd ~/vaultman-new
git ls-remote pc refs/heads/sandbox | head -1
git ls-remote m2 refs/heads/sandbox | head -1
```

Expected: one SHA line each. m2 now answers because Task 3 completed.

- [ ] **Step 6: Swap the trees**

```bash
cd ~
mv ~/vaultman ~/vaultman-old-$(date +%Y%m%d)
mv ~/vaultman-new ~/vaultman
cd ~/vaultman && git status --porcelain | wc -l
```

Expected: `0`.

- [ ] **Step 7: Restore m1's rescued files and reinstall dependencies**

```bash
cd ~/vaultman-preflight/rescued-m1 2>/dev/null && find . -type f -exec cp -a --parents {} ~/vaultman/ \;
cd ~/vaultman && pnpm install
```

Expected: pnpm completes. If `rescued-m1` does not exist because Task 1 found nothing
unique on m1, skip the first command.

- [ ] **Step 8: Close the loop on m2's peer remote**

Run on m2:

```bash
cd ~/vaultman && git ls-remote m1 refs/heads/sandbox | head -1
```

Expected: one SHA line. This is the check that was deferred in Task 3 Step 6.
