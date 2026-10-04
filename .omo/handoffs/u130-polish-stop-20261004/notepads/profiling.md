# Profiling Correction (2026-10-03, Sisyphus)

- `selftime-check.mjs` contains 18 `eq` assertions (counted on 2026-10-03), not 19.
- All 18 pass, exit 0. This corrects worker-report.md Addendum A ("19/19 deterministic checks").
- Canonical spec records the correction in `11-profile-honesty.md` and `12-appendix-corrections.md` (§11).
