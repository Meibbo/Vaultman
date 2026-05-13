/**
 * serviceCommands — registers the multifacet wave 2 quick-command set
 * with Obsidian's command palette. Each command uses `checkCallback`
 * so it greys out when its prerequisite (open panel, active explorer)
 * is missing.
 *
 * Spec:
 *   docs/work/hardening/specs/2026-05-07-multifacet-2/03-quick-commands.md
 *
 * Rationale for keeping this in a service module rather than `main.ts`:
 *   - Keeps `main.ts` lean and lets the registration be unit-tested
 *     against a stub `Plugin` without running the full plugin lifecycle.
 *   - Allows future commands to be added without re-touching `onload`.
 */

import type { Plugin, Command, App, WorkspaceLeaf } from 'obsidian';
import type { FnRIslandService } from './serviceFnRIsland.svelte';
import type { OperationQueueService } from './serviceQueue.svelte';
import type { PanelExplorerImperativeApi } from '../types/typeExplorer';
import { PerfMeter } from './perfMeter';

/**
 * Surface that the commands need from the host plugin. Kept narrow on
 * purpose so unit tests can stub it without dragging in the full
 * plugin object graph.
 */
export interface VaultmanCommandHost {
	app: App;
	queueService: Pick<OperationQueueService, 'isEmpty' | 'processAll' | 'clearAll'>;
	/**
	 * Returns the active explorer's FnR island service, or `null` when
	 * no panel is mounted. The lookup is lazy because pages mount their
	 * own panel-scoped `FnRIslandService` instance.
	 */
	getActiveFnRIslandService?(): FnRIslandService | null;
	/**
	 * Returns the imperative API for the active panel explorer, or
	 * `null` when no panel is mounted. Used by `vaultman:open` to
	 * land focus on the first virtual row.
	 */
	getActivePanelExplorerApi?(): PanelExplorerImperativeApi | null;
	/**
	 * Reveals the Vaultman panel leaf (sidebar or main pane,
	 * whichever the user configured). Mirrors `VaultmanPlugin.activateView`.
	 */
	activateView(): Promise<void>;
	/**
	 * Toggle the Vaultman panel leaf. When absent, commands fall back to
	 * `activateView` for backwards-compatible open-only behavior.
	 */
	toggleView?(): Promise<void>;
	/**
	 * Returns a leaf that hosts the Vaultman frame, or `null` if none
	 * is mounted. Used by the open-* commands to know whether the
	 * panel is reachable without mounting a fresh leaf.
	 */
	getVaultmanLeaf?(): WorkspaceLeaf | null;
	/** Open the filters popup for the active explorer. */
	openFiltersPopup?(): void;
	/** Open the queue popup. */
	openQueuePopup?(): void;
	/** Open the view menu of the active tab. */
	openViewMenu?(): void;
	/** Open the sort menu of the active tab. */
	openSortMenu?(): void;
	/** Open the diff review surface in the active Vaultman frame. */
	openDiffView?(): void;
}

/**
 * Command ids registered by `registerVaultmanCommands`. Exported as a
 * tuple so tests and downstream tooling can iterate the canonical set
 * without re-declaring it.
 */
export const VAULTMAN_COMMAND_IDS = [
	'open-filters',
	'open-queue',
	'process-queue',
	'open-view-menu',
	'open-sort-menu',
	'open',
	'open-diff',
	'open-find-replace-active-explorer',
] as const;

export type VaultmanCommandId = (typeof VAULTMAN_COMMAND_IDS)[number];

/**
 * Registers the multifacet wave 2 quick commands. Returns the array of
 * command definitions for verification. Caller passes `plugin` so the
 * Obsidian-supplied `addCommand` method runs with the correct `this`.
 */
export function registerVaultmanCommands(
	plugin: Plugin,
	host: VaultmanCommandHost,
): Command[] {
	const definitions: Command[] = [];

	function panelIsAvailable(): boolean {
		return host.getVaultmanLeaf?.() != null;
	}

	function activeFnRService(): FnRIslandService | null {
		return host.getActiveFnRIslandService?.() ?? null;
	}

	function revealVaultmanLeaf(): void {
		const leaf = host.getVaultmanLeaf?.();
		if (leaf) {
			void host.app.workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Wrap a command's executor (`callback` / `checkCallback`) so it
	 * emits a `command` record via `PerfMeter`. We preserve the
	 * `checkCallback` semantics by leaving the early-return path
	 * untouched.
	 */
	function wrapCommand(command: Command): Command {
		const id = command.id;
		if (command.callback) {
			const original = command.callback;
			command.callback = () => {
				void PerfMeter.timeAsync(
					`command:${id}`,
					async () => {
						await original();
					},
					'command',
				);
			};
		}
		if (command.checkCallback) {
			const original = command.checkCallback;
			command.checkCallback = (checking: boolean) => {
				if (checking) return original(checking);
				const start = performance.now();
				const result = original(false);
				const duration = performance.now() - start;
				PerfMeter.emit({
					ts: Date.now(),
					label: `command:${id}`,
					durationMs: duration,
					kind: 'command',
				});
				return result;
			};
		}
		return command;
	}

	function add(command: Command): void {
		const wrapped = wrapCommand(command);
		definitions.push(wrapped);
		plugin.addCommand(wrapped);
	}

	add({
		id: 'open-filters',
		name: 'Open filters',
		checkCallback: (checking) => {
			if (!panelIsAvailable()) return false;
			if (!checking) host.openFiltersPopup?.();
			return true;
		},
	});

	add({
		id: 'open-queue',
		name: 'Open queue',
		checkCallback: (checking) => {
			if (!panelIsAvailable()) return false;
			if (!checking) host.openQueuePopup?.();
			return true;
		},
	});

	add({
		id: 'process-queue',
		name: 'Process queue',
		checkCallback: (checking) => {
			if (host.queueService.isEmpty) return false;
			if (!checking) {
				void host.queueService.processAll();
			}
			return true;
		},
	});

	add({
		id: 'open-view-menu',
		name: 'Open view menu',
		checkCallback: (checking) => {
			if (!panelIsAvailable()) return false;
			if (!checking) host.openViewMenu?.();
			return true;
		},
	});

	add({
		id: 'open-sort-menu',
		name: 'Open sort menu',
		checkCallback: (checking) => {
			if (!panelIsAvailable()) return false;
			if (!checking) host.openSortMenu?.();
			return true;
		},
	});

	add({
		id: 'open',
		name: 'Open Vaultman',
		callback: () => {
			void (async () => {
				const wasOpen = panelIsAvailable();
				if (host.toggleView) await host.toggleView();
				else await host.activateView();
				if (host.toggleView && wasOpen) return;
				revealVaultmanLeaf();
				const api = host.getActivePanelExplorerApi?.();
				api?.focusFirstNode();
			})();
		},
	});

	add({
		id: 'open-diff',
		name: 'Open diff review',
		callback: () => {
			void (async () => {
				await host.activateView();
				revealVaultmanLeaf();
				host.openDiffView?.();
			})();
		},
	});

	add({
		id: 'open-find-replace-active-explorer',
		name: 'Open find & replace on active explorer',
		checkCallback: (checking) => {
			if (!panelIsAvailable()) return false;
			const service = activeFnRService();
			if (!service) return false;
			if (!checking) {
				void (async () => {
					const snapshot = service.snapshot();
					if (snapshot.expanded && snapshot.mode === 'replace') {
						service.collapse();
						return;
					}
					await host.activateView();
					const leaf = host.getVaultmanLeaf?.();
					if (leaf) {
						void host.app.workspace.revealLeaf(leaf);
					}
					service.setMode('replace');
					service.expand();
					// Focus the searchbox via the DOM contract that
					// `Toolbar.svelte` provides — the `.vm-filters-search-input`
					// class is the canonical anchor.
					const win = typeof activeWindow !== 'undefined' ? activeWindow : null;
					const doc = typeof activeDocument !== 'undefined' ? activeDocument : null;
					win?.requestAnimationFrame(() => {
						const input = doc?.querySelector<HTMLInputElement>(
							'.vm-filters-search-input',
						);
						input?.focus();
						input?.select();
					});
				})();
			}
			return true;
		},
	});

	return definitions;
}
