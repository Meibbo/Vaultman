---
title: Obsidian Tasks state automation research
type: research
status: done
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T18:31:27
updated: 2026-05-10T18:31:27
tags:
  - agent/research
  - initiative/pkm-ai
  - docs/tasks
created_by: codex
updated_by: codex
---

# Obsidian Tasks State Automation Research

## Sources Checked

- Tasks task formats:
  https://publish.obsidian.md/tasks/Reference/Task%20Formats/About%20Task%20Formats
- Tasks status settings:
  https://publish.obsidian.md/tasks/Getting%20Started/Statuses/Status%20Settings
- Tasks recurring/custom statuses:
  https://publish.obsidian.md/tasks/Getting%20Started/Statuses/Recurring%20Tasks%20and%20Custom%20Statuses
- Tasks auto-suggest emoji metadata:
  https://publish.obsidian.md/tasks/Editing/Auto-Suggest
- Tasks sorting/status/priority behavior:
  https://publish.obsidian.md/tasks/Queries/Sorting
- Tasks priority filters:
  https://publish.obsidian.md/tasks/Queries/Filters

## Findings

- Tasks supports Markdown task lines with status symbols inside brackets, such as `[ ]`, `[x]`, and configured custom symbols.
- The core statuses are `[ ]` and `[x]`; additional symbols are only meaningful to Tasks if configured in the plugin's custom status settings.
- Tasks can interpret custom status symbols as status types such as `IN_PROGRESS`, `TODO`, `ON_HOLD`, `DONE`, `CANCELLED`, or `NON_TASK`.
- The default task data format is the Tasks emoji format. Dataview inline-field format is also supported, but Tasks currently reads and writes only one selected format at a time.
- Emoji metadata includes priorities, recurrence, start/scheduled/due dates, created dates, completion dates, ids, dependencies, and completion behavior.
- Priority levels use `🔺`, `⏫`, `🔼`, no emoji, `🔽`, and `⏬` for highest through lowest priority.
- Tasks documentation warns that field order on the task line matters, so automation should append metadata in one stable order instead of scattering tokens through the description.

## Vaultman Decision

Vaultman PKM-AI docs should keep task lines compact by default. The automation should update status brackets and add emoji metadata only when the caller passes explicit flags.

Recommended task marker:

```markdown
- [ ] Do the work #pkm-ai/objective/example-objective
```

Recommended mechanical completion command:

```powershell
node .agents/tools/pkm-ai/manage-tasks.mjs `
  --file .agents/docs/work/pkm-ai/plans/example/index.md `
  --complete-objective example-objective `
  --agent codex `
  --close-when-all-done
```

The script should update task mechanics first. The agent should then make the final manual current-status or current-handoff edit with the narrative context that cannot be inferred mechanically.
