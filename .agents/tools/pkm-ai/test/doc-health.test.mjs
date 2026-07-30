import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "check-doc-health.ts");

test("check-doc-health fails compacted active docs without archive source", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "current", "handoff.md"),
    `---
title: Current handoff
type: agent-handoff
status: active
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
compacted: true
tags:
  - agent/current
---

# Current Handoff

Short replacement.
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /archive-source/);
});

test("check-doc-health reports unparseable frontmatter as a one-line frontmatter-yaml failure", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "broken.md"),
    `---
title: BT5-096 — Dependency refresh: 3 high advisories
type: item
status: active
---

# Broken
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  assert.notEqual(result.status, 0);
  const lines = result.stdout.split("\n").filter((line) => line.startsWith("frontmatter-yaml\t"));
  assert.equal(lines.length, 1, `expected one failure line, got ${JSON.stringify(result.stdout)}`);
  const [, failurePath, detail] = lines[0].split("\t");
  assert.equal(failurePath, ".agents/docs/work/pkm-ai/broken.md");
  assert.match(detail, /bad indentation of a mapping entry \(line 2, column 36\)/);
});

// Obsidian wikilinks cannot span lines: hard-wrapping prose through a [[...]] leaves a dead link
// that renders as literal text. This is the mechanical cause of every broken link found in the
// corpus on 2026-07-30, so health fails it and names the file.
test("check-doc-health fails a wikilink split across two lines", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "alpha", "split.md"),
    `${docHeader("Split link")}
Ver [[docs/work/polish/specs/2026-07-18-batch/01-by-level-sort|Shard 01
By level sort]] antes de tocar el sort.

Inline code is not a link: \`filename: [[start, end], ...]\`.
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  assert.notEqual(result.status, 0);
  const lines = result.stdout.split("\n").filter((line) => line.startsWith("wikilink-unclosed\t"));
  assert.equal(lines.length, 1, `expected one wikilink-unclosed failure, got ${JSON.stringify(result.stdout)}`);
  assert.match(lines[0], /work\/alpha\/split\.md/);
  assert.match(lines[0], /line 9/);
  assert.match(lines[0], /closing \]\] is on line 10/);
});

test("check-doc-health tells a stray [[ apart from a link split by a wrap", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "alpha", "stray.md"),
    `${docHeader("Stray bracket")}
Para enlazar se escribe [[ seguido del path.
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  const lines = result.stdout.split("\n").filter((line) => line.startsWith("wikilink-unclosed\t"));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /no closing \]\] found/);
});

test("--repair-wikilink-splits rejoins the link and clears the failure", () => {
  const root = makeTempRoot();
  const docPath = path.join(root, ".agents", "docs", "work", "alpha", "split.md");
  writeFile(
    docPath,
    `${docHeader("Split link")}
Ver [[docs/work/polish/specs/2026-07-18-batch/01-by-level-sort|Shard 01
By level sort]] antes de tocar el sort.
`,
  );

  const result = spawnSync(process.execPath, [toolPath, "--repair-wikilink-splits"], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0, result.stdout);
  const repaired = fs.readFileSync(docPath, "utf8");
  assert.match(
    repaired,
    /Ver \[\[docs\/work\/polish\/specs\/2026-07-18-batch\/01-by-level-sort\|Shard 01 By level sort\]\] antes de tocar el sort\./,
  );
});

// A repair that rewrites files it did not actually change turns a surgical fix into a corpus-wide
// diff — and on CRLF files the only "change" was the line endings (caught on the real corpus,
// 2026-07-30). A doc with nothing to join must come out byte-identical.
test("repairs leave untouched docs byte-identical, CRLF included", () => {
  const root = makeTempRoot();
  const docPath = path.join(root, ".agents", "docs", "work", "alpha", "crlf.md");
  const original = `${docHeader("CRLF doc")}\nVer [[docs/work/alpha/other|otro]] y nada más.\n`.replace(/\n/g, "\r\n");
  writeFile(docPath, original);

  // Mixed endings are the live case: Obsidian writes CRLF on Windows while agents write LF, so a
  // doc another agent is editing right now carries both. Normalizing them is not this tool's job.
  const mixedPath = path.join(root, ".agents", "docs", "work", "alpha", "mixed.md");
  const mixed = `${docHeader("Mixed endings")}`.replace(/\n/g, "\r\n") + "\nVer [[docs/work/alpha/other|otro]].\r\nSegunda línea suelta.\n";
  writeFile(mixedPath, mixed);

  for (const flag of ["--repair-wikilink-splits", "--repair-hard-wraps"]) {
    const result = spawnSync(process.execPath, [toolPath, flag], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout);
    assert.equal(fs.readFileSync(docPath, "utf8"), original, `${flag} rewrote an unchanged doc`);
    assert.equal(fs.readFileSync(mixedPath, "utf8"), mixed, `${flag} normalized line endings`);
  }
});

// The dev reads these docs in Obsidian, where the pane soft-wraps: a sentence broken across two
// source lines is noise. Repair joins a line to the next only while the sentence is still open,
// so the result is one line per sentence — never one line per paragraph, never a mangled list.
test("--repair-hard-wraps joins split sentences and leaves structure alone", () => {
  const root = makeTempRoot();
  const docPath = path.join(root, ".agents", "docs", "work", "alpha", "wrapped.md");
  writeFile(
    docPath,
    `${docHeader("Wrapped prose")}
Explorer responsibilities are tangled across \`panelExplorer\`, the views, and the
god-providers. A pure 4-axis split left Navigation and Style without a clear
home.

- Bullet text that keeps going
  onto a continuation line.
- Second bullet stays separate.

| col | value |
| --- | ----- |
| a   | b     |

\`\`\`ts
const wrapped = "code stays"
  + " exactly as written";
\`\`\`
`,
  );

  const result = spawnSync(process.execPath, [toolPath, "--repair-hard-wraps"], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0, result.stdout);
  const repaired = fs.readFileSync(docPath, "utf8");
  assert.match(repaired, /tangled across `panelExplorer`, the views, and the god-providers\./);
  assert.match(repaired, /A pure 4-axis split left Navigation and Style without a clear home\./);
  assert.match(repaired, /- Bullet text that keeps going onto a continuation line\./);
  assert.match(repaired, /- Second bullet stays separate\./);
  assert.match(repaired, /\| col \| value \|\r?\n\| --- \| ----- \|/, "table rows must not join");
  assert.match(repaired, /const wrapped = "code stays"\r?\n {2}\+ " exactly as written";/, "code fence untouched");
});

// Two cases the first cut of the unwrapper left behind, found by running it on the docs policy
// itself: 4-space nested list continuations, and a `:` that only looks sentence-final because it
// sits inside an inline code span the wrap cut in half (which breaks the code span too).
test("--repair-hard-wraps joins nested list continuations and wrapped code spans", () => {
  const root = makeTempRoot();
  const docPath = path.join(root, ".agents", "docs", "work", "alpha", "nested.md");
  writeFile(
    docPath,
    `${docHeader("Nested")}
- Include agent tracking:
    - The value SHOULD include the model after the agent name as
      \`<agent>-<model>\` (e.g. \`claude-opus-4-7\`) to record which model produced
      the edit.
- Quote any value with an unquoted colon inside \`title:
  3 high advisories\` because it reads as a nested mapping.
`,
  );

  const result = spawnSync(process.execPath, [toolPath, "--repair-hard-wraps"], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0, result.stdout);
  const repaired = fs.readFileSync(docPath, "utf8");
  assert.match(
    repaired,
    /- The value SHOULD include the model after the agent name as `<agent>-<model>` \(e\.g\. `claude-opus-4-7`\) to record which model produced the edit\./,
  );
  assert.match(repaired, /inside `title: 3 high advisories` because it reads as a nested mapping\./);
  assert.match(repaired, /^- Include agent tracking:$/m, "the parent bullet keeps its own line");
});

test("check-doc-health warns for unknown glossary candidates", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "architecture", "glossary.md"),
    `---
title: Glossary
type: architecture
status: active
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
tags:
  - agent/architecture
---

# Glossary

- Known term: defined.
`,
  );
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "notes", "term-test.md"),
    `---
title: Term test
type: note
status: draft
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
glossary_candidates:
  - swam
tags:
  - agent/note
---

# Term Test
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /doc health: OK/);
  assert.match(result.stdout, /WARN/);
  assert.match(result.stdout, /glossary-unknown/);
  assert.match(result.stdout, /swam/);
});

test("check-doc-health repairs line-limit failures by creating continuation shards", () => {
  const root = makeTempRoot();
  const longDoc = path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "long-plan.md");
  const bodyLines = [
    "# Long Plan",
    "",
    ...Array.from({ length: 430 }, (_, index) => `Line ${String(index + 1).padStart(3, "0")}`),
  ];
  writeFile(
    longDoc,
    `---
title: Long plan
type: implementation-plan
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
tags:
  - agent/plan
---

${bodyLines.join("\n")}
`,
  );

  const result = spawnSync(
    process.execPath,
    [toolPath, "--repair-line-limits", "--now", "2026-05-10T10:00:00"],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /line-limit repair: sharded/);
  assert.match(result.stdout, /doc health: OK/);

  const repaired = fs.readFileSync(longDoc, "utf8");
  const shardOnePath = path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "long-plan-shard-1.md");
  const shardTwoPath = path.join(root, ".agents", "docs", "work", "pkm-ai", "plans", "long-plan-shard-2.md");
  const shardOne = fs.readFileSync(shardOnePath, "utf8");
  const shardTwo = fs.readFileSync(shardTwoPath, "utf8");

  assert.ok(lineCount(repaired) <= 200);
  assert.ok(lineCount(shardOne) <= 200);
  assert.ok(lineCount(shardTwo) <= 200);
  assert.match(repaired, /Continua en \[\[docs\/work\/pkm-ai\/plans\/long-plan-shard-1\|continuacion 1\]\]\./);
  assert.match(shardOne, /title: "?Long plan - continuation 1"?/);
  assert.match(shardOne, /type: continuation-shard/);
  assert.match(shardOne, /parent: "\[\[docs\/work\/pkm-ai\/plans\/long-plan\|Long plan\]\]"/);
  assert.match(shardOne, /shard_source: ".agents\/docs\/work\/pkm-ai\/plans\/long-plan.md"/);
  assert.match(shardOne, /shard_of: "\[\[docs\/work\/pkm-ai\/plans\/long-plan\|Long plan\]\]"/);
  assert.match(shardOne, /shard_part: 1/);
  assert.match(shardOne, /Continua en \[\[docs\/work\/pkm-ai\/plans\/long-plan-shard-2\|continuacion 2\]\]\./);
  assert.match(shardTwo, /Line 430/);
});

test("check-doc-health repairs parent shape, timestamp offsets, and public superpowers docs", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "research", "example", "index.md"),
    `---
title: Example Index
type: research-index
status: active
created: 2026-05-10T01:00:00
updated: 2026-05-10T01:00:00
---

# Example Index
`,
  );
  writeFile(
    path.join(root, ".agents", "docs", "work", "research", "example", "child.md"),
    `---
title: Child Doc
type: research-shard
parent: "[[index]]"
created: 2026-05-10T01:00:00-05:00
updated: 2026-05-10T01:00:00-05:00
---

# Child
`,
  );
  writeFile(
    path.join(root, ".agents", "docs", "templates", "plan-template.md"),
    `---
title: Plan Template
type: template
parent: "{{parent_link}}"
created: {{timestamp}}
updated: {{timestamp}}
---

# Template
`,
  );
  writeFile(
    path.join(root, "docs", "superpowers", "plans", "old-plan.md"),
    "# Public plan\n",
  );

  const red = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });
  assert.notEqual(red.status, 0);
  assert.match(red.stdout, /forbidden-path/);
  assert.match(red.stdout, /parent-shape/);
  assert.match(red.stdout, /timestamp-offset/);

  const result = spawnSync(
    process.execPath,
    [toolPath, "--repair-residuals", "--now", "2026-05-10T10:30:00"],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /parent repair: updated 1 file/);
  assert.match(result.stdout, /timestamp repair: updated 1 file/);
  assert.match(result.stdout, /public-doc repair: archived docs\/superpowers/);
  assert.match(result.stdout, /doc health: OK/);

  const child = fs.readFileSync(path.join(root, ".agents", "docs", "work", "research", "example", "child.md"), "utf8");
  const template = fs.readFileSync(path.join(root, ".agents", "docs", "templates", "plan-template.md"), "utf8");
  assert.match(child, /parent: "\[\[docs\/work\/research\/example\/index\|index\]\]"/);
  assert.match(child, /created: 2026-05-10T01:00:00\n/);
  assert.match(child, /updated: 2026-05-10T01:00:00\n/);
  assert.match(template, /parent: "\{\{parent_link\}\}"/);
  assert.equal(fs.existsSync(path.join(root, "docs", "superpowers")), false);
  assert.equal(
    fs.existsSync(path.join(root, ".agents", "docs", "archive", "pkm-ai", "public-docs", "2026-05-10T103000-superpowers", "plans", "old-plan.md")),
    true,
  );
});

// --- S3: memory lifecycle (ADR 0002) ----------------------------------------------------------

test("check-doc-health fails docs with an invalid lifecycle state", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "items", "bad-lifecycle.md"),
    `---
title: Bad lifecycle
type: work-item
status: active
lifecycle: parked
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
tags:
  - agent/work
---

# Bad lifecycle
`,
  );

  const result = spawnSync(process.execPath, [toolPath, "--now", "2026-05-10T10:00:00"], { cwd: root, encoding: "utf8" });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /lifecycle-state/);
  assert.match(result.stdout, /parked/);
});

test("check-doc-health warns stale active lifecycle docs past the threshold", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "items", "stale-active.md"),
    `---
title: Stale active
type: work-item
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-01-01T00:00:00
updated: 2026-01-01T00:00:00
tags:
  - agent/work
---

# Stale active
`,
  );

  const result = spawnSync(process.execPath, [toolPath, "--now", "2026-06-04T00:00:00"], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /doc health: OK/);
  assert.match(result.stdout, /WARN\tstale-active/);
});

test("check-doc-health accepts a fresh active lifecycle doc", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "items", "fresh-active.md"),
    `---
title: Fresh active
type: work-item
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-01T00:00:00
updated: 2026-06-03T00:00:00
tags:
  - agent/work
---

# Fresh active
`,
  );

  const result = spawnSync(process.execPath, [toolPath, "--now", "2026-06-04T00:00:00"], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /doc health: OK/);
  assert.doesNotMatch(result.stdout, /stale-active/);
});

test("--path scopes a repair to the given subtree, leaving out-of-scope failing docs untouched", () => {
  const root = makeTempRoot();
  writeFile(path.join(root, ".agents", "docs", "work", "pkm-ai", "in.md"), offsetDoc("In scope"));
  writeFile(path.join(root, ".agents", "docs", "work", "hardening", "out.md"), offsetDoc("Out of scope"));

  const result = spawnSync(
    process.execPath,
    [toolPath, "--repair-timestamp-offsets", "--path", ".agents/docs/work/pkm-ai"],
    { cwd: root, encoding: "utf8" },
  );

  assert.notEqual(result.status, undefined);
  const inText = fs.readFileSync(path.join(root, ".agents", "docs", "work", "pkm-ai", "in.md"), "utf8");
  const outText = fs.readFileSync(path.join(root, ".agents", "docs", "work", "hardening", "out.md"), "utf8");
  assert.doesNotMatch(inText, /updated: .*Z$/m, "in-scope doc should be repaired");
  assert.match(outText, /updated: .*Z$/m, "out-of-scope doc must stay untouched");
});

test("--exclude skips a subtree in a repair", () => {
  const root = makeTempRoot();
  writeFile(path.join(root, ".agents", "docs", "work", "pkm-ai", "in.md"), offsetDoc("In scope"));
  writeFile(path.join(root, ".agents", "docs", "work", "hardening", "out.md"), offsetDoc("Out of scope"));

  spawnSync(
    process.execPath,
    [toolPath, "--repair-timestamp-offsets", "--exclude", ".agents/docs/work/hardening"],
    { cwd: root, encoding: "utf8" },
  );

  const inText = fs.readFileSync(path.join(root, ".agents", "docs", "work", "pkm-ai", "in.md"), "utf8");
  const outText = fs.readFileSync(path.join(root, ".agents", "docs", "work", "hardening", "out.md"), "utf8");
  assert.doesNotMatch(inText, /updated: .*Z$/m, "non-excluded doc should be repaired");
  assert.match(outText, /updated: .*Z$/m, "excluded doc must stay untouched");
});

test("--path scopes the check pass so out-of-scope failures do not fail the run", () => {
  const root = makeTempRoot();
  writeFile(path.join(root, ".agents", "docs", "work", "pkm-ai", "clean.md"), cleanDoc("Clean"));
  writeFile(path.join(root, ".agents", "docs", "work", "hardening", "bad.md"), offsetDoc("Bad out of scope"));

  const scoped = spawnSync(process.execPath, [toolPath, "--path", ".agents/docs/work/pkm-ai"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(scoped.status, 0, `scoped run should pass, got: ${scoped.stdout}`);

  const full = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });
  assert.notEqual(full.status, 0, "unscoped run should still see the out-of-scope failure");
  assert.match(full.stdout, /timestamp-offset/);
});

function offsetDoc(title) {
  return `---
title: ${title}
type: note
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00Z
tags:
  - agent/note
---

# ${title}
`;
}

function cleanDoc(title) {
  return `---
title: ${title}
type: note
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
tags:
  - agent/note
---

# ${title}
`;
}

test("check-doc-health warns when a routing policy cites a tool path that does not resolve", () => {
  const root = makeTempRoot();
  // A real tool file exists as .ts; the policy points at the migrated-away .mjs name.
  writeFile(path.join(root, ".agents", "tools", "pkm-ai", "query-docs.ts"), "// tool\n");
  writeFile(
    path.join(root, ".agents", "docs", "architecture", "policies", "tools.md"),
    `---
title: Tools policy
type: policy
status: active
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
tags:
  - agent/policy
---

# Tools Policy

- Use \`tools/pkm-ai/query-docs.mjs --glossary <term>\` as the glossary gate.
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /WARN\ttool-path-missing/);
  assert.match(result.stdout, /query-docs\.mjs/);
});

test("check-doc-health accepts a routing policy that cites the real .ts tool path", () => {
  const root = makeTempRoot();
  writeFile(path.join(root, ".agents", "tools", "pkm-ai", "query-docs.ts"), "// tool\n");
  writeFile(
    path.join(root, ".agents", "docs", "architecture", "policies", "tools.md"),
    `---
title: Tools policy
type: policy
status: active
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
tags:
  - agent/policy
---

# Tools Policy

- Use \`tools/pkm-ai/query-docs.ts --glossary <term>\` as the glossary gate.
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.doesNotMatch(result.stdout, /tool-path-missing/);
});

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-health-"));
}

// 7-line frontmatter block: doc bodies below therefore start at line 8.
function docHeader(title) {
  return `---
title: ${title}
type: note
status: active
created: 2026-07-30T01:00:00
updated: 2026-07-30T01:00:00
---
`;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function lineCount(text) {
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}
