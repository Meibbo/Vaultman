import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "index-docs.ts");

// One malformed doc out of ~1149 used to abort the whole build: js-yaml threw out of parseMarkdown,
// index-docs exited on the unhandled exception, and no index was written at all — every agent then
// queried a stale cache (2026-07-29). Both caches must be built from the docs that do parse.
test("index-docs indexes every valid doc when one doc has unparseable frontmatter", () => {
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/good.md", "title: Good doc");
  writeDoc(root, "work/pkm-ai/also-good.md", "title: Also good");
  writeDoc(root, "work/pkm-ai/broken.md", "title: BT5-096 — Dependency refresh: 3 high advisories");

  const result = run(root, ["--no-embed"]);

  assert.equal(result.status, 0, result.stderr);
  const searchIndex = readJson(root, "search-index.json");
  assert.deepEqual(searchIndex.entries.map((entry) => entry.title).sort(), ["Also good", "Good doc"]);
  const retrievalIndex = readJson(root, "retrieval-index.json");
  assert.deepEqual(
    retrievalIndex.docs.map((doc) => doc.path).sort(),
    [".agents/docs/work/pkm-ai/also-good.md", ".agents/docs/work/pkm-ai/good.md"],
  );
});

test("index-docs reports the skipped doc as a frontmatter-yaml failure with path and reason", () => {
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/good.md", "title: Good doc");
  writeDoc(root, "work/pkm-ai/broken.md", "title: BT5-096 — Dependency refresh: 3 high advisories");

  const result = run(root, ["--no-embed"]);

  const lines = result.stderr.split("\n").filter((line) => line.startsWith("frontmatter-yaml\t"));
  assert.equal(lines.length, 1, `expected one failure line, got ${JSON.stringify(result.stderr)}`);
  const [code, failurePath, detail] = lines[0].split("\t");
  assert.equal(code, "frontmatter-yaml");
  assert.equal(failurePath, ".agents/docs/work/pkm-ai/broken.md");
  assert.match(detail, /bad indentation of a mapping entry/);
  assert.match(detail, /line 2/);
  assert.match(result.stdout, /1 skipped/);
});

test("index-docs stays silent about skips when every doc parses", () => {
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/good.md", "title: Good doc");

  const result = run(root, ["--no-embed"]);

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /frontmatter-yaml/);
  assert.doesNotMatch(result.stdout, /skipped/);
});

function run(root, args) {
  return spawnSync(process.execPath, [toolPath, ...args], { cwd: root, encoding: "utf8" });
}

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-index-"));
}

function readJson(root, name) {
  return JSON.parse(fs.readFileSync(path.join(root, ".agents", "cache", name), "utf8"));
}

function writeDoc(root, rel, frontmatterLine) {
  const filePath = path.join(root, ".agents", "docs", ...rel.split("/"));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---
${frontmatterLine}
type: note
status: active
lifecycle: active
created: 2026-07-29T01:00:00
updated: 2026-07-29T01:00:00
---

# Body

Retrieval needs some body text to tokenize.
`,
  );
}
