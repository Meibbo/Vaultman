import type { MarkdownView } from 'obsidian';
import type {
	VaultmanDragNodePayload,
	VaultmanDragPayload,
} from './dragPayload';

export function tagDragNodes(
	payload: VaultmanDragPayload,
): Extract<VaultmanDragNodePayload, { kind: 'tag' }>[] {
	const nodes = payload.selection?.length ? payload.selection : [payload];
	return nodes.filter(
		(node): node is Extract<VaultmanDragNodePayload, { kind: 'tag' }> =>
			node.kind === 'tag',
	);
}

export function tagTextForDrop(
	nodes: Array<Extract<VaultmanDragNodePayload, { kind: 'tag' }>>,
): string {
	return nodes.map((node) => `#${node.tagPath}`).join(' ');
}

export function shouldAppendTagDrop(target: EventTarget | null): boolean {
	if (typeof HTMLElement === 'undefined') return true;
	if (!(target instanceof HTMLElement)) return true;
	const lineEl = target.closest('.cm-line');
	if (!lineEl) return true;
	return shouldAppendTagDropFromLineText(lineEl.textContent ?? '');
}

export function shouldAppendTagDropFromLineText(lineText: string): boolean {
	return lineText.trim().length === 0;
}

/**
 * Separator a anteponer a un tag que se suelta junto a texto: lee el
 * caracter previo al caret y solo pide un espacio si ahi hay algo que
 * no sea ya un espacio o salto de linea. U121-054.
 */
export function tagSeparatorBeforeCaret(
	lineText: string,
	caretOffset: number,
): string {
	const previous = caretOffset > 0 ? lineText[caretOffset - 1] : undefined;
	if (previous === undefined) return '';
	return /\s/.test(previous) ? '' : ' ';
}

export function isMarkdownDropTarget(target: EventTarget | null): boolean {
	if (typeof HTMLElement === 'undefined') return false;
	if (!(target instanceof HTMLElement)) return false;
	return Boolean(
		target.closest(
			'.cm-content, .cm-line, .cm-editor, .cm-scroller, .markdown-source-view, .markdown-preview-view, .workspace-leaf-content[data-type="markdown"]',
		),
	);
}

export function appendTagsToMarkdownView(
	view: MarkdownView,
	tagText: string,
): void {
	const editor = view.editor;
	const lastLine = editor.lastLine();
	const lastLineText = editor.getLine(lastLine);
	const prefix = lastLineText.trim().length === 0 ? '' : '\n';
	editor.replaceRange(prefix + tagText, {
		line: lastLine,
		ch: lastLineText.length,
	});
}