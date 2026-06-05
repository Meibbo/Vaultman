import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "update-frontmatter.ts");

test("update-frontmatter updates provided docs while preserving created", () => {
  const root = makeTempRoot();
  const docPath = path.join(root, ".agents", "docs", "current", "example.md");
  writeFile(
    docPath,
    `---
title: Example
created: 2026-05-04T01:00:00
updated: 2026-05-04T01:00:00
tags:
  - agent/current
---

# Example
`,
  );

  execFileSync(process.execPath, [toolPath, "--now", "2026-05-04T08:09:10", ".agents/docs/current/example.md"], {
    cwd: root,
  });

  const updated = fs.readFileSync(docPath, "utf8");
  assert.match(updated, /^created: 2026-05-04T01:00:00$/m);
  assert.match(updated, /^updated: 2026-05-04T08:09:10$/m);
  assert.match(updated, /tags:\n  - agent\/current/);
});

test("update-frontmatter --all updates active docs and skips archive files", () => {
  const root = makeTempRoot();
  const activePath = path.join(root, ".agents", "docs", "current", "status.md");
  const archivePath = path.join(root, ".agents", "docs", "archive", "pkm-ai", "active-docs", "status.md");
  const rawPath = path.join(root, ".agents", "docs", "archive", "pkm-ai", "migration", "raw", "old.md");
  writeFile(activePath, "# Status\n");
  writeFile(archivePath, "# Archived\n");
  writeFile(rawPath, "# Old\n");

  execFileSync(process.execPath, [toolPath, "--all", "--now", "2026-05-04T08:09:10"], { cwd: root });

  assert.match(fs.readFileSync(activePath, "utf8"), /^created: 2026-05-04T08:09:10$/m);
  assert.match(fs.readFileSync(activePath, "utf8"), /^updated: 2026-05-04T08:09:10$/m);
  assert.equal(fs.readFileSync(archivePath, "utf8"), "# Archived\n");
  assert.equal(fs.readFileSync(rawPath, "utf8"), "# Old\n");
});

test("update-frontmatter rejects timezone offsets", () => {
  const root = makeTempRoot();
  const docPath = path.join(root, ".agents", "docs", "current", "example.md");
  writeFile(docPath, "# Example\n");

  const result = spawnSync(
    process.execPath,
    [toolPath, "--now", "2026-05-04T08:09:10-05:00", ".agents/docs/current/example.md"],
    { cwd: root, encoding: "utf8" },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /timestamp must use YYYY-MM-DDTHH:mm:ss/);
});

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-frontmatter-"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
