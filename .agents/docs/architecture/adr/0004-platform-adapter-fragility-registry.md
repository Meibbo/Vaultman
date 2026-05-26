---
title: 0004 — PlatformAdapter + Fragility Registry
type: adr
status: active
parent: "[[docs/architecture/adr/README|adr]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/adr
  - explorer/platform
---

# 0004 — PlatformAdapter + Fragility Registry

**Decision status:** Accepted. **Date:** 2026-05-26.

## Context

Several planned features require Obsidian private/undocumented APIs or monkey-patches:
floating tiles (hover-editor patches `WorkspaceLeaf` + `interact.js`), menu interception,
native-ribbon relocation. These break when Obsidian ships updates.

## Decision

Every monkey-patch / private-or-undocumented-API access lives in **one named
`PlatformAdapter`** module with: a runtime **capability probe**, a **degraded
fallback**, and a **`serviceUnload` revert**. All adapters are enumerated in a
**Fragility Registry**; on load, failed probes auto-disable that feature gracefully
(no crash). **T.G shape-tests** assert the private symbols and gate `minAppVersion` bumps.

## Consequences

- Fragile zones are enumerable, unloadable, update-friendly (one adapter per fix),
  and self-degrading. Optional features can be `serviceUnload`-gated per user.
- Adds a thin boundary layer; all platform-risky code must route through it.

## Alternatives considered

- Public-API-only: kills the ambitious features that require private APIs.
- Scattered feature-detection: unmaintainable; hard to unload or audit.
- Vendoring Obsidian types + pinning: does not prevent runtime breakage.
