#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { listMarkdownFiles, parseMarkdown, relativePath, toPosixPath } from "./lib/frontmatter.mjs";

interface ParsedArgs {
  all: boolean;
  now: string | undefined;
  paths: string[];
}

const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/update-frontmatter.ts [--all] [--now YYYY-MM-DDTHH:mm:ss] [path ...]

Updates created/updated timestamps in active .agents/docs Markdown files.
Use explicit paths for touched docs, or --all for every active doc. Archive raw
files and templates are skipped by --all.`);
  process.exit(0);
}

try {
  const root = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const timestamp = args.now ?? formatLocalTimestamp(new Date());
  assertTimestamp(timestamp);
  const files = resolveFiles(root, args);
  let changed = 0;

  for (const file of files) {
    if (updateFile(file, timestamp)) changed += 1;
  }

  console.log(`updated ${changed}/${files.length} frontmatter file(s)`);
} catch (error) {
  console.error(`update-frontmatter: ${(error as Error).message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { all: false, now: undefined, paths: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") {
      args.all = true;
    } else if (arg === "--now") {
      args.now = argv[index + 1];
      index += 1;
      if (!args.now) throw new Error("--now requires a timestamp value");
    } else if (arg.startsWith("--")) {
      throw new Error(`unknown option: ${arg}`);
    } else {
      args.paths.push(arg);
    }
  }

  if (!args.all && args.paths.length === 0) {
    throw new Error("provide at least one Markdown path or use --all");
  }

  return args;
}

function resolveFiles(root: string, args: ParsedArgs): string[] {
  const files = args.all
    ? listMarkdownFiles(root, ".agents/docs", { excludeArchive: true, excludeTemplates: true })
    : args.paths.map((filePath) => resolveDocPath(root, filePath));
  return [...new Set<string>(files)].sort((a, b) => relativePath(root, a).localeCompare(relativePath(root, b)));
}

function resolveDocPath(root: string, filePath: string): string {
  const fullPath = path.resolve(root, filePath);
  const rel = toPosixPath(path.relative(path.resolve(root, ".agents/docs"), fullPath));
  if (rel.startsWith("../") || rel === ".." || path.isAbsolute(rel)) {
    throw new Error(`path is outside .agents/docs: ${filePath}`);
  }
  if (!filePath.endsWith(".md")) {
    throw new Error(`path is not Markdown: ${filePath}`);
  }
  if (/(^|\/)archive\/.*\/raw(\/|$)/.test(toPosixPath(path.relative(root, fullPath)))) {
    throw new Error(`path is an archive raw file: ${filePath}`);
  }
  if (!fs.existsSync(fullPath)) {
    throw new Error(`path does not exist: ${filePath}`);
  }
  return fullPath;
}

function updateFile(file: string, timestamp: string): boolean {
  const current = fs.readFileSync(file, "utf8");
  const next = rewriteFrontmatter(current, timestamp);
  if (next === current) return false;
  fs.writeFileSync(file, next);
  return true;
}

function rewriteFrontmatter(markdown: string, timestamp: string): string {
  const parsed = parseMarkdown(markdown);
  if (!parsed.rawFrontmatter) {
    const body = markdown.startsWith("\n") ? markdown : `\n${markdown}`;
    return `---\ncreated: ${timestamp}\nupdated: ${timestamp}\n---\n${body}`;
  }

  const lines = parsed.rawFrontmatter.split(/\r?\n/);
  const createdIndex = findKey(lines, "created");
  let updatedIndex = findKey(lines, "updated");

  if (createdIndex === -1) {
    if (updatedIndex >= 0) {
      lines.splice(updatedIndex, 0, `created: ${timestamp}`);
      updatedIndex += 1;
    } else {
      lines.push(`created: ${timestamp}`);
    }
  }

  if (updatedIndex >= 0) {
    lines[updatedIndex] = `updated: ${timestamp}`;
  } else {
    const insertAfter = findKey(lines, "created");
    lines.splice(insertAfter >= 0 ? insertAfter + 1 : lines.length, 0, `updated: ${timestamp}`);
  }

  const bodySeparator = parsed.body.startsWith("\n") || parsed.body === "" ? "" : "\n";
  return `---\n${lines.join("\n")}\n---\n${bodySeparator}${parsed.body}`;
}

function findKey(lines: string[], key: string): number {
  return lines.findIndex((line) => line.startsWith(`${key}:`));
}

function assertTimestamp(timestamp: string): void {
  if (!TIMESTAMP_PATTERN.test(timestamp)) {
    throw new Error("timestamp must use YYYY-MM-DDTHH:mm:ss with no timezone offset");
  }
}

function formatLocalTimestamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
  ].join("");
}
