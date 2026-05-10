import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildCodeIndex, dependentsFor } from "../lib/code-index.mjs";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "code-index.mjs");

test("buildCodeIndex extracts TypeScript AST imports, exports, and resolved edges", () => {
  const root = fixtureRoot();

  const index = buildCodeIndex({ root, targets: ["src"] });
  const service = index.files.find((file) => file.path === "src/service.ts");

  assert.equal(index.confidence, "evidence-bearing");
  assert.equal(index.parser, "typescript-ast");
  assert.ok(service);
  assert.deepEqual(
    service.imports.map((entry) => ({
      specifier: entry.specifier,
      defaultName: entry.defaultName,
      namespaceName: entry.namespaceName,
      typeOnly: entry.typeOnly,
      named: entry.named,
    })),
    [
      {
        specifier: "./types",
        defaultName: null,
        namespaceName: null,
        typeOnly: true,
        named: [{ imported: "Thing", local: "Thing" }],
      },
      {
        specifier: "./helper",
        defaultName: "DefaultThing",
        namespaceName: null,
        typeOnly: false,
        named: [{ imported: "helper", local: "renamedHelper" }],
      },
      {
        specifier: "./namespace",
        defaultName: null,
        namespaceName: "namespaceTools",
        typeOnly: false,
        named: [],
      },
    ],
  );
  assert.deepEqual(
    service.exports.map((entry) => ({
      name: entry.name,
      kind: entry.kind,
      default: entry.default,
      source: entry.source,
    })),
    [
      { name: "ServiceAPIHost", kind: "interface", default: false, source: null },
      { name: "createServiceAPI", kind: "const", default: false, source: null },
      { name: "ServiceAPI", kind: "class", default: true, source: null },
      { name: "helperAgain", kind: "re-export", default: false, source: "./helper" },
    ],
  );
  assert.deepEqual(
    index.edges
      .filter((edge) => edge.from !== "src/Widget.svelte")
      .map((edge) => ({
        from: edge.from,
        specifier: edge.specifier,
        resolvedPath: edge.resolvedPath,
        kind: edge.kind,
      })),
    [
      { from: "src/helper.ts", specifier: "./types", resolvedPath: "src/types.ts", kind: "import" },
      { from: "src/service.ts", specifier: "./types", resolvedPath: "src/types.ts", kind: "import" },
      { from: "src/service.ts", specifier: "./helper", resolvedPath: "src/helper.ts", kind: "import" },
      { from: "src/service.ts", specifier: "./namespace", resolvedPath: "src/namespace.ts", kind: "import" },
      { from: "src/service.ts", specifier: "./helper", resolvedPath: "src/helper.ts", kind: "export" },
    ],
  );
  assert.deepEqual(
    dependentsFor(index, "src/helper.ts").map((entry) => entry.from),
    ["src/service.ts"],
  );
});

test("code-index CLI emits JSON evidence", () => {
  const root = fixtureRoot();
  const result = spawnSync(process.execPath, [toolPath, "--json", "src/service.ts"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.confidence, "evidence-bearing");
  assert.equal(parsed.files.length, 1);
  assert.equal(parsed.files[0].path, "src/service.ts");
  assert.equal(parsed.files[0].exports[0].name, "ServiceAPIHost");
});

test("buildCodeIndex extracts Svelte component props, events, and relative imports", () => {
  const root = fixtureRoot();

  const index = buildCodeIndex({ root, targets: ["src/Widget.svelte"] });
  const widget = index.files.find((file) => file.path === "src/Widget.svelte");

  assert.ok(widget);
  assert.equal(widget.language, "svelte");
  assert.deepEqual(
    widget.imports.map((entry) => ({
      specifier: entry.specifier,
      typeOnly: entry.typeOnly,
      named: entry.named,
    })),
    [
      {
        specifier: "svelte",
        typeOnly: false,
        named: [{ imported: "createEventDispatcher", local: "createEventDispatcher" }],
      },
      {
        specifier: "./types",
        typeOnly: true,
        named: [{ imported: "Thing", local: "Thing" }],
      },
    ],
  );
  assert.deepEqual(widget.svelte.props, [
    { name: "legacy", localName: "legacy", source: "export-let", default: true },
    { name: "title", localName: "title", source: "props-rune", default: false },
    { name: "count", localName: "count", source: "props-rune", default: true },
    { name: "onselect", localName: "onselect", source: "props-rune", default: false },
  ]);
  assert.deepEqual(widget.svelte.events, [
    { name: "save", source: "dispatch-call", dispatcher: "dispatch" },
    { name: "cancel", source: "dispatch-call", dispatcher: "dispatch" },
  ]);
  assert.deepEqual(
    index.edges
      .filter((edge) => edge.from === "src/Widget.svelte")
      .map((edge) => ({
        specifier: edge.specifier,
        resolvedPath: edge.resolvedPath,
      })),
    [
      { specifier: "svelte", resolvedPath: null },
      { specifier: "./types", resolvedPath: "src/types.ts" },
    ],
  );
});

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-code-index-"));
  writeFile(
    path.join(root, "src", "types.ts"),
    `
export interface Thing {
  id: string;
}
`,
  );
  writeFile(
    path.join(root, "src", "helper.ts"),
    `
import type { Thing } from "./types";

export function helper(value: Thing): string {
  return value.id;
}

export default class DefaultThing {}
`,
  );
  writeFile(
    path.join(root, "src", "namespace.ts"),
    `
export const namespaceValue = 1;
`,
  );
  writeFile(
    path.join(root, "src", "service.ts"),
    `
import type {
  Thing
} from "./types";
import DefaultThing, {
  helper as renamedHelper
} from "./helper";
import * as namespaceTools from "./namespace";

export interface ServiceAPIHost {
  thing: Thing;
}

export const createServiceAPI = () => renamedHelper({ id: String(namespaceTools.namespaceValue) });

export default class ServiceAPI extends DefaultThing {}

export { helper as helperAgain } from "./helper";
`,
  );
  writeFile(
    path.join(root, "src", "Widget.svelte"),
    `
<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Thing } from "./types";

  export let legacy = "old";
  let { title, count = 0, onselect }: {
    title: string;
    count?: number;
    onselect?: () => void;
  } = $props();

  const dispatch = createEventDispatcher<{
    save: string;
    cancel: void;
  }>();

  function save(thing: Thing) {
    dispatch("save", thing.id);
  }

  const cancel = () => dispatch("cancel");
</script>

<button onclick={() => save({ id: "1" })}>{title} {count} {legacy}</button>
`,
  );
  return root;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
