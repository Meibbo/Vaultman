import fs from "node:fs";
import path from "node:path";
import { parse as parseSvelte } from "svelte/compiler";
import ts from "typescript";

const CODE_EXTENSIONS = [
  ".svelte",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".svelte.ts",
  ".svelte.js",
];

const SKIP_DIRS = new Set([
  ".git",
  ".svelte-kit",
  "build",
  "dist",
  "node_modules",
]);

export function buildCodeIndex(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const targets = options.targets ?? [];
  const absoluteFiles = collectCodeFiles(root, targets);
  const files = absoluteFiles.map((filePath) => parseCodeFile(root, filePath));
  const edges = buildEdges(root, files);

  return {
    tool: "code-index",
    confidence: "evidence-bearing",
    parser: "typescript-ast",
    root,
    limitations: [
      "Relative import resolution only.",
      "No TypeScript type-checker symbol resolution.",
      "Svelte extraction is limited to script props and createEventDispatcher calls.",
    ],
    files,
    edges,
  };
}

export function dependentsFor(index, targetPath) {
  const normalizedTarget = normalizeRepoPath(targetPath);
  const byImporter = new Map();
  for (const edge of index.edges ?? []) {
    if (edge.resolvedPath === normalizedTarget && !byImporter.has(edge.from)) {
      byImporter.set(edge.from, edge);
    }
  }
  return [...byImporter.values()].sort((a, b) => a.from.localeCompare(b.from));
}

export function formatCodeIndex(index, options = {}) {
  const lines = [
    "Code index",
    `confidence: ${index.confidence}`,
    `parser: ${index.parser}`,
    `files: ${index.files.length}`,
    `edges: ${index.edges.length}`,
  ];

  if (options.dependentsTarget) {
    const dependents = dependentsFor(index, options.dependentsTarget);
    lines.push(`dependents for ${normalizeRepoPath(options.dependentsTarget)}: ${dependents.length}`);
    for (const dependent of dependents) {
      lines.push(`- ${dependent.from} imports ${dependent.specifier}`);
    }
    return `${lines.join("\n")}\n`;
  }

  for (const file of index.files) {
    lines.push("");
    lines.push(file.path);
    lines.push(`  imports: ${file.imports.length}`);
    lines.push(`  exports: ${file.exports.map((entry) => entry.name).join(", ") || "none"}`);
    if (file.svelte) {
      lines.push(`  svelte props: ${file.svelte.props.map((entry) => entry.name).join(", ") || "none"}`);
      lines.push(`  svelte events: ${file.svelte.events.map((entry) => entry.name).join(", ") || "none"}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function collectCodeFiles(root, targets) {
  const rootPath = path.resolve(root);
  const found = new Set();
  for (const target of targets) {
    const fullPath = path.resolve(rootPath, target);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Target not found: ${target}`);
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      for (const filePath of walkCodeFiles(fullPath)) {
        found.add(path.resolve(filePath));
      }
    } else if (stat.isFile() && isCodeFile(fullPath)) {
      found.add(fullPath);
    }
  }
  return [...found].sort((a, b) => relativePath(rootPath, a).localeCompare(relativePath(rootPath, b)));
}

export function normalizeRepoPath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function parseCodeFile(root, filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const relPath = relativePath(root, filePath);
  if (filePath.endsWith(".svelte")) {
    return parseSvelteComponentFile(root, filePath, relPath, content);
  }
  const sourceFile = ts.createSourceFile(
    relPath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(filePath),
  );
  const imports = [];
  const exports = [];
  const declarations = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      imports.push(parseImportDeclaration(statement));
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      exports.push(...parseExportDeclaration(statement));
      continue;
    }
    if (ts.isExportAssignment(statement)) {
      exports.push({
        name: "default",
        kind: "default",
        default: true,
        source: null,
        typeOnly: false,
      });
      continue;
    }

    const declaration = parseTopLevelDeclaration(statement);
    if (!declaration) continue;
    declarations.push(declaration);
    if (declaration.exported) {
      exports.push({
        name: declaration.name,
        kind: declaration.kind,
        default: declaration.default,
        source: null,
        typeOnly: false,
      });
    }
  }

  return {
    path: relPath,
    language: languageForPath(filePath),
    imports,
    exports,
    declarations,
  };
}

function parseSvelteComponentFile(_root, _filePath, relPath, content) {
  const ast = parseSvelte(content, { filename: relPath });
  const scripts = [ast.module?.content, ast.instance?.content].filter(Boolean);
  const imports = [];
  const exports = [];
  const declarations = [];
  const props = [];
  const events = [];
  const eventDispatcherCreators = new Set(["createEventDispatcher"]);
  const dispatchers = new Set();

  for (const script of scripts) {
    for (const statement of script.body ?? []) {
      if (statement.type === "ImportDeclaration") {
        const importEntry = parseSvelteImportDeclaration(statement);
        imports.push(importEntry);
        collectEventDispatcherCreator(importEntry, eventDispatcherCreators);
        continue;
      }
      if (statement.type === "ExportNamedDeclaration") {
        const exportedDeclarations = svelteDeclarationsFromNode(statement.declaration, true);
        declarations.push(...exportedDeclarations);
        exports.push(...svelteExportsFromNode(statement, exportedDeclarations));
        props.push(...svelteExportLetProps(statement));
        continue;
      }
      if (statement.type === "ExportDefaultDeclaration") {
        exports.push({
          name: statement.declaration?.id?.name ?? "default",
          kind: declarationKind(statement.declaration?.type) ?? "default",
          default: true,
          source: null,
          typeOnly: false,
        });
        continue;
      }
      declarations.push(...svelteDeclarationsFromNode(statement, false));
      props.push(...sveltePropsRuneProps(statement));
    }
  }

  for (const script of scripts) {
    walkEstree(script.body ?? [], (node) => {
      collectDispatcherName(node, eventDispatcherCreators, dispatchers);
    });
  }

  for (const script of scripts) {
    walkEstree(script.body ?? [], (node) => {
      const event = svelteDispatchEvent(node, dispatchers);
      if (event) events.push(event);
    });
  }

  return {
    path: relPath,
    language: "svelte",
    imports,
    exports,
    declarations,
    svelte: {
      props: uniqueBy(props, (entry) => `${entry.source}:${entry.name}`),
      events: uniqueBy(events, (entry) => `${entry.dispatcher}:${entry.name}`),
      dispatchers: [...dispatchers].sort(),
    },
  };
}

function buildEdges(root, files) {
  const edges = [];
  for (const file of files) {
    const fromAbsolute = path.resolve(root, file.path);
    for (const entry of file.imports) {
      edges.push(buildEdge(root, fromAbsolute, file.path, entry.specifier, "import", entry.typeOnly));
    }
    for (const entry of file.exports) {
      if (!entry.source) continue;
      edges.push(buildEdge(root, fromAbsolute, file.path, entry.source, "export", entry.typeOnly));
    }
  }
  return edges;
}

function buildEdge(root, fromAbsolute, from, specifier, kind, typeOnly) {
  const resolvedPath = resolveRelativeSpecifier(root, fromAbsolute, specifier);
  return {
    from,
    specifier,
    kind,
    typeOnly,
    resolved: resolvedPath != null,
    resolvedPath,
  };
}

function parseSvelteImportDeclaration(node) {
  const named = [];
  let defaultName = null;
  let namespaceName = null;
  for (const specifier of node.specifiers ?? []) {
    if (specifier.type === "ImportDefaultSpecifier") {
      defaultName = specifier.local?.name ?? null;
    } else if (specifier.type === "ImportNamespaceSpecifier") {
      namespaceName = specifier.local?.name ?? null;
    } else if (specifier.type === "ImportSpecifier") {
      named.push({
        imported: specifier.imported?.name ?? specifier.imported?.value,
        local: specifier.local?.name ?? specifier.imported?.name ?? specifier.imported?.value,
      });
    }
  }
  return {
    specifier: node.source.value,
    kind: "import",
    typeOnly: node.importKind === "type",
    defaultName,
    namespaceName,
    named,
  };
}

function svelteExportsFromNode(node, declarations) {
  const source = node.source?.value ?? null;
  if (declarations.length > 0) {
    return declarations.map((entry) => ({
      name: entry.name,
      kind: entry.kind,
      default: false,
      source,
      typeOnly: node.exportKind === "type",
    }));
  }
  if (!node.specifiers || node.specifiers.length === 0) {
    return source
      ? [{ name: "*", kind: "re-export", default: false, source, typeOnly: node.exportKind === "type" }]
      : [];
  }
  return node.specifiers.map((specifier) => ({
    name: specifier.exported?.name ?? specifier.exported?.value,
    imported: specifier.local?.name ?? specifier.local?.value,
    kind: source ? "re-export" : "export",
    default: false,
    source,
    typeOnly: node.exportKind === "type",
  }));
}

function svelteDeclarationsFromNode(node, exported) {
  if (!node) return [];
  if (node.type === "VariableDeclaration") {
    return (node.declarations ?? [])
      .flatMap((declarationNode) => bindingNames(declarationNode.id))
      .map((name) => ({ name, kind: node.kind, exported, default: false }));
  }
  const name = node.id?.name;
  const kind = declarationKind(node.type);
  if (!name || !kind) return [];
  return [{ name, kind, exported, default: false }];
}

function declarationKind(type) {
  if (type === "FunctionDeclaration") return "function";
  if (type === "ClassDeclaration") return "class";
  if (type === "TSInterfaceDeclaration") return "interface";
  if (type === "TSTypeAliasDeclaration") return "type";
  if (type === "TSEnumDeclaration") return "enum";
  return null;
}

function svelteExportLetProps(node) {
  const declaration = node.declaration;
  if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "let") return [];
  return (declaration.declarations ?? [])
    .filter((entry) => entry.id?.type === "Identifier")
    .map((entry) => ({
      name: entry.id.name,
      localName: entry.id.name,
      source: "export-let",
      default: entry.init != null,
    }));
}

function sveltePropsRuneProps(node) {
  if (node.type !== "VariableDeclaration") return [];
  return (node.declarations ?? []).flatMap((entry) => {
    if (!isPropsRuneCall(entry.init) || entry.id?.type !== "ObjectPattern") return [];
    return objectPatternProps(entry.id);
  });
}

function objectPatternProps(pattern) {
  const props = [];
  for (const property of pattern.properties ?? []) {
    if (property.type !== "Property") continue;
    const name = propertyKeyName(property.key);
    const localName = localBindingName(property.value);
    if (!name || !localName) continue;
    props.push({
      name,
      localName,
      source: "props-rune",
      default: property.value?.type === "AssignmentPattern",
    });
  }
  return props;
}

function propertyKeyName(key) {
  if (key?.type === "Identifier") return key.name;
  if (key?.type === "Literal") return String(key.value);
  return null;
}

function localBindingName(value) {
  if (value?.type === "Identifier") return value.name;
  if (value?.type === "AssignmentPattern") return localBindingName(value.left);
  return null;
}

function isPropsRuneCall(node) {
  return node?.type === "CallExpression" && node.callee?.type === "Identifier" && node.callee.name === "$props";
}

function collectEventDispatcherCreator(importEntry, eventDispatcherCreators) {
  if (importEntry.specifier !== "svelte") return;
  for (const named of importEntry.named) {
    if (named.imported === "createEventDispatcher") {
      eventDispatcherCreators.add(named.local);
    }
  }
}

function collectDispatcherName(node, eventDispatcherCreators, dispatchers) {
  if (node?.type !== "VariableDeclarator") return;
  if (node.id?.type !== "Identifier") return;
  if (node.init?.type !== "CallExpression") return;
  const callee = node.init.callee;
  if (callee?.type === "Identifier" && eventDispatcherCreators.has(callee.name)) {
    dispatchers.add(node.id.name);
  }
}

function svelteDispatchEvent(node, dispatchers) {
  if (node?.type !== "CallExpression") return null;
  if (node.callee?.type !== "Identifier" || !dispatchers.has(node.callee.name)) return null;
  const firstArg = node.arguments?.[0];
  if (firstArg?.type !== "Literal" || typeof firstArg.value !== "string") return null;
  return {
    name: firstArg.value,
    source: "dispatch-call",
    dispatcher: node.callee.name,
  };
}

function bindingNames(pattern) {
  if (!pattern) return [];
  if (pattern.type === "Identifier") return [pattern.name];
  if (pattern.type === "AssignmentPattern") return bindingNames(pattern.left);
  if (pattern.type === "RestElement") return bindingNames(pattern.argument);
  if (pattern.type === "ObjectPattern") return (pattern.properties ?? []).flatMap((property) => bindingNames(property.value));
  if (pattern.type === "ArrayPattern") return (pattern.elements ?? []).flatMap(bindingNames);
  return [];
}

function walkEstree(value, visit) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walkEstree(item, visit);
    return;
  }
  visit(value);
  for (const [key, child] of Object.entries(value)) {
    if (["loc", "start", "end"].includes(key)) continue;
    walkEstree(child, visit);
  }
}

function uniqueBy(entries, keyFn) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const key = keyFn(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function parseImportDeclaration(node) {
  const clause = node.importClause;
  const named = [];
  let namespaceName = null;
  if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    for (const element of clause.namedBindings.elements) {
      named.push({
        imported: element.propertyName?.text ?? element.name.text,
        local: element.name.text,
      });
    }
  } else if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
    namespaceName = clause.namedBindings.name.text;
  }

  return {
    specifier: moduleSpecifierText(node),
    kind: "import",
    typeOnly: clause?.isTypeOnly ?? false,
    defaultName: clause?.name?.text ?? null,
    namespaceName,
    named,
  };
}

function parseExportDeclaration(node) {
  const source = node.moduleSpecifier ? moduleSpecifierText(node) : null;
  if (!node.exportClause) {
    return [{
      name: "*",
      kind: "re-export",
      default: false,
      source,
      typeOnly: node.isTypeOnly ?? false,
    }];
  }
  if (!ts.isNamedExports(node.exportClause)) return [];

  return node.exportClause.elements.map((element) => ({
    name: element.name.text,
    imported: element.propertyName?.text ?? element.name.text,
    kind: source ? "re-export" : "export",
    default: false,
    source,
    typeOnly: node.isTypeOnly ?? false,
  }));
}

function parseTopLevelDeclaration(node) {
  if (ts.isInterfaceDeclaration(node)) {
    return declaration(node, node.name.text, "interface");
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return declaration(node, node.name.text, "type");
  }
  if (ts.isFunctionDeclaration(node)) {
    return declaration(node, node.name?.text ?? "default", "function");
  }
  if (ts.isClassDeclaration(node)) {
    return declaration(node, node.name?.text ?? "default", "class");
  }
  if (ts.isEnumDeclaration(node)) {
    return declaration(node, node.name.text, "enum");
  }
  if (ts.isVariableStatement(node)) {
    const exported = hasModifier(node, ts.SyntaxKind.ExportKeyword);
    const isDefault = hasModifier(node, ts.SyntaxKind.DefaultKeyword);
    const declarationKind = variableKind(node);
    return {
      name: node.declarationList.declarations
        .map((item) => declarationName(item.name))
        .filter(Boolean)
        .join(", "),
      kind: declarationKind,
      exported,
      default: isDefault,
    };
  }
  return null;
}

function declaration(node, name, kind) {
  return {
    name,
    kind,
    exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
    default: hasModifier(node, ts.SyntaxKind.DefaultKeyword),
  };
}

function hasModifier(node, kind) {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind);
}

function variableKind(node) {
  if ((node.declarationList.flags & ts.NodeFlags.Const) !== 0) return "const";
  if ((node.declarationList.flags & ts.NodeFlags.Let) !== 0) return "let";
  return "var";
}

function declarationName(name) {
  if (ts.isIdentifier(name)) return name.text;
  return name.getText();
}

function moduleSpecifierText(node) {
  return node.moduleSpecifier.text;
}

function resolveRelativeSpecifier(root, fromAbsolute, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("..")) return null;
  const base = path.resolve(path.dirname(fromAbsolute), specifier);
  const candidates = [];
  if (path.extname(base)) candidates.push(base);
  for (const extension of CODE_EXTENSIONS) {
    candidates.push(`${base}${extension}`);
  }
  for (const extension of CODE_EXTENSIONS) {
    candidates.push(path.join(base, `index${extension}`));
  }

  const resolved = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return resolved ? relativePath(root, resolved) : null;
}

function walkCodeFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...walkCodeFiles(path.join(dir, entry.name)));
    } else if (entry.isFile()) {
      const fullPath = path.join(dir, entry.name);
      if (isCodeFile(fullPath)) files.push(fullPath);
    }
  }
  return files;
}

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.some((extension) => filePath.endsWith(extension));
}

function scriptKindForPath(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs") || filePath.endsWith(".cjs") || filePath.endsWith(".svelte.js")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function languageForPath(filePath) {
  if (filePath.endsWith(".svelte")) return "svelte";
  if (filePath.endsWith(".tsx")) return "tsx";
  if (filePath.endsWith(".jsx")) return "jsx";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs") || filePath.endsWith(".cjs") || filePath.endsWith(".svelte.js")) {
    return "js";
  }
  return "ts";
}

function relativePath(root, filePath) {
  return normalizeRepoPath(path.relative(root, filePath));
}
