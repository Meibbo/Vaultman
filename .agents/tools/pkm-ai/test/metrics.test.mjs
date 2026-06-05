import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "record-metric.ts");

test("record-metric appends JSONL metric events with evidence details", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-metrics-"));

  execFileSync(
    process.execPath,
    [
      toolPath,
      "glossary_miss",
      "--now",
      "2026-05-04T16:21:00",
      "--path",
      ".agents/docs/architecture/glossary.md",
      "--detail",
      "swam",
    ],
    { cwd: root },
  );

  const metricPath = path.join(root, ".agents", "metrics", "pkm-ai.jsonl");
  const [line] = fs.readFileSync(metricPath, "utf8").trim().split(/\r?\n/);
  assert.deepEqual(JSON.parse(line), {
    ts: "2026-05-04T16:21:00",
    event: "glossary_miss",
    path: ".agents/docs/architecture/glossary.md",
    detail: "swam",
  });
});
