---
title: "NN-4 native Obsidian surface adapter - continuation 1"
type: continuation-shard
status: active
parent: "[[docs/work/hardening/plans/2026-05-09-node-notes-nn4-native-surface-adapter/index|NN-4 native Obsidian surface adapter]]"
shard_source: ".agents/docs/work/hardening/plans/2026-05-09-node-notes-nn4-native-surface-adapter/index.md"
shard_of: "[[docs/work/hardening/plans/2026-05-09-node-notes-nn4-native-surface-adapter/index|NN-4 native Obsidian surface adapter]]"
shard_part: 1
created: 2026-05-10T15:35:56
updated: 2026-05-10T15:35:56
tags:
  - agent/shard
created_by: codex
updated_by: codex
---

# NN-4 native Obsidian surface adapter - continuation 1

Continua desde [[docs/work/hardening/plans/2026-05-09-node-notes-nn4-native-surface-adapter/index|NN-4 native Obsidian surface adapter]].

- middle click on a supported folder returns `true`, calls `bindOrCreate` with the folder input, and prevents/stops native behavior.
- modifier click on an unrelated element returns `false` and leaves the event alone.

- [x] **Step 2: Run tests and verify RED**

Expected: fail because `handleNativeBindingClick` is missing.

- [x] **Step 3: Implement click helper**

Implement only the pure click contract. Do not register DOM events yet.

- [x] **Step 4: Run tests and verify GREEN**

Run the focused unit command. Expected: all service tests pass.

## Task 3: Hover Preview Contract

**Files:**

- Modify: `src/services/serviceNativeSurfaceBinding.ts`
- Test: `test/unit/services/serviceNativeSurfaceBinding.test.ts`

- [x] **Step 1: Write failing hover tests**

Add tests for:

```ts
export function handleNativeBindingHover(event, deps): boolean
```

Assertions:

- a tag surface with exactly one alias match triggers `workspace.trigger` with source `vaultman-native-surface` and the matched note path.
- zero alias matches do not trigger.
- two alias matches do not trigger.

- [x] **Step 2: Run tests and verify RED**

Expected: fail because `handleNativeBindingHover` is missing.

- [x] **Step 3: Implement hover helper**

Use `computeAliasToken(...)` and `findNotesByAlias(...)`; never call `bindOrCreate(...)` from hover.

- [x] **Step 4: Run tests and verify GREEN**

Run the focused unit command. Expected: all service tests pass.

## Task 4: Obsidian Component Wiring

**Files:**

- Modify: `src/services/serviceNativeSurfaceBinding.ts`
- Modify: `src/main.ts`
- Modify: `test/helpers/obsidian-mocks.ts` only if needed.
- Test: `test/unit/services/serviceNativeSurfaceBinding.test.ts`

- [x] **Step 1: Write failing service wiring test**

Assert a `NativeSurfaceBindingService` instance:

- registers hover source through `plugin.registerHoverLinkSource(...)`
- registers `click`, `auxclick`, and `mouseover` handlers on the document with capture enabled
- disposes cleanly through Obsidian `Component` lifecycle

- [x] **Step 2: Run tests and verify RED**

Expected: fail because the component class or registration details are missing.

- [x] **Step 3: Implement component**

`NativeSurfaceBindingService extends Component` and receives:

```ts
{
  plugin: Plugin;
  app: App;
  bindingService: NodeBindingService;
  doc?: Document;
}
```

`onload()` calls `plugin.registerHoverLinkSource(...)`, then registers the document event handlers. `main.ts` constructs the service after `nodeBindingService` and adds it as a plugin child.

- [x] **Step 4: Run tests and verify GREEN**

Run focused unit tests. Expected: all pass.

## Task 5: Verification And Records

**Files:**

- Update current plan checkboxes.
- Update node-notes priority record with NN-4 outcome and verification.
- Update current status/handoff compactly.

- [x] **Step 1: Run focused unit tests**

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNativeSurfaceBinding.test.ts test/unit/services/serviceNodeBinding.test.ts
```

- [x] **Step 2: Run broad static/build checks**

```powershell
pnpm run lint
pnpm run check
pnpm run build
```

- [x] **Step 3: Run live Obsidian smoke**

Use the existing Obsidian CLI smoke path if available:

```powershell
obsidian vault=plugin-dev plugin:reload vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev dev:errors
```

Expected: plugin reloads, Vaultman opens, and `dev:errors` reports no captured Vaultman runtime errors.

- [x] **Step 4: Run whitespace check**

```powershell
git diff --check
```

- [x] **Step 5: Update records**

Mark NN-4 done only after the commands above have fresh passing output. If live smoke is unavailable, leave NN-4 as implemented-without-live-smoke and record the blocker explicitly.
