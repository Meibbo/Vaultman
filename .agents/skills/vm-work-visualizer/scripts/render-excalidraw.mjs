#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { pathToFileURL } from "node:url";

import { formatNumber, relativePoints, routeForEdge, serializePoints } from "./render-geometry.mjs";
import { textLayout, wrapText } from "./render-text.mjs";

export { wrapText } from "./render-text.mjs";

const COLORS = {
  source: ["#dbeafe", "#2563eb"],
  authority: ["#ede9fe", "#7c3aed"],
  runtime: ["#dcfce7", "#16a34a"],
  decision: ["#fef3c7", "#d97706"],
  risk: ["#fee2e2", "#dc2626"],
  neutral: ["#f1f5f9", "#475569"],
};

const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const OBSIDIAN_TOP_OVERLAY_PADDING = 320;

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function blockId(source) {
  let bits = (BigInt(hash(source)) << 32n) | BigInt(hash(`${source}:block`));
  let id = "";
  for (let index = 0; index < 8; index += 1) {
    id += ID_ALPHABET[Number(bits % BigInt(ID_ALPHABET.length))];
    bits /= BigInt(ID_ALPHABET.length);
  }
  return id;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function common(id, type, x, y, width, height) {
  const seed = hash(id);
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: "#1e293b",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: null,
    roundness: type === "rectangle" ? { type: 3 } : null,
    seed,
    version: 1,
    versionNonce: hash(`${id}:version`),
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
  };
}

function makeRectangle(node, textId, edges) {
  const [backgroundColor, strokeColor] = COLORS[node.kind] ?? COLORS.neutral;
  return {
    ...common(node.id, "rectangle", node.x, node.y, node.width, node.height),
    backgroundColor,
    strokeColor,
    boundElements: [
      { id: textId, type: "text" },
      ...edges.filter((edge) => edge.from === node.id || edge.to === node.id).map((edge) => ({ id: edge.id, type: "arrow" })),
    ],
  };
}

function makeText(node) {
  const id = blockId(node.id);
  const layout = textLayout(node);
  return {
    ...common(id, "text", node.x + 12, node.y + 12, layout.width, layout.height),
    strokeColor: "#0f172a",
    text: layout.lines.join("\n"),
    rawText: node.label,
    fontSize: layout.fontSize,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: node.id,
    originalText: node.label,
    autoResize: false,
    lineHeight: 1.25,
    boundElements: [],
  };
}

function makeArrow(edge, nodes) {
  const start = nodes.get(edge.from);
  const end = nodes.get(edge.to);
  const route = routeForEdge(edge, start, end);
  const points = relativePoints(route.points);
  const [origin] = points;
  const finalPoint = points.at(-1);
  return {
    ...common(edge.id, "arrow", route.points[0].x, route.points[0].y, finalPoint[0], finalPoint[1]),
    strokeColor: edge.kind === "risk" ? COLORS.risk[1] : "#475569",
    strokeStyle: edge.dashed ? "dashed" : "solid",
    points: points.map(([x, y]) => [x - origin[0], y - origin[1]]),
    lastCommittedPoint: null,
    startBinding: route.startBinding,
    endBinding: route.endBinding,
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: false,
  };
}

export function validateDiagram(diagram) {
  if (!diagram || typeof diagram !== "object" || !Array.isArray(diagram.nodes) || !Array.isArray(diagram.edges)) {
    throw new TypeError("Diagram must contain nodes and edges arrays");
  }
  const ids = new Set();
  for (const node of diagram.nodes) {
    if (!/^[A-Za-z0-9-]{1,8}$/.test(node.id)) throw new TypeError(`Invalid node id: ${node.id}`);
    if (ids.has(node.id)) throw new TypeError(`Duplicate id: ${node.id}`);
    ids.add(node.id);
    if (node.width < 120 || node.height < 56) throw new RangeError(`Node too small: ${node.id}`);
  }
  for (const edge of diagram.edges) {
    if (!/^[A-Za-z0-9-]{1,8}$/.test(edge.id)) throw new TypeError(`Invalid edge id: ${edge.id}`);
    if (ids.has(edge.id)) throw new TypeError(`Duplicate id: ${edge.id}`);
    ids.add(edge.id);
    if (!diagram.nodes.some((node) => node.id === edge.from)) throw new TypeError(`Missing edge source: ${edge.from}`);
    if (!diagram.nodes.some((node) => node.id === edge.to)) throw new TypeError(`Missing edge target: ${edge.to}`);
    if (edge.via !== undefined && (!Array.isArray(edge.via) || edge.via.some((point) => !point || typeof point !== "object" || !Number.isFinite(point.x) || !Number.isFinite(point.y)))) {
      throw new TypeError(`Invalid edge via: ${edge.id}`);
    }
  }
}

export function buildScene(diagram) {
  validateDiagram(diagram);
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  const minX = Math.min(...diagram.nodes.map((node) => node.x));
  const minY = Math.min(...diagram.nodes.map((node) => node.y));
  const maxY = Math.max(...diagram.nodes.map((node) => node.y + node.height));
  const topPadding = { ...common("padTop", "rectangle", minX, minY - OBSIDIAN_TOP_OVERLAY_PADDING, 1, 1), opacity: 0, strokeWidth: 0, locked: true };
  const bottomPadding = { ...common("padBot", "rectangle", minX, maxY + 100, 1, 1), opacity: 0, strokeWidth: 0, locked: true };
  const elements = [topPadding];
  for (const edge of diagram.edges) elements.push(makeArrow(edge, nodes));
  for (const node of diagram.nodes) elements.push(makeRectangle(node, blockId(node.id), diagram.edges), makeText(node));
  elements.push(bottomPadding);
  return {
    type: "excalidraw",
    version: 2,
    source: "vaultman-vm-work-visualizer",
    elements: elements.map((element, index) => ({ ...element, index: `a${index}` })),
    appState: { gridSize: 20, viewBackgroundColor: "#ffffff" },
    files: {},
  };
}

export function toObsidianMarkdown(diagram) {
  const scene = buildScene(diagram);
  const textElements = scene.elements
    .filter((element) => element.type === "text")
    .map((element) => `${element.rawText} ^${element.id}`)
    .join("\n\n");
  return `---\nexcalidraw-plugin: parsed\ntags: [excalidraw, vaultman, architecture]\n---\n==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==\n\n# Excalidraw Data\n## Text Elements\n${textElements}\n\n%%\n## Drawing\n\`\`\`json\n${JSON.stringify(scene, null, 2)}\n\`\`\`\n%%\n`;
}

export function toSvg(diagram) {
  validateDiagram(diagram);
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  const lines = diagram.edges.map((edge) => {
    const route = routeForEdge(edge, nodes.get(edge.from), nodes.get(edge.to));
    const points = route.points.map((point) => [point.x, point.y]);
    const dashed = edge.dashed ? ' stroke-dasharray="9 7"' : "";
    const color = edge.kind === "risk" ? COLORS.risk[1] : "#475569";
    const marker = edge.kind === "risk" ? "arrow-risk" : "arrow-default";
    return `<polyline points="${serializePoints(points)}" fill="none" stroke="${color}" stroke-width="3"${dashed} marker-end="url(#${marker})"/>`;
  });
  const boxes = diagram.nodes.flatMap((node) => {
    const [fill, stroke] = COLORS[node.kind] ?? COLORS.neutral;
    const layout = textLayout(node);
    const firstY = node.y + node.height / 2 - ((layout.lines.length - 1) * layout.lineHeight) / 2;
    return [
      `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`,
      ...layout.lines.map((line, index) => `<text x="${formatNumber(node.x + node.width / 2)}" y="${formatNumber(firstY + index * layout.lineHeight)}" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, sans-serif" font-size="${layout.fontSize}" fill="#0f172a">${escapeXml(line)}</text>`),
    ];
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${diagram.width}" height="${diagram.height}" viewBox="0 0 ${diagram.width} ${diagram.height}" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(diagram.title)}</title><desc id="desc">${escapeXml(diagram.description)}</desc><defs><marker id="arrow-default" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#475569"/></marker><marker id="arrow-risk" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/></marker></defs><rect width="100%" height="100%" fill="#ffffff"/>${lines.join("")}${boxes.join("")}</svg>\n`;
}

export function extractScene(markdown) {
  const match = markdown.match(/\n## Drawing\n```json\n([\s\S]*?)\n```/);
  if (!match) throw new TypeError("Missing Drawing block");
  return JSON.parse(match[1]);
}

async function main() {
  const [inputPath, markdownPath, svgPath] = process.argv.slice(2);
  if (!inputPath || !markdownPath || !svgPath) {
    throw new TypeError("Usage: render-excalidraw.mjs <diagram.json> <output.excalidraw.md> <output.svg>");
  }
  const diagram = JSON.parse(await readFile(inputPath, "utf8"));
  const markdown = toObsidianMarkdown(diagram);
  await Promise.all([writeFile(markdownPath, markdown), writeFile(svgPath, toSvg(diagram))]);
  const scene = extractScene(markdown);
  process.stdout.write(`${basename(inputPath, extname(inputPath))}: ${scene.elements.length} elements\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
