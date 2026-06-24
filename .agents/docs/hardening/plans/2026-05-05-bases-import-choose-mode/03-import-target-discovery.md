---
title: Import target discovery
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/index|bases-import-plan]]"
created: 2026-05-05T02:36:37
updated: 2026-05-05T16:11:11
tags:
  - agent/plan
  - bases/import
---

# Import Target Discovery

## Files

- Create: `src/index/indexBasesImportTargets.ts`
- Create: `src/components/containers/explorerBasesImport.ts`
- Modify: `src/types/typeContracts.ts`
- Modify: `test/helpers/obsidian-mocks.ts`
- Test: `test/unit/index/indexBasesImportTargets.test.ts`

## Steps

- [x] Write a failing index test using `mockApp` with one `.base`, one markdown file with a fenced `bases` block, and one incompatible markdown file.

```ts
it('discovers only compatible Bases import targets', async () => {
	const files = [mockTFile('A.base'), mockTFile('B.md'), mockTFile('C.md')];
	const app = mockApp({ files, adapterFiles: new Map([
		['A.base', 'views:\\n  - type: table\\n    name: Main\\n    filters:\\n      and:\\n        - status == \"open\"\\n'],
		['B.md', '```bases\\nviews:\\n  - type: table\\n    name: Inline\\n```'],
		['C.md', 'plain note'],
	]) });
	const index = createBasesImportTargetsIndex(app);
	await index.refresh();
	expect(index.nodes.map((n) => n.path)).toEqual(['A.base', 'B.md']);
});
```

- [x] Run: `pnpm run test:unit -- --run test/unit/index/indexBasesImportTargets.test.ts`

Expected: fail because index does not exist.

- [x] Add `BasesImportTargetNode` to `typeContracts.ts` or `typeBasesInterop.ts` and export an index type.

- [x] Add `getFiles(): TFile[]` to the test helper `Vault` interface and `mockApp` vault object, because real Obsidian exposes `Vault.getFiles()` and `.base` files are not markdown. Update `mockTFile` so `file.extension` is derived from the filename, making `mockTFile('A.base').extension === 'base'`.

- [x] Implement `createBasesImportTargetsIndex(app)` using `app.vault.getFiles()` for `.base` files and `.md` fenced-block candidates. Filter by `file.extension === 'base'` or path ending `.base`, and read markdown files only when `extension === 'md'`.

- [x] Implement `explorerBasesImport` as an `ExplorerProvider` that builds tree rows: source parent nodes and view/block child nodes. `handleNodeSelection` calls the supplied `onImportTarget(target)` callback.

- [x] Run targeted index tests.

Expected: compatible targets are present; incompatible notes are absent.
