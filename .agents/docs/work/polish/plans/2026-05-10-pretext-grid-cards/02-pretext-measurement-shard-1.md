---
title: "Pretext measurement service - continuation 1"
type: continuation-shard
status: active
parent: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/02-pretext-measurement|Pretext measurement service]]"
shard_source: ".agents/docs/work/polish/plans/2026-05-10-pretext-grid-cards/02-pretext-measurement.md"
shard_of: "[[docs/work/polish/plans/2026-05-10-pretext-grid-cards/02-pretext-measurement|Pretext measurement service]]"
shard_part: 1
created: 2026-05-10T15:35:56
updated: 2026-05-10T15:35:56
tags:
  - agent/shard
created_by: codex
updated_by: codex
---

# Pretext measurement service - continuation 1

Continua desde [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/02-pretext-measurement|Pretext measurement service]].

			if (!prepared) { prepared = engine.prepare(text, style.font, prepareOptions(style));
				preparedCache.set(key, prepared);
			} const layoutKey = `${key}\u0000${roundedWidth}`;
			const cached = layoutCache.get(layoutKey);
			if (cached) return cached;
			const result = engine.layout(prepared, roundedWidth, style.lineHeight);
			layoutCache.set(layoutKey, result);
			return result;
		}, clear() { preparedCache.clear();
			layoutCache.clear();
		}, };
}
```

- [x] **Step 5: Run focused unit tests**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasure.test.ts
```

Expected: all tests pass.

## Completion Notes

- Added runtime dependency `@chenglou/pretext@^0.0.6`.
- Verified the installed package exports the documented fast path:
  `prepare(text, font, options?)` and
  `layout(prepared, maxWidth, lineHeight)`.
- Added `src/services/serviceTextMeasure.ts` with:
  - `TextMeasureStyle`, `TextMeasureResult`, `TextMeasureEngine`, and
    `TextMeasureService` contracts;
  - `pretextTextMeasureEngine` wrapping `@chenglou/pretext`;
  - `fallbackTextMeasureEngine` for deterministic tests and degraded
    measurement;
  - prepared-text cache keyed by text plus style snapshot;
  - layout cache keyed by prepared key plus rounded width;
  - explicit `clear()` for cache invalidation.
- Added `test/unit/services/serviceTextMeasure.test.ts`.
- Lint forced the fallback engine to treat non-string prepared payloads as empty
  instead of relying on default object stringification. This preserves the
  fallback's own `prepare(text) => text` contract and avoids accidental
  `[object Object]` measurements.

## Verification

- Dependency/API check:
  `pnpm add @chenglou/pretext` added `@chenglou/pretext@^0.0.6`; local
  `dist/layout.d.ts` exposes `prepare`, `layout`, `PrepareOptions`, and
  `LayoutResult`.
- RED:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasure.test.ts`
  failed because `serviceTextMeasure.ts` did not exist.
- GREEN focused:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasure.test.ts`
  passed with 1 file and 4 tests.
- Type/Svelte check:
  `pnpm run check` passed with 0 errors and 0 warnings.
- Lint:
  `pnpm run lint` first failed on `@typescript-eslint/no-base-to-string`, then
  passed with 0 warnings and 0 errors after the fallback correction.
- Build:
  `pnpm run build` passed.
- Full unit:
  `pnpm run test:unit` first hit the known timing-sensitive stress threshold
  while leftover CodeQL/Java workers were consuming CPU. Focused stress rerun
  passed, the workers were terminated, and the clean full unit rerun passed
  with 79 files and 541 tests.
