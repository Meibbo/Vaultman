export function normalizedSnapshotHtml(element: Element | null): string {
	if (!element) throw new Error('Expected a rendered root element for snapshot');
	return element.outerHTML.replace(/[ \t]+$/gm, '');
}
