/**
 * Coalesces expensive explorer model renders and keeps hidden panels dirty until
 * they become visible. A cached viewport refresh can run immediately; the model
 * rebuild stays on a trailing timer so activation clicks are not interrupted.
 */
export class DeferredExplorerRender {
	private dirty = false;
	private timer: number | null = null;

	constructor(private readonly delayMs = 180) {}

	get isDirty(): boolean {
		return this.dirty;
	}

	invalidate(isVisible: boolean, render: () => void): void {
		this.dirty = true;
		if (isVisible) {
			this.schedule(render);
		} else {
			this.cancelTimer();
		}
	}

	activate(render: () => void): boolean {
		if (!this.dirty) return false;
		this.schedule(render);
		return true;
	}

	satisfy(): void {
		this.dirty = false;
		if (this.timer === null) return;
		window.clearTimeout(this.timer);
		this.timer = null;
	}

	dispose(): void {
		this.cancelTimer();
	}

	private schedule(render: () => void): void {
		this.cancelTimer();
		this.timer = window.setTimeout(() => {
			this.timer = null;
			if (!this.dirty) return;
			this.dirty = false;
			render();
		}, this.delayMs);
	}

	private cancelTimer(): void {
		if (this.timer === null) return;
		window.clearTimeout(this.timer);
		this.timer = null;
	}
}
