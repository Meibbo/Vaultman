---
title: Phase 0 plan — Tasks 1-2 rescue and gitattributes
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
# Tasks 1–2

### Task 1: Inventory and rescue unique content on the phones

Both phones carry 19 untracked paths each. Most are `.agents/docs/...` inside the
duplicate, whose real home is the vault. A few are genuine code or config that exists
nowhere else. Nothing may be deleted on inference.

**Files:**
- Create: `~/vaultman-preflight/manifest-m2.txt`, `~/vaultman-preflight/manifest-m1.txt`
- Create: `~/vaultman-preflight/rescued/` (staging for content that must survive)
- Read: `~/vaultman` on m1 and m2

- [ ] **Step 1: Capture the untracked and deleted inventory on m2**

Run on m2:

```bash
mkdir -p ~/vaultman-preflight/rescued
cd ~/vaultman
{
  echo "### untracked"
  git status --porcelain | grep '^??' | sed 's|^?? ||'
  echo "### deleted"
  git status --porcelain | grep '^ D' | sed 's|^ D ||'
} > ~/vaultman-preflight/manifest-m2.txt
wc -l ~/vaultman-preflight/manifest-m2.txt
```

Expected: a file of roughly 396 lines (19 untracked entries + 377 deleted paths).

- [ ] **Step 2: Capture the same inventory on m1**

Run on m2:

```bash
ssh -p 8022 u0_a315@poco-x6-pro-5g 'cd ~/vaultman && { echo "### untracked"; git status --porcelain | grep "^??" | sed "s|^?? ||"; echo "### deleted"; git status --porcelain | grep "^ D" | sed "s|^ D ||"; }' > ~/vaultman-preflight/manifest-m1.txt
wc -l ~/vaultman-preflight/manifest-m1.txt
```

Expected: a comparable file. m1 is known to hold at least one session doc that m2 does
not: `.agents/docs/sessions/2026-08-14-sisyphus-gpt56-esbuild-termux.md`.

- [ ] **Step 3: Verify the deleted paths are recoverable from history, not real losses**

The 377 deleted entries are paths present in the index but absent from the phone's
working tree. If they exist in `pc`'s tree, they are rclone omissions and the re-clone
restores them; nothing needs rescuing.

Run on m2, for a sample of five:

```bash
cd ~/vaultman
git status --porcelain | grep '^ D' | sed 's|^ D ||' | head -5 | while read -r p; do
  printf '%s -> ' "$p"
  ssh vic_a@meibbopc "if exist \"C:\\Users\\vic_A\\Desktop\\vaultman\\${p//\//\\}\" (echo ON_PC) else (echo MISSING_ON_PC)"
done
```

Expected: `ON_PC` for every sample. If any returns `MISSING_ON_PC`, stop and report to
the dev before proceeding — that path exists in no working tree and only in git history.

- [ ] **Step 4: Separate doc paths from non-doc paths on m2**

Doc paths live in the duplicate and are handled by Task 5. Non-doc paths are the real
rescue targets.

Run on m2:

```bash
cd ~/vaultman
git status --porcelain | grep '^??' | sed 's|^?? ||' | grep -v '^\.agents/docs/' 
```

Expected output on m2 (verified 2026-08-13):

```
.agents/skills/vm-work-visualizer/scripts
.mcp.json
eslint_output.txt
vite.mobile.config.ts
```

- [ ] **Step 5: Compare each non-doc path against pc before deciding**

`eslint_output.txt` is a build artifact and is not rescued. The other three are
candidates. Run on m2:

```bash
cd ~/vaultman
for p in .mcp.json vite.mobile.config.ts; do
  printf '=== %s\n  m2 md5: ' "$p"; md5sum "$p" | cut -d' ' -f1
  printf '  pc     : '
  ssh vic_a@meibbopc "certutil -hashfile \"C:\\Users\\vic_A\\Desktop\\vaultman\\${p}\" MD5 | findstr /v \":\"" 2>/dev/null | tr -d ' \r' | head -1
done
```

Expected: either identical hashes (nothing unique, no rescue needed) or a difference /
absence on `pc` (unique to m2, must be rescued).

- [ ] **Step 6: Stage everything unique into the rescue folder**

Run on m2, for each path Step 5 showed as unique or absent on `pc`:

```bash
cd ~/vaultman
cp -a --parents .mcp.json vite.mobile.config.ts ~/vaultman-preflight/rescued/ 2>/dev/null
cp -a --parents .agents/skills/vm-work-visualizer/scripts ~/vaultman-preflight/rescued/
find ~/vaultman-preflight/rescued -type f | sort
```

Expected: a listing of exactly the files that must survive the re-clone.

- [ ] **Step 7: Repeat Steps 4–6 on m1**

Run the same three commands over ssh against m1, writing to
`~/vaultman-preflight/rescued-m1/` on m1 itself. m1's known-unique doc
(`2026-08-14-sisyphus-gpt56-esbuild-termux.md`) is a doc path and is handled by Task 5,
not here — but it must be confirmed present in the vault before Task 4 destroys the
duplicate:

```bash
ssh -p 8022 u0_a315@poco-x6-pro-5g 'ls -l ~/vaultman/.agents/docs/sessions/2026-08-14-sisyphus-gpt56-esbuild-termux.md "$HOME/storage/shared/Documents/start of the road/x/Agent Docs/sessions/2026-08-14-sisyphus-gpt56-esbuild-termux.md" 2>&1'
```

Expected: both paths listed. If the vault copy is missing, copy it there before
continuing:

```bash
ssh -p 8022 u0_a315@poco-x6-pro-5g 'cp -a ~/vaultman/.agents/docs/sessions/2026-08-14-sisyphus-gpt56-esbuild-termux.md "$HOME/storage/shared/Documents/start of the road/x/Agent Docs/sessions/"'
```

- [ ] **Step 8: Get explicit dev confirmation**

Present the contents of both `rescued/` folders and the list of paths being discarded
(build artifacts, doc duplicates already present in the vault). **Do not proceed to
Task 3 without an explicit go-ahead.** This is the only irreversible gate in the plan.

---

### Task 2: Land `.gitattributes` on pc

Without this, every fresh clone on a phone re-acquires CRLF from `core.autocrlf=true`
on `pc` and F2 returns on the first checkout.

**Files:**
- Create: `C:\Users\vic_A\Desktop\vaultman\.gitattributes`

- [ ] **Step 1: Verify the file does not exist yet**

Run on m2:

```bash
ssh vic_a@meibbopc "if exist C:\Users\vic_A\Desktop\vaultman\.gitattributes (echo EXISTS) else (echo ABSENT)"
```

Expected: `ABSENT` (verified 2026-08-13).

- [ ] **Step 2: Create it on pc**

Write this content to `C:\Users\vic_A\Desktop\vaultman\.gitattributes`:

```gitattributes
* text=auto eol=lf

*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.svg text eol=lf
*.woff binary
*.woff2 binary
*.ttf binary
*.ico binary
*.pdf binary
```

Transfer it by writing locally and using `scp` to a path that does not yet exist — it
creates rather than overwrites:

```bash
scp /path/to/gitattributes vic_a@meibbopc:"C:/Users/vic_A/Desktop/vaultman/.gitattributes"
```

- [ ] **Step 3: Commit it on pc**

`.gitattributes` is repo-root, not `.agents/`, so it is a normal code-scope commit.

```bash
ssh vic_a@meibbopc 'git -C "C:\Users\vic_A\Desktop\vaultman" add .gitattributes && git -C "C:\Users\vic_A\Desktop\vaultman" commit -m "chore: normalise line endings to LF across platforms"'
```

Expected: `1 file changed, 12 insertions(+)`.

Do **not** push. The Branch Policy forbids pushing unless the dev asks, and Tasks 3–4
clone from `pc` directly, not from GitHub.

- [ ] **Step 4: Verify git-direct exposes the new commit**

Run on m2:

```bash
git ls-remote ssh://vic@meibbopc:2222/mnt/c/Users/vic_A/Desktop/vaultman refs/heads/sandbox
```

Expected: a SHA that differs from `2bcf61ec7da8dec8a4b6ddfaae5e3fce59aa47e9` (the tip
recorded on 2026-08-13 before this task).
