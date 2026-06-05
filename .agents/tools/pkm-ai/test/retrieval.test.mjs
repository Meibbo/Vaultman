import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const indexDocsPath = path.resolve(here, "..", "index-docs.ts");
const queryDocsPath = path.resolve(here, "..", "query-docs.ts");

test("index-docs writes a retrieval index with per-doc termFreq, content-hash, and lifecycle", () => {
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/alpha.md", "Alpha", "active", "Lifecycle states drive retrieval ranking.");

  const result = run(root, indexDocsPath, []);
  assert.equal(result.status, 0, result.stderr);

  const indexPath = path.join(root, ".agents", "cache", "retrieval-index.json");
  assert.ok(fs.existsSync(indexPath), "retrieval-index.json not written");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const doc = index.docs.find((entry) => entry.path.endsWith("alpha.md"));
  assert.ok(doc, "alpha doc missing from retrieval index");
  assert.equal(doc.lifecycle, "active");
  assert.ok(typeof doc.contentHash === "string" && doc.contentHash.length > 0, "missing contentHash");
  assert.ok(doc.termFreq.lifecycle >= 1, `expected 'lifecycle' term, got ${JSON.stringify(doc.termFreq)}`);
});

test("query-docs --rank ranks a doc containing the term above one that does not (BM25)", () => {
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/match.md", "Match", "active", "Lifecycle lifecycle lifecycle ranking states.");
  writeDoc(root, "work/pkm-ai/other.md", "Other", "active", "Drag and drop canvas layout widgets.");

  const result = run(root, queryDocsPath, ["--rank", "--json", "lifecycle"]);
  assert.equal(result.status, 0, result.stderr);
  const ranked = JSON.parse(result.stdout);
  assert.ok(ranked.length >= 1, "no results");
  assert.ok(ranked[0].path.endsWith("match.md"), `expected match.md first, got ${JSON.stringify(ranked.map((r) => r.path))}`);
});

test("query-docs --rank weights lifecycle so an active doc outranks an archived doc with equal term content", () => {
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/live.md", "Live", "active", "widget widget widget");
  writeDoc(root, "work/pkm-ai/old.md", "Old", "archived", "widget widget widget");

  const result = run(root, queryDocsPath, ["--rank", "--json", "widget"]);
  assert.equal(result.status, 0, result.stderr);
  const ranked = JSON.parse(result.stdout);
  const live = ranked.find((r) => r.path.endsWith("live.md"));
  const old = ranked.find((r) => r.path.endsWith("old.md"));
  assert.ok(live && old, "both docs should appear");
  assert.ok(live.score > old.score, `active (${live.score}) should beat archived (${old.score})`);
});

test("query-docs --rank builds the index in-memory when no retrieval-index.json cache exists", () => {
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/alpha.md", "Alpha", "active", "Lifecycle states drive retrieval ranking.");
  // no index-docs run -> no cache file
  const result = run(root, queryDocsPath, ["--rank", "--json", "retrieval"]);
  assert.equal(result.status, 0, result.stderr);
  const ranked = JSON.parse(result.stdout);
  assert.ok(ranked.some((r) => r.path.endsWith("alpha.md")), "in-memory fallback returned nothing");
});

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-retrieval-"));
}

function writeDoc(root, rel, title, lifecycle, body) {
  const filePath = path.join(root, ".agents", "docs", rel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---
title: ${title}
type: note
status: active
lifecycle: ${lifecycle}
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-05T01:00:00
updated: 2026-06-05T01:00:00
tags:
  - agent/note
---

# ${title}

${body}
`,
  );
}

function run(root, tool, args) {
  return spawnSync(process.execPath, [tool, ...args], { cwd: root, encoding: "utf8" });
}
