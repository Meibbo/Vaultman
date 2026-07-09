---
title: Hotfix-aware promotion and reconciliation spec
type: research-shard
status: draft
parent: "[[index|Version Streams Vertical Codebase Analysis]]"
created: 2026-06-05T16:55:00
updated: 2026-06-05T16:55:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/research
  - initiative/hardening
  - release/1.1.0
  - version-streams
  - stable
  - hotfix
---

# Shard 06 - Hotfix-Aware Promotion And Reconciliation Spec

## 00. Contract

This shard continues the version-streams vertical codebase analysis.

It supersedes the simple "stable means origin/main 1.0.1" assumption used by earlier shards.

It does not delete or rewrite earlier shards.

It corrects the promotion model after the user clarified that the hotfix branch/worktree is now the canonical stable candidate for the new stable release.

The practical stable candidate is not only a branch name.

The practical stable candidate is a live worktree state.

That matters because the hotfix worktree contains committed stable fixes and also a large uncommitted implementation block.

The product can lose behavior if release work reads only `origin/main`.

The product can also lose behavior if release work reads only tag `1.1.0`.

The product can also lose behavior if release work reads only the `hotfix/1.0.2-css-scorecard` commit.

The release gate must account for the worktree contents at:

`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard`

The branch name is:

`hotfix/1.0.2-css-scorecard`

The branch name still says `1.0.2`.

The spec source says this update is now treated as `1.1.0`.

The user says the hotfix line has become the new canonical stable worktree.

The shard therefore models that hotfix line as "stable-candidate 1.1.0".

This shard is a promotion and reconciliation spec, not a product implementation plan.

It identifies what must move upward.

It identifies what must be preserved.

It identifies what must not be merged blindly.

It identifies what must be versioned before publication.

It identifies where shard 05's matrix must be mentally corrected.

It does not deep-dive tests or tooling as systems.

It does use verification evidence as source metadata because release readiness depends on it.

It does include code snippets from product source when those snippets are the clearest evidence of a system contract.

It treats tests as supporting evidence only where the implementation plan recorded them as release gates.

It leaves historical branch names intact.

It does not rename the branch.

It does not claim publication happened.

It does not claim all pending 1.1.0 tasks are complete.

It explicitly separates completed 6A-6F parity work from pending Tasks 7-10 in the stable parity plan.

It treats the current hotfix worktree dirty state as a release blocker until intentionally captured.

It treats the dirty state as product evidence, not as garbage.

It preserves the user's instruction: do not compress source detail away merely to satisfy navigation line limits.

## 01. Immediate Answer

The hotfix clarification changes shard 06 materially.

Earlier stream framing had a stable line, a sandbox/canary line, and a proto-design line.

The new frame has two stable facts that must not be collapsed.

Stable fact one:

`origin/main` is still the published 1.0.1-style stable lineage in Git metadata.

Stable fact two:

`hotfix/1.0.2-css-scorecard` is now the canonical stable candidate worktree for the next stable release.

Those facts are not interchangeable.

The hotfix line contains behavior that `origin/main` does not have.

The hotfix line also contains behavior that the earlier tag `1.1.0` does not represent cleanly.

The hotfix line is closer to a corrected stable product than the sandbox line.

The hotfix line is not the full sandbox architecture.

The hotfix line imports or rebuilds selected parity behavior without carrying the entire sandbox reconstruction.

The hotfix line must now be a first-class stream in the promotion matrix.

The practical promotion flow should be:

1. Freeze the hotfix worktree identity.
2. Capture the hotfix worktree dirty product changes into intentional commits.
3. Bump release metadata from `1.0.2` to `1.1.0`.
4. Verify from the clean stable candidate.
5. Publish only plugin release assets.
6. Keep AI files out of the stable publication line.
7. Treat sandbox and proto as input streams for later translation, not as direct overwrite sources for stable.

The dangerous shortcut is:

Use tag `1.1.0` because it already exists.

That would miss the new parity fixes.

Another dangerous shortcut is:

Use `origin/main` because it is the stable branch.

That would miss the hotfix worktree and the stable-candidate changes.

Another dangerous shortcut is:

Publish from the hotfix worktree while it is dirty.

That makes the release unreproducible.

Another dangerous shortcut is:

Merge sandbox wholesale into hotfix.

That would import the reconstruction surface that the hotfix line is explicitly not carrying.

The right mental model is:

Hotfix is now a stable-candidate fork with selected canary/proto-adjacent parity behavior.

It should be reconciled as its own stream.

It should be preserved before it is promoted.

It should not be flattened into the older stable row from shard 05.

## 02. Sources Read For This Shard

This section records what was actually inspected.

It is not a claim that every file in every branch was read.

### 02.01 Room And Startup Sources

Read `.agents/pkm-ai.version.json`.

The PKM-AI protocol version was `1.0.0`.

The tooling version was `1.0.1`.

Read `.agents/docs/current/status.md`.

Read `.agents/docs/current/handoff.md`.

Read latest relevant session-log context.

Joined the active room as:

`codex-gpt5-shard06-hotfix-aware`

Created and claimed:

`task_008`

Task title:

`Write version streams shard 06 hotfix-aware promotion reconciliation spec`

Task scope:

`.agents/docs/work/hardening/research/2026-05-29-version-streams-vertical-codebase-analysis`

Task scope:

`.agents/docs/sessions/session-log.md`

### 02.02 Room Mailbox Sources

The user asked whether the other Codex agent in the room could be asked.

No active Codex agent was present in the room at the first room status check.

The active/stale coordinator entry was:

`claude-opus-4-8`

The most recent Codex worker entries were already `left`.

Sent a high-priority question to:

`claude-opus-4-8`

Message id:

`msg_mq1fny60_nf34qe`

Sent a high-priority question to:

`codex-gpt5-promptprep`

Message id:

`msg_mq1fnxcd_u0pa12`

Question body asked for branch/worktree identity and must-preserve stable-only features.

Before final close, Claude replied.

Claude answer id:

`msg_mq1gikya_tzt45z`

Claude said there was no stable-only product evidence to add from their side.

Claude identified their active role as PKM-AI tooling work, not product baseline authority.

Claude said the only evidence paths they were aware of were the stable Data/Files parity specs/plans and the version-streams research index.

Claude recommended confirming with the dev before promotion.

The `codex-gpt5-promptprep` question remained queued with no reply observed.

The shard therefore proceeds from local product evidence and records Claude's answer as "no additional product evidence", not as a contradiction of the hotfix model.

### 02.03 Git Sources

Ran `git worktree list --porcelain`.

Current workspace:

`C:/Users/vic_A/Desktop/vaultman`

Current workspace branch:

`sandbox`

Current workspace HEAD:

`2e29a42099488808c409281a0f167446267729fa`

Stable-candidate hotfix worktree:

`C:/Users/vic_A/Desktop/vaultman/.claude/worktrees/hotfix-1.0.2-css-scorecard`

Stable-candidate hotfix branch:

`refs/heads/hotfix/1.0.2-css-scorecard`

Stable-candidate hotfix HEAD:

`b325f861ab94b0c3e7ad0e86b48f96c72afde96f`

Hotfix HEAD subject:

`fix(stable): restore explorer parity and reactive stats`

Clean stable-ish worktree:

`C:/tmp/vaultman-main-clean`

Clean stable-ish branch:

`release/1.1.0-infra`

Clean stable-ish HEAD:

`9802ed37991938a4979a99119cd8a499453b8756`

Main branch worktree:

`C:/Users/vic_A/Desktop/vaultman/.claude/worktrees/busy-mahavira-4aaf98`

Main branch HEAD:

`11a96c24435925c1986011da78148be2e29efbdd`

Main branch subject:

`docs: explain proper BRAT release process in memory`

Old origin-main worktree:

`C:/Users/vic_A/Desktop/vaultman/.claude/worktrees/origin-main`

Origin-main worktree branch:

`codex/origin-main-work`

Origin-main worktree HEAD:

`814ef81b4943571028f9263b6ebc9c667601ce17`

Local tag `1.1.0` exists.

Tag `1.1.0` commit:

`8d5c4fd`

Remote release-please branch includes:

`0877e18 chore(main): release 1.1.0`

Local hotfix branch is `10` commits ahead of `origin/main`.

Command evidence:

`git -C hotfix-worktree rev-list --left-right --count origin/main...HEAD`

Result:

`0 10`

Local hotfix branch is `14` commits ahead of tag `1.1.0` by rev-list comparison.

Command evidence:

`git rev-list --left-right --count 1.1.0...hotfix/1.0.2-css-scorecard`

Result:

`0 14`

The hotfix branch is not merely older stable.

The hotfix branch contains later stable remediation commits.

The hotfix worktree also contains uncommitted product changes.

### 02.04 Hotfix Worktree Dirty State

Ran:

`git -C .claude\worktrees\hotfix-1.0.2-css-scorecard status --short --branch`

The branch status reported:

`## hotfix/1.0.2-css-scorecard...origin/main [ahead 10]`

The worktree had modified product files.

The worktree had new product files.

The worktree had new unit-test support files.

The modified product files included:

`scripts/sync-test-build.mjs`

`src/VaultmanFrame.svelte`

`src/VaultmanSettings.ts`

`src/components/containers/explorerFiles.ts`

`src/components/containers/explorerProps.ts`

`src/components/containers/explorerTags.ts`

`src/components/layout/islandActiveFilters.ts`

`src/components/layout/islandQueue.ts`

`src/components/layout/navbarFilters.svelte`

`src/components/layout/navbarPillFab.svelte`

`src/components/layout/navbarTabs.svelte`

`src/components/layout/popupFilters.svelte`

`src/components/layout/popupSort.svelte`

`src/components/layout/popupView.svelte`

`src/components/layout/viewGrid.ts`

`src/components/layout/viewTree.ts`

`src/components/pages/pageFilters.svelte`

`src/components/pages/pageStatistics.svelte`

`src/components/pages/tabContent.svelte`

`src/components/pages/tabFiles.svelte`

`src/i18n/en.ts`

`src/i18n/es.ts`

`src/logic/logicProps.ts`

`src/logic/logicsFiles.ts`

`src/main.ts`

`src/services/serviceFilter.ts`

`src/services/serviceOperationQueue.ts`

`src/types/typeOps.ts`

`src/types/typeSettings.ts`

`src/utils/filter-evaluator.ts`

`styles.css`

The new product files included:

`src/components/layout/performanceHud.svelte`

`src/services/serviceNativeSearchAdapter.ts`

`src/services/serviceStatisticsCache.ts`

`src/services/serviceStatisticsStorage.ts`

`src/utils/performanceMonitor.ts`

`src/utils/queueTemplateMenu.ts`

`src/utils/tableVirtualization.ts`

`src/utils/treeVirtualization.ts`

The hotfix dirty diff stat reported:

`34 files changed`

`2953 insertions`

`864 deletions`

That diff stat excludes the untracked new files from the short stat totals unless separately counted by status.

Therefore the practical stable candidate is larger than the committed hotfix branch.

The uncommitted block cannot be ignored.

### 02.05 Release Metadata Sources

Read hotfix worktree `manifest.json`.

Observed:

```json
{
  "id": "vaultman",
  "name": "Vaultman",
  "version": "1.0.2",
  "minAppVersion": "1.12.0",
  "description": "Files, content and frontmatter explorer like Bases with scoped queued changes list.",
  "author": "Meibbo",
  "authorUrl": "https://github.com/Meibbo",
  "isDesktopOnly": false
}
```

Read hotfix worktree `package.json`.

Observed:

`"version": "1.0.2"`

The release metadata still says `1.0.2`.

The release intent now says `1.1.0`.

This is a concrete release blocker.

It is not just an editorial mismatch.

Obsidian release assets use `manifest.json`.

Package tooling uses `package.json`.

`versions.json` must also be aligned before publication.

The spec should not say "ready to publish 1.1.0" until those files are reconciled.

### 02.06 Stable 1.1.0 Data/Files Sources

Read:

`.agents/docs/work/hardening/specs/2026-06-05-stable-1-1-0-data-files-parity/index.md`

Read:

`.agents/docs/work/hardening/plans/2026-06-05-stable-1-1-0-data-files-parity/index.md`

The spec says the current stable update is now treated as `1.1.0` rather than `1.0.2`.

The spec says the branch already contains meaningful UX behavior changes.

The spec names the release-facing systems:

Data/Files vocabulary.

Native Search adapter.

Files explorer full-vault behavior.

Queue policy.

Minimal style controls.

Native classes.

Statistics cache.

Performance HUD.

Tree virtualization.

Table virtualization.

Honest property casing.

The implementation plan records completed Tasks 6A through 6F.

The implementation plan records pending Tasks 7 through 10.

Pending Task 7 covers folder context menu and filters.

Pending Task 8 covers Files badges, auto reveal, and sort.

Pending Task 9 covers minimal searchbox.

Pending Task 10 covers final verification and plugin-dev smoke for those remaining tasks.

This means the new stable candidate has substantial completed behavior.

It also means the release-facing work is not entirely finished according to its own plan.

### 02.07 Earlier Publish Hotfix Sources

Read committed plan from:

`9bedda6:.agents/docs/work/publish/plans/2026-06-04-release-1-0-2-core-parity-hotfix/index.md`

That plan was completed.

It targeted the same hotfix worktree:

`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard`

It explicitly said:

Do not add `.agents`, `AGENTS.md`, `.claude`, `.codex`, or generated agent files to this worktree.

It recorded product commit:

`f4d9a97 fix(stable): align explorers with core parity`

It recorded local gate:

`pnpm run verify` passed.

It recorded runtime sync to `plugin-dev`.

It recorded final `dev:errors`:

`No errors captured`

It recorded smokes for minimal style, icons, queue, Statistics, Files search, and Content preview.

This earlier plan explains why the hotfix branch has stable-only behavior even before the uncommitted 6A-6F block.

### 02.08 Svelte Sources

The hotfix worktree uses Svelte 5.

Ran:

`npx @sveltejs/mcp list-sections`

Relevant sections identified:

`svelte/imperative-component-api`

`svelte/$derived`

`svelte/$effect`

Read:

`svelte/imperative-component-api`

The relevant Svelte doc fact is that `mount` instantiates and mounts a component to a target.

The relevant Svelte doc fact is that `unmount` removes a component previously created with `mount` or `hydrate`.

This matters because the hotfix HUD implementation intentionally mounts `PerformanceHud` into a body host rather than moving a Svelte-owned root node after mount.

## 03. Corrected Stream Model

### 03.01 Earlier Model

Shard 05 used a three-way practical product matrix.

The main rows were:

Stable.

Sandbox.

Proto v12.

That was useful at the time.

It is now incomplete.

The stable row in shard 05 mostly meant:

`origin/main`

`1.0.0`

`1.0.1`

Published/stable lineage before the hotfix-candidate clarification.

That row should remain as historical stable evidence.

It should not be silently redefined.

### 03.02 New Model

The current practical model needs at least four rows.

Row one:

Old stable.

Old stable means `origin/main` and the `1.0.1` line.

Row two:

New stable candidate.

New stable candidate means the hotfix worktree `hotfix/1.0.2-css-scorecard` with its live worktree changes.

Row three:

Sandbox/canary.

Sandbox/canary means the current `sandbox` branch and its reconstruction-style architecture.

Row four:

Proto design.

Proto design means canonical Open Design `proto-v12`.

The row that matters for imminent publication is row two.

The row that matters for long-term architecture is still row three.

The row that matters for design authority is still row four.

The row that matters for published historical comparison is still row one.

### 03.03 Why Hotfix Is Not Just Old Stable

Hotfix is ahead of `origin/main`.

Hotfix includes stable remediation commits.

Hotfix includes core parity commits.

Hotfix includes a completed 1.0.2 core parity plan.

Hotfix includes uncommitted 1.1.0 Data/Files parity work.

Hotfix has native Search adapter code in the worktree.

Hotfix has full-vault Files filtering code in the worktree.

Hotfix has honest property casing code in the worktree.

Hotfix has a Statistics cache service in the worktree.

Hotfix has IndexedDB storage for Statistics cache in the worktree.

Hotfix has tree virtualization utilities in the worktree.

Hotfix has table virtualization utilities in the worktree.

Hotfix has a performance HUD in the worktree.

Hotfix has settings for the HUD in the worktree.

Hotfix has Obsidian tab-class alignment in the worktree.

Hotfix has Data/Files label changes in the worktree.

Hotfix is therefore a product-bearing stream.

It is not only a release branch.

### 03.04 Why Hotfix Is Not Sandbox

Sandbox has a much broader reconstructed architecture.

Sandbox has providers.

Sandbox has Explorer DataPlane systems.

Sandbox has ViewHost architecture.

Sandbox has DnD services.

Sandbox has Bases interop surfaces.

Sandbox has ServiceAPI surfaces.

Sandbox has more runtime tooling.

Hotfix does not carry all of that.

Hotfix is narrower.

Hotfix is stable-oriented.

Hotfix uses selected parity behavior.

Hotfix uses existing stable component/service boundaries where possible.

Hotfix should not receive sandbox wholesale.

Hotfix should receive only audited, stable-relevant deltas.

### 03.05 Why Hotfix Is Not Proto

Proto v12 is a design stream.

Proto v12 is not a mergeable TypeScript/Svelte implementation stream.

Proto v12 has UX intent and interaction taxonomy.

Hotfix has Obsidian plugin implementation.

Proto can guide future translation.

Proto cannot overwrite hotfix code.

Hotfix can adopt proto behavior only through implementation plans.

### 03.06 Why Tag 1.1.0 Is Not Enough

Tag `1.1.0` exists.

Tag `1.1.0` does not represent the current hotfix worktree state.

Hotfix is 14 commits ahead of the tag by rev-list comparison.

Diffing tag `1.1.0` to hotfix shows a huge product and test surface change.

That huge diff reflects stream cleanup/reconciliation history.

The tag alone cannot serve as release authority.

The release authority must be the clean committed stable-candidate state after hotfix capture.

## 04. Theory Versus Practice

### 04.01 Theory - Stable

Stable should be the published user-facing line.

Stable should be clean.

Stable should be reproducible.

Stable should contain no AI workflow files.

Stable should have release assets derived from committed source.

Stable should have version metadata matching the release.

Stable should have a short, conservative feature scope.

Stable should avoid experimental architecture.

Stable should avoid sandbox-only debugging surfaces unless intentionally gated.

Stable should preserve user data.

Stable should avoid migrations that are not needed.

Stable should be easy to verify in `plugin-dev`.

Stable should be easy to tag.

Stable should be easy to hand off.

### 04.02 Practice - Old Stable

`origin/main` is the old stable reference.

It reports `1.0.1` in current earlier shard evidence.

It is behind the hotfix branch.

It lacks the new Data/Files parity work.

It lacks the new full-vault Files filter behavior.

It lacks the new native Search adapter worktree file.

It lacks the new persistent Statistics cache worktree files.

It lacks the new performance HUD worktree file.

It lacks the new table/tree virtualization worktree utilities.

It should no longer be used as the only stable baseline for release readiness.

It remains useful as the historical published baseline.

### 04.03 Practice - New Stable Candidate

`hotfix/1.0.2-css-scorecard` is the new practical stable candidate.

It has a misleading historical name.

It still reports version `1.0.2`.

It is ahead of `origin/main`.

It contains committed stable parity repairs.

It contains a live dirty block of 1.1.0 Data/Files parity changes.

It has no `.agents` docs in the working tree path that was inspected.

It was previously protected by a stable guard saying not to add AI files.

It must be committed or otherwise captured before publication.

It must be version-bumped before publication as `1.1.0`.

It must be verified after capture.

It must be published without AI workflow files.

### 04.04 Practice - Sandbox

The current workspace is `sandbox`.

It contains AI docs and agent state.

It is appropriate for research and agent coordination.

It is not appropriate to publish directly to main with AI files.

It contains broader systems than hotfix.

It remains the canary/reconstruction source for future feature translation.

It must not overwrite hotfix wholesale.

### 04.05 Practice - Proto v12

The proto design stream is canonical at v12.

It is a design reference.

It is not the release branch.

It can still influence stable design decisions.

It cannot directly settle TypeScript implementation behavior.

It must be translated into Obsidian/Svelte constraints before promotion.

### 04.06 Main Mismatch

The main mismatch is no longer simply "sandbox is beta-labeled".

The main mismatch is that stable authority is split.

Git publication metadata points to old stable and existing tags.

User/release intent points to the hotfix worktree as canonical stable candidate.

Product behavior exists in a dirty worktree.

Release metadata still says `1.0.2`.

The release target is `1.1.0`.

Therefore the release process must first normalize authority.

## 05. Release Authority Ladder

This shard recommends an authority ladder for imminent release work.

### 05.01 Highest Authority

The highest authority for release scope is the user's latest clarification.

The user said hotfix became the canonical stable worktree.

The user said stable 1.1.0 is close to publication.

The user said hotfix has features the other streams do not.

This means the hotfix worktree must be read before any release decision.

### 05.02 Product Evidence Authority

The next authority is the hotfix worktree state.

The worktree state includes committed and uncommitted product code.

The worktree state must be captured before release.

The worktree state cannot be replaced by a clean tag without losing behavior.

### 05.03 Spec Authority

The next authority is the stable 1.1.0 Data/Files parity spec and plan.

The spec explains why the update is now `1.1.0`.

The plan records completed 6A-6F work.

The plan records pending 7-10 work.

The plan provides release-facing acceptance criteria.

### 05.04 Historical Evidence Authority

The next authority is the earlier 1.0.2 core parity hotfix plan.

That plan explains the branch name.

That plan records the original stable hotfix target.

That plan records completed runtime smokes.

That plan records the stable guard against AI files.

### 05.05 Git Metadata Authority

Git metadata is necessary but not sufficient.

Git metadata identifies worktrees, branches, commits, tags, and ancestry.

Git metadata shows the dirty state.

Git metadata shows version tags.

Git metadata does not by itself decide that the dirty state is releasable.

Git metadata does not by itself decide that old tag `1.1.0` is current.

### 05.06 Lower Authority

Earlier shard 05 matrix is lower authority for the stable-candidate row.

Shard 05 remains useful for system comparison.

Shard 05 must be read with this correction:

`stable` can mean old stable or hotfix stable candidate depending on section context.

The release-facing stable row now means hotfix stable candidate.

## 06. Hotfix System Inventory

This section names systems the hotfix worktree currently covers.

The list is based on inspected status, diffs, plans, and targeted source snippets.

### 06.01 Release Metadata System

Files:

`manifest.json`

`package.json`

`versions.json`

Current hotfix metadata still says `1.0.2`.

Target release intent says `1.1.0`.

The release gate must bump metadata.

The release gate must update `versions.json`.

The release gate must not rely on stale tag `1.1.0`.

The release gate must create a new clean release state after hotfix capture.

The release gate must verify that plugin-dev receives the correct manifest.

### 06.02 Stable Guard System

Earlier hotfix plan said:

Do not add `.agents`, `AGENTS.md`, `.claude`, `.codex`, or generated agent files to the hotfix worktree.

That guard remains valid.

Stable branch work must not import sandbox AI files.

Stable publication must not include agent state.

Stable documentation can live on AI-enabled branches.

Stable product source can be patched in the hotfix worktree.

Stable product commits must be clean.

### 06.03 Navigation Vocabulary System

Stable 1.1.0 changes user-facing vocabulary.

Internal page key `filters` remains stable.

User-facing label becomes Data.

Internal page key `ops` remains stable.

User-facing label becomes Files.

This preserves settings such as page order.

This avoids migration risk.

This changes user mental model.

This aligns with the release-facing Data/Files parity contract.

The hotfix frame snippet shows:

```ts
const pageIcons: Record<string, string> = {
  statistics: 'lucide-bar-chart-2',
  filters: 'lucide-database',
  ops: 'lucide-folder',
};
```

Practical implication:

Promotion must preserve the internal/user-facing split.

Do not rename internal keys to `data` and `files` in the release branch unless a migration is explicitly planned.

### 06.04 Settings Reactivity System

Hotfix uses `settingsRevision` to make settings reads reactive inside Svelte derived state.

This is important for minimal style and HUD toggles.

The product should not rely on non-reactive direct settings reads for visible controls.

The stable candidate includes `performanceHudEnabled`.

The default is off.

The HUD is a debug surface, not always-on product chrome.

Promotion must preserve default-off behavior.

### 06.05 Performance HUD System

New file:

`src/components/layout/performanceHud.svelte`

New file:

`src/utils/performanceMonitor.ts`

Settings field:

`performanceHudEnabled`

The monitor exposes:

`window.__vaultmanPerf`

The inspected snippet:

```ts
export const vaultmanPerfMonitor = new VaultmanPerformanceMonitor();

declare global {
  interface Window {
    __vaultmanPerf?: VaultmanPerformanceMonitor;
  }
}

if (typeof window !== 'undefined') {
  window.__vaultmanPerf = vaultmanPerfMonitor;
}
```

The HUD is mounted through a body portal.

The inspected Svelte frame snippet:

```ts
const performanceHudEnabled = $derived.by(() => {
  void settingsRevision;
  return plugin.settings.performanceHudEnabled;
});
let performanceHudHost: HTMLElement | null = null;
let performanceHudInstance: Record<string, never> | null = null;

function destroyPerformanceHud(): void {
  if (performanceHudInstance) {
    void unmount(performanceHudInstance);
    performanceHudInstance = null;
  }
  performanceHudHost?.remove();
  performanceHudHost = null;
}

$effect(() => {
  if (!performanceHudEnabled) {
    destroyPerformanceHud();
    return;
  }

  const host = document.createElement('div');
  host.className = 'vaultman-performance-host';
  document.body.appendChild(host);
  performanceHudHost = host;
  performanceHudInstance = mount(PerformanceHud, { target: host });

  return destroyPerformanceHud;
});
```

The Svelte docs support this approach through `mount` and `unmount`.

The plan records that a previous attempt moved a Svelte-owned node after mount and was replaced.

Promotion must preserve the body-host mount pattern.

Promotion must preserve cleanup.

Promotion must preserve default-off state.

Promotion must preserve viewport clamp/reset behavior recorded in 6F.

Promotion must not make the HUD a public always-visible feature by accident.

### 06.06 Data/Files Filter System

Hotfix adds a full-vault file output.

The inspected references include:

`filteredVaultFiles`

`setFileSearchRule`

`FILE_SEARCH_RULE_IDS`

The key system correction:

Files search reduces the Files result set.

Therefore Files search must be visible as an active filter rule.

It must not remain hidden as local-only state.

The inspected snippet:

```ts
/**
 * Upsert the Files explorer search as a visible root filter rule.
 *
 * Files search reduces the Files result set, so it belongs in active filters
 * instead of remaining a hidden local panel constraint.
 */
setFileSearchRule(kind: FileSearchRuleType, value: string): void {
  const term = value.trim();
  let changed = false;

  for (const id of Object.values(FILE_SEARCH_RULE_IDS)) {
    if (!term || id !== FILE_SEARCH_RULE_IDS[kind]) {
      changed = this.removeRootRuleById(id) || changed;
    }
  }

  if (term) {
    const id = FILE_SEARCH_RULE_IDS[kind];
    const existing = this.findRootRuleById(id);
    if (existing) {
      if (
        existing.filterType !== kind ||
        existing.values[0] !== term ||
        existing.enabled === false
      ) {
        existing.filterType = kind;
        existing.property = '';
        existing.values = [term];
        existing.enabled = true;
        changed = true;
      }
    } else {
      this.activeFilter.children.push({
        type: 'rule',
        filterType: kind,
        property: '',
        values: [term],
        id,
        enabled: true,
      });
      changed = true;
    }
  }

  if (changed) this.applyFilters();
}
```

Promotion must preserve this visible-rule contract.

Promotion must preserve `.base` and non-markdown visibility in Files.

Promotion must preserve markdown-specific behavior for Data/metadata surfaces.

Promotion must preserve active Filters island count as vault-file count where appropriate.

Promotion must not collapse Files back to markdown-only output.

### 06.07 Content Search System

New file:

`src/services/serviceNativeSearchAdapter.ts`

The stable 1.1.0 spec says runtime code must not call the Obsidian CLI.

The adapter uses core Search view methods.

The inspected snippet:

```ts
export function toNativeSearchQuery(query: string, isRegex: boolean): string {
  if (!isRegex) return query;
  const trimmed = query.trim();
  if (trimmed.startsWith('/') && trimmed.endsWith('/')) return trimmed;
  return `/${query}/`;
}

export class NativeSearchAdapter {
  private app: SearchApp;
  private activeRun = 0;
  private preservedView: NativeSearchView | null = null;
  private preservedQuery: string | null = null;

  constructor(app: App) {
    this.app = app as SearchApp;
  }

  destroy(): void {
    this.cancel();
    if (this.preservedView && this.preservedQuery !== null) {
      this.preservedView.setQuery(this.preservedQuery);
      this.preservedView.startSearch();
    }
    this.preservedView = null;
    this.preservedQuery = null;
  }
}
```

The inspected search loop polls the Search view.

It scopes results by file path.

It uses `view.dom.getFiles()`.

It uses `view.dom.getResult(file)`.

It uses native offsets from `result.result.content`.

It restores the preserved native Search query on destroy.

Promotion must preserve non-CLI runtime behavior.

Promotion must preserve cleanup of the user's Search view query.

Promotion must preserve scoped results.

Promotion must preserve progressive result updates.

Promotion must not reintroduce an inert Preview button.

### 06.08 Property Casing System

Hotfix fixes the `Birthday` problem.

The root cause recorded in the 6F plan:

PropsLogic displayed lowercased `birthday` from native property info.

The actual frontmatter key was `Birthday`.

The filter evaluator was exact by property key.

Clicking `birthday` therefore produced a filter that matched zero files.

The rejected workaround:

Make evaluator case-insensitive.

Why rejected:

That would merge distinct property casings.

The accepted fix:

Build observed property nodes from actual frontmatter keys.

The inspected snippet:

```ts
const valueMap = new Map<string, Map<string, number>>();
const propFileMap = new Map<string, Set<string>>();
const observedProps = new Set<string>();

for (const file of this.app.vault.getMarkdownFiles()) {
  const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  for (const [key, val] of Object.entries(fm)) {
    if (key === 'position') continue;

    observedProps.add(key);

    if (!propFileMap.has(key)) propFileMap.set(key, new Set());
    propFileMap.get(key)!.add(file.path);

    if (!valueMap.has(key)) valueMap.set(key, new Map());
    const vals = Array.isArray(val) ? val : [val];
    for (const v of vals) {
      if (v == null) continue;
      const str = String(v);
      if (str === '') continue;
      const vMap = valueMap.get(key)!;
      vMap.set(str, (vMap.get(str) ?? 0) + 1);
    }
  }
}
```

Promotion must preserve actual frontmatter casing.

Promotion must preserve exact filter evaluation.

Promotion must not normalize user property keys to lowercase.

Promotion must not silently merge keys that differ only by case.

Promotion must preserve the `Birthday` smoke as a release smoke.

### 06.09 Statistics Cache System

New file:

`src/services/serviceStatisticsCache.ts`

New file:

`src/services/serviceStatisticsStorage.ts`

Hotfix moves Statistics caching into a plugin-level service.

It stores file-level stats by path/mtime/size.

It stores aggregate snapshots by signature.

It exposes last-good snapshots.

It invalidates on metadata and vault changes.

The inspected snippet:

```ts
export class StatisticsCacheService extends Component {
  private readonly app: App;
  private readonly events = new Events();
  private readonly storage: StatisticsCacheStorage | null;
  private fileStatsCache = new Map<string, CachedFileStats>();
  private aggregateStatsCache = new Map<string, StatisticsSnapshot>();
  private scopeStatsCache = new Map<StatisticsScope, StatisticsSnapshot>();
  private storageInitialized = false;
  private storageInitPromise: Promise<void> | null = null;

  constructor(app: App, options: StatisticsCacheServiceOptions = {}) {
    super();
    this.app = app;
    this.storage = createStatisticsCacheStorage(
      options.storageKey ?? this.defaultStorageKey(app),
      options.storage,
    );
  }
}
```

The inspected invalidation behavior includes:

Metadata cache changed.

Vault modify.

Vault create.

Vault delete.

Vault rename.

Promotion must preserve invalidation.

Promotion must preserve last-good snapshot behavior.

Promotion must preserve scope-sensitive aggregate signatures.

Promotion must preserve folder-sensitive snapshot signatures.

Promotion must not return stale folder counts for reused file sets.

### 06.10 Statistics Storage System

Hotfix includes IndexedDB-backed storage.

The spec explicitly rejected settings JSON for heavyweight cache.

The inspected storage snippet:

```ts
class IndexedDBStatisticsCacheStorage implements StatisticsCacheStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly dbName: string) {}

  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;
    const initPromise = new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_SCHEMA_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(FILE_STORE)) {
          db.createObjectStore(FILE_STORE, { keyPath: 'path' });
        }
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'signature' });
        }
      };
    });
  }
}
```

The creation function uses:

```ts
if (typeof indexedDB === 'undefined') return null;
return new IndexedDBStatisticsCacheStorage(
  `vaultman/statistics-cache/${storageKey}`,
);
```

Promotion must preserve device-local derived cache semantics.

Promotion must not store large derived cache data in settings JSON.

Promotion must preserve fallback when IndexedDB is unavailable.

Promotion must preserve rebuildable cache behavior.

Promotion must not treat cache as user-intent state.

### 06.11 Files Table Virtualization System

New file:

`src/utils/tableVirtualization.ts`

Modified file:

`src/components/layout/viewGrid.ts`

The hotfix Files table uses native-style Bases classes.

It renders a virtual window rather than all rows.

The inspected scaffold snippet:

```ts
this.headerEl = this.containerEl.createDiv({
  cls: 'bases-thead vaultman-files-col-header vaultman-files-table-header',
});

this.listEl = this.containerEl.createDiv({
  cls: 'bases-table-container node-insert-event vaultman-files-list vaultman-files-table',
});
this.tableEl = this.listEl.createDiv({
  cls: 'bases-table vaultman-files-table-virtual-table',
});
this.tbodyEl = this.tableEl.createDiv({
  cls: 'bases-tbody vaultman-files-table-virtual-body',
});
```

Promotion must preserve table virtualization.

Promotion must preserve native-style Bases classes where they drive visual parity.

Promotion must preserve selection behavior.

Promotion must preserve sort header behavior.

Promotion must preserve bottom-scroll behavior.

Promotion must not return to rendering thousands of row elements.

Promotion must keep the 868 ms residual performance note visible.

That residual means the table is much better but not perfect.

It should not block preserving the work.

It should guide future performance pass.

### 06.12 Tree Virtualization System

New file:

`src/utils/treeVirtualization.ts`

Modified file:

`src/components/layout/viewTree.ts`

The plan records fixed-height virtualization.

The tree flattens visible nodes.

The tree sets total scroll height immediately.

The tree renders only viewport rows plus overscan.

The tree positions rows by index.

The tree supports bottom scroll without full DOM allocation.

Promotion must preserve this model.

Promotion must not reintroduce artificial `200` render limits.

Promotion must not reintroduce "Show all" as a performance escape.

Promotion must preserve `scrollToId` style functionality for reveal behavior.

Promotion must keep Props expand-all model/projection cost as residual risk.

### 06.13 Queue Policy System

Hotfix moved queue behavior toward staged-by-default policy.

Earlier 1.0.2 plan added stage/bypass mode in the queue island.

Later 1.1.0 plan moved bypass to Settings.

The release-facing contract now says:

Stage by default.

Bypass operations is a persisted setting.

Default is off.

Queue island no longer exposes stage/bypass controls.

`addOrRun()` remains the single policy gate.

Promotion must preserve the later 1.1.0 contract.

Promotion must not regress to an empty-queue stage/bypass toggle in the island.

Promotion must preserve queue summaries.

Promotion must preserve bulk-scope safety language from the plan where implemented later.

### 06.14 Active Filters Island System

The active Filters island reports filtered vault file count.

The `.base` smoke recorded:

`25 / 11110 files`

This is not markdown count.

This is full vault file count.

Promotion must preserve that count source in Files context.

Promotion must preserve visible active filter rows for Files search.

Promotion must preserve badge updates after state-only filter changes.

### 06.15 Obsidian Native Class System

Hotfix aligns internal tabs and nav icons with Obsidian classes.

The plan records:

Active tabs use `workspace-tab-header tappable is-active`.

Inactive tabs use `background-color: var(--background-primary)`.

Minimal page icons use `workspace-tab-header-inner`.

The inspected rg output found:

`workspace-tab-header-inner vaultman-nav-page-icon`

Promotion must preserve these classes.

Promotion must not return to FAB-style classes for page icons.

Promotion must preserve native visual affordance without pretending to be core tabs internally.

### 06.16 Folder Context Menu System

Task 7 remains pending in the stable 1.1.0 plan.

The desired folder actions are:

`folder.filter_include`

`folder.filter_exclude`

`folder.rename`

`folder.move`

`folder.delete`

The stable candidate may have earlier folder menu parity from 1.0.2 work.

The newer 1.1.0 plan still marks Task 7 unchecked.

Promotion must not claim Task 7 complete unless verified in current hotfix worktree.

Promotion can preserve existing folder menu behavior.

Promotion should not overstate it.

### 06.17 Auto Reveal And Files Badges System

Task 8 remains pending in the stable 1.1.0 plan.

The desired auto reveal icon is:

`lucide-gallery-vertical`

The desired behavior:

Expand ancestors.

Render.

Scroll directly to row.

The desired badge behavior:

Resolve queue badges for file rename, move, and delete.

Bubble inherited folder badges from child operations when folder collapsed.

Promotion must not claim all of this is done unless verified.

Promotion must preserve any earlier hotfix auto-reveal behavior already committed.

Promotion must still keep Task 8 as release-risk if not complete.

### 06.18 Minimal Searchbox System

Task 9 remains pending in the stable 1.1.0 plan.

The desired minimal search behavior:

Collapsed search icon when empty.

Click expands and focuses input.

Blur collapses only if empty.

Non-minimal mode keeps always-visible search pill.

Promotion must not claim Task 9 complete unless verified.

Promotion should preserve the existing minimal controls from 1.0.2 core parity.

Promotion should treat the newer minimal searchbox as a remaining release slice if still unchecked.

### 06.19 Verification System

Task 10 remains pending in the stable 1.1.0 plan.

The plan expects:

Svelte autofixer on touched `.svelte` files.

`pnpm run verify`.

Repo-supported build/copy to `plugin-dev`.

`obsidian vault=plugin-dev plugin:reload id=vaultman`.

`obsidian vault=plugin-dev dev:errors`.

Runtime smokes for Preview removal.

Runtime smokes for auto reveal icon.

Runtime smokes for queue apply accent.

Runtime smokes for zero-match landing.

Runtime smokes for folder context menu.

Current status/handoff records `pnpm run verify` passed for 6F.

This shard did not rerun product verification.

This shard is documentation/research only.

Promotion must rerun verification after dirty hotfix changes are captured.

## 07. Hotfix Versus Other Streams

### 07.01 Hotfix Versus Old Stable

Old stable has the simpler published product.

Hotfix has user-facing Data/Files improvements.

Old stable does not have the current 6A-6F block.

Hotfix has full-vault Files filtering.

Old stable does not have the same Files `.base` behavior.

Hotfix has persistent Statistics cache work.

Old stable does not.

Hotfix has performance diagnostics.

Old stable does not.

Hotfix has native class parity refinements.

Old stable does not.

Hotfix has a dirty worktree.

Old stable is cleaner from a Git perspective.

That cleanliness is not enough to make old stable the right publish source.

### 07.02 Hotfix Versus Tag 1.1.0

Tag `1.1.0` exists.

Hotfix is ahead of it.

Tag `1.1.0` does not include the hotfix stable parity line as currently shaped.

Hotfix appears to have moved the product back toward a stable architecture while preserving selected useful behavior.

Tag `1.1.0` should be treated as historical release/mis-release evidence.

Tag `1.1.0` should not be treated as the current release source.

### 07.03 Hotfix Versus Sandbox

Sandbox is broader.

Hotfix is narrower.

Sandbox has architectural systems not in hotfix.

Hotfix has release-specific parity improvements not necessarily present in sandbox.

Sandbox has AI docs and agent state.

Hotfix should not contain AI docs.

Sandbox is appropriate for research shards.

Hotfix is appropriate for release candidate code.

Promoting from sandbox to hotfix should use cherry-picked or reimplemented slices.

Promoting from sandbox to hotfix should never be blind merge.

### 07.04 Hotfix Versus Proto v12

Proto v12 describes target interactions and visual direction.

Hotfix implements stable Obsidian plugin behavior.

Proto v12 may call for features not present in hotfix.

Hotfix may contain pragmatic Obsidian runtime behavior not present in proto.

The two streams interconnect through design translation, not Git merge.

Shard 04 remains the source for proto v12 reading.

Shard 06 uses proto only as a promotion boundary.

### 07.05 Hotfix Versus Main Worktree

There is a `main` worktree under `.claude/worktrees/busy-mahavira-4aaf98`.

Its HEAD subject is release-process documentation.

That worktree is not the same as the hotfix product candidate.

Main branch policy still forbids AI files.

The existence of a main worktree does not supersede the hotfix candidate.

Release work should confirm which worktree is the intended final publication base.

User clarification currently points to hotfix.

## 08. What Must Move Upward

This section assumes "move upward" means move into the stable release candidate.

Because the hotfix worktree is now stable candidate, many items are already there in dirty state.

The practical task is not only moving.

The practical task is preserving, committing, versioning, and verifying.

### 08.01 Must Preserve: Full-Vault Files Filtering

Preserve `filteredVaultFiles`.

Preserve `.base` matching.

Preserve extension queries such as `.base`.

Preserve basename, full filename, and path matching.

Preserve Files search as active filter rule.

Preserve active Filters island full-vault counts.

Preserve markdown-only surfaces where appropriate.

Do not collapse all surfaces to one file list.

Do not hide Files search as panel-local state.

Do not break Data filters while fixing Files.

### 08.02 Must Preserve: Native Search Adapter

Preserve runtime use of core Search view.

Preserve no-CLI runtime rule.

Preserve query restoration.

Preserve progressive updates.

Preserve scope filtering.

Preserve snippets built from native offsets.

Preserve cleanup on destroy.

Do not reintroduce a Preview button.

Do not block search behind manual preview.

Do not spawn child processes at runtime.

### 08.03 Must Preserve: Honest Props Casing

Preserve actual frontmatter key casing.

Preserve exact property filter evaluation.

Preserve `Birthday` smoke.

Do not lowercase displayed property nodes.

Do not make evaluator case-insensitive as a hidden workaround.

Do not merge distinct casing.

Do not let native property info override observed frontmatter keys.

Use native property info only for metadata/type assistance.

### 08.04 Must Preserve: Statistics Cache

Preserve plugin-level cache service.

Preserve file stats cache by path/mtime/size.

Preserve aggregate snapshot cache.

Preserve scope snapshot cache.

Preserve last-good UI behavior.

Preserve IndexedDB storage.

Preserve fallback if IndexedDB unavailable.

Preserve invalidation on metadata/vault events.

Preserve folder-sensitive snapshot signatures.

Do not store large derived cache data in settings JSON.

### 08.05 Must Preserve: Performance HUD

Preserve `window.__vaultmanPerf`.

Preserve bounded samples.

Preserve action logging.

Preserve default-off setting.

Preserve body portal host.

Preserve `mount`/`unmount` cleanup.

Preserve top-right reset after off/on.

Preserve viewport clamp.

Preserve high z-index above Obsidian workspace.

Do not make the HUD visible by default.

Do not move a Svelte-owned root node after mount.

### 08.06 Must Preserve: Files Table Virtualization

Preserve fixed row height model.

Preserve virtual window.

Preserve total scroll height.

Preserve small DOM row count.

Preserve Bases table classes.

Preserve bottom scroll correctness.

Preserve duplicate path prevention.

Preserve visible-cell behavior.

Preserve sort header behavior.

Do not render 11k rows.

Do not restore full-DOM table.

### 08.07 Must Preserve: Tree Virtualization

Preserve fixed-height virtual tree.

Preserve flattening model.

Preserve overscan.

Preserve stable row positions.

Preserve `scrollToId`.

Preserve bottom scroll correctness.

Do not restore `RENDER_LIMIT`.

Do not restore "Show all".

Do not hide performance regressions behind artificial limits.

### 08.08 Must Preserve: Obsidian Class Parity

Preserve tab class alignment.

Preserve active tab class.

Preserve inactive tab theme background.

Preserve minimal nav icon class.

Preserve native-style controls where the stable plan intentionally uses them.

Do not overstyle into sandbox-only visual language if stable is trying to match core.

### 08.09 Must Preserve: Queue Policy

Preserve staged-by-default operation policy.

Preserve persisted bypass setting.

Preserve default off.

Preserve queue island as review surface.

Preserve non-accent apply styling in minimal-compatible queue island.

Do not put stage/bypass controls back in the queue island if the 1.1.0 plan removed them.

Do not silently bypass the queue.

### 08.10 Must Preserve: Stable Guard

Preserve no-AI-files guard in stable worktree.

Preserve clean product-only publication.

Preserve release asset focus.

Do not publish `.agents`.

Do not publish `.claude`.

Do not publish `AGENTS.md`.

Do not publish `CLAUDE.md`.

Do not publish generated agent caches.

## 09. What Must Be Retranslated

### 09.01 Sandbox Features

Sandbox features should be translated, not merged wholesale.

Candidate translation surfaces:

Explorer DataPlane.

ViewHost abstractions.

Bases import/export concepts.

ServiceAPI.

DnD architecture.

Theme token architecture.

Detached leaves.

Ops log and diagnostics.

Native binding concepts.

Those surfaces may be valuable.

They are not automatically stable-ready.

They have dependency chains.

They may carry canary-only assumptions.

They may require migration.

They may conflict with the stable hotfix simplification.

### 09.02 Proto v12 Features

Proto v12 features should be translated through specs.

Candidate translation surfaces:

View taxonomy.

Workspace split.

Control island hierarchy.

Search island.

Stack island.

Nautilus/sidebar/desktop model.

Icon language.

Page transitions.

Design adjacency.

Those are design signals.

They do not directly become Obsidian plugin source.

They need runtime constraints.

They need Obsidian DOM/API feasibility checks.

They need Svelte 5 implementation plans.

### 09.03 Old Stable Behavior

Old stable behavior should be retained only where it remains desirable.

Candidate retained behavior:

Small release surface.

No AI files.

Simple product installation.

Known stable metadata flow.

Conservative user-facing defaults.

Obsidian plugin compatibility.

Do not preserve old stable limitations simply because they are stable.

Do not reintroduce inert controls.

Do not reintroduce fake preview.

Do not reintroduce markdown-only Files view if Files is now a full-vault surface.

## 10. What Must Not Be Merged

### 10.01 Do Not Merge AI Files Into Stable

Do not merge `.agents`.

Do not merge `.claude`.

Do not merge `.codex`.

Do not merge `AGENTS.md`.

Do not merge `CLAUDE.md`.

Do not merge generated agent state.

Do not merge research shards into main.

Do not merge session logs into main.

Do not merge room state into main.

This is a branch-policy requirement.

### 10.02 Do Not Merge Sandbox Wholesale

Do not use `git merge sandbox` as the stable release method.

Do not use sandbox metadata as stable metadata.

Do not import sandbox tooling by accident.

Do not import canary-only services without their dependencies.

Do not import reconstruction architecture under release pressure.

Do not assume broader means better for stable.

### 10.03 Do Not Merge Proto Artifacts As Product Code

Do not copy JSX proto files into `src`.

Do not treat Open Design HTML as plugin runtime.

Do not treat prototype state as persisted settings.

Do not treat proto icons as final implementation without Obsidian class checks.

Do not treat visual intent as API proof.

### 10.04 Do Not Publish Dirty State

Do not publish from a worktree with untracked product files.

Do not publish from a worktree with modified product files not committed.

Do not publish from a worktree whose release metadata says the wrong version.

Do not publish from a worktree whose build artifacts cannot be traced to a commit.

Do not publish from a worktree whose verification evidence predates later edits.

### 10.05 Do Not Trust Existing Tag 1.1.0 Blindly

Do not assume tag `1.1.0` is the desired release.

Do not reuse old release assets without checking hotfix parity.

Do not treat release-please branch as current product authority if hotfix is canonical.

Do not ignore the user's updated stable-candidate clarification.

## 11. Reconciliation Plan

This section is written as a source-backed plan for the next release agent.

It is not executed by this shard.

### 11.01 Phase A - Freeze Identity

Record hotfix worktree path.

Record branch name.

Record HEAD commit.

Record dirty status.

Record untracked files.

Record modified files.

Record version metadata.

Record whether `versions.json` exists and what it says.

Record whether built artifacts are dirty.

Record whether `plugin-dev` contains matching artifacts.

Record exact verification timestamp.

Do not proceed until identity is unambiguous.

### 11.02 Phase B - Decide Stable Base

Preferred base:

The hotfix worktree itself, after capture.

Alternative base:

A new clean branch from hotfix HEAD plus applied worktree patch.

Rejected base:

Old `origin/main` alone.

Rejected base:

Tag `1.1.0` alone.

Rejected base:

Sandbox wholesale.

Decision must be recorded before committing.

### 11.03 Phase C - Capture Dirty Product State

Group changes by release-relevant systems.

Possible commit group one:

Data/Files full-vault filters and native Search adapter.

Possible commit group two:

Statistics cache, storage, and performance HUD.

Possible commit group three:

Tree/table virtualization and native classes.

Possible commit group four:

Props casing and filter evaluator exactness.

Possible commit group five:

Queue policy, settings, i18n, and styling.

The grouping can differ if the actual diff demands it.

Each commit should build.

Each commit should avoid AI files.

Each commit should have a clear release-facing subject.

### 11.04 Phase D - Complete Pending 1.1.0 Tasks

Review Task 7.

Verify folder context menu actions.

Implement missing folder actions if not present.

Review Task 8.

Verify Files badges, auto reveal, sort.

Implement missing badge/reveal/sort work if not present.

Review Task 9.

Verify minimal searchbox.

Implement if still missing.

Review Task 10.

Run verification and runtime smokes.

Do not mark plan complete by assumption.

### 11.05 Phase E - Version Metadata

Bump `manifest.json` to `1.1.0`.

Bump `package.json` to `1.1.0`.

Update `versions.json`.

Update release notes/changelog as required.

Verify `manifest.json` in built plugin-dev output.

Verify release assets contain correct version.

Do not rely on the old `1.0.2` branch name.

Do not leave `1.0.2` in package metadata if publishing `1.1.0`.

### 11.06 Phase F - Verification

Run Svelte autofixer for touched `.svelte` files if implementation changed them.

Run `pnpm run verify`.

Run `pnpm run build`.

Run plugin-dev sync.

Run plugin reload.

Run `dev:errors`.

Run Birthday casing smoke.

Run `.base` Files filter smoke.

Run HUD off/on smoke.

Run Files table switch performance sample.

Run tree bottom-scroll smoke.

Run zero-match active filter smoke.

Run folder context menu smoke.

Run auto reveal smoke.

Record exact outputs.

### 11.07 Phase G - Publication Guard

Check no AI files are staged.

Check no AI files are in release archive.

Check release workflow publishes only plugin assets.

Check release branch does not include agent room state.

Check `.gitignore` and packaging config do not unintentionally include docs.

Check generated assets correspond to source commit.

Check no stale `1.0.2` assets remain in release output.

### 11.08 Phase H - Archive Discipline

Do not delete earlier shards.

If shard 05 is later corrected, create a small appendix or update index note.

If old stable row is superseded, say so explicitly.

If old tag `1.1.0` is superseded, record new release commit/tag separately.

If the hotfix branch is renamed, record old and new identities.

Do not erase the branch-name history.

## 12. Practical Command Checklist

These commands are examples for a release agent.

They are not all executed in this shard.

### 12.01 Identity Commands

Command:

`git -C C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard status --short --branch`

Purpose:

Confirm branch and dirty state.

Command:

`git -C C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard log --oneline --decorate --max-count=20`

Purpose:

Confirm stable candidate history.

Command:

`git -C C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard diff --stat`

Purpose:

Confirm uncommitted product delta size.

Command:

`git -C C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard diff --name-status`

Purpose:

Confirm modified tracked files.

Command:

`git -C C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard ls-files --others --exclude-standard`

Purpose:

Confirm untracked files.

### 12.02 Metadata Commands

Command:

`Get-Content manifest.json -Raw`

Purpose:

Confirm plugin manifest version.

Command:

`Get-Content package.json -Raw`

Purpose:

Confirm package version and scripts.

Command:

`Get-Content versions.json -Raw`

Purpose:

Confirm Obsidian version map.

### 12.03 No-AI Guard Commands

Command:

`Get-ChildItem -Force -Name AGENTS.md,CLAUDE.md,.agents,.claude,.codex`

Purpose:

Confirm forbidden AI files are absent from stable worktree root.

Command:

`git status --short -- AGENTS.md CLAUDE.md .agents .claude .codex`

Purpose:

Confirm no forbidden AI files are staged or modified.

### 12.04 Feature Presence Commands

Command:

`rg -n "filteredVaultFiles|setFileSearchRule|NativeSearchAdapter|StatisticsCacheService|__vaultmanPerf|tableVirtualization|treeVirtualization|performanceHudEnabled|Birthday" src test`

Purpose:

Confirm hotfix-only feature surfaces.

Command:

`rg -n "workspace-tab-header-inner|bases-table-container|vaultman-performance-host" src styles.css`

Purpose:

Confirm native class and HUD host surfaces.

### 12.05 Verification Commands

Command:

`npx @sveltejs/mcp list-sections`

Purpose:

Load Svelte MCP context when editing/analyzing Svelte.

Command:

`pnpm run verify`

Purpose:

Full repo gate.

Command:

`pnpm run build`

Purpose:

Build and sync according to repo script.

Command:

`obsidian vault=plugin-dev plugin:reload id=vaultman`

Purpose:

Runtime reload.

Command:

`obsidian vault=plugin-dev dev:errors`

Purpose:

Runtime error gate.

## 13. Release Gate Matrix

### 13.01 Gate 01 - Branch Identity

Required:

Hotfix worktree path recorded.

Required:

Branch recorded.

Required:

HEAD recorded.

Required:

Dirty state recorded.

Failure means:

Do not publish.

Reason:

The canonical stable candidate cannot be reproduced.

### 13.02 Gate 02 - Dirty State Capture

Required:

No modified tracked product files remain unintentionally dirty.

Required:

No untracked product files remain unintentionally untracked.

Required:

Changes are committed or intentionally packaged by a documented mechanism.

Failure means:

Do not publish.

Reason:

The release would not be source-reproducible.

### 13.03 Gate 03 - Version Metadata

Required:

`manifest.json` says `1.1.0`.

Required:

`package.json` says `1.1.0`.

Required:

`versions.json` maps `1.1.0`.

Required:

Built plugin-dev `manifest.json` says `1.1.0`.

Failure means:

Do not publish as `1.1.0`.

Reason:

User-facing release version would be wrong.

### 13.04 Gate 04 - AI File Exclusion

Required:

No `.agents`.

Required:

No `.claude`.

Required:

No `.codex`.

Required:

No `AGENTS.md`.

Required:

No `CLAUDE.md`.

Required:

No agent state.

Failure means:

Do not merge to main.

Reason:

Branch policy forbids AI workflow files on main.

### 13.05 Gate 05 - Data/Files Behavior

Required:

Data label visible.

Required:

Files label visible.

Required:

Internal page IDs preserved.

Required:

Files uses full-vault results.

Required:

`.base` search works.

Required:

Files search appears as active filter rule.

Required:

Active Filters count reports vault-file count in Files context.

Failure means:

Release would regress the core 1.1.0 parity promise.

### 13.06 Gate 06 - Native Search

Required:

Preview button absent.

Required:

Native Search adapter present.

Required:

Runtime does not call Obsidian CLI.

Required:

Query restoration works.

Required:

Scoped results work.

Required:

Progressive results render.

Failure means:

Content search parity incomplete.

### 13.07 Gate 07 - Props Casing

Required:

Visible node `Birthday`.

Required:

Active rule `Has property: Birthday`.

Required:

Filtered count matches actual files.

Required:

Lowercase `birthday` is not emitted for actual `Birthday` files.

Failure means:

Data filters are dishonest.

### 13.08 Gate 08 - Statistics Cache

Required:

Plugin-level cache service constructed in `main.ts`.

Required:

File cache keyed by freshness signals.

Required:

Last-good snapshot visible.

Required:

IndexedDB storage used when available.

Required:

Fallback behavior works.

Required:

Scope/folder signature prevents stale folder counts.

Failure means:

Statistics remains too expensive or dishonest.

### 13.09 Gate 09 - Virtualization

Required:

Files table virtual window.

Required:

Files tree virtual window.

Required:

No `Show all` artificial path.

Required:

No `RENDER_LIMIT` user-facing row cap.

Required:

Bottom scroll stable.

Required:

No duplicate rows.

Failure means:

Release can freeze large vaults.

### 13.10 Gate 10 - HUD

Required:

HUD default off.

Required:

Settings toggle works.

Required:

One body host when on.

Required:

No host when off.

Required:

Top-right reset after off/on.

Required:

Viewport clamp works.

Failure means:

Debug feature can damage stable UX.

### 13.11 Gate 11 - Pending Task Resolution

Required:

Task 7 status checked.

Required:

Task 8 status checked.

Required:

Task 9 status checked.

Required:

Task 10 completed after all edits.

Failure means:

The stable 1.1.0 plan remains partially open.

### 13.12 Gate 12 - Runtime Cleanliness

Required:

`pnpm run verify` passes.

Required:

`pnpm run build` passes.

Required:

Plugin reload succeeds.

Required:

`dev:errors` clean.

Failure means:

Release is not ready.

## 14. Corrections To Shard 05

Shard 05 remains useful.

Shard 05 should not be deleted.

Shard 05 should be read with the following correction.

Where shard 05 says stable, distinguish:

Old stable.

New hotfix stable candidate.

Old stable means:

`origin/main`

`1.0.1`

Historical published baseline.

New hotfix stable candidate means:

`hotfix/1.0.2-css-scorecard`

Live worktree state.

Target release `1.1.0`.

The hotfix stable candidate contains systems that were not represented in old stable.

Therefore shard 05's promotion priorities should be reweighted.

Data/Files parity is no longer only a future upward move from sandbox/proto.

Data/Files parity is already partially implemented in hotfix.

The priority becomes preservation and completion.

Statistics cache is no longer only a sandbox ambition.

It exists in hotfix dirty state.

The priority becomes capture, verify, and publish-safe metadata.

Native Search adapter is no longer only an architectural recommendation.

It exists in hotfix dirty state.

The priority becomes behavior smoke and query-restoration safety.

Props casing is no longer only a known problem.

It has a hotfix implementation.

The priority becomes preserving exactness.

Performance HUD is no longer only diagnostic tooling.

It exists as an opt-in stable debug surface.

The priority becomes default-off safety.

The old stable row still matters for regression comparison.

It should not dominate release source selection.

## 15. Issue-Ready Work Packages

### 15.01 Work Package A - Capture Hotfix Stable Candidate

Goal:

Turn hotfix worktree state into clean commits.

Inputs:

Hotfix worktree.

Stable 1.1.0 parity plan.

Earlier 1.0.2 core parity plan.

Outputs:

Clean commit set.

No AI files.

Updated branch status.

Verification log.

Acceptance:

`git status --short` clean except intended release artifacts.

### 15.02 Work Package B - Version 1.1.0 Metadata

Goal:

Make stable candidate publish as `1.1.0`.

Inputs:

`manifest.json`

`package.json`

`versions.json`

Release notes.

Outputs:

Consistent version metadata.

Acceptance:

Built plugin manifest reports `1.1.0`.

### 15.03 Work Package C - Finish Tasks 7-9

Goal:

Close remaining stable plan functionality before final verification.

Inputs:

Task 7 folder context menu.

Task 8 Files badges/auto reveal/sort.

Task 9 minimal searchbox.

Outputs:

Implemented or explicitly deferred tasks.

Acceptance:

DOM/runtime smokes pass or documented deferral is approved.

### 15.04 Work Package D - Final Stable Verification

Goal:

Run release gates from clean source.

Inputs:

Clean candidate branch.

Plugin-dev vault.

Obsidian CLI.

Outputs:

Verification evidence.

Acceptance:

`pnpm run verify` pass.

`pnpm run build` pass.

Plugin reload pass.

`dev:errors` clean.

Feature smokes pass.

### 15.05 Work Package E - Stable Publication Guard

Goal:

Ensure publication excludes AI files and includes only plugin assets.

Inputs:

Release branch.

Release workflow.

Built artifacts.

Outputs:

Publication checklist.

Acceptance:

No AI files on main.

Release assets trace to clean source commit.

## 16. Open Questions

Question one:

Should the hotfix branch be renamed before publication?

Current answer:

Not required for code correctness, but the branch name is misleading.

Risk:

Agents may infer `1.0.2` scope from the branch name.

Mitigation:

Docs and release metadata must say hotfix is canonical stable 1.1.0 candidate.

Question two:

Should old tag `1.1.0` be superseded by a new tag?

Current answer:

Likely yes, but release policy must decide tag strategy.

Risk:

Reusing a published tag is dangerous.

Mitigation:

Create a new release candidate or corrected release tag according to project policy.

Question three:

Are Tasks 7-9 hard blockers for 1.1.0?

Current answer:

The plan lists them unchecked.

Risk:

Publishing before them may leave known parity gaps.

Mitigation:

Dev must decide whether to complete or explicitly defer.

Question four:

Should the 868 ms table-switch sample block release?

Current answer:

It is residual risk, not an automatic blocker by itself.

Risk:

Large vault users may still feel one action-window jank.

Mitigation:

Keep residual documented and avoid claiming true Bases-level parity.

Question five:

Should HUD ship in stable?

Current answer:

It can ship if default off and safe.

Risk:

Debug UI can become accidental product chrome.

Mitigation:

Default off, settings-gated, no host when off, no errors.

Question six:

Should sandbox code be cherry-picked into hotfix now?

Current answer:

Only if tied to a specific release blocker.

Risk:

Sandbox wholesale import can destabilize stable.

Mitigation:

Use small, source-backed work packages.

## 17. Practical Release Narrative

The release narrative should be honest.

This is not simply "1.0.2 became 1.1.0 by changing a number".

This is also not simply "sandbox became stable".

The correct narrative is:

Vaultman stable is being rebuilt around a corrected Data/Files experience.

The hotfix line started as `1.0.2` core parity.

The scope grew into a meaningful stable update.

The project now treats it as `1.1.0`.

The hotfix worktree has stable-specific improvements.

Those improvements include full-vault Files behavior.

Those improvements include native Search bridging.

Those improvements include stable performance work.

Those improvements include honest property casing.

Those improvements include native-class visual alignment.

Those improvements include safer debug instrumentation.

The release must preserve those features.

The release must capture them in Git.

The release must publish from clean metadata.

The release must not pretend that old `origin/main` or old tag `1.1.0` is enough.

## 18. Final Shard Claim

Shard 06 adds a fourth practical stream to the model:

`hotfix stable-candidate 1.1.0`

It is a first-class release source.

It is not old stable.

It is not sandbox.

It is not proto.

It is currently more authoritative than `origin/main` for the imminent stable release.

It is currently incomplete as a release artifact because version metadata still says `1.0.2`.

It is currently incomplete as a release artifact because product changes remain dirty/untracked.

It is currently incomplete as a plan because Tasks 7-10 are not all checked.

It is nevertheless the correct thing to preserve.

The next release agent should capture and verify hotfix before publishing.

The next research/index update should note that shard 05's stable row is split.

The next implementation plan should not start from sandbox unless the user explicitly redirects.

The next implementation plan should start from the hotfix worktree.

The next implementation plan should ask:

What is still missing from stable 1.1.0?

Not:

How do we merge everything from sandbox?

This is the main practical difference introduced by the user's latest update.
