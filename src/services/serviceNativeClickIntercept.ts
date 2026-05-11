// Pure DOM-event interceptor for native Obsidian surfaces.
// Routes Ctrl/Cmd+Click on .cm-hashtag, [data-snippet-name], and
// [data-plugin-id] elements into a custom event so the binding service
// can open the linked node note.
//
// Owned by Thread 4 of the UI modernization plan.

import {
	aliasForPluginId,
	aliasForSnippetFile,
	aliasForTag,
} from './serviceAliasTokens';

interface InterceptInput {
	activeDocument: Document;
	enabled: () => boolean;
}

export function attachNativeClickInterceptor(input: InterceptInput): () => void {
	const handler = (event: MouseEvent) => {
		if (!input.enabled()) return;
		if (!event.ctrlKey && !event.metaKey) return;
		const target = event.target as HTMLElement | null;
		if (!target) return;

		const tag = target.closest<HTMLElement>('.cm-hashtag');
		if (tag) {
			const alias = aliasForTagElement(tag);
			if (alias) dispatchOpen(input.activeDocument, alias);
			return;
		}
		const snippet = target.closest<HTMLElement>('[data-snippet-name]');
		if (snippet) {
			const alias = aliasForSnippetFile(snippet.dataset.snippetName ?? '');
			if (alias) dispatchOpen(input.activeDocument, alias);
			return;
		}
		const plugin = target.closest<HTMLElement>('[data-plugin-id]');
		if (plugin) {
			const alias = aliasForPluginId(plugin.dataset.pluginId ?? '');
			if (alias) dispatchOpen(input.activeDocument, alias);
			return;
		}
	};

	input.activeDocument.addEventListener('click', handler, true);
	return () => input.activeDocument.removeEventListener('click', handler, true);
}

function aliasForTagElement(el: HTMLElement): string | null {
	const raw = el.textContent?.trim() ?? '';
	if (!raw) return null;
	return aliasForTag(raw);
}

function dispatchOpen(doc: Document, alias: string): void {
	doc.dispatchEvent(
		new CustomEvent('vm:open-node-note', {
			detail: { alias },
			bubbles: true,
		}),
	);
}
