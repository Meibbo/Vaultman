#!/usr/bin/env node
import { recordMetric } from "./lib/metrics.mjs";

interface MetricFields {
  ts?: string;
  path?: string;
  detail?: string;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/record-metric.ts <event> [--now YYYY-MM-DDTHH:mm:ss] [--path path] [--detail text]

Events:
  glossary_checked
  glossary_miss
  archive_created
  line_limit_sharded
  health_failed
  health_passed`);
  process.exit(0);
}

const args = process.argv.slice(2);
const event = args[0];
const fields: MetricFields = {};

for (let index = 1; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--now") {
    fields.ts = args[index + 1] ?? "";
    index += 1;
  } else if (arg === "--path") {
    fields.path = args[index + 1] ?? "";
    index += 1;
  } else if (arg === "--detail") {
    fields.detail = args[index + 1] ?? "";
    index += 1;
  }
}

try {
  recordMetric(process.cwd(), event, fields);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
