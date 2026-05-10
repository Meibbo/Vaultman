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

  for (const key of ["created", "updated"]) {
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
    initiative: frontmatter.initiative ?? "",
    id: frontmatter.id ?? "",
    tags: normalizeTags(frontmatter.tags),
    updated: frontmatter.updated ?? "",
  };
}

export function titleFromPath(filePath) {
  return path.basename(filePath, ".md").replace(/[-_]+/g, " ");
}

export function buildIndex(root = process.cwd(), options = {}) {
  return listMarkdownFiles(root, DOCS_ROOT, options).map((file) => {
    const rel = relativePath(root, file);
    return buildDocEntry(rel, readMarkdown(file).frontmatter);
  });
}

export function parseArgs(argv) {
  const filters = {};
  const terms = [];
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      json = true;
    } else if (["--type", "--status", "--initiative", "--id", "--tag"].includes(arg)) {
      filters[arg.slice(2)] = argv[index + 1] ?? "";
      index += 1;
    } else {
      terms.push(arg);
    }
  }
  return { filters, json, search: terms.join(" ").trim() };
}

export function filterEntries(entries, filters = {}, search = "") {
  const lowered = search.toLowerCase();
  const searchTokens = tokenizeSearch(search);
  return entries.filter((entry) => {
    for (const [key, value] of Object.entries(filters)) {
      if (key === "tag") {
        if (!entry.tags.includes(value)) return false;
      } else if ((entry[key] ?? "") !== value) {
        return false;
      }
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
