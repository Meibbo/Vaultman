// Smoke test for the S6d real semantic path (transformers.js MiniLM + Orama).
// NOT named *.test.mjs on purpose: excluded from the default `node --test test/*.test.mjs` suite
// because it downloads the ~80MB model on first run. Run manually:
//   node .agents/tools/pkm-ai/test/semantic.smoke.mjs
// Exits non-zero on failure.

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const indexDocs = path.resolve(here, "..", "index-docs.ts");
const embedDocs = path.resolve(here, "..", "embed-docs.ts");
const queryDocs = path.resolve(here, "..", "query-docs.ts");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-semantic-"));
writeDoc(root, "work/pkm-ai/dogs.md", "Dogs", "active", "Puppies and canines are loyal household pets that bark.");
writeDoc(root, "work/pkm-ai/finance.md", "Finance", "active", "Quarterly revenue, invoices, and balance sheets drive accounting.");

run(indexDocs, []);
run(embedDocs, []);
// semantic query whose words do NOT literally appear in the dog doc, but are meaning-adjacent.
const result = run(queryDocs, ["--semantic", "--json", "pet animal"]);
const ranked = JSON.parse(result.stdout);

assert.ok(ranked.length >= 1, "no semantic results");
assert.ok(ranked[0].path.endsWith("dogs.md"), `expected dogs.md first by meaning, got ${JSON.stringify(ranked.map((r) => r.path))}`);
console.log("SEMANTIC SMOKE OK:", ranked.map((r) => `${r.score.toFixed(4)} ${r.path.split("/").pop()}`).join(" | "));

function writeDoc(rootDir, rel, title, lifecycle, body) {
  const filePath = path.join(rootDir, ".agents", "docs", rel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---\ntitle: ${title}\ntype: note\nstatus: active\nlifecycle: ${lifecycle}\nparent: "[[docs/work/pkm-ai/index|pkm-ai]]"\ncreated: 2026-06-05T01:00:00\nupdated: 2026-06-05T01:00:00\ntags:\n  - agent/note\n---\n\n# ${title}\n\n${body}\n`,
  );
}

function run(tool, args) {
  const result = spawnSync(process.execPath, [tool, ...args], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`FAILED: ${tool} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
    process.exit(1);
  }
  return result;
}
