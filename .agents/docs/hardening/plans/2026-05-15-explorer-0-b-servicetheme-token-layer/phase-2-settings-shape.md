---
title: Phase 2 — Settings shape
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B plan]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/plan
  - explorer/theme
---

# Phase 2 — Settings Shape

One task. Add `themePresetId` and `customPresets` to
`ElasticUiSettings`. Other settings cleanup (deleting legacy fields) is
deferred to T13.

## Task 4 — Extend `ElasticUiSettings` with `themePresetId` and `customPresets`

**Files:**
- Modify: `src/types/typeElasticUi.ts`
- Create: `test/unit/types/typeElasticUi.test.ts` (if absent — check first)

- [ ] **Step 1: Check for existing test file**

Run: `ls test/unit/types/typeElasticUi.test.ts 2>/dev/null && echo "exists" || echo "missing"`

If missing, create a new test file. If exists, append.

- [ ] **Step 2: Write failing tests**

Write or append to `test/unit/types/typeElasticUi.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  normalizeElasticUiSettings,
  DEFAULT_ELASTIC_UI_SETTINGS,
} from '../../../src/types/typeElasticUi';

describe('ElasticUiSettings themePresetId + customPresets', () => {
  it('DEFAULT_ELASTIC_UI_SETTINGS.themePresetId is "vaultman"', () => {
    expect(DEFAULT_ELASTIC_UI_SETTINGS.themePresetId).toBe('vaultman');
  });

  it('DEFAULT_ELASTIC_UI_SETTINGS.customPresets is []', () => {
    expect(DEFAULT_ELASTIC_UI_SETTINGS.customPresets).toEqual([]);
  });

  it('normalizeElasticUiSettings fills default themePresetId for missing input', () => {
    const result = normalizeElasticUiSettings({});
    expect(result.themePresetId).toBe('vaultman');
  });

  it('normalizeElasticUiSettings preserves valid themePresetId string', () => {
    const result = normalizeElasticUiSettings({ themePresetId: 'native' });
    expect(result.themePresetId).toBe('native');
  });

  it('normalizeElasticUiSettings falls back when themePresetId is not a string', () => {
    const result = normalizeElasticUiSettings({ themePresetId: 42 });
    expect(result.themePresetId).toBe('vaultman');
  });

  it('normalizeElasticUiSettings returns [] for missing customPresets', () => {
    const result = normalizeElasticUiSettings({});
    expect(result.customPresets).toEqual([]);
  });

  it('normalizeElasticUiSettings filters invalid customPresets entries', () => {
    const result = normalizeElasticUiSettings({
      customPresets: [
        // valid:
        {
          source: 'custom',
          id: 'good',
          displayName: 'Good',
          useNativeDom: false,
          chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
          density: { rowHeight: '30px', rowPaddingY: '3px', iconSize: '15px' },
          dock: { visible: true, presentation: 'bar' },
          tabs: { visible: true, presentation: 'top-tabs', kind: 'embedded' },
          toolbar: { buttons: 'full' },
          viewModes: ['tree'],
          nodeElements: {
            icon: true, label: true, detail: true, media: false,
            badges: { ops: false, filters: false, warnings: false, inherited: false, counts: false },
            actions: true,
          },
          lockNodeElementVisibility: false,
        },
        // invalid (source built-in):
        { source: 'built-in', id: 'fake-builtin' },
        // invalid (null):
        null,
        // invalid (missing fields):
        { id: 'incomplete' },
      ],
    });
    expect(result.customPresets).toHaveLength(1);
    expect(result.customPresets[0].id).toBe('good');
  });

  it('normalizeElasticUiSettings returns [] for non-array customPresets', () => {
    const result = normalizeElasticUiSettings({ customPresets: 'not-array' });
    expect(result.customPresets).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests — verify FAIL**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/types/typeElasticUi.test.ts`
Expected: FAIL — `themePresetId` / `customPresets` missing from
defaults and normalizer.

- [ ] **Step 4: Modify `src/types/typeElasticUi.ts`**

Replace the file contents with:

```typescript
import type { ThemePresetId, ThemePreset } from './typeThemePreset';
import { normalizeCustomPreset } from './typeThemePreset';

export type VaultmanUiMode = 'thin' | 'balanced' | 'thick';
export type VaultmanUiIdentity = 'native' | 'bases' | 'outline' | 'bookmarks';

export interface ElasticUiSettings {
  mode: VaultmanUiMode;
  identity: VaultmanUiIdentity;
  faintModeEnabled: boolean;
  reducedMotion: boolean;
  foulDetection: boolean;
  themePresetId: ThemePresetId;
  customPresets: ThemePreset[];
}

export const DEFAULT_ELASTIC_UI_SETTINGS: ElasticUiSettings = {
  mode: 'thin',
  identity: 'native',
  faintModeEnabled: false,
  reducedMotion: false,
  foulDetection: false,
  themePresetId: 'vaultman',
  customPresets: [],
};

function normalizeMode(value: unknown): VaultmanUiMode {
  return value === 'balanced' || value === 'thick' || value === 'thin'
    ? value
    : 'thin';
}

function normalizeIdentity(value: unknown): VaultmanUiIdentity {
  return value === 'bases' ||
    value === 'outline' ||
    value === 'bookmarks' ||
    value === 'native'
    ? value
    : 'native';
}

function normalizeThemePresetId(value: unknown): ThemePresetId {
  return typeof value === 'string' && value.length > 0 ? value : 'vaultman';
}

function normalizeCustomPresetsArray(value: unknown): ThemePreset[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeCustomPreset)
    .filter((p): p is ThemePreset => p !== null);
}

export function normalizeElasticUiSettings(raw: unknown): ElasticUiSettings {
  const src =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    mode: normalizeMode(src.mode),
    identity: normalizeIdentity(src.identity),
    faintModeEnabled: src.faintModeEnabled === true,
    reducedMotion: src.reducedMotion === true,
    foulDetection: src.foulDetection === true,
    themePresetId: normalizeThemePresetId(src.themePresetId),
    customPresets: normalizeCustomPresetsArray(src.customPresets),
  };
}
```

- [ ] **Step 5: Run tests — verify PASS**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/types/typeElasticUi.test.ts test/unit/types/typeThemePreset.test.ts`
Expected: PASS — both files green.

- [ ] **Step 6: `pnpm check`**

Run: `pnpm check`
Expected: 0 errors. If errors appear in `src/types/typeSettings.ts`
about `elasticUi: ElasticUiSettings` being incompatible (because the
field was optional `?` before), make the typeSettings field required —
but that change is part of T14. For T4, if check fails due to
typeSettings incompatibility, defer the strict required-ness for now
by keeping `elasticUi?: ElasticUiSettings`.

If `pnpm check` still fails, investigate before continuing.

- [ ] **Step 7: Commit**

```bash
git add src/types/typeElasticUi.ts test/unit/types/typeElasticUi.test.ts
git commit -m "$(cat <<'EOF'
feat(0-b): extend ElasticUiSettings with themePresetId + customPresets

Adds the two new fields required by ThemeService. Default themePresetId
is 'vaultman' (fresh install shows the full plugin look; users opt into
'native' for chameleon disguise). customPresets defaults to [].

normalizeElasticUiSettings filters invalid custom preset entries via
normalizeCustomPreset; non-array input becomes []. Missing or invalid
themePresetId falls back to 'vaultman'.
EOF
)"
```

When Phase 2 is complete, proceed to
[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-3-service-core|Phase 3]].
