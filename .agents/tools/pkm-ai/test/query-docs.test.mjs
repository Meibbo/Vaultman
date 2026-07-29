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

test("query-docs warns on stderr when a doc is newer than the cache", () => {
  const root = makeRootWithStaleCache();

  const result = runQuery(root, ["--status", "active"]);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /stale/i);
  assert.match(result.stderr, /1 doc/);
  assert.match(result.stderr, /work\/alpha\/newer\.md/);
  assert.match(result.stdout, /cached-doc/);
});

test("query-docs --strict exits non-zero on a stale cache", () => {
  const root = makeRootWithStaleCache();

  const result = runQuery(root, ["--status", "active", "--strict"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /stale/i);
});

test("query-docs --refresh rebuilds the cache and drops the warning", () => {
  const root = makeRootWithStaleCache();

  const result = runQuery(root, ["--status", "active", "--refresh"]);

  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stderr, /stale/i);
  assert.match(result.stdout, /newer-doc/);
});

test("query-docs reports cached paths that no longer exist on disk", () => {
  const root = makeRootWithStaleCache({ includeGhost: true });

  const result = runQuery(root, ["--status", "active"]);

  assert.match(result.stderr, /1 missing/);
  assert.match(result.stderr, /work\/alpha\/ghost\.md/);
});

test("query-docs stays silent when the cache is current", () => {
  const root = makeRootWithStaleCache({ generatedAt: futureStamp() });

  const result = runQuery(root, ["--status", "active"]);

  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stderr, /stale/i);
});

test("query-docs --json keeps stdout parseable while warning on stderr", () => {
  const root = makeRootWithStaleCache();

  const result = runQuery(root, ["--status", "active", "--json"]);

  assert.match(result.stderr, /stale/i);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, "cached-doc");
});

test("query-docs --closed matches every spelling of closed", () => {
  const root = makeVocabularyRoot();

  const result = runQuery(root, ["--closed", "--json"]);

  assert.equal(result.status, 0);
  const titles = JSON.parse(result.stdout).map((row) => row.title).sort();
  assert.deepEqual(titles, ["closed-1", "complete-1", "completed-1", "done-1", "passed-1", "released-1"]);
});

test("query-docs --open excludes closed and inactive states", () => {
  const root = makeVocabularyRoot();

  const result = runQuery(root, ["--open", "--json"]);

  const titles = JSON.parse(result.stdout).map((row) => row.title).sort();
  assert.deepEqual(titles, ["active-1", "frobnicated-1", "needs-triage-1"]);
});

test("query-docs --status accepts a comma list", () => {
  const root = makeVocabularyRoot();

  const result = runQuery(root, ["--status", "completed,done", "--json"]);

  const titles = JSON.parse(result.stdout).map((row) => row.title).sort();
  assert.deepEqual(titles, ["completed-1", "done-1"]);
});

test("query-docs reports status values outside the known vocabulary", () => {
  const root = makeVocabularyRoot();

  const result = runQuery(root, ["--open"]);

  assert.match(result.stderr, /unrecognized status/i);
  assert.match(result.stderr, /frobnicated/);
});

test("query-docs rejects --open together with --closed", () => {
  const root = makeVocabularyRoot();

  const result = runQuery(root, ["--open", "--closed"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--open and --closed/);
});

test("query-docs --initiative falls back to the initiative/<x> tag", () => {
  const root = makeSchemaRoot();

  const result = runQuery(root, ["--initiative", "polish", "--json"]);

  const titles = JSON.parse(result.stdout).map((row) => row.title).sort();
  assert.deepEqual(titles, ["tagged-polish", "typed-polish"]);
});

test("query-docs --lifecycle filters on the ADR 0002 field", () => {
  const root = makeSchemaRoot();

  const result = runQuery(root, ["--lifecycle", "deferred", "--json"]);

  const titles = JSON.parse(result.stdout).map((row) => row.title);
  assert.deepEqual(titles, ["deferred-doc"]);
});

test("query-docs --since keeps docs updated on or after the bound", () => {
  const root = makeDateRoot();

  const result = runQuery(root, ["--since", "2026-07-23", "--json"]);

  const titles = JSON.parse(result.stdout).map((row) => row.title).sort();
  assert.deepEqual(titles, ["on-bound", "well-after"]);
});

test("query-docs --until keeps docs updated on or before the bound", () => {
  const root = makeDateRoot();

  const result = runQuery(root, ["--until", "2026-07-23", "--json"]);

  const titles = JSON.parse(result.stdout).map((row) => row.title).sort();
  assert.deepEqual(titles, ["on-bound", "well-before"]);
});

test("query-docs --since and --until compose into a window", () => {
  const root = makeDateRoot();

  const result = runQuery(root, ["--since", "2026-07-01", "--until", "2026-07-23", "--json"]);

  const titles = JSON.parse(result.stdout).map((row) => row.title).sort();
  assert.deepEqual(titles, ["on-bound"]);
});

test("query-docs --not excludes matches of a field", () => {
  const root = makeSchemaRoot();

  const result = runQuery(root, ["--not", "status=completed", "--json"]);

  const titles = JSON.parse(result.stdout).map((row) => row.title);
  assert.ok(!titles.includes("closed-doc"));
  assert.ok(titles.includes("newer-doc"));
});

test("query-docs --parent scopes to children of an issue-set index", () => {
  const root = makeSchemaRoot();

  const result = runQuery(root, ["--parent", "bt5-final-stable-audit", "--json"]);

  const titles = JSON.parse(result.stdout).map((row) => row.title).sort();
  assert.deepEqual(titles, ["child-a", "child-b"]);
});

function runQuery(root, args) {
  return spawnSync(process.execPath, [toolPath, ...args], { cwd: root, encoding: "utf8" });
}

// Docs exercising the F4 schema/operator surface: initiative as key vs tag, lifecycle,
// updated-date bounds, and parent membership.
function makeSchemaRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-schema-"));
  const entries = [
    { title: "typed-polish", initiative: "polish", tags: [], lifecycle: "active", updated: "2026-06-01", status: "active", parent: "" },
    { title: "tagged-polish", initiative: "", tags: ["initiative/polish"], lifecycle: "active", updated: "2026-06-01", status: "active", parent: "" },
    { title: "deferred-doc", initiative: "", tags: [], lifecycle: "deferred", updated: "2026-06-01", status: "active", parent: "" },
    { title: "newer-doc", initiative: "", tags: [], lifecycle: "active", updated: "2026-07-24", status: "active", parent: "" },
    { title: "closed-doc", initiative: "", tags: [], lifecycle: "active", updated: "2026-07-24", status: "completed", parent: "" },
    { title: "child-a", initiative: "", tags: [], lifecycle: "active", updated: "2026-06-01", status: "active", parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5]]" },
    { title: "child-b", initiative: "", tags: [], lifecycle: "active", updated: "2026-06-01", status: "active", parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5]]" },
  ].map((partial, index) => ({
    path: `.agents/docs/work/alpha/${index}.md`,
    type: "item",
    id: "",
    ...partial,
  }));
  writeFile(
    path.join(root, ".agents", "cache", "search-index.json"),
    `${JSON.stringify({ generated_at: futureStamp(), entries }, null, 2)}\n`,
  );
  return root;
}

// Three docs straddling the 2026-07-23 bound for range-filter tests.
function makeDateRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-date-"));
  const entries = [
    { title: "well-before", updated: "2026-01-15" },
    { title: "on-bound", updated: "2026-07-23" },
    { title: "well-after", updated: "2026-12-01" },
  ].map((partial, index) => ({
    path: `.agents/docs/work/alpha/${index}.md`,
    type: "item",
    status: "active",
    lifecycle: "active",
    initiative: "",
    id: "",
    parent: "",
    tags: [],
    ...partial,
  }));
  writeFile(
    path.join(root, ".agents", "cache", "search-index.json"),
    `${JSON.stringify({ generated_at: futureStamp(), entries }, null, 2)}\n`,
  );
  return root;
}

// One doc per status spelling found in the real corpus, plus an unknown value.
function makeVocabularyRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-vocab-"));
  const statuses = [
    "completed", "complete", "done", "closed", "released", "passed",
    "active", "needs-triage", "frobnicated",
    "archived", "superseded", "historical",
  ];
  const entries = statuses.map((status, index) => ({
    path: `.agents/docs/work/alpha/${index}.md`,
    title: `${status}-1`,
    type: "item",
    status,
    initiative: "",
    id: "",
    tags: [],
    updated: "",
  }));
  for (const entry of entries) {
    const filePath = path.join(root, ...entry.path.split("/"));
    writeFile(filePath, doc(entry.title, entry.status));
    const aged = new Date("2019-01-01T00:00:00.000Z");
    fs.utimesSync(filePath, aged, aged);
  }
  writeFile(
    path.join(root, ".agents", "cache", "search-index.json"),
    `${JSON.stringify({ generated_at: "2020-01-01T00:00:00.000Z", entries }, null, 2)}\n`,
  );
  return root;
}

// A root whose cache was generated before its docs: one doc is indexed and current,
// one exists on disk but is missing from the cache, and optionally one is cached but
// deleted from disk (the Drive-move failure mode).
function makeRootWithStaleCache({ generatedAt = "2020-01-01T00:00:00.000Z", includeGhost = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-stale-"));
  const cachedPath = path.join(root, ".agents", "docs", "work", "alpha", "cached.md");
  writeFile(cachedPath, doc("cached-doc"));
  writeFile(path.join(root, ".agents", "docs", "work", "alpha", "newer.md"), doc("newer-doc"));
  // Age the indexed doc so only newer.md counts as modified after the cache.
  const aged = new Date("2019-01-01T00:00:00.000Z");
  fs.utimesSync(cachedPath, aged, aged);

  const entries = [
    { path: ".agents/docs/work/alpha/cached.md", title: "cached-doc", type: "item", status: "active", initiative: "", id: "", tags: [], updated: "" },
  ];
  if (includeGhost) {
    entries.push({ path: ".agents/docs/work/alpha/ghost.md", title: "ghost-doc", type: "item", status: "active", initiative: "", id: "", tags: [], updated: "" });
  }

  writeFile(
    path.join(root, ".agents", "cache", "search-index.json"),
    `${JSON.stringify({ generated_at: generatedAt, entries }, null, 2)}\n`,
  );
  return root;
}

function doc(title, status = "active") {
  return `---
title: ${title}
type: item
status: ${status}
---

# ${title}
`;
}

function futureStamp() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
