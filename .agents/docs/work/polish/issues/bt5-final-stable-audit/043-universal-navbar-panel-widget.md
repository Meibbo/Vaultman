---
title: BT5-043 — Universal Navbar panelWidget host
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
updated: 2026-07-30T05:20:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags:
  - agent/issue
  - triage/needs-triage
  - initiative/polish
  - release/1.2.0
  - navbar
  - architecture
dateCreated: 2026-07-22T13:05:00
---

# BT5-043 — Universal Navbar panelWidget host

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].
Corrects the page-owned toolbar architecture exposed by BT5-037/039.

## What to build

Introduce one Scene-owned Navbar, classified as a `panelWidget`, mounted once by the Vaultman frame. Preserve `Toolbar` as a settings and UX alias for v1.2.x, but remove ownership from Files, Statistics or any page.

The Navbar is not a provider registry. PSS resolves the active provider together with effective PVPUI view/space configuration into a DOM-free `panelWidget` node projection: which nodes exist, their node/cell kinds, ordering, availability and which references target ActionNodes. The Navbar renderer owns only render, measured overflow and focus lifecycle. Action invocation crosses the owning Scene's narrow WASA seam, which coordinates sibling panels such as Explorer without importing their implementations into the renderer.

## Acceptance criteria

- [ ] One Navbar host is mounted per Vaultman frame and survives provider switches.
- [ ] A typed `panelWidget` projection supplies stable node/action ids, labels, icons, node/cell kinds, order and availability from `{provider + effective PVPUI config}`.
- [ ] PSS-facing projection resolution is DOM-free and independently testable; the renderer does not discover providers.
- [ ] ActionNodes invoke a Scene-local WASA port; the renderer never imports Explorer/provider implementations.
- [ ] Providers cannot instantiate a second toolbar/navbar renderer.
- [ ] Existing saved Toolbar settings act as the v1.2.x PVPUI compatibility input without losing action ids or order.
- [ ] The host exposes one focus/keyboard model and one overflow seam.
- [ ] Tests prove provider switching changes contributions without remounting the host.
- [ ] Canonical docs identify Navbar as a `panelWidget`; UX copy may still say Toolbar.

## Blocked by

None — can start immediately.
