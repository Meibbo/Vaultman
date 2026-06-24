---
title: LUPA add-on architecture and first slice for Notebook Navigator
type: research
status: active
created: 2026-06-15
updated: 2026-06-15
parent: "[[index|Notebook Navigator API research for first LUPA add-on]]"
tags:
  - agent/research
  - lupa/addon
  - interop/notebook-navigator
---

# LUPA add-on architecture and first slice

## Recommended first LUPA add-on shape

Name: `lupa-notebook-navigator-bridge`

Purpose: integrate LUPA with the user's existing Notebook Navigator workflow without adopting Notebook Navigator internals.

Core modules:

- `NotebookNavigatorProbe`: detect plugin, version, readiness, missing capabilities.
- `NotebookNavigatorBridge`: typed wrapper around the public API.
- `NotebookNavigatorMenuAddon`: register/dispose context-menu actions.
- `NotebookNavigatorEventSource`: listen to events and publish LUPA snapshots.
- `NotebookNavigatorNavigationTarget`: allow LUPA to reveal/navigate in Notebook Navigator.

Minimum capability flags:

```ts
type NotebookNavigatorAddonCapabilities = {
  available: boolean;
  version: string | null;
  canRevealFile: boolean;
  canNavigateFolder: boolean;
  canNavigateTag: boolean;
  canNavigateProperty: boolean;
  canReadSelection: boolean;
  canRegisterMenus: boolean;
  canObserveEvents: boolean;
  canPinFiles: boolean;
};
```

## First implementation slice

1. Vendor or copy `notebook-navigator.d.ts` into the add-on typing boundary.
2. Add a probe service that returns capability flags and never throws if Notebook Navigator is missing.
3. Register a file menu action using `registerFileMenu`.
4. On click, convert the file/menu selection into a LUPA-owned snapshot and open the corresponding LUPA panel/lens.
5. Register `selection-changed` and `nav-item-changed` listeners and keep only the latest normalized snapshot in LUPA state.
6. Add a LUPA command: `Reveal current LUPA item in Notebook Navigator`, implemented with `navigation.reveal`.
7. Add unload cleanup for all `EventRef`s and menu dispose callbacks.

Defer until after slice 1:

- pin sync;
- folder/tag/property visual metadata writes;
- property/tag aggregate lenses beyond simple menu-to-snapshot;
- any feature that needs Notebook Navigator's cache or list result enumeration.

## SOLID/LUPA fit

- Single Responsibility: the bridge only adapts Notebook Navigator API shape to LUPA. It does not own LUPA search, snapshots, or rendering.
- Open/Closed: LUPA gains an add-on without changing core provider contracts.
- Liskov: bridge methods should return capability-aware results instead of throwing plugin-specific errors.
- Interface Segregation: separate navigation, selection, menu, events, metadata, and pins interfaces.
- Dependency Inversion: core LUPA depends on an `ExternalNavigatorBridge` contract, not `app.plugins.plugins["notebook-navigator"]`.

## Risks and guardrails

- Missing plugin: all commands should degrade to disabled/no-op with a clear reason.
- Older API: require `2.x` for first add-on; menu support differs before 2.0.0.
- Stale selection: selection APIs return latest known Navigator state, not necessarily a freshly computed query.
- Hidden files: `reveal()` can fail if hidden items are off.
- Tag/property absence: navigation can fail if target is not present in current trees.
- User-owned appearance: metadata writes can overwrite intentional colors/icons. Keep them opt-in.
- Runtime permissiveness: docs note runtime accepts broad values even when types are stricter. Validate in LUPA before passing CSS colors/icons.
- Cleanup: every menu registration and event subscription must be disposed on unload.

## Upstream/API wishlist for future LUPA phases

If LUPA needs deeper Notebook Navigator integration, ask upstream for public read APIs rather than touching internals:

- current list-pane result paths;
- read-only folder/tag/property tree snapshots;
- public preview/thumbnail lookup by `TFile`;
- public search/filter invocation with returned paths;
- explicit command/action API for opening Navigator in a known state without UI side effects.
