#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  lineCount,
  listMarkdownFiles,
  readMarkdown,
  relativePath,
  titleFromPath,
  validateFrontmatter,
} from "./lib/frontmatter.mjs";
import { normalizeGlossaryTerm, readGlossaryTerms } from "./lib/glossary.mjs";
import { assertTimestamp, nowTimestamp, recordMetric } from "./lib/metrics.mjs";

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  console.log(`Usage: node .agents/tools/pkm-ai/check-doc-health.mjs
       node .agents/tools/pkm-ai/check-doc-health.mjs --repair-line-limits [--now YYYY-MM-DDTHH:mm:ss]
       node .agents/tools/pkm-ai/check-doc-health.mjs --repair-residuals [--now YYYY-MM-DDTHH:mm:ss]

Checks .agents/docs active Markdown files for line limits, frontmatter rules,
parent link shape, and forbidden active public agent-doc paths.

--repair-line-limits rewrites docs past the hard cap (limit + 100 = 300) into
continuation shards before the final health check. Docs in the soft range (over
the 200 limit but within the hard cap) only WARN and are left for the dev to decide.
--repair-residuals also repairs parent shape, timestamp offsets, and public
docs/superpowers placement.`);
  process.exit(0);
}

const root = process.cwd();
const failures = [];
const warnings = [];
const superpowersPath = path.join(root, "docs", "superpowers");
const glossaryTerms = readGlossaryTerms(root);
const limit = 200;
// Soft limit = a sharding trigger, not a forced reduction. The soft range
// (limit+1 .. hardLimit) emits a WARN so the agent alerts the dev, who decides
// whether to shard. Past hardLimit (= limit + 100) the cap is hard: the doc must
// be split into a new shard part, and --repair-line-limits only auto-shards there.
const hardLimit = limit + 100;

if (options.repairLineLimits) {
  const repairs = repairLineLimitFailures(root, { limit, hardLimit, now: options.now });
  for (const repair of repairs) {
    console.log(`line-limit repair: sharded ${repair.path} into ${repair.shards} shard(s)`);
  }
}

if (options.repairParentShape) {
  const repairs = repairParentShapeFailures(root);
  if (repairs.length > 0) {
    console.log(`parent repair: updated ${repairs.length} file(s)`);
  }
}

if (options.repairTimestampOffsets) {
  const repairs = repairTimestampOffsetFailures(root);
  if (repairs.length > 0) {
    console.log(`timestamp repair: updated ${repairs.length} file(s)`);
  }
}

if (options.repairForbiddenPublicDocs) {
  const repair = repairForbiddenPublicDocs(root, options.now);
  if (repair) {
    console.log(`public-doc repair: archived docs/superpowers to ${repair.path}`);
  }
}

if (fs.existsSync(superpowersPath)) {
  failures.push({ code: "forbidden-path", path: "docs/superpowers", detail: "active public docs/superpowers must not exist" });
}

for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
  const rel = relativePath(root, file);
  const text = fs.readFileSync(file, "utf8");
  const lines = lineCount(text);
  if (lines > hardLimit) {
    failures.push({ code: "line-limit", path: rel, detail: `${lines} > ${hardLimit} hard cap; split into a new shard part` });
  } else if (lines > limit) {
    warnings.push({ code: "line-limit-soft", path: rel, detail: `${lines} > ${limit} soft limit; alert the dev to decide whether to shard` });
  }

  try {
    const markdown = readMarkdown(file);
    failures.push(...validateFrontmatter(markdown.frontmatter, rel).filter((failure) => !isAllowedTemplateParent(failure, markdown.frontmatter, rel)));
    failures.push(...validateArchiveSource(markdown.frontmatter, text, rel));
    warnings.push(...validateGlossaryCandidates(markdown.frontmatter, rel, glossaryTerms));
    warnings.push(...validateSummarySource(markdown.frontmatter, text, rel));
  } catch (error) {
    failures.push({ code: "frontmatter-parse", path: rel, detail: error.message });
  }
}

if (warnings.length > 0) {
  for (const warning of warnings) {
    console.log(`WARN\t${warning.code}\t${warning.path}\t${warning.detail}`);
  }
}

if (failures.length > 0) {
  console.log(`doc health: FAIL (${failures.length})`);
  for (const failure of failures) {
    console.log(`${failure.code}\t${failure.path}\t${failure.detail}`);
  }
  recordMetric(root, "health_failed", { path: ".agents/docs", detail: `${failures.length} failures` });
  process.exit(1);
}

recordMetric(root, "health_passed", { path: ".agents/docs", detail: `${warnings.length} warnings` });
console.log("doc health: OK");

function parseArgs(args) {
  const parsed = {
    help: false,
    repairLineLimits: false,
    repairParentShape: false,
    repairTimestampOffsets: false,
    repairForbiddenPublicDocs: false,
    now: nowTimestamp(),
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--repair-line-limits") {
      parsed.repairLineLimits = true;
    } else if (arg === "--repair-parent-shape") {
      parsed.repairParentShape = true;
    } else if (arg === "--repair-timestamp-offsets") {
      parsed.repairTimestampOffsets = true;
    } else if (arg === "--repair-forbidden-public-docs") {
      parsed.repairForbiddenPublicDocs = true;
    } else if (arg === "--repair-residuals") {
      parsed.repairLineLimits = true;
      parsed.repairParentShape = true;
      parsed.repairTimestampOffsets = true;
      parsed.repairForbiddenPublicDocs = true;
    } else if (arg === "--now") {
      parsed.now = args[index + 1] ?? "";
      index += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  assertTimestamp(parsed.now);
  return parsed;
}

function repairParentShapeFailures(root) {
  const repaired = [];
  for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
    const rel = relativePath(root, file);
    const markdown = readMarkdown(file);
    if (!Object.hasOwn(markdown.frontmatter, "parent")) continue;
    if (isTemplateParentPlaceholder(markdown.frontmatter, rel)) continue;
    const parent = markdown.frontmatter.parent;
    if (typeof parent === "string" && isValidParentLink(parent)) continue;

    const replacement = normalizeParentLink(String(parent ?? ""), rel);
    const next = replaceFrontmatterLine(fs.readFileSync(file, "utf8"), "parent", `parent: ${quoteYamlString(replacement)}`);
    if (!next) continue;
    fs.writeFileSync(file, next);
    repaired.push(rel);
  }
  return repaired;
}

function repairTimestampOffsetFailures(root) {
  const repaired = [];
  for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
    const text = fs.readFileSync(file, "utf8");
    const next = text.replace(
      /^(created|updated): (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:Z|[+-]\d{2}:?\d{2})$/gm,
      "$1: $2",
    );
    if (next === text) continue;
    fs.writeFileSync(file, next);
    repaired.push(relativePath(root, file));
  }
  return repaired;
}

function repairForbiddenPublicDocs(root, now) {
  const source = path.join(root, "docs", "superpowers");
  if (!fs.existsSync(source)) return null;
  const archiveRoot = path.join(root, ".agents", "docs", "archive", "pkm-ai", "public-docs");
  fs.mkdirSync(archiveRoot, { recursive: true });
  const target = uniqueArchivePath(archiveRoot, `${now.replace(/:/g, "")}-superpowers`);
  fs.renameSync(source, target);
  const rel = relativePath(root, target);
  recordMetric(root, "archive_created", {
    ts: now,
    path: rel,
    detail: "moved forbidden public docs/superpowers into agent archive",
  });
  return { path: rel };
}

function isValidParentLink(parent) {
  return /^\[\[[^|\]]+\|[^\]]+\]\]$/.test(parent);
}

function isAllowedTemplateParent(failure, frontmatter, rel) {
  return failure.code === "parent-shape" && isTemplateParentPlaceholder(frontmatter, rel);
}

function isTemplateParentPlaceholder(frontmatter, rel) {
  return rel.startsWith(".agents/docs/templates/") && frontmatter.parent === "{{parent_link}}";
}

function normalizeParentLink(parent, rel) {
  const value = parent.trim().replace(/^["']|["']$/g, "");
  if (/^\[\[[^\]]+\]\]$/.test(value)) {
    const inner = value.slice(2, -2);
    if (inner.includes("|")) return value;
    return wikiLinkForRel(resolveRelativeParentTarget(rel, inner), inner || "parent");
  }
  if (value.includes("|")) {
    const [target, alias] = value.split("|", 2);
    return `[[${target.trim()}|${(alias ?? "parent").trim() || "parent"}]]`;
  }
  if (/^\{\{[^}]+\}\}$/.test(value)) {
    return `[[${value}|parent]]`;
  }
  if (value) return `[[${value}|parent]]`;
  return "[[docs/work/pkm-ai/index|pkm-ai]]";
}

function resolveRelativeParentTarget(rel, target) {
  if (!target || target.includes("/") || target.startsWith("{{")) return target;
  return path.posix.join(path.posix.dirname(wikiPathForRel(rel)), target);
}

function replaceFrontmatterLine(text, key, replacementLine) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const raw = match[1];
  const nextRaw = raw.replace(new RegExp(`^${key}:.*$`, "m"), replacementLine);
  if (nextRaw === raw) return null;
  return match[0].replace(raw, nextRaw) + text.slice(match[0].length);
}

function uniqueArchivePath(parent, name) {
  let candidate = path.join(parent, name);
  let suffix = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(parent, `${name}-${suffix}`);
    suffix += 1;
  }
  return candidate;
}

function repairLineLimitFailures(root, { limit, hardLimit, now }) {
  const repairs = [];
  for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
    const rel = relativePath(root, file);
    if (isGeneratedShard(rel)) continue;

    const text = fs.readFileSync(file, "utf8");
    // Only auto-shard past the hard cap; the soft range (limit..hardLimit) is the
    // dev's call, so automated repair leaves those docs alone. Shard budget still
    // targets `limit` so the resulting parts are comfortably sized.
    if (lineCount(text) <= hardLimit) continue;

    const repair = shardOversizedDoc(root, file, rel, text, { limit, now });
    if (repair) repairs.push(repair);
  }
  return repairs;
}

function shardOversizedDoc(root, file, rel, text, { limit, now }) {
  const markdown = readMarkdown(file);
  const sourceTitle = String(markdown.frontmatter.title ?? titleFromPath(rel));
  const sourceWiki = wikiLinkForRel(rel, sourceTitle);
  const bodyLines = splitLines(markdown.body);
  const headerLines = markdown.rawFrontmatter ? ["---", ...splitLines(markdown.rawFrontmatter), "---", ""] : [];
  const firstShardRel = shardRelFor(rel, 1);
  const sourceContinuation = continuationLine(firstShardRel, 1);
  const sourceBodyBudget = limit - headerLines.length - 2;

  if (sourceBodyBudget < 1) {
    return null;
  }

  const sourceBody = bodyLines.slice(0, sourceBodyBudget);
  const overflowBody = bodyLines.slice(sourceBody.length);
  if (overflowBody.length === 0) return null;

  const shardBodyBudget = shardBodyLineBudget(rel, sourceTitle, sourceWiki, { limit, now });
  if (shardBodyBudget < 1) return null;

  removeGeneratedShardsForSource(path.dirname(file), path.basename(file, ".md"), rel);

  const chunks = chunkLines(overflowBody, shardBodyBudget);
  for (let index = 0; index < chunks.length; index += 1) {
    const part = index + 1;
    const shardRel = shardRelFor(rel, part);
    const nextRel = part < chunks.length ? shardRelFor(rel, part + 1) : null;
    const shardText = renderShard({
      bodyLines: chunks[index],
      nextRel,
      now,
      part,
      rel,
      sourceTitle,
      sourceWiki,
    });
    fs.writeFileSync(path.join(root, shardRel), shardText);
  }

  fs.writeFileSync(file, renderLines([...headerLines, ...sourceBody, "", sourceContinuation]));
  recordMetric(root, "line_limit_sharded", {
    ts: now,
    path: rel,
    detail: `${lineCount(text)} lines into ${chunks.length} shard(s)`,
  });
  return { path: rel, shards: chunks.length };
}

function shardBodyLineBudget(rel, sourceTitle, sourceWiki, { limit, now }) {
  const prefix = shardPrefixLines({ now, part: 1, rel, sourceTitle, sourceWiki });
  return limit - prefix.length - 2;
}

function renderShard({ bodyLines, nextRel, now, part, rel, sourceTitle, sourceWiki }) {
  const lines = [...shardPrefixLines({ now, part, rel, sourceTitle, sourceWiki }), ...bodyLines];
  if (nextRel) {
    lines.push("", continuationLine(nextRel, part + 1));
  }
  return renderLines(lines);
}

function shardPrefixLines({ now, part, rel, sourceTitle, sourceWiki }) {
  return [
    "---",
    `title: ${quoteYamlString(`${sourceTitle} - continuation ${part}`)}`,
    "type: continuation-shard",
    "status: active",
    `parent: ${quoteYamlString(sourceWiki)}`,
    `shard_source: ${quoteYamlString(rel)}`,
    `shard_of: ${quoteYamlString(sourceWiki)}`,
    `shard_part: ${part}`,
    `created: ${now}`,
    `updated: ${now}`,
    "tags:",
    "  - agent/shard",
    "created_by: codex",
    "updated_by: codex",
    "---",
    "",
    `# ${sourceTitle} - continuation ${part}`,
    "",
    `Continua desde ${sourceWiki}.`,
    "",
  ];
}

function removeGeneratedShardsForSource(dir, baseName, rel) {
  const pattern = new RegExp(`^${escapeRegExp(baseName)}-shard-\\d+\\.md$`);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !pattern.test(entry.name)) continue;
    const filePath = path.join(dir, entry.name);
    try {
      const markdown = readMarkdown(filePath);
      if (markdown.frontmatter.shard_source === rel) fs.unlinkSync(filePath);
    } catch {
      // Leave non-generated or malformed files alone.
    }
  }
}

function shardRelFor(rel, part) {
  const parsed = path.posix.parse(rel);
  return path.posix.join(parsed.dir, `${parsed.name}-shard-${part}.md`);
}

function continuationLine(rel, part) {
  return `Continua en [[${wikiPathForRel(rel)}|continuacion ${part}]].`;
}

function wikiLinkForRel(rel, alias) {
  return `[[${wikiPathForRel(rel)}|${alias}]]`;
}

function wikiPathForRel(rel) {
  return rel.replace(/^\.agents\/docs\//, "docs/").replace(/\.md$/, "");
}

function splitLines(text) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function chunkLines(lines, size) {
  const chunks = [];
  for (let index = 0; index < lines.length; index += size) {
    chunks.push(lines.slice(index, index + size));
  }
  return chunks;
}

function renderLines(lines) {
  return lines.join("\n");
}

function quoteYamlString(value) {
  return JSON.stringify(String(value).replace(/\r?\n/g, " "));
}

function isGeneratedShard(rel) {
  return /-shard-\d+\.md$/.test(rel);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateArchiveSource(frontmatter, text, rel) {
  if (!isActiveDoc(rel)) return [];
  if (!isReplacementLike(frontmatter)) return [];
  if (hasArchiveSource(frontmatter, text)) return [];
  return [{ code: "archive-source", path: rel, detail: "replacement/compaction needs archive_source or archive link" }];
}

function validateSummarySource(frontmatter, text, rel) {
  if (!/(^|\/)(specs|plans)\//.test(rel)) return [];
  if (!isReplacementLike(frontmatter) && !/^##\s+(Summary|Resumen)\b/im.test(text)) return [];
  if (hasArchiveSource(frontmatter, text) || /(^|\/)\d{2}-[^/\n]+\.md\b/.test(text)) return [];
  return [{ code: "summary-source", path: rel, detail: "summary-like spec/plan should link source, shard, or archive" }];
}

function validateGlossaryCandidates(frontmatter, rel, terms) {
  const candidates = Array.isArray(frontmatter.glossary_candidates) ? frontmatter.glossary_candidates : [];
  return candidates
    .filter((candidate) => !terms.has(normalizeGlossaryTerm(candidate)))
    .map((candidate) => ({ code: "glossary-unknown", path: rel, detail: String(candidate) }));
}

function isActiveDoc(rel) {
  return rel.startsWith(".agents/docs/") && !rel.startsWith(".agents/docs/archive/");
}

function isReplacementLike(frontmatter) {
  return Boolean(
    frontmatter.compacted === true ||
      frontmatter.summary === true ||
      frontmatter.replaces ||
      frontmatter.summary_of ||
      frontmatter.compacted_from,
  );
}

function hasArchiveSource(frontmatter, text) {
  return Boolean(
    frontmatter.archive_source ||
      frontmatter.source_record ||
      frontmatter.shard_source ||
      /\.agents\/docs\/archive\//.test(text),
  );
}
