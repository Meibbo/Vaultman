import assert from "node:assert/strict";
import test from "node:test";

import { buildScene, extractScene, toObsidianMarkdown, toSvg, validateDiagram, wrapText } from "../scripts/render-excalidraw.mjs";

const sample = {
  title: "Prueba",
  description: "Diagrama de prueba",
  width: 640,
  height: 320,
  nodes: [
    { id: "uno", label: "Uno", kind: "source", x: 40, y: 80, width: 180, height: 80 },
    { id: "dos", label: "Dos", kind: "runtime", x: 380, y: 80, width: 180, height: 80 },
  ],
  edges: [{ id: "e1", from: "uno", to: "dos" }],
};

const pageFive = {
  title: "Snapshot import",
  description: "Independent import branches",
  width: 2050,
  height: 1240,
  nodes: [
    { id: "route", label: "Routing importado\nignorado; sin dependencia live", kind: "risk", x: 1240, y: 220, width: 360, height: 110 },
    { id: "mode", label: "Decisión de importación\nFork / Replace / Overlay", kind: "decision", x: 1240, y: 560, width: 340, height: 120 },
    { id: "fork", label: "Fork\nIDs nuevos\npublicación tras commit", kind: "runtime", x: 980, y: 760, width: 320, height: 140 },
    { id: "replace", label: "Replace\nconserva ID, placement y routing\nlocal existente", kind: "runtime", x: 1340, y: 760, width: 320, height: 140 },
    { id: "overlay", label: "Overlay\nmerge de facets + AST\nroot local agrupado", kind: "runtime", x: 1700, y: 760, width: 320, height: 140 },
    { id: "commit", label: "Frontera única\ncommit atómico o rollback\npublicación solo después", kind: "authority", x: 1340, y: 1000, width: 360, height: 140 },
  ],
  edges: [
    { id: "e6", from: "mode", to: "replace" },
    { id: "e7", from: "mode", to: "overlay" },
    { id: "e11", from: "mode", to: "fork" },
    { id: "e12", from: "fork", to: "commit", via: [{ x: 1140, y: 940 }, { x: 1260, y: 940 }] },
    { id: "e13", from: "replace", to: "commit", via: [{ x: 1500, y: 940 }, { x: 1500, y: 970 }] },
    { id: "e14", from: "overlay", to: "commit", via: [{ x: 1860, y: 940 }, { x: 1800, y: 970 }, { x: 1740, y: 970 }] },
  ],
};
const outcomeIds = ["fork", "replace", "overlay"];

function absoluteArrowPoints(scene, edgeId) {
  const arrow = scene.elements.find((element) => element.type === "arrow" && element.id === edgeId);
  assert.ok(arrow);
  return arrow.points.map(([x, y]) => [arrow.x + x, arrow.y + y]);
}

function segmentEntersRectangle(start, end, rectangle) {
  const ranges = [
    [start[0], end[0] - start[0], rectangle.x, rectangle.x + rectangle.width],
    [start[1], end[1] - start[1], rectangle.y, rectangle.y + rectangle.height],
  ];
  let entry = 0;
  let exit = 1;
  for (const [origin, delta, minimum, maximum] of ranges) {
    if (delta === 0) {
      if (origin <= minimum || origin >= maximum) return false;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  return entry < exit && Math.max(entry, 0) < Math.min(exit, 1);
}

function routeEntersRectangle(points, rectangle) {
  return points.slice(1).some((point, index) => segmentEntersRectangle(points[index], point, rectangle));
}

test("Given a valid diagram, when rendered, then native Markdown round-trips", () => {
  const markdown = toObsidianMarkdown(sample);
  const scene = extractScene(markdown);
  assert.deepEqual(scene, buildScene(sample));
  assert.match(markdown, /Uno \^[A-Za-z0-9]{8}/);
  assert.deepEqual(scene.elements.map((element) => element.index), ["a0", "a1", "a2", "a3", "a4", "a5", "a6"]);
  assert.equal(scene.elements.filter((element) => element.type === "text").every((element) => element.id.length === 8), true);

  const sourceRectangle = scene.elements.find((element) => element.id === "uno");
  const sourceText = scene.elements.find((element) => element.type === "text" && element.containerId === "uno");
  const arrow = scene.elements.find((element) => element.type === "arrow");
  assert.ok(sourceRectangle?.boundElements?.some((binding) => binding.id === sourceText.id && binding.type === "text"));
  assert.ok(sourceRectangle?.boundElements?.some((binding) => binding.id === arrow.id && binding.type === "arrow"));
  assert.equal(sourceText.autoResize, false);
  assert.deepEqual(sourceText.boundElements, []);
  assert.deepEqual(arrow.startBinding, { elementId: "uno", focus: 0, gap: 4, fixedPoint: [1, 0.5] });
  assert.deepEqual(arrow.endBinding, { elementId: "dos", focus: 0, gap: 4, fixedPoint: [0, 0.5] });
  assert.deepEqual(arrow.points, [[0, 0], [152, 0]]);
});

test("Given native scene bounds, when rendered, then the fixed help overlay has 320 units of top clearance", () => {
  const scene = buildScene(sample);
  const minimumNodeY = Math.min(...sample.nodes.map((node) => node.y));
  const padTop = scene.elements.find((element) => element.id === "padTop");

  assert.ok(padTop);
  assert.equal(padTop.y, minimumNodeY - 320);
});

test("Given page-five import modes, when branch routes are audited, then each mode converges independently at commit", () => {
  const scene = buildScene(pageFive);
  const outcomes = new Map(pageFive.nodes.filter((node) => outcomeIds.includes(node.id)).map((node) => [node.id, node]));
  const modeTargets = pageFive.edges.filter((edge) => edge.from === "mode").map((edge) => edge.to).sort();
  const branchEdges = outcomeIds.map((outcomeId) => {
    const outgoing = pageFive.edges.filter((edge) => edge.from === outcomeId);
    assert.equal(outgoing.length, 1);
    assert.equal(outgoing[0].to, "commit");
    return outgoing[0];
  });
  const branchRoutes = [
    ...pageFive.edges.filter((edge) => edge.from === "mode" && outcomeIds.includes(edge.to)),
    ...branchEdges,
  ];

  assert.deepEqual(modeTargets, [...outcomeIds].sort());
  assert.equal(new Set(branchEdges.map((edge) => JSON.stringify(edge.via))).size, outcomeIds.length);
  assert.match(outcomes.get("replace").label, /conserva ID, placement y routing\nlocal existente/);
  assert.match(pageFive.nodes.find((node) => node.id === "route").label, /Routing importado\nignorado/);
  assert.equal(new Set([...outcomes.values()].map((node) => node.y)).size, 1);
  assert.ok(pageFive.nodes.find((node) => node.id === "commit").y > Math.max(...[...outcomes.values()].map((node) => node.y + node.height)));

  for (const edge of branchRoutes) {
    const points = absoluteArrowPoints(scene, edge.id);
    for (const [outcomeId, outcome] of outcomes) {
      if (outcomeId !== edge.from && outcomeId !== edge.to) assert.equal(routeEntersRectangle(points, outcome), false, `${edge.id} enters ${outcomeId}`);
    }
  }
});

test("Given a valid diagram, when exported, then SVG is accessible and complete", () => {
  const svg = toSvg(sample);
  assert.match(svg, /role="img"/);
  assert.match(svg, /<title id="title">Prueba<\/title>/);
  assert.equal((svg.match(/<rect /g) ?? []).length, 3);
  assert.match(svg, /<polyline points="224,120 376,120"[^>]*stroke="#475569"[^>]*marker-end="url\(#arrow-default\)"/);
});

test("Given a routed risk edge, when rendered, then Excalidraw and SVG share the clipped polyline", () => {
  const diagram = {
    ...sample,
    nodes: [
      { ...sample.nodes[0], label: "One very long label that must wrap\nwith an explicit break" },
      { ...sample.nodes[1], kind: "risk", x: 420, y: 220 },
    ],
    edges: [{ id: "risk1", from: "uno", to: "dos", kind: "risk", dashed: true, via: [{ x: 290, y: 120 }, { x: 350, y: 260 }] }],
  };
  const scene = buildScene(diagram);
  const arrow = scene.elements.find((element) => element.type === "arrow");
  const absolutePoints = arrow.points.map(([x, y]) => [arrow.x + x, arrow.y + y]);
  const svg = toSvg(diagram);

  assert.deepEqual(absolutePoints, [[224, 120], [290, 120], [350, 260], [416, 260]]);
  assert.match(svg, /<polyline points="224,120 290,120 350,260 416,260"[^>]*stroke="#dc2626"[^>]*stroke-dasharray="9 7"[^>]*marker-end="url\(#arrow-risk\)"/);
  assert.equal(arrow.endArrowhead, "arrow");
  assert.match(svg, /marker id="arrow-risk"/);

  const text = scene.elements.find((element) => element.type === "text" && element.containerId === "uno");
  const lines = text.text.split("\n");
  assert.ok(lines.length <= 4);
  assert.ok(lines.some((line) => line.includes("…")));
  assert.ok(lines.every((line) => line.length > 0));
  for (const line of lines) assert.match(svg, new RegExp(`>${line}</text>`));
});

test("Given explicit newlines and oversized tokens, when wrapped, then output is bounded and deterministic", () => {
  const label = "ABCDEFGHIJKLMNO\nshort words";
  const first = wrapText(label, 36, 20);
  const second = wrapText(label, 36, 20);
  assert.deepEqual(first, second);
  assert.deepEqual(first, ["ABC", "DEF", "GHI", "JK…"]);
  assert.deepEqual(wrapText("one two\nthree", 120, 20), ["one two", "three"]);
});

test("Given malformed via data, when validated, then rendering stops", () => {
  const invalid = { ...sample, edges: [{ id: "bad", from: "uno", to: "dos", via: [{ x: 10 }, "bad"] }] };
  assert.throws(() => validateDiagram(invalid), /Invalid edge via/);
});

test("Given a zero-vector route segment, when rendered, then the fallback is finite and deterministic", () => {
  const diagram = {
    ...sample,
    nodes: [sample.nodes[0], { ...sample.nodes[1], x: sample.nodes[0].x, y: sample.nodes[0].y }],
    edges: [{ id: "zero", from: "uno", to: "dos", via: [{ x: 130, y: 120 }] }],
  };
  const arrow = buildScene(diagram).elements.find((element) => element.type === "arrow");
  const absolutePoints = arrow.points.map(([x, y]) => [arrow.x + x, arrow.y + y]);
  assert.deepEqual(absolutePoints, [[224, 120], [130, 120], [36, 120]]);
  assert.equal(absolutePoints.flat().every(Number.isFinite), true);
});

test("Given the same diagram twice, when serialized, then every output byte is identical", () => {
  const second = JSON.parse(JSON.stringify(sample));
  assert.equal(toObsidianMarkdown(sample), toObsidianMarkdown(second));
  assert.equal(toSvg(sample), toSvg(second));
  assert.equal(JSON.stringify(buildScene(sample)), JSON.stringify(buildScene(second)));
});

test("Given an unresolved edge, when validated, then rendering stops", () => {
  const invalid = { ...sample, edges: [{ id: "bad", from: "uno", to: "missing" }] };
  assert.throws(() => validateDiagram(invalid), /Missing edge target/);
});
