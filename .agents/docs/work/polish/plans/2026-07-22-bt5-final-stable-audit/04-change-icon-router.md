---
title: BT5 final stable audit plan — ChangeIcon capability router
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Vaultman v1.2.0 final stable audit implementation plan]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, icons]
---

# Canonical ChangeIcon capability router and adapters

## Task 10 — BT5-047 canonical router

**Read first:** [[../../issues/bt5-final-stable-audit/047-change-icon-capability-router|BT5-047]].

**Create:**

- `src/types/typeChangeIcon.ts`
- `src/services/serviceChangeIcon.ts`
- `test/unit/changeIconRouter.test.ts`

**Modify:**

- `src/main.ts`
- `src/services/serviceIcons.ts`
- `src/components/containers/explorerFiles.ts`
- `src/components/containers/explorerProps.ts`
- `src/components/containers/explorerTags.ts`
- `src/logic/logicContentContextMenu.ts`
- `src/logic/logicSnippetContextMenu.ts`
- `src/logic/logicPluginContextMenu.ts`
- corresponding context-menu tests

### 10.1 Red — target and adapter contracts

Define the domain once:

```ts
export type ChangeIconTarget =
	| { kind: 'file'; id: string; isFolder: boolean }
	| { kind: 'property'; id: string }
	| { kind: 'tag'; id: string }
	| { kind: 'content'; id: string }
	| { kind: 'snippet'; id: string }
	| { kind: 'plugin'; id: string };

export interface ChangeIconAdapter {
	id: string;
	priority: number;
	canHandle(target: ChangeIconTarget): boolean;
	open(target: ChangeIconTarget, event?: MouseEvent): boolean | Promise<boolean>;
}
```

Router behavior tests:

- sorts enabled adapters by priority then registration order;
- tries the next adapter when `canHandle=false`, `open=false`, throw or rejected promise;
- stops after the first adapter actually accepts;
- invokes no adapter twice;
- returns `false` only when none accepts;
- Vaultman's fallback is always registered for all six target kinds;
- registering an unknown third-party adapter requires no explorer changes.

Use injectable adapters; no Obsidian runtime in these unit tests. Run red:

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/changeIconRouter.test.ts
```

### 10.2 Green — service lifetime and one action route

Instantiate `ChangeIconService` once in `main.ts`, register it as a child, then register adapters. `IconicService` becomes an adapter/resolution dependency rather than the menu-availability owner.

All context-menu actions must call:

```ts
plugin.changeIconService.canChange(target)
plugin.changeIconService.open(target, ctx.event)
```

The persistent per-node-type action IDs may remain as migration aliases for saved menu layouts, but labels/icons/availability/dispatch come from one canonical descriptor. Add a normalizer from historical IDs (`file.iconic-change`, `prop.iconic-change`, `tag.iconic-change`, `content.change-icon`, `snippet.change-icon`, `plugin.change-icon`) to the canonical capability so aliases never render twice.

### 10.3 Green gates

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/changeIconRouter.test.ts test/unit/iconicPropsTagsSource.test.ts test/unit/addonIcons.test.ts test/unit/contentContextMenu.test.ts
pnpm run check
git diff --check
```

- [ ] Confirm no explorer calls `openFileIconPicker`, `openPropertyIconPicker`, `openTagIconPicker`, `openSnippetIconPicker` or `openPluginIconPicker` directly.
- [ ] Confirm menu availability does not depend on Iconic/add-on enabled state.
- [ ] Commit: `refactor(icons): add change-icon capability router`.

## Task 11 — BT5-048 Iconic, add-on and fallback adapters

**Read first:** [[../../issues/bt5-final-stable-audit/048-change-icon-adapters-and-fallback|BT5-048]].

**Create:**

- `src/services/changeIconAdapterIconic.ts`
- `src/services/changeIconAdapterVaultman.ts`
- optional `src/logic/logicChangeIconMigration.ts`
- expand `test/unit/changeIconRouter.test.ts`

**Modify:**

- `src/services/serviceIcons.ts`
- `src/logic/logicAddonIcons.ts`
- `src/modals/modalAddonIconPicker.ts`
- `test/unit/serviceIcons.test.ts`
- `test/unit/iconicPropsTagsSource.test.ts`
- `test/unit/addonIcons.test.ts`
- `test/unit/filesIconLiveRefresh.test.ts`

### 11.1 Red — adapter matrix

Build table-driven tests for every target:

| Runtime | File/Content | Property | Tag | Snippet | Plugin |
|---|---|---|---|---|---|
| Iconic enabled + runtime item | Iconic picker | Iconic picker | Iconic picker | Iconic synthetic picker | Iconic synthetic picker |
| Iconic enabled + missing item/API | fallback | fallback | fallback | fallback | fallback |
| Iconic plugin disabled | fallback | fallback | fallback | fallback | fallback |
| Vaultman add-on integration disabled | fallback | fallback | fallback | fallback | fallback |
| Iconic throws/cancels | fallback only when not accepted | same | same | same | same |

An accepted picker opens with the current icon/color selected. Its callback is intercepted once, persists to the correct owner, invalidates caches, emits one coalesced change, and refreshes visible explorers without restart.

### 11.2 Green — make acceptance and persistence explicit

- Iconic adapter obtains real runtime items for file/property/tag; if absent, it must return `false`, not synthesize an empty selection.
- Snippet/plugin may synthesize adapter items but must seed them from Vaultman override and intercept the result into Vaultman settings.
- Vaultman fallback opens `modalAddonIconPicker` for every target kind and supports reset.
- Move fallback responsibility out of the Iconic-named service so the fallback exists even when that service/integration is absent.
- Treat picker open and result commit separately: cancel produces no settings write; accepted clear removes the override.
- Preserve the deferred icon-resolution cache and raw-file refresh behavior; router changes action dispatch, not large-tree render cost.

### 11.3 Dedupe and migration tests

For Props/Tags, register both historical aliases in a fake persisted layout and assert one visible `Change icon`. For Files/Content pointing at the same path, assert each menu has one row and both dispatch the same target kind/persistence route. Normalize legacy layouts without deleting user order/visibility.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/changeIconRouter.test.ts test/unit/serviceIcons.test.ts test/unit/iconicPropsTagsSource.test.ts test/unit/addonIcons.test.ts test/unit/filesIconLiveRefresh.test.ts test/unit/contentContextMenu.test.ts
pnpm run check
git diff --check
```

### 11.4 HITL matrix

- [ ] Add-on on/off × Iconic plugin on/off.
- [ ] Files folder/file, Content file, Property, Tag, Snippet, Plugin.
- [ ] Existing icon/color preselected, set, clear, cancel.
- [ ] No double menu rows in Props/Tags.
- [ ] Changed icon refreshes immediately and survives reload.
- [ ] A fake higher-priority third-party adapter can accept a target; a rejecting one falls through.

Commit: `fix(icons): unify picker adapters and fallback`.

## Adversarial boundary after Task 11

Re-check adapters that lie (`open` returns true but throw later), plugin unload between menu creation and click, target rename during an open picker, duplicate IDs from two adapters, and unknown color formats. Document unsupported cases; do not let one third-party failure remove the fallback action.
