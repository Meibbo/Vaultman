---
title: Bases interop service
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/index|bases-import-plan]]"
created: 2026-05-05T02:36:37
updated: 2026-05-05T16:11:11
tags:
  - agent/plan
  - bases/import
---

# Bases Interop Service

## Files

- Create: `src/types/typeBasesInterop.ts`
- Create: `src/services/serviceBasesInterop.ts`
- Test: `test/unit/services/serviceBasesInterop.test.ts`

## Steps

- [x] Write failing tests for parsing `.base`, combining global/view filters, reporting unsupported expressions, and extracting fenced blocks.

```ts
it('imports global and view filters as an and group', () => {
	const preview = previewBasesImport({
		sourcePath: 'Projects.base',
		content: 'filters:\\n  and:\\n    - status == \"open\"\\nviews:\\n  - type: table\\n    name: Open\\n    filters:\\n      or:\\n        - file.name.contains(\"Project\")\\n',
		targetViewName: 'Open',
	});
	expect(preview.filter?.logic).toBe('and');
	expect(preview.report.applied.length).toBeGreaterThan(0);
	expect(preview.report.unsupported).toContainEqual(expect.objectContaining({ expression: expect.stringContaining('file.name.contains') }));
});
```

- [x] Run: `pnpm run test:unit -- --run test/unit/services/serviceBasesInterop.test.ts`

Expected: fail because the files do not exist.

- [x] Add `typeBasesInterop.ts` with `BasesImportSource`, `BasesImportPreview`, `BasesInteropReport`, `BasesImportTarget`, and `BasesUnsupportedExpression`.

- [x] Implement `serviceBasesInterop.ts` with:

```ts
import yaml from 'js-yaml';
import type { FilterGroup, FilterNode } from '../types/typeFilter';

export function previewBasesImport(input: PreviewBasesImportInput): BasesImportPreview {
	const config = yaml.load(input.content) as Record<string, unknown> | null;
	const root = buildRootFilter(config, input.targetViewName);
	return { source: input, rawConfig: config ?? {}, filter: root.filter, report: root.report };
}
```

- [x] Keep conversion narrow: object `and/or/not` groups recurse, string expressions become unsupported unless matched by explicit safe patterns.

- [x] Add `extractBasesFencedBlocks(content: string)` that returns block index, raw content, and line start.

- [x] Run targeted service tests again.

Expected: pass, with unsupported expressions preserved in report and not applied.
