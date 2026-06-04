/**
 * Minimal Obsidian stub for vitest module resolution.
 * The real obsidian package has no runtime entry point (main: "").
 * Tests that use evalInObsidian run code inside the real Obsidian instance,
 * so these stubs only need to satisfy vitest's module resolver.
 */

export class TFile {
	path = '';
	name = '';
}

export class TFolder {
	path = '';
	name = '';
}

export class Component {
	load(): void {}
	unload(): void {}
	onload(): void {}
	onunload(): void {}
	addChild(): void {}
	registerEvent(): void {}
}

export class Events {
	private callbacks = new Map<string, Set<(...args: unknown[]) => unknown>>();

	on(name: string, callback: (...args: unknown[]) => unknown): void {
		if (!this.callbacks.has(name)) this.callbacks.set(name, new Set());
		this.callbacks.get(name)?.add(callback);
	}

	off(name: string, callback: (...args: unknown[]) => unknown): void {
		this.callbacks.get(name)?.delete(callback);
	}

	trigger(name: string, ...args: unknown[]): void {
		for (const callback of this.callbacks.get(name) ?? []) {
			callback(...args);
		}
	}
}

export class Notice {
	message: string;

	constructor(message: string) {
		this.message = message;
	}

	setMessage(message: string): void {
		this.message = message;
	}

	hide(): void {}
}

export class FileManager {}
