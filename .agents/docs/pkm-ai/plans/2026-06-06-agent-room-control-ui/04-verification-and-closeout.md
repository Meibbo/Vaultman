---
title: Agent Room Control UI plan part 4 - verification and closeout
type: implementation-plan
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/plans/2026-06-06-agent-room-control-ui/index|agent-room-control-ui-plan]]"
created: 2026-06-06T10:24:00
updated: 2026-06-06T10:24:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent-room
---

# Part 4 - Verification And Closeout

### Task 8: LAN/Mobile Smoke

**Files:**
- Modify: `.agents/tools/pkm-ai/room-ui/server.ts` if smoke reveals startup output problems.
- Modify: `.agents/tools/pkm-ai/room-ui/src/App.svelte` if auth UX is unclear.

- [ ] **Step 1: Build client**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
vite build
Pop-Location
```

Expected: build succeeds.

- [ ] **Step 2: Start local mode**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node server.ts --host 127.0.0.1
Pop-Location
```

Expected: server prints JSON with `mode:"local"` and a URL.

- [ ] **Step 3: Start LAN mode**

Run in a separate terminal:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node server.ts --lan
Pop-Location
```

Expected: server prints JSON with `mode:"lan"`, a URL, and a temporary `passphrase`.

- [ ] **Step 4: Phone browser smoke**

Open the LAN URL from a phone on the same network. Expected sequence:

1. unauthenticated request shows passphrase prompt and no room state;
2. correct passphrase shows `Overview`;
3. bottom navigation switches to `Command` and `Streams`;
4. `Refresh now` updates status;
5. high-risk action preview requires confirmation.

### Task 9: Full Verification Matrix

**Files:**
- Read: `.agents/tools/pkm-ai/room-ui`
- Read: `.agents/tools/pkm-ai/package.json`

- [ ] **Step 1: Room UI tests**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
node --test "test/*.test.mjs"
Pop-Location
```

Expected: all room-ui tests pass.

- [ ] **Step 2: Room UI typecheck and build**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
tsc --noEmit
vite build
Pop-Location
```

Expected: both pass.

- [ ] **Step 3: Existing PKM-AI tool tests**

Run:

```powershell
Push-Location .agents\tools\pkm-ai
node --test "test/*.test.mjs"
Pop-Location
```

Expected: existing tests pass.

- [ ] **Step 4: Product build guard**

Run:

```powershell
git diff --name-only -- src manifest.json versions.json package.json
```

Expected: no output for `src/`, `manifest.json`, or `versions.json`. `package.json` at repo root should
not be modified by this work.

- [ ] **Step 5: Outside-MVP action scan**

Run:

```powershell
Select-String -Path .agents\tools\pkm-ai\room-ui\src\**\* -Pattern "--force|run.close|state.delete|git.run|build.run|release.run" -SimpleMatch
```

Expected: no matches in UI action construction. If the terms appear only in tests that assert absence,
record that explicitly in closeout.

### Task 10: Documentation And Closeout

**Files:**
- Modify: `.agents/docs/work/pkm-ai/plans/2026-06-06-agent-room-control-ui/index.md`
- Optional modify: `.agents/docs/work/pkm-ai/index.md`

- [ ] **Step 1: Mark objective checklist done**

Update the objective checklist in the plan index after the implementation passes verification.

- [ ] **Step 2: Add implementation summary**

Add a compact `## Closeout` section to the plan index with:

- commits created;
- commands run;
- LAN/mobile smoke result;
- known limitations;
- exact next action.

- [ ] **Step 3: Run doc health for this plan**

Run:

```powershell
node .agents\tools\pkm-ai\check-doc-health.ts --path .agents/docs/work/pkm-ai/plans/2026-06-06-agent-room-control-ui
```

Expected: `doc health: OK`. Soft line-limit warnings are acceptable only if they preserve detail and
remain below the hard cap.

- [ ] **Step 4: Final commit**

Run:

```powershell
git add .agents/docs/work/pkm-ai/plans/2026-06-06-agent-room-control-ui
git commit -m "docs: close agent room ui implementation plan"
```
