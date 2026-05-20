export type NavTopology = 'linear' | 'planar' | 'planar-drill';

export interface KeyboardNavModifiers {
	additive: boolean;
	range: boolean;
}

export interface KeyboardNavContext {
	topology: NavTopology;
	orderedIds: () => readonly string[];
	columnsAt?: (id: string) => number;
	pageStep?: number;
	isExpandable: (id: string) => boolean;
	isExpanded: (id: string) => boolean;
	parentOf: (id: string) => string | null;
	firstChildOf: (id: string) => string | null;
	labelOf: (id: string) => string;
	moveFocus: (direction: 1 | -1, modifiers: KeyboardNavModifiers) => void;
	focusEdge: (edge: 'home' | 'end', modifiers: Pick<KeyboardNavModifiers, 'range'>) => void;
	focusId: (id: string) => void;
	movePage: (direction: 1 | -1, modifiers: Pick<KeyboardNavModifiers, 'range'>) => void;
	toggleSelect: (modifiers: KeyboardNavModifiers) => void;
	selectAll: () => void;
	expand: (id: string) => void;
	collapse: (id: string) => void;
	activate: (id: string, e: KeyboardEvent) => void;
	drill?: {
		descend: (id: string) => boolean;
		ascend: () => boolean;
	};
}

export interface KeyboardNavResult {
	handled: boolean;
}

export interface KeyboardNavController {
	handleKeydown(focusedId: string, e: KeyboardEvent): KeyboardNavResult;
	resetTypeAhead(): void;
}

const TYPE_AHEAD_TIMEOUT_MS = 500;

export function createKeyboardNav(ctx: KeyboardNavContext): KeyboardNavController {
	let buffer = '';
	let timer: ReturnType<Window['setTimeout']> | null = null;

	function resetTypeAhead(): void {
		buffer = '';
		if (timer !== null) {
			timerWindow().clearTimeout(timer);
			timer = null;
		}
	}

	function isPlanar(): boolean {
		return ctx.topology === 'planar' || ctx.topology === 'planar-drill';
	}

	function columnsFor(id: string): number {
		return isPlanar() && ctx.columnsAt ? Math.max(1, ctx.columnsAt(id)) : 1;
	}

	function moveVertical(id: string, direction: 1 | -1, modifiers: KeyboardNavModifiers): void {
		for (let index = 0; index < columnsFor(id); index += 1) {
			ctx.moveFocus(direction, modifiers);
		}
	}

	function runTypeAhead(focusedId: string, key: string): boolean {
		const ids = ctx.orderedIds();
		if (ids.length === 0) return true;
		if (timer !== null) timerWindow().clearTimeout(timer);
		timer = timerWindow().setTimeout(resetTypeAhead, TYPE_AHEAD_TIMEOUT_MS);
		buffer += key.toLowerCase();

		const start = Math.max(0, ids.indexOf(focusedId));
		for (let offset = 1; offset <= ids.length; offset += 1) {
			const id = ids[(start + offset) % ids.length];
			if (ctx.labelOf(id).toLowerCase().startsWith(buffer)) {
				ctx.focusId(id);
				return true;
			}
		}
		return true;
	}

	function handleKeydown(focusedId: string, e: KeyboardEvent): KeyboardNavResult {
		const additive = e.ctrlKey || e.metaKey;
		const range = e.shiftKey;
		const modifiers = { additive, range };

		if (additive && (e.key === 'a' || e.key === 'A')) {
			e.preventDefault();
			ctx.selectAll();
			return { handled: true };
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				moveVertical(focusedId, 1, modifiers);
				return { handled: true };
			case 'ArrowUp':
				e.preventDefault();
				moveVertical(focusedId, -1, modifiers);
				return { handled: true };
			case 'ArrowRight':
				e.preventDefault();
				if (isPlanar()) {
					if (
						ctx.topology === 'planar-drill' &&
						ctx.isExpandable(focusedId) &&
						ctx.drill?.descend(focusedId)
					) {
						return { handled: true };
					}
					ctx.moveFocus(1, modifiers);
					return { handled: true };
				}
				if (ctx.isExpandable(focusedId) && !ctx.isExpanded(focusedId)) {
					ctx.expand(focusedId);
					return { handled: true };
				}
				{
					const child = ctx.firstChildOf(focusedId);
					if (child) ctx.focusId(child);
				}
				return { handled: true };
			case 'ArrowLeft':
				e.preventDefault();
				if (isPlanar()) {
					if (ctx.topology === 'planar-drill' && ctx.drill?.ascend()) return { handled: true };
					ctx.moveFocus(-1, modifiers);
					return { handled: true };
				}
				if (ctx.isExpandable(focusedId) && ctx.isExpanded(focusedId)) {
					ctx.collapse(focusedId);
					return { handled: true };
				}
				{
					const parent = ctx.parentOf(focusedId);
					if (parent) ctx.focusId(parent);
				}
				return { handled: true };
			case 'Home':
				e.preventDefault();
				ctx.focusEdge('home', { range });
				return { handled: true };
			case 'End':
				e.preventDefault();
				ctx.focusEdge('end', { range });
				return { handled: true };
			case 'PageDown':
				e.preventDefault();
				ctx.movePage(1, { range });
				return { handled: true };
			case 'PageUp':
				e.preventDefault();
				ctx.movePage(-1, { range });
				return { handled: true };
			case 'Backspace':
				if (ctx.topology === 'planar-drill' && ctx.drill?.ascend()) {
					e.preventDefault();
					return { handled: true };
				}
				return { handled: false };
			case 'Enter':
				e.preventDefault();
				if (
					ctx.topology === 'planar-drill' &&
					ctx.isExpandable(focusedId) &&
					ctx.drill?.descend(focusedId)
				) {
					return { handled: true };
				}
				ctx.activate(focusedId, e);
				return { handled: true };
			case ' ':
			case 'Spacebar':
				e.preventDefault();
				ctx.toggleSelect(modifiers);
				return { handled: true };
			default:
				break;
		}

		if (e.key.length === 1 && !additive && !e.altKey && /\S/.test(e.key)) {
			e.preventDefault();
			return { handled: runTypeAhead(focusedId, e.key) };
		}
		return { handled: false };
	}

	return { handleKeydown, resetTypeAhead };
}

function timerWindow(): Window {
	return typeof activeWindow === 'undefined' ? window : activeWindow;
}
