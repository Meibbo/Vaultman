import type { BindingNodeInput } from '../services/serviceNodeBinding';

/**
 * U130 A15: what "search selection in Vaultman" searches for when the
 * selection is a native node (a node-note pill, a tag in the editor, a folder
 * in the file explorer). It is the SAME contract as the editor-menu entry:
 * plain text for the content explorer, never a filter. The previous wiring
 * injected a `specific_value` tag filter for every kind, so a folder click
 * produced a fake tag chip nobody asked for.
 *
 * Returns null for an empty query so the caller can bail out instead of
 * opening the search box on nothing.
 */
export function nativeSurfaceSearchQuery(node: BindingNodeInput): string | null {
	let query: string;
	switch (node.kind) {
		case 'tag':
			// Inline tags carry the `#`, frontmatter ones do not; the bare path
			// matches both in a text search.
			query = (node.tagPath ?? node.label).replace(/^#/, '');
			break;
		case 'prop':
			query = node.propName ?? node.label;
			break;
		case 'value':
			query = node.rawValue ?? node.label;
			break;
		case 'folder':
		case 'file': {
			// A path is not what the text says; its last segment is.
			const path = node.path ?? node.label;
			query = path.split('/').filter(Boolean).pop() ?? path;
			break;
		}
		default:
			query = node.label;
	}
	query = query.trim();
	return query.length > 0 ? query : null;
}
