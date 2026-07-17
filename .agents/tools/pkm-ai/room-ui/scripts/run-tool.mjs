#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

const tools = {
  tsc: { packageName: "typescript", binPath: "bin/tsc" },
  vite: { packageName: "vite", binPath: "bin/vite.js", fallbackFrom: "@sveltejs/vite-plugin-svelte" }
};

const [toolName, ...args] = process.argv.slice(2);
if (!toolName || !(toolName in tools)) {
  console.error(`Usage: node scripts/run-tool.mjs ${Object.keys(tools).join("|")} [...args]`);
  process.exit(2);
}

const tool = tools[toolName];
const resolved = resolveTool(tool);
const result = spawnSync(process.execPath, [resolved, ...args], { stdio: "inherit" });
process.exit(result.status ?? 1);

function resolveTool(tool) {
  try {
    return resolvePackageBin(tool.packageName, tool.binPath);
  } catch (primaryError) {
    if (!tool.fallbackFrom) throw primaryError;
    const fallbackEntry = require.resolve(tool.fallbackFrom);
    const fallbackPath = path.dirname(fallbackEntry);
    return resolvePackageBin(tool.packageName, tool.binPath, [fallbackPath]);
  }
}

function resolvePackageBin(packageName, binPath, paths) {
  try {
    return require.resolve(`${packageName}/${binPath}`, paths ? { paths } : undefined);
  } catch (error) {
    if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error;
    const entry = require.resolve(packageName, paths ? { paths } : undefined);
    return path.join(packageRoot(entry), binPath);
  }
}

function packageRoot(entry) {
  let current = path.dirname(entry);
  while (!fs.existsSync(path.join(current, "package.json"))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`Unable to locate package root for ${entry}`);
    current = parent;
  }
  return current;
}
