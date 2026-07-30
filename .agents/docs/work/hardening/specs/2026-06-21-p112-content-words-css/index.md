---
title: P112 Content/Words/CSS Fixes Spec
type: spec
status: approved
lifecycle: active
parent: "[[docs/work/hardening/plans/2026-06-20-p112-stability-polish/index|P112 Stability Polish]]"
created: 2026-06-21T00:00:00
updated: 2026-06-21T00:00:00
created_by: claude-sonnet-4-6
tags:
  - vaultman/p112
  - vaultman/spec
  - vaultman/hardening
---

# P112 Content/Words/CSS Fixes Spec

Hotfix slices on branch `p112-type-view-loop-fix` (worktree `hotfix-1.0.2-css-scorecard`).
Six bugs verified with obsidian-cli + code inspection on 2026-06-21.

---

## S1 — Active filters counter: nfiles/nfiles → nfiles/ntotal

**Symptom:** Active-filters island header shows `{filteredCount} / {filteredCount}` — both numbers are the same when no view type filter is active.

**Root cause:** `FilesExplorerPanel.getDisplayedCount()` (`explorerFiles.ts:493`) returns:
```typescript
{ filtered: this.getVisibleFileCount(), total: this.plugin.filterService.filteredVaultFiles.length }
```
`total` is the post-filter count, not the vault total.

**Fix:** Replace `total` with `this.plugin.app.vault.getFiles().length`.

**i18n template:** `filters.popup.filtered_files` = `{filtered} / {total} files`
- `{filtered}` = files visible in the panel (post global-filter + post view-type-filter)
- `{total}` = all vault files (raw count)

---

## S2 — Content tab counter: shows scope total during loading

**Symptom:** While searching, the preview header shows `{matches} matches in {scopeTotal} file(s)` where `scopeTotal` is the full scope count (e.g. 11,000 files) instead of the matched-files count.

**Root cause:** `pageFilters.svelte:285-288`:
```typescript
const resultFileCount =
    hasContentQuery && contentPreviewResult && !contentPreviewResult.isLoading
        ? contentPreviewMatchedFileCount(contentPreviewResult)
        : null;
```
The `!contentPreviewResult.isLoading` guard prevents `resultFileCount` from being set during loading.
`contentPreviewFileCount = resultFileCount ?? contentScopeSummary.baseFileCount` → falls back to scope total.

**Fix:** Remove `!contentPreviewResult.isLoading` from the condition:
```typescript
const resultFileCount =
    hasContentQuery && contentPreviewResult
        ? contentPreviewMatchedFileCount(contentPreviewResult)
        : null;
```

`contentPreviewMatchedFileCount` during loading = `result.files.length + result.moreFiles` = files matched so far.
This updates in real-time as `onUpdate` fires with partial results. Safe: when `totalMatches === 0`, the template shows "No matches" branch, not the file count branch.

---

## S3 — CSS: search input needs border-bottom

**Symptom:** The Find input in Content tab has no visible bottom border (`borderBottomWidth: 0px` confirmed via CLI).

**Fix:** Add a bottom underline line (via `border-bottom` on the input or pseudo-element on the container).

---

## S4 — CSS: replace input border-bottom starts at icon, not at placeholder

**Symptom:** The Replace input's bottom underline should start AFTER the icon (at `padding-inline-start: 30px`) not at x=0 where the icon sits.

**Fix:**
- Both search and replace inputs get `border-bottom` via CSS
- For the replace container (`.vaultman-content-replace-container`), use an `::after` pseudo-element with `inset-inline-start: 30px` to start the underline at the placeholder text position
- For the search container, start at `inset-inline-start: 0` (icon under the line is acceptable; or also start at 30px for visual consistency)

---

## S5 — Words cell shows for PNG/binary files

**Symptom:** Files like `obsiman_files_final.png` show a word count in the Words cell. PNGs have no words.

**Root cause:**
1. `computeSnapshot` calls `vault.cachedRead(file)` on ALL files (including binary) and runs `\S+` match on raw binary content → large bogus count
2. `getFileWordCount(file)` returns the cached count regardless of file extension

**Fix (two changes in `serviceStatisticsCache.ts`):**

A. In `getFileWordCount`:
```typescript
getFileWordCount(file: TFile): number | null {
    if (file.extension !== 'md') return null;  // ← add this
    // ...existing cache lookup...
}
```

B. In `computeSnapshot`, skip content reading for non-md files:
```typescript
let content: string | null = null;
if (file.extension === 'md') {
    content = await this.app.vault.cachedRead(file);
}
fileStats = {
    path: file.path,
    ctime: file.stat.ctime,
    mtime: file.stat.mtime,
    size: file.stat.size,
    words: content !== null ? this.countWords(content) : 0,
    ...this.collectFileMetadata(file),
};
```

**Display path:** `explorerFiles.ts:1229-1231` — `wordCount === null` → `wordCountText = undefined` → cell not rendered.

---

## S6 — Word count mismatch (Vaultman 237 vs Obsidian 181)

**Symptom:** 2025-W46 note — Obsidian shows 181 words, Vaultman shows 237.

**Root cause:** `countWords` uses `\S+` which counts markdown syntax tokens as "words":
- Bullet `-` = 1 extra "word" per list item
- Task checkbox `[ ]` = 1 extra "word"  
- `#` heading markers stay attached to first word (`#Week` = `#` counts as part of `\S+`)

**Verification (2026-06-21 CLI — read against Obsidian's own `word-count` core plugin `instance.wordCount`):**

| Note | Obsidian | `\S+` (current) | `\w+` | `[\p{L}\p{N}]+/gu` |
|------|----------|-----------------|-------|--------------------|
| 2025-W46.md | 181 | **237** (bug) | 179 | 179 |
| Unfolding the Napkin (accented prose) | 27 | 7 | 25 | **27** (exact) |

`\w+` is `[A-Za-z0-9_]` — it SPLITS accented Spanish words (`Díaz` → `D` + `az`), undercounting. The vault is Spanish-heavy, so `\w+` is wrong. The Unicode pattern `[\p{L}\p{N}]+/gu` matches Obsidian exactly on prose and handles accents correctly.

**Fix:** Replace `\S+` with Unicode `[\p{L}\p{N}]+/gu` in `countWords()` (also drop the `.trim()` — irrelevant once matching word-char runs):
```typescript
private countWords(content: string): number {
    const withoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/, '');
    const words = withoutFrontmatter.match(/[\p{L}\p{N}]+/gu);
    return words?.length ?? 0;
}
```

Residual delta on W46 (179 vs Obsidian 181 = 2 words) is from Obsidian's worker tokenizing wikilinks/numbers slightly differently; not worth replicating its full worker regex. Fixes the user complaint (237 → 179) and is exact on prose.

**Cache note:** Existing cached `.md` file word counts are stale after this change. They self-correct when a file is modified (triggers `invalidateFile`) or when statistics are recomputed. No forced cache clear needed for a hotfix.

---

## Files Touched

| File | Changes |
|------|---------|
| `src/components/containers/explorerFiles.ts` | S1: `getDisplayedCount().total` |
| `src/components/pages/pageFilters.svelte` | S2: `resultFileCount` loading guard |
| `styles.css` | S3+S4: border-bottom on find+replace inputs |
| `src/services/serviceStatisticsCache.ts` | S5+S6: `getFileWordCount`, `computeSnapshot`, `countWords` |
