import {
	MarkdownView,
	type App,
	type TFile,
	type WorkspaceLeaf,
} from 'obsidian';

export interface OpenFileAtOffsetOptions {
	/** Reproduce Core's selected-match decoration when the caller has it. */
	match?: {
		content: string;
		range: readonly [number, number];
	};
	/** Frontmatter is navigable only from an explicit Source view. */
	source?: 'inline' | 'frontmatter';
}

function leafFilePath(leaf: WorkspaceLeaf): string | undefined {
	const view = leaf.view as { file?: TFile } | undefined;
	if (view?.file?.path) return view.file.path;
	const state = leaf.getViewState().state as { file?: unknown } | undefined;
	return typeof state?.file === 'string' ? state.file : undefined;
}

function leafForFile(app: App, file: TFile): WorkspaceLeaf {
	const workspace = app.workspace;
	const leaves = workspace.getLeavesOfType('markdown');
	const matching = leaves.filter((leaf) => leafFilePath(leaf) === file.path);
	const activeView = workspace.getActiveViewOfType(MarkdownView);
	const active = matching.find((leaf) => leaf.view === activeView);
	if (active) return active;
	return (
		matching.find((leaf) => leaf.getViewState().pinned === true) ??
		matching[0] ??
		workspace.getLeaf(false)
	);
}

function isExplicitSourceView(leaf: WorkspaceLeaf, file: TFile): boolean {
	if (leafFilePath(leaf) !== file.path) return false;
	const view = leaf.view as { getMode?: () => string } | undefined;
	const state = leaf.getViewState().state as
		{ mode?: unknown; source?: unknown } | undefined;
	return (
		view?.getMode?.() === 'source' &&
		state?.mode === 'source' &&
		state.source === true
	);
}

/**
 * Open a file with the cursor placed at a character offset. Content matches
 * additionally pass Core's match state; tags use the same leaf selection and
 * cursor/scroll path without inventing a second navigation implementation.
 */
export async function openFileAtOffset(
	app: App,
	file: TFile,
	offset: number,
	options: OpenFileAtOffsetOptions = {},
): Promise<boolean> {
	const leaf = leafForFile(app, file);
	if (options.source === 'frontmatter' && !isExplicitSourceView(leaf, file)) {
		return false;
	}
	await leaf.openFile(file, {
		active: true,
		...(options.match
			? {
					eState: {
						match: {
							content: options.match.content,
							matches: [options.match.range],
						},
					},
				}
			: {}),
	});
	app.workspace.setActiveLeaf(leaf, { focus: true });
	const view: MarkdownView | null =
		leaf.view instanceof MarkdownView
			? leaf.view
			: app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) return false;

	const position = view.editor.offsetToPos(offset);
	view.editor.setCursor(position);
	view.editor.scrollIntoView({ from: position, to: position }, true);
	return true;
}
