import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { HashEmbeddingProvider } from "../retrieval/embedding-provider.mjs";
import { FlatJsonVectorStore } from "../retrieval/vector-store.mjs";
import { rrfFuse } from "../lib/retrieval.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const queryDocsPath = path.resolve(here, "..", "query-docs.ts");

test("HashEmbeddingProvider yields deterministic, dims-length, L2-normalized vectors", () => {
  const provider = new HashEmbeddingProvider({ dims: 64 });
  const [v1] = provider.embed(["lifecycle states drive ranking"]);
  const [v2] = provider.embed(["lifecycle states drive ranking"]);
  assert.equal(v1.length, 64);
  assert.deepEqual(v1, v2);
  const magnitude = Math.sqrt(v1.reduce((sum, x) => sum + x * x, 0));
  assert.ok(Math.abs(magnitude - 1) < 1e-9, `expected unit vector, got |v|=${magnitude}`);
  assert.equal(provider.getMetadata().dataPrivacy, "local");
});

test("FlatJsonVectorStore returns nearest by cosine and round-trips through save/load", () => {
  const store = new FlatJsonVectorStore();
  store.upsert("a", [1, 0, 0]);
  store.upsert("b", [0, 1, 0]);
  const hits = store.query([1, 0, 0], 2);
  assert.equal(hits[0].id, "a");
  assert.ok(hits[0].score > hits[1].score);

  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-vstore-")), "store.json");
  store.save(file);
  const reloaded = FlatJsonVectorStore.load(file);
  assert.equal(reloaded.query([1, 0, 0], 1)[0].id, "a");
});

test("rrfFuse ranks items appearing high in multiple rankings above single-list items", () => {
  const fused = rrfFuse([
    ["a", "b", "c"],
    ["b", "a", "d"],
  ], { k: 60 });
  const top2 = fused.slice(0, 2).map((entry) => entry.id).sort();
  assert.deepEqual(top2, ["a", "b"]);
  const cIndex = fused.findIndex((entry) => entry.id === "c");
  const aIndex = fused.findIndex((entry) => entry.id === "a");
  assert.ok(aIndex < cIndex, "a (in both lists) should outrank c (in one)");
});

test("query-docs --hybrid fuses BM25 + vector and ranks the on-topic doc first", () => {
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/match.md", "Match", "active", "Lifecycle lifecycle ranking states retrieval index.");
  writeDoc(root, "work/pkm-ai/other.md", "Other", "active", "Drag and drop canvas layout widgets toolbar.");

  const result = run(root, ["--hybrid", "--json", "lifecycle retrieval"]);
  assert.equal(result.status, 0, result.stderr);
  const ranked = JSON.parse(result.stdout);
  assert.ok(ranked.length >= 1, "no hybrid results");
  assert.ok(ranked[0].path.endsWith("match.md"), `expected match.md first, got ${JSON.stringify(ranked.map((r) => r.path))}`);
});

test("query-docs --hybrid keeps lifecycle weighting so active outranks archived on equal content", () => {
  const root = makeRoot();
  writeDoc(root, "work/pkm-ai/live.md", "Live", "active", "widget widget widget gadget");
  writeDoc(root, "work/pkm-ai/old.md", "Old", "archived", "widget widget widget gadget");

  const result = run(root, ["--hybrid", "--json", "widget gadget"]);
  assert.equal(result.status, 0, result.stderr);
  const ranked = JSON.parse(result.stdout);
  const live = ranked.find((r) => r.path.endsWith("live.md"));
  const old = ranked.find((r) => r.path.endsWith("old.md"));
  assert.ok(live && old, "both docs should appear");
  assert.ok(live.score > old.score, `active (${live.score}) should beat archived (${old.score})`);
});

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-hybrid-"));
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

function run(root, args) {
  return spawnSync(process.execPath, [queryDocsPath, ...args], { cwd: root, encoding: "utf8" });
}
