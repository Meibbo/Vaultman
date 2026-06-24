---
title: Elastic UI Contracts And Gates
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|elastic-ui-chameleon]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
created_by: codex
updated_by: codex
---

# 00 Contracts And Gates

## Ownership

- Modify: `src/types/typeSettings.ts`
- Modify: `src/services/serviceLayout.ts`
- Create: `src/types/typeElasticUi.ts`
- Create: `test/unit/types/typeElasticUi.test.ts`
- Create: `test/unit/services/serviceLayoutElastic.test.ts`
- Read-only: `package.json`, `src/services/serviceDndSvelteAdapter.ts`,
  `src/services/serviceNodeBinding.ts`, `src/services/serviceNativeSurfaceBinding.ts`

## Shared Contract

Create a single source for the Chameleon vocabulary:

```ts
// src/types/typeElasticUi.ts
export type VaultmanUiMode = 'thin' | 'balanced' | 'thick';
export type VaultmanUiIdentity = 'native' | 'bases' | 'outline' | 'bookmarks';

export interface ElasticUiSettings {
	mode: VaultmanUiMode;
	identity: VaultmanUiIdentity;
	faintModeEnabled: boolean;
	reducedMotion: boolean;
}

export const DEFAULT_ELASTIC_UI_SETTINGS: ElasticUiSettings = {
	mode: 'thin',
	identity: 'native',
	faintModeEnabled: false,
	reducedMotion: false,
};

export function normalizeElasticUiSettings(raw: unknown): ElasticUiSettings {
	const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	return {
		mode: normalizeMode(source.mode),
		identity: normalizeIdentity(source.identity),
		faintModeEnabled: source.faintModeEnabled === true,
		reducedMotion: source.reducedMotion === true,
	};
}

function normalizeMode(value: unknown): VaultmanUiMode {
	return value === 'balanced' || value === 'thick' || value === 'thin' ? value : 'thin';
}

function normalizeIdentity(value: unknown): VaultmanUiIdentity {
	return value === 'bases' || value === 'outline' || value === 'bookmarks' || value === 'native'
		? value
		: 'native';
}
```

## Settings Integration

- [ ] Add `elasticUi?: ElasticUiSettings` to `VaultmanSettings`.
- [ ] Add `elasticUi: DEFAULT_ELASTIC_UI_SETTINGS` to `DEFAULT_SETTINGS`.
- [ ] In `VaultmanPlugin.loadSettings()`, normalize after merging saved data:

```ts
this.settings.elasticUi = normalizeElasticUiSettings(saved.elasticUi);
```

- [ ] Preserve existing `layoutTheme` for backward compatibility. Do not remove
  `layoutTheme`, `faintAccentsWhenWorkspaceFocused`, or the existing layout
  settings in this phase.

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceLayoutElastic.test.ts --fileParallelism=false
```

Expected: saved invalid mode falls back to `thin`; invalid identity falls back
to `native`; booleans remain false unless explicitly `true`.

## Layout Service Extension

Extend `src/services/serviceLayout.ts` without turning it into a theme service.
It should only normalize persisted layout and expose helpers for dashboard
breakpoints:

```ts
export type LayoutViewportKind = 'sidebar' | 'main-leaf';

export function resolveDashboardEnabled(input: {
	width: number;
	kind: LayoutViewportKind;
	mode: VaultmanUiMode;
}): boolean {
	if (input.kind !== 'main-leaf') return false;
	if (input.mode === 'thin') return false;
	return input.width >= 800;
}
```

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceLayoutElastic.test.ts --fileParallelism=false
```

Expected: `main-leaf + width 800 + balanced` returns true; `sidebar`, `thin`,
and width `799` return false.

## Polymorphic Component Contract

Every mode-aware component must accept this minimum data shape, either directly
or through `plugin.themeService`:

```ts
export interface ElasticUiSurface {
	mode: VaultmanUiMode;
	identity: VaultmanUiIdentity;
	useUtilities: boolean;
	useNativeDom: boolean;
	rootClass: string;
}
```

Rules:

- Thin + native: flat Obsidian-like DOM and native mirror classes.
- Thin + bases/outline/bookmarks: flat DOM with identity-specific mirror
  classes where Obsidian has a nearby class vocabulary.
- Balanced: native root classes plus UnoCSS utility shortcuts.
- Thick: DaisyUI semantic classes may be added, but native classes remain on
  roots so snippets can still target Vaultman.

## DnD Dependency Gate

Current package state:

```json
"@dnd-kit/svelte": "^0.4.0"
```

Current handoff says `@thisux/sveltednd` was removed and should stay removed.
The prompt requests `@thisux/sveltednd`. Resolve before DELTA starts:

- [ ] Search package docs and local package constraints.
- [ ] If the architect confirms `@thisux/sveltednd`, DELTA owns dependency
  reversal and must update `src/services/serviceDndSvelteAdapter.ts` and tests.
- [ ] If no explicit confirmation exists, keep `@dnd-kit/svelte@0.4.0` and
  implement the requested "native drag and drop" behavior through the existing
  semantic `DndService` contract.

Verification:

```bash
node -e "const p=require('./package.json'); console.log(p.dependencies['@dnd-kit/svelte'] || p.dependencies['@thisux/sveltednd'] || 'missing')"
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts --fileParallelism=false
```

Expected: exactly one Svelte DnD adapter package is active and the semantic DnD
tests pass.

## Node Notes Contract

Keep `src/services/serviceNodeBinding.ts` authoritative:

- Tag alias: `#${tagPath}`
- Snippet alias: `$${filenameWithoutLeadingDollar}`
- Plugin alias: `%${pluginManifestId}`
- Property alias: `[${propName}]`
- Filename for created notes: clean node label only, never the prefixed token.

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeBinding.test.ts --fileParallelism=false
```

Expected: existing node binding tests pass and any new snippet/plugin cases use
`$` and `%` aliases.
