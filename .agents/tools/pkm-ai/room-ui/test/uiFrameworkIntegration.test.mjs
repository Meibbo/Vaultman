import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const roomUiRoot = path.resolve(import.meta.dirname, "..");
const pkmAiRoot = path.resolve(roomUiRoot, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(roomUiRoot, relativePath), "utf8");
}

test("declares reproducible room-ui framework and Svelte toolchain dependencies", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(pkmAiRoot, "package.json"), "utf8"));
  const dependencies = packageJson.dependencies ?? {};
  const devDependencies = packageJson.devDependencies ?? {};

  assert.ok(devDependencies.svelte, "svelte must be declared locally to keep compiler/runtime aligned");
  assert.ok(devDependencies["@sveltejs/vite-plugin-svelte"], "@sveltejs/vite-plugin-svelte must be declared locally");
  assert.ok(devDependencies.vite, "vite must be declared locally");
  assert.ok(dependencies["bits-ui"] || devDependencies["bits-ui"], "bits-ui must be declared");
  assert.ok(dependencies.daisyui || devDependencies.daisyui, "daisyui must be declared");
  assert.ok(dependencies.unocss || devDependencies.unocss, "unocss must be declared");
  assert.ok(dependencies["@unocss/preset-wind4"] || devDependencies["@unocss/preset-wind4"], "@unocss/preset-wind4 must be declared");
});

test("wires UnoCSS Vite integration and virtual stylesheet entry", () => {
  const viteConfig = read("vite.config.ts");
  const mainEntry = read("src/main.ts");
  const unoConfig = read("uno.config.ts");

  assert.match(viteConfig, /from\s+["']unocss\/vite["']/, "vite config must import the UnoCSS Vite plugin");
  assert.match(viteConfig, /UnoCSS\(\)/, "vite config must include UnoCSS() in plugins");
  assert.match(mainEntry, /import\s+["']virtual:uno\.css["']/, "main entry must import virtual:uno.css");
  assert.match(unoConfig, /presetWind4\(/, "uno.config.ts must use presetWind4()");
});

test("uses Bits UI primitives for the tactical shell interactions", () => {
  const app = read("src/App.svelte");

  assert.match(app, /from\s+["']bits-ui["']/, "App.svelte must import Bits UI primitives");
  for (const primitive of ["Tabs", "Dialog", "Tooltip", "Switch", "Progress", "ScrollArea"]) {
    assert.match(app, new RegExp(`\\b${primitive}\\b`), `App.svelte must use ${primitive}`);
  }
  assert.match(app, /<Tabs\.Root[\s\S]*bind:value=\{mode\}/, "mode navigation must be backed by Bits UI Tabs.Root");
  assert.match(app, /<Dialog\.Root[\s\S]*bind:open=\{taskDrawerOpen\}/, "task detail drawer must be backed by Bits UI Dialog.Root");
});
