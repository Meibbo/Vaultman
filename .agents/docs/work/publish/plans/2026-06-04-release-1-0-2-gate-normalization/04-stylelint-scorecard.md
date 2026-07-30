---
title: Release 1.0.2 Plan - stylelint and Scorecard
type: plan-step
status: pending
parent: "[[docs/work/publish/plans/2026-06-04-release-1-0-2-gate-normalization/index|Release 1.0.2 gate normalization implementation plan]]"
created: 2026-06-04T05:11:57
updated: 2026-06-04T05:11:57
tags:
  - agent/plan
  - release/1-0-2
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Task 04: Stylelint And Scorecard Gate

**Files:**
- Create: `stylelint.config.mjs`
- Modify: `scripts/scorecard-regression-check.mjs`
- Modify: `package.json` if Task 02 did not add `stylelint`
- Depends on: Task 02

- [ ] **Step 1: Create `stylelint.config.mjs`**

Create:

```js
export default {
	extends: ['stylelint-config-recommended'],
	plugins: ['stylelint-declaration-block-no-ignored-properties'],
	rules: {
		'font-family-no-missing-generic-family-keyword': null,
		'no-descending-specificity': null,
		'declaration-no-important': true,
		'declaration-property-value-disallowed-list': {
			display: ['/contents/i'],
		},
		'plugin/declaration-block-no-ignored-properties': true,
	},
};
```

This is intentionally narrow: it lints `styles.css`, not Svelte component style blocks.

- [ ] **Step 2: Ensure package scripts call stylelint**

Confirm `package.json` contains:

```json
"stylelint": "stylelint styles.css"
```

Confirm `verify` contains `pnpm run stylelint`.

- [ ] **Step 3: Extend Scorecard scan for gate scripts**

In `scripts/scorecard-regression-check.mjs`, add this check after the release title check:

```js
{
	file: 'package.json',
	name: 'verify includes format and stylelint gates',
	test: (text) => {
		const scripts = JSON.parse(text).scripts ?? {};
		return scripts.verify?.includes('pnpm run format:check') &&
			scripts.verify?.includes('pnpm run stylelint') &&
			scripts.check?.includes('svelte-check');
	},
},
```

- [ ] **Step 4: Run CSS gates**

Run:

```powershell
pnpm run stylelint
pnpm run test:scorecard
```

Expected:

```text
Scorecard regression scan passed (17 checks).
```

The count is 17 if only the package gate check is added to the current 16 checks.

- [ ] **Step 5: Commit**

Run:

```powershell
git add stylelint.config.mjs scripts/scorecard-regression-check.mjs package.json
git commit -m "test(release): block css and scorecard gate regressions"
```
