import type { TFile, TFolder } from 'obsidian';

export interface NativeExplorerDraggable {
	readonly type: string;
	readonly title: string;
}

export interface NativeExplorerDragManager {
	dragFile(event: DragEvent, file: TFile): NativeExplorerDraggable;
	dragFolder(event: DragEvent, folder: TFolder): NativeExplorerDraggable;
	dragFiles(event: DragEvent, files: Array<TFile | TFolder>): NativeExplorerDraggable;
	onDragStart(event: DragEvent, draggable: NativeExplorerDraggable): void;
	updateSource(elements: HTMLElement[], className: string): void;
}

export type NativeExplorerDragEntry =
	| { readonly kind: 'file'; readonly file: TFile }
	| { readonly kind: 'folder'; readonly file: TFolder };

export interface NativeExplorerDragStart {
	readonly event: DragEvent;
	readonly entries: readonly NativeExplorerDragEntry[];
	readonly sourceElements: readonly HTMLElement[];
	readonly manager: NativeExplorerDragManager;
	readonly isRenaming: boolean;
}

/** Obsidian's internal manager is checked once at the SDK boundary. */
export function nativeExplorerDragManager(value: unknown): NativeExplorerDragManager | null {
	if (!value || typeof value !== 'object') return null;
	const methods = ['dragFile', 'dragFolder', 'dragFiles', 'onDragStart', 'updateSource'] as const;
	return isNativeManager(value, methods) ? value : null;
}

function isNativeManager(value: object, methods: readonly string[]): value is NativeExplorerDragManager {
	return methods.every(method => typeof Reflect.get(value, method) === 'function');
}

/** Runs the same lifecycle entry as native handleDrag, without a second engine. */
export function beginNativeExplorerDrag(input: NativeExplorerDragStart): boolean {
	const first = input.entries[0];
	if (input.isRenaming || !first) return false;
	const { manager, event } = input;
	let draggable: NativeExplorerDraggable;
	if (input.entries.length > 1) {
		draggable = manager.dragFiles(event, input.entries.map(entry => entry.file));
	} else {
		switch (first.kind) {
			case 'file': draggable = manager.dragFile(event, first.file); break;
			case 'folder': draggable = manager.dragFolder(event, first.file); break;
		}
	}
	manager.updateSource([...input.sourceElements], 'is-being-dragged');
	manager.onDragStart(event, draggable);
	return true;
}
