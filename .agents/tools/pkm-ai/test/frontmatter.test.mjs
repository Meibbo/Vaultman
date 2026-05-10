import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDocEntry,
  filterEntries,
  formatRows,
  parseArgs,
  parseMarkdown,
  validateFrontmatter,
} from "../lib/frontmatter.mjs";

test("parseMarkdown returns structured frontmatter and body", () => {
  const parsed = parseMarkdown(`---
title: Example Doc
type: note
tags:
  - one
  - two
---

# Body
`);

  assert.equal(parsed.frontmatter.title, "Example Doc");
  assert.deepEqual(parsed.frontmatter.tags, ["one", "two"]);
  assert.equal(parsed.body.trim(), "# Body");
});

test("validateFrontmatter reports timezone offsets, parent_path, and parent shape", () => {
  const failures = validateFrontmatter(
    {
      created: "2026-05-04T01:36:20-05:00",
      parent_path: ".agents/docs/index",
      parent: ".agents/docs/index",
    },
    ".agents/docs/example.md",
  );

  assert.deepEqual(
    failures.map((failure) => failure.code),
    ["timestamp-offset", "parent-path", "parent-shape"],
  );
});

test("buildDocEntry maps frontmatter fields into index entries", () => {
  const entry = buildDocEntry(".agents/docs/work/pkm-ai/items/vm-0001.md", {
    title: "Refresh",
    type: "backlog-item",
    status: "active",
    initiative: "pkm-ai",
    id: "VM-0001",
    tags: ["agent/backlog"],
    updated: "2026-05-04T00:00:00",
  });

  assert.equal(entry.id, "VM-0001");
  assert.equal(entry.path, ".agents/docs/work/pkm-ai/items/vm-0001.md");
  assert.deepEqual(entry.tags, ["agent/backlog"]);
});

test("parseArgs supports filters, json output, and positional search terms", () => {
  const args = parseArgs(["--type", "backlog-item", "--tag", "agent/backlog", "--json", "refresh"]);

  assert.deepEqual(args.filters, { type: "backlog-item", tag: "agent/backlog" });
  assert.equal(args.json, true);
  assert.equal(args.search, "refresh");
});

test("formatRows returns compact table text", () => {
  const table = formatRows([
    {
      id: "VM-0001",
      title: "PKM-AI orchestration refresh",
      type: "backlog-item",
      status: "active",
      initiative: "pkm-ai",
      path: ".agents/docs/work/pkm-ai/items/vm-0001.md",
    },
  ]);

  assert.match(table, /VM-0001/);
  assert.match(table, /PKM-AI orchestration refresh/);
  assert.match(table, /backlog-item/);
});

test("filterEntries matches search words across punctuation and connector words", () => {
  const rows = filterEntries(
    [
      {
        id: "",
        title: "Agent control plane - route and retrieval profiles",
        type: "spec-shard",
        status: "draft",
        initiative: "",
        path: ".agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/05-route-retrieval-profiles.md",
      },
    ],
    {},
    "route retrieval profiles",
  );

  assert.equal(rows.length, 1);
});
