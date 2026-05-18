import type { TFile } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { translate } from '../../index/i18n/lang';
import { FolderSuggest } from '../../utils/autocomplete';
import {
	normalizeOperationScope,
	type OperationScope,
} from '../../services/serviceOperationScope';
import {
	collectActiveFilterRules,
	type ActiveFilterRule,
} from './frameActiveFilters';
import { createMoveChanges, createMovePreviews, type MovePreview } from './frameMoves';
import type { FrameOverlayController } from './frameOverlays.svelte';

export const FRAME_POPUPS_KEY: unique symbol = Symbol('frame.popups');

type ScopeOption = Readonly<{ value: string; label: string; icon: string }>;

export class FramePopupsState {
	readonly #plugin: VaultmanPlugin;
	readonly #overlays: FrameOverlayController;
	readonly #onStatsDirty: () => void;

	readonly scopeOptions: ReadonlyArray<ScopeOption>;

	#activeFilterRules = $state<ActiveFilterRule[]>([]);
	#searchName = $state('');
	#searchFolder = $state('');
	#moveTargetFiles = $state<TFile[]>([]);
	#moveTargetFolder = $state('');

	constructor(
		plugin: VaultmanPlugin,
		overlays: FrameOverlayController,
		onStatsDirty: () => void,
	) {
		this.#plugin = plugin;
		this.#overlays = overlays;
		this.#onStatsDirty = onStatsDirty;
		this.scopeOptions = Object.freeze(
			[
				{
					value: 'auto',
					label: translate('settings.scope.auto'),
					icon: 'lucide-sparkles',
				},
				{
					value: 'filtered',
					label: translate('scope.filtered'),
					icon: 'lucide-filter',
				},
				{
					value: 'selected',
					label: translate('scope.selected'),
					icon: 'lucide-check-square',
				},
			].map((option) => Object.freeze(option)),
		);
	}

	setScope(value: string): void {
		const normalized = normalizeOperationScope(value as OperationScope);
		this.#plugin.settings.explorerOperationScope = normalized;
		void this.#plugin.saveSettings();
		this.#overlays.closePopup();
	}

	setFiltersOperationScope(value: OperationScope): void {
		const normalized = normalizeOperationScope(value);
		this.#plugin.settings.explorerOperationScope = normalized;
		void this.#plugin.saveSettings();
	}

	get activeFilterRules(): ActiveFilterRule[] {
		return this.#activeFilterRules;
	}

	refreshActiveFiltersPopup(): void {
		this.#activeFilterRules = collectActiveFilterRules(this.#plugin.filterService.activeFilter);
	}

	toggleFilterRule(rule: ActiveFilterRule): void {
		if (rule.node.id) {
			this.#plugin.filterService.toggleFilterRule(rule.node.id);
		}
		this.refreshActiveFiltersPopup();
	}

	deleteFilterRule(rule: ActiveFilterRule): void {
		this.#plugin.filterService.removeNode(rule.node, rule.parent);
		this.refreshActiveFiltersPopup();
		this.#onStatsDirty();
	}

	get searchName(): string {
		return this.#searchName;
	}

	set searchName(v: string) {
		this.#searchName = v;
	}

	get searchFolder(): string {
		return this.#searchFolder;
	}

	set searchFolder(v: string) {
		this.#searchFolder = v;
	}

	get moveTargetFiles(): TFile[] {
		return this.#moveTargetFiles;
	}

	set moveTargetFiles(v: TFile[]) {
		this.#moveTargetFiles = v;
	}

	get moveTargetFolder(): string {
		return this.#moveTargetFolder;
	}

	set moveTargetFolder(v: string) {
		this.#moveTargetFolder = v;
	}

	get movePreviews(): MovePreview[] {
		return createMovePreviews(this.#moveTargetFiles, this.#moveTargetFolder);
	}

	queueMoves(): void {
		const changes = createMoveChanges(this.#moveTargetFiles, this.#moveTargetFolder);
		void this.#plugin.queueService.addBatch(changes);
		this.#overlays.closePopup();
	}

	attachFolderSuggest(el: HTMLElement): { destroy(): void } {
		const suggest = new FolderSuggest(
			this.#plugin.app,
			el as HTMLInputElement,
			(path: string) => {
				this.#moveTargetFolder = path;
				(el as HTMLInputElement).value = path;
			},
		);
		return {
			destroy: () => suggest.close(),
		};
	}
}
