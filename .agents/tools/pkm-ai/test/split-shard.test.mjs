import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "split-shard.mjs");

test("split-shard previews mechanical part files without writing", () => {
  const root = makeTempRoot();
  const sourcePath = path.join(root, ".agents", "docs", "work", "research", "example", "01-long-shard.md");
  writeLongShard(sourcePath, 34);

  const result = spawnSync(
    process.execPath,
    [toolPath, "--file", ".agents/docs/work/research/example/01-long-shard.md", "--max-lines", "50"],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /DRY RUN/);
  assert.match(result.stdout, /01-long-shard-part-01\.md/);
  assert.match(result.stdout, /01-long-shard-part-02\.md/);
  assert.equal(fs.existsSync(path.join(root, ".agents", "docs", "work", "research", "example", "01-long-shard-part-01.md")), false);
});

test("split-shard writes compact manifest and continuation parts with prev-next links", () => {
  const root = makeTempRoot();
  const sourceRel = ".agents/docs/work/research/example/01-long-shard.md";
  const sourcePath = path.join(root, sourceRel);
  writeLongShard(sourcePath, 42);

  const result = spawnSync(
    process.execPath,
    [toolPath, "--file", sourceRel, "--max-lines", "50", "--write", "--now", "2026-05-31T10:00:00"],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /WROTE/);

  const manifest = fs.readFileSync(sourcePath, "utf8");
  const partOnePath = path.join(root, ".agents", "docs", "work", "research", "example", "01-long-shard-part-01.md");
  const partTwoPath = path.join(root, ".agents", "docs", "work", "research", "example", "01-long-shard-part-02.md");
  const partOne = fs.readFileSync(partOnePath, "utf8");
  const partTwo = fs.readFileSync(partTwoPath, "utf8");

  assert.ok(lineCount(manifest) <= 50);
  assert.ok(lineCount(partOne) <= 50);
  assert.ok(lineCount(partTwo) <= 50);
  assert.match(manifest, /type: research-shard-index/);
  assert.match(manifest, /01-long-shard-part-01\|parte 01/);
  assert.match(partOne, /Parte 1 de 2/);
  assert.match(partOne, /Continua en \[\[docs\/work\/research\/example\/01-long-shard-part-02\|parte 02\]\]\./);
  assert.match(partTwo, /Viene de \[\[docs\/work\/research\/example\/01-long-shard-part-01\|parte 01\]\]\./);
  assert.match(partTwo, /Detail line 042/);
});

test("split-shard continues numbering when the input is an existing part", () => {
  const root = makeTempRoot();
  const partRel = ".agents/docs/work/research/example/01-long-shard-part-02.md";
  writeLongShard(path.join(root, ".agents", "docs", "work", "research", "example", "01-long-shard-part-01.md"), 3, {
    title: "Long shard - part 01",
  });
  writeLongShard(path.join(root, partRel), 36, {
    title: "Long shard - part 02",
  });

  const result = spawnSync(
    process.execPath,
    [toolPath, "--file", partRel, "--max-lines", "50", "--write", "--now", "2026-05-31T10:30:00"],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(
    fs.existsSync(path.join(root, ".agents", "docs", "work", "research", "example", "01-long-shard-part-02-part-01.md")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(root, ".agents", "docs", "work", "research", "example", "01-long-shard-part-03.md")),
    true,
  );

  const partTwo = fs.readFileSync(path.join(root, partRel), "utf8");
  const partThree = fs.readFileSync(path.join(root, ".agents", "docs", "work", "research", "example", "01-long-shard-part-03.md"), "utf8");
  assert.match(partTwo, /Parte 2 de 3/);
  assert.match(partTwo, /Continua en \[\[docs\/work\/research\/example\/01-long-shard-part-03\|parte 03\]\]\./);
  assert.match(partThree, /Viene de \[\[docs\/work\/research\/example\/01-long-shard-part-02\|parte 02\]\]\./);
});

test("split-shard strips generated continuation wrapper before splitting an existing part", () => {
  const root = makeTempRoot();
  const partRel = ".agents/docs/work/research/example/01-long-shard-part-02.md";
  writeGeneratedPart(path.join(root, partRel), 36);

  const result = spawnSync(
    process.execPath,
    [toolPath, "--file", partRel, "--max-lines", "50", "--write", "--now", "2026-05-31T11:00:00"],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);

  const partTwo = fs.readFileSync(path.join(root, partRel), "utf8");
  const partThree = fs.readFileSync(path.join(root, ".agents", "docs", "work", "research", "example", "01-long-shard-part-03.md"), "utf8");

  assert.equal(partTwo.match(/^# Long shard - part 02$/gm)?.length, 1);
  assert.doesNotMatch(partTwo, /^> Parte 2 de 2\.$/m);
  assert.match(partTwo, /Detail line 001/);
  assert.match(partThree, /Detail line 036/);
});

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-split-shard-"));
}

function writeLongShard(filePath, detailLines, options = {}) {
  const title = options.title ?? "Long shard";
  writeFile(
    filePath,
    `---
title: ${title}
type: research-shard
status: active
parent: "[[docs/work/research/example/index|example]]"
created: 2026-05-31T09:00:00
updated: 2026-05-31T09:00:00
tags:
  - agent/research
---

# ${title}

${Array.from({ length: detailLines }, (_, index) => `Detail line ${String(index + 1).padStart(3, "0")}`).join("\n")}
`,
  );
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeGeneratedPart(filePath, detailLines) {
  writeFile(
    filePath,
    `---
title: Long shard - part 02
type: continuation-shard
status: active
parent: "[[docs/work/research/example/01-long-shard|Long shard]]"
shard_source: ".agents/docs/work/research/example/01-long-shard.md"
shard_of: "[[docs/work/research/example/01-long-shard|Long shard]]"
shard_part: 2
created: 2026-05-31T09:00:00
updated: 2026-05-31T09:00:00
tags:
  - agent/shard
---

# Long shard - part 02

> Parte 2 de 2.
> Viene de [[docs/work/research/example/01-long-shard-part-01|parte 01]].

${Array.from({ length: detailLines }, (_, index) => `Detail line ${String(index + 1).padStart(3, "0")}`).join("\n")}

---
Viene de [[docs/work/research/example/01-long-shard-part-01|parte 01]].
`,
  );
}

function lineCount(text) {
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}
