import { App, Component, Events, Notice, TFile, FileManager } from 'obsidian';
import type { PendingChange, OperationResult } from '../types/typeOps';
import { DELETE_PROP, RENAME_FILE, REORDER_ALL, MOVE_FILE, FIND_REPLACE_CONTENT, NATIVE_RENAME_PROP, NATIVE_SET_PROP_TYPE, APPLY_TEMPLATE, DELETE_FILE } from '../types/typeOps';
import { translate } from '../i18n/index';

interface InternalApp extends App {
	fileManager: FileManager & {
		renameProperty(oldName: string, newName: string): Promise<void>;
	};
	metadataTypeManager?: {
		setType(propName: string, type: string): Promise<void> | void;
	};
}

interface OperationQueueOptions {
	bypassOperations?: boolean;
}

/**
 * Manages the queue of pending property operations.
 * All operations are staged first, then executed atomically on user confirmation.
 *
 * Port of Python's pending_changes list + _execute_queue_internal().
 */
export class OperationQueueService extends Component {
	private app: App;
	private events = new Events();

	private get internalApp(): InternalApp {
		return this.app as unknown as InternalApp;
	}

	readonly queue: PendingChange[] = [];
	operationMode: 'stage' | 'bypass' = 'stage';

	constructor(app: App, options: OperationQueueOptions = {}) {
		super();
		this.app = app;
		this.operationMode = options.bypassOperations ? 'bypass' : 'stage';
	}

	/**
	 * Bridge to Obsidian events that returns an unsubscribe function.
	 * Used by Svelte components in $effect blocks.
	 */
	onUpdate(callback: () => void): () => void {
		this.on('changed', callback);
		return () => this.off('changed', callback);
	}

	on(name: 'changed' | 'executed', callback: (result?: OperationResult) => void): void {
		this.events.on(name, callback as (...data: unknown[]) => unknown);
	}

	off(name: 'changed' | 'executed', callback: (result?: OperationResult) => void): void {
		this.events.off(name, callback as (...data: unknown[]) => unknown);
	}

	get shouldStageOperations(): boolean {
		return this.operationMode === 'stage';
	}

	setOperationMode(mode: 'stage' | 'bypass'): void {
		if (this.operationMode === mode) return;
		this.operationMode = mode;
		this.events.trigger('changed');
	}

	setBypassOperations(enabled: boolean): void {
		this.setOperationMode(enabled ? 'bypass' : 'stage');
	}

	/** Add a single operation to the queue */
	add(change: PendingChange): void {
		this.queue.push(change);
		this.events.trigger('changed');
	}

	addOrRun(change: PendingChange): void {
		if (this.shouldStageOperations) {
			this.add(change);
			return;
		}
		void this.runNow(change);
	}

	async runNow(change: PendingChange): Promise<OperationResult> {
		const result: OperationResult = { success: 0, errors: 0, messages: [] };
		for (const file of change.files) {
			try {
				await this.applyChange(file, change);
				result.success++;
			} catch (err) {
				result.errors++;
				result.messages.push(`${file.path}: ${String(err)}`);
			}
			await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
		}

		new Notice(
			result.errors > 0
				? translate('result.errors', { count: result.errors })
				: translate('result.success', { count: result.success })
		);

		this.events.trigger('executed', result);
		this.events.trigger('changed');
		return result;
	}

	/**
	 * Add multiple operations at once — fires only ONE 'changed' event.
	 * Use this instead of calling add() in a loop to avoid freezing the UI
	 * with thousands of re-renders (one per file).
	 */
	addBatch(changes: PendingChange[]): void {
		if (changes.length === 0) return;
		this.queue.push(...changes);
		this.events.trigger('changed');
	}

	/** Remove an operation by index */
	remove(index: number): void {
		if (index >= 0 && index < this.queue.length) {
			this.queue.splice(index, 1);
			this.events.trigger('changed');
		}
	}

	/** Clear all pending operations */
	clear(): void {
		this.queue.length = 0;
		this.events.trigger('changed');
	}

	get isEmpty(): boolean {
		return this.queue.length === 0;
	}

	/**
	 * Execute all queued operations.
	 *
	 * - Re-reads metadata per file before applying (handles concurrent edits).
	 * - Processes in chunks of 20 files, yielding to the UI thread between
	 *   chunks so Obsidian stays responsive during large batches.
	 * - Shows a persistent Notice with a live progress counter.
	 *
	 * Note: Obsidian's metadataCache indexes each renamed/moved file
	 * individually via a 'rename' event (one at a time, single-threaded).
	 * This is expected OS-level behavior — files move instantly at the
	 * filesystem level, but Obsidian's vault view updates incrementally
	 * as each file is re-indexed. The queue clears when execution finishes,
	 * regardless of how far Obsidian's indexing has progressed.
	 */
	async execute(): Promise<OperationResult> {
		const result: OperationResult = { success: 0, errors: 0, messages: [] };

		if (this.isEmpty) {
			new Notice(translate('result.no_changes'));
			return result;
		}

		// Flatten all (file, change) pairs for progress tracking
		const ops: Array<{ file: TFile; change: PendingChange }> = [];
		for (const change of this.queue) {
			for (const file of change.files) {
				ops.push({ file, change });
			}
		}

		const total = ops.length;
		const CHUNK = 20; // yield to UI after every N files

		// Persistent notice — updated live as files are processed
		const notice = new Notice('', 0);

		for (let i = 0; i < ops.length; i++) {
			const { file, change } = ops[i];
			notice.setMessage(`${translate('result.applying')} ${i + 1} / ${total}`);

			try {
				await this.applyChange(file, change);
				result.success++;
			} catch (err) {
				result.errors++;
				result.messages.push(`${file.path}: ${String(err)}`);
			}

			// Yield to UI thread every CHUNK files to keep the app responsive
			if ((i + 1) % CHUNK === 0) {
				await new Promise<void>((r) => window.setTimeout(r, 0));
			}
		}

		notice.hide();

		// Clear queue after all operations complete
		this.queue.length = 0;

		new Notice(
			result.errors > 0
				? translate('result.errors', { count: result.errors })
				: translate('result.success', { count: result.success })
		);

		this.events.trigger('executed', result);
		this.events.trigger('changed');

		return result;
	}

	private async applyChange(file: TFile, change: PendingChange): Promise<void> {
		let specialUpdates: Record<string, unknown> | null = null;

		// By executing logic inside processFrontMatter, we bypass metadataCache entirely
		// and guarantee we are acting on the absolute freshest file frontmatter buffer.
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			const updates = change.logicFunc(file, fm);
			if (!updates) return;

			// Check for special signals that require APIs outside frontmatter manipulation
			if (RENAME_FILE in updates || MOVE_FILE in updates || FIND_REPLACE_CONTENT in updates || NATIVE_RENAME_PROP in updates || NATIVE_SET_PROP_TYPE in updates || APPLY_TEMPLATE in updates || DELETE_FILE in updates) {
				specialUpdates = updates;
			}

			// Apply frontmatter changes in the secured context
			for (const [key, value] of Object.entries(updates)) {
				if (key === DELETE_PROP) {
					delete fm[value as string];
				} else if (key === REORDER_ALL) {
					const ordered = value as string[];
					const copy = { ...fm };
					for (const k of Object.keys(fm)) delete fm[k];
					for (const k of ordered) {
						if (k in copy) fm[k] = copy[k];
					}
					for (const k of Object.keys(copy)) {
						if (!(k in fm)) fm[k] = copy[k];
					}
				} else if (key !== RENAME_FILE && key !== MOVE_FILE && key !== FIND_REPLACE_CONTENT && key !== NATIVE_RENAME_PROP && key !== NATIVE_SET_PROP_TYPE && key !== APPLY_TEMPLATE && key !== DELETE_FILE) {
					fm[key] = value;
				}
			}
		});

		if (!specialUpdates) return;

		// Execute special vault operations sequentially AFTER frontmatter is safely saved
		if (RENAME_FILE in specialUpdates) {
			const newName = specialUpdates[RENAME_FILE] as string;
			const newPath = file.path.replace(file.name, newName);
			await this.app.fileManager.renameFile(file, newPath);
			return;
		}

		if (MOVE_FILE in specialUpdates) {
			const targetFolder = specialUpdates[MOVE_FILE] as string;
			const newPath = targetFolder ? `${targetFolder}/${file.name}` : file.name;
			await this.app.fileManager.renameFile(file, newPath);
			return;
		}

		if (FIND_REPLACE_CONTENT in specialUpdates) {
			const { pattern, replacement, isRegex, caseSensitive } = specialUpdates[FIND_REPLACE_CONTENT] as {
				pattern: string;
				replacement: string;
				isRegex: boolean;
				caseSensitive: boolean;
			};
			const flags = 'g' + (caseSensitive ? '' : 'i');
			const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const regex = new RegExp(escaped, flags);
			const content = await this.app.vault.read(file);
			const newContent = content.replace(regex, replacement);
			if (newContent !== content) {
				await this.app.vault.modify(file, newContent);
			}
			return;
		}

		if (NATIVE_RENAME_PROP in specialUpdates) {
			const { oldName, newName } = specialUpdates[NATIVE_RENAME_PROP] as { oldName: string; newName: string };
			await this.internalApp.fileManager.renameProperty(oldName, newName);
			return;
		}

		if (NATIVE_SET_PROP_TYPE in specialUpdates) {
			const { propName, type } = specialUpdates[NATIVE_SET_PROP_TYPE] as { propName: string; type: string };
			await this.internalApp.metadataTypeManager?.setType(propName, type);
			return;
		}

		if (APPLY_TEMPLATE in specialUpdates) {
			const templatePath = specialUpdates[APPLY_TEMPLATE] as string;
			const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
			if (templateFile instanceof TFile) {
				const templateContent = await this.app.vault.read(templateFile);
				const content = await this.app.vault.read(file);

				// Standard text append logic
				const newContent = content + '\n\n' + templateContent;
				await this.app.vault.modify(file, newContent);
			}
			return;
		}

		if (DELETE_FILE in specialUpdates) {
			await this.app.fileManager.trashFile(file);
			return;
		}
	}

	/**
	 * Simulate all queued changes without writing.
	 * Returns a map of file path → { before, after } metadata snapshots.
	 */
	simulateChanges(): Map<string, { before: Record<string, unknown>; after: Record<string, unknown>; newPath?: string }> {
		const diffs = new Map<string, { before: Record<string, unknown>; after: Record<string, unknown>; newPath?: string }>();

		for (const change of this.queue) {
			for (const file of change.files) {
				const cache = this.app.metadataCache.getFileCache(file);
				const before = { ...(cache?.frontmatter ?? {}) };
				delete before['position'];

				// Start from previous "after" if this file was already changed
				const existing = diffs.get(file.path);
				const base = existing ? { ...existing.after } : { ...before };
				let currentNewPath = existing?.newPath;

				const updates = change.logicFunc(file, base);
				if (!updates) continue;

				const after = { ...base };
				for (const [key, value] of Object.entries(updates)) {
					if (key === DELETE_PROP) {
						delete after[value as string];
					} else if (key === REORDER_ALL) {
						// Simulate key reordering
						const ordered = value as string[];
						const copy: Record<string, unknown> = { ...after };
						for (const k of Object.keys(after)) delete after[k];
						for (const k of ordered) {
							if (k in copy) after[k] = copy[k];
						}
						for (const k of Object.keys(copy)) {
							if (!(k in after)) after[k] = copy[k];
						}
					} else if (key === RENAME_FILE) {
						const newName = value as string;
						currentNewPath = (currentNewPath ?? file.path).replace(file.name, newName);
					} else if (key === MOVE_FILE) {
						const targetFolder = value as string;
						const fileName = (currentNewPath ?? file.path).split('/').pop()!;
						currentNewPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;
					} else if (key !== FIND_REPLACE_CONTENT && key !== NATIVE_RENAME_PROP && key !== NATIVE_SET_PROP_TYPE && key !== APPLY_TEMPLATE && key !== DELETE_FILE) {
						after[key] = value;
					}
				}

				diffs.set(file.path, {
					before: existing?.before ?? before,
					after,
					newPath: currentNewPath
				});
			}
		}

		return diffs;
	}
}
