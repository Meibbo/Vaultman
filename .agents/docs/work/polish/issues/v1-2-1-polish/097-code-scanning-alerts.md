---
title: BT5-097 — 18 code-scanning alerts (9 code findings, 9 OpenSSF policy)
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: HITL
parent: "[[docs/work/polish/issues/v1-2-1-polish/index|v1.2.1 polish backlog]]"
dateCreated: 2026-07-29T20:14:00
dateUpdated: 2026-07-29T20:14:00
created_by: claude-opus-5
updated_by: claude-opus-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.1, security, codeql, ci]
---

# BT5-097 — 18 code-scanning alerts (9 code findings, 9 OpenSSF policy)

## Symptom

The repo's Security-and-quality panel shows 18 open code-scanning alerts alongside the 19 Dependabot ones in [[096-dependency-refresh-and-advisories|BT5-096]]. They are two unrelated populations sharing one badge, and conflating them makes the work look larger and more dangerous than it is.

Queried via `gh api repos/Meibbo/Vaultman/code-scanning/alerts?state=open`.

## Population 1 — CodeQL code findings (9)

| Sev | Rule | Location | Count |
| --- | --- | --- | --- |
| high | `js/remote-property-injection` | `src/utils/dragFrontmatter.ts` | 4 |
| high | `js/regex-injection` | `scripts/release-core.mjs` | 1 |
| warning | `js/template-syntax-in-string-literal` | `scripts/run-explorer-scroll-smoke.mjs` | 2 |
| warning | `js/useless-assignment-to-local` | `scripts/release.mjs` | 1 |
| warning | `js/trivial-conditional` | `scripts/release.mjs` | 1 |

**Only the first row is in shipped product source, and only on stable.**
`src/utils/dragFrontmatter.ts` exists on `main` and is **absent from sandbox** — no file of that name anywhere in the sandbox tree. So either the logic moved under a new name (and carries the same pattern, unflagged because CodeQL scans the default branch) or it was dropped. **That must be resolved first:** it decides whether this is a live product bug or already-deleted code.

`remote-property-injection` on frontmatter drag means a property name taken from external data is used to index an object. In a frontmatter editor that is a plausible real path, not a false positive by default — a crafted property name could reach `__proto__` or overwrite unintended keys. Worth reading before dismissing.

The four `scripts/` findings are build/release tooling, never shipped. The `regex-injection` in `release-core.mjs` is worth a real look because release scripts run with a token in CI; the three warnings are hygiene.

## Population 2 — OpenSSF Scorecard policy findings (9)

These come from the `scorecard.yml` workflow and are **repo-configuration metrics, not code defects**. No source change fixes them.

| Sev | Check | Where |
| --- | --- | --- |
| high | `TokenPermissionsID` | `.github/workflows/release.yml` |
| high | `TokenPermissionsID` | `.github/workflows/release-please.yml` |
| high | `TokenPermissionsID` | `.github/workflows/codeql.yml` |
| high | `BranchProtectionID` | repo setting |
| high | `CodeReviewID` | repo setting |
| high | `VulnerabilitiesID` | mirrors the Dependabot backlog (BT5-096) |
| medium | `SecurityPolicyID` | missing `SECURITY.md` |
| medium | `FuzzingID` | no fuzzing configured |
| low | `CIIBestPracticesID` | no CII badge |

The three `TokenPermissionsID` findings are the cheapest real wins: add a least-privilege `permissions:` block to each workflow. `SecurityPolicyID` is one file. `BranchProtectionID` and `CodeReviewID` need dev decisions about the solo-maintainer workflow — branch protection on a repo where the dev pushes directly has a real cost, and requiring review with no second reviewer would block the release path. `FuzzingID` and `CIIBestPracticesID` are almost certainly "won't do" for a plugin of this shape; dismissing them with a recorded reason is a legitimate resolution and stops them recurring.

## Plan

- [ ] **Resolve the `dragFrontmatter.ts` question first:** find whether the pattern survives in sandbox under another name. If it does, fix both lines;
      if the file was deleted, the 4 alerts close when sandbox lands.
- [ ] Review the `remote-property-injection` sites on their merits — confirm whether an external property name can reach an object index, and guard with an allowlist or `Object.hasOwn` / null-prototype map as appropriate.
- [ ] Review `js/regex-injection` in `release-core.mjs` — release scripts run privileged in CI.
- [ ] Fix or dismiss the three `scripts/` warnings.
- [ ] Add least-privilege `permissions:` blocks to the three flagged workflows.
- [ ] Add `SECURITY.md`.
- [ ] **Dev decisions:** branch protection and required review under a solo-maintainer model; and whether `FuzzingID` / `CIIBestPracticesID` get dismissed as won't-do with a recorded reason.

## Acceptance criteria

- [ ] Every code-scanning alert is fixed or dismissed with a recorded reason.
- [ ] No `remote-property-injection` path remains reachable from external frontmatter in shipped source on either line.
- [ ] The three workflows declare explicit least-privilege permissions.
- [ ] The Security-and-quality panel distinguishes nothing left to act on from deliberately-accepted findings.

## Notes

Shares the "repo looks clean" goal with BT5-096 but is otherwise independent:
that one is dependency versions, this one is code and repo policy. The `VulnerabilitiesID` scorecard check is the single overlap — it will clear when BT5-096 clears.
