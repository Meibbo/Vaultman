# Native Luna Repair Prompt — Rejected C3+C2/C4 Checkpoint

You are the sole substantive implementation worker for the rejected U130
C3+C2/C4 checkpoint. You must author the production and test changes yourself
with the native Codex CLI model `gpt-6-luna` through the `luna` lane. Do not
delegate, spawn subagents, invoke another model, or use a retired/default
Lightning, Laguna, MiniMax, GPT-5.6, Muse, Gemini, or OpenCode source route.

## 1. Assignment and authority

- Work only in `/data/data/com.termux/files/home/wt/u130-panel-content`.
- This is a repair of the existing uncommitted implementation, not a rewrite.
  Preserve all pre-existing work and the pre-existing untracked
  `.opencode/skills/tasksmd-writing/SKILL.md`.
- Do not touch canonical `/data/data/com.termux/files/home/wt/u130`, the
  row-polish worktree, or any other worktree.
- Do not look for or invoke an executable named `luna`. The lane launcher has
  already established the native Codex route as `codex exec -m gpt-6-luna`;
  absence of a `luna` binary is not a blocker and must not stop the source
  pass.
- Do not create worktrees, install dependencies, alter lockfiles, reset,
  rebase, checkout away changes, commit, push, deploy, reload a plugin, run
  live Web Lab evaluation, or perform application actions. No V8 profiling.
- Do not edit shared plan/notepad files. Append only to the lane-local report
  named in section 6; never overwrite a shared notepad.
- Before the long source pass, verify the actual branch, HEAD, status, and
  `node_modules` symlink. Then append a visible line beginning exactly with
  `WORKING` and the phase to the lane-local report before continuing. A zero
  exit with no report is not success.

## 2. Target, evidence, and required reading

The target is currently the preserved `fix/u130-polish-lane-1` worktree at
the supervisor's rejected checkpoint (expected HEAD `f0ac41f6`, but verify it;
never assume). Read the complete current contents and diff of:

- `src/services/servicePluginUpdates.ts`
- `src/services/servicePendingUpdatesStore.ts`
- `src/components/containers/explorerPlugins.ts`
- `src/components/layout/navbarFilters.svelte`
- `src/types/typePanelWidget.ts`
- `test/unit/servicePluginUpdates.test.ts`
- `test/unit/servicePendingUpdatesStore.test.ts`
- `test/unit/servicePluginUpdatesCache.test.ts`
- `test/unit/pluginUpdatesToolbar.test.ts`

Also read the required coordination context:

- `/data/data/com.termux/files/home/wt/u130-c1-grouping/.omo/plans/u130-polish-1003.md`
- `/data/data/com.termux/files/home/wt/u130-c1-grouping/.omo/plans/u130-polish-1003-lane-1.md`
- `/data/data/com.termux/files/home/wt/u130-c1-grouping/.omo/plans/u130-polish-1003-dispatch-matrix.md`
- `/data/data/com.termux/files/home/wt/u130-c1-grouping/.omo/notepads/u130-polish-1003/implementation.md`
- `/data/data/com.termux/files/home/wt/u130-c1-grouping/.omo/notepads/u130-polish-1003/research.md`
- The source-grounded C3/C2/C4 spec shards under
  `/data/data/com.termux/files/home/vaultman/.agents/docs/work/performance/specs/2026-10-03-u130-polish/`

Read the relevant current callers and authority/source contracts, including
`pluginUpdatesNative.ts`, `tabPlugins.svelte`, `pageFilters.svelte`,
`apiSceneHost.svelte`, `viewTree.ts`, and the `main.ts` constructor wiring,
before choosing a seam. The native manager remains the installation authority;
the durable store is discovery display state only.

## 3. Bounded files and preservation rules

Repair only these existing production files and their focused tests:

- `src/services/servicePluginUpdates.ts`
- `src/services/servicePendingUpdatesStore.ts`
- `src/components/containers/explorerPlugins.ts`
- `src/components/layout/navbarFilters.svelte`
- `src/types/typePanelWidget.ts`
- `test/unit/servicePluginUpdates.test.ts`
- `test/unit/servicePendingUpdatesStore.test.ts`
- `test/unit/servicePluginUpdatesCache.test.ts`
- `test/unit/pluginUpdatesToolbar.test.ts`

If the service cannot remain below 250 pure source LOC without a focused
extraction, one narrow production helper file under `src/services/` is
allowed, together with its direct focused tests. Do not refactor unrelated
code or add dependencies. Keep serialized writes, default `app.vault`
wiring, native authority separation, existing valid behavior, and all current
passing regression coverage.

The current toolbar test's raw `?raw` source searches are not behavioral
coverage. Replace or supplement them with production behavior tests; do not
hide failures by weakening existing assertions or deleting tests.

## 4. Required C3 lifecycle repair

Use red-first Given/When/Then tests that fail against the current checkpoint,
then implement the smallest root-cause fix. The repaired lifecycle must prove
all of the following:

1. `comparePendingVersions` (or its focused extracted helper) must compare
   valid semantic versions consistently, including prerelease precedence and
   build metadata. At minimum, `1.3.0-beta.9 < 1.3.0`; a stable target must
   not disappear as equal to a prerelease installed version. Add explicit
   stable/prerelease, build-metadata, and invalid-version tests. Reuse an
   existing declared version helper only if it is actually suitable for this
   runtime; otherwise add a small correctly typed helper with a deterministic
   invalid-version policy. No dependency.
2. Native and cached badge decisions must use installed `< target`, not merely
   installed `!== target`. An installed newer version must never create a
   downgrade badge. Apply the same comparison rules to hydration,
   reconciliation, `getPluginUpdate`, and any post-install decision.
3. `installUpdate()` must not call `dropPersisted(id)` merely because a
   snapshot/native record/manager/manifest is unavailable. After restart the
   cache can be a display hint while the native updates map is empty; clicking
   update in that state must warn and must not install, but must retain the
   durable hint. A failed check, offline state, missing manager, missing
   manifest, missing native update record, or no-install warning is not proof
   that an update disappeared. Only confirmed installed `>= target` or an
   explicit user-clear path may erase the hint.
4. Hydration/reconciliation must treat missing manager/manifests as
   unavailable, not uninstalled. Never drop a cached hint when there is no
   actual installed-version evidence. Confirm the restart case with persisted
   bytes still present after the warning path.
5. `PendingUpdatesStore.parseSnapshot` must validate the top-level schema as
   well as entry schema. Reject future/invalid schemas deterministically. A
   wrong-schema `.pending` file must never supersede a valid canonical file.
6. Split malformed-content handling from adapter I/O handling in `load()`.
   A transient read/remove/rename/permission failure is not corruption:
   preserve recoverable valid bytes, do not quarantine valid data, and do not
   remove the canonical file merely because the `.pending` recovery operation
   failed. Malformed JSON/schema/content may be quarantined according to the
   existing approved naming convention. Add injected-failure tests for
   pending read, canonical read, canonical remove, pending rename, and
   quarantine/rename failure as applicable. Keep atomic replacement and
   serialized writes.

Do not over-engineer journals or migration layers beyond the existing
`v1.json`/`.pending`/corrupt-quarantine contract. Keep `managerFor` as the
private native installation authority.

## 5. Required C2/C4 behavioral toolbar repair

Audit the actual active-scene/source contract before changing the count. The
current `PluginsExplorerPanel.getPendingUpdateCount()` exposes the global
service count, which can show `update_all_plugins` for pending IDs outside the
owning scene/provider. The spec says the button mounts only for `>0` eligible
pending `node_plugins` discoveries. If a global count is truly intentional,
cite exact source/spec evidence in the report; do not guess.

Implement and test production behavior, not raw source text:

- zero eligible discoveries hides `update_all_plugins`;
- one or more eligible discoveries shows it;
- pending IDs outside the owning native plugin scene do not show it;
- the non-native/data-source/API scene does not claim native plugin updates;
- the sibling `check_plugin_updates` action remains present and invokable at
  zero pending;
- the service-to-panel refresh subscription updates the toolbar eligibility
  after a discovery/failure/clear and unsubscribes cleanly;
- row badge/tooltips carry the actual cached target version through the
  existing row badge -> `viewTree.ts` tooltip chain, never a guessed locale
  string or a global count.

Use a small production seam/helper or the real panel/port contract so tests
exercise eligibility behavior and scene ownership. Do not copy a conditional
from the Svelte source into a fixture and call that coverage. Preserve sibling
toolbar ordering, visibility overrides, panel ownership, and native install
authority. No unrelated UI polish or design changes.

## 6. Red/green verification and bounded handoff

Test discipline is mandatory:

1. Add/adjust genuine failing behavioral tests first and run the focused
   Vitest files. Record the failing command and meaningful failure in the
   report before production edits.
2. Implement minimally, then run the focused suites, including any focused
   helper suite created for the version/toolbar seam.
3. Run `pnpm run check` and `GIT_MASTER=1 git diff --check` in the target.
   LSP is unavailable and installation is declined; do not install an LSP.
4. Measure changed production files with the pure-LOC rule and keep the
   service under 250 pure LOC via only the allowed narrow extraction.
5. Re-read every changed production and test file after editing. Verify no
   source outside this bounded scope changed, no commit was made, and the
   pre-existing `.opencode` file remains untouched.

Append a bounded completion section (do not overwrite prior report content) to:

`/data/data/com.termux/files/home/wt/u130-panel-content/.omo/evidence/u130-polish-1003/implementation/luna-c3-c2c4-repair-report.md`

The report must include: native passport/attempt/session ID and exact model
`gpt-6-luna`; target worktree/branch and before/after HEAD/status; exact
changed-file list; each red command/result; each green focused-test result;
`pnpm run check`; `git diff --check`; pure LOC measurements; design/authority
decisions for scene eligibility and version ordering; and any blocker or
pre-existing failure. State explicitly that no live QA, deployment, plugin
reload, commit, install, or subdelegation occurred. Stop after this C3+C2/C4
repair checkpoint; do not implement C1, C5, D, F, or G work.
