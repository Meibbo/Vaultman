---
title: Version Streams + Code Distillation Flow
type: research-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-27T00:00:00
updated: 2026-05-28T21:24:03
created_by: claude-opus-4-7
updated_by: codex-gpt-5
tags:
  - agent/research
  - initiative/hardening
  - release/discipline
  - agent/process
---

# Version Streams + Code Distillation Flow

User-defined (2026-05-27) version topology + the worry to resolve: keep the streams from
diverging so the distillation stays valuable. Expands ADR 0006 (2-channel → 5-stream). Feeds the
[[docs/work/publish/index|publish]] initiative.

## The 5 streams (distillation order: proto → canary → beta → stable; goal = anchor)

| Stream | Branch / form | Role | Stability |
|---|---|---|---|
| **goal** | docs / architecture (this work) | north-star spec; slowly refined; defines what SHOULD land in stable | target |
| **proto design** | Claude-design, jsx / own toolchain (`Downloads/vaultman`) | most rolling; sketches/abstractions OR external-project references; inspiration only. Docs name the STREAM "proto design"; pin a snapshot id (e.g. v6) only when mapping | throwaway |
| **canary** | `sandbox` branch | creative / less-responsible features; may break; tags = extraction/reference | most unstable code |
| **beta / nightly** | `dev` branch | testing freedom; may break; moving toward stable | unstable |
| **stable** | `main` branch | curated, must work; = v1.0.0 continuation (placeholders OK), NOT the mis-released sandbox | release |

Reverse = the **code-distillation flow**: proto/external → canary (`sandbox`) → beta (`dev`) →
stable (`main`), with **goal (docs)** as the refinement anchor guiding all of it.

## Branch ↔ channel mapping (user-authoritative 2026-05-27)

`main` = stable · `dev` = beta/nightly · `sandbox` = canary. ⚠️ **Supersedes** the earlier
assumption (ADR 0006 / research-streams said `sandbox` = beta). ADR 0006 + publish must reconcile.
Dev re-confirmed on 2026-05-28 during feature-request intake: publish discipline is THIS newer
version-streams model, not the older sandbox-beta model.

## Current pain (the publish track owns the fix)

- stable should be the **v1.0.0 continuation** (placeholders OK), not the sandbox build that was
  **mis-released as stable** (it should have been beta/nightly).
- stable carries now-obsolete libs/tools; sandbox has too many broken features → a straight
  fast-forward is unsafe.
- proto (Claude-design) refused our Svelte (its nature = its own jsx), based itself on a
  recent-ish sandbox, recreated styles in scss → implementing it = **re-translate jsx → svelte =
  duplicated work** (inherent cost of proto being a different toolchain; accept + minimize).

## Flow discipline (researched 2026-05-27)

**Tags / releases per stream (pre-release labels OPEN — corrected 2026-05-27):**
- stable (`main`): semver `1.x.y` (release); `manifest.json` **immutable until release** (stage in
  assets; husky hook blocks manifest commits to `main`). Obsidian auto-updates store users on tag.
- proto: **no releases / no version.json**; different toolchain → never merges (re-translate to svelte).
- `dev` + `sandbox` pre-release **labels = OPEN** (publish track). Constraints:
  1. labels map to stability — `nightly` < `canary` < `beta` < `rc` < release (more than two allowed);
  2. semver pre-release is **linearly ordered** → a `beta` published AFTER an `rc` on the same
     version base is NOT detected as an update → each channel needs its own version line or
     consistently-sorted identifiers;
  3. candidate: `dev` = the more-stable (rc-ish), `sandbox` = the less-stable (canary/nightly) —
     exact label + per-channel versioning TBD. The earlier `dev=beta / sandbox=rc` scheme was
     naive/backwards (rc is MORE stable than beta).

**Promotion = upward only:** cherry-pick / PR **sandbox → dev → main** (PR, not direct merge);
**reject downward merges**. Keep canary fresh with a weekly **`dev → sandbox` rebase** (not merge) to
catch breakage early. proto = re-implement, never upstream code.

**Anti-divergence (the core worry):**
- shared `package-lock.json` for **main + dev**; sandbox + proto may diverge but **lose upgrade
  rights when backporting** (lock the dep at backport time).
- **feature flags** (dev-side) isolate experimental code instead of long-lived divergent branches.
  NOTE: this is **separate** from `serviceUnload` / load-preset — that is a **user-facing
  granularity** feature (the user chooses how lite/bloated Vaultman is; anti-uninstall), NOT
  release discipline. Do not conflate the two.
- upward-only PR gates + green checks on all channels.

**Fixes the mis-release incident:** branch-protect `main` (require review + green CI on all channels
before merge) + the husky manifest-block hook — that is what should have caught the
sandbox-released-as-stable mistake.

## Remaining OPEN

- exact promotion-gate checklist (which tests/smokes pass to move sandbox→dev→main).
- adopt dev-side feature-flags for the canary stream? (separate from the user-facing load-preset).
- the stable reconciliation itself (v1.0.0 continuation vs current main) = the **publish** track.

Sources: BRAT developer guide · trunk-based-development branch-for-release · Obsidian sample-plugin manifest/versions.

## Status

Topology + pain + flow discipline (researched) captured → hand mechanics to the
[[docs/work/publish/index|publish]] initiative. Q1 flip approved (proto = rolling reference stream).
Linear `tiles` confirmed (02-render-and-data).
