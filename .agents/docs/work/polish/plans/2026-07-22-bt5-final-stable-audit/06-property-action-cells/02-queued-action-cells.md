---
title: BT5 final stable audit plan — queued Property action cells
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Property format and action cells]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, properties, queue]
---

# Checkbox and date/datetime action cells through the queue

## Task 17 — Native Properties research seam (required before BT5-056/057 code)

**Research source:** `C:\Users\vic_A\Desktop\obsidian-web-lab` and a live isolated Obsidian lab instance. Use the local app/web-lab tooling, not assumptions from public API types.

- [ ] Inspect the core Properties DOM and event path for checkbox, date and datetime values.
- [ ] Identify `metadataTypeManager` widget registry/render methods, context object and change callback if present.
- [ ] Record exact runtime member names, arguments, DOM classes, cancel/commit behavior and Obsidian version in the session shard.
- [ ] Trace date-only handling through local calendar day, Daily Note navigation, datetime zone handling, clear and keyboard commit.
- [ ] Verify whether the native renderer can be invoked without its own immediate frontmatter write. If not, intercept the change callback/patch only inside a scoped adapter and restore it synchronously/finally.
- [ ] Never monkey-patch a global method for the lifetime of Vaultman or leave it patched after throw/cancel.

**Create after evidence:**

- `src/services/servicePropertyValueControls.ts`
- `src/types/typePropertyValueControl.ts`
- `test/unit/propertyValueControls.test.ts`

Adapter contract:

```ts
export interface PropertyValueControlRequest {
	container: HTMLElement;
	property: string;
	type: 'checkbox' | 'date' | 'datetime';
	value: unknown;
	onCommit(value: unknown): void;
	onOpenDailyNote?(day: string): void;
}
```

Feature detection must fail closed to an accessible Vaultman control, not to a dead button. The fallback must preserve semantics but may not claim pixel-identical core internals.

## Task 18 — queue replacement seam shared by action cells

**Modify:** `src/types/typeOps.ts`, `src/services/serviceOperationQueue.ts`, `test/unit/operationQueueConflictPolicy.test.ts`.

### Red

Add an optional stable staging identity to interactive intents:

```ts
interface ReplaceablePendingChange {
	stagingKey?: string;
}
```

When an incoming staged change has the same `stagingKey`, replace the existing change in place, preserving queue order and emitting one `changed`; it is not a conflict/duplicate/merge. Different keys keep current conflict policy. Bypass mode executes the latest intent normally.

Key builder for a value node includes property name, original raw value and sorted target file paths; never only property name. Tests: false→true→false leaves one latest operation; two values of the same property remain distinct; overlapping high-impact delete/type still conflict; removal cancels cleanly.

### Green gate

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/operationQueueConflictPolicy.test.ts
pnpm run check
```

## Task 19 — BT5-056 checkbox action_cell

**Modify:** `src/utils/renderPropertyValue.ts`, `src/components/containers/explorerProps.ts`, `src/services/servicePropertyValueControls.ts`, `test/unit/propertyValueRendering.test.ts`, `test/unit/propertyValueControls.test.ts`.

### Red

- formatted checkbox is enabled, keyboard accessible and stops row selection/activation propagation;
- clicking computes from effective pending value, calls `onCommit(boolean)` once and does not mutate frontmatter;
- explorer builds a replaceable Property `set` change with original `oldValue`, native boolean `value`, exact target files and stable key;
- pending state rerenders the checkbox and projects one pencil/rename-style Update badge with queue cancellation;
- raw mode renders only text.

Reuse `_replaceValueInVault` via a public/pure change builder instead of duplicating array/scalar replacement logic.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/propertyValueRendering.test.ts test/unit/propertyValueControls.test.ts test/unit/operationQueueConflictPolicy.test.ts test/unit/fileOperationPresentation.test.ts
pnpm run check
```

**HITL:** scalar/array, true/false spellings, repeated toggles before Apply, cancel badge, Apply, bypass mode, Tree/Table/Cards. Commit: `feat(properties): queue checkbox action cells`.

## Task 20 — BT5-057 date/datetime action_cell

**Modify:** same renderer/control/explorer paths plus `src/logic/logicPropertyDate.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`; create `test/unit/propertyDate.test.ts`.

### Red

- clicking the date/datetime control opens the feature-detected core-style picker with current value selected;
- opening/canceling/navigating produces no queue change;
- select/clear/keyboard commit emits one native string value and stages/replaces the Property `set` intent;
- date-only conversion uses parsed `{year,month,day}` in local time and never `toISOString()` for storage;
- datetime preserves a documented offset/local representation without accidental day shift;
- Daily Note button opens the day and never queues a change;
- invalid/empty values fall back accessibly and can be corrected/cleared.

### Green

Implement local-date helpers independently of DOM. Feed native-widget commits into the same replaceable change builder as checkbox. Keep Daily Note callback separate. Scope any internal interception with `try/finally` and an instance token so concurrent pickers cannot cross-wire commits.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/propertyDate.test.ts test/unit/propertyValueRendering.test.ts test/unit/propertyValueControls.test.ts test/unit/operationQueueConflictPolicy.test.ts
pnpm run check
git diff --check
```

**HITL:** date/datetime; local midnight, DST boundary and non-UTC zone; select/clear/cancel; keyboard/mouse; Daily Note; repeated edits; all supported engines. Commit: `feat(properties): queue date action cells`.

## Adversarial boundary after Task 20

Exercise missing internal widget registry, changed Obsidian member names, two open pickers, plugin unload mid-picker, list-valued dates, invalid ISO strings, locale changes and external frontmatter mutation while an intent is staged. State what degrades to fallback and prove no global patch remains installed.
