import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "query-docs.ts");

test("query-docs --glossary reports glossary misses explicitly", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-query-"));
  writeFile(
    path.join(root, ".agents", "docs", "architecture", "glossary.md"),
    `---
title: Glossary
type: architecture
status: active
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:23:00
tags:
  - agent/architecture
---

# Glossary

- Source record: full-detail material preserved for audit.
`,
  );

  const result = spawnSync(process.execPath, [toolPath, "--glossary", "swam"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout, /swam no está en el glosario/);
  assert.match(result.stdout, /external\/test term/);
});

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
