/**
 * logicFiles — PURE files-domain logic (Q4 lane A).
 *
 * Projection / sort / hierarchy / labels / icons for the Files explorer.
 * ZERO `obsidian`, DOM, or Svelte imports (spec AC#1). The provider is the only
 * place that touches `app`/`TFile`; it flattens its `TFile[]` into the plain
 * `FileDescriptor[]` this module consumes, and instantiates the generic file-ref
 * type with `TFile` so the produced `TreeNode<FileMeta>` stays type-correct.
 *
 * Namespaced ids (D6): file nodes -> `file.<path>`, folder nodes -> `folder.<path>`.
 * The raw path is preserved in `meta.file.path` / `meta.folderPath` so reveal-by-path
 * and filter toggles keep working off raw keys.
 */
import type { NodeRelationKind, TreeNode } from '../types/typeTreeNode';

/** Opaque file handle the provider supplies (a `TFile` at the call site). */
export interface FileRef {
	path: string;
}

/** Plain, app-free description of a vault file. The provider builds these from `TFile`. */
export interface FileDescriptor<TRef extends FileRef = FileRef> {
	path: string;
	basename: string;
	/** Lowercase-or-original extension as reported by the vault (no leading dot). */
	extension: string;
	/** Parent folder path, '' for vault root. */
	folderPath: string;
	/** Same as folderPath; kept distinct for callers that normalize differently. */
	parentPath: string;
	mtime: number;
	ctime: number;
	/** Frontmatter property count (excludes `position`), computed by the provider. */
	propCount: number;
	/** The underlying file handle, echoed onto the produced node meta. */
	ref: TRef;
}

/** Structural meta carried by file/folder nodes (compatible with `FileMeta`). */
export interface FileNodeMeta<TRef extends FileRef = FileRef> {
	file: TRef | null;
	isFolder: boolean;
	folderPath: string;
}

export interface BuildFileTreeOptions {
	foldersFirst?: boolean;
}

const HOLARCHY: NodeRelationKind = 'holarchy';

const FILE_ID_PREFIX = 'file.';
const FOLDER_ID_PREFIX = 'folder.';

export function fileNodeId(path: string): string {
	return `${FILE_ID_PREFIX}${path}`;
}

export function folderNodeId(folderPath: string): string {
	return `${FOLDER_ID_PREFIX}${folderPath}`;
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const CODE_EXTS = new Set([
	'ts',
	'js',
	'tsx',
	'jsx',
	'json',
	'css',
	'scss',
	'html',
	'py',
	'rs',
	'go',
	'java',
	'c',
	'cpp',
	'sh',
	'yml',
	'yaml',
	'toml',
]);

/** Extension-aware fallback icon (SDF-013). Custom/Iconic icons win at render time. */
export function fileIconFor(extension: string): string {
	const ext = extension.toLowerCase();
	if (ext === '' || ext === 'md') return 'lucide-file-text';
	if (ext === 'base') return 'lucide-database';
	if (ext === 'canvas') return 'lucide-layout-dashboard';
	if (ext === 'pdf') return 'lucide-file-text';
	if (IMAGE_EXTS.has(ext)) return 'lucide-image';
	if (CODE_EXTS.has(ext)) return 'lucide-file-code';
	return 'lucide-file-question';
}

/** Non-markdown files show their extension; markdown shows none (SDF-001). */
export function fileCountLabelFor(extension: string): string | undefined {
	const ext = extension.trim();
	if (!ext) return undefined;
	return ext.toLowerCase() === 'md' ? undefined : ext;
}

/** Dotpath hidden detection — a `.`-prefixed segment anywhere hides the path. */
export function isHiddenPath(path: string): boolean {
	return path
		.split('/')
		.filter(Boolean)
		.some((segment) => segment.startsWith('.'));
}

/**
 * Pure flat filter by name (basename) and folder (path). When `getSearchBuffer`
 * is supplied, both queries match against the precomputed lowercase buffer.
 * Does not mutate input.
 */
export function filterFlat<TRef extends FileRef>(
	files: readonly FileDescriptor<TRef>[],
	name: string,
	folder: string,
	getSearchBuffer?: (path: string) => string,
): FileDescriptor<TRef>[] {
	const nameQuery = name.trim().toLowerCase();
	const folderQuery = folder.trim().toLowerCase();
	if (!nameQuery && !folderQuery) return [...files];

	return files.filter((file) => {
		if (getSearchBuffer) {
			const buffer = getSearchBuffer(file.path);
			return (
				(!nameQuery || buffer.includes(nameQuery)) &&
				(!folderQuery || buffer.includes(folderQuery))
			);
		}
		return (
			(!nameQuery || file.basename.toLowerCase().includes(nameQuery)) &&
			(!folderQuery || file.path.toLowerCase().includes(folderQuery))
		);
	});
}

/**
 * Pure sort comparator over descriptors. Mirrors the legacy provider semantics:
 * `date` keys off mtime (asc dir = newest first, as stable shipped), `count` off
 * the supplied `propCount`, `ctime` off ctime, `extension` off extension, otherwise
 * basename localeCompare. Does not mutate input.
 */
export function sortFileDescriptors<TRef extends FileRef>(
	files: readonly FileDescriptor<TRef>[],
	sortBy: string,
	direction: 'asc' | 'desc',
): FileDescriptor<TRef>[] {
	const dir = direction === 'asc' ? 1 : -1;
	const out = [...files];
	if (sortBy === 'count') {
		return out.sort((a, b) => dir * (a.propCount - b.propCount));
	}
	if (sortBy === 'date') {
		// legacy: asc multiplies (b.mtime - a.mtime) => newest first for asc
		return out.sort((a, b) => dir * (b.mtime - a.mtime));
	}
	if (sortBy === 'ctime') {
		return out.sort((a, b) => dir * (b.ctime - a.ctime));
	}
	if (sortBy === 'extension') {
		return out.sort(
			(a, b) => dir * (a.extension.localeCompare(b.extension) || a.basename.localeCompare(b.basename)),
		);
	}
	if (sortBy === 'path') {
		return out.sort((a, b) => dir * a.path.localeCompare(b.path));
	}
	return out.sort((a, b) => dir * a.basename.localeCompare(b.basename));
}

/**
 * Build a folder/file hierarchy from a FLAT, ALREADY-SORTED descriptor list.
 *
 * SDF-003 invariant: the caller's order is preserved inside each sibling group.
 * Folders are created on first appearance (so folder order follows the first file
 * that needs them) and `foldersFirst` only PARTITIONS folders ahead of files via a
 * stable sort — it never re-sorts file siblings by label/path.
 */
export function buildFileTree<TRef extends FileRef>(
	files: readonly FileDescriptor<TRef>[],
	options: BuildFileTreeOptions = {},
): TreeNode<FileNodeMeta<TRef>>[] {
	type Node = TreeNode<FileNodeMeta<TRef>>;
	const root: Node[] = [];
	const folderMap = new Map<string, Node>();

	const ensureFolder = (folderPath: string): Node | null => {
		if (!folderPath) return null;
		const existing = folderMap.get(folderPath);
		if (existing) return existing;

		const parts = folderPath.split('/').filter(Boolean);
		const parentPath = parts.slice(0, -1).join('/');
		const parentNode = ensureFolder(parentPath);
		const folderNode: Node = {
			id: folderNodeId(folderPath),
			label: parts[parts.length - 1] ?? folderPath,
			depth: Math.max(0, parts.length - 1),
			children: [],
			showCaret: true,
			relation: HOLARCHY,
			meta: { file: null, isFolder: true, folderPath },
		};
		folderMap.set(folderPath, folderNode);
		(parentNode?.children ?? root).push(folderNode);
		return folderNode;
	};

	for (const file of files) {
		const folderPath = file.folderPath === '/' ? '' : file.folderPath;
		const parentFolder = folderPath ? ensureFolder(folderPath) : null;
		const extension = file.extension?.trim() ?? '';
		const isMarkdown = extension.toLowerCase() === 'md';

		const fileNode: Node = {
			id: fileNodeId(file.path),
			label: file.basename,
			icon: fileIconFor(extension),
			count: isMarkdown ? file.propCount : undefined,
			countLabel: fileCountLabelFor(extension),
			depth: folderPath ? folderPath.split('/').filter(Boolean).length : 0,
			children: [],
			relation: HOLARCHY,
			meta: { file: file.ref, isFolder: false, folderPath },
		};

		(parentFolder?.children ?? root).push(fileNode);
	}

	if (options.foldersFirst) orderFoldersFirst(root);
	return root;
}

/** Stable partition: folders before files at each level, siblings otherwise untouched. */
function orderFoldersFirst<TRef extends FileRef>(nodes: TreeNode<FileNodeMeta<TRef>>[]): void {
	stableSort(nodes, (a, b) => Number(b.meta.isFolder) - Number(a.meta.isFolder));
	for (const node of nodes) {
		if (node.children?.length) orderFoldersFirst(node.children);
	}
}

/** In-place stable sort (Array.prototype.sort is stable in modern V8, but be explicit). */
function stableSort<T>(arr: T[], cmp: (a: T, b: T) => number): void {
	const indexed = arr.map((value, index) => ({ value, index }));
	indexed.sort((a, b) => cmp(a.value, b.value) || a.index - b.index);
	for (let i = 0; i < arr.length; i++) arr[i] = indexed[i].value;
}
