type FrameNavReorderOptions = {
	getPageOrder(): string[];
	setPageOrder(order: string[]): void;
	incrementRenderKey(): void;
	saveOrder(order: string[]): void;
};

const NAV_COLLAPSE_THRESHOLD = 220;

export class FrameNavReorderController {
	isReordering = $state(false);
	reorderTargetIdx = $state(-1);
	pillEl = $state<HTMLElement | null>(null);
	navCollapsed = $state(false);
	drawerOpen = $state(false);

	private longPressTimer: number | null = null;
	private reorderSourceIdx = -1;
	private pendingPointerId = -1;
	private navEl: HTMLElement | null = null;
	private viewRootEl: HTMLElement | null = null;
	private navExpandTimer: number | null = null;

	constructor(private readonly options: FrameNavReorderOptions) {}

	private startLongPress(idx: number, pointerId: number): void {
		this.pendingPointerId = pointerId;
		this.longPressTimer = activeWindow.setTimeout(() => {
			this.isReordering = true;
			this.reorderSourceIdx = idx;
			if (this.pillEl) this.pillEl.setPointerCapture(this.pendingPointerId);
		}, 2000);
	}

	private cancelLongPress(): void {
		if (this.longPressTimer !== null) {
			activeWindow.clearTimeout(this.longPressTimer);
			this.longPressTimer = null;
		}
		this.pendingPointerId = -1;
	}

	onNavIconPointerDown = (e: PointerEvent, idx: number): void => {
		this.startLongPress(idx, e.pointerId);
	};

	onPillPointerMove = (e: PointerEvent): void => {
		if (!this.isReordering || this.reorderSourceIdx < 0 || !this.pillEl) return;

		const el = activeDocument.elementFromPoint(e.clientX, e.clientY);
		const iconEl = el?.closest?.('.vm-nav-icon') as HTMLElement | null;
		if (iconEl && this.pillEl.contains(iconEl)) {
			const icons = this.pillEl.querySelectorAll('.vm-nav-icon');
			const idx = Array.from(icons).indexOf(iconEl);
			if (idx >= 0 && idx !== this.reorderSourceIdx) {
				this.reorderTargetIdx = idx;
			}
		}
	};

	onPillPointerUp = (): void => {
		this.cancelLongPress();
		if (
			this.isReordering &&
			this.reorderSourceIdx >= 0 &&
			this.reorderTargetIdx >= 0 &&
			this.reorderSourceIdx !== this.reorderTargetIdx
		) {
			const order = [...this.options.getPageOrder()];
			const [moved] = order.splice(this.reorderSourceIdx, 1);
			order.splice(this.reorderTargetIdx, 0, moved);
			this.options.setPageOrder(order);
			this.options.incrementRenderKey();
			this.options.saveOrder(order);
		}
		this.isReordering = false;
		this.reorderSourceIdx = -1;
		this.reorderTargetIdx = -1;
	};

	exitReorder = (): void => {
		this.cancelLongPress();
		this.isReordering = false;
		this.reorderSourceIdx = -1;
		this.reorderTargetIdx = -1;
	};

	bindNav = (el: HTMLElement): { destroy(): void } => {
		this.navEl = el;
		return {
			destroy: () => {
				if (this.navExpandTimer) {
					activeWindow.clearTimeout(this.navExpandTimer);
					this.navExpandTimer = null;
				}
				this.navEl = null;
			},
		};
	};

	bindViewRoot = (el: HTMLElement): { destroy(): void } => {
		const target = (el.closest('.vm-view') as HTMLElement) ?? el.parentElement ?? el;
		this.viewRootEl = target;
		const ro = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect.width ?? target.offsetWidth;
			this.navCollapsed = w < NAV_COLLAPSE_THRESHOLD;
		});
		ro.observe(target);
		this.navCollapsed = target.offsetWidth < NAV_COLLAPSE_THRESHOLD;
		return {
			destroy: () => {
				ro.disconnect();
				this.viewRootEl = null;
			},
		};
	};

	onCollapsedNavClick = (): void => {
		if (!this.navCollapsed || !this.navEl) return;
		this.navEl.classList.add('is-bar-expanding');
		this.navCollapsed = false;
		if (this.navExpandTimer) activeWindow.clearTimeout(this.navExpandTimer);
		this.navExpandTimer = activeWindow.setTimeout(() => {
			if (this.viewRootEl && this.viewRootEl.offsetWidth < NAV_COLLAPSE_THRESHOLD) {
				this.navCollapsed = true;
			}
			this.navEl?.classList.remove('is-bar-expanding');
		}, 2000);
	};
}
