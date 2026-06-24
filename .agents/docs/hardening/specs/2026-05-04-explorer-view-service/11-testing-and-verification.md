---
title: Testing and verification
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T15:25:00
tags:
  - agent/spec
  - explorer/views
---

# Testing And Verification

## Test Strategy

Most behavior should be tested as TypeScript service/model tests before Svelte
component tests.

Component tests should verify projection and accessibility surface, not
business logic.

## Unit Tests

Add tests for `serviceViews`.

Cases:

- builds rows from nodes;
- preserves stable IDs;
- applies query highlight ranges;
- applies filter highlight state;
- maps queue operations to `badges.ops`;
- maps active filter rules to `badges.filters`;
- marks deleted/pending state;
- preserves full layers when view cannot display them;
- produces empty state for no rows;
- tracks selection per explorer;
- tracks expansion per explorer;
- tracks view mode per explorer.

## Decoration Tests

Extend `serviceDecorate.test.ts` or add a new layer test.

Cases:

- prop icon by type;
- tag icon;
- file/folder icon;
- iconic override;
- query highlight ranges;
- no highlight when query empty;
- case-insensitive matching;
- filter highlight source separation;
- no badge source loss during bridge.

## Queue Badge Tests

Test operation-to-node matching.

Cases:

- property delete creates danger op badge on prop node;
- property set/rename creates update badge;
- tag delete creates danger op badge on tag node;
- tag add creates success op badge;
- file operation creates file badge where supported;
- queue badge action references removable queue entry;
- badge IDs are stable;
- duplicate op badges are not collapsed incorrectly.

## Active Filter Tests

Cases:

- `has_property` marks matching prop node active;
- `specific_value` marks matching value node active;
- `has_tag` marks matching tag node active;
- folder/file filters mark matching file/folder rows;
- filter badge appears in active filters explorer;
- filter highlight is separate from query highlight.

## Bubbling Tests

Cases:

- expanded parent does not receive inherited child badges as hidden badges;
- collapsed parent receives descendant badges;
- inherited badges are marked inherited;
- duplicates are collapsed by stable badge identity;
- inherited badge action still points to source operation if allowed;
- nested collapsed ancestors bubble from deep descendants.

## ViewList Component Tests

Cases:

- renders rows from render model;
- renders icon, label, detail, badges;
- forwards primary action;
- forwards remove action;
- handles empty state;
- virtualizes visible rows;
- does not import plugin services.

## ViewTree Component Tests

Cases:

- renders query highlights;
- renders filter state;
- renders badge groups;
- renders inherited badge style;
- toggles expansion through callback;
- forwards row click;
- forwards context menu;
- forwards badge action;
- does not query plugin services.

## ViewTable Component Tests

MVP cases:

- renders headers from columns;
- renders rows and cells;
- uses stable row/cell keys;
- forwards sort changes;
- forwards row selection;
- renders query highlights in cell text;
- renders filter highlight state;
- renders badges in status column or cell projection;
- does not depend on `TFile` or `App`.

Future cases:

- cell focus;
- range selection;
- copy/paste;
- column resize;
- column reorder;
- inline edit commit/cancel.

## Integration Tests

Existing component tests should be extended or new tests added:

- queue island renders through `viewList`;
- active filters island renders through `viewList`;
- props explorer uses centralized queue badges;
- tags explorer uses centralized queue badges;
- files explorer uses centralized query highlights;
- panel explorer routes `tree`, `table`, `grid`, `cards`, and `list`.

## Build Verification

For each implementation slice:

- run focused unit tests;
- run related component tests;
- run `pnpm run build`;
- run Svelte autofixer for changed `.svelte` files;
- run line count/doc health only when docs changed.

## Manual Smoke

Manual smoke in Obsidian:

- open Files explorer in tree mode;
- search by file name and folder;
- open Props explorer in tree mode;
- add a prop/value filter;
- queue a prop operation and verify badge appears;
- collapse parent and verify bubbling;
- open Queue island and verify list rows;
- open Active Filters island and verify list rows;
- switch to table mode once available;
- confirm views do not lose badges/highlights.

