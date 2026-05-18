import fs from "node:fs";
import path from "node:path";

const root = "c:/Users/vic_A/My Drive (vic_alejandronavas@outlook.com)/plugin-dev/.obsidian/plugins/vaultman";
const docsRoot = path.join(root, ".agents/docs");

function walk(dir) {
  const relDir = path.relative(root, dir);
  if (relDir.startsWith(".agents/brain") || relDir.startsWith(".agents/cache")) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      fixFile(fullPath);
    }
  }
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;
  
  // Remove .agents/ or agents/ prefix from both wikilinks and plain text
  // We use a regex that looks for .agents/ or agents/ and removes it.
  // We should be careful to only do this if it's likely a path.
  // Actually, the user said "borra ese layer", so I'll be aggressive in docs/.
  
  content = content.replace(/\.?agents\//g, "");
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${path.relative(root, filePath)}`);
  }
}

walk(docsRoot);
