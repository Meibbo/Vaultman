#!/usr/bin/env node
import { buildCodeIndex, dependentsFor, formatCodeIndex } from "./lib/code-index.mjs";

const parsed = parseArgs(process.argv.slice(2));

if (parsed.help || parsed.targets.length === 0) {
  printUsage();
  process.exit(parsed.help ? 0 : 1);
}

try {
  const index = buildCodeIndex({ root: parsed.root, targets: parsed.targets });
  if (parsed.dependentsTarget) {
    index.dependents = dependentsFor(index, parsed.dependentsTarget);
  }
  if (parsed.json) {
    console.log(JSON.stringify(index, null, 2));
  } else {
    process.stdout.write(formatCodeIndex(index, { dependentsTarget: parsed.dependentsTarget }));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function parseArgs(args) {
  const parsed = {
    root: process.cwd(),
    json: false,
    help: false,
    dependentsTarget: "",
    targets: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--root") {
      parsed.root = args[index + 1] ?? "";
      index += 1;
    } else if (arg === "--dependents") {
      parsed.dependentsTarget = args[index + 1] ?? "";
      index += 1;
    } else {
      parsed.targets.push(arg);
    }
  }

  return parsed;
}

function printUsage() {
  console.log("Usage: node code-index.mjs [--json] [--root <root>] [--dependents <path>] <file-or-dir>...");
}
