import { App, Component, Events, Notice, TFile, FileManager, TFolder } from 'obsidian';
import type { PendingChange, OperationResult } from '../types/typeOps';
import { replaceSingleOccurrence } from '../logic/logicSingleOccurrenceReplace';
import { pathReaches, promotionPlan } from '../logic/logicDeletionDecoration';
import { DELETE_PROP, RENAME_FILE, REORDER_ALL, MOVE_FILE, FIND_REPLACE_CONTENT, NATIVE_RENAME_PROP, NATIVE_SET_PROP_TYPE, APPLY_TEMPLATE, DELETE_FILE } from '../types/typeOps';
import { translate } from '../i18n/index';

interface InternalApp extends App {
	fileManager: FileManager & {
		renameProperty(oldName: string, newName: string): Promise<void>;
	};
	metadataTypeManager?: {
		setType(propName: string, type: string): Promise<void> | void;
	};
	customCss?: {
		requestLoadSnippets?(): Promise<void> | void;
	};
	plugins?: {
		uninstallPlugin?(id: string): Promise<void>;
	};
}

interface OperationQueueOptions {
	bypassOperations?: boolean;
	/**
	 * Whether replacing a queued operation announces itself. Read live rather
	 * than copied, because the settings object handed in at construction is the
	 * same one the settings tab mutates.
	 */
	queueWarnOnSupersede?: boolean;
}

type QueuePolicyDecision =
	| { kind: 'accept' }
	| { kind: 'duplicate' }
	| { kind: 'merge'; existing: PendingChange }
	| { kind: 'supersede'; existing: PendingChange }
	| { kind: 'conflict' };

type FolderDeleteChange = PendingChange & {
	type: 'file_delete';
	targetFolder: string;
	excludedPaths?: string[];
};

interface QueuePolicyStats {
	accepted: number;
	merged: number;
	duplicates: number;
	conflicts: number;
	superseded: number;
	changed: boolean;
}

function createQueuePolicyStats(): QueuePolicyStats {
	return {
		accepted: 0,
		merged: 0,
		duplicates: 0,
		superseded: 0,
		conflicts: 0,
		changed: false,
	};
}

function filePathSet(change: PendingChange): Set<string> {
	return new Set(change.files.map((file) => file.path));
}

function hasFileOverlap(a: PendingChange, b: PendingChange): boolean {
	const aPaths = filePathSet(a);
	return b.files.some((file) => aPaths.has(file.path));
}

function missingFiles(existing: PendingChange, incoming: PendingChange): TFile[] {
	const existingPaths = filePathSet(existing);
	return incoming.files.filter((file) => !existingPaths.has(file.path));
}

function normalizeTagSubject(tag: string): string {
	return tag.trim().replace(/^#/, '');
}

function stableValue(value: unknown): string {
	if (value === undefined) return '';
	if (value === null) return 'null';
	if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
	if (typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return `{${Object.keys(record)
			.sort()
			.map((key) => `${key}:${stableValue(record[key])}`)
			.join(',')}}`;
	}
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return value.toString();
	}
	if (typeof value === 'symbol') return value.description ?? '';
	if (typeof value === 'function') return value.name;
	return '';
}

function changeSubject(change: PendingChange): string {
	if (change.type === 'property') return change.property;
	if (change.type === 'tag') return normalizeTagSubject(change.tag);
	return change.type;
}

function propertyPayload(change: Extract<PendingChange, { type: 'property' }>): string {
	return stableValue({
		oldValue: change.oldValue,
		value: change.value,
		details: change.value === undefined && change.oldValue === undefined ? change.details : '',
	});
}

function operationPayload(change: PendingChange): string {
	if (change.type === 'property') return propertyPayload(change);
	if (change.type === 'tag') {
		return stableValue({
			details: change.action === 'rename' ? change.details : '',
			value: (change as unknown as { value?: unknown }).value,
		});
	}
	if (change.type === 'file_rename') {
		return stableValue(change.newName ?? change.details);
	}
	if (change.type === 'snippet_rename') {
		return stableValue(change.targetPath);
	}
	if (change.type === 'snippet_delete') {
		return stableValue(change.path);
	}
	if (change.type === 'plugin_uninstall') {
		return stableValue(change.pluginId);
	}
	if (change.type === 'file_move') {
		return stableValue(change.targetFolder ?? change.details);
	}
	if (change.type === 'file_delete') {
		return stableValue(
			(change as { targetFolder?: string }).targetFolder ?? change.details,
		);
	}
	if (change.type === 'content_replace') {
		return stableValue({
			caseSensitive: change.caseSensitive,
			find: change.find,
			isRegex: change.isRegex,
			replace: change.replace,
		});
	}
	if (change.type === 'template') {
		return stableValue(change.templateFileStr);
	}
	return '';
}

function operationIdentity(change: PendingChange): string {
	return [
		change.type,
		change.action,
		changeSubject(change),
		operationPayload(change),
	].join('\u0000');
}

function propertyActionsConflict(
	a: Extract<PendingChange, { type: 'property' }>,
	b: Extract<PendingChange, { type: 'property' }>,
): boolean {
	if (a.property !== b.property) return false;
	if (operationIdentity(a) === operationIdentity(b)) return false;
	const highImpactActions = new Set(['delete', 'clean_empty', 'rename', 'change_type']);
	if (highImpactActions.has(a.action) || highImpactActions.has(b.action)) return true;
	if ((a.action === 'set' || a.action === 'add') && (b.action === 'set' || b.action === 'add')) {
		return propertyPayload(a) !== propertyPayload(b);
	}
	return false;
}

function tagActionsConflict(
	a: Extract<PendingChange, { type: 'tag' }>,
	b: Extract<PendingChange, { type: 'tag' }>,
): boolean {
	if (normalizeTagSubject(a.tag) !== normalizeTagSubject(b.tag)) return false;
	if (operationIdentity(a) === operationIdentity(b)) return false;
	if (a.action === 'delete' || b.action === 'delete') return true;
	if (a.action === 'rename' || b.action === 'rename') return true;
	return false;
}

function fileActionsConflict(a: PendingChange, b: PendingChange): boolean {
	if (a.type === 'file_delete' || b.type === 'file_delete') return true;
	const fileActions = new Set(['file_rename', 'file_move', 'snippet_rename']);
	if (!fileActions.has(a.type) || !fileActions.has(b.type)) return false;
	return operationIdentity(a) !== operationIdentity(b);
}

/**
 * Two replacements of the same text, differing only in what they replace it
 * with.
 *
 * `operationIdentity` folds `replace` into the key, so these read as unrelated
 * operations and both sat in the queue — which cannot mean anything, since the
 * first one runs and the second then finds nothing to match. The later one wins,
 * the same way a second edit to the same field wins.
 */
function supersedesContentReplace(
	existing: PendingChange,
	incoming: PendingChange,
): boolean {
	if (existing.type !== 'content_replace' || incoming.type !== 'content_replace') {
		return false;
	}
	if (existing.find !== incoming.find) return false;
	if (existing.caseSensitive !== incoming.caseSensitive) return false;
	if (existing.isRegex !== incoming.isRegex) return false;
	if (existing.replace === incoming.replace) return false;
	return hasFileOverlap(existing, incoming);
}

function operationsConflict(existing: PendingChange, incoming: PendingChange): boolean {
	if (!hasFileOverlap(existing, incoming)) return false;
	if (existing.type === 'property' && incoming.type === 'property') {
		return propertyActionsConflict(existing, incoming);
	}
	if (existing.type === 'tag' && incoming.type === 'tag') {
		return tagActionsConflict(existing, incoming);
	}
	return fileActionsConflict(existing, incoming);
}

/**
 * Manages the queue of pending property operations.
 * All operations are staged first, then executed atomically on user confirmation.
 *
 * Port of Python's pending_changes list + _execute_queue_internal().
 */
export class OperationQueueService extends Component {
	private app: App;
	private readonly options: OperationQueueOptions;
	private events = new Events();

	private get internalApp(): InternalApp {
		return this.app as unknown as InternalApp;
	}

	readonly queue: PendingChange[] = [];
	operationMode: 'stage' | 'bypass' = 'stage';

	constructor(app: App, options: OperationQueueOptions = {}) {
		super();
		this.app = app;
		this.options = options;
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
		const stats = this.stageChange(change);
		this.reportQueuePolicy(stats);
		if (stats.changed) this.events.trigger('changed');
	}

	addOrRun(change: PendingChange): void {
		if (this.shouldStageOperations) {
			this.add(change);
			return;
		}
		const decision = this.assessChange(change, true);
		if (decision.kind !== 'accept') {
			const stats = createQueuePolicyStats();
			if (decision.kind === 'duplicate') stats.duplicates++;
			else stats.conflicts++;
			this.reportQueuePolicy(stats);
			return;
		}
		
		if (change.type === 'file_delete' && !this.isFolderDeleteChange(change) && change.files.length > 0) {
			const fm = this.app.fileManager as unknown as {
				promptForFileDeletion?(file: TFile): void;
				promptForDeletion?(file: TFile): void;
			};
			for (const file of change.files) {
				(fm.promptForFileDeletion ?? fm.promptForDeletion)?.(file);
			}
			return;
		}

		void this.runNow(change);
	}

	async runNow(change: PendingChange): Promise<OperationResult> {
		const result: OperationResult = { success: 0, errors: 0, messages: [] };
		if (this.isFilelessChange(change)) {
			try {
				await this.applyFilelessChange(change);
				result.success++;
			} catch (err) {
				result.errors++;
				result.messages.push(
					`${this.changeTargetLabel(change)}: ${String(err)}`,
				);
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
		const batchStats = createQueuePolicyStats();
		for (const change of changes) {
			this.mergeStats(batchStats, this.stageChange(change));
		}
		this.reportQueuePolicy(batchStats, true);
		if (batchStats.changed) this.events.trigger('changed');
	}

	private stageChange(change: PendingChange): QueuePolicyStats {
		const stats = createQueuePolicyStats();
		const decision = this.assessChange(change);
		if (decision.kind === 'accept') {
			this.queue.push(change);
			stats.accepted++;
			stats.changed = true;
			return stats;
		}
		if (decision.kind === 'merge') {
			const files = missingFiles(decision.existing, change);
			if (files.length === 0) {
				stats.duplicates++;
				return stats;
			}
			decision.existing.files.push(...files);
			stats.merged++;
			stats.changed = true;
			return stats;
		}
		if (decision.kind === 'supersede') {
			const at = this.queue.indexOf(decision.existing);
			if (at >= 0) this.queue.splice(at, 1);
			this.queue.push(change);
			stats.superseded++;
			stats.changed = true;
			return stats;
		}
		if (decision.kind === 'duplicate') {
			stats.duplicates++;
			return stats;
		}
		stats.conflicts++;
		return stats;
	}

	private assessChange(change: PendingChange, bypass = false): QueuePolicyDecision {
		const incomingIdentity = operationIdentity(change);
		for (const existing of this.queue) {
			if (supersedesContentReplace(existing, change)) {
				return { kind: 'supersede', existing };
			}
			if (operationIdentity(existing) === incomingIdentity) {
				if (!bypass) return { kind: 'merge', existing };
				if (hasFileOverlap(existing, change)) return { kind: 'duplicate' };
				continue;
			}
			if (operationsConflict(existing, change)) return { kind: 'conflict' };
		}
		return { kind: 'accept' };
	}

	/** Whether replacing a queued operation announces itself. Defaults to yes. */
	private warnsOnSupersede(): boolean {
		return this.options.queueWarnOnSupersede !== false;
	}

	private mergeStats(target: QueuePolicyStats, source: QueuePolicyStats): void {
		target.accepted += source.accepted;
		target.merged += source.merged;
		target.duplicates += source.duplicates;
		target.conflicts += source.conflicts;
		target.superseded += source.superseded;
		target.changed = target.changed || source.changed;
	}

	private reportQueuePolicy(stats: QueuePolicyStats, batch = false): void {
		// Replacing a queued operation is a normal edit, not a guard rejection, so
		// it is announced on its own and can be silenced. Everything below is a
		// refusal and always speaks.
		if (stats.superseded > 0 && this.warnsOnSupersede()) {
			new Notice(
				translate('queue.guard.superseded', { count: stats.superseded }),
			);
		}
		if (stats.merged === 0 && stats.duplicates === 0 && stats.conflicts === 0) return;
		if (batch || stats.merged + stats.duplicates + stats.conflicts > 1) {
			new Notice(
				translate('queue.guard.batch', {
					merged: stats.merged,
					duplicates: stats.duplicates,
					conflicts: stats.conflicts,
				}),
			);
			return;
		}
		if (stats.conflicts > 0) {
			new Notice(translate('queue.guard.conflict'));
			return;
		}
		if (stats.duplicates > 0) {
			new Notice(translate('queue.guard.duplicate'));
			return;
		}
		new Notice(translate('queue.guard.merged'));
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
		const ops: Array<{ file: TFile | null; change: PendingChange }> = [];
		for (const change of this.queue) {
			if (this.isFilelessChange(change)) {
				ops.push({ file: null, change });
			} else {
				for (const file of change.files) {
					ops.push({ file, change });
				}
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
				if (file) {
					await this.applyChange(file, change);
				} else if (this.isFilelessChange(change)) {
					await this.applyFilelessChange(change);
				}
				result.success++;
			} catch (err) {
				result.errors++;
				result.messages.push(
					`${file?.path ?? this.changeTargetLabel(change)}: ${String(err)}`,
				);
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
		if (change.type === 'snippet_rename') {
			await this.app.vault.adapter.rename(change.sourcePath, change.targetPath);
			await this.internalApp.customCss?.requestLoadSnippets?.();
			return;
		}

		if (this.isFileSystemChange(change)) {
			const updates = change.logicFunc(file, {});
			if (!updates) return;
			await this.applySpecialUpdates(file, updates);
			return;
		}

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

		await this.applySpecialUpdates(file, specialUpdates);
	}

	private isFileSystemChange(change: PendingChange): boolean {
		return (
			change.type === 'file_rename' ||
			change.type === 'snippet_rename' ||
			change.type === 'file_move' ||
			change.type === 'file_delete' ||
			change.type === 'content_replace' ||
			change.type === 'template'
		);
	}

	private isFolderDeleteChange(
		change: PendingChange,
	): change is FolderDeleteChange {
		const targetFolder = (change as { targetFolder?: string }).targetFolder;
		return (
			change.type === 'file_delete' &&
			typeof targetFolder === 'string' &&
			targetFolder.length > 0
		);
	}

	/**
	 * Operations with no TFile to iterate. A folder delete trashes the folder
	 * itself; a snippet or plugin lives outside the vault index entirely. All
	 * three are dispatched once, with `file: null`, instead of once per file.
	 */
	private isFilelessChange(change: PendingChange): boolean {
		return (
			this.isFolderDeleteChange(change) ||
			change.type === 'snippet_delete' ||
			change.type === 'plugin_uninstall'
		);
	}

	private async applyFilelessChange(change: PendingChange): Promise<void> {
		if (this.isFolderDeleteChange(change)) {
			await this.applyFolderDeleteChange(change);
			return;
		}
		if (change.type === 'snippet_delete') {
			await this.app.vault.adapter.remove(change.path);
			await this.internalApp.customCss?.requestLoadSnippets?.();
			return;
		}
		if (change.type === 'plugin_uninstall') {
			await this.internalApp.plugins?.uninstallPlugin?.(change.pluginId);
			return;
		}
	}

	private changeTargetLabel(change: PendingChange): string {
		return (change as { targetFolder?: string }).targetFolder ?? change.details;
	}

	private async applyFolderDeleteChange(change: FolderDeleteChange): Promise<void> {
		const target = this.app.vault.getAbstractFileByPath(change.targetFolder);
		if (!(target instanceof TFolder)) {
			throw new Error(`Folder not found: ${change.targetFolder}`);
		}
		// U121-073: whatever was released from this deletion cannot stay where it
		// is -- its ancestors go with the folder. Promote it to the nearest
		// surviving level FIRST, then trash what is left. Doing it the other way
		// round would take the released subtree down with the folder.
		for (const move of promotionPlan(
			change.targetFolder,
			change.excludedPaths ?? [],
		)) {
			const released = this.app.vault.getAbstractFileByPath(move.from);
			if (!released) continue;
			await this.app.fileManager.renameFile(
				released,
				this.availablePath(move.to),
			);
		}
		await (
			this.app.fileManager as unknown as {
				trashFile(file: TFile | TFolder): Promise<void>;
			}
		).trashFile(target);
	}

	/** A promoted node must not silently overwrite a namesake already up there. */
	private availablePath(path: string): string {
		if (!this.app.vault.getAbstractFileByPath(path)) return path;
		const dot = path.lastIndexOf('.');
		const slash = path.lastIndexOf('/');
		const hasExtension = dot > slash;
		const stem = hasExtension ? path.slice(0, dot) : path;
		const extension = hasExtension ? path.slice(dot) : '';
		for (let n = 1; n < 1000; n++) {
			const candidate = `${stem} ${n}${extension}`;
			if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
		}
		return `${stem} ${Date.now()}${extension}`;
	}

	/**
	 * U121-073: take one node out of a queued folder deletion WITHOUT undoing
	 * the operation -- the rest of the folder still goes. Releasing the folder
	 * the operation names would leave it with nothing to do, so that cancels.
	 */
	releaseFromChange(queueIndex: number, path: string): void {
		const change = this.queue[queueIndex];
		if (!change || change.type !== 'file_delete') return;
		const targetFolder = (change as { targetFolder?: string }).targetFolder;
		if (!targetFolder || path === targetFolder) {
			this.remove(queueIndex);
			return;
		}
		const holder = change as { excludedPaths?: string[] };
		const excluded = new Set(holder.excludedPaths ?? []);
		excluded.add(path);
		holder.excludedPaths = [...excluded];
		change.files = change.files.filter(
			(file) => !pathReaches(path, file.path),
		);
		this.events.trigger('changed');
	}

	private async applySpecialUpdates(
		file: TFile,
		specialUpdates: Record<string, unknown>,
	): Promise<void> {
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
			await this.ensureFolderExists(targetFolder);
			await this.app.fileManager.renameFile(file, newPath);
			return;
		}

		if (FIND_REPLACE_CONTENT in specialUpdates) {
			const { pattern, replacement, isRegex, caseSensitive, occurrenceOffset } =
				specialUpdates[FIND_REPLACE_CONTENT] as {
					pattern: string;
					replacement: string;
					isRegex: boolean;
					caseSensitive: boolean;
					/** Set when the operation came from one match row's own menu. */
					occurrenceOffset?: number;
				};
			const content = await this.app.vault.read(file);

			if (typeof occurrenceOffset === 'number') {
				// One occurrence, named by the offset its snippet carries. `null`
				// means the note moved on since the search — writing over whatever
				// now sits at a stale offset is the one outcome nobody asked for, so
				// it is skipped rather than guessed at.
				const single = replaceSingleOccurrence(content, occurrenceOffset, {
					pattern,
					replacement,
					isRegex,
					caseSensitive,
				});
				if (single !== null && single !== content) {
					await this.app.vault.modify(file, single);
				}
				return;
			}

			const flags = 'g' + (caseSensitive ? '' : 'i');
			const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const regex = new RegExp(escaped, flags);
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

	private async ensureFolderExists(folderPath: string): Promise<void> {
		const normalized = folderPath.replace(/^\/|\/$/g, '');
		if (!normalized) return;
		const parts = normalized.split('/').filter((part) => part.length > 0);
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			if (this.app.vault.getAbstractFileByPath(current)) continue;
			await this.app.vault.createFolder(current);
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
