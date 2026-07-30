import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const DOCS_ROOT = ".agents/docs";
export const CACHE_PATH = ".agents/cache/search-index.json";

export function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

export function relativePath(root, filePath) {
  return toPosixPath(path.relative(root, filePath));
}

export function parseMarkdown(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    return { frontmatter: {}, body: markdown, rawFrontmatter: "" };
  }

  const rawFrontmatter = match[1];
  const body = markdown.slice(match[0].length);
  const frontmatter = yaml.load(rawFrontmatter, { schema: yaml.JSON_SCHEMA }) ?? {};
  return { frontmatter, body, rawFrontmatter };
}

export function readMarkdown(filePath) {
  return parseMarkdown(fs.readFileSync(filePath, "utf8"));
}

// Health-failure code for frontmatter that is not valid YAML. Same vocabulary as check-doc-health,
// so the index build and the health check name the same defect the same way.
export const FRONTMATTER_YAML_CODE = "frontmatter-yaml";

// A single malformed doc must not take down a whole-corpus build. Before this, one unquoted colon
// in a `title:` (2026-07-29) made js-yaml throw out of parseMarkdown, index-docs died on the
// unhandled exception, and no index was written at all — every agent then queried a stale cache.
// Callers get {parsed} or {failure} with the check-doc-health {code, path, detail} shape, so they
// can skip the offending file and report it.
export function tryParseMarkdown(markdown, filePath) {
  try {
    return { parsed: parseMarkdown(markdown) };
  } catch (error) {
    return { failure: { code: FRONTMATTER_YAML_CODE, path: filePath, detail: frontmatterYamlDetail(error) } };
  }
}

export function tryReadMarkdown(filePath, reportedPath = filePath) {
  return tryParseMarkdown(fs.readFileSync(filePath, "utf8"), reportedPath);
}

// js-yaml's `message` embeds a multi-line source snippet; a health failure is one line per file.
// Keep the reason and translate the mark to the FILE's coordinates: the frontmatter block starts
// after the opening `---`, so its line 1 is the file's line 2.
function frontmatterYamlDetail(error) {
  const reason = String(error?.reason ?? error?.message ?? error).split("\n")[0];
  const line = error?.mark?.line;
  if (!Number.isInteger(line)) return reason;
  return `${reason} (line ${line + 2}, column ${(error.mark.column ?? 0) + 1})`;
}

export function listMarkdownFiles(root = process.cwd(), docsRoot = DOCS_ROOT, options = {}) {
  const base = path.resolve(root, docsRoot);
  if (!fs.existsSync(base)) return [];

  const excludeArchiveRaw = options.excludeArchiveRaw ?? false;
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const rel = relativePath(root, fullPath);
      if (entry.isDirectory()) {
        if (options.excludeArchive && /(^|\/)archive(\/|$)/.test(rel)) continue;
        if (excludeArchiveRaw && /(^|\/)archive\/.*\/raw(\/|$)/.test(rel)) continue;
        if (options.excludeTemplates && /(^|\/)templates(\/|$)/.test(rel)) continue;
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  walk(base);
  return files.sort((a, b) => relativePath(root, a).localeCompare(relativePath(root, b)));
}

export function lineCount(text) {
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}

export function validateFrontmatter(frontmatter, filePath) {
  const failures = [];
  const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:?\d{2})$/;
  const parentPattern = /^\[\[[^|\]]+\|[^\]]+\]\]$/;

  // `dateCreated`/`dateUpdated` is the vault-wide norm (2026-07-29, dev): it matches the global
  // properties the dev uses across their Obsidian notes. `created`/`updated` stay accepted so the
  // ~1030 not-yet-migrated docs keep validating.
  for (const key of ["created", "updated", "dateCreated", "dateUpdated"]) {
    const value = frontmatter[key];
    if (typeof value === "string" && timestampPattern.test(value)) {
      failures.push({ code: "timestamp-offset", path: filePath, detail: `${key}: ${value}` });
    }
  }

  if (Object.hasOwn(frontmatter, "parent_path")) {
    failures.push({ code: "parent-path", path: filePath, detail: "parent_path is forbidden" });
  }

  if (Object.hasOwn(frontmatter, "parent")) {
    const parent = frontmatter.parent;
    if (typeof parent !== "string" || !parentPattern.test(parent)) {
      failures.push({ code: "parent-shape", path: filePath, detail: "parent must be [[path|alias]]" });
    }
  }

  return failures;
}

export function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === "string") return [tags];
  return [];
}

export function buildDocEntry(filePath, frontmatter) {
  return {
    path: filePath,
    title: frontmatter.title ?? titleFromPath(filePath),
    type: frontmatter.type ?? "",
    status: frontmatter.status ?? "",
    // `lifecycle` (ADR 0002) is the curation state, parallel to `status`. Indexed so it is
    // queryable and not just weighted by the ranking modes (2026-07-28 audit, S2).
    lifecycle: frontmatter.lifecycle ?? "",
    initiative: frontmatter.initiative ?? "",
    id: frontmatter.id ?? "",
    parent: frontmatter.parent ?? "",
    tags: normalizeTags(frontmatter.tags),
    // Index field names stay `created`/`updated` so --since/--until, stale-active, and the
    // retrieval channel keep one internal contract; only the frontmatter READ accepts both the
    // `dateCreated`/`dateUpdated` vault norm and the legacy keys.
    created: frontmatter.dateCreated ?? frontmatter.created ?? "",
    updated: frontmatter.dateUpdated ?? frontmatter.updated ?? "",
    updated_by: frontmatter.updated_by ?? "",
  };
}

export function titleFromPath(filePath) {
  return path.basename(filePath, ".md").replace(/[-_]+/g, " ");
}

// Docs whose frontmatter does not parse are skipped, not fatal: `options.onFailure` receives one
// {code, path, detail} per skipped doc so the caller can report it while the index still covers
// every doc that does parse.
export function buildIndex(root = process.cwd(), options = {}) {
  const entries = [];
  for (const file of listMarkdownFiles(root, DOCS_ROOT, options)) {
    const rel = relativePath(root, file);
    const { parsed, failure } = tryReadMarkdown(file, rel);
    if (failure) {
      options.onFailure?.(failure);
      continue;
    }
    entries.push(buildDocEntry(rel, parsed.frontmatter));
  }
  return entries;
}

export const BOOLEAN_FLAGS = ["--json", "--refresh", "--strict", "--open", "--closed"];

// The corpus spells each workflow state several ways (2026-07-28 census: 31 distinct
// `status` values, "closed" written six ways). Exact-match filtering therefore lies by
// omission. These groups are the query-side normalization; document curation is separate
// work. Canonical copy of this mapping: docs/architecture/policies/docs.md.
export const CLOSED_STATUSES = ["completed", "complete", "done", "closed", "released", "passed"];
export const INACTIVE_STATUSES = ["archived", "superseded", "historical"];
// Values known to be open. Anything unrecognized is treated as open and reported, so
// vocabulary drift surfaces instead of silently dropping documents.
export const OPEN_STATUSES = [
  "active", "draft", "draft-living", "approved-draft", "approved", "accepted",
  "needs-triage", "triaged", "in-progress", "pending", "pending-hitl", "open",
  "todo", "ready", "ready-for-review", "verify", "deferred", "partial",
  "handed-off", "resolved-pending-adr", "reference", "vision-captured",
];

export function statusGroup(status) {
  const value = String(status ?? "").trim().toLowerCase();
  if (!value) return "empty";
  if (CLOSED_STATUSES.includes(value)) return "closed";
  if (INACTIVE_STATUSES.includes(value)) return "inactive";
  if (OPEN_STATUSES.includes(value)) return "open";
  return "unknown";
}

// Unknown values are grouped with open (a doc is not closed until it says so), but the
// caller is told which spellings it did not recognize.
export function selectByStatusGroup(entries, group) {
  return entries.filter((entry) => {
    const actual = statusGroup(entry.status);
    return group === "open" ? actual === "open" || actual === "unknown" : actual === group;
  });
}

export function unrecognizedStatuses(entries) {
  const counts = new Map();
  for (const entry of entries) {
    if (statusGroup(entry.status) !== "unknown") continue;
    const value = String(entry.status).trim();
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([status, count]) => ({ status, count }));
}

export const VALUE_FILTERS = ["--type", "--status", "--initiative", "--id", "--tag", "--lifecycle", "--parent"];

export function parseArgs(argv) {
  const filters = {};
  const negations = [];
  const terms = [];
  const flags = { json: false, refresh: false, strict: false, open: false, closed: false };
  let since = "";
  let until = "";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (BOOLEAN_FLAGS.includes(arg)) {
      flags[arg.slice(2)] = true;
    } else if (VALUE_FILTERS.includes(arg)) {
      filters[arg.slice(2)] = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--since") {
      since = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--until") {
      until = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--not") {
      // --not field=value, repeatable. Excludes entries whose field equals value.
      const [field, ...rest] = String(argv[index + 1] ?? "").split("=");
      if (field && rest.length > 0) negations.push({ field, value: rest.join("=") });
      index += 1;
    } else {
      terms.push(arg);
    }
  }
  return { filters, negations, since, until, ...flags, search: terms.join(" ").trim() };
}

// Compare a cache against the docs tree it claims to describe. Two independent
// staleness signals: docs modified after the cache was generated (the index is
// behind), and cached paths that are no longer on disk (docs were moved or
// deleted behind the index — the 2026-07-28 Drive-move failure mode).
export function assessCacheFreshness(root, cache, options = {}) {
  const generatedAt = Date.parse(cache?.generated_at ?? "");
  const files = listMarkdownFiles(root, DOCS_ROOT, options);
  const onDisk = new Set(files.map((file) => relativePath(root, file)));

  let newerCount = 0;
  let newest = null;
  if (Number.isFinite(generatedAt)) {
    for (const file of files) {
      const mtime = fs.statSync(file).mtimeMs;
      if (mtime <= generatedAt) continue;
      newerCount += 1;
      if (!newest || mtime > newest.mtime) newest = { path: relativePath(root, file), mtime };
    }
  }

  const cached = Array.isArray(cache?.entries) ? cache.entries : [];
  const missing = cached.map((entry) => entry.path).filter((entryPath) => !onDisk.has(entryPath));

  return {
    stale: newerCount > 0 || missing.length > 0,
    generatedAt: cache?.generated_at ?? "",
    newerCount,
    newestPath: newest?.path ?? "",
    missing,
  };
}

export function formatFreshnessWarning(report, { refreshHint = "--refresh" } = {}) {
  const parts = [];
  if (report.newerCount > 0) {
    const noun = report.newerCount === 1 ? "doc" : "docs";
    parts.push(`${report.newerCount} ${noun} newer than the cache (newest: ${report.newestPath})`);
  }
  if (report.missing.length > 0) {
    const noun = report.missing.length === 1 ? "path" : "paths";
    const sample = report.missing.slice(0, 3).join(", ");
    const more = report.missing.length > 3 ? `, +${report.missing.length - 3} more` : "";
    parts.push(`${report.missing.length} missing ${noun} no longer on disk (${sample}${more})`);
  }
  return [
    `query-docs: stale index (generated ${report.generatedAt || "unknown"}) — ${parts.join("; ")}.`,
    `Results may be incomplete or wrong. Re-run with ${refreshHint}, or rebuild both caches with`,
    `node .agents/tools/pkm-ai/index-docs.ts`,
  ].join("\n");
}

export function filterEntries(entries, filters = {}, search = "", options = {}) {
  const lowered = search.toLowerCase();
  const searchTokens = tokenizeSearch(search);
  const { negations = [], since = "", until = "" } = options;
  const sinceMs = since ? Date.parse(since) : NaN;
  const untilMs = until ? Date.parse(until) : NaN;
  return entries.filter((entry) => {
    for (const [key, value] of Object.entries(filters)) {
      // A comma list is an OR: --status completed,done matches either.
      const accepted = String(value).split(",").map((part) => part.trim()).filter(Boolean);
      if (accepted.length === 0) accepted.push("");
      if (key === "tag") {
        if (!accepted.some((tag) => entry.tags.includes(tag))) return false;
      } else if (key === "initiative") {
        // Fall back to the initiative/<x> tag: most issue docs carry the initiative as a
        // tag, not a frontmatter key, so the bare key filter matched almost nothing (S3).
        const ok = accepted.some(
          (name) => String(entry.initiative ?? "") === name || entry.tags.includes(`initiative/${name}`),
        );
        if (!ok) return false;
      } else if (key === "parent") {
        // Substring match on the parent wikilink, so an issue-set index path scopes to its children.
        if (!accepted.some((needle) => String(entry.parent ?? "").includes(needle))) return false;
      } else if (!accepted.includes(String(entry[key] ?? ""))) {
        return false;
      }
    }

    for (const { field, value } of negations) {
      if (field === "tag" ? entry.tags.includes(value) : String(entry[field] ?? "") === value) return false;
    }

    if (Number.isFinite(sinceMs) || Number.isFinite(untilMs)) {
      const updatedMs = Date.parse(entry.updated ?? "");
      if (!Number.isFinite(updatedMs)) return false;
      if (Number.isFinite(sinceMs) && updatedMs < sinceMs) return false;
      if (Number.isFinite(untilMs) && updatedMs > untilMs + 86399999) return false;
    }

    if (!lowered) return true;
    const haystack = [entry.id, entry.title, entry.type, entry.status, entry.initiative, entry.path]
      .join(" ")
      .toLowerCase();
    if (haystack.includes(lowered)) return true;
    const haystackTokens = tokenizeSearch(haystack);
    return searchTokens.every((token) => haystackTokens.includes(token));
  });
}

function tokenizeSearch(value) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}

export function formatRows(rows) {
  if (rows.length === 0) return "No docs found.";
  const headers = ["id", "title", "type", "status", "initiative", "path"];
  const widths = headers.map((header) =>
    Math.min(
      40,
      Math.max(header.length, ...rows.map((row) => String(row[header] ?? "").length)),
    ),
  );
  const format = (row) =>
    headers
      .map((header, index) => String(row[header] ?? "").slice(0, widths[index]).padEnd(widths[index]))
      .join("  ")
      .trimEnd();
  return [format(Object.fromEntries(headers.map((header) => [header, header]))), ...rows.map(format)].join("\n");
}
