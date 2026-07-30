#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  lineCount,
  listMarkdownFiles,
  readMarkdown,
  relativePath,
  titleFromPath,
  tryParseMarkdown,
  validateFrontmatter,
} from "./lib/frontmatter.mjs";
import { normalizeGlossaryTerm, readGlossaryTerms } from "./lib/glossary.mjs";
import { assertTimestamp, nowTimestamp, recordMetric } from "./lib/metrics.mjs";

interface ParsedArgs {
  help: boolean;
  repairLineLimits: boolean;
  repairParentShape: boolean;
  repairTimestampOffsets: boolean;
  repairForbiddenPublicDocs: boolean;
  repairWikilinkSplits: boolean;
  repairHardWraps: boolean;
  now: string;
  staleActiveDays: number;
  paths: string[];
  excludes: string[];
}

interface HealthIssue {
  code: string;
  path: string;
  detail: string;
}

interface LineRepair {
  path: string;
  shards: number;
}

interface ShardRenderArgs {
  bodyLines: string[];
  nextRel: string | null;
  now: string;
  part: number;
  rel: string;
  sourceTitle: string;
  sourceWiki: string;
}

type ShardPrefixArgs = Omit<ShardRenderArgs, "bodyLines" | "nextRel">;

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  console.log(`Usage: node .agents/tools/pkm-ai/check-doc-health.ts
       node .agents/tools/pkm-ai/check-doc-health.ts --repair-line-limits [--now YYYY-MM-DDTHH:mm:ss]
       node .agents/tools/pkm-ai/check-doc-health.ts --repair-residuals [--now YYYY-MM-DDTHH:mm:ss]

Checks .agents/docs active Markdown files for line limits, frontmatter rules,
parent link shape, lifecycle states (PKM-AI ADR 0002), and forbidden active
public agent-doc paths.

--stale-active-days N (default 30) flags lifecycle:active docs untouched past N
days as a WARN (review/demote), not a failure.

--repair-line-limits rewrites docs past the hard cap (limit + 100 = 300) into
continuation shards before the final health check. Docs in the soft range (over
the 200 limit but within the hard cap) only WARN and are left for the dev to decide.
--repair-residuals also repairs parent shape, timestamp offsets, public
docs/superpowers placement, and wikilinks a line wrap split in two.

--repair-hard-wraps unwraps prose: a line is joined to the next while the
sentence is still open, so a paragraph broken across source lines becomes one
line per sentence. Lists keep their markers, tables/code fences/frontmatter are
untouched. NOT part of --repair-residuals — it rewrites most of the corpus, so
run it scoped with --path and review the diff.

--path <prefix> (repeatable) confines the check + repair to a subtree;
--exclude <prefix> (repeatable) skips one. Prefixes accept ".agents/docs/work/x",
"docs/work/x", or "work/x". Use these to keep a repair off another stream's
contended docs (e.g. --exclude work/hardening --exclude current).`);
  process.exit(0);
}

const root = process.cwd();
const failures: HealthIssue[] = [];
const warnings: HealthIssue[] = [];
const superpowersPath = path.join(root, "docs", "superpowers");
const glossaryTerms: Set<string> = readGlossaryTerms(root);
const limit = 200;
// Soft limit = a sharding trigger, not a forced reduction. The soft range
// (limit+1 .. hardLimit) emits a WARN so the agent alerts the dev, who decides
// whether to shard. Past hardLimit (= limit + 100) the cap is hard: the doc must
// be split into a new shard part, and --repair-line-limits only auto-shards there.
const hardLimit = limit + 100;
// Memory lifecycle states (PKM-AI ADR 0002). Carried in a dedicated `lifecycle:` frontmatter field
// (additive — `status` stays the doc-workflow field). Opt-in: docs without `lifecycle:` are not flagged.
const LIFECYCLE_STATES = new Set<string>(["active", "deferred", "triaged", "blocked", "superseded", "archived"]);

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

if (options.repairWikilinkSplits) {
  const repairs = repairWikilinkSplits(root);
  if (repairs.length > 0) {
    console.log(`wikilink repair: rejoined split links in ${repairs.length} file(s)`);
  }
}

if (options.repairHardWraps) {
  const repairs = repairHardWraps(root);
  if (repairs.length > 0) {
    console.log(`hard-wrap repair: unwrapped prose in ${repairs.length} file(s)`);
  }
}

if (options.repairForbiddenPublicDocs && inScope("docs/superpowers")) {
  const repair = repairForbiddenPublicDocs(root, options.now);
  if (repair) {
    console.log(`public-doc repair: archived docs/superpowers to ${repair.path}`);
  }
}

if (inScope("docs/superpowers") && fs.existsSync(superpowersPath)) {
  failures.push({ code: "forbidden-path", path: "docs/superpowers", detail: "active public docs/superpowers must not exist" });
}

for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
  const rel = relativePath(root, file);
  if (!inScope(rel)) continue;
  const text = fs.readFileSync(file, "utf8");
  const lines = lineCount(text);
  if (lines > hardLimit) {
    failures.push({ code: "line-limit", path: rel, detail: `${lines} > ${hardLimit} hard cap; split into a new shard part` });
  } else if (lines > limit) {
    warnings.push({ code: "line-limit-soft", path: rel, detail: `${lines} > ${limit} soft limit; alert the dev to decide whether to shard` });
  }

  // Unparseable YAML gets its own code (the index build reports the same one for the doc it had to
  // skip); `frontmatter-parse` stays the catch-all for anything the validators themselves throw.
  const { parsed: markdown, failure: yamlFailure } = tryParseMarkdown(text, rel);
  if (yamlFailure) {
    failures.push(yamlFailure);
    continue;
  }

  try {
    failures.push(...validateFrontmatter(markdown.frontmatter, rel).filter((failure: HealthIssue) => !isAllowedTemplateParent(failure, markdown.frontmatter, rel)));
    failures.push(...validateArchiveSource(markdown.frontmatter, text, rel));
    failures.push(...validateLifecycle(markdown.frontmatter, rel));
    failures.push(...validateWikilinks(text, rel));
    warnings.push(...validateGlossaryCandidates(markdown.frontmatter, rel, glossaryTerms));
    warnings.push(...validateSummarySource(markdown.frontmatter, text, rel));
    warnings.push(...validateStaleActive(markdown.frontmatter, rel, options.now, options.staleActiveDays));
    warnings.push(...validateToolPaths(root, text, rel));
  } catch (error) {
    failures.push({ code: "frontmatter-parse", path: rel, detail: (error as Error).message });
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

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    help: false,
    repairLineLimits: false,
    repairParentShape: false,
    repairTimestampOffsets: false,
    repairForbiddenPublicDocs: false,
    repairWikilinkSplits: false,
    repairHardWraps: false,
    now: nowTimestamp(),
    staleActiveDays: 30,
    paths: [],
    excludes: [],
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
    } else if (arg === "--repair-wikilink-splits") {
      parsed.repairWikilinkSplits = true;
    } else if (arg === "--repair-hard-wraps") {
      parsed.repairHardWraps = true;
    } else if (arg === "--repair-residuals") {
      parsed.repairLineLimits = true;
      parsed.repairParentShape = true;
      parsed.repairTimestampOffsets = true;
      parsed.repairForbiddenPublicDocs = true;
      // --repair-hard-wraps is deliberately NOT here: rejoining a split link is surgical, but
      // unwrapping prose rewrites most of the corpus and stays an explicit, scoped decision.
      parsed.repairWikilinkSplits = true;
    } else if (arg === "--stale-active-days") {
      parsed.staleActiveDays = Number(args[index + 1] ?? "30");
      index += 1;
    } else if (arg === "--path") {
      parsed.paths.push(args[index + 1] ?? "");
      index += 1;
    } else if (arg === "--exclude") {
      parsed.excludes.push(args[index + 1] ?? "");
      index += 1;
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

// Normalize a path/prefix to docs-relative form so --path/--exclude accept
// ".agents/docs/work/x", "docs/work/x", or "work/x" interchangeably.
function toDocRel(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.agents\/docs\//, "")
    .replace(/^docs\//, "")
    .replace(/^\/+/, "");
}

// Multi-agent-safe scoping (S3b): a doc is in scope unless an --exclude prefix matches; when any
// --path is given, the doc must also match one. Default (no flags) = whole .agents/docs tree.
function inScope(rel: string): boolean {
  const dr = toDocRel(rel);
  if (options.excludes.some((prefix) => dr.startsWith(toDocRel(prefix)))) return false;
  if (options.paths.length > 0) return options.paths.some((prefix) => dr.startsWith(toDocRel(prefix)));
  return true;
}

function repairParentShapeFailures(root: string): string[] {
  const repaired: string[] = [];
  for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
    const rel = relativePath(root, file);
    if (!inScope(rel)) continue;
    const markdown = readMarkdown(file);
    if (!Object.hasOwn(markdown.frontmatter, "parent")) continue;
    if (isTemplateParentPlaceholder(markdown.frontmatter, rel)) continue;
    const parent = (markdown.frontmatter as any).parent;
    if (typeof parent === "string" && isValidParentLink(parent)) continue;

    const replacement = normalizeParentLink(String(parent ?? ""), rel);
    const next = replaceFrontmatterLine(fs.readFileSync(file, "utf8"), "parent", `parent: ${quoteYamlString(replacement)}`);
    if (!next) continue;
    fs.writeFileSync(file, next);
    repaired.push(rel);
  }
  return repaired;
}

function repairTimestampOffsetFailures(root: string): string[] {
  const repaired: string[] = [];
  for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
    if (!inScope(relativePath(root, file))) continue;
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

// Rejoin links the wrap broke. Surgical: only lines whose `]]` sits on the next prose line are
// touched, so a stray `[[` (a genuine authoring mistake) is left for a human and keeps failing.
function repairWikilinkSplits(root: string): string[] {
  return rewriteDocs(root, joinWikilinkSplits);
}

// Undo hard-wrapped prose. The dev reads these docs in Obsidian, where the pane soft-wraps, so a
// sentence broken across source lines is pure noise — and it also inflates the 200-line budget.
// Opt-in and scopeable (--path/--exclude) because it rewrites most of the corpus.
function repairHardWraps(root: string): string[] {
  return rewriteDocs(root, joinHardWraps);
}

function rewriteDocs(root: string, transform: (text: string) => string): string[] {
  const repaired: string[] = [];
  for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
    const rel = relativePath(root, file);
    if (!inScope(rel)) continue;
    const text = fs.readFileSync(file, "utf8");
    const next = transform(text);
    if (next === text) continue;
    fs.writeFileSync(file, next);
    repaired.push(rel);
  }
  return repaired;
}

function joinWikilinkSplits(text: string): string {
  return joinLines(text, (lines, prose, index, current) => {
    if (!hasUnclosedWikilink(current)) return false;
    return closingLineFor(lines, prose, index) !== null;
  });
}

function joinHardWraps(text: string): string {
  return joinLines(text, (lines, prose, index, current) => {
    if (!continuesSentence(current)) return false;
    return isWrapContinuation(lines[index + 1] ?? "");
  });
}

// Shared join loop: walk the original lines and, while `shouldJoin` holds, pull the next prose line
// up with a single space. The predicate sees the CURRENT accumulated line, so a join that leaves the
// sentence (or the link) still open keeps going.
// Each surviving line keeps its OWN original ending, and a run that joined nothing returns the
// input untouched. Obsidian writes CRLF on Windows while agents write LF, so docs in flight carry
// both; rewriting endings would turn a three-link fix into a whole-corpus diff over files another
// agent is editing right now (2026-07-30).
function joinLines(
  text: string,
  shouldJoin: (lines: string[], prose: Set<number>, index: number, current: string) => boolean,
): string {
  const raw = text.split("\n");
  const endings = raw.map((line) => (line.endsWith("\r") ? "\r\n" : "\n"));
  const lines = raw.map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line));
  const prose = proseLineIndices(lines);
  const out: string[] = [];
  let joins = 0;

  for (let index = 0; index < lines.length; index += 1) {
    let current = lines[index];
    let ending = endings[index];
    while (
      prose.has(index) &&
      prose.has(index + 1) &&
      lines[index + 1] !== undefined &&
      lines[index + 1].trim() !== "" &&
      shouldJoin(lines, prose, index, current)
    ) {
      current = `${current.replace(/\s+$/, "")} ${lines[index + 1].trim()}`;
      ending = endings[index + 1];
      index += 1;
      joins += 1;
    }
    out.push({ text: current, ending });
  }

  if (joins === 0) return text;
  // The final element of a split() carries no ending of its own; drop the one we inferred for it.
  return out.map((line, index) => (index === out.length - 1 ? line.text : line.text + line.ending)).join("");
}

// The line still owes a sentence: it carries prose, is not a block of its own (heading, table row,
// setext rule), and does not end on sentence-final punctuation or an explicit Markdown line break.
function continuesSentence(line: string): boolean {
  if (line.trim() === "") return false;
  if (/^\s*(#{1,6}\s|\||>|---|===)/.test(line)) return false;
  if (/(\s{2}|\\)$/.test(line)) return false;
  // An inline code span cannot span lines either. While one is open, the punctuation that looks
  // sentence-final is inside the code (`title:`), so the sentence is still running.
  if (((line.match(/`/g) ?? []).length % 2) === 1) return true;
  return !/[.!?:;]["'*`)\]]*\s*$/.test(line.trimEnd());
}

// A line that continues the previous one rather than opening a new block. Lists, quotes, tables,
// headings and footnotes all start something new and are never pulled up. Indentation alone does
// not disqualify a line: 4-space nesting is how this corpus writes sub-list continuations, and a
// true indented code block is always preceded by a blank line, which already stops the join.
function isWrapContinuation(line: string): boolean {
  if (line.trim() === "") return false;
  return !/^\s*([-*+]\s|\d+[.)]\s|#{1,6}\s|>|\||---|===|\[\^)/.test(line);
}

function repairForbiddenPublicDocs(root: string, now: string): { path: string } | null {
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

function isValidParentLink(parent: string): boolean {
  return /^\[\[[^|\]]+\|[^\]]+\]\]$/.test(parent);
}

function isAllowedTemplateParent(failure: HealthIssue, frontmatter: any, rel: string): boolean {
  return failure.code === "parent-shape" && isTemplateParentPlaceholder(frontmatter, rel);
}

function isTemplateParentPlaceholder(frontmatter: any, rel: string): boolean {
  return rel.startsWith(".agents/docs/templates/") && frontmatter.parent === "{{parent_link}}";
}

function normalizeParentLink(parent: string, rel: string): string {
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

function resolveRelativeParentTarget(rel: string, target: string): string {
  if (!target || target.includes("/") || target.startsWith("{{")) return target;
  return path.posix.join(path.posix.dirname(wikiPathForRel(rel)), target);
}

function replaceFrontmatterLine(text: string, key: string, replacementLine: string): string | null {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const raw = match[1];
  const nextRaw = raw.replace(new RegExp(`^${key}:.*$`, "m"), replacementLine);
  if (nextRaw === raw) return null;
  return match[0].replace(raw, nextRaw) + text.slice(match[0].length);
}

function uniqueArchivePath(parent: string, name: string): string {
  let candidate = path.join(parent, name);
  let suffix = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(parent, `${name}-${suffix}`);
    suffix += 1;
  }
  return candidate;
}

function repairLineLimitFailures(root: string, { limit, hardLimit, now }: { limit: number; hardLimit: number; now: string }): LineRepair[] {
  const repairs: LineRepair[] = [];
  for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
    const rel = relativePath(root, file);
    if (!inScope(rel)) continue;
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

function shardOversizedDoc(root: string, file: string, rel: string, text: string, { limit, now }: { limit: number; now: string }): LineRepair | null {
  const markdown = readMarkdown(file);
  const sourceTitle = String((markdown.frontmatter as any).title ?? titleFromPath(rel));
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

function shardBodyLineBudget(rel: string, sourceTitle: string, sourceWiki: string, { limit, now }: { limit: number; now: string }): number {
  const prefix = shardPrefixLines({ now, part: 1, rel, sourceTitle, sourceWiki });
  return limit - prefix.length - 2;
}

function renderShard({ bodyLines, nextRel, now, part, rel, sourceTitle, sourceWiki }: ShardRenderArgs): string {
  const lines = [...shardPrefixLines({ now, part, rel, sourceTitle, sourceWiki }), ...bodyLines];
  if (nextRel) {
    lines.push("", continuationLine(nextRel, part + 1));
  }
  return renderLines(lines);
}

function shardPrefixLines({ now, part, rel, sourceTitle, sourceWiki }: ShardPrefixArgs): string[] {
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

function removeGeneratedShardsForSource(dir: string, baseName: string, rel: string): void {
  const pattern = new RegExp(`^${escapeRegExp(baseName)}-shard-\\d+\\.md$`);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !pattern.test(entry.name)) continue;
    const filePath = path.join(dir, entry.name);
    try {
      const markdown = readMarkdown(filePath);
      if ((markdown.frontmatter as any).shard_source === rel) fs.unlinkSync(filePath);
    } catch {
      // Leave non-generated or malformed files alone.
    }
  }
}

function shardRelFor(rel: string, part: number): string {
  const parsed = path.posix.parse(rel);
  return path.posix.join(parsed.dir, `${parsed.name}-shard-${part}.md`);
}

function continuationLine(rel: string, part: number): string {
  return `Continua en [[${wikiPathForRel(rel)}|continuacion ${part}]].`;
}

function wikiLinkForRel(rel: string, alias: string): string {
  return `[[${wikiPathForRel(rel)}|${alias}]]`;
}

function wikiPathForRel(rel: string): string {
  return rel.replace(/^\.agents\/docs\//, "docs/").replace(/\.md$/, "");
}

function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
}

// Indices of the lines that are prose: frontmatter and fenced code obey their own syntax, so no
// line rule (wikilink shape, sentence wrapping) may touch them.
function proseLineIndices(lines: string[]): Set<number> {
  const prose = new Set<number>();
  let inFrontmatter = lines[0] === "---";
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (inFrontmatter) {
      if (index > 0 && line.trim() === "---") inFrontmatter = false;
      continue;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    prose.add(index);
  }
  return prose;
}

// Inline code routinely carries bracket pairs that are not wikilinks (`filename: [[start, end]`),
// so strip code spans before counting.
function hasUnclosedWikilink(line: string): boolean {
  const stripped = line.replace(/`[^`]*`/g, "");
  return (stripped.match(/\[\[/g) ?? []).length > (stripped.match(/\]\]/g) ?? []).length;
}

// An Obsidian wikilink cannot span lines. Hard-wrapping prose through one leaves a dead link that
// renders as literal `[[path|alias` text — the mechanical cause of every broken link in the corpus
// (2026-07-30 census). Reported separately from a stray `[[`, which needs a human decision.
function validateWikilinks(text: string, rel: string): HealthIssue[] {
  const lines = splitLines(text);
  const prose = proseLineIndices(lines);
  const issues: HealthIssue[] = [];
  for (const index of prose) {
    if (!hasUnclosedWikilink(lines[index])) continue;
    const closesOn = closingLineFor(lines, prose, index);
    const detail =
      closesOn === null
        ? `line ${index + 1}: no closing ]] found`
        : `line ${index + 1}: closing ]] is on line ${closesOn + 1} — Obsidian links cannot span lines; --repair-wikilink-splits joins them`;
    issues.push({ code: "wikilink-unclosed", path: rel, detail });
  }
  return issues.sort((a, b) => a.detail.localeCompare(b.detail, undefined, { numeric: true }));
}

// Where the `]]` for an unclosed line lands, if it lands at all. A wikilink never crosses a blank
// line, so the paragraph break bounds the search and a stray `[[` is not mistaken for a wrap.
function closingLineFor(lines: string[], prose: Set<number>, index: number): number | null {
  for (let next = index + 1; next < lines.length; next += 1) {
    if (!prose.has(next) || lines[next].trim() === "") return null;
    if (lines[next].includes("]]")) return next;
  }
  return null;
}

function chunkLines(lines: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < lines.length; index += size) {
    chunks.push(lines.slice(index, index + size));
  }
  return chunks;
}

function renderLines(lines: string[]): string {
  return lines.join("\n");
}

function quoteYamlString(value: unknown): string {
  return JSON.stringify(String(value).replace(/\r?\n/g, " "));
}

function isGeneratedShard(rel: string): boolean {
  return /-shard-\d+\.md$/.test(rel);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateArchiveSource(frontmatter: any, text: string, rel: string): HealthIssue[] {
  if (!isActiveDoc(rel)) return [];
  if (!isReplacementLike(frontmatter)) return [];
  if (hasArchiveSource(frontmatter, text)) return [];
  return [{ code: "archive-source", path: rel, detail: "replacement/compaction needs archive_source or archive link" }];
}

function validateSummarySource(frontmatter: any, text: string, rel: string): HealthIssue[] {
  if (!/(^|\/)(specs|plans)\//.test(rel)) return [];
  if (!isReplacementLike(frontmatter) && !/^##\s+(Summary|Resumen)\b/im.test(text)) return [];
  if (hasArchiveSource(frontmatter, text) || /(^|\/)\d{2}-[^/\n]+\.md\b/.test(text)) return [];
  return [{ code: "summary-source", path: rel, detail: "summary-like spec/plan should link source, shard, or archive" }];
}

// PKM-AI ADR 0002: validate the optional `lifecycle:` field against the allowed states (catches typos).
// Opt-in — absent `lifecycle:` is not an error, so this adds zero failures to the existing corpus.
function validateLifecycle(frontmatter: any, rel: string): HealthIssue[] {
  if (!Object.hasOwn(frontmatter, "lifecycle")) return [];
  const value = frontmatter.lifecycle;
  if (typeof value === "string" && LIFECYCLE_STATES.has(value)) return [];
  return [{ code: "lifecycle-state", path: rel, detail: `lifecycle must be one of ${[...LIFECYCLE_STATES].join("/")}; got ${JSON.stringify(value)}` }];
}

// PKM-AI ADR 0002: flag (WARN, not FAIL) `lifecycle: active` docs untouched past the stale threshold so
// a curation pass can demote them to deferred/superseded/archived. Only fires on the opt-in field.
function validateStaleActive(frontmatter: any, rel: string, now: string, staleActiveDays: number): HealthIssue[] {
  if (frontmatter.lifecycle !== "active") return [];
  const updated = frontmatter.updated;
  if (typeof updated !== "string") return [];
  const ageMs = Date.parse(now) - Date.parse(updated);
  if (!Number.isFinite(ageMs)) return [];
  const ageDays = ageMs / 86400000;
  if (ageDays <= staleActiveDays) return [];
  return [{ code: "stale-active", path: rel, detail: `lifecycle:active untouched ${Math.floor(ageDays)}d (> ${staleActiveDays}d) — review or demote` }];
}

// Routing surfaces are the docs an agent is expected to OBEY (policies, the start router).
// Only these get the tool-path check, so historical sessions/specs/ADRs that legitimately
// quote old `.mjs` commands do not flood the report. Guards against D2 (2026-07-28 audit):
// the tools migrated `.mjs` -> `.ts`, and a stale routing path makes an agent run a
// non-existent command and silently fall back to grep.
function isRoutingSurface(rel: string): boolean {
  return rel.startsWith(".agents/docs/architecture/policies/") || rel === ".agents/docs/start.md";
}

function validateToolPaths(root: string, text: string, rel: string): HealthIssue[] {
  if (!isRoutingSurface(rel)) return [];
  const issues: HealthIssue[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(/tools\/pkm-ai\/([\w-]+)\.(mjs|ts)/g)) {
    const ref = `${match[1]}.${match[2]}`;
    if (seen.has(ref)) continue;
    seen.add(ref);
    if (fs.existsSync(path.join(root, ".agents", "tools", "pkm-ai", ref))) continue;
    const alt = match[2] === "mjs" ? `${match[1]}.ts` : `${match[1]}.mjs`;
    const hint = fs.existsSync(path.join(root, ".agents", "tools", "pkm-ai", alt))
      ? ` — did you mean ${alt}?`
      : "";
    issues.push({ code: "tool-path-missing", path: rel, detail: `tools/pkm-ai/${ref} does not resolve${hint}` });
  }
  return issues;
}

function validateGlossaryCandidates(frontmatter: any, rel: string, terms: Set<string>): HealthIssue[] {
  const candidates = Array.isArray(frontmatter.glossary_candidates) ? frontmatter.glossary_candidates : [];
  return candidates
    .filter((candidate: unknown) => !terms.has(normalizeGlossaryTerm(candidate)))
    .map((candidate: unknown) => ({ code: "glossary-unknown", path: rel, detail: String(candidate) }));
}

function isActiveDoc(rel: string): boolean {
  return rel.startsWith(".agents/docs/") && !rel.startsWith(".agents/docs/archive/");
}

function isReplacementLike(frontmatter: any): boolean {
  return Boolean(
    frontmatter.compacted === true ||
      frontmatter.summary === true ||
      frontmatter.replaces ||
      frontmatter.summary_of ||
      frontmatter.compacted_from,
  );
}

function hasArchiveSource(frontmatter: any, text: string): boolean {
  return Boolean(
    frontmatter.archive_source ||
      frontmatter.source_record ||
      frontmatter.shard_source ||
      /\.agents\/docs\/archive\//.test(text),
  );
}
