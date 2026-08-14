---
title: Phase 0 plan — Tasks 7-8 retirement and verification
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
# Tasks 7–8

### Task 7: Retire the `vault` project from `str-rclone`

This is the root cause of F1, F2, F3 and F5. While it exists, one command re-breaks
everything the previous six tasks fixed.

**Files:**
- Modify: `~/bin/str-rclone` on m1 and m2

- [ ] **Step 1: Confirm the failing state on m2**

```bash
STR_PROJ=vault ~/bin/str-rclone m2 pc --dry-run 2>&1 | head -3
```

Expected: rclone dry-run output — proof the dangerous path is still reachable.

- [ ] **Step 2: Remove the project block**

Edit `~/bin/str-rclone` and replace this block:

```bash
  vault)
    P[m1]="$TH/vaultman"
    P[m2]="$TH/vaultman"
    P[pc]="C:/Users/vic_A/Desktop/vaultman" ;;
```

with:

```bash
  vault)
    echo "str: el proyecto 'vault' fue retirado el 2026-08-13." >&2
    echo "     vaultman viaja por git-directo, nunca por rclone (invariante 1)." >&2
    echo "     Ver .agents/docs/work/pkm-ai/items/2026-08-13-node-sync-engine/" >&2
    exit 3 ;;
```

Refusing loudly is better than deleting the case: a silent "unknown project" error
would send the dev looking for a typo instead of telling them the rule.

- [ ] **Step 3: Verify it now refuses**

```bash
STR_PROJ=vault ~/bin/str-rclone m2 pc --dry-run; echo "rc=$?"
```

Expected: the three-line explanation and `rc=3`. No rclone invocation.

- [ ] **Step 4: Verify the sotr project still works**

```bash
STR_PROJ=sotr ~/bin/str-rclone m2 pc --dry-run 2>&1 | head -5
```

Expected: normal rclone dry-run output. Task 7 must not break the vault-notes path.

- [ ] **Step 5: Apply the same edit on m1**

```bash
scp -P 8022 ~/bin/str-rclone u0_a315@poco-x6-pro-5g:~/bin/str-rclone
ssh -p 8022 u0_a315@poco-x6-pro-5g 'STR_PROJ=vault ~/bin/str-rclone m1 pc --dry-run; echo "rc=$?"'
```

Expected: the same refusal and `rc=3`.

Note: `~/bin/str-rclone` is one of the `config`-class units that `devicesync` carries.
Confirm it is in the manifest, and add it if not:

```bash
grep -c 'str-rclone' ~/.config/opencode/skills/device-sync/sync-manifest.tsv
```

---

### Task 8: Full verification sweep

Runs the five invariants the engine will later enforce, by hand. Each maps to a finding
from the spec's diagnosis shard. Only when all five pass may the old trees be deleted.

- [ ] **Step 1: Invariant — no rclone unit resolves to a path containing `.git`**

```bash
STR_PROJ=vault ~/bin/str-rclone m2 pc --dry-run >/dev/null 2>&1; test $? -eq 3 && echo "INV1 PASS" || echo "INV1 FAIL"
```

Expected: `INV1 PASS`. Guards F1/F2/F3.

- [ ] **Step 2: Invariant — no `.git` is a gitfile pointing at another platform**

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
for p in ~/vaultman/.git "$SOTR/.git"; do
  if [ -d "$p" ]; then echo "$p: DIR ok"
  else echo "$p: GITFILE -> $(cat "$p")"; fi
done
```

Expected: both report `DIR ok`. Guards F6.

- [ ] **Step 3: Invariant — every declared exposure resolves to its target**

```bash
readlink -f ~/vaultman/.agents/docs
ls ~/vaultman/.agents/docs/index.md
```

Expected: the path resolves to
`/data/data/com.termux/files/home/storage/shared/Documents/start of the road/x/Agent Docs`
and `index.md` is listed. Guards F5.

- [ ] **Step 4: Invariant — nodes converge on the same commit for urgent units**

```bash
cd ~/vaultman
echo "m2: $(git rev-parse HEAD)"
echo "pc: $(git ls-remote pc refs/heads/sandbox | cut -f1)"
echo "m1: $(git ls-remote m1 refs/heads/sandbox | cut -f1)"
```

Expected: three identical SHAs. If m2 has extra local commits from Task 3 Step 10, they
must be pushed to `pc` first:

```bash
git push pc HEAD:sandbox
```

- [ ] **Step 5: Invariant — exactly one exclusion set applies per unit**

Phase 0 does not implement the declaration format, so this is checked by inspection:
confirm that `exclude.txt` and `exclude_mobile.txt` are each referenced from exactly one
place in `~/bin/str-rclone`, and record the result in the session log for Plan B.

```bash
grep -n 'exclude' ~/bin/str-rclone
```

- [ ] **Step 6: Invariant — no Google Drive client is running on pc**

```bash
ssh vic_a@meibbopc "sc query GoogleDriveFS" 2>&1 | head -2
```

Expected: `FAILED 1060` — the service does not exist. Guards the A1 regression.

- [ ] **Step 7: End-to-end check — the dev's original goal is now reachable**

This is the acceptance test for the whole plan.

```bash
cd ~/vaultman
git fetch origin
git branch -a | grep -c 'remotes/origin/dev'
git worktree add ../wt-u121-029 -b claude/u121-029-check origin/dev
cd ../wt-u121-029 && git status --porcelain | wc -l
```

Expected: `1` for the branch count, a successful worktree creation, and `0` dirty paths
inside it. This proves worktree work against `origin/dev` is possible on m2 — which was
impossible before this plan.

Then remove the probe worktree:

```bash
cd ~/vaultman && git worktree remove ../wt-u121-029 && git branch -D claude/u121-029-check
```

- [ ] **Step 8: Delete the old trees**

Only after Steps 1–7 all pass:

```bash
rm -rf ~/vaultman-old-*
rm -rf ~/vaultman-preflight
ssh -p 8022 u0_a315@poco-x6-pro-5g 'rm -rf ~/vaultman-old-* ~/vaultman-preflight'
SOTR="$HOME/storage/shared/Documents/start of the road"
rm -f "$SOTR/.git-broken-gitfile"
```

- [ ] **Step 9: Record the outcome**

Append a session-log entry and update the spec's status:

```bash
cd ~/vaultman
# write the entry into .agents/docs/sessions/session-log.md (through the symlink)
git -C . status --porcelain
```

Expected: `0` — the log lives in the vault now, so the vault repo is where it is
committed, not `vaultman`. Commit it there:

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
cd "$SOTR" && git add "x/Agent Docs/sessions/session-log.md" && git commit -m "docs: phase 0 sanitation completed on m1 and m2"
```

This is the first commit that proves the new topology works end to end: a doc written
in the repo path, committed from the vault repo, on a phone.
