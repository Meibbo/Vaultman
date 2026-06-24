---
title: Stylelint research for Obsidian CSS gate
type: research
status: active
parent: "[[docs/work/publish/index|Publish]]"
created: 2026-06-04T04:57:25
updated: 2026-06-04T04:57:25
tags:
  - agent/research
  - initiative/publish
  - release/1-0-2
  - stylelint
  - obsidian
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Stylelint Research For Obsidian CSS Gate

## Question

What stylelint setup should Vaultman use for a `1.0.2` release-blocking CSS
gate, given that no current Vaultman stream has `stylelint` and stable already
let Obsidian Scorecard-style CSS issues escape?

## Findings

- Public search did not find an official Obsidian plugin stylelint config.
- Obsidian developer docs for plugin styling emphasize `styles.css` in the
  plugin root and use of Obsidian CSS variables for theme compatibility:
  <https://docs.obsidian.md/Plugins/User%20interface/HTML%20elements> and
  <https://docs.obsidian.md/Reference/CSS%20variables/About%20styling>.
- Obsidian docs point developers to Discord `#plugin-dev` and `#theme-dev`, but
  Discord history is not publicly inspectable from this environment:
  <https://docs.obsidian.md/Home>.
- Obsidian Hub's theme guide recommends a basic Stylelint setup using
  `stylelint-config-recommended`, disabling `font-family-no-missing-generic-family-keyword`
  and `no-descending-specificity` for Obsidian theme false positives:
  <https://publish.obsidian.md/hub/04%20-%20Guides%2C%20Workflows%2C%20%26%20Courses/Guides/Why%20and%20How%20to%20use%20Stylelint%20for%20your%20Obsidian%20Theme>.
- Chris Grieser's Obsidian Theme Design Utilities recommends
  `stylelint-no-unsupported-browser-features` for CSS feature compatibility,
  with browser targets around recent Chrome and iOS Safari:
  <https://github.com/chrisgrieser/obsidian-theme-design-utilities>.
- Prism Theme, a mature Obsidian theme, uses `stylelint`,
  `stylelint-config-recommended`, `stylelint-config-recess-order`,
  `stylelint-declaration-block-no-ignored-properties`, and
  `stylelint-no-unsupported-browser-features`, but its package currently uses
  older Stylelint 15-era config/rules:
  <https://github.com/damiankorcz/Prism-Theme>.
- Current npm registry checks on 2026-06-04:
  - `stylelint`: `17.12.0`
  - `stylelint-config-recommended`: `18.0.0`
  - `stylelint-config-standard`: `40.0.0`
  - `stylelint-no-unsupported-browser-features`: `8.1.1`
  - `stylelint-declaration-block-no-ignored-properties`: `3.0.0`

## Recommendation

For stable `1.0.2`, use a narrow, blocking Stylelint gate:

- start with `stylelint` plus `stylelint-config-recommended`;
- disable the two Obsidian-theme false-positive rules identified by the
  Obsidian Hub guide if they trigger on Vaultman CSS;
- add `stylelint-declaration-block-no-ignored-properties` only if it remains
  compatible with Stylelint 17 and does not create broad false positives;
- evaluate `stylelint-no-unsupported-browser-features` in the plan, but do not
  make browser-compatibility warnings block `1.0.2` unless targets are explicit;
- keep the custom Scorecard scan because it catches Vaultman/Obsidian release
  patterns Stylelint does not understand directly.

This is deliberately narrower than Prism's theme config because Vaultman is a
plugin release patch, not a full Obsidian theme style-system pass.

