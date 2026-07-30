# Sub-system O baseline log

Captured: 2026-05-18T05:32:46.8389315-05:00 Branch tip: sandbox @ 6de592d

## LOC

- `src/components/frame/frameVaultman.svelte`: 866 lines

## Live plugin-dev smoke

Initial `obsidian` CLI call reported that Obsidian was not running. The Obsidian app was started for `plugin-dev`, `obsidian dev:errors vault=plugin-dev` then returned `No errors captured.`, and the baseline smoke sequence below was rerun against the live vault.

### plugin:reload

```text
Reloaded: vaultman
```

### vaultman:open-view-menu

```text
Executed: vaultman:open-view-menu
```

### vaultman:open-diff

```text
Executed: vaultman:open-diff
```

### dev:errors

```text
No errors captured.
```

## DOM snapshot file

- Path: `test/component/__snapshots__/frameVaultmanBaseline.test.ts.snap`
- Generated: 2026-05-18T05:26:56-05:00
- Sections: ops, filters, statistics

## Verification

- `pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts --update`: passed; 3 snapshots written.
- `pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts`: passed; 3 tests.
- `pnpm check`: passed; 0 errors / 0 warnings.
- `git diff --check`: clean.
