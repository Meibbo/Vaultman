---
title: Agent Room Control UI plan part 3b - guided forms and mobile actions
type: implementation-plan
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/plans/2026-06-06-agent-room-control-ui/index|agent-room-control-ui-plan]]"
created: 2026-06-06T10:24:00
updated: 2026-06-06T10:31:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent-room
---

# Part 3b - Guided Forms And Mobile Actions

Before editing `.svelte` files, use the repo Svelte skills required by AGENTS/skills.

### Task 7: Guided Forms And Mobile Interaction

**Files:**
- Modify: `.agents/tools/pkm-ai/room-ui/src/App.svelte`
- Modify: `.agents/tools/pkm-ai/room-ui/src/styles.css`

- [ ] **Step 1: Add command preview state**

In `App.svelte`, import and use `buildCommandPreview` and `classifyAction`. Add form state for task title, scope, message target, and message body. The guided command section must render command display text before the execute button.

- [ ] **Step 2: Add actions for MVP forms**

Wire forms for these action types only:

```ts
const allowedActions = [
  "task.add",
  "mailbox.send",
  "scope.conflicts",
  "scope.claim",
  "task.status",
  "mailbox.ack",
];
```

No UI control may create previews for `force`, `run.close`, `state.delete`, `git.run`, `build.run`, or `release.run`.

- [ ] **Step 3: Add mobile bottom sheet styling**

Extend `styles.css` with:

```css
@media (max-width: 720px) {
  .room-ui-command-sheet {
    position: fixed;
    left: 8px;
    right: 8px;
    bottom: 72px;
    max-height: 55vh;
    overflow: auto;
    background: Canvas;
    border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
    border-radius: 8px;
    padding: 12px;
    z-index: 9;
  }
}
```

- [ ] **Step 4: Verify frontend build and typecheck**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
vite build
tsc --noEmit
Pop-Location
```

Expected: both commands pass.

- [ ] **Step 5: Commit frontend layer**

Run:

```powershell
git add .agents/tools/pkm-ai/room-ui
git commit -m "feat: add agent room ui frontend"
```
