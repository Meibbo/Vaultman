---
title: Field visibility settings contract
type: implementation-plan
status: done
parent: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/index|pretext-grid-cards-plan]]"
created: 2026-05-10T00:00:00
updated: 2026-05-10T00:15:00
tags:
  - agent/plan
  - initiative/polish
  - explorer/views
---

# Task 1: Field Visibility Settings Contract

**Files:**

- Modify: `src/types/typeSettings.ts`
- Create: `src/services/serviceNodeFieldVisibility.ts`
- Test: `test/unit/services/serviceNodeFieldVisibility.test.ts`

## Steps

- [x] **Step 1: Write the failing field visibility unit tests**

Create `test/unit/services/serviceNodeFieldVisibility.test.ts` with tests for:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
	fieldDefinitionsFor,
	fieldVisibilityKey,
	normalizeVisibleFields,
	setVisibleFieldsForSettings,
	toggleVisibleField,
	visibleFieldsFromSettings,
} from '../../../src/services/serviceNodeFieldVisibility';
import { DEFAULT_SETTINGS, type VaultmanSettings } from '../../../src/types/typeSettings';

function settings(): VaultmanSettings {
	return structuredClone(DEFAULT_SETTINGS);
}

describe('serviceNodeFieldVisibility', () => {
	it('builds stable provider/view keys', () => {
		expect(fieldVisibilityKey('files', 'cards')).toBe('files:cards');
		expect(fieldVisibilityKey('tags', 'grid')).toBe('tags:grid');
	});

	it('returns provider-specific cards definitions', () => {
		expect(fieldDefinitionsFor('files', 'cards').map((field) => field.id)).toEqual([
			'icon',
			'name',
			'date',
			'tags',
			'path',
			'size',
		]);
		expect(fieldDefinitionsFor('props', 'cards').map((field) => field.id)).toEqual([
			'icon',
			'text',
			'count',
			'type',
			'values',
			'date',
		]);
	});

	it('falls back to defaults when settings are missing', () => {
		expect(visibleFieldsFromSettings(settings(), 'files', 'cards')).toEqual([
			'icon',
			'name',
			'date',
		]);
	});

	it('drops unknown fields and keeps stable ordering', () => {
		expect(normalizeVisibleFields('files', 'cards', ['size', 'bogus', 'name', 'icon'])).toEqual([
			'icon',
			'name',
			'size',
		]);
	});

	it('repairs invalid identity state by restoring the first default identity field', () => {
		expect(normalizeVisibleFields('files', 'cards', ['date', 'tags'])).toEqual([
			'icon',
			'date',
			'tags',
		]);
		expect(normalizeVisibleFields('tags', 'cards', ['count'])).toEqual(['icon', 'count']);
	});

	it('toggles fields while preserving identity rules', () => {
		const current = ['icon', 'name', 'date'];
		expect(toggleVisibleField('files', 'cards', current, 'path')).toEqual([
			'icon',
			'name',
			'date',
			'path',
		]);
		expect(toggleVisibleField('files', 'cards', ['icon'], 'icon')).toEqual(['icon']);
		expect(toggleVisibleField('files', 'cards', ['icon', 'name'], 'icon')).toEqual(['name']);
	});

	it('persists normalized fields only when explicitly called', async () => {
		const s = settings();
		const saveSettings = vi.fn(async () => undefined);
		await setVisibleFieldsForSettings(
			{ settings: s, saveSettings },
			'files',
			'cards',
			['path', 'name', 'bogus'],
		);
		expect(s.viewFieldVisibility?.['files:cards']).toEqual(['name', 'path']);
		expect(saveSettings).toHaveBeenCalledOnce();
	});
});
```

- [x] **Step 2: Run the tests and verify they fail**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeFieldVisibility.test.ts
```

Expected: fail because `serviceNodeFieldVisibility.ts` does not exist and
`viewFieldVisibility` is not part of `VaultmanSettings`.

- [x] **Step 3: Add the settings field**

Modify `src/types/typeSettings.ts`:

```ts
/** Persisted visible node fields keyed by `${providerId}:${viewMode}`. */
viewFieldVisibility?: Record<string, string[]>;
```

Add to `DEFAULT_SETTINGS`:

```ts
viewFieldVisibility: {},
```

- [x] **Step 4: Implement `serviceNodeFieldVisibility.ts`**

Create `src/services/serviceNodeFieldVisibility.ts` with these exported
contracts:

```ts
import type { ExplorerViewMode } from '../types/typeViews';
import type { VaultmanSettings } from '../types/typeSettings';

export type NodeFieldId =
	| 'icon'
	| 'text'
	| 'count'
	| 'files'
	| 'nested'
	| 'date'
	| 'type'
	| 'values'
	| 'name'
	| 'ext'
	| 'tags'
	| 'path'
	| 'size';

export interface NodeFieldDefinition {
	id: NodeFieldId;
	labelKey: string;
	defaultOn: boolean;
	identity?: boolean;
}

export interface FieldVisibilityHost {
	settings: VaultmanSettings;
	saveSettings(): Promise<void>;
}

const COMMON_TAG_FIELDS: readonly NodeFieldDefinition[] = [
	{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true, identity: true },
	{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true, identity: true },
	{ id: 'count', labelKey: 'viewmode.pill.count', defaultOn: true },
	{ id: 'files', labelKey: 'viewmode.pill.files', defaultOn: false },
	{ id: 'nested', labelKey: 'viewmode.pill.nested', defaultOn: false },
	{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
];

const COMMON_PROP_FIELDS: readonly NodeFieldDefinition[] = [
	{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true, identity: true },
	{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true, identity: true },
	{ id: 'count', labelKey: 'viewmode.pill.count', defaultOn: true },
	{ id: 'type', labelKey: 'viewmode.pill.type', defaultOn: false },
	{ id: 'values', labelKey: 'viewmode.pill.values', defaultOn: false },
	{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
];

const FILE_CARD_FIELDS: readonly NodeFieldDefinition[] = [
	{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true, identity: true },
	{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true, identity: true },
	{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: true },
	{ id: 'tags', labelKey: 'viewmode.pill.tags', defaultOn: false },
	{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: false },
	{ id: 'size', labelKey: 'viewmode.pill.size', defaultOn: false },
];

const FILE_TREE_FIELDS: readonly NodeFieldDefinition[] = [
	{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true, identity: true },
	{ id: 'ext', labelKey: 'viewmode.pill.ext', defaultOn: true },
	{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
	{ id: 'tags', labelKey: 'viewmode.pill.tags', defaultOn: false },
	{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: false },
];

const CONTENT_FIELDS: readonly NodeFieldDefinition[] = [
	{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: true, identity: true },
	{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true, identity: true },
	{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
];

export function fieldVisibilityKey(providerId: string, viewMode: ExplorerViewMode): string {
	return `${providerId}:${viewMode}`;
}

export function fieldDefinitionsFor(
	providerId: string,
	viewMode: ExplorerViewMode,
): readonly NodeFieldDefinition[] {
	if (providerId === 'files') return viewMode === 'tree' ? FILE_TREE_FIELDS : FILE_CARD_FIELDS;
	if (providerId === 'tags') return COMMON_TAG_FIELDS;
	if (providerId === 'props') return COMMON_PROP_FIELDS;
	if (providerId === 'content') return CONTENT_FIELDS;
	return COMMON_TAG_FIELDS;
}

export function defaultVisibleFields(providerId: string, viewMode: ExplorerViewMode): string[] {
	return fieldDefinitionsFor(providerId, viewMode)
		.filter((field) => field.defaultOn)
		.map((field) => field.id);
}

export function normalizeVisibleFields(
	providerId: string,
	viewMode: ExplorerViewMode,
	raw: readonly string[] | undefined,
): string[] {
	const definitions = fieldDefinitionsFor(providerId, viewMode);
	const allowed = new Set(definitions.map((field) => field.id));
	const requested = raw?.length ? raw : defaultVisibleFields(providerId, viewMode);
	const requestedSet = new Set(requested.filter((id) => allowed.has(id as NodeFieldId)));
	const identity = definitions.filter((field) => field.identity);
	if (identity.length > 0 && !identity.some((field) => requestedSet.has(field.id))) {
		const fallback = identity.find((field) => field.defaultOn) ?? identity[0];
		requestedSet.add(fallback.id);
	}
	return definitions.filter((field) => requestedSet.has(field.id)).map((field) => field.id);
}

export function visibleFieldsFromSettings(
	settings: VaultmanSettings,
	providerId: string,
	viewMode: ExplorerViewMode,
): string[] {
	return normalizeVisibleFields(
		providerId,
		viewMode,
		settings.viewFieldVisibility?.[fieldVisibilityKey(providerId, viewMode)],
	);
}

export function toggleVisibleField(
	providerId: string,
	viewMode: ExplorerViewMode,
	current: readonly string[],
	fieldId: string,
): string[] {
	const next = new Set(current);
	if (next.has(fieldId)) next.delete(fieldId);
	else next.add(fieldId);
	return normalizeVisibleFields(providerId, viewMode, [...next]);
}

export async function setVisibleFieldsForSettings(
	host: FieldVisibilityHost,
	providerId: string,
	viewMode: ExplorerViewMode,
	fields: readonly string[],
): Promise<string[]> {
	const normalized = normalizeVisibleFields(providerId, viewMode, fields);
	host.settings.viewFieldVisibility = {
		...(host.settings.viewFieldVisibility ?? {}),
		[fieldVisibilityKey(providerId, viewMode)]: normalized,
	};
	await host.saveSettings();
	return normalized;
}
```

- [x] **Step 5: Run focused unit tests**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeFieldVisibility.test.ts
```

Expected: all tests pass.

## Completion Notes

- Added `viewFieldVisibility?: Record<string, string[]>` to
  `VaultmanSettings` and `DEFAULT_SETTINGS`.
- Added `src/services/serviceNodeFieldVisibility.ts` with provider/view field
  definitions, stable settings keys, default-field resolution, unknown-field
  pruning, identity repair, field toggling, and explicit persistence through a
  host `saveSettings()` callback.
- Added `test/unit/services/serviceNodeFieldVisibility.test.ts` covering the
  Task 1 contract.
- The implementation deliberately treats `undefined` settings as "use defaults"
  while treating an explicit empty array as user state that must be repaired to
  the minimum identity field. That distinction keeps first-run defaults rich
  without re-enabling fields a user explicitly turned off.

## Verification

- RED:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeFieldVisibility.test.ts`
  failed because `serviceNodeFieldVisibility.ts` did not exist.
- GREEN focused:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeFieldVisibility.test.ts`
  passed with 1 file and 7 tests.
- Broad checks:
  `pnpm run check` passed with 0 errors and 0 warnings.
- Broad lint:
  `pnpm run lint` passed with 0 warnings and 0 errors.
- Full unit suite:
  `pnpm run test:unit` passed with 78 files and 537 tests.
