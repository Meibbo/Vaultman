---
title: Render model layers
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T15:25:00
updated: 2026-05-04T15:25:00
tags:
  - agent/spec
  - explorer/views
---

# Render Model Layers

## Principle

Layers are semantic facts attached to rows, cells, nodes, or groups.

A layer says what is true. A view decides how to show it.

## Candidate ViewLayers Shape
```ts
export interface ViewLayers {
  icons?: readonly ViewIconLayer[];
  badges?: ViewBadgeLayers;
  highlights?: ViewHighlightLayers;
  state?: ViewStateLayers;
  marks?: readonly ViewMarkLayer[];
}
```

## Icons

Icon layers describe which icons are available and why.

Examples:
- type icon from property type;
- iconic icon override;
- file icon;
- folder icon;
- tag icon;
- queue operation icon;
- filter rule icon.

Candidate shape:
```ts
export interface ViewIconLayer {
  id: string;
  icon: string;
  source: 'type' | 'iconic' | 'file' | 'folder' | 'tag' | 'operation' | 'filter';
  priority?: number;
}
```

Views decide whether to display one icon, multiple icons, or a compact icon
stack.

## Badges

Badge layers should distinguish sources.
Candidate shape:
```ts
export interface ViewBadgeLayers {
  ops?: readonly ViewBadge[];
  filters?: readonly ViewBadge[];
  warnings?: readonly ViewBadge[];
  inherited?: readonly ViewBadge[];
  counts?: readonly ViewBadge[];
}
```

`badges.ops` covers queue operations.

`badges.filters` covers active filter rules or filter-related state.

`badges.warnings` covers conflicts, type incompatibility, or invalid state.

`badges.inherited` covers badges bubbled from hidden/collapsed descendants.

`badges.counts` covers counts where a view wants count badges instead of a
dedicated count column.

## Badge Shape

Candidate shape:
```ts
export interface ViewBadge {
  id: string;
  label?: string;
  icon?: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
  solid?: boolean;
  inherited?: boolean;
  sourceId?: string;
  action?: ViewActionRef;
}
```

Avoid tying the contract to current color names such as `red`, `blue`,
`purple`, `orange`, and `green`. Views can map tones to CSS.

## Highlights

Highlight layers should distinguish query and filter meaning.
Candidate shape:
```ts
export interface ViewHighlightLayers {
  query?: readonly ViewTextRange[];
  filter?: readonly ViewTextRange[];
  warning?: readonly ViewTextRange[];
}
```

`highlights.query` means text matched the user search query.

`highlights.filter` means the node/cell is part of the active filter context.

`highlights.warning` means the text range itself is suspicious or invalid.

Views decide how to project these:
- tree marks label text;
- table marks cell text;
- grid marks tile label;
- cards mark title/properties;
- list marks row text.

## State Layers

Candidate shape:
```ts
export interface ViewStateLayers {
  selected?: boolean;
  focused?: boolean;
  activeFilter?: boolean;
  searchMatch?: boolean;
  deleted?: boolean;
  pending?: boolean;
  disabled?: boolean;
  warning?: boolean;
  editing?: boolean;
  dropTarget?: boolean;
  dragging?: boolean;
}
```

These should replace scattered CSS-state calculations in providers.

## Marks

Marks represent user-saved or system-saved view annotations.

Candidate mark kinds:
- order;
- query;
- filters;
- specific view;
- queue list template;
- column set;
- group set;
- pinned item;
- manual sort;
- template membership.

Candidate shape:
```ts
export interface ViewMarkLayer {
  id: string;
  kind: ViewMarkKind;
  label?: string;
  icon?: string;
  source: 'user' | 'system' | 'template';
}
```

## Layer Sources

`serviceViews` should collect layers from:
- `DecorationManager` for icons and text ranges;
- `filterService` and `activeFiltersIndex` for active filter state;
- `queueService` and `operationsIndex` for operation badges;
- explorer provider metadata for domain-specific facts;
- mark/template storage for saved view annotations;
- interaction state for selection, focus, DnD, expansion.

## No Layer Loss

When a view cannot visually display a layer, it should degrade intentionally.

Examples:
- `viewGrid` may show only a badge count if many badges exist;
- `viewTable` may move badges into a synthetic status column;
- `viewList` may show only first badge plus count;
- `viewTree` may bubble descendant badges to collapsed parent.

The render model should still include the full layer data.
