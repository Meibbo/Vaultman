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

Expected: fail because `serviceNodeFieldVisibility.ts` does not exist and `viewFieldVisibility` is not part of `VaultmanSettings`.

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

Create `src/services/serviceNodeFieldVisibility.ts` with these exported contracts:

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

Continua en [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/01-field-visibility-shard-1|continuacion 1]].