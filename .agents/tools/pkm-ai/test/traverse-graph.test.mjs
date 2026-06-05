import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "traverse-graph.ts");

test("traverse-graph reports parent + body wikilinks as typed out-edges and backlinks as in-edges", () => {
  const root = makeCorpus();

  const alpha = run(root, ["docs/work/pkm-ai/alpha", "--json"]);
  assert.equal(alpha.status, 0, alpha.stderr);
  const alphaGraph = JSON.parse(alpha.stdout);
  assert.equal(alphaGraph.node, "docs/work/pkm-ai/alpha");
  assert.equal(alphaGraph.found, true);
  assert.ok(
    alphaGraph.out.some((edge) => edge.to === "docs/work/pkm-ai/index" && edge.type === "parent"),
    `expected parent edge, got ${JSON.stringify(alphaGraph.out)}`,
  );
  assert.ok(
    alphaGraph.out.some((edge) => edge.to === "docs/work/pkm-ai/beta" && edge.type === "link"),
    `expected body link edge, got ${JSON.stringify(alphaGraph.out)}`,
  );

  const beta = run(root, ["docs/work/pkm-ai/beta", "--json"]);
  const betaGraph = JSON.parse(beta.stdout);
  assert.ok(
    betaGraph.in.some((edge) => edge.from === "docs/work/pkm-ai/alpha" && edge.type === "link"),
    `expected backlink from alpha, got ${JSON.stringify(betaGraph.in)}`,
  );
});

test("traverse-graph accepts a file path and normalizes it to a wiki-path node", () => {
  const root = makeCorpus();
  const byFile = run(root, [".agents/docs/work/pkm-ai/alpha.md", "--json"]);
  assert.equal(byFile.status, 0, byFile.stderr);
  const graph = JSON.parse(byFile.stdout);
  assert.equal(graph.node, "docs/work/pkm-ai/alpha");
  assert.equal(graph.found, true);
});

test("traverse-graph --depth follows out-edges transitively", () => {
  const root = makeCorpus();
  const result = run(root, ["docs/work/pkm-ai/alpha", "--depth", "2", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const graph = JSON.parse(result.stdout);
  const reachable = graph.reachable.map((node) => node.node ?? node);
  assert.ok(reachable.includes("docs/work/pkm-ai/beta"), `1-hop missing: ${JSON.stringify(reachable)}`);
  assert.ok(reachable.includes("docs/work/pkm-ai/gamma"), `2-hop missing: ${JSON.stringify(reachable)}`);
});

test("traverse-graph reports an unknown node as found:false without crashing", () => {
  const root = makeCorpus();
  const result = run(root, ["docs/work/pkm-ai/missing", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  const graph = JSON.parse(result.stdout);
  assert.equal(graph.found, false);
  assert.deepEqual(graph.out, []);
  assert.deepEqual(graph.in, []);
});

function makeCorpus() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-graph-"));
  writeDoc(root, "work/pkm-ai/index.md", "Pkm-ai hub", "[[docs/work/pkm-ai/index|pkm-ai]]", "Hub.");
  writeDoc(
    root,
    "work/pkm-ai/alpha.md",
    "Alpha",
    "[[docs/work/pkm-ai/index|pkm-ai]]",
    "See [[docs/work/pkm-ai/beta|beta]] for the next step.",
  );
  writeDoc(
    root,
    "work/pkm-ai/beta.md",
    "Beta",
    "[[docs/work/pkm-ai/index|pkm-ai]]",
    "Continues into [[docs/work/pkm-ai/gamma|gamma]].",
  );
  writeDoc(root, "work/pkm-ai/gamma.md", "Gamma", "[[docs/work/pkm-ai/index|pkm-ai]]", "Leaf node.");
  return root;
}

function writeDoc(root, rel, title, parent, body) {
  const filePath = path.join(root, ".agents", "docs", rel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---
title: ${title}
type: note
status: active
parent: "${parent}"
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
  return spawnSync(process.execPath, [toolPath, ...args], { cwd: root, encoding: "utf8" });
}
