---
title: Agent Room Control UI plan part 3a - responsive styles
type: implementation-plan
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/plans/2026-06-06-agent-room-control-ui/index|agent-room-control-ui-plan]]"
created: 2026-06-06T10:24:00
updated: 2026-06-06T10:35:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent-room
---

# Part 3a - Responsive Styles And First Build

### Task 6 Continued: Styles And Build

**Files:**
- Create: `.agents/tools/pkm-ai/room-ui/src/styles.css`

- [ ] **Step 3: Create responsive styles**

Create `src/styles.css`:

```css
:root {
  color-scheme: light dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
  background: Canvas;
  color: CanvasText;
}

button,
input {
  font: inherit;
}

.room-ui-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto auto 1fr;
}

.room-ui-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid color-mix(in srgb, CanvasText 16%, transparent);
}

.room-ui-header h1 {
  margin: 0;
  font-size: 20px;
}

.room-ui-header p {
  margin: 4px 0 0;
  opacity: 0.75;
}

.room-ui-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-ui-tabs {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid color-mix(in srgb, CanvasText 12%, transparent);
}

.room-ui-tabs button.active {
  font-weight: 700;
}

.room-ui-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
}

.room-ui-card,
.room-ui-panel,
.room-ui-streams,
.room-ui-auth {
  border: 1px solid color-mix(in srgb, CanvasText 16%, transparent);
  border-radius: 8px;
  padding: 16px;
}

.room-ui-auth {
  margin: 16px;
}

@media (max-width: 720px) {
  .room-ui-shell {
    padding-bottom: 64px;
  }

  .room-ui-header {
    display: block;
  }

  .room-ui-header-actions {
    margin-top: 8px;
  }

  .room-ui-tabs {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    justify-content: space-around;
    background: Canvas;
    z-index: 10;
  }

  .room-ui-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Build frontend**

Run:

```powershell
Push-Location .agents\tools\pkm-ai\room-ui
vite build
Pop-Location
```

Expected: Vite build succeeds and writes `dist/client`.
