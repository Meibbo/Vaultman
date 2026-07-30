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

  // --no-embed isolates the contentHash reconcile logic from the chained embedder (F5): a moved doc
  // reuses its vector, an edited doc drops it. Embedding itself is covered by the embedPendingDocs unit tests.
  let result = run(root, indexDocsPath, ["--no-embed"]);
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

  result = run(root, indexDocsPath, ["--no-embed"]);
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

test("countPendingEmbeddings counts docs missing or with a stale vector", async () => {
  const { countPendingEmbeddings } = await import("../lib/retrieval.mjs");

  const index = {
    docs: [
      { contentHash: "a", embedHash: "a", vector: [0.1] }, // fresh -> skip
      { contentHash: "b", embedHash: "old", vector: [0.2] }, // stale hash -> pending
      { contentHash: "c" }, // no vector -> pending
    ],
  };
  assert.equal(countPendingEmbeddings(index), 2);
});

test("embedPendingDocs embeds only changed docs and leaves fresh ones untouched", async () => {
  const { embedPendingDocs } = await import("../lib/retrieval.mjs");
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/fresh.md", "Fresh", "active", "already embedded body");
  writeDoc(root, "work/pkm-ai/changed.md", "Changed", "active", "new body needing a vector");

  const index = {
    docs: [
      { path: ".agents/docs/work/pkm-ai/fresh.md", contentHash: "h1", embedHash: "h1", vector: [9, 9] },
      { path: ".agents/docs/work/pkm-ai/changed.md", contentHash: "h2", embedHash: "old", vector: undefined },
      { path: ".agents/docs/work/pkm-ai/gone.md", contentHash: "h3" }, // missing file -> skipped
    ],
  };

  // Stub provider: deterministic, no model download.
  const calls = [];
  const provider = { id: "stub", dims: 2, embed: async (texts) => { calls.push(...texts); return texts.map(() => [1, 2]); } };

  const tally = await embedPendingDocs(root, index, provider);

  assert.deepEqual(tally, { embedded: 1, skipped: 2 });
  assert.deepEqual(index.docs[0].vector, [9, 9], "fresh doc untouched");
  assert.deepEqual(index.docs[1].vector, [1, 2], "changed doc embedded");
  assert.equal(index.docs[1].embedHash, "h2", "embedHash advanced to contentHash");
  assert.equal(calls.length, 1, "provider called once, only for the changed doc");
});

// A cached index entry can outlive the doc's last valid state: the file was fine when it was
// indexed and got broken frontmatter afterwards. embed-docs loads that cached index, so the parse
// has to be as forgiving as the index build is.
test("embedPendingDocs skips a doc whose frontmatter no longer parses and reports it", async () => {
  const { embedPendingDocs } = await import("../lib/retrieval.mjs");
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/ok.md", "Ok", "active", "body that still parses");
  writeRaw(
    root,
    "work/pkm-ai/broken.md",
    `---
title: BT5-096 — Dependency refresh: 3 high advisories
type: note
---

# Broken
`,
  );

  const index = {
    docs: [
      { path: ".agents/docs/work/pkm-ai/ok.md", contentHash: "h1" },
      { path: ".agents/docs/work/pkm-ai/broken.md", contentHash: "h2" },
    ],
  };
  const failures = [];
  const provider = { id: "stub", dims: 2, embed: async (texts) => texts.map(() => [1, 2]) };

  const tally = await embedPendingDocs(root, index, provider, {
    onFailure: (failure) => failures.push(failure),
  });

  assert.deepEqual(tally, { embedded: 1, skipped: 1 });
  assert.deepEqual(index.docs[0].vector, [1, 2], "valid doc still embedded");
  assert.equal(index.docs[1].vector, undefined, "broken doc left unembedded");
  assert.equal(failures.length, 1);
  assert.equal(failures[0].code, "frontmatter-yaml");
  assert.equal(failures[0].path, ".agents/docs/work/pkm-ai/broken.md");
  assert.match(failures[0].detail, /bad indentation of a mapping entry/);
});

test("embedPendingDocs honours --limit style caps", async () => {
  const { embedPendingDocs } = await import("../lib/retrieval.mjs");
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/a.md", "A", "active", "body a");
  writeDoc(root, "work/pkm-ai/b.md", "B", "active", "body b");

  const index = {
    docs: [
      { path: ".agents/docs/work/pkm-ai/a.md", contentHash: "ha" },
      { path: ".agents/docs/work/pkm-ai/b.md", contentHash: "hb" },
    ],
  };
  const provider = { id: "stub", dims: 2, embed: async (texts) => texts.map(() => [0, 0]) };

  const tally = await embedPendingDocs(root, index, provider, { limit: 1 });

  assert.equal(tally.embedded, 1, "stopped at the limit");
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

function writeRaw(root, rel, contents) {
  const filePath = path.join(root, ".agents", "docs", rel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function run(root, tool, args) {
  return spawnSync(process.execPath, [tool, ...args], { cwd: root, encoding: "utf8" });
}
