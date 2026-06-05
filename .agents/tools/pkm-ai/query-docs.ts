#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildIndex, CACHE_PATH, filterEntries, formatRows, parseArgs } from "./lib/frontmatter.mjs";
import { hasGlossaryTerm } from "./lib/glossary.mjs";
import { recordMetric } from "./lib/metrics.mjs";

interface DocEntry {
  [key: string]: unknown;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/query-docs.ts [filters] [search terms]

Filters:
  --id VM-0001
  --type feature
  --status planned
  --initiative pkm-ai
  --tag agent/item
  --glossary term
  --json`);
  process.exit(0);
}

const root = process.cwd();
const glossaryIndex = process.argv.indexOf("--glossary");
if (glossaryIndex !== -1) {
  const term = process.argv[glossaryIndex + 1] ?? "";
  recordMetric(root, "glossary_checked", { path: ".agents/docs/architecture/glossary.md", detail: term });
  if (hasGlossaryTerm(root, term)) {
    console.log(`${term} está en el glosario.`);
    process.exit(0);
  }

  recordMetric(root, "glossary_miss", { path: ".agents/docs/architecture/glossary.md", detail: term });
  console.log(`${term} no está en el glosario. Añádelo o márcalo como external/test term.`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const cachePath = path.join(root, CACHE_PATH);
const entries: DocEntry[] = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8")).entries
  : buildIndex(root, { excludeArchiveRaw: false, excludeTemplates: true });
const rows: DocEntry[] = filterEntries(entries, args.filters, args.search);

if (args.json) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log(formatRows(rows));
}
