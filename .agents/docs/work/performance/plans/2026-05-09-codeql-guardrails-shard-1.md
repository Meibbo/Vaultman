---
title: "CodeQL performance guardrails - continuation 1"
type: continuation-shard
status: active
parent: "[[docs/work/performance/plans/2026-05-09-codeql-guardrails|CodeQL performance guardrails]]"
shard_source: ".agents/docs/work/performance/plans/2026-05-09-codeql-guardrails.md"
shard_of: "[[docs/work/performance/plans/2026-05-09-codeql-guardrails|CodeQL performance guardrails]]"
shard_part: 1
created: 2026-05-10T15:35:56
updated: 2026-05-10T15:35:56
tags:
  - agent/shard
created_by: codex
updated_by: codex
---

# CodeQL performance guardrails - continuation 1

Continua desde [[docs/work/performance/plans/2026-05-09-codeql-guardrails|CodeQL performance guardrails]].

   - direct `adapter.read(getUserPath())`
   - direct `app.vault.adapter.write(getUserPath(), ...)`
   - direct `app.vault.adapter.rename(..., getUserPath())`
   - direct `app.vault.getAbstractFileByPath(getUserPath())`
   - direct `app.vault.create(getUserPath(), ...)`
   - direct `app.vault.rename(file, getUserPath())`
4. The good fixture cases were not reported:
   - literal dynamic import source
   - `textContent`
   - literal HTML strings
   - `sanitizeHtml(...)`
   - literal vault paths
   - `safeVaultPath(...)`
   - `app.vault.read(file)` because it takes a `TFile`, not a path string
5. The expected file was updated and the query test passed.

## Verification

- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" query compile --additional-packs codeql\queries\javascript codeql\queries\javascript\vaultman\VirtualizerMissingItemKey.ql` passed.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests\javascript\vaultman\virtualizer-missing-item-key --threads=0` passed with 1 test.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests\javascript\vaultman\trailing-debounce-explorer-refresh --threads=0` passed with 1 test.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests\javascript\vaultman\unbounded-vault-read-promise-all --threads=0` passed with 1 test.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" query compile --additional-packs codeql\queries\javascript codeql\queries\javascript\vaultman\UnsafeDynamicCodePathHtml.ql` passed.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests\javascript\vaultman\unsafe-dynamic-code-path-html --threads=0` passed with 1 test.
- `& "C:\Users\vic_A\codeql-home\codeql\codeql.exe" test run --additional-packs codeql\queries\javascript codeql\tests --threads=0` passed with 4 tests.

CodeQL on Windows repeatedly reported it could not clean up the generated `.testproj` directories after successful test runs. The generated `virtualizer-missing-item-key.testproj` and `trailing-debounce-explorer-refresh.testproj` and `unbounded-vault-read-promise-all.testproj` directories were removed manually after verifying their resolved paths stayed inside their query test fixture directories. The unsafe dynamic code/path/HTML test run also left a generated `.testproj` once; it was removed with the same path check after terminating leftover CodeQL/Java worker processes.

## Remaining Performance Lane

Recommended next slice:

- Static guardrails are now in place for the researched performance/security patterns. The runtime revision-gated explorer model caches slice was implemented separately in [[docs/work/performance/plans/2026-05-09-revision-gated-explorer-model-caches|Revision-gated explorer model caches]].
