#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { parseMarkdown, titleFromPath, toPosixPath } from "./lib/frontmatter.mjs";

const args = parseArgs(process.argv.slice(2));

if (!args.file) {
  console.error("Usage: node split-shard.mjs --file .agents/docs/path/shard.md [--max-lines 300] [--write] [--now YYYY-MM-DDTHH:mm:ss]");
  process.exit(2);
}

const root = process.cwd();
const targetRel = toPosixPath(args.file);
const targetAbs = path.resolve(root, targetRel);

if (!fs.existsSync(targetAbs)) {
  console.error(`split-shard: file not found: ${targetRel}`);
  process.exit(1);
}

const plan = planSplit(root, targetRel, {
  maxLines: args.maxLines,
  now: args.now,
});

printPlan(plan, { write: args.write });

if (args.write) {
  writePlan(root, plan);
}

function parseArgs(argv) {
  const parsed = {
    file: "",
    maxLines: 300,
    now: new Date().toISOString().slice(0, 19),
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") {
      parsed.file = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--max-lines") {
      parsed.maxLines = Number.parseInt(argv[index + 1] ?? "", 10);
      index += 1;
    } else if (arg === "--now") {
      parsed.now = argv[index + 1] ?? parsed.now;
      index += 1;
    } else if (arg === "--write") {
      parsed.write = true;
    }
  }

  if (!Number.isInteger(parsed.maxLines) || parsed.maxLines < 30) {
    throw new Error("--max-lines must be an integer >= 30");
  }

  return parsed;
}

function planSplit(rootDir, rel, { maxLines, now }) {
  const abs = path.resolve(rootDir, rel);
  const sourceText = fs.readFileSync(abs, "utf8");
  const markdown = parseMarkdown(sourceText);
  const partInfo = parsePartPath(rel);
  const sourceRel = partInfo.sourceRel;
  const baseRel = partInfo.baseRel;
  const startPart = partInfo.part ?? 1;
  const sourceTitle = cleanPartTitle(String(markdown.frontmatter.title ?? titleFromPath(baseRel)));
  const sourceWiki = wikiLink(baseRel, sourceTitle);
  const bodyLines = contentLinesForSplit(markdown, partInfo, sourceTitle);

  const existingBefore = listExistingParts(rootDir, baseRel).filter((part) => part.number < startPart);
  const totalParts = startPart - 1 + chunkCountFor(bodyLines, {
    baseRel,
    maxLines,
    now,
    sourceRel,
    sourceTitle,
    sourceWiki,
    startPart,
    totalParts: startPart,
  });

  const chunks = chunkBody(bodyLines, {
    baseRel,
    maxLines,
    now,
    sourceRel,
    sourceTitle,
    sourceWiki,
    startPart,
    totalParts,
  });

  const parts = chunks.map((body, index) => {
    const number = startPart + index;
    return {
      body,
      number,
      rel: partRelFor(baseRel, number),
      text: renderPart({
        baseRel,
        body,
        maxLines,
        now,
        number,
        sourceRel,
        sourceTitle,
        sourceWiki,
        totalParts,
      }),
    };
  });

  return {
    baseRel,
    existingBefore,
    inputIsPart: partInfo.part !== null,
    maxLines,
    now,
    parts,
    sourceRel,
    sourceTitle,
    targetRel: rel,
    totalParts,
    writeManifest: partInfo.part === null,
    manifestText:
      partInfo.part === null
        ? renderManifest({
            baseRel,
            maxLines,
            now,
            parts,
            sourceTitle,
            sourceText,
            totalParts,
          })
        : null,
  };
}

function parsePartPath(rel) {
  const parsed = path.posix.parse(rel);
  const match = parsed.name.match(/^(.*)-part-(\d+)$/);
  if (!match) {
    return { baseRel: rel, sourceRel: rel, part: null };
  }
  const baseRel = path.posix.join(parsed.dir, `${match[1]}${parsed.ext}`);
  return {
    baseRel,
    sourceRel: baseRel,
    part: Number.parseInt(match[2], 10),
  };
}

function cleanPartTitle(title) {
  return title.replace(/\s+-\s+part\s+\d+$/i, "").trim();
}

function contentLinesForSplit(markdown, partInfo, sourceTitle) {
  const lines = splitLines(markdown.body);
  if (partInfo.part === null) return lines;
  return stripContinuationWrapper(lines, {
    part: partInfo.part,
    sourceTitle,
  });
}

function stripContinuationWrapper(lines, { part, sourceTitle }) {
  let start = 0;
  let end = lines.length;
  let cursor = 0;

  while (cursor < lines.length && lines[cursor] === "") cursor += 1;

  const heading = lines[cursor] ?? "";
  const exactHeading = new RegExp(`^#\\s+${escapeRegExp(sourceTitle)}\\s+-\\s+part\\s+${padPart(part)}$`, "i");
  const generatedHeading = /^#\s+.+\s+-\s+part\s+\d+$/i;

  if (exactHeading.test(heading) || generatedHeading.test(heading)) {
    cursor += 1;
    if (lines[cursor] === "") cursor += 1;
    while (isGeneratedTopNavLine(lines[cursor] ?? "")) cursor += 1;
    if (lines[cursor] === "") cursor += 1;
    start = cursor;
  }

  let trimEnd = lines.length;
  while (trimEnd > start && lines[trimEnd - 1] === "") trimEnd -= 1;

  let footerStart = trimEnd;
  while (footerStart > start && isGeneratedFooterNavLine(lines[footerStart - 1] ?? "")) {
    footerStart -= 1;
  }

  if (footerStart > start && footerStart < trimEnd && lines[footerStart - 1] === "---") {
    end = footerStart - 1;
    while (end > start && lines[end - 1] === "") end -= 1;
  }

  return lines.slice(start, end);
}

function isGeneratedTopNavLine(line) {
  return (
    /^>\s+Parte\s+\d+\s+de\s+\d+\.$/i.test(line) ||
    /^>\s+Viene de \[\[.+\]\]\.$/i.test(line) ||
    /^>\s+Contin[uú]a en \[\[.+\]\]\.$/i.test(line)
  );
}

function isGeneratedFooterNavLine(line) {
  return (
    /^Viene de \[\[.+\]\]\.$/i.test(line) ||
    /^Contin[uú]a en \[\[.+\]\]\.$/i.test(line)
  );
}

function listExistingParts(rootDir, baseRel) {
  const parsed = path.posix.parse(baseRel);
  const dirAbs = path.resolve(rootDir, parsed.dir);
  if (!fs.existsSync(dirAbs)) return [];
  const pattern = new RegExp(`^${escapeRegExp(parsed.name)}-part-(\\d+)${escapeRegExp(parsed.ext)}$`);
  return fs
    .readdirSync(dirAbs, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const match = entry.name.match(pattern);
      if (!match) return null;
      return {
        number: Number.parseInt(match[1], 10),
        rel: path.posix.join(parsed.dir, entry.name),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.number - b.number);
}

function chunkCountFor(bodyLines, options) {
  return chunkBody(bodyLines, options).length;
}

function chunkBody(bodyLines, options) {
  const chunks = [];
  let cursor = 0;
  while (cursor < bodyLines.length) {
    const number = options.startPart + chunks.length;
    const budget = partBodyBudget({ ...options, number, totalParts: Number.MAX_SAFE_INTEGER });
    if (budget < 1) {
      throw new Error(`split-shard: --max-lines ${options.maxLines} leaves no room for body lines`);
    }
    chunks.push(bodyLines.slice(cursor, cursor + budget));
    cursor += budget;
  }
  return chunks.length > 0 ? chunks : [[]];
}

function partBodyBudget(options) {
  const prefix = partPrefixLines(options);
  const footer = partFooterLines(options);
  return options.maxLines - prefix.length - footer.length - 1;
}

function renderPart(options) {
  return renderLines([...partPrefixLines(options), ...options.body, ...partFooterLines(options)]);
}

function partPrefixLines({ baseRel, now, number, sourceRel, sourceTitle, sourceWiki, totalParts }) {
  const previousRel = number > 1 ? partRelFor(baseRel, number - 1) : null;
  const nextRel = number < totalParts ? partRelFor(baseRel, number + 1) : null;
  return [
    "---",
    `title: ${quoteYaml(`${sourceTitle} - part ${padPart(number)}`)}`,
    "type: continuation-shard",
    "status: active",
    `parent: ${quoteYaml(sourceWiki)}`,
    `shard_source: ${quoteYaml(sourceRel)}`,
    `shard_of: ${quoteYaml(sourceWiki)}`,
    `shard_part: ${number}`,
    `created: ${now}`,
    `updated: ${now}`,
    "tags:",
    "  - agent/shard",
    "created_by: codex-gpt-5",
    "updated_by: codex-gpt-5",
    "---",
    "",
    `# ${sourceTitle} - part ${padPart(number)}`,
    "",
    `> Parte ${number} de ${totalParts}.`,
    ...(previousRel ? [`> Viene de [[${wikiPath(previousRel)}|parte ${padPart(number - 1)}]].`] : []),
    ...(nextRel ? [`> Continua en [[${wikiPath(nextRel)}|parte ${padPart(number + 1)}]].`] : []),
    "",
  ];
}

function partFooterLines({ baseRel, number, totalParts }) {
  const lines = ["", "---"];
  if (number > 1) {
    lines.push(`Viene de [[${wikiPath(partRelFor(baseRel, number - 1))}|parte ${padPart(number - 1)}]].`);
  }
  if (number < totalParts) {
    lines.push(`Continua en [[${wikiPath(partRelFor(baseRel, number + 1))}|parte ${padPart(number + 1)}]].`);
  }
  return lines;
}

function renderManifest({ baseRel, now, parts, sourceTitle, sourceText, totalParts }) {
  const parsed = parseMarkdown(sourceText);
  const frontmatter = {
    ...parsed.frontmatter,
    title: sourceTitle,
    type: `${String(parsed.frontmatter.type ?? "research-shard")}-index`,
    status: parsed.frontmatter.status ?? "active",
    updated: now,
    summary: true,
    compacted: true,
  };
  const links = parts.map((part) => `- [[${wikiPath(part.rel)}|parte ${padPart(part.number)}]]`);
  return `---\n${yaml.dump(frontmatter, { schema: yaml.JSON_SCHEMA })}---\n\n# ${sourceTitle}\n\nThis shard was mechanically split into ${totalParts} continuation parts.\n\n## Parts\n\n${links.join("\n")}\n`;
}

function writePlan(rootDir, plan) {
  if (plan.writeManifest && plan.manifestText) {
    fs.writeFileSync(path.resolve(rootDir, plan.baseRel), plan.manifestText);
  }

  removeGeneratedPartsFrom(rootDir, plan.baseRel, plan.parts[0]?.number ?? 1);

  for (const part of plan.parts) {
    const abs = path.resolve(rootDir, part.rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, part.text);
  }
}

function removeGeneratedPartsFrom(rootDir, baseRel, startNumber) {
  for (const part of listExistingParts(rootDir, baseRel)) {
    if (part.number < startNumber) continue;
    fs.unlinkSync(path.resolve(rootDir, part.rel));
  }
}

function printPlan(plan, { write }) {
  console.log(`${write ? "WROTE" : "DRY RUN"} split-shard ${plan.targetRel}`);
  console.log(`base\t${plan.baseRel}`);
  console.log(`max-lines\t${plan.maxLines}`);
  console.log(`parts\t${plan.parts.length}`);
  for (const part of plan.parts) {
    console.log(`${part.rel}\t${lineCount(part.text)} lines`);
  }
}

function partRelFor(baseRel, number) {
  const parsed = path.posix.parse(baseRel);
  return path.posix.join(parsed.dir, `${parsed.name}-part-${padPart(number)}${parsed.ext}`);
}

function wikiLink(rel, alias) {
  return `[[${wikiPath(rel)}|${alias}]]`;
}

function wikiPath(rel) {
  return rel.replace(/^\.agents\//, "").replace(/\.md$/i, "");
}

function padPart(number) {
  return String(number).padStart(2, "0");
}

function quoteYaml(value) {
  return JSON.stringify(String(value));
}

function splitLines(text) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function renderLines(lines) {
  return `${lines.join("\n").replace(/\s+$/u, "")}\n`;
}

function lineCount(text) {
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
