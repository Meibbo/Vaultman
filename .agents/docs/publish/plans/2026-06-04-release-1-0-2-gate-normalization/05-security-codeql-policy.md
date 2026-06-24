---
title: Release 1.0.2 Plan - security and CodeQL
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

# Task 05: Security And CodeQL

**Files:**
- Modify: `src/modals/modalQueueDetails.ts`
- Create: `SECURITY.md`

- [ ] **Step 1: Remove CodeQL dead guard**

In `src/modals/modalQueueDetails.ts`, change:

```ts
	private formatValue(val: unknown): string {
		if (val === null || val === undefined) return '(empty)';
		if (Array.isArray(val)) {
			if (val.length <= 3) return `[${val.join(', ')}]`;
			// YAML-like list for longer arrays
			return val.map((v) => `  - ${v}`).join('\n');
		}
		if (val == null) return '';
		if (typeof val === 'string') return val;
```

to:

```ts
	private formatValue(val: unknown): string {
		if (val === null || val === undefined) return '(empty)';
		if (Array.isArray(val)) {
			if (val.length <= 3) return `[${val.join(', ')}]`;
			// YAML-like list for longer arrays
			return val.map((v) => `  - ${v}`).join('\n');
		}
		if (typeof val === 'string') return val;
```

- [ ] **Step 2: Create `SECURITY.md`**

Create:

```markdown
# Security Policy

## Supported Versions

Vaultman security fixes are applied to the latest stable release line and to
active prerelease branches when a fix is needed before the next public release.

## Reporting A Vulnerability

Please report suspected vulnerabilities privately through GitHub Security
Advisories for this repository. Do not open a public issue for a suspected
vulnerability.

If GitHub Security Advisories are unavailable, contact the maintainer through
the repository profile and include:

- affected Vaultman version or commit;
- Obsidian version and platform;
- steps to reproduce;
- impact and affected files or vault data;
- proof of concept details needed to validate the issue.

The maintainer will assess validated reports and publish a fix or mitigation
when appropriate.
```

- [ ] **Step 3: Verify CodeQL source pattern is gone**

Run:

```powershell
rg "if \\(val == null\\)" src/modals/modalQueueDetails.ts
```

Expected: no output.

- [ ] **Step 4: Run local gates affected by the change**

Run:

```powershell
pnpm run lint
pnpm run check
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/modals/modalQueueDetails.ts SECURITY.md
git commit -m "fix(security): remove codeql dead guard and add policy"
```
