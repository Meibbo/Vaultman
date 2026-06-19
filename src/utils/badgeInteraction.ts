export type BadgeCancelClickMode = 'double' | 'single';
export type BadgeCancelEventName = 'dblclick' | 'click';

export function normalizeBadgeCancelClickMode(
	mode: unknown,
): BadgeCancelClickMode {
	return mode === 'single' ? 'single' : 'double';
}

export function badgeCancelInteractionEvent(
	mode: BadgeCancelClickMode,
): BadgeCancelEventName {
	return mode === 'single' ? 'click' : 'dblclick';
}

export function badgeCancelInteractionLabel(
	mode: BadgeCancelClickMode,
): string {
	return mode === 'single' ? 'click to undo' : 'double-click to undo';
}

export function attachBadgeCancelInteraction(
	el: HTMLElement,
	mode: BadgeCancelClickMode,
	onCancel: (event: MouseEvent) => void,
): void {
	el.addEventListener(badgeCancelInteractionEvent(mode), (event) => {
		event.stopPropagation();
		onCancel(event);
	});
}
