import { App, Component, Notice, TFile, parseYaml, stringifyYaml } from 'obsidian';
import { SvelteMap } from 'svelte/reactivity';
import type {
	PendingChange,
	OperationResult,
	VirtualFileState,
	StagedOp,
	TemplateChange,
} from '../types/typeOps';
import {
	DELETE_PROP,
	RENAME_FILE,
	REORDER_ALL,
	MOVE_FILE,
	DELETE_FILE,
	FIND_REPLACE_CONTENT,
	NATIVE_RENAME_PROP,
	APPLY_TEMPLATE,
	APPEND_LINKS,
} from '../types/typeOps';
import type { IOperationQueue } from '../types/typeContracts';
import { translate } from '../index/i18n/lang';
import { getActivePerfProbe } from '../dev/perfProbe';
import type { BadgeKind } from '../badges/serviceBadge';
import { serviceMessage } from './serviceMessage';

/**
 * Descriptor for an op linked to a UI node, surfaced in the
 * delete-conflict modal.
 */
export interface ConflictingOpDescriptor {
	opId: string;
	kind: BadgeKind;
	label: string;
	filePath?: string;
}

/**
 * Modal-opener contract used by `requestDelete`. Returns whether the user
 * confirmed the destructive action. The caller (UI shell) is responsible
 * for actually rendering the modal.
 */
export type DeleteConflictModalOpener = (params: {
	nodeId: string;
	nodeLabel: string;
	conflictingOps: ConflictingOpDescriptor[];
}) => Promise<'confirm' | 'cancel'>;

/**
 * Result of `requestDelete`. `'no-op'` means there were no other queued
 * ops to drop AND no delete factory was supplied, so the queue did not
 * mutate.
 */
export type RequestDeleteResult = 'queued' | 'cancelled' | 'no-op';

/**
 * Split a markdown file's raw content into its frontmatter object and body string.
 * Uses Obsidian's parseYaml for byte-exact compatibility with processFrontMatter.
 */
export function splitYamlBody(
	content: string,
	cache?: { frontmatter?: { position?: { start: { offset: number }; end: { offset: number } } } },
): {
	fm: Record<string, unknown>;
	body: string;
} {
	// 1. Precise split using Obsidian's cache if available
	const pos = cache?.frontmatter?.position;
	if (pos && pos.start && pos.end) {
		const fmSource = content.slice(pos.start.offset, pos.end.offset);
		const body = content.slice(pos.end.offset);

		// Strip leading/trailing delimiters from source before parsing
		const yamlMatch = fmSource.match(/^---\r?\n([\s\S]*?)\r?\n---$/);
		const yaml = yamlMatch ? yamlMatch[1] : fmSource.replace(/^---\n?/, '').replace(/\n?---$/, '');

		const parsed = parseFrontmatterYaml(yaml);
		if (parsed) return { fm: parsed.fm, body };
	}

	// 2. Manual fallback. Prefer the last delimiter that yields object-shaped
	// frontmatter so body horizontal rules do not win over valid YAML.
	const lines = content.split(/\r?\n/);
	if (lines.length > 0 && lines[0] === '---') {
		const delimiterIndexes: number[] = [];
		for (let i = 1; i < lines.length; i++) {
			if (lines[i] === '---' || lines[i] === '...') {
				delimiterIndexes.push(i);
			}
		}

		let emptyFallback: { fm: Record<string, unknown>; body: string } | null = null;
		for (let i = delimiterIndexes.length - 1; i >= 0; i--) {
			const endIdx = delimiterIndexes[i];
			const yaml = lines.slice(1, endIdx).join('\n');
			const body = lines.slice(endIdx + 1).join('\n');
			const parsed = parseFrontmatterYaml(yaml);
			if (!parsed) continue;
			if (!parsed.empty) return { fm: parsed.fm, body };
			emptyFallback ??= { fm: parsed.fm, body };
		}
		if (emptyFallback) return emptyFallback;
	}

	return { fm: {}, body: content };
}

function parseFrontmatterYaml(yaml: string): { fm: Record<string, unknown>; empty: boolean } | null {
	return parseFrontmatterYamlSource(yaml) ?? parseFrontmatterYamlSource(stripCommentDocumentMarkers(yaml));
}

function parseFrontmatterYamlSource(
	yaml: string,
): { fm: Record<string, unknown>; empty: boolean } | null {
	try {
		const fm = parseYaml(yaml) as unknown;
		if (fm === null || fm === undefined) return { fm: {}, empty: true };
		if (typeof fm === 'object' && !Array.isArray(fm)) {
			return { fm: fm as Record<string, unknown>, empty: false };
		}
	} catch {
		// Try the comment-marker tolerant form in the caller.
	}
	return null;
}

function stripCommentDocumentMarkers(yaml: string): string {
	const lines = yaml.split(/\r?\n/);
	let changed = false;
	const next = lines.filter((line, index) => {
		if (line !== '---' && line !== '...') return true;
		const previousLine = lines[index - 1]?.trimStart() ?? '';
		const nextLine = lines[index + 1]?.trimStart() ?? '';
		if (!previousLine.startsWith('#') || !nextLine.startsWith('#')) return true;
		changed = true;
		return false;
	});
	return changed ? next.join('\n') : yaml;
}

/**
 * Inverse of splitYamlBody — produce raw content from fm + body.
 * Empty fm means no frontmatter block.
 */
export function serializeFile(fm: Record<string, unknown>, body: string): string {
	if (Object.keys(fm).length === 0) return body;
	const yaml = stringifyYaml(fm);
	return `---\n${yaml}---\n${body}`;
}

function tagOpKind(action: string): StagedOp['kind'] {
	if (action === 'delete') return 'delete_tag';
	if (action === 'add') return 'add_tag';
	return 'set_tag';
}

/**
 * Manages the queue of pending property operations.
 * All operations are staged first, then executed atomically on user confirmation.
 *
 * Port of Python's pending_changes list + _execute_queue_internal().
 */
export class OperationQueueService extends Component implements IOperationQueue {
	private app: App;

	// SvelteMap provides fine-grained reactivity out of the box.
	readonly transactions = new SvelteMap<string, VirtualFileState>();

	// Lock mechanism to prevent race conditions when multiple operations hydrate the same file concurrently.
	private loadingLocks = new Map<string, Promise<VirtualFileState>>();
	private listeners = new Map<'changed', Set<() => void>>();

	private opCounter = 0;
	private changeCounter = 0;

	/**
	 * Logical pending changes derived from staged file transactions.
	 *
	 * `transactions` is the queue source of truth. This getter preserves the
	 * public `IOperationQueue.pending` contract without maintaining a second
	 * mutable list that can drift from individual staged op removals.
	 */
	get pending(): PendingChange[] {
		return this.pendingSnapshot();
	}

	/**
	 * Registry binding UI node ids to queued op descriptors. Populated by
	 * adapters via `bindOpToNode`. Used by `requestDelete` to resolve
	 * which queued ops conflict with a pending delete.
	 *
	 * The queue itself does not know about UI nodes (it is file-centric);
	 * the adapter that adds an op is the source of truth for the node
	 * binding. Entries are pruned when the corresponding op leaves the
	 * queue (via `removeOp` / `clear`).
	 */
	private nodeOpRegistry = new Map<string, Map<string, ConflictingOpDescriptor>>();

	/**
	 * Optional modal opener installed by the UI shell. When unset,
	 * `requestDelete` synthesises a `'cancel'` result for any conflict
	 * (defensive default).
	 */
	deleteConflictModalOpener: DeleteConflictModalOpener | null = null;

	get size(): number {
		return this.logicalOpCount;
	}

	constructor(app: App) {
		super();
		this.app = app;
	}

	on(event: 'changed', callback: () => void): () => void {
		const listeners = this.listeners.get(event) ?? new Set<() => void>();
		listeners.add(callback);
		this.listeners.set(event, listeners);
		return () => listeners.delete(callback);
	}

	off(event: 'changed', callback: () => void): void {
		this.listeners.get(event)?.delete(callback);
	}

	private emitChanged(): void {
		for (const callback of this.listeners.get('changed') ?? []) callback();
	}

	/** Back-compat shim: some UI code still iterates `queue` directly. */
	get queue(): PendingChange[] {
		return this.pendingSnapshot();
	}

	onUpdate(callback: () => void): () => void {
		return this.subscribe(callback);
	}

	subscribe(cb: () => void): () => void {
		return this.on('changed', cb);
	}

	private pendingSnapshot(): PendingChange[] {
		const groups = new Map<string, { op: StagedOp; files: TFile[] }>();
		for (const vfs of this.transactions.values()) {
			for (const op of vfs.ops) {
				const id = op.changeId ?? op.id;
				const group = groups.get(id);
				if (group) {
					group.files.push(vfs.file);
				} else {
					groups.set(id, { op, files: [vfs.file] });
				}
			}
		}
		return [...groups.entries()].map(([id, group]) =>
			this.pendingChangeFromStagedOp(id, group.op, group.files),
		);
	}

	private pendingChangeFromStagedOp(id: string, op: StagedOp, files: TFile[]): PendingChange {
		return {
			id,
			type: this.pendingTypeForOp(op),
			action: op.action,
			details: op.details,
			files,
			...(op.property ? { property: op.property } : {}),
			...(op.tag ? { tag: op.tag } : {}),
			customLogic: true,
			logicFunc: () => null,
		} as PendingChange;
	}

	private pendingTypeForOp(op: StagedOp): PendingChange['type'] {
		if (op.kind === 'find_replace_content') return 'content_replace';
		if (op.kind === 'rename_file') return 'file_rename';
		if (op.kind === 'move_file') return 'file_move';
		if (op.kind === 'delete_file') return 'file_delete';
		if (op.kind === 'set_tag' || op.kind === 'delete_tag' || op.kind === 'add_tag') return 'tag';
		if (op.kind === 'apply_template') return 'template';
		return 'property';
	}

	/** Remove a staged op by its op ID across all file transactions. */
	remove(id: string): void {
		let removed = false;
		for (const [path, vfs] of this.transactions) {
			if (vfs.ops.some((o) => o.id === id || o.changeId === id)) {
				this.removeOp(path, id, true);
				removed = true;
			}
		}
		if (removed) this.emitChanged();
	}

	/**
	 * Get existing VFS for file.path, or read from disk and create a new one.
	 * Uses loadingLocks to prevent race conditions during concurrent hydration.
	 */
	private async getOrCreateVFS(file: TFile, requireBody: boolean): Promise<VirtualFileState> {
		const key = file.path;

		const activeLock = this.loadingLocks.get(key);
		if (activeLock) return activeLock;

		const existing = this.transactions.get(key);
		if (existing) {
			if (requireBody && !existing.bodyLoaded) {
				return this.hydrateWithLock(existing);
			}
			return existing;
		}

		const promise = Promise.resolve().then(async () => {
			try {
				let vfs: VirtualFileState;
				if (!requireBody) {
					const cache = this.app.metadataCache.getFileCache(file);
					const fmCopy = { ...cache?.frontmatter };
					delete fmCopy['position'];
					vfs = {
						file,
						originalPath: key,
						newPath: undefined,
						fm: { ...fmCopy },
						body: '',
						ops: [],
						fmInitial: { ...fmCopy },
						bodyInitial: '',
						bodyLoaded: false,
					};
				} else {
					const content = await this.app.vault.read(file);
					const cache = this.app.metadataCache.getFileCache(file);
					const { fm, body } = splitYamlBody(content, cache ?? undefined);
					vfs = {
						file,
						originalPath: key,
						newPath: undefined,
						fm: { ...fm },
						body,
						ops: [],
						fmInitial: { ...fm },
						bodyInitial: body,
						bodyLoaded: true,
					};
				}
				this.transactions.set(key, vfs);
				return vfs;
			} finally {
				this.loadingLocks.delete(key);
			}
		});

		this.loadingLocks.set(key, promise);
		return promise;
	}

	private async hydrateWithLock(vfs: VirtualFileState): Promise<VirtualFileState> {
		const key = vfs.file.path;
		const activeLock = this.loadingLocks.get(key);
		if (activeLock) return activeLock;

		const promise = Promise.resolve().then(async () => {
			try {
				await this.hydrateBody(vfs);
				return vfs;
			} finally {
				this.loadingLocks.delete(key);
			}
		});

		this.loadingLocks.set(key, promise);
		return promise;
	}

	private async hydrateBody(vfs: VirtualFileState): Promise<void> {
		const content = await this.app.vault.read(vfs.file);
		const { body } = splitYamlBody(content);
		(vfs as { bodyInitial: string }).bodyInitial = body;
		vfs.body = body;
		vfs.bodyLoaded = true;
	}

	add(change: PendingChange): void {
		this.ingest(change).catch((err) => {
			serviceMessage.error('Failed to add change', { error: err });
		});
	}

	async addAsync(change: PendingChange): Promise<void> {
		await this.ingest(change);
	}

	async addBatch(changes: PendingChange[]): Promise<void> {
		if (changes.length === 0) return;
		for (const c of changes) {
			await this.ingest(c, false);
		}
		this.emitChanged();
	}

	private async ingest(change: PendingChange, emit = true): Promise<void> {
		const probe = getActivePerfProbe();
		if (probe) {
			await probe.measureAsync('queue.ingest', { files: change.files.length }, () =>
				this.ingestInner(change, emit),
			);
			return;
		}
		await this.ingestInner(change, emit);
	}

	private async ingestInner(change: PendingChange, emit = true): Promise<void> {
		const changeId = change.id ?? `change-${++this.changeCounter}`;
		const probe = this.probeForNativeRename(change);
		if (probe) {
			const activeProbe = getActivePerfProbe();
			if (activeProbe) {
				await activeProbe.measureAsync(
					'queue.expandNativeRename',
					{ files: change.files.length },
					() => this.expandNativeRename(change, probe.oldName, probe.newName, changeId),
				);
			} else {
				await this.expandNativeRename(change, probe.oldName, probe.newName, changeId);
			}
			if (emit) this.emitChanged();
			return;
		}

		for (const file of change.files) {
			const needsBody = this.opNeedsBody(change);
			const activeProbe = getActivePerfProbe();
			const vfs =
				(await activeProbe?.measureAsync('queue.getOrCreateVFS', { files: 1 }, () =>
					this.getOrCreateVFS(file, needsBody),
				)) ?? (await this.getOrCreateVFS(file, needsBody));
			const updates = activeProbe
				? activeProbe.measure('queue.logicFunc', { files: 1 }, () => change.logicFunc(file, vfs.fm))
				: change.logicFunc(file, vfs.fm);
			if (!updates) continue;
			if (activeProbe) {
				activeProbe.measure('queue.applyUpdates', { files: 1 }, () =>
					this.applyUpdates(vfs, change, updates, changeId),
				);
			} else {
				this.applyUpdates(vfs, change, updates, changeId);
			}
		}
		if (emit) this.emitChanged();
	}

	private probeForNativeRename(change: PendingChange): { oldName: string; newName: string } | null {
		if (change.files.length === 0) return null;
		const sample = change.logicFunc(change.files[0], {});
		if (sample && NATIVE_RENAME_PROP in sample) {
			return sample[NATIVE_RENAME_PROP] as { oldName: string; newName: string };
		}
		return null;
	}

	private opNeedsBody(change: PendingChange): boolean {
		if (change.type === 'content_replace') return true;
		if (change.type === 'template') return true;
		return false;
	}

	private applyUpdates(
		vfs: VirtualFileState,
		change: PendingChange,
		updates: Record<string, unknown>,
		changeId: string,
	): void {
		for (const [key, value] of Object.entries(updates)) {
			const op = this.translateUpdate(vfs, change, key, value, changeId);
			if (!op) continue;
			vfs.ops.push(op);
			op.apply(vfs);
		}
	}

	private translateUpdate(
		_vfs: VirtualFileState,
		change: PendingChange,
		key: string,
		value: unknown,
		changeId: string,
	): StagedOp | null {
		const id = `op-${++this.opCounter}`;
		const action = change.action;
		const details = change.details;

		if (key === DELETE_PROP) {
			const propName = value as string;
			return {
				id,
				changeId,
				property: propName,
				kind: 'delete_prop',
				action,
				details,
				apply: (v) => {
					delete v.fm[propName];
				},
			};
		}
		if (key === REORDER_ALL) {
			const ordered = value as string[];
			return {
				id,
				changeId,
				kind: 'reorder_props',
				action,
				details,
				apply: (v) => {
					const copy = { ...v.fm };
					for (const k of Object.keys(v.fm)) delete v.fm[k];
					for (const k of ordered) if (k in copy) v.fm[k] = copy[k];
					for (const k of Object.keys(copy)) if (!(k in v.fm)) v.fm[k] = copy[k];
				},
			};
		}
		if (key === RENAME_FILE) {
			const newName = value as string;
			return {
				id,
				changeId,
				kind: 'rename_file',
				action,
				details,
				apply: (v) => {
					v.newPath = v.originalPath.replace(v.file.name, newName);
				},
			};
		}
		if (key === MOVE_FILE) {
			const targetFolder = value as string;
			return {
				id,
				changeId,
				kind: 'move_file',
				action,
				details,
				apply: (v) => {
					v.newPath = targetFolder ? `${targetFolder}/${v.file.name}` : v.file.name;
				},
			};
		}
		if (key === DELETE_FILE) {
			return {
				id,
				changeId,
				kind: 'delete_file',
				action,
				details,
				apply: (v) => {
					v.deleted = true;
				},
			};
		}
		if (key === FIND_REPLACE_CONTENT) {
			const { pattern, replacement, isRegex, caseSensitive } = value as {
				pattern: string;
				replacement: string;
				isRegex: boolean;
				caseSensitive: boolean;
			};
			const flags = 'g' + (caseSensitive ? '' : 'i');
			const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const rx = new RegExp(escaped, flags);
			return {
				id,
				changeId,
				kind: 'find_replace_content',
				action,
				details,
				apply: (v) => {
					v.body = v.body.replace(rx, replacement);
				},
			};
		}
		if (key === APPEND_LINKS) {
			const links = (Array.isArray(value) ? (value as unknown[]) : []).map((v) => String(v));
			return {
				id,
				changeId,
				kind: 'append_links',
				action,
				details,
				apply: (v) => {
					const existing = v.body;
					const missing = links.filter((link) => !existing.includes(link));
					if (missing.length === 0) return;
					const sep = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
					v.body = `${existing}${sep}${missing.join('\n')}\n`;
				},
			};
		}
		if (key === APPLY_TEMPLATE) {
			const templateContent = (change as TemplateChange).templateContent;
			return {
				id,
				changeId,
				kind: 'apply_template',
				action,
				details,
				apply: (v) => {
					v.body = v.body + '\n\n' + templateContent;
				},
			};
		}
		if (key === NATIVE_RENAME_PROP) {
			return null;
		}
		if (change.type === 'tag' && key === 'tags') {
			return {
				id,
				changeId,
				tag: change.tag,
				kind: tagOpKind(change.action),
				action,
				details,
				apply: (v) => {
					v.fm.tags = value;
				},
			};
		}
		return {
			id,
			changeId,
			property: key,
			kind: 'set_prop',
			action,
			details,
			apply: (v) => {
				v.fm[key] = value;
			},
		};
	}

	private async expandNativeRename(
		change: PendingChange,
		oldName: string,
		newName: string,
		changeId: string,
	): Promise<void> {
		for (const file of change.files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm || !(oldName in fm)) continue;

			const existing = this.transactions.get(file.path);
			let vfs: VirtualFileState;
			if (existing) {
				vfs = existing;
			} else {
				const fmCopy = { ...fm };
				delete fmCopy['position'];
				vfs = {
					file,
					originalPath: file.path,
					newPath: undefined,
					fm: { ...fmCopy },
					body: '',
					ops: [],
					fmInitial: { ...fmCopy },
					bodyInitial: '',
					bodyLoaded: false,
				};
				this.transactions.set(file.path, vfs);
			}

			const id = `op-${++this.opCounter}`;
			const op: StagedOp = {
				id,
				changeId,
				property: oldName,
				kind: 'rename_prop',
				action: change.action,
				details: `${oldName} → ${newName}`,
				apply: (v) => {
					if (oldName in v.fm) {
						v.fm[newName] = v.fm[oldName];
						delete v.fm[oldName];
					}
				},
			};
			vfs.ops.push(op);
			op.apply(vfs);
		}
	}

	clear(): void {
		const hadTransactions = this.transactions.size > 0;
		this.transactions.clear();
		this.nodeOpRegistry.clear();
		if (hadTransactions) this.emitChanged();
	}

	/**
	 * Alias for `clear()` so the navbar double-click gesture and the
	 * `vaultman:open-queue` family of commands speak the same vocabulary
	 * as the rest of the multifacet wave 2 surfaces.
	 */
	clearAll(): void {
		this.clear();
	}

	/**
	 * Convenience wrapper around `execute()` for the
	 * `vaultman:process-queue` command. Returns the same OperationResult
	 * so callers can await completion. Errors propagate through the same
	 * Notice-driven flow as `execute()`.
	 */
	processAll(): Promise<OperationResult> {
		return this.execute();
	}

	removeFile(path: string): void {
		const removed = this.transactions.delete(path);
		if (removed) this.emitChanged();
	}

	removeOp(path: string, opId: string, _silent = false): void {
		const vfs = this.transactions.get(path);
		if (!vfs) return;
		const filtered = vfs.ops.filter((o) => o.id !== opId && o.changeId !== opId);
		if (filtered.length === vfs.ops.length) return;
		if (filtered.length === 0) {
			this.transactions.delete(path);
		} else {
			vfs.fm = { ...vfs.fmInitial };
			vfs.body = vfs.bodyInitial;
			vfs.newPath = undefined;
			vfs.deleted = false;
			vfs.ops = filtered;
			for (const op of vfs.ops) op.apply(vfs);
			this.transactions.set(path, vfs);
		}
		if (!_silent) this.emitChanged();
	}

	get fileCount(): number {
		return this.transactions.size;
	}

	get opCount(): number {
		let n = 0;
		for (const v of this.transactions.values()) n += v.ops.length;
		return n;
	}

	get logicalOpCount(): number {
		const ids = new Set<string>();
		for (const v of this.transactions.values()) {
			for (const op of v.ops) {
				ids.add(op.changeId ?? op.id);
			}
		}
		return ids.size;
	}

	get isEmpty(): boolean {
		return this.transactions.size === 0;
	}

	getTransaction(path: string): VirtualFileState | undefined {
		return this.transactions.get(path);
	}

	listTransactions(): VirtualFileState[] {
		return [...this.transactions.values()];
	}

	async execute(): Promise<OperationResult> {
		const result: OperationResult = { success: 0, errors: 0, messages: [] };

		if (this.transactions.size === 0) {
			serviceMessage.info(translate('result.no_changes'));
			return result;
		}

		const entries = [...this.transactions.values()];
		const total = entries.length;
		const CHUNK = 20;
		const notice = new Notice('', 0);

		for (let i = 0; i < entries.length; i++) {
			const vfs = entries[i];
			notice.setMessage(`${translate('result.applying')} ${i + 1} / ${total}`);

			try {
				await this.commitFile(vfs);
				result.success++;
			} catch (err) {
				result.errors++;
				result.messages.push(`${vfs.originalPath}: ${String(err)}`);
			}

			if ((i + 1) % CHUNK === 0) {
				await new Promise<void>((r) => activeWindow.setTimeout(r, 0));
			}
		}

		notice.hide();
		this.transactions.clear();
		this.emitChanged();

		const resultMessage =
			result.errors > 0
				? translate('result.errors', { count: result.errors })
				: translate('result.success', { count: result.success });
		if (result.errors > 0) {
			serviceMessage.error(resultMessage, { details: result.messages });
		} else {
			serviceMessage.success(resultMessage);
		}

		return result;
	}

	private async commitFile(vfs: VirtualFileState): Promise<void> {
		if (vfs.deleted) {
			await this.app.fileManager.trashFile(vfs.file);
			return;
		}

		await this.app.vault.process(vfs.file, (currentContent) => {
			if (!vfs.bodyLoaded) {
				return this.applyOpsToRawContent(currentContent, vfs);
			}
			return serializeFile(vfs.fm, vfs.body);
		});

		if (vfs.newPath && vfs.newPath !== vfs.originalPath) {
			await this.app.fileManager.renameFile(vfs.file, vfs.newPath);
		}
	}

	private applyOpsToRawContent(currentContent: string, vfs: VirtualFileState): string {
		const { fm, body } = splitYamlBody(currentContent);
		const scratch: VirtualFileState = {
			...vfs,
			fm: { ...fm },
			body,
			fmInitial: { ...fm },
			bodyInitial: body,
			bodyLoaded: true,
			ops: [],
		};
		for (const op of vfs.ops) op.apply(scratch);
		return serializeFile(scratch.fm, scratch.body);
	}

	/**
	 * Bind a queued op to a UI node so the delete-conflict flow can list
	 * it. Adapters should call this immediately after `add`/`addAsync`
	 * for any op that should be undone if the user later confirms a
	 * delete on that node.
	 */
	bindOpToNode(nodeId: string, descriptor: ConflictingOpDescriptor): void {
		let entry = this.nodeOpRegistry.get(nodeId);
		if (!entry) {
			entry = new Map();
			this.nodeOpRegistry.set(nodeId, entry);
		}
		entry.set(descriptor.opId, descriptor);
	}

	/** Returns the descriptors currently bound to a node. */
	listOpsForNode(nodeId: string): ConflictingOpDescriptor[] {
		const entry = this.nodeOpRegistry.get(nodeId);
		if (!entry) return [];
		return [...entry.values()];
	}

	/**
	 * Drop every op bound to `nodeId` whose `kind` is in `kinds`. Returns
	 * the descriptors that were dropped. If `kinds` is omitted, every
	 * bound op for the node is dropped.
	 */
	dropForNode(nodeId: string, kinds?: readonly BadgeKind[]): ConflictingOpDescriptor[] {
		const entry = this.nodeOpRegistry.get(nodeId);
		if (!entry || entry.size === 0) return [];
		const allow = kinds ? new Set(kinds) : null;
		const dropped: ConflictingOpDescriptor[] = [];
		const snapshot = [...entry.values()];
		for (const desc of snapshot) {
			if (allow && !allow.has(desc.kind)) continue;
			// Resolve the path the op lives under, fall back to scanning
			// every transaction.
			if (desc.filePath) {
				this.removeOp(desc.filePath, desc.opId, true);
			} else {
				this.remove(desc.opId);
			}
			entry.delete(desc.opId);
			dropped.push(desc);
		}
		if (entry.size === 0) this.nodeOpRegistry.delete(nodeId);
		if (dropped.length > 0) this.emitChanged();
		return dropped;
	}

	/**
	 * Top-level workflow for a delete request originating from a hover
	 * badge. If the node has no other queued ops, `enqueueDelete` is
	 * invoked immediately and the result is `'queued'`. Otherwise the
	 * registered `DeleteConflictModalOpener` is asked to confirm; on
	 * confirm, conflicting ops are dropped and `enqueueDelete` runs;
	 * on cancel the queue is left untouched.
	 *
	 * `enqueueDelete` is supplied by the caller because the queue does
	 * not know how to construct a `PendingChange` for an arbitrary
	 * provider (file vs tag vs prop vs value). The caller decides.
	 */
	async requestDelete(params: {
		nodeId: string;
		nodeLabel: string;
		enqueueDelete: () => void | Promise<void>;
	}): Promise<RequestDeleteResult> {
		const { nodeId, nodeLabel, enqueueDelete } = params;
		const conflicting = this.listOpsForNode(nodeId).filter((desc) => desc.kind !== 'delete');
		if (conflicting.length === 0) {
			await enqueueDelete();
			return 'queued';
		}
		const opener = this.deleteConflictModalOpener;
		if (!opener) {
			// No UI shell to open the modal — fail closed.
			return 'cancelled';
		}
		const decision = await opener({ nodeId, nodeLabel, conflictingOps: conflicting });
		if (decision !== 'confirm') return 'cancelled';
		this.dropForNode(
			nodeId,
			conflicting.map((c) => c.kind),
		);
		await enqueueDelete();
		return 'queued';
	}

	simulateChanges(): Map<
		string,
		{ before: Record<string, unknown>; after: Record<string, unknown>; newPath?: string }
	> {
		const diffs = new Map<
			string,
			{ before: Record<string, unknown>; after: Record<string, unknown>; newPath?: string }
		>();
		for (const [path, vfs] of this.transactions) {
			diffs.set(path, {
				before: { ...vfs.fmInitial },
				after: { ...vfs.fm },
				newPath: vfs.newPath,
			});
		}
		return diffs;
	}
}
