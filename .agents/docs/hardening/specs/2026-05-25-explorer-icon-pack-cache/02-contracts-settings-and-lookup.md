---
title: Contracts Settings And Lookup
type: spec-shard
status: draft
parent: "[[index|Explorer Icon Pack Cache]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/icons
  - explorer/settings
---

# Contracts Settings And Lookup

## Icon Descriptor

```ts
export type IconPackId =
  | 'obsidian-lucide'
  | 'iconic'
  | 'adwaita-symbolic'
  | 'adwaita-fullcolor'
  | 'filetype';

export interface IconAssetDescriptor {
  pack?: IconPackId;
  group?: string;
  name: string;
  variant?: 'symbolic' | 'fullcolor' | 'outlined' | 'filled';
  tone?: string;
  size?: number;
  fallback?: IconAssetDescriptor | string;
}
```

String icon names remain supported as shorthand for current Obsidian/Lucide
behavior.

## Lookup Order

Default lookup:

1. explicit descriptor pack;
2. Iconic override for tag/property when applicable;
3. user-selected filetype pack;
4. Adwaita symbolic fallback for known semantic groups;
5. Lucide fallback;
6. generic file/folder/image icon.

## GTK/Adwaita Groups

The registry should support groups such as:

- folder;
- filetype;
- mime;
- action;
- status;
- property;
- tag;
- provider;
- badge.

Group lookup allows semantic requests like `group=filetype name=image-png` to
map to the right pack asset without hardcoding file names in views.

## Settings

User-facing settings:

- preferred icon pack for file types;
- preferred icon pack for folders;
- prefer symbolic or full-color icons;
- use Iconic overrides;
- icon size buckets;
- recolor symbolic icons with theme;
- cache size budget;
- reset icon cache.

Defaults:

- keep current Lucide behavior;
- Iconic overrides remain opt-in/available as today;
- Adwaita pack can be enabled by a preset or setting after assets are bundled.

## Invalidations

Invalidate icon asset cache when:

- theme/preset changes;
- symbolic color policy changes;
- icon pack setting changes;
- pack version changes;
- Iconic data reloads.

Do not invalidate per row if many rows share the same descriptor.

