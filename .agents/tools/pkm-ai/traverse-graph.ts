#!/usr/bin/env node
import { listMarkdownFiles, readMarkdown, relativePath } from "./lib/frontmatter.mjs";

interface ParsedArgs {
  node: string;
  depth: number;
  direction: "out" | "in" | "both";
  json: boolean;
  help: boolean;
}

interface Edge {
  from: string;
  to: string;
  type: string;
}

interface OutEdge {
  to: string;
  type: string;
}

interface InEdge {
  from: string;
  type: string;
}

interface ReachNode {
  node: string;
  depth: number;
}

interface GraphResult {
  node: string;
  found: boolean;
  direction: "out" | "in" | "both";
  depth: number;
  out: OutEdge[];
  in: InEdge[];
  reachable: ReachNode[];
}

const HELP = `Usage: node .agents/tools/pkm-ai/traverse-graph.ts <node> [--depth N] [--direction out|in|both] [--json]

Builds a wikilink / typed-edge graph over .agents/docs and reports a node's edges.
<node> may be a wiki-path (docs/work/pkm-ai/index), a doc file path
(.agents/docs/work/pkm-ai/index.md), or a bare slug — all normalize to a wiki-path.

Edge types: "parent" (frontmatter parent: link) and "link" (body [[wikilink]]).

  --depth N        follow out-edges up to N hops (default 1) into "reachable".
  --direction d    out | in | both (default both) for the listed edges.
  --json           emit { node, found, out[], in[], reachable[] } as JSON.`;

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.node) {
  console.log(HELP);
  process.exit(args.node ? 0 : 1);
}

const root = process.cwd();
const edges = buildEdges(root);
const docNodes = new Set<string>(
  listMarkdownFiles(root, ".agents/docs", { excludeArchive: true }).map((file) =>
    wikiPathForRel(relativePath(root, file)),
  ),
);

const result = describeNode(args.node, args, edges, docNodes);

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printHuman(result);
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { node: "", depth: 1, direction: "both", json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--depth") {
      parsed.depth = Math.max(1, Number.parseInt(argv[index + 1] ?? "1", 10) || 1);
      index += 1;
    } else if (arg === "--direction") {
      const value = argv[index + 1] ?? "both";
      parsed.direction = value === "out" || value === "in" ? value : "both";
      index += 1;
    } else if (!arg.startsWith("--") && !parsed.node) {
      parsed.node = normalizeNode(arg);
    }
  }
  return parsed;
}

function buildEdges(rootDir: string): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  for (const file of listMarkdownFiles(rootDir, ".agents/docs", { excludeArchive: true })) {
    const from = wikiPathForRel(relativePath(rootDir, file));
    const markdown = readMarkdown(file);
    const frontmatter = markdown.frontmatter as Record<string, unknown>;

    const parent = frontmatter.parent;
    if (typeof parent === "string") {
      for (const target of extractWikiTargets(parent)) {
        addEdge(edges, seen, { from, to: target, type: "parent" });
      }
    }

    for (const target of extractWikiTargets(markdown.body)) {
      addEdge(edges, seen, { from, to: target, type: "link" });
    }
  }
  return edges;
}

function addEdge(edges: Edge[], seen: Set<string>, edge: Edge): void {
  if (edge.to === edge.from) return;
  const key = `${edge.from} ${edge.to} ${edge.type}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push(edge);
}

function describeNode(node: string, parsed: ParsedArgs, edges: Edge[], docNodes: Set<string>): GraphResult {
  const out: OutEdge[] = edges.filter((edge) => edge.from === node).map((edge) => ({ to: edge.to, type: edge.type }));
  const incoming: InEdge[] = edges.filter((edge) => edge.to === node).map((edge) => ({ from: edge.from, type: edge.type }));
  const reachable = parsed.depth >= 1 ? traverseOut(node, parsed.depth, edges) : [];
  return {
    node,
    found: docNodes.has(node),
    direction: parsed.direction,
    depth: parsed.depth,
    out: parsed.direction === "in" ? [] : out,
    in: parsed.direction === "out" ? [] : incoming,
    reachable,
  };
}

function traverseOut(start: string, depth: number, edges: Edge[]): ReachNode[] {
  const distance = new Map<string, number>();
  let frontier = [start];
  for (let hop = 1; hop <= depth; hop += 1) {
    const next: string[] = [];
    for (const current of frontier) {
      for (const edge of edges) {
        if (edge.from !== current) continue;
        if (distance.has(edge.to) || edge.to === start) continue;
        distance.set(edge.to, hop);
        next.push(edge.to);
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return [...distance.entries()]
    .map(([node, hop]) => ({ node, depth: hop }))
    .sort((a, b) => a.depth - b.depth || a.node.localeCompare(b.node));
}

function printHuman(result: GraphResult): void {
  console.log(`node\t${result.node}${result.found ? "" : "\t(not a doc in corpus)"}`);
  if (result.direction !== "in") {
    for (const edge of result.out) console.log(`out\t${edge.type}\t${edge.to}`);
  }
  if (result.direction !== "out") {
    for (const edge of result.in) console.log(`in\t${edge.type}\t${edge.from}`);
  }
  for (const node of result.reachable) console.log(`reach\t${node.depth}\t${node.node}`);
}

// Normalize a CLI <node> (wiki-path, .agents/docs file path, or slug) to a canonical wiki-path.
function normalizeNode(raw: string): string {
  const value = raw.trim().replace(/\\/g, "/");
  if (value.startsWith(".agents/docs/")) return wikiPathForRel(value);
  return value.replace(/\.md$/i, "");
}

// Map a corpus-relative path (.agents/docs/work/x.md) to its wiki-path (docs/work/x).
function wikiPathForRel(rel: string): string {
  return rel.replace(/\\/g, "/").replace(/^\.agents\/docs\//, "docs/").replace(/\.md$/i, "");
}

// Pull every [[wikilink]] target out of a text blob, normalized to wiki-paths
// (drops the |alias and #heading, rewrites a .agents/docs/ prefix to docs/).
function extractWikiTargets(text: string): string[] {
  const targets: string[] = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const inner = match[1].split("|", 1)[0].split("#", 1)[0].trim();
    if (!inner || inner.startsWith("{{")) continue;
    const normalized = inner.replace(/^\.agents\/docs\//, "docs/").replace(/\.md$/i, "");
    targets.push(normalized);
  }
  return targets;
}
