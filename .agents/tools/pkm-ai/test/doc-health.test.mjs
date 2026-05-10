import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "check-doc-health.mjs");

test("check-doc-health fails compacted active docs without archive source", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "current", "handoff.md"),
    `---
title: Current handoff
type: agent-handoff
status: active
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
compacted: true
tags:
  - agent/current
---

# Current Handoff

Short replacement.
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /archive-source/);
});

test("check-doc-health warns for unknown glossary candidates", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "architecture", "glossary.md"),
    `---
title: Glossary
type: architecture
status: active
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
tags:
  - agent/architecture
---

# Glossary

- Known term: defined.
`,
  );
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "notes", "term-test.md"),
    `---
title: Term test
type: note
status: draft
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
glossary_candidates:
  - swam
tags:
  - agent/note
---

# Term Test
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /doc health: OK/);
  assert.match(result.stdout, /WARN/);
  assert.match(result.stdout, /glossary-unknown/);
  assert.match(result.stdout, /swam/);
});

test("check-doc-health repairs line-limit failures by creating continuation shards", () => {
  const root = makeTempRoot();
  const longDoc = path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "long-plan.md");
  const bodyLines = [
    "# Long Plan",
    "",
    ...Array.from({ length: 430 }, (_, index) => `Line ${String(index + 1).padStart(3, "0")}`),
  ];
  writeFile(
    longDoc,
    `---
title: Long plan
type: implementation-plan
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
tags:
  - agent/plan
---

${bodyLines.join("\n")}
`,
  );

  const result = spawnSync(
    process.execPath,
    [toolPath, "--repair-line-limits", "--now", "2026-05-10T10:00:00"],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /line-limit repair: sharded/);
  assert.match(result.stdout, /doc health: OK/);

  const repaired = fs.readFileSync(longDoc, "utf8");
  const shardOnePath = path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "long-plan-shard-1.md");
  const shardTwoPath = path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "long-plan-shard-2.md");
  const shardOne = fs.readFileSync(shardOnePath, "utf8");
  const shardTwo = fs.readFileSync(shardTwoPath, "utf8");

  assert.ok(lineCount(repaired) <= 200);
  assert.ok(lineCount(shardOne) <= 200);
  assert.ok(lineCount(shardTwo) <= 200);
  assert.match(repaired, /Continua en \[\[docs\/work\/pkm-ai\/plans\/long-plan-shard-1\|continuacion 1\]\]\./);
  assert.match(shardOne, /title: "?Long plan - continuation 1"?/);
  assert.match(shardOne, /type: continuation-shard/);
  assert.match(shardOne, /parent: "\[\[docs\/work\/pkm-ai\/plans\/long-plan\|Long plan\]\]"/);
  assert.match(shardOne, /shard_source: ".agents\/docs\/work\/pkm-ai\/plans\/long-plan.md"/);
  assert.match(shardOne, /shard_of: "\[\[docs\/work\/pkm-ai\/plans\/long-plan\|Long plan\]\]"/);
  assert.match(shardOne, /shard_part: 1/);
  assert.match(shardOne, /Continua en \[\[docs\/work\/pkm-ai\/plans\/long-plan-shard-2\|continuacion 2\]\]\./);
  assert.match(shardTwo, /Line 430/);
});

test("check-doc-health repairs parent shape, timestamp offsets, and public superpowers docs", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "research", "example", "index.md"),
    `---
title: Example Index
type: research-index
status: active
created: 2026-05-10T01:00:00
updated: 2026-05-10T01:00:00
---

# Example Index
`,
  );
  writeFile(
    path.join(root, ".agents", "docs", "work", "research", "example", "child.md"),
    `---
title: Child Doc
type: research-shard
parent: "[[index]]"
created: 2026-05-10T01:00:00-05:00
updated: 2026-05-10T01:00:00-05:00
---

# Child
`,
  );
  writeFile(
    path.join(root, ".agents", "docs", "templates", "plan-template.md"),
    `---
title: Plan Template
type: template
parent: "{{parent_link}}"
created: {{timestamp}}
updated: {{timestamp}}
---

# Template
`,
  );
  writeFile(
    path.join(root, "docs", "superpowers", "plans", "old-plan.md"),
    "# Public plan\n",
  );

  const red = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });
  assert.notEqual(red.status, 0);
  assert.match(red.stdout, /forbidden-path/);
  assert.match(red.stdout, /parent-shape/);
  assert.match(red.stdout, /timestamp-offset/);

  const result = spawnSync(
    process.execPath,
    [toolPath, "--repair-residuals", "--now", "2026-05-10T10:30:00"],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /parent repair: updated 1 file/);
  assert.match(result.stdout, /timestamp repair: updated 1 file/);
  assert.match(result.stdout, /public-doc repair: archived docs\/superpowers/);
  assert.match(result.stdout, /doc health: OK/);

  const child = fs.readFileSync(path.join(root, ".agents", "docs", "work", "research", "example", "child.md"), "utf8");
  const template = fs.readFileSync(path.join(root, ".agents", "docs", "templates", "plan-template.md"), "utf8");
  assert.match(child, /parent: "\[\[docs\/work\/research\/example\/index\|index\]\]"/);
  assert.match(child, /created: 2026-05-10T01:00:00\n/);
  assert.match(child, /updated: 2026-05-10T01:00:00\n/);
  assert.match(template, /parent: "\{\{parent_link\}\}"/);
  assert.equal(fs.existsSync(path.join(root, "docs", "superpowers")), false);
  assert.equal(
    fs.existsSync(path.join(root, ".agents", "docs", "archive", "pkm-ai", "public-docs", "2026-05-10T103000-superpowers", "plans", "old-plan.md")),
    true,
  );
});

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-health-"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function lineCount(text) {
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}
