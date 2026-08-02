export type SwipeState = 'pending' | 'recognized' | 'cancelled';

export interface SwipeOptions {
	minHorizontalDistance?: number;
	maxVerticalDrift?: number;
}

export class NodeSwipeRecognizer {
	private startX = 0;
	private startY = 0;
	private state: SwipeState = 'pending';
	private minHorizontalDistance: number;
	private maxVerticalDrift: number;

	constructor(options?: SwipeOptions) {
		this.minHorizontalDistance = options?.minHorizontalDistance ?? 30;
		this.maxVerticalDrift = options?.maxVerticalDrift ?? 20;
	}

	start(x: number, y: number, target: Element | null): void {
		if (this.isExcludedTarget(target)) {
			this.state = 'cancelled';
			return;
		}
		this.startX = x;
		this.startY = y;
		this.state = 'pending';
	}

	move(x: number, y: number): SwipeState {
		if (this.state !== 'pending') return this.state;

		const deltaX = x - this.startX;
		const deltaY = Math.abs(y - this.startY);

		if (deltaY > this.maxVerticalDrift) {
			this.state = 'cancelled';
			return this.state;
		}

		if (deltaX >= this.minHorizontalDistance) {
			this.state = 'recognized';
			return this.state;
		}

		return 'pending';
	}

	cancel(): void {
		this.state = 'cancelled';
	}

	getState(): SwipeState {
		return this.state;
	}

	private isExcludedTarget(target: Element | null): boolean {
		if (!target) return false;
		return !!target.closest(
			'input, button, a, [role="button"], .multi-select-pill-remove-button, .tree-item-self-collapse-icon',
		);
	}
}
