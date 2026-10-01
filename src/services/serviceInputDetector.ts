import { Platform } from 'obsidian';

export type InputModality = 'mouse' | 'touch' | 'keyboard';

export class InputDetector {
	private mode: InputModality = Platform.isMobile ? 'touch' : 'mouse';
	private lastPointerType: string = Platform.isMobile ? 'touch' : 'mouse';
	private listenersAttached = false;

	constructor() {
		this.initListeners();
	}

	private initListeners(): void {
		if (typeof window === 'undefined' || this.listenersAttached) return;
		this.listenersAttached = true;

		window.addEventListener(
			'pointerdown',
			(e) => {
				this.lastPointerType = e.pointerType;
				if (e.pointerType === 'touch' || e.pointerType === 'pen') {
					this.mode = 'touch';
				} else if (e.pointerType === 'mouse') {
					this.mode = 'mouse';
				}
			},
			{ capture: true, passive: true },
		);

		window.addEventListener(
			'pointermove',
			(e) => {
				if (e.pointerType === 'mouse') {
					this.mode = 'mouse';
					this.lastPointerType = 'mouse';
				}
			},
			{ capture: true, passive: true },
		);

		window.addEventListener(
			'keydown',
			() => {
				this.mode = 'keyboard';
			},
			{ capture: true, passive: true },
		);
	}

	getMode(): InputModality {
		return this.mode;
	}

	isTouch(): boolean {
		if (this.lastPointerType === 'touch' || this.lastPointerType === 'pen') {
			return true;
		}
		if (Platform.isMobile) {
			return this.mode !== 'mouse';
		}
		return this.mode === 'touch';
	}

	isMouse(): boolean {
		return !this.isTouch();
	}
}

export const inputDetector = new InputDetector();
