function isTFile(file: unknown): file is TFile {
	return file instanceof TFile || (typeof file === 'object' && file !== null && 'path' in file);
}

/**
 * NodeBindingService — implements the 0/1/N alias-match binding algorithm
 * for non-file and non-markdown nodes (SASI: tags, properties, values, folders, snippets, plugins, non-md files).
 *
 * Directives:
 * 1. Frontmatter strictly in `aliases` (array/string, never singular alias).
 * 2. New note creation delegates to `app.fileManager.getNewFileParent("")`.
 * 3. Folder Node-Notes resolution hierarchy:
 *    a) C-Node with same name (`folder/folder.md`, e.g. `+/+.md`)
 *    b) Note with alias matching folder path
 *    c) Creation of `folder/folder.md` inside that folder.
 * 4. Hyperlinks in properties/values: `[[Target|Alias]]` -> resolved directly via `getFirstLinkpathDest`.
 * 5. File adoption on collision: if target file exists, adopt it and ensure alias with `processFrontMatter`.
 * 6. Non-markdown files (`.pdf`, `.canvas`, etc.): support linked node-notes via `aliases: ["file.ext"]`.
 */

import { Notice, TFile, type App } from "obsidian";

export type BindingNodeKind =
	| "tag"
	| "prop"
	| "value"
	| "folder"
	| "file"
	| "snippet"
	| "template"
	| "plugin";

export interface BindingNodeInput {
	kind: BindingNodeKind;
	label: string;
	/** Optional: full prop name when kind is prop/value. */
	propName?: string;
	/** Optional: raw value string when kind is value. */
	rawValue?: string;
	/** Optional: full tag path when kind is tag. Falls back to label. */
	tagPath?: string;
	/** Optional: full path when kind is folder or non-markdown file. */
	path?: string;
	/** Optional: stable manifest id when kind is plugin. Falls back to label. */
	pluginId?: string;
	/** Optional: snippet name when kind is snippet. Falls back to label. */
	snippetName?: string;
}

export interface BindingOptions {
	newLeaf?: boolean;
}

export interface BindingResult {
	outcome: "created" | "opened" | "adopted" | "routed";
	token: string;
	matchCount: number;
	filePath?: string;
}

export interface NodeBindingFilterRouter {
	(token: string): void;
}

export interface NodeBindingDeps {
	app: App;
	router?: NodeBindingFilterRouter;
	notify?: (message: string) => void;
}

/**
 * Extract target from wikilink formatted value: [[Target|Alias]] -> Target, [[Target]] -> Target
 */
export function extractWikilinkTarget(value: string): string | null {
	const trimmed = value.trim();
	const match = /^\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]$/.exec(trimmed);
	return match ? match[1].trim() : null;
}

/**
 * Compute the alias token used to match a binding note.
 *
 * - prop -> [propname]
 * - tag  -> #tagname
 * - snippet -> $snippetname
 * - plugin -> %pluginid
 * - file/folder/value/template -> the node path or label verbatim
 */
export function computeAliasToken(node: BindingNodeInput): string {
	const label = node.label.trim();
	switch (node.kind) {
		case "prop":
			return "[" + (node.propName ?? label) + "]";
		case "tag":
			return "#" + (node.tagPath ?? label).replace(/^#/, "");
		case "snippet":
			return "$" + label.replace(/^\$/, "");
		case "plugin":
			return "%" + (node.pluginId ?? label).trim().replace(/^%/, "");
		case "file":
		case "folder":
			return node.path ?? label;
		case "value":
		case "template":
		default:
			return label;
	}
}

/**
 * Search the vault metadataCache for notes whose `aliases` frontmatter
 * contains the supplied token. Frontmatter `aliases` may live as a string or array.
 */
export function findNotesByAlias(app: App, token: string): TFile[] {
	const out: TFile[] = [];
	const files = app.vault?.getMarkdownFiles?.() ?? [];
	for (const file of files) {
		const fm = app.metadataCache?.getFileCache(file)?.frontmatter ?? {};
		if (aliasesContain(fm.aliases, token)) out.push(file);
	}
	return out;
}

export function aliasesContain(raw: unknown, token: string): boolean {
	if (raw == null) return false;
	if (Array.isArray(raw)) return raw.some((v) => aliasMatches(v, token));
	return aliasMatches(raw, token);
}

function aliasMatches(value: unknown, token: string): boolean {
	if (typeof value === "string") return value === token;
	if (typeof value === "number" || typeof value === "boolean") return String(value) === token;
	return false;
}

export function titleToFilename(title: string): string {
	const cleaned = title.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
	return cleaned.length > 0 ? cleaned : "binding-note";
}


export async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
	const normalized = folderPath.replace(/^[/\\]+|[/\\]+$/g, "");
	if (!normalized) return;
	const segments = normalized.split("/");
	let current = "";
	for (const seg of segments) {
		current = current ? current + "/" + seg : seg;
		const existing = app.vault?.getAbstractFileByPath?.(current);
		if (!existing) {
			try {
				await app.vault?.createFolder?.(current);
			} catch (_) {}
		}
	}
}

export class NodeBindingService {
	constructor(private deps: NodeBindingDeps) {}

	/**
	 * Resolve binding for a node. Returns a `BindingResult`.
	 */
	async bindOrCreate(node: BindingNodeInput, options?: BindingOptions): Promise<BindingResult> {
		const app = this.deps.app;

		// 1. Wikilink handling in prop/value: [[Target|Alias]]
		if (node.kind === "value" || node.kind === "prop") {
			const wikilinkTarget = extractWikilinkTarget(node.label);
			if (wikilinkTarget) {
				const dest = app.metadataCache?.getFirstLinkpathDest?.(wikilinkTarget, "");
				if (isTFile(dest)) {
					await this.openLeaf(dest, options?.newLeaf);
					return { outcome: "opened", token: wikilinkTarget, matchCount: 1, filePath: dest.path };
				}
			}
		}

		// 1b. Wikilink sin destino existente: título, token y alias usan el
	// target sin brackets (Obsidian no reconoce aliases con [[]] y el
	// filename no debe llevarlos). El fast-path de arriba ya abrió el
	// destino cuando existía.
	if (node.kind === "value" || node.kind === "prop") {
		const wikilinkTarget = extractWikilinkTarget(node.label);
		if (wikilinkTarget) {
			node = { ...node, label: wikilinkTarget };
		}
	}

	// 2. Folder Node-Notes resolution hierarchy:
		//    a) C-Node with same name (folder/folder.md)
		//    b) Aliases matching folder path
		//    c) Creation of folder/folder.md inside the folder
		if (node.kind === "folder") {
			const folderPath = (node.path ?? node.label).replace(/^[/\\]+|[/\\]+$/g, "");
			const folderName = folderPath.split("/").pop() ?? folderPath;
			const cNodePath = folderPath ? folderPath + "/" + folderName + ".md" : folderName + ".md";

			const cNodeFile = app.vault?.getAbstractFileByPath?.(cNodePath);
			if (isTFile(cNodeFile)) {
				await this.openLeaf(cNodeFile, options?.newLeaf);
				return { outcome: "opened", token: folderPath, matchCount: 1, filePath: cNodeFile.path };
			}

			// Check aliases
			const matches = findNotesByAlias(app, folderPath);
			if (matches.length === 1) {
				await this.openLeaf(matches[0], options?.newLeaf);
				return { outcome: "opened", token: folderPath, matchCount: 1, filePath: matches[0].path };
			}
			if (matches.length > 1) {
				return this.routeToFilter(folderPath, matches.length);
			}

			// Create C-Node inside folder
			await ensureFolderExists(app, folderPath);
			return this.createOrAdoptNote(cNodePath, folderPath, folderName, options?.newLeaf);
		}

		// 3. Standard 0/1/N resolution for non-folder nodes (tags, props, values, snippets, plugins, files)
		const token = computeAliasToken(node);
		const matches = findNotesByAlias(app, token);
		if (matches.length === 1) {
			await this.openLeaf(matches[0], options?.newLeaf);
			return { outcome: "opened", token, matchCount: 1, filePath: matches[0].path };
		}
		if (matches.length > 1) {
			return this.routeToFilter(token, matches.length);
		}

		// 4. Create new note in Obsidian default new file parent folder
		const defaultParent = app.fileManager?.getNewFileParent?.("") ?? null;
		const parentPath = defaultParent && defaultParent.path && defaultParent.path !== "/" ? defaultParent.path + "/" : "";
		const filename = titleToFilename(titleLabelForNode(node));
		const targetPath = parentPath + filename + ".md";
		if (parentPath) await ensureFolderExists(app, parentPath);
		return this.createOrAdoptNote(targetPath, token, filename, options?.newLeaf);
	}

	private async createOrAdoptNote(
		path: string,
		token: string,
		_titleLabel: string,
		newLeaf?: boolean,
	): Promise<BindingResult> {
		const app = this.deps.app;
		const existing = app.vault?.getAbstractFileByPath?.(path);

		if (isTFile(existing)) {
			// Adopt existing file and ensure alias via processFrontMatter
			if (app.fileManager?.processFrontMatter) {
				await app.fileManager.processFrontMatter(existing, (fm) => {
					if (!fm.aliases) {
						fm.aliases = [token];
					} else if (Array.isArray(fm.aliases)) {
						if (!fm.aliases.includes(token)) fm.aliases.push(token);
					} else if (typeof fm.aliases === "string") {
						if (fm.aliases !== token) fm.aliases = [fm.aliases, token];
					}
				});
			}
			await this.openLeaf(existing, newLeaf);
			return { outcome: "adopted", token, matchCount: 1, filePath: existing.path };
		}

		// Create fresh note with canonical aliases frontmatter
		const yaml = "---\naliases:\n  - " + quoteYamlValue(token) + "\n---\n";
		const created = await app.vault.create(path, yaml);
		await this.openLeaf(created, newLeaf);
		return { outcome: "created", token, matchCount: 0, filePath: created.path };
	}

	private async routeToFilter(token: string, matchCount: number): Promise<BindingResult> {
		this.deps.router?.(token);
		const msg = "Hay " + matchCount + " notas con este alias. Filtrando...";
		if (this.deps.notify) {
			this.deps.notify(msg);
		} else {
			try {
				new Notice(msg);
			} catch (_) {}
		}
		return { outcome: "routed", token, matchCount };
	}

	private async openLeaf(file: TFile, newLeaf?: boolean): Promise<void> {
		const ws = this.deps.app.workspace as typeof this.deps.app.workspace & {
			getLeaf?: (newLeaf?: boolean | string) => { openFile?: (file: TFile) => Promise<void> } | null;
			openLinkText?: (linktext: string, sourcePath: string, newLeaf?: boolean) => unknown;
		};
		const leaf = ws?.getLeaf?.(newLeaf ? "tab" : false);
		if (leaf?.openFile) {
			await leaf.openFile(file);
			return;
		}
		await ws?.openLinkText?.(file.path, "", !!newLeaf);
	}
}

export function titleLabelForNode(node: BindingNodeInput): string {
	const label = node.label.trim();
	switch (node.kind) {
		case "prop":
			return (node.propName ?? label).replace(/^\[/, "").replace(/\]$/, "");
		case "tag":
			return (node.tagPath ?? label).replace(/^#/, "");
		case "snippet":
			return label.replace(/^\$/, "");
		case "plugin":
			return (node.label || node.pluginId || "").replace(/^%/, "");
		case "file":
		case "folder":
			return (node.path ?? label).split("/").pop() ?? label;
		case "value":
		case "template":
		default:
			return label;
	}
}

export function quoteYamlValue(token: string): string {
	const needsQuoting = /[#:\[\]{},&*!|>\x27"\x60%@$]/.test(token);
	if (!needsQuoting) return token;
	return "'" + token.replace(/'/g, "''") + "'";
}
