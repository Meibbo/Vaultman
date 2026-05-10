/**
 * NodeBindingService — implements the 0/1/N alias-match binding algorithm
 * for non-file nodes.
 *
 * Spec: docs/work/hardening/specs/2026-05-07-multifacet-2/05-note-binding-and-set.md
 *
 * Given a non-file node (tag/prop/value/folder/snippet/template/plugin) this service
 * computes a per-kind alias token, searches the vault metadataCache for
 * notes whose `aliases` frontmatter contains that token, and then:
 *   - 0 matches: creates a new note in the configured binding folder using
 *     the node label as basename, with `aliases: [token]`, and opens it.
 *   - 1 match: opens the matching note (no mutation).
 *   - 2+ matches: routes to the filter pane with a synthetic
 *     `aliases has <token>` filter and surfaces a notice.
 *
 * The service intentionally never overwrites frontmatter outside of the
 * `aliases` key. Note creation goes through `app.vault.create` with a
 * minimal frontmatter block, and existing notes are never touched.
 */

import { TFile, type App } from 'obsidian';
import type { TreeNode } from '../types/typeNode';
import { serviceMessage } from './serviceMessage';

export type BindingNodeKind =
	| 'tag'
	| 'prop'
	| 'value'
	| 'folder'
	| 'snippet'
	| 'template'
	| 'plugin';

export interface BindingNodeInput {
	kind: BindingNodeKind;
	label: string;
	/** Optional: full prop name when kind is `prop`/`value`. */
	propName?: string;
	/** Optional: full tag path when kind is `tag`. Falls back to `label`. */
	tagPath?: string;
	/** Optional: stable manifest id when kind is `plugin`. Falls back to `label`. */
	pluginId?: string;
}

export interface BindingResult {
	outcome: 'created' | 'opened' | 'routed';
	token: string;
	matchCount: number;
	filePath?: string;
}

export interface NodeBindingFilterRouter {
	/**
	 * Route to the filter pane and add a synthetic
	 * `aliases has <token>` rule. The implementation is supplied by the
	 * UI shell so this service stays free of svelte/store deps.
	 */
	(token: string): void;
}

export interface NodeBindingDeps {
	app: App;
	getFolder(): string;
	router?: NodeBindingFilterRouter;
}

/**
 * Compute the alias token used to match a binding note.
 *
 * - prop -> `[propname]`
 * - tag  -> `#tagname`
 * - snippet -> `$snippetname`
 * - plugin -> `%pluginid` (manifest id preferred over display label)
 * - folder/value/template -> the node label verbatim
 */
export function computeAliasToken(node: BindingNodeInput): string {
	const label = node.label.trim();
	switch (node.kind) {
		case 'prop':
			return `[${node.propName ?? label}]`;
		case 'tag':
			return `#${(node.tagPath ?? label).replace(/^#/, '')}`;
		case 'snippet':
			return `$${label.replace(/^\$/, '')}`;
		case 'plugin':
			return `%${(node.pluginId ?? label).trim().replace(/^%/, '')}`;
		case 'folder':
		case 'value':
		case 'template':
		default:
			return label;
	}
}

/**
 * Convert an `ExplorerProvider`-style TreeNode into a `BindingNodeInput`.
 * Returns `null` when the node lacks the metadata required to produce a
 * stable token (e.g. a synthetic file row).
 */
export function nodeToBindingInput(
	kind: BindingNodeKind,
	node: TreeNode<unknown>,
): BindingNodeInput | null {
	const label = node.label?.trim();
	if (!label) return null;
	const meta = (node.meta ?? {}) as {
		propName?: string;
		tagPath?: string;
		pluginId?: string;
		rawValue?: string;
		isValueNode?: boolean;
	};
	if (kind === 'prop' || kind === 'value') {
		return {
			kind,
			label: meta.rawValue ?? label,
			propName: meta.propName,
		};
	}
	if (kind === 'tag') {
		return { kind, label, tagPath: meta.tagPath };
	}
	if (kind === 'plugin') {
		return { kind, label, pluginId: meta.pluginId };
	}
	return { kind, label };
}

/**
 * Search the vault metadataCache for notes whose `aliases` frontmatter
 * contains the supplied token. Aliases may live as a string or an array.
 */
export function findNotesByAlias(app: App, token: string): TFile[] {
	const out: TFile[] = [];
	const files = app.vault.getMarkdownFiles();
	for (const file of files) {
		const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		if (aliasesContain(fm.aliases, token)) out.push(file);
	}
	return out;
}

function aliasesContain(raw: unknown, token: string): boolean {
	if (raw == null) return false;
	if (Array.isArray(raw)) return (raw as unknown[]).some((v) => aliasMatches(v, token));
	return aliasMatches(raw, token);
}

function aliasMatches(value: unknown, token: string): boolean {
	if (typeof value === 'string') return value === token;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value) === token;
	return false;
}

function titleToFilename(title: string): string {
	const cleaned = title.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
	return cleaned.length > 0 ? cleaned : 'binding-note';
}

function joinFolder(folder: string, name: string): string {
	const trimmed = folder.replace(/^\/+|\/+$/g, '');
	return trimmed ? `${trimmed}/${name}.md` : `${name}.md`;
}

export class NodeBindingService {
	constructor(private deps: NodeBindingDeps) {}

	/**
	 * Resolve binding for a non-file node. Returns a `BindingResult`
	 * describing the outcome so callers (and tests) can verify behaviour
	 * without intercepting workspace.openLinkText.
	 */
	async bindOrCreate(node: BindingNodeInput): Promise<BindingResult> {
		const token = computeAliasToken(node);
		const matches = findNotesByAlias(this.deps.app, token);
		if (matches.length === 0) return this.createBindingNote(token, titleLabelForNode(node));
		if (matches.length === 1) return this.openExisting(token, matches[0]);
		return this.routeToFilter(token, matches.length);
	}

	private async createBindingNote(token: string, titleLabel: string): Promise<BindingResult> {
		const folder = this.deps.getFolder();
		const filename = titleToFilename(titleLabel);
		const path = joinFolder(folder, filename);
		const yaml = `---\naliases:\n  - ${quoteYamlValue(token)}\n---\n`;
		const created = await this.deps.app.vault.create(path, yaml);
		await this.openInActiveLeaf(created);
		return { outcome: 'created', token, matchCount: 0, filePath: created.path };
	}

	private async openExisting(token: string, file: TFile): Promise<BindingResult> {
		await this.openInActiveLeaf(file);
		return { outcome: 'opened', token, matchCount: 1, filePath: file.path };
	}

	private async routeToFilter(token: string, matchCount: number): Promise<BindingResult> {
		this.deps.router?.(token);
		serviceMessage.warning(`Hay ${matchCount} notas con este alias. Filtrando...`);
		return { outcome: 'routed', token, matchCount };
	}

	private async openInActiveLeaf(file: TFile): Promise<void> {
		const ws = this.deps.app.workspace as typeof this.deps.app.workspace & {
			getLeaf?: (newLeaf?: boolean) => { openFile?: (file: TFile) => Promise<void> } | null;
			openLinkText?: (linktext: string, sourcePath: string, newLeaf?: boolean) => unknown;
		};
		const leaf = ws.getLeaf?.(false);
		if (leaf?.openFile) {
			await leaf.openFile(file);
			return;
		}
		await ws.openLinkText?.(file.path, '', false);
	}
}

function titleLabelForNode(node: BindingNodeInput): string {
	const label = node.label.trim();
	switch (node.kind) {
		case 'prop':
			return label.replace(/^\[/, '').replace(/\]$/, '');
		case 'tag':
			return label.replace(/^#/, '');
		case 'snippet':
			return label.replace(/^\$/, '');
		case 'plugin':
			return label.replace(/^%/, '');
		case 'folder':
		case 'value':
		case 'template':
		default:
			return label;
	}
}

function quoteYamlValue(token: string): string {
	// Single-quote tokens that contain YAML-significant characters so the
	// file round-trips through stringifyYaml without surprises.
	const needsQuoting = /[#:[\]{},&*!|>'"%@`]/.test(token);
	if (!needsQuoting) return token;
	return `'${token.replace(/'/g, "''")}'`;
}
