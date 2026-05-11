import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "manage-tasks.mjs");

test("manage-tasks completes an objective, adds done date, and closes the plan when all tasks are closed", () => {
  const root = makeTempRoot();
  const planPath = path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "example", "index.md");
  writeFile(
    planPath,
    `---
title: Example plan
type: implementation-plan-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T10:00:00
updated: 2026-05-10T10:00:00
updated_by: claude
tags:
  - agent/plan
---

# Example Plan

- [/] Add task automation #pkm-ai/objective/task-state-automation 🔼 📅 2026-05-20
`,
  );

  const result = run(root, [
    "--file",
    ".agents/docs/work/pkm-ai/plans/example/index.md",
    "--complete-objective",
    "task-state-automation",
    "--agent",
    "codex",
    "--close-when-all-done",
    "--now",
    "2026-05-10T11:22:33",
  ]);

  assert.equal(result.status, 0, result.stderr);
  const updated = fs.readFileSync(planPath, "utf8");
  assert.match(updated, /^status: done$/m);
  assert.match(updated, /^updated: 2026-05-10T11:22:33$/m);
  assert.match(updated, /^updated_by: codex$/m);
  assert.match(updated, /- \[x\] Add task automation #pkm-ai\/objective\/task-state-automation 🔼 📅 2026-05-20 ✅ 2026-05-10/);
});

test("manage-tasks sets task status names and Tasks emoji metadata without closing unrelated open work", () => {
  const root = makeTempRoot();
  const planPath = path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "example", "index.md");
  writeFile(
    planPath,
    `---
title: Example plan
type: implementation-plan-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T10:00:00
updated: 2026-05-10T10:00:00
tags:
  - agent/plan
---

# Example Plan

- [ ] Design the state script #pkm-ai/objective/state-script
- [ ] Keep manual current-doc closeout #pkm-ai/objective/manual-closeout
`,
  );

  const result = run(root, [
    "--file",
    ".agents/docs/work/pkm-ai/plans/example/index.md",
    "--toggle",
    "Design the state script",
    "--task-status",
    "in-progress",
    "--priority",
    "high",
    "--created",
    "2026-05-10",
    "--start",
    "2026-05-11",
    "--due",
    "2026-05-15",
    "--now",
    "2026-05-10T11:22:33",
  ]);

  assert.equal(result.status, 0, result.stderr);
  const updated = fs.readFileSync(planPath, "utf8");
  assert.match(updated, /^status: active$/m);
  assert.match(updated, /- \[\/\] Design the state script #pkm-ai\/objective\/state-script ⏫ 🛫 2026-05-11 📅 2026-05-15 ➕ 2026-05-10/);
  assert.match(updated, /- \[ \] Keep manual current-doc closeout #pkm-ai\/objective\/manual-closeout/);
});

test("manage-tasks replaces existing emoji metadata and supports custom status symbols", () => {
  const root = makeTempRoot();
  const planPath = path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "example", "index.md");
  writeFile(
    planPath,
    `---
title: Example plan
type: implementation-plan-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T10:00:00
updated: 2026-05-10T10:00:00
tags:
  - agent/plan
---

# Example Plan

- [ ] Wait for review #pkm-ai/objective/review ⏫ 📅 2026-05-12
`,
  );

  const result = run(root, [
    "--file",
    ".agents/docs/work/pkm-ai/plans/example/index.md",
    "--toggle",
    "Wait for review",
    "--task-status-symbol",
    ">",
    "--priority",
    "lowest",
    "--scheduled",
    "2026-05-13",
    "--now",
    "2026-05-10T11:22:33",
  ]);

  assert.equal(result.status, 0, result.stderr);
  const updated = fs.readFileSync(planPath, "utf8");
  assert.match(updated, /- \[>\] Wait for review #pkm-ai\/objective\/review 📅 2026-05-12 ⏬ ⏳ 2026-05-13/);
  assert.doesNotMatch(updated, /⏫/);
});

test("manage-tasks lists objective states as JSON for one plan file", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "example", "index.md"),
    `---
title: Example plan
type: implementation-plan-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T10:00:00
updated: 2026-05-10T10:00:00
tags:
  - agent/plan
---

# Example Plan

- [x] Finished work #pkm-ai/objective/finished-work ⏫ ✅ 2026-05-10
- [/] Active work #pkm-ai/objective/active-work 🔼 🛫 2026-05-11 📅 2026-05-15
`,
  );

  const result = run(root, [
    "--file",
    ".agents/docs/work/pkm-ai/plans/example/index.md",
    "--list-objectives",
    "--json",
  ]);

  assert.equal(result.status, 0, result.stderr);
  const rows = JSON.parse(result.stdout);
  assert.deepEqual(rows.map((row) => row.objective), ["finished-work", "active-work"]);
  assert.equal(rows[0].status, "done");
  assert.equal(rows[0].symbol, "x");
  assert.equal(rows[0].priority, "high");
  assert.equal(rows[0].doneDate, "2026-05-10");
  assert.equal(rows[1].status, "in-progress");
  assert.equal(rows[1].priority, "medium");
  assert.equal(rows[1].startDate, "2026-05-11");
  assert.equal(rows[1].dueDate, "2026-05-15");
  assert.equal(rows[1].path, ".agents/docs/work/pkm-ai/plans/example/index.md");
  assert.equal(typeof rows[1].line, "number");
});

test("manage-tasks gets one objective across an initiative and filters open objectives", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "one", "index.md"),
    `---
title: Plan one
type: implementation-plan-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T10:00:00
updated: 2026-05-10T10:00:00
tags:
  - agent/plan
---

# Plan One

- [x] Done objective #pkm-ai/objective/done-objective ✅ 2026-05-10
- [ ] Open objective #pkm-ai/objective/open-objective 🔽
`,
  );
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "two", "index.md"),
    `---
title: Plan two
type: implementation-plan-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T10:00:00
updated: 2026-05-10T10:00:00
tags:
  - agent/plan
---

# Plan Two

- [>] Waiting objective #pkm-ai/objective/waiting-objective ⏬ ⏳ 2026-05-12
`,
  );

  const openResult = run(root, [
    "--list-objectives",
    "--initiative",
    "pkm-ai",
    "--status",
    "open",
    "--json",
  ]);
  assert.equal(openResult.status, 0, openResult.stderr);
  const openRows = JSON.parse(openResult.stdout);
  assert.deepEqual(openRows.map((row) => row.objective), ["open-objective", "waiting-objective"]);
  assert.equal(openRows[1].status, "on-hold");
  assert.equal(openRows[1].scheduledDate, "2026-05-12");

  const getResult = run(root, [
    "--get-objective",
    "waiting-objective",
    "--initiative",
    "pkm-ai",
    "--json",
  ]);
  assert.equal(getResult.status, 0, getResult.stderr);
  const objective = JSON.parse(getResult.stdout);
  assert.equal(objective.objective, "waiting-objective");
  assert.equal(objective.path, ".agents/docs/work/pkm-ai/plans/two/index.md");
});

test("manage-tasks ignores objective examples inside fenced code blocks", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "research", "example.md"),
    `---
title: Example research
type: research
status: done
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T10:00:00
updated: 2026-05-10T10:00:00
tags:
  - agent/research
---

# Example Research

\`\`\`markdown
- [ ] Example only #pkm-ai/objective/example-only
\`\`\`
`,
  );
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "real", "index.md"),
    `---
title: Real plan
type: implementation-plan-index
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-10T10:00:00
updated: 2026-05-10T10:00:00
tags:
  - agent/plan
---

# Real Plan

- [ ] Real objective #pkm-ai/objective/real-objective
`,
  );

  const result = run(root, ["--list-objectives", "--initiative", "pkm-ai", "--json"]);

  assert.equal(result.status, 0, result.stderr);
  const rows = JSON.parse(result.stdout);
  assert.deepEqual(rows.map((row) => row.objective), ["real-objective"]);
});

function run(root, args) {
  return spawnSync(process.execPath, [toolPath, ...args], { cwd: root, encoding: "utf8" });
}

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-manage-tasks-"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
