---
title: Phase 0 plan — Tasks 5-6 links and vault git
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
# Tasks 5–6

### Task 5: Turn `.agents/docs` into a symlink and neutralise it for git

After Task 3/4 the phones hold `.agents/docs` as ordinary tracked files — git on `pc`
traversed the junction, so the clone materialised them. This task replaces that
directory with a symlink into the vault, reproducing the `pc` topology, and then stops
git from ever recording the change.

The order inside this task is critical: **neutralise before removing**, or git sees a
mass deletion in the window between the two.

**Files:**
- Modify: `~/vaultman/.git/info/exclude` on m1 and m2 (node-local, never propagates)
- Replace: `~/vaultman/.agents/docs` — directory becomes symlink

- [ ] **Step 1: Confirm the failing state on m2**

```bash
cd ~/vaultman
ls -ld .agents/docs
git ls-files .agents/docs | wc -l
```

Expected: a `drwx` directory, and a non-zero count of tracked files.

- [ ] **Step 2: Merge the duplicate into the vault before destroying it**

The clone's copy came from `pc`, and the vault copy on the phone may hold files `pc`
never received. Copy only what is newer or missing, never overwrite newer with older:

```bash
VAULT="$HOME/storage/shared/Documents/start of the road/x/Agent Docs"
cd ~/vaultman/.agents/docs
rsync -a --update --itemize-changes ./ "$VAULT/"
```

Expected: an itemised list of the files copied. `--update` guarantees a newer file in
the vault is never replaced by an older one from the clone.

If `rsync` is unavailable on the device, use:

```bash
cp -a -u -v ./. "$VAULT/"
```

- [ ] **Step 3: Verify nothing was lost in the merge**

```bash
VAULT="$HOME/storage/shared/Documents/start of the road/x/Agent Docs"
cd ~/vaultman/.agents/docs
find . -type f | sort > /tmp/docs-clone.txt
( cd "$VAULT" && find . -type f | sort ) > /tmp/docs-vault.txt
comm -23 /tmp/docs-clone.txt /tmp/docs-vault.txt
```

Expected: **empty output** — every file in the clone's copy now exists in the vault.
Any line printed is a file that would be lost; stop and resolve it before Step 4.

- [ ] **Step 4: Neutralise the path for git BEFORE touching it**

```bash
cd ~/vaultman
git update-index --skip-worktree $(git ls-files .agents/docs)
git status --porcelain | wc -l
```

Expected: `0`. `--skip-worktree` tells git to ignore working-tree state for those paths
entirely, so the coming replacement is invisible to `git status`.

This is node-local: it lives in the index, not in a committed file, so it never
propagates to `pc` or the other phone.

- [ ] **Step 5: Replace the directory with the symlink**

```bash
cd ~/vaultman/.agents
rm -rf docs
ln -s "$HOME/storage/shared/Documents/start of the road/x/Agent Docs" docs
ls -ld docs
```

Expected: `lrwxrwxrwx ... docs -> /data/data/com.termux/files/home/storage/shared/Documents/start of the road/x/Agent Docs`

Verified on 2026-08-13 that a symlink in Termux home pointing into `/sdcard` supports
both read and write.

- [ ] **Step 6: Verify read and write through the link**

```bash
cd ~/vaultman
ls .agents/docs | head -5
echo "probe $(date -Iseconds)" > .agents/docs/__probe.md
ls -l "$HOME/storage/shared/Documents/start of the road/x/Agent Docs/__probe.md"
rm -f .agents/docs/__probe.md
```

Expected: the vault's top-level entries (`architecture`, `archive`, `current`,
`sessions`, `index.md`, `Recent Notes.base`), then the probe file listed at the vault
path, then removed.

- [ ] **Step 7: Verify git remained blind to all of it**

```bash
cd ~/vaultman
git status --porcelain | wc -l
git ls-files -v .agents/docs | head -3
```

Expected: `0`, and lines beginning with `S` (skip-worktree flag set).

**If `git status` is non-zero here, the symlink leaked into git's view.** Restore with
`git checkout -- .agents/docs` and re-do from Step 4.

- [ ] **Step 8: Add a belt-and-braces node-local exclude**

```bash
cd ~/vaultman
grep -qxF '.agents/docs' .git/info/exclude || echo '.agents/docs' >> .git/info/exclude
tail -3 .git/info/exclude
```

Expected: the entry present. This protects against a future `git add -A` that clears
skip-worktree flags.

- [ ] **Step 9: Repeat Steps 1–8 on m1**

Run every command above over `ssh -p 8022 u0_a315@poco-x6-pro-5g`, with the same vault
path — m1 uses the identical Termux home layout. Confirm at Step 3 that
`2026-08-14-sisyphus-gpt56-esbuild-termux.md` survives into the vault.

- [ ] **Step 10: Commit nothing**

This task produces **no commit on any node**. Every change is either node-local index
state or content that already lives in the vault. If `git status` shows anything to
commit, something went wrong — return to Step 4.

---

### Task 6: Give the Obsidian vault a real `.git` on m1 and m2

The vault's `.git` is currently a 55-byte gitfile reading
`gitdir: C:/Users/vic_A/Desktop/Start of The Road/.git`, replicated from Windows with
CRLF. Git is inoperative for the vault on both phones.

**Files:**
- Replace: `<vault>/.git` — gitfile becomes a real repository
- Note: the vault lives on `/sdcard`, where symlinks cannot be created; a real `.git`
  directory is fine there, only links are refused.

- [ ] **Step 1: Confirm the failing state on m2**

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
cd "$SOTR" && git status 2>&1 | head -3
file "$SOTR/.git"
```

Expected: a git error, and `ASCII text, with CRLF line terminators`.

- [ ] **Step 2: Find the vault's real repository location on pc**

```bash
ssh vic_a@meibbopc "git -C \"C:\Users\vic_A\Desktop\Start of The Road\" rev-parse --abbrev-ref HEAD & git -C \"C:\Users\vic_A\Desktop\Start of The Road\" remote -v"
```

Expected: the branch name and the GitHub remote for Start of The Road. Record both —
the clone in Step 4 needs the branch, and Step 6 needs the remote URL.

- [ ] **Step 3: Preserve the current vault content**

The vault holds live notes. Nothing may be checked out over them.

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
mv "$SOTR/.git" "$SOTR/.git-broken-gitfile"
```

Expected: no output. The broken gitfile is kept until Task 8.

- [ ] **Step 4: Create a real repository in place without touching the working tree**

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
cd "$SOTR"
git init
git remote add pc ssh://vic@meibbopc:2222/mnt/c/Users/vic_A/Desktop/Start\ of\ The\ Road
git fetch pc
```

Expected: `Initialized empty Git repository`, then fetch output listing branches.

If the WSL path with spaces causes trouble, URL-encode the spaces as `%20`:
`ssh://vic@meibbopc:2222/mnt/c/Users/vic_A/Desktop/Start%20of%20The%20Road`

- [ ] **Step 5: Attach the working tree to the fetched history without overwriting it**

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
cd "$SOTR"
BR=$(git branch -r | grep -m1 'pc/' | sed 's|.*pc/||' | tr -d ' ')
git reset --mixed "pc/$BR"
git status --porcelain | head -20
```

Expected: `reset` reports nothing checked out; `git status` now shows the real
differences between the phone's vault and `pc`'s. **No file content was modified** —
`--mixed` moves the index only.

- [ ] **Step 6: Add the GitHub origin recorded in Step 2**

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
cd "$SOTR" && git remote add origin <URL-from-step-2> && git remote -v
```

Expected: `origin` and `pc` listed.

- [ ] **Step 7: Verify git now works in the vault**

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
cd "$SOTR"
git status >/dev/null && echo "STATUS_OK"
git log --oneline -1
```

Expected: `STATUS_OK` and a commit line. This is the check that failed at Step 1.

- [ ] **Step 8: Enforce publication scope — local commits must never reach GitHub**

Decision D6: commit scope and publication scope are different things. `.gitignore`
cannot express this, because an ignored path is never committed and so never travels
between nodes either. The mechanism is a restricted push refspec plus a hook.

First, restrict what a bare `git push origin` will send. Replace `<public-branch>` with
the branch name recorded in Task 6 Step 2:

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
cd "$SOTR"
git config remote.origin.push 'refs/heads/<public-branch>:refs/heads/<public-branch>'
git config --get remote.origin.push
```

Expected: the refspec echoed back.

- [ ] **Step 9: Add a pre-push hook that refuses any other ref to origin**

The refspec governs the default push; the hook governs an explicit one. Write this to
`<vault>/.git/hooks/pre-push` and make it executable:

```bash
#!/data/data/com.termux/files/usr/bin/bash
# Publication scope guard (decision D6). Only the public branch may reach GitHub.
remote_name="$1"
remote_url="$2"
public_branch="<public-branch>"

case "$remote_url" in
  *github.com*)
    while read -r local_ref _ _ _; do
      [ -z "$local_ref" ] && continue
      if [ "$local_ref" != "refs/heads/$public_branch" ]; then
        echo "pre-push: refused. '$local_ref' is publication-scope 'local'." >&2
        echo "          Only refs/heads/$public_branch may be pushed to GitHub." >&2
        echo "          Use the peer remotes (pc, m1, m2) for local units." >&2
        exit 1
      fi
    done
    ;;
esac
exit 0
```

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
chmod +x "$SOTR/.git/hooks/pre-push"
```

- [ ] **Step 10: Verify the guard refuses and permits correctly**

```bash
SOTR="$HOME/storage/shared/Documents/start of the road"
cd "$SOTR"
git checkout -b probe-local-scope
git push --dry-run origin probe-local-scope; echo "rc=$?"
```

Expected: the `pre-push: refused` message and `rc=1`. This is the acceptance criterion
the spec's sanitation step 5 asks for.

Then confirm the peer remote still accepts it, and clean up:

```bash
git push --dry-run pc probe-local-scope; echo "rc=$?"
git checkout - && git branch -D probe-local-scope
```

Expected: `rc=0` for the peer push — local units travel between nodes freely, they just
never reach GitHub.

- [ ] **Step 11: Repeat Steps 1–10 on m1**

Identical commands over `ssh -p 8022 u0_a315@poco-x6-pro-5g`. The vault path is the
same on both phones. The hook is `.git/hooks/`, which is node-local and not carried by
clone, so it must be installed on each node separately.
