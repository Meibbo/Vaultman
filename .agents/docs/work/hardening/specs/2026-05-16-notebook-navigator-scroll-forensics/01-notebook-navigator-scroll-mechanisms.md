---
title: Notebook Navigator Scroll Mechanisms
type: spec-shard-index
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator Scroll Forensics]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/performance
  - notebook-navigator
---

# Notebook Navigator Scroll Mechanisms

This shard is split because the NN scroll model is several coupled mechanisms,
not one trick.

## Continuations

1. [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/01a-virtualizer-orchestration|Virtualizer and scroll orchestration]]
2. [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/01b-height-storage-media|Height, storage, and media model]]
3. [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/01c-paint-tests-and-takeaways|Paint, tests, and takeaways]]

## Summary

Notebook Navigator scroll performance comes from a contract:

- render only virtual rows;
- do not execute scroll calls while the scroller is hidden or zero-sized;
- resolve path-to-index late;
- gate pending scrolls by index version;
- coalesce scroll causes with intent priority;
- avoid smooth playback for large jumps;
- estimate row heights synchronously from memory cache and CSS-synced constants;
- load previews/images/blobs after row positioning is already possible;
- suppress hover/quick action churn, not core row text;
- isolate row layout/paint with CSS containment.

The IndexedDB cache supports this by hydrating synchronous memory metadata. It
does not store scroll positions or pre-rendered rows.

