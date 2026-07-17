function cssPixels(value: string): number {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * HTMLElement.clientWidth includes inline padding. Virtualized surfaces need
 * the content-box width so reserved overlay lanes do not receive rows/cards.
 */
export function elementContentWidth(element: HTMLElement): number {
	const ownerWindow = element.ownerDocument.defaultView;
	if (!ownerWindow) return element.clientWidth;
	const style = ownerWindow.getComputedStyle(element);
	return Math.max(
		0,
		element.clientWidth -
			cssPixels(style.paddingLeft) -
			cssPixels(style.paddingRight),
	);
}
