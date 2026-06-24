# Cuts 6-9 Implementation Plan

Date: 2026-05-08
Branch: sandbox

## User Request

Implement cuts 6, 7, 8, and 9. While doing that:

- Make the `open-*` commands behave as toggles.
- Add a Settings option for the Files explorer to show dot-prefixed hidden files and folders.
- Fix Files explorer folder hierarchy so folder nodes represent their full path by default.
- Show non-Markdown file extensions where file property counters appear.

## Cut Scope

Cut 6 moves concrete explorer providers out of component containers and exposes stable provider/API imports.

Cut 7 makes hover badge operations respect multi-selected nodes and warns when a new badge action would contradict an existing delete or mutation badge.

Cut 8 ingests filters from selected explorer nodes, including box-selected groups, instead of only acting on the clicked node.

Cut 9 makes content search state reactive enough for progress/status display and incremental result updates.

## Implementation Steps

1. Add tests first:
   - Files hidden-dot filtering default/off and settings opt-in.
   - Nested folder path construction.
   - Non-Markdown extension labels in count slots.
   - Provider import path migration.
   - Command toggle behavior.
   - Multi-selected hover badge forwarding and contradiction warning.
   - Content search status/progress rendering.

2. Implement provider/API migration:
   - Add `src/providers/*` concrete provider modules.
   - Add `src/api/explorerProvider.ts` public provider contract exports.
   - Keep old container imports as compatibility shims during the cut.

3. Implement Files explorer behavior:
   - Add `explorerFilesShowHidden` setting, default `false`.
   - Filter dot-prefixed path segments unless enabled.
   - Build missing ancestor folders recursively before attaching children.
   - Add `TreeNode.countLabel` and render it before numeric count.

4. Implement command toggles:
   - Add host toggle support for the main Vaultman view.
   - Make view/sort menu hooks close when already open.
   - Make find/replace command collapse when already open in replace mode.

5. Implement multi-selection badge and filter ingestion:
   - Pass selected same-type nodes into provider hover badge handlers.
   - Apply filter/set/delete to all selected nodes where safe.
   - Keep rename single-target unless the provider already has explicit multi-rename semantics.
   - Warn on delete-plus-mutation contradictions.

6. Implement content search progress:
   - Track index query status with scanned/total/result counts.
   - Notify subscribers during scans so the Content tab can render progress.
   - Render a compact status row above results.

## Verification

Focused:

- `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts`
- `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceCommandsRegistration.test.ts`
- `pnpm exec vitest run --project component --config vitest.config.ts --fileParallelism=false test/component/panelExplorerSelection.test.ts test/component/panelExplorerDeleteConflict.test.ts test/component/reactiveExplorers.test.ts`

Then:

- Svelte autofixer for modified `.svelte` files.
- `pnpm run check`
- Relevant unit/component suites, and broader verification if the focused suite is clean.
