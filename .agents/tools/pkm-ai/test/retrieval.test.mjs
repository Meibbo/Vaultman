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

test("index-docs reconciles cached embeddings by content hash", () => {
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/renamed.md", "Renamed", "active", "Stable content survives a path move.");
  writeDoc(root, "work/pkm-ai/changed.md", "Changed", "active", "Original content must be re-embedded after edits.");

  let result = run(root, indexDocsPath, []);
  assert.equal(result.status, 0, result.stderr);

  const indexPath = path.join(root, ".agents", "cache", "retrieval-index.json");
  const cached = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  for (const doc of cached.docs) {
    doc.vector = [0.25, 0.75];
    doc.embedHash = doc.contentHash;
    doc.embedModel = "test-model";
  }
  cached.embedModel = "test-model";
  cached.embedDims = 2;
  fs.writeFileSync(indexPath, `${JSON.stringify(cached, null, 2)}\n`);

  const renamedSource = path.join(root, ".agents", "docs", "work", "pkm-ai", "renamed.md");
  const renamedTarget = path.join(root, ".agents", "docs", "work", "pkm-ai", "moved.md");
  fs.renameSync(renamedSource, renamedTarget);
  writeDoc(root, "work/pkm-ai/changed.md", "Changed", "active", "Edited content now requires a fresh vector.");

  result = run(root, indexDocsPath, []);
  assert.equal(result.status, 0, result.stderr);

  const rebuilt = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const moved = rebuilt.docs.find((entry) => entry.path.endsWith("moved.md"));
  const changed = rebuilt.docs.find((entry) => entry.path.endsWith("changed.md"));
  assert.deepEqual(moved?.vector, [0.25, 0.75]);
  assert.equal(moved?.embedHash, moved?.contentHash);
  assert.equal(moved?.embedModel, "test-model");
  assert.equal(changed?.vector, undefined);
  assert.equal(changed?.embedHash, undefined);
  assert.equal(rebuilt.embedModel, "test-model");
  assert.equal(rebuilt.embedDims, 2);
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

test("embeddingCoverage reports the embedded fraction of an index", async () => {
  const { embeddingCoverage } = await import("../lib/retrieval.mjs");

  assert.deepEqual(embeddingCoverage({ docs: [] }), { embedded: 0, total: 0, ratio: 0 });
  assert.deepEqual(
    embeddingCoverage({ docs: [{ vector: [0.1, 0.2] }, { vector: [] }, {}, { vector: [0.3] }] }),
    { embedded: 2, total: 4, ratio: 0.5 },
  );
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
