---
title: U121 panelWidget implementation checkpoint
type: session
status: active
created: 2026-07-30T08:55:22-05:00
updated: 2026-07-30T08:55:22-05:00
created_by: codex-gpt5-root
tags:
  - agent/session
  - release/1.2.1
  - panel-widget
  - performance
---

# U121 panelWidget implementation checkpoint

- Product worktree: `C:\tmp\vaultman-release-beta2-final2`
- Branch: `codex/u121-panel-widget`
- Product commit: `a0eaf5db` (`feat(scene): make navbar a Scene-owned panelWidget`)
- Local-only architecture commit: `325fc871`
- Full gate: 162 test files / 1042 tests; lint, TypeScript, Svelte,
  Prettier, Stylelint, production build and scorecard passed.
- U121-001–004 implementation is code-complete but still needs final HITL for
  the condensed narrow-width regression.
- U121-029 remains active. Warm expand/collapse/reveal are below 100 ms after
  cached-tree reprojection. Scene open remains about 0.6–0.8 s for 11,128
  files; remaining phases are `explorer.files.build-tree` and
  `explorer.files.decorate-icons`. Cells, sort and nested toggles were added
  to the required next profiling wave by the dev.
- Condensed overflow regression received a verified nowrap/min-width/hidden
  fix in `a0eaf5db`; Wrap remains the only multiline policy.
- Glyph regression diagnosis: `80932195` changed the previous bright
  ten-color Explorer palette to exact `hsl(..., 60%, 40%)` tones. Runtime
  inspection showed opacity is `1`; darkness comes from those color values.
  Proposed adaptation awaiting explicit dev confirmation: restore the bright
  saturated ten-color palette for shared `rainbow` (Files + floating rail)
  while keeping `rainbow-pastel` unchanged.
- Do not close U121-029 or the glyph regression from unit tests alone.
