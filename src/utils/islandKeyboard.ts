const ISLAND_FOCUSABLE_SELECTOR = [
	'button:not(:disabled)',
	'input:not(:disabled)',
	'select:not(:disabled)',
	'textarea:not(:disabled)',
	'a[href]',
	'[role="button"][tabindex]:not([tabindex="-1"])',
].join(', ');

export function islandFocusableElements(root: HTMLElement): HTMLElement[] {
	return Array.from(
		root.querySelectorAll<HTMLElement>(ISLAND_FOCUSABLE_SELECTOR),
	).filter((element) => {
		if (element.hasAttribute('disabled')) return false;
		if (element.getAttribute('aria-hidden') === 'true') return false;
		if (element.closest('[aria-hidden="true"], [inert]')) return false;
		if (
			typeof element.getClientRects === 'function' &&
			element.getClientRects().length === 0
		) {
			return false;
		}
		const view = element.ownerDocument?.defaultView;
		if (view) {
			const style = view.getComputedStyle(element);
			if (style.display === 'none' || style.visibility === 'hidden') return false;
		}
		return true;
	});
}

export function focusFirstIslandControl(root: HTMLElement | null): void {
	if (!root) return;
	const first = islandFocusableElements(root)[0];
	if (first && typeof first.focus === 'function') {
		first.focus();
		return;
	}
	root.tabIndex = -1;
	if (typeof root.focus === 'function') root.focus();
}

export function trapIslandTabKey(
	event: KeyboardEvent,
	root: HTMLElement | null,
): void {
	if (event.key !== 'Tab' || !root) return;
	const focusable = islandFocusableElements(root);
	if (focusable.length === 0) {
		event.preventDefault();
		root.tabIndex = -1;
		if (typeof root.focus === 'function') root.focus();
		return;
	}

	const active = root.ownerDocument.activeElement;
	const index = focusable.indexOf(active as HTMLElement);
	if (index === -1) {
		event.preventDefault();
		focusable[event.shiftKey ? focusable.length - 1 : 0].focus();
	} else if (event.shiftKey && index === 0) {
		event.preventDefault();
		focusable[focusable.length - 1].focus();
	} else if (!event.shiftKey && index === focusable.length - 1) {
		event.preventDefault();
		focusable[0].focus();
	}
}

export function handleIslandKeydown(
	event: KeyboardEvent,
	root: HTMLElement | null,
	onEscape: () => void,
): void {
	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		onEscape();
		return;
	}
	trapIslandTabKey(event, root);
}

/** Preserve button keyboard activation for the existing Obsidian-styled divs. */
export function wireIslandButton(
	element: HTMLElement,
	onActivate: () => void,
): void {
	element.setAttribute('role', 'button');
	if (element.getAttribute('tabindex') === null) {
		element.setAttribute('tabindex', '0');
	}

	let spaceArmed = false;
	element.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (!event.repeat) onActivate();
		} else if (event.key === ' ') {
			event.preventDefault();
			if (!event.repeat) spaceArmed = true;
		}
	});
	element.addEventListener('keyup', (event: KeyboardEvent) => {
		if (event.key !== ' ') return;
		event.preventDefault();
		if (spaceArmed) onActivate();
		spaceArmed = false;
	});
	element.addEventListener('blur', () => {
		spaceArmed = false;
	});
}

export function menuEventForElement(element: HTMLElement): MouseEvent {
	const rect = element.getBoundingClientRect();
	const view = element.ownerDocument.defaultView;
	const MouseEventConstructor = view?.MouseEvent ?? MouseEvent;
	return new MouseEventConstructor('click', {
		bubbles: true,
		cancelable: true,
		clientX: rect.left + rect.width / 2,
		clientY: rect.bottom,
		view: view ?? undefined,
	});
}
