#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { listMarkdownFiles, parseMarkdown, relativePath, toPosixPath } from "./lib/frontmatter.mjs";

const HELP = `Usage: node .agents/tools/pkm-ai/manage-tasks.mjs [options]

Options:
  --file <path>           Target Markdown file to update or read.
  --status <status>       Update frontmatter status (todo, in-progress, done, blocked, etc.).
                          In retrieval modes, filter objective task status.
  --agent <name>          Update updated_by in frontmatter (codex, claude, etc.).
  --toggle <id|regex>     Toggle a task line. 
                          - IDs: [ ], [/], [x]
                          - Statuses: --todo, --progress, --done
  --complete-objective <slug>
                          Complete task tagged #pkm-ai/objective/<slug>.
  --list-objectives      List objective tasks from --file or --initiative.
  --get-objective <slug> Retrieve one objective task from --file or --initiative.
  --json                 Emit task retrieval results as JSON.
  --task-status <name>    Set task checkbox status by name.
                          Built-ins: todo, in-progress, done, cancelled,
                          on-hold, blocked, question.
  --task-status-symbol <symbol>
                          Set one custom Tasks status symbol directly.
  --priority <level>      Set Tasks priority emoji: highest, high, medium,
                          normal, low, lowest.
  --created <date>        Set Tasks created date: ➕ YYYY-MM-DD.
  --start <date>          Set Tasks start date: 🛫 YYYY-MM-DD.
  --scheduled <date>      Set Tasks scheduled date: ⏳ YYYY-MM-DD.
  --due <date>            Set Tasks due date: 📅 YYYY-MM-DD.
  --done-date <date>      Set Tasks done date: ✅ YYYY-MM-DD.
  --cancelled-date <date> Set Tasks cancelled date: ❌ YYYY-MM-DD.
  --repeat <rule>         Set Tasks recurrence: 🔁 <rule>.
  --task-id <id>          Set Tasks dependency id: 🆔 <id>.
  --depends-on <id>       Set Tasks dependency: ⛔ <id>.
  --on-completion <mode>  Set Tasks completion behavior: 🏁 <mode>.
  --close-when-all-done   Set frontmatter status: done if no open tasks remain.
  --now <timestamp>       Timestamp for deterministic updates.
  --complete-plan         Append '✅ YYYY-MM-DDTHH:mm:ss' to the end of the file.
  --create                Create a new file from a template.
  --template <name>       Template name (item, plan, spec).
  --title <title>         Title for the new file.
  --initiative <init>     Initiative name for the new file.
  --id <id>               ID for the new file (e.g. VM-0001).
  --parent <link>         Parent wikilink (e.g. [[docs/work/init/index|init]]).
  --filter <status>       Filter tasks from the file and print them (todo, progress, done).
  --help, -h              Show this help message.

Examples:
  node .agents/tools/pkm-ai/manage-tasks.mjs --file docs/work/init/plans/p.md --status done --complete-plan
  node .agents/tools/pkm-ai/manage-tasks.mjs --file docs/work/init/plans/p.md --toggle "Task A" --done
  node .agents/tools/pkm-ai/manage-tasks.mjs --file docs/work/init/plans/p.md --complete-objective task-a --agent codex --close-when-all-done
  node .agents/tools/pkm-ai/manage-tasks.mjs --list-objectives --initiative pkm-ai --status open --json
  node .agents/tools/pkm-ai/manage-tasks.mjs --create --template plan --title "Phase 2" --initiative hardening
`;

const TASK_STATUS_SYMBOLS = {
  todo: " ",
  open: " ",
  "in-progress": "/",
  progress: "/",
  started: "/",
  done: "x",
  complete: "x",
  completed: "x",
  cancelled: "-",
  canceled: "-",
  "on-hold": ">",
  hold: ">",
  blocked: "!",
  question: "?",
  planned: "?",
};

const CLOSED_TASK_SYMBOLS = new Set(["x", "X", "-"]);
const PRIORITY_SYMBOLS = {
  highest: "🔺",
  high: "⏫",
  medium: "🔼",
  normal: "",
  none: "",
  low: "🔽",
  lowest: "⏬",
};
const PRIORITY_NAMES = Object.fromEntries(Object.entries(PRIORITY_SYMBOLS).filter(([, symbol]) => symbol).map(([name, symbol]) => [symbol, name]));
const TASK_STATUS_NAMES = {
  " ": "todo",
  "/": "in-progress",
  x: "done",
  X: "done",
  "-": "cancelled",
  ">": "on-hold",
  "!": "blocked",
  "?": "question",
};

const PRIORITY_REGEX = /(?:^|\s)(🔺|⏫|🔼|🔽|⏬)(?=\s|$)/gu;
const ID_REGEX = /(?:^|\s)(🆔|⛔)\s+\S+(?=\s|$)/gu;
const ON_COMPLETION_REGEX = /(?:^|\s)🏁\s+\S+(?=\s|$)/gu;
const REPEAT_REGEX = /(?:^|\s)🔁\s+.*?(?=\s+(?:🔺|⏫|🔼|🔽|⏬|🛫|⏳|📅|➕|✅|❌|🆔|⛔|🏁)|$)/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

function formatLocalTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
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

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const val = argv[i + 1];
      if (val && !val.startsWith("--")) {
        args[key] = val;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || Object.keys(args).length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const now = args.now || formatLocalTimestamp(new Date());
  assertTimestamp(now);

  if (args.create) {
    handleCreate(args, now);
    return;
  }

  if (args.listObjectives || args.getObjective) {
    handleObjectiveRetrieval(args);
    return;
  }

  if (!args.file) {
    console.error("Error: --file is required for updates or filtering.");
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${args.file}`);
    process.exit(1);
  }

  let content = fs.readFileSync(filePath, "utf8");
  let { body, rawFrontmatter } = parseMarkdown(content);
  let changed = false;

  if (args.filter) {
    handleFilter(body, args.filter);
    return;
  }

  // Use line-based frontmatter update to preserve formatting
  let lines = rawFrontmatter ? rawFrontmatter.split(/\r?\n/) : [];
  
  if (args.status) {
    updateLine(lines, "status", args.status);
    changed = true;
  }
  if (args.agent) {
    updateLine(lines, "updated_by", args.agent);
    changed = true;
  }
  if (changed) {
    updateLine(lines, "updated", now);
  }

  const taskUpdate = buildTaskUpdate(args, now);
  if (args.toggle || args.completeObjective) {
    const result = updateTask(body, taskSelector(args), taskUpdate);
    if (!result.changed && args.completeObjective) {
      console.error(`Error: objective task not found: ${args.completeObjective}`);
      process.exit(1);
    }
    if (result.changed) {
      body = result.body;
      changed = true;
    }
  }

  if (args.closeWhenAllDone && noOpenTasksRemain(body)) {
    updateLine(lines, "status", "done");
    changed = true;
  }

  if (args.completePlan) {
    if (!body.includes("✅")) {
      body = body.trimEnd() + `\n\n✅ ${now}\n`;
      changed = true;
    }
  }

  if (changed) {
    updateLine(lines, "updated", now);
    const newContent = `---\n${lines.join("\n")}\n---\n${body}`;
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${args.file}`);
  } else {
    console.log(`No changes made to ${args.file}`);
  }
}

function handleObjectiveRetrieval(args) {
  const rows = collectObjectiveRows(process.cwd(), args);
  const filtered = filterObjectiveRows(rows, args);
  if (args.getObjective) {
    const found = filtered.find((row) => row.objective === args.getObjective);
    if (!found) {
      console.error(`Error: objective not found: ${args.getObjective}`);
      process.exit(1);
    }
    printRetrievalResult(found, args);
    return;
  }
  printRetrievalResult(filtered, args);
}

function collectObjectiveRows(root, args) {
  return resolveRetrievalFiles(root, args).flatMap((filePath) => {
    const text = fs.readFileSync(filePath, "utf8");
    const rel = relativePath(root, filePath);
    return extractObjectiveRows(text, rel);
  });
}

function resolveRetrievalFiles(root, args) {
  if (args.file) {
    const filePath = path.resolve(root, args.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${args.file}`);
      process.exit(1);
    }
    return [filePath];
  }
  if (args.initiative) {
    return listMarkdownFiles(root, `.agents/docs/work/${args.initiative}`, { excludeArchive: true });
  }
  return listMarkdownFiles(root, ".agents/docs/work", { excludeArchive: true });
}

function extractObjectiveRows(markdown, rel) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let inFence = false;
  return lines.flatMap((line, index) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return [];
      }
      if (inFence) return [];
      const task = parseObjectiveTaskLine(line);
      if (!task) return [];
      return [{ ...task, path: rel, line: index + 1 }];
    });
}

function parseObjectiveTaskLine(line) {
  const match = line.match(/^\s*[-*]\s+\[([^\]]?)\]\s+(.*)$/u);
  if (!match) return null;
  const objectiveMatch = match[2].match(/#pkm-ai\/objective\/([A-Za-z0-9._-]+)/u);
  if (!objectiveMatch) return null;
  const metadata = parseTaskMetadata(match[2]);
  return {
    objective: objectiveMatch[1],
    status: statusNameForSymbol(match[1]),
    symbol: match[1],
    description: stripTaskMetadata(match[2]).trim(),
    priority: metadata.priority,
    dueDate: metadata.due,
    scheduledDate: metadata.scheduled,
    startDate: metadata.start,
    createdDate: metadata.created,
    doneDate: metadata.done,
    cancelledDate: metadata.cancelled,
    recurrence: metadata.repeat,
    taskId: metadata.taskId,
    dependsOn: metadata.dependsOn,
    onCompletion: metadata.onCompletion,
  };
}

function parseTaskMetadata(text) {
  const metadata = {};
  const priority = text.match(PRIORITY_REGEX_FOR_READ);
  if (priority) metadata.priority = PRIORITY_NAMES[priority[1]] ?? "normal";
  for (const [key, emoji] of Object.entries(DATE_EMOJI_BY_KEY)) {
    const match = text.match(new RegExp(`${emoji}\\s+(\\d{4}-\\d{2}-\\d{2})`, "u"));
    if (match) metadata[key] = match[1];
  }
  const repeat = text.match(/🔁\s+(.+?)(?=\s+(?:🔺|⏫|🔼|🔽|⏬|🛫|⏳|📅|➕|✅|❌|🆔|⛔|🏁)|$)/u);
  if (repeat) metadata.repeat = repeat[1].trim();
  const taskId = text.match(/🆔\s+(\S+)/u);
  if (taskId) metadata.taskId = taskId[1];
  const dependsOn = text.match(/⛔\s+(\S+)/u);
  if (dependsOn) metadata.dependsOn = dependsOn[1];
  const onCompletion = text.match(/🏁\s+(\S+)/u);
  if (onCompletion) metadata.onCompletion = onCompletion[1];
  return metadata;
}

function stripTaskMetadata(text) {
  return text
    .replace(PRIORITY_REGEX, " ")
    .replace(/(?:^|\s)(📅|⏳|🛫|➕|✅|❌)\s+\d{4}-\d{2}-\d{2}(?=\s|$)/gu, " ")
    .replace(REPEAT_REGEX, " ")
    .replace(ID_REGEX, " ")
    .replace(ON_COMPLETION_REGEX, " ")
    .replace(/\s+/gu, " ");
}

const PRIORITY_REGEX_FOR_READ = /(🔺|⏫|🔼|🔽|⏬)/u;
const DATE_EMOJI_BY_KEY = {
  due: "📅",
  scheduled: "⏳",
  start: "🛫",
  created: "➕",
  done: "✅",
  cancelled: "❌",
};

function statusNameForSymbol(symbol) {
  return TASK_STATUS_NAMES[symbol] ?? "custom";
}

function filterObjectiveRows(rows, args) {
  const status = args.status ? String(args.status).toLowerCase() : "";
  if (!status) return rows;
  if (status === "open") return rows.filter((row) => !CLOSED_TASK_SYMBOLS.has(row.symbol));
  if (status === "closed") return rows.filter((row) => CLOSED_TASK_SYMBOLS.has(row.symbol));
  return rows.filter((row) => row.status === status);
}

function printRetrievalResult(value, args) {
  if (args.json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  const rows = Array.isArray(value) ? value : [value];
  console.log(rows.map((row) => `${row.status.padEnd(12)} ${row.objective} ${row.path}:${row.line}`).join("\n"));
}

function updateLine(lines, key, value) {
  const index = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (index >= 0) {
    lines[index] = `${key}: ${value}`;
  } else {
    lines.push(`${key}: ${value}`);
  }
}

function taskSelector(args) {
  if (args.completeObjective) {
    return { type: "text", value: `#pkm-ai/objective/${args.completeObjective}` };
  }
  return { type: "regex", value: args.toggle };
}

function buildTaskUpdate(args, now) {
  const status = taskStatusSymbol(args);
  return {
    status,
    metadata: {
      priority: normalizePriority(args.priority),
      repeat: args.repeat,
      start: validateDateArg(args.start, "start"),
      scheduled: validateDateArg(args.scheduled, "scheduled"),
      due: validateDateArg(args.due, "due"),
      created: validateDateArg(args.created, "created"),
      done: validateDateArg(args.doneDate, "done-date") || (args.completeObjective && status === "x" ? dateFromTimestamp(now) : undefined),
      cancelled: validateDateArg(args.cancelledDate, "cancelled-date"),
      taskId: args.taskId,
      dependsOn: args.dependsOn,
      onCompletion: args.onCompletion,
    },
  };
}

function taskStatusSymbol(args) {
  if (args.taskStatusSymbol !== undefined) {
    const symbol = String(args.taskStatusSymbol);
    if (symbol.length !== 1) throw new Error("--task-status-symbol must be exactly one character");
    return symbol;
  }
  if (args.taskStatus) {
    const symbol = TASK_STATUS_SYMBOLS[String(args.taskStatus).toLowerCase()];
    if (symbol === undefined) throw new Error(`unknown task status: ${args.taskStatus}`);
    return symbol;
  }
  if (args.done || args.completeObjective) return "x";
  if (args.progress) return "/";
  if (args.todo) return " ";
  return null;
}

function normalizePriority(priority) {
  if (priority === undefined) return undefined;
  const value = String(priority).toLowerCase();
  if (!Object.hasOwn(PRIORITY_SYMBOLS, value)) throw new Error(`unknown priority: ${priority}`);
  return PRIORITY_SYMBOLS[value];
}

function validateDateArg(value, name) {
  if (value === undefined) return undefined;
  if (!DATE_PATTERN.test(String(value))) throw new Error(`--${name} must use YYYY-MM-DD`);
  return String(value);
}

function assertTimestamp(timestamp) {
  if (!TIMESTAMP_PATTERN.test(timestamp)) {
    throw new Error("--now must use YYYY-MM-DDTHH:mm:ss");
  }
}

function dateFromTimestamp(timestamp) {
  return timestamp.slice(0, 10);
}

function updateTask(body, selector, update) {
  const lines = body.split("\n");
  let found = false;
  const nextLines = lines.map((line) => {
    if (found || !isTaskLine(line) || !matchesTaskLine(line, selector)) return line;
    found = true;
    return rewriteTaskLine(line, update);
  });
  return { changed: found, body: nextLines.join("\n") };
}

function isTaskLine(line) {
  return /^(\s*)[-*]\s+\[[^\]]?\]\s+/.test(line);
}

function matchesTaskLine(line, selector) {
  if (selector.type === "text") return line.includes(selector.value);
  return new RegExp(selector.value, "i").test(line);
}

function rewriteTaskLine(line, update) {
  const match = line.match(/^(\s*[-*]\s+\[)([^\]]?)(\]\s+)(.*)$/u);
  if (!match) return line;
  const symbol = update.status ?? match[2];
  const text = applyTaskMetadata(match[4], update.metadata);
  return `${match[1]}${symbol}${match[3]}${text}`;
}

function applyTaskMetadata(text, metadata) {
  const tokens = [];
  let next = text;

  if (metadata.priority !== undefined) {
    next = next.replace(PRIORITY_REGEX, " ");
    if (metadata.priority) tokens.push(metadata.priority);
  }
  for (const key of ["start", "scheduled", "due", "created", "done", "cancelled"]) {
    if (metadata[key] !== undefined) next = next.replace(dateRegexFor(key), " ");
  }
  if (metadata.repeat !== undefined) next = next.replace(REPEAT_REGEX, " ");
  if (metadata.taskId !== undefined || metadata.dependsOn !== undefined) next = next.replace(ID_REGEX, " ");
  if (metadata.onCompletion !== undefined) next = next.replace(ON_COMPLETION_REGEX, " ");

  if (metadata.repeat) tokens.push(`🔁 ${metadata.repeat}`);
  if (metadata.start) tokens.push(`🛫 ${metadata.start}`);
  if (metadata.scheduled) tokens.push(`⏳ ${metadata.scheduled}`);
  if (metadata.due) tokens.push(`📅 ${metadata.due}`);
  if (metadata.created) tokens.push(`➕ ${metadata.created}`);
  if (metadata.done) tokens.push(`✅ ${metadata.done}`);
  if (metadata.cancelled) tokens.push(`❌ ${metadata.cancelled}`);
  if (metadata.taskId) tokens.push(`🆔 ${metadata.taskId}`);
  if (metadata.dependsOn) tokens.push(`⛔ ${metadata.dependsOn}`);
  if (metadata.onCompletion) tokens.push(`🏁 ${metadata.onCompletion}`);

  next = next.replace(/\s+/gu, " ").trim();
  return tokens.length > 0 ? `${next} ${tokens.join(" ")}` : next;
}

function dateRegexFor(key) {
  const emoji = {
    start: "🛫",
    scheduled: "⏳",
    due: "📅",
    created: "➕",
    done: "✅",
    cancelled: "❌",
  }[key];
  return new RegExp(`(?:^|\\s)${emoji}\\s+\\d{4}-\\d{2}-\\d{2}(?=\\s|$)`, "u");
}

function noOpenTasksRemain(body) {
  return body
    .split("\n")
    .filter(isTaskLine)
    .every((line) => {
      const match = line.match(/^\s*[-*]\s+\[([^\]]?)\]/u);
      return match ? CLOSED_TASK_SYMBOLS.has(match[1]) : true;
    });
}

function handleFilter(body, status) {
  const char = status === "done" ? "x" : status === "progress" ? "/" : " ";
  const lines = body.split("\n");
  const tasks = lines.filter((l) => l.includes(`- [${char}]`));
  console.log(tasks.join("\n"));
}

function handleCreate(args, now) {
  const templateName = args.template || "item";
  const templatePath = path.resolve(process.cwd(), `.agents/docs/templates/${templateName}-template.md`);
  
  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Template not found: ${templatePath}`);
    process.exit(1);
  }

  let template = fs.readFileSync(templatePath, "utf8");
  const agent = args.agent || "antigravity";
  const initiative = args.initiative || "draft";
  const title = args.title || "New Item";
  const id = args.id || "";
  const parent = args.parent || `[[docs/work/${initiative}/index|${initiative}]]`;

  const output = template
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{initiative\}\}/g, initiative)
    .replace(/\{\{id\}\}/g, id)
    .replace(/\{\{timestamp\}\}/g, now)
    .replace(/\{\{agent\}\}/g, agent)
    .replace(/\{\{parent_link\}\}/g, parent);

  const fileName = (id ? `${id}-` : "") + title.toLowerCase().replace(/\s+/g, "-") + ".md";
  const dir = path.join(process.cwd(), ".agents/docs/work", initiative, args.template === "item" ? "items" : args.template === "plan" ? "plans" : "specs");
  
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const finalPath = path.join(dir, fileName);
  fs.writeFileSync(finalPath, output);
  console.log(`Created ${toPosixPath(path.relative(process.cwd(), finalPath))}`);
}

main();
