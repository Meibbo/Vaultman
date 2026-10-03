import { Component, Menu, Notice, setTooltip } from 'obsidian';
import { tooltipPlacementForSetting } from '../../logic/logicCellTooltip';
import type { VaultmanPlugin } from '../../main';
import { translate } from '../../i18n/index';
import { pluginAliasTokens, prefixesFromSettings } from '../../services/serviceNodeBinding';
import type { PluginMeta, TreeNode, TreeNodeCell } from '../../types/typeTree';
import type { ExplorerSortState, ExplorerViewMode } from '../../types/typeUI';
import type { AddonCellStyle } from '../../types/typeSettings';
import type { FloatingTocExpansionChange } from '../../services/routerFloatingToc';
import type { IndexNodeRef } from '../../logic/logicIndexGroups';
import {
	deletionBadge,
	findDeletionMatch,
	queueDeletesSubject,
} from '../../logic/logicDeletionDecoration';
import {
	communityPluginStateSignature,
	listCommunityPluginEntries,
	pluginRibbonItem,
	setCommunityPluginEnabled,
} from '../../utils/obsidianAddons';
import {
	getAddonIconOverride,
	readAddonIconOverrides,
	resolveAddonIcon,
} from '../../logic/logicAddonIcons';
import {
	buildAddonHoverInfo,
	buildCanonicalRestRoots,
	buildGlobalSettingsNodes,
	filterAddonEntries,
	formatAddonTimestamp,
	GLOBAL_SETTINGS_GROUP_ID,
	GLOBAL_SETTINGS_GROUP_LABEL,
	isSettingsSearchActive,
	listCorePluginStubs,
	pluginCanonicalGroup,
	sortAddonEntries,
	type AddonExplorerPanelPort,
} from '../../logic/logicAddonExplorer';
import {
	activeScopeSort,
	normalizeExplorerSortState,
	sameExplorerSortState,
} from '../../logic/logicScopedSort';
import { isFloatingTocSortIndexable } from '../../logic/logicFloatingTocAvailability';
import { UnifiedTreeView } from '../layout/viewTree';
import {
	normalizeAddonCellStyle,
	openPluginSettings,
	pluginSettingTabIds,
	toggleCommunityPlugin,
} from '../../logic/logicAddonCells';
import {
	executeSettingSceneActivation,
	hasSettingOpenApi,
	normalizeSettingSceneGoToTarget,
	openSettingsTabById,
	resolveSettingSceneActivation,
} from '../../logic/logicSettingSceneActivation';
import {
	normalizeSettingSceneMode,
	resolveSettingSceneContent,
	settingSceneModeToggle,
	type SettingSceneContentModel,
	type SettingSceneMode,
	type SettingSceneModeToggle,
} from '../../logic/logicSettingSceneContent';
import {
	resolveGroupToggleTarget,
	summarizeGroupToggleState,
} from '../../logic/logicAddonGroupToggle';
import {
	normalizeInteractionMode,
	type InteractionMode,
} from '../../logic/logicInteractionMode';
import {
	cloneGroupMemberships,
	formatMembershipUrn,
	sameGroupMemberships,
} from '../../logic/logicMembershipUrn';
import {
	makeScopedGroupKey,
	parseScopedGroupKey,
} from '../../logic/logicScopedCustomGroups';
import { showInputModal } from '../../utils/inputModal';
import { bubbleMemberCountsToGroups } from '../../logic/logicBadgeBubbling';
import {
	collectGroupMemberIds,
	entityIdOf,
	expandNewGroupHeaders,
	isGroupHeader,
	occurrenceOwnerOf,
	projectGroupedTree,
	PRESET_GROUP_PREFIX,
	resolveCustomGroups,
	toggleGroupMembers,
} from '../../logic/logicTreeGroupProjection';
import {
	API_SCENE_GROUP_KIND,
	API_SCENE_GROUP_LABEL_KEYS,
	type ApiSceneGroupName,
} from '../../logic/logicApiSceneModel';
import {
	cloneGroupPreset,
	NO_GROUP_PRESET,
	sameGroupPreset,
	type GroupPreset,
} from '../../types/typeGroupPreset';
import { translatedRangeLabels } from '../../utils/groupPresetLabels';
import {
	snapshotPresetBucket,
	type MaterializePresetHandler,
} from '../../logic/logicGroupPresets';
import type { MenuCtx } from '../../types/typeCMenu';
import type { NativeSettingsSearchGroup } from '../../types/typeSettingsSearch';
import {
	settingsBridgeIdentity,
	settingsBridgeRefOf,
} from '../../types/typeSettingsSearch';
import {
	isNativeSettingsSearchAvailable,
	queryNativeSettingsSearch,
} from '../../services/serviceSettingSearchAdapter';
import {
	noteSelectionState,
	reconcileCommittedGroupCreation,
	selectionKeyFor,
	snapshotFromProjectedTree,
	type CreateGroupHandler,
	type DegroupSelectedHandler,
} from '../../logic/logicGroupSelectionTransaction';
import {
	resolveContextClickSelection,
	resolveCheckboxSelection,
	shouldClearExplorerSelectionOnEscape,
} from '../../logic/logicSelectionTargets';
import { flattenVisibleTree } from '../../utils/treeVirtualization';
import { projectAddonDataNodes, type AddonExplorerDataSource } from '../../logic/logicAddonDataSource';

export class PluginsExplorerPanel
	extends Component
	implements AddonExplorerPanelPort
{
	private readonly containerEl: HTMLElement;
	private readonly plugin: VaultmanPlugin;
	private readonly dataSource: AddonExplorerDataSource | undefined;
	private treeView: UnifiedTreeView | null = null;
	private nodes: TreeNode<PluginMeta>[] = [];
	/** A07b-2: el ultimo arbol PROYECTADO (cabeceras + ocurrencias `id@grupo`),
	 *  como el `_lastRenderTree` de files. La seleccion guarda ids de fila
	 *  proyectada y solo este arbol los empareja todos. */
	private _lastProjectedTree: TreeNode<PluginMeta>[] = [];
	private entries: PluginMeta[] = [];
	private searchTerm = '';
	/**
	 * U130 Slice A (provider/search settingScene): con término activo la
	 * única fuente es `app.setting.searchIndex.search` (una sola búsqueda
	 * por cambio efectivo, sin `searchText` local). El resultado crudo se
	 * cachea aquí para que sorts, grupos y refreshes re-resuelvan sin
	 * re-preguntar al nativo; `null` = adapter ausente o término inactivo.
	 */
	private settingsSearchGroups: NativeSettingsSearchGroup[] | null = null;
	/** Ids de fila del puente: todo lo emitido es match y se resalta. */
	private settingsSearchHighlightIds = new Set<string>();
	/** U130: highlight solo si el usuario activó explorerSearchHighlights. */
	private get searchHighlightEnabled(): boolean {
		return this.plugin.settings?.explorerSearchHighlights === true;
	}
	/** Término no vacío con adapter ausente: estado "unavailable", sin stale. */
	private settingsSearchUnavailable = false;
	private sortState = normalizeExplorerSortState('plugins', null);
	private visibleCells = new Set(['icon', 'text', 'state', 'config', 'nested']);
	private emptyEl: HTMLElement | null = null;
	private destroyed = false;
	private refreshRevision = 0;
	private cellStyle: AddonCellStyle;
	private readonly pendingToggleIds = new Set<string>();
	private readonly pendingUpdateIds = new Set<string>();
	private interactionMode: InteractionMode = 'open';
	private selectedNodeIds = new Set<string>();
	/** U130-GGC-022/024: per-instance/scene range anchor (occurrence row id). */
	private selectionAnchorId: string | null = null;
	private createGroupHandler?: CreateGroupHandler;
	private degroupSelectedHandler?: DegroupSelectedHandler;
	private materializePresetHandler?: MaterializePresetHandler;
	private groupHideHandler?: (groupId: string, hidden: boolean) => void;
	private groupDeleteHandler?: (groupId: string) => void;
	private groupRenameHandler?: (groupId: string, nextName?: string) => Promise<void> | void;
	private groupCopyHandler?: (groupId: string) => void;
	private groupScopeHandler?: (groupId: string) => void;
	private selectionInstanceId: string | null = null;
	private selectionRevision: number | null = null;

	private _selectionKey(): string {
		const provider = this.dataSource?.providerId ?? 'plugins';
		return selectionKeyFor(provider, provider, this.selectionInstanceId);
	}

	private _touchSelection(): void {
		noteSelectionState(this._selectionKey(), this.selectedNodeIds);
	}
	/**
	 * U130 parity C (F6): modo scene-local (`explorer` default). Solo esta
	 * instancia lo ve; `input=open` sigue yendo al modal (F5) en ambos.
	 */
	private settingSceneMode: SettingSceneMode = 'explorer';
	/** U130 parity C (F6): fila que alimenta al modo content. */
	private settingSceneContentId: string | null = null;
	private onSettingSceneModeChange?: () => void;
	/** U130-03: ids de los grupos custom activos. Lo puebla la tarea 3.3. */
	private readonly _groupIds = new Set<string>();
	/** Spec 08 §3.2: the grouping switch IS this selection; `none` = off. */
	private groupPreset: GroupPreset = { ...NO_GROUP_PRESET };
	/** Spec 08: view_option `indent` per_instance. `false` flattens row padding
	 *  to 4px and zeroes the per-depth indent unit. Default (unset) keeps the
	 *  indented geometry of today. */
	private indentOverride: boolean | undefined;
	private tooltipsOverride: boolean | undefined;
	private stickyRowsOverride: boolean | undefined = undefined;
	private compactFoldersOverride: boolean | undefined = undefined;
	private onExpansionChange?: () => void;
	/** Spec 08 §3.3: set by the navbar; receives the selection's membership URNs. */
	/** Spec 08 §4: hidden custom groups of this instance; they project as `No group`. */
	private hiddenGroupIds: ReadonlySet<string> = new Set();
	/** U130-09: custom groups of this scene of this instance (`SceneConfig.groupMemberships`). */
	private groupMemberships: Readonly<Record<string, readonly string[]>> = {};
	/** Group headers this explorer has already shown once (they open on first sight). */
	private readonly _seenGroupHeaderIds = new Set<string>();
	private _expandedGroupIds = new Set<string>();

	constructor(containerEl: HTMLElement, plugin: VaultmanPlugin, dataSource?: AddonExplorerDataSource) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.dataSource = dataSource;
		this.cellStyle = normalizeAddonCellStyle(plugin.settings.addonCellStyle);
	}

	onload(): void {
		this.destroyed = false;
		this.containerEl.addEventListener('keydown', this._handleSelectionEscape);
		this.register(() =>
			this.containerEl.removeEventListener('keydown', this._handleSelectionEscape),
		);
		this.treeView = new UnifiedTreeView(this.containerEl);
		if (this.dataSource) {
			this.rebuildNodes();
			return;
		}
		void this.refresh();
		// Core Settings toggles emit no event; poll a cheap signature while the
		// panel is visible and refresh only on a real delta (BT4-006).
		this.registerInterval(
			window.setInterval(() => this._syncExternalState(), 2500),
		);
		this.registerEvent(
			this.plugin.app.metadataCache.on('changed', () => {
				if (this.visibleCells.has('format')) this.render();
			}),
		);
		this.registerEvent(
			this.plugin.app.vault.on('create', () => {
				if (this.visibleCells.has('format')) this.render();
			}),
		);
		this.registerEvent(
			this.plugin.app.vault.on('delete', () => {
				if (this.visibleCells.has('format')) this.render();
			}),
		);
		// BT5-019: external icon edits repaint through the existing adapter
		// event — no new timer — and the subscription is released on unload.
		const iconic = this.plugin.iconicService;
		if (iconic) {
			this.register(iconic.onChanged(this._scheduleIconRebuild));
		}
		// U121-076: uninstalls are queued now, so this scene has to repaint when
		// the queue moves. Snippets already did; Plugins never listened.
		this.plugin.queueService.on('changed', this._handleQueueChange);
		this.register(() =>
			this.plugin.queueService.off('changed', this._handleQueueChange),
		);
		const pluginUpdates = this.plugin.pluginUpdatesService;
		if (pluginUpdates) {
			const stopPluginUpdateListening = pluginUpdates.onChanged(() => {
				if (this.destroyed) return;
				this.entries = this.entries.map((entry) => ({
					...entry,
					version: pluginUpdates.getInstalledVersion(entry.pluginId) ?? entry.version,
					updateVersion: pluginUpdates.getPluginUpdate(entry.pluginId)?.version,
				}));
				this.rebuildNodes();
			});
			this.register(stopPluginUpdateListening);
		}
		// U121-108: live repaint of selectionCheckboxPosition (start/end/hidden)
		// across every mounted scene. Reuses the icon-rebuild coalescer (one
		// rebuild per burst) instead of adding a second timer.
		this.register(
			this.plugin.onSettingsChange(this._scheduleIconRebuild),
		);
	}

	private readonly _handleQueueChange = (): void => {
		if (!this.destroyed) this.rebuildNodes();
	};

	private deletionBadges(pluginId: string) {
		const match = findDeletionMatch(
			{ kind: 'plugin', pluginId },
			this.plugin.queueService.queue,
		);
		return match ? [deletionBadge(match, { solid: true })] : undefined;
	}

	private deletionCls(pluginId: string): string | undefined {
		return queueDeletesSubject(
			{ kind: 'plugin', pluginId },
			this.plugin.queueService.queue,
		)
			? 'is-deleted-plugin'
			: undefined;
	}

	private _iconRebuildScheduled = false;

	/** Coalesce bursts of external icon changes into one rebuild. */
	private readonly _scheduleIconRebuild = (): void => {
		if (this.destroyed || this._iconRebuildScheduled) return;
		this._iconRebuildScheduled = true;
		window.setTimeout(() => {
			this._iconRebuildScheduled = false;
			if (!this.destroyed) this.rebuildNodes();
		}, 0);
	};

	private _lastExternalSignature = '';

	private _syncExternalState(): void {
		if (this.dataSource) return;
		if (this.destroyed || !this.containerEl.isShown()) return;
		const signature = communityPluginStateSignature(this.plugin.app);
		if (signature === this._lastExternalSignature) return;
		this._lastExternalSignature = signature;
		void this.refresh();
	}

	onunload(): void {
		this.destroyed = true;
		this.refreshRevision += 1;
		this.treeView?.destroy();
		this.treeView = null;
		this.emptyEl?.remove();
		this.emptyEl = null;
		super.onunload();
	}

	/** BT4-022: hidden panes measure 0; re-render on activation. */
	refreshViewport(): void {
		this.treeView?.refreshViewport();
		this._syncExternalState();
	}

	async refresh(): Promise<void> {
		if (this.dataSource) {
			this.rebuildNodes();
			return;
		}
		const revision = ++this.refreshRevision;
		const manifestId = this.plugin.manifest.id;
		this._lastExternalSignature = communityPluginStateSignature(
			this.plugin.app,
		);
		const entries = await listCommunityPluginEntries(this.plugin.app);
		if (this.destroyed || revision !== this.refreshRevision) return;
		this.entries = entries.map((entry) => ({
			...entry,
			updateVersion: this.plugin.pluginUpdatesService?.getPluginUpdate(entry.pluginId)?.version,
			isVaultman: entry.pluginId === manifestId,
		}));
		this.rebuildNodes();
	}

	setSearchTerm(term: string): void {
		if (this.searchTerm === term) return;
		this.searchTerm = term;
		if (this.dataSource) {
			this.rebuildNodes();
			return;
		}
		if (isSettingsSearchActive(term)) {
			if (isNativeSettingsSearchAvailable(this.plugin.app)) {
				try {
					this.settingsSearchGroups = queryNativeSettingsSearch(
						this.plugin.app,
						term,
					);
					this.settingsSearchUnavailable = false;
				} catch (error) {
					console.error(
						'Vaultman settings bridge: native search failed',
						error,
					);
					this.settingsSearchGroups = null;
					this.settingsSearchUnavailable = true;
				}
			} else {
				this.settingsSearchGroups = null;
				this.settingsSearchUnavailable = true;
			}
		} else {
			this.settingsSearchGroups = null;
			this.settingsSearchUnavailable = false;
		}
		this.rebuildNodes();
	}

	setSortState(state: ExplorerSortState): void {
		const normalized = normalizeExplorerSortState('plugins', state);
		if (sameExplorerSortState(this.sortState, normalized)) return;
		this.sortState = normalized;
		this.rebuildNodes();
	}

	setGroupPreset(preset: GroupPreset): void {
		if (sameGroupPreset(this.groupPreset, preset)) return;
		this.groupPreset = cloneGroupPreset(preset);
		this.rebuildNodes();
	}

	setHiddenGroupIds(ids: readonly string[]): void {
		const next = new Set(ids);
		if (
			next.size === this.hiddenGroupIds.size &&
			[...next].every((id) => this.hiddenGroupIds.has(id))
		) {
			return;
		}
		this.hiddenGroupIds = next;
		this.rebuildNodes();
	}

	setGroupMemberships(
		memberships: Readonly<Record<string, readonly string[]>>,
	): void {
		if (sameGroupMemberships(this.groupMemberships, memberships)) return;
		this.groupMemberships = cloneGroupMemberships(memberships);
		this.rebuildNodes();
	}

	setCreateGroupHandler(
		handler?: CreateGroupHandler,
	): void {
		this.createGroupHandler = handler;
	}

	setDegroupSelectedHandler(handler?: DegroupSelectedHandler): void {
		this.degroupSelectedHandler = handler;
	}

	setMaterializePresetHandler(handler?: MaterializePresetHandler): void {
		this.materializePresetHandler = handler;
	}

	setGroupHideHandler(handler?: (groupId: string, hidden: boolean) => void): void {
		this.groupHideHandler = handler;
	}

	setGroupDeleteHandler(handler?: (groupId: string) => void): void {
		this.groupDeleteHandler = handler;
	}

	setGroupRenameHandler(handler?: (groupId: string, nextName?: string) => Promise<void> | void): void {
		this.groupRenameHandler = handler;
	}

	setGroupCopyHandler(handler?: (groupId: string) => void): void {
		this.groupCopyHandler = handler;
	}

	setGroupScopeHandler(handler?: (groupId: string) => void): void {
		this.groupScopeHandler = handler;
	}

	setSelectionScope(scope: { instanceId: string | null; revision: number | null; scene: string }): void {
		this.selectionInstanceId = scope.instanceId;
		this.selectionRevision = scope.revision;
	}

	private _membershipUrnOf(node: TreeNode<PluginMeta>): string {
		if (this.dataSource) return this.dataSource.urnOf(node);
		// U130 Slice A: la fila `node_settings` no es un plugin; su kind es
		// `settings` con la tripleta nativa como identidad. providerId `plugins`
		// intacto (no se renombra) y kind `plugin` conservado en resolubles.
		const ref = settingsBridgeRefOf(node.meta);
		if (ref) {
			return formatMembershipUrn({
				providerId: 'plugins',
				kind: 'settings',
				canonicalId: settingsBridgeIdentity(ref),
				displayLabel: node.label,
			});
		}
		return formatMembershipUrn({
			providerId: 'plugins',
			kind: 'plugin',
			canonicalId: node.meta.pluginId,
			displayLabel: node.label,
		});
	}

	/**
	 * U130-GGC-022/024: logical visible occurrence order (virtualization-proof:
	 * the projected tree, not the mounted DOM).
	 */
	private _orderedVisibleTreeIds(): string[] {
		if (this._lastProjectedTree.length === 0) return [];
		return flattenVisibleTree(
			this._lastProjectedTree,
			this._expandedGroupIds,
		).map((node) => node.id);
	}

	/**
	 * U130-GGC-022/024: shared right-click policy (plain replaces, Ctrl/Meta
	 * toggles, Shift ranges from the per-instance anchor, Ctrl+Shift unions).
	 */
	private _includeInvokedInSelection(
		id: string,
		event?: MouseEvent | null,
		orderedVisibleIds?: readonly string[],
	): void {
		const ordered = orderedVisibleIds ?? this._orderedVisibleTreeIds();
		const prev = this.selectedNodeIds;
		const prevAnchor = this.selectionAnchorId;
		const { selectedIds, anchorId } = resolveContextClickSelection({
			selectedIds: prev,
			anchorId: prevAnchor,
			orderedVisibleIds: ordered,
			invokedId: id,
			modifiers: event
				? {
						ctrlKey: event.ctrlKey,
						metaKey: event.metaKey,
						shiftKey: event.shiftKey,
					}
				: null,
		});
		if (
			selectedIds.size === prev.size &&
			anchorId === prevAnchor &&
			[...selectedIds].every((entry) => prev.has(entry))
		)
			return;
		this.selectedNodeIds = selectedIds;
		this.selectionAnchorId = anchorId;
		this._touchSelection();
		this.render();
	}

	/** Clears only this scene instance's row selection. */
	clearSelection(): void {
		if (this.selectedNodeIds.size === 0 && this.selectionAnchorId === null)
			return;
		this.selectedNodeIds = new Set();
		this.selectionAnchorId = null;
		this._touchSelection();
		this.render();
	}

	private readonly _handleSelectionEscape = (event: KeyboardEvent): void => {
		if (!shouldClearExplorerSelectionOnEscape(event)) return;
		this.clearSelection();
	};

	/** U130-C1: ids community para el bucket `sections` (core/community por id, F10). */
	private _communityIds: ReadonlySet<string> = new Set<string>();

	/** Group selected by capacity/selection, never by input=select or checkbox visibility. */
	private _groupCreationMenuCtx(): Pick<MenuCtx, 'createGroupWithSelected'> {
		const handler = this.createGroupHandler;
		if (!handler || this.selectedNodeIds.size === 0) {
			return {};
		}
		return {
			createGroupWithSelected: async () => {
				const snapshot = snapshotFromProjectedTree({
					tree: this._lastProjectedTree.length > 0 ? this._lastProjectedTree : this.nodes,
					selectedIds: this.selectedNodeIds,
					urnOf: (node) => this._membershipUrnOf(node),
					providerId: 'plugins', scene: 'plugins',
					instanceId: this.selectionInstanceId, revision: this.selectionRevision,
					selectionKey: this._selectionKey(), customGroupIds: this._groupIds,
				});
				const result = await handler(snapshot);
				if (result.status === 'committed') {
					this.selectedNodeIds = reconcileCommittedGroupCreation(snapshot, result, this.selectedNodeIds, {
						instanceId: this.selectionInstanceId, revision: this.selectionRevision,
					});
					if (this.selectedNodeIds.size === 0) this.selectionAnchorId = null;
					this._touchSelection();
					this.render();
				}
				return result;
			},
		};
	}

	private _isCustomGroupId(id: string): boolean {
		if (this.dataSource?.groups.some((group) => group.id === id)) return false;
		return (
			this._groupIds.has(id) ||
			Object.prototype.hasOwnProperty.call(this.groupMemberships, id)
		);
	}

	private _findSelectedDegroupOwner(
		tree: readonly TreeNode<PluginMeta>[],
	): string | undefined {
		const selected = this.selectedNodeIds;
		const noteGroup = this.groupPreset.kind === 'note';
		const walk = (nodes: readonly TreeNode<PluginMeta>[]): string | undefined => {
			for (const node of nodes) {
				if (node.isGroupHeader === true) {
					if (node.children?.length) {
						const found = walk(node.children);
						if (found) return found;
					}
					continue;
				}
				const entity = entityIdOf(node);
				if (selected.has(node.id) || selected.has(entity)) {
					const owner = occurrenceOwnerOf(node);
					if (owner && (noteGroup || this._isCustomGroupId(owner))) return owner;
				}
				if (node.children?.length) {
					const found = walk(node.children);
					if (found) return found;
				}
			}
			return undefined;
		};
		return walk(tree);
	}

	private _makeACopyOfGroup(groupId: string): void {
		if (!this._isCustomGroupId(groupId)) return;
		const members = this.groupMemberships[groupId] ?? [];
		const parsed = parseScopedGroupKey(groupId);
		let nextId: string;
		if (parsed.legacy) {
			let n = 1;
			do {
				nextId = `${groupId} (${n})`;
				n += 1;
			} while (
				Object.prototype.hasOwnProperty.call(this.groupMemberships, nextId) &&
				n < 1000
			);
		} else {
			let n = 1;
			do {
				try {
					nextId = makeScopedGroupKey(parsed.target, `${parsed.name} (${n})`);
				} catch {
					return;
				}
				n += 1;
			} while (
				Object.prototype.hasOwnProperty.call(this.groupMemberships, nextId) &&
				n < 1000
			);
		}
		this.setGroupMemberships({
			...this.groupMemberships,
			[nextId!]: [...members],
		});
	}

	private async _renameCustomGroup(groupId: string): Promise<void> {
		if (!this._isCustomGroupId(groupId)) return;
		const parsed = parseScopedGroupKey(groupId);
		const nextName = (
			await showInputModal(this.plugin.app, translate('group.row.rename'), {
				initialValue: parsed.name,
			})
		)?.trim();
		if (!nextName || nextName === parsed.name) return;
		const nextId = parsed.legacy
			? nextName
			: (() => {
					try {
						return makeScopedGroupKey(parsed.target, nextName);
					} catch {
						return null;
					}
				})();
		if (!nextId) {
			new Notice(translate('group.batch.rejected'));
			return;
		}
		if (Object.prototype.hasOwnProperty.call(this.groupMemberships, nextId)) {
			new Notice(`${translate('group.batch.rejected')} (group_name_collision)`);
			return;
		}
		const { [groupId]: members, ...rest } = this.groupMemberships;
		this.setGroupMemberships({ ...rest, [nextId]: [...(members ?? [])] });
		if (this.hiddenGroupIds.has(groupId)) {
			const nextHidden = new Set(this.hiddenGroupIds);
			nextHidden.delete(groupId);
			nextHidden.add(nextId);
			this.hiddenGroupIds = nextHidden;
			this.rebuildNodes();
		}
	}

	private _updateCustomGroupScope(groupId: string): void {
		if (!this._isCustomGroupId(groupId)) return;
		const parsed = parseScopedGroupKey(groupId);
		if (parsed.legacy || parsed.target === 'all') return;
		let nextId: string;
		try {
			nextId = makeScopedGroupKey('all', parsed.name);
		} catch {
			return;
		}
		if (Object.prototype.hasOwnProperty.call(this.groupMemberships, nextId)) {
			let n = 1;
			let candidate: string;
			do {
				try {
					candidate = makeScopedGroupKey('all', `${parsed.name} (${n})`);
				} catch {
					return;
				}
				n += 1;
			} while (
				Object.prototype.hasOwnProperty.call(this.groupMemberships, candidate) &&
				n < 1000
			);
			nextId = candidate!;
		}
		const { [groupId]: members, ...rest } = this.groupMemberships;
		this.setGroupMemberships({ ...rest, [nextId]: [...(members ?? [])] });
	}

	private _degroupMenuCtx(node: TreeNode<PluginMeta>): Pick<MenuCtx, 'degroupSelected' | 'membershipOwner' | 'occurrenceEntityId' | 'groupOwner'> {
		if (!this.degroupSelectedHandler || this.selectedNodeIds.size === 0) return {};
		const noteGroup = this.groupPreset.kind === 'note';
		const invokedOwner = occurrenceOwnerOf(node);
		let owner: string | undefined;
		if (invokedOwner && (noteGroup || this._isCustomGroupId(invokedOwner))) {
			owner = invokedOwner;
		} else {
			owner = this._findSelectedDegroupOwner(this._lastProjectedTree);
		}
		if (!owner) return {};
		const resolvedOwner = owner;
		return {
			membershipOwner: resolvedOwner,
			groupOwner: noteGroup ? 'note' : 'custom',
			occurrenceEntityId: entityIdOf(node),
			degroupSelected: async () => {
				const snapshot = snapshotFromProjectedTree({
					tree: this._lastProjectedTree,
					selectedIds: this.selectedNodeIds,
					urnOf: (entry) => this._membershipUrnOf(entry),
					providerId: 'plugins', scene: 'plugins',
					instanceId: this.selectionInstanceId, revision: this.selectionRevision,
					selectionKey: this._selectionKey(), customGroupIds: this._groupIds,
				});
				return this.degroupSelectedHandler?.(snapshot, resolvedOwner) ?? { status: 'cancelled' };
			},
		};
	}

	/** Spec 08 §3.2: add-ons expose their install/update times as the date presets. */
	private _groupPresetValue(
		node: TreeNode<PluginMeta>,
		kind: GroupPreset['kind'],
	): string | number | null {
		if (kind === 'modified') return node.meta.updatedTime ?? null;
		if (kind === 'created') return node.meta.installedTime ?? null;
		if (kind === 'state') return node.meta.enabled ? 'enabled' : 'disabled';
		if (kind === 'sections') {
			if (this.dataSource?.providerId === 'sasi') {
				const group = (node.meta as { group?: unknown })?.group;
				if (typeof group === 'string' && group) {
					return group;
				}
			}
			// U130-C1: en reposo (term vacío) las filas top-level son
			// `node_plugin` + `node_settings` globales planas. El bucket
			// lo gobierna `projectGroupedTree`: plugins → Core/Community
			// (por id, F10) y settings globales → Global settings.
			const ref = settingsBridgeRefOf(node.meta);
			if (ref) {
				return ref.tab === 'core-plugins' || ref.tab === 'plugins'
						? 'core-plugins'
						: ref.tab === 'community-plugins'
							? 'community-plugins'
							: 'global-settings';
			}
			const pluginId = node.meta?.pluginId ?? '';
			if (pluginId !== '') {
				return pluginCanonicalGroup(pluginId, this._communityIds) === 'core'
					? 'core-plugins'
					: 'community-plugins';
			}
			return null;
		}
		return null;
	}

	setVisibleCells(cells: Set<string>): void {
		const next = new Set(cells);
		if (
			next.size === this.visibleCells.size &&
			[...next].every((cell) => this.visibleCells.has(cell))
		) {
			return;
		}
		this.visibleCells = next;
		this.rebuildNodes();
	}

	setViewMode(_mode: ExplorerViewMode): void {
		// The scene-precedent port is operationally flat/tree-only in beta.3.
	}

	setInteractionMode(mode: InteractionMode): void {
		const normalized = normalizeInteractionMode('plugins', mode);
		if (this.interactionMode === normalized) return;
		this.interactionMode = normalized;
		this.render();
	}

	/**
	 * U130 parity C (F6): modo scene-local explorer/content. El cableado al
	 * toolbar (`navbarFilters`/`navbarPanelWidgetHost`) lo hace el merge
	 * coordinador; aquí viven el estado y el payload con checked.
	 */
	getSettingSceneMode(): SettingSceneMode {
		return this.settingSceneMode;
	}

	setSettingSceneMode(mode: SettingSceneMode): void {
		const next = normalizeSettingSceneMode(mode);
		if (this.settingSceneMode === next) return;
		this.settingSceneMode = next;
		this.onSettingSceneModeChange?.();
		this.render();
	}

	toggleSettingSceneMode(): SettingSceneMode {
		this.setSettingSceneMode(
			this.settingSceneMode === 'content' ? 'explorer' : 'content',
		);
		return this.settingSceneMode;
	}

	setSettingSceneModeChangeHandler(handler?: () => void): void {
		this.onSettingSceneModeChange = handler;
	}

	getSettingSceneModeToggle(): SettingSceneModeToggle {
		return settingSceneModeToggle(this.settingSceneMode);
	}

	getSettingSceneContentId(): string | null {
		return this.settingSceneContentId;
	}

	/**
	 * U130 parity C (F6): modelo de contenido para la selección (semántica
	 * design-02 vía `resolveSettingSceneContent`). Sin executor (design-01,
	 * fuera de alcance) no hay handle de definición nativa: `definition`
	 * llega `null` y el modelo cae a unavailable explícito
	 * (`definition-missing`); el camino `ready` queda resuelto a nivel de
	 * puente y testeado, pendiente del lookup de definición del merge.
	 */
	getSettingSceneContent(): SettingSceneContentModel {
		const id = this.settingSceneContentId;
		if (id === null) {
			return resolveSettingSceneContent({
				rowKind: 'none',
				ref: null,
				label: null,
				tabAvailable: false,
				definition: null,
			});
		}
		if (isGroupHeader(id, this._groupIds)) {
			return resolveSettingSceneContent({
				rowKind: 'group',
				ref: null,
				label: null,
				tabAvailable: false,
				definition: null,
			});
		}
		const node = this.findNode(id);
		if (!node) {
			return resolveSettingSceneContent({
				rowKind: 'none',
				ref: null,
				label: null,
				tabAvailable: false,
				definition: null,
			});
		}
		const ref = settingsBridgeRefOf(node.meta);
		if (node.meta.pluginId !== '' || !ref) {
			return resolveSettingSceneContent({
				rowKind: node.meta.pluginId !== '' ? 'plugin' : 'none',
				ref: ref ?? null,
				label: node.label,
				tabAvailable: false,
				definition: null,
			});
		}
		return resolveSettingSceneContent({
			rowKind: 'settings',
			ref,
			label: node.label,
			tabAvailable: this._isSettingSceneTabAvailable(ref.tab),
			definition: null,
		});
	}

	/**
	 * Revalidación del tab a nivel de tab (design-01 §1.3 `tabRef()`): un
	 * tab registrado en `pluginTabs` está vivo; un tab con id de plugin
	 * conocido pero sin registro es un tab removido; los tabs nativos no
	 * plugin no son enumerables en este checkout y se asumen presentes (la
	 * definición sigue gateando el render).
	 */
	private _isSettingSceneTabAvailable(tab: string): boolean {
		if (tab === '') return false;
		if (pluginSettingTabIds(this.plugin.app).has(tab)) return true;
		if (this.entries.some((entry) => entry.pluginId === tab)) return false;
		return true;
	}

	setCellStyle(style: AddonCellStyle): void {
		const next = normalizeAddonCellStyle(style);
		if (this.cellStyle === next) return;
		this.cellStyle = next;
		this.rebuildNodes();
	}

	setTooltipsEnabled(enabled: boolean): void {
		if (this.tooltipsOverride === enabled) return;
		this.tooltipsOverride = enabled;
		this.render();
	}

	setIndentEnabled(enabled: boolean): void {
		if (this.indentOverride === enabled) return;
		this.indentOverride = enabled;
		this.render();
	}

	setStickyRowsEnabled(enabled: boolean): void {
		if (this.stickyRowsOverride === enabled) return;
		this.stickyRowsOverride = enabled;
		this.render();
	}

	setCompactFoldersEnabled(enabled: boolean): void {
		if (this.compactFoldersOverride === enabled) return;
		this.compactFoldersOverride = enabled;
		this.render();
	}

	/**
	 * A07: la unica expansibilidad de un explorer plano son sus cabeceras de
	 * grupo. Sin preset no hay nada que plegar.
	 */
	private _expansionEnabled(): boolean {
		return this.groupPreset.kind !== 'none' || this.nodes.some((node) => (node.children?.length ?? 0) > 0);
	}

	/** U130 parity B (F1): la proyección anidada sigue a la cell `nested`
	 * (igual que `explorerFiles._nestedEnabled`). Sin nesting, filas planas. */
	private _nestedEnabled(): boolean {
		return this.visibleCells.has('nested');
	}

	hasExpandedNodes(): boolean {
		return this._expansionEnabled() && this._expandedGroupIds.size > 0;
	}

	setExpansionChangeHandler(handler?: () => void): void {
		this.onExpansionChange = handler;
	}

	expandAll(): void {
		if (!this._expansionEnabled()) return;
		const expand = (rows: readonly TreeNode<PluginMeta>[]): void => {
			for (const row of rows) {
				if (!row.children?.length) continue;
				this._expandedGroupIds.add(row.id);
				expand(row.children);
			}
		};
		expand(this.projectedNodes());
		this.onExpansionChange?.();
		this.render();
	}

	collapseAll(): void {
		this._expandedGroupIds.clear();
		this.onExpansionChange?.();
		this.render();
	}

	private rebuildNodes(): void {
		if (this.dataSource) {
			this.nodes = projectAddonDataNodes(this.dataSource.nodes(), this.searchTerm, activeScopeSort('plugins', this.sortState));
			this.render();
			return;
		}
		const scopeSort = activeScopeSort('plugins', this.sortState);
		const searchActive = isSettingsSearchActive(this.searchTerm);
		const filtered = searchActive
			? this.entries
			: filterAddonEntries(
					this.entries,
					this.searchTerm,
					(entry) =>
						[entry.name, entry.version, entry.author, entry.description]
							.filter(Boolean)
							.join(' '),
			  );
		const entries = sortAddonEntries(filtered, scopeSort);
		const communityIds = new Set(this.entries.map((entry) => entry.pluginId));
		const coreMetas: PluginMeta[] = sortAddonEntries(
			listCorePluginStubs(this.plugin.app, communityIds).map((stub) => ({
				name: stub.name,
				enabled: stub.enabled,
				pluginId: stub.pluginId,
				updateVersion: this.plugin.pluginUpdatesService?.getPluginUpdate(stub.pluginId)?.version,
			})),
			scopeSort,
		).map((stub) => ({
			pluginId: stub.pluginId,
			name: stub.name,
			enabled: stub.enabled,
			loaded: false,
			isVaultman: false,
		}));
		const communityNodes = this.buildPluginNodes(entries);
		const coreNodes = this.buildPluginNodes(coreMetas);
		const nestedOn = this._nestedEnabled();
		this._communityIds = communityIds;

		let rawRoots: TreeNode<PluginMeta>[];
		if (!nestedOn) {
			const flat = [
				...buildGlobalSettingsNodes(this.plugin.app, communityIds, this.groupPreset),
				...communityNodes,
				...coreNodes,
			];
			for (const node of flat) {
				node.children = [];
				node.showCaret = false;
			}
			rawRoots = flat;
		} else {
			rawRoots = buildCanonicalRestRoots({
				app: this.plugin.app,
				pluginNodes: [...communityNodes, ...coreNodes],
				communityIds,
				groupPreset: this.groupPreset,
			});
		}

		if (!searchActive) {
			this.nodes = rawRoots;
			this.settingsSearchHighlightIds = new Set<string>();
			this.render();
			return;
		}

		if (this.settingsSearchUnavailable && !this.searchTerm.trim()) {
			this.nodes = [];
			this.settingsSearchHighlightIds = new Set<string>();
			this.render();
			return;
		}

		const term = this.searchTerm.trim().toLowerCase();
		const matchedTabs = new Set<string>();
		const matchedPlugins = new Set<string>();
		const matchedPages = new Set<string>();
		const matchedDefs = new Set<string>();
		if (this.settingsSearchGroups) {
			for (const group of this.settingsSearchGroups) {
				const groupTab = (group.tab ?? '').trim().toLowerCase();
				if (groupTab) {
					if ((group.tabNameMatch?.length ?? 0) > 0) {
						matchedTabs.add(groupTab);
						matchedPlugins.add(groupTab);
					}
				}
				for (const item of group.results ?? []) {
					const tab = (item.entry?.tab ?? group.tab ?? '').trim().toLowerCase();
					if (tab) matchedTabs.add(tab);
					if (tab === 'community-plugins' || tab === 'plugins' || tab === 'core-plugins') {
						const def = (item.entry?.definition ?? '').trim().toLowerCase();
						if (def) matchedPlugins.add(def);
					}
					const page = (item.entry?.page ?? group.page ?? '').trim().toLowerCase();
					const pagePath = (item.entry?.pagePath ?? group.pagePath ?? '').trim().toLowerCase();
					if (page) matchedPages.add(`${tab}::${page}`);
					if (pagePath) matchedPages.add(`${tab}::${pagePath}`);
					const def = (item.entry?.definition ?? '').trim().toLowerCase();
					if (def) matchedDefs.add(`${tab}::${def}`);
				}
			}
		}

		const isNodeMatch = (node: TreeNode<PluginMeta>): boolean => {
			const label = (node.label ?? '').trim().toLowerCase();
			const name = (node.meta?.name ?? '').trim().toLowerCase();
			const pluginId = (node.meta?.pluginId ?? '').trim().toLowerCase();
			if (label.includes(term) || name.includes(term) || (pluginId && pluginId.includes(term))) {
				return true;
			}
			const ref = settingsBridgeRefOf(node.meta);
			if (ref) {
				const tab = (ref.tab ?? '').trim().toLowerCase();
				const def = (ref.definition ?? '').trim().toLowerCase();
				const page = (ref.page ?? '').trim().toLowerCase();
				const pagePath = (ref.pagePath ?? '').trim().toLowerCase();
				if (def !== '') {
					if (matchedDefs.has(`${tab}::${def}`) || def.includes(term)) return true;
				} else if (page !== '' || pagePath !== '') {
					if (
						matchedPages.has(`${tab}::${page}`) ||
						matchedPages.has(`${tab}::${pagePath}`) ||
						page.includes(term) ||
						pagePath.includes(term)
					) {
						return true;
					}
				} else if (tab !== '') {
					if (matchedTabs.has(tab) || tab.includes(term)) return true;
				}
			} else if (pluginId) {
				if (
					matchedTabs.has(pluginId) ||
					matchedPlugins.has(pluginId) ||
					matchedPlugins.has(name)
				) {
					return true;
				}
			}
			return false;
		};

		const highlightIds = new Set<string>();
		const filterTree = (node: TreeNode<PluginMeta>): TreeNode<PluginMeta> | null => {
			const direct = isNodeMatch(node);
			if (direct) highlightIds.add(node.id);
			const children: TreeNode<PluginMeta>[] = [];
			if (node.children && node.children.length > 0) {
				for (const child of node.children) {
					const f = filterTree(child);
					if (f) children.push(f);
				}
			}
			if (direct || children.length > 0) {
				return {
					...node,
					children,
					showCaret: children.length > 0,
				};
			}
			return null;
		};

		this.nodes = rawRoots.map(filterTree).filter((n): n is TreeNode<PluginMeta> => n !== null);
		this.settingsSearchHighlightIds = this.searchHighlightEnabled ? highlightIds : new Set<string>();
		this.render();
	}

	private buildPluginNodes(entries: readonly PluginMeta[]): TreeNode<PluginMeta>[] {
		const settingsTabIds = pluginSettingTabIds(this.plugin.app);
		// Read the override map once per rebuild, not once per row.
		const overrides = readAddonIconOverrides(this.plugin.settings);
		return entries.map((entry) => {
			const meta: PluginMeta = {
				...entry,
			};
			// The state toggle always sits rightmost (D27); config goes before it.
			const cells: TreeNodeCell[] = [];
			if (settingsTabIds.has(entry.pluginId)) {
				cells.push({
					id: 'config',
					kind: 'action',
					icon: 'lucide-settings',
					label: translate('addons.open_settings'),
				});
			}
			const update = this.plugin.pluginUpdatesService?.getPluginUpdate(entry.pluginId);
			if (update) {
				cells.push({
					id: 'cell_update',
					kind: 'action',
					appearance: 'badge',
					icon: 'lucide-download',
					label: translate('addons.update'),
					disabled: this.pendingUpdateIds.has(entry.pluginId) || this.plugin.pluginUpdatesService.isUpdating(entry.pluginId),
					busy: this.pendingUpdateIds.has(entry.pluginId) || this.plugin.pluginUpdatesService.isUpdating(entry.pluginId),
				});
			}
			cells.push({
				id: 'state',
				kind: 'toggle',
				enabled: entry.enabled,
				style: this.cellStyle,
				label: translate(
					entry.enabled ? 'addons.enabled' : 'addons.disabled',
				),
				disabled: this.pendingToggleIds.has(entry.pluginId),
				busy: this.pendingToggleIds.has(entry.pluginId),
			});
			// BT5-019 precedence: Vaultman override > Iconic ribbon > plugin
			// emitted ribbon icon > generic plug (supersedes D35).
			const ribbon = pluginRibbonItem(this.plugin.app, entry.pluginId);
			const resolved = resolveAddonIcon({
				override: getAddonIconOverride(overrides, 'plugin', entry.pluginId),
				iconic: ribbon
					? this.plugin.iconicService?.getRibbonIcon(ribbon.id)
					: null,
				emitted: ribbon,
				fallback: 'lucide-plug',
			});
			return {
				id: `plugin:${entry.pluginId}`,
				label: entry.name,
				icon: resolved.icon,
				iconColor: resolved.color,
				typeText: entry.version,
				ctimeText: formatAddonTimestamp(entry.installedTime),
				mtimeText: formatAddonTimestamp(entry.updatedTime),
				badges: this.deletionBadges(entry.pluginId),
				cls: this.deletionCls(entry.pluginId),
				depth: 0,
				cells,
				meta,
				coreCls: 'tree-item-self nav-file-title tappable is-clickable',
			};
		});
	}

	
	private _decorateNodeNotes(nodes: TreeNode<PluginMeta>[]): void {
		const app = this.plugin.app;
		if (!app?.vault) return;

		const aliasSet = new Set<string>();
		const markdownFiles = app.vault.getMarkdownFiles?.() ?? [];
		for (const file of markdownFiles) {
			const fm = app.metadataCache?.getFileCache(file)?.frontmatter;
			if (fm?.aliases) {
				if (Array.isArray(fm.aliases)) {
					for (const a of fm.aliases) {
						if (typeof a === 'string') aliasSet.add(a.trim());
					}
				} else if (typeof fm.aliases === 'string') {
					aliasSet.add(fm.aliases.trim());
				}
			}
		}

		for (const node of nodes) {
			// U130 Slice A: las filas `node_settings` no son plugins y no
			// enlazan notas de nodo (su `pluginId` es '').
			if (!node.meta?.pluginId) continue;
			const pluginId = node.meta.pluginId;
			const pluginName = node.meta?.name ?? node.label;
			const pluginTokens = pluginAliasTokens(pluginId, pluginName, prefixesFromSettings(this.plugin.settings));
			if (pluginTokens.some((t) => aliasSet.has(t))) {
				node.meta.hasNodeNote = true;
			}
		}
	}

	private projectedNodes(): TreeNode<PluginMeta>[] {
		// U130-09: el mapa es el de ESTA scene de ESTA instancia; lo aplica el
		// navbar desde la cascada, igual que `hiddenGroupIds`. Ya no se busca
		// un layout por nombre: el layout solo copia su foto en la scene.
		const memberships = { ...this.dataSource?.memberships(), ...this.groupMemberships };
		const groups = [...(this.groupPreset.kind === 'custom' ? this.dataSource?.groups ?? [] : []), ...resolveCustomGroups(this.groupMemberships)].filter(
			(group) => !this.hiddenGroupIds.has(group.id),
		);
		this._groupIds.clear();
		for (const group of groups) this._groupIds.add(group.id);

		// U130 parity A2 (F3): las filas del puente nunca entran a
		// grupos custom (ni padres nativos ni sus hijos settings/plugin;
		// tampoco los tabs/pages de term vacío, que viajan con su plugin
		// por holarchy). Con búsqueda activa los padres nativos quedan
		const nodesForGrouping = this.nodes;

		const projected = projectGroupedTree<PluginMeta>({
			nodes: nodesForGrouping,
			groups,
			memberships,
			providerId: this.dataSource?.providerId ?? 'plugins',
			noGroupLabel: translate('explorer.group.no_group'),
			filtered: this.sortState?.filtered === true,
			hiddenGroupIds: this.hiddenGroupIds,
			urnOf: (node) => this._membershipUrnOf(node),
			// S07A: la cabecera muestra el agregado burbujeado (identidades,
			// no ocurrencias) en vez de `children.length`.
			groupTotals: bubbleMemberCountsToGroups({
				groups,
				memberships,
				providerId: this.dataSource?.providerId ?? 'plugins',
			}),
			// Spec 08 §3.1.bis: the preset selection is the switch, never the
			// sort scope.
			enabled: this.groupPreset.kind !== 'none',
			preset: this.groupPreset,
			presetValueOf: (node, kind) => this._groupPresetValue(node, kind),
			decorateHeader: (header) => {
				if (this.groupPreset.kind !== 'sections') return;
				const presetKey = header.id.startsWith(PRESET_GROUP_PREFIX)
					? header.id.slice(PRESET_GROUP_PREFIX.length)
					: header.id.replace(/^group:/, '');

				if (
					header.id === 'group:core-plugins' ||
					header.id === 'vaultman.group.preset:core-plugins'
				) {
					header.label = 'Core plugins';
					header.icon = 'lucide-toy-brick';
				} else if (
					header.id === 'group:community-plugins' ||
					header.id === 'vaultman.group.preset:community-plugins'
				) {
					header.label = 'Community plugins';
					header.icon = 'lucide-puzzle';
				} else if (
					header.id === GLOBAL_SETTINGS_GROUP_ID ||
					header.id === 'vaultman.group.preset:global-settings'
				) {
					header.label = GLOBAL_SETTINGS_GROUP_LABEL;
					header.icon = 'lucide-sliders-horizontal';
				} else if (
					this.dataSource?.providerId === 'sasi' ||
					presetKey in API_SCENE_GROUP_LABEL_KEYS
				) {
					const sasiKey = presetKey as ApiSceneGroupName;
					const labelKey = API_SCENE_GROUP_LABEL_KEYS[sasiKey];
					if (labelKey) {
						header.label = translate(labelKey);
						header.meta = {
							identityKind: API_SCENE_GROUP_KIND,
							group: sasiKey,
						} as any;
					}
				}
			},
			rangeLabels: translatedRangeLabels(),
			// Dev 2026-09-14: la cabecera colapsada burbujea los badges como un p-node.
			expandedIds: this._expandedGroupIds,
			// U130-t33 (L-PNODE): meta y core classes propias de la cabecera,
			// mismo camino que files/tags/props — sin esto se colaba el
			// prestamo historico de `nodes[0]?.meta` y la fila no entraba por
			// `applyCoreRowClasses`.
			headerMeta: {
				pluginId: '',
				name: '',
				enabled: false,
				loaded: false,
				isVaultman: false,
			},
			headerCoreCls: 'tree-item-self nav-file-title tappable is-clickable',
		}) as TreeNode<PluginMeta>[];
		expandNewGroupHeaders(projected, this._seenGroupHeaderIds, this._expandedGroupIds, this._groupIds);
		return this.withGroupToggleCells(projected);
	}

	/**
	 * Spec 07 §2: la cabecera del grupo aloja su propio `cell_toggle` con el
	 * agregado de sus miembros. Sin cabeceras se devuelve la lista TAL CUAL,
	 * por identidad.
	 */
	private withGroupToggleCells(
		rows: readonly TreeNode<PluginMeta>[],
	): TreeNode<PluginMeta>[] {
		if (this.dataSource) return [...rows];
		if (!rows.some((row) => isGroupHeader(row.id, this._groupIds))) {
			return rows as TreeNode<PluginMeta>[];
		}
		return rows.map((row) => {
			if (!isGroupHeader(row.id, this._groupIds)) return row;
			if (!row.children?.length) return row;
			// U130 Slice A: las filas `node_settings` no tienen toggle (sin
			// celdas) y el toggle de grupo solo despacha a plugins con
			// `pluginId`; el agregado se calcula sobre esos mismos miembros.
			// Sin filas de settings el filtro es no-op (camino legacy idéntico).
			const actionable = row.children.filter(
				(child) => child.meta?.pluginId,
			);
			if (actionable.length === 0) return row;
			const states = actionable.map(
				(child) => child.meta?.enabled ?? false,
			);
			const { enabled, mixed } = summarizeGroupToggleState(states);
			const pending = actionable.some((child) =>
				this.pendingToggleIds.has(child.meta?.pluginId ?? ''),
			);
			const cells: TreeNodeCell[] = [
				{
					id: 'state',
					kind: 'toggle',
					enabled,
					mixed,
					style: this.cellStyle,
					label: translate(
						mixed
							? 'addons.mixed'
							: enabled
								? 'addons.enabled'
								: 'addons.disabled',
					),
					disabled: pending,
					busy: pending,
				},
			];
			return { ...row, cells };
		});
	}

	private render(): void {
		if (!this.treeView) return;
		if (!this.dataSource && this.visibleCells.has('format')) {
			this._decorateNodeNotes(this.nodes);
		}
		this.emptyEl?.remove();
		this.emptyEl = null;
		// A07b-2: se guarda el proyectado para `_groupCreationMenuCtx`.
		this._lastProjectedTree = this.projectedNodes();
		this.treeView.render({
			surface: 'plugins',
			nodes: this._lastProjectedTree,
			visibleCells: this.visibleCells,
			// U130 Slice A: todo lo emitido por el puente es match nativo.
			searchHighlightIds: this.settingsSearchHighlightIds,
			// U130-t33 (L-PNODE): plugins no tiene anidacion propia, pero un
			// grupo activo si crea un nivel (cabecera -> miembros) que
			// necesita la guia igual que el resto de p-nodes con hijos.
			indentGuides: this.groupPreset.kind !== 'none',
			indent: this.indentOverride ?? true,
			treeIndentMode: this.plugin.settings?.treeIndentMode ?? 'all',
			tooltipsEnabled: this.tooltipsOverride ?? true,
			stickyParentRows: this.stickyRowsOverride ?? this.plugin.settings?.stickyParentRows !== false,
			stickyMaxFraction: this.plugin.settings?.stickyParentRowsMaxFraction,
			tooltipPlacement: tooltipPlacementForSetting(
				this.plugin.settings?.tooltipPlacement,
				this.containerEl,
			),
			renderLabel: (row, node) => {
				if (this.dataSource) return false;
				if (node.isGroupHeader === true) {
					if (this.visibleCells.has('format') && this.plugin.nodeBindingService) {
						const aliasSet = this.plugin.nodeBindingService.getVaultAliasSet();
						const groupMeta = node.meta as { file?: import('obsidian').TFile; noteGroup?: boolean } | undefined;
						const hasBoundNote =
							aliasSet.has(node.label) ||
							Boolean(groupMeta?.file) ||
							Boolean(groupMeta?.noteGroup && this.plugin.app.vault.getAbstractFileByPath(node.id));
						if (hasBoundNote) {
							const label = row.createSpan({
								cls: 'vaultman-tree-label vaultman-node-note-link',
								text: node.label,
							});
							if (node.labelColor) label.style.color = node.labelColor;
							label.onclick = (e) => {
								e.stopPropagation();
								e.preventDefault();
								if (groupMeta?.file) {
									const leaf = this.plugin.app.workspace.getLeaf(e.ctrlKey || e.metaKey || e.button === 1);
									void leaf.openFile(groupMeta.file, { active: true });
								} else {
									void this.plugin.nodeBindingService?.bindOrCreate(
										{
											kind: 'group',
											label: node.label,
											path: node.id,
										},
										{ newLeaf: e.ctrlKey || e.metaKey || e.button === 1 },
									);
								}
							};
							return true;
						}
					}
					return false;
				}
				if (this.visibleCells.has('format') && (node.meta as PluginMeta)?.hasNodeNote === true) {
					const label = row.createSpan({
						cls: 'vaultman-tree-label vaultman-node-note-link',
						text: node.label,
					});
					if (node.labelColor) label.style.color = node.labelColor;
					label.onclick = (e) => {
						e.stopPropagation();
						e.preventDefault();
						const meta = node.meta as PluginMeta;
						void this.plugin.nodeBindingService?.bindOrCreate(
							{ kind: 'plugin', label: meta.name ?? node.label, pluginId: meta.pluginId },
							{ newLeaf: e.ctrlKey || e.metaKey || e.button === 1 },
						);
					};
					return true;
				}
				return false;
			},
			caretPosition: this.plugin.settings.caretPosition ?? 'start',
			expansionAnimation: this.plugin.settings.treeExpansionAnimation === true,
			expandedIds: this._expandedGroupIds,
			selectedIds: this.selectedNodeIds,
			selectionCheckboxPosition: this.visibleCells.has('checkbox')
				? (this.plugin.settings.selectionCheckboxPosition ?? 'start')
				: 'hidden',
			onSelectionToggle: (id: string, selected: boolean, event?: MouseEvent) => {
				const result = resolveCheckboxSelection({
					selectedIds: this.selectedNodeIds, anchorId: this.selectionAnchorId,
					orderedVisibleIds: this._orderedVisibleTreeIds(), invokedId: id, selected,
					...(event ? { modifiers: event } : {}),
				});
				this.selectedNodeIds = result.selectedIds;
				this.selectionAnchorId = result.anchorId;
				this._touchSelection();
				this.render();
			},
			onToggle: (id: string) => {
				this._toggleExpandedGroup(id);
			},
			// B-groupbody: el cuerpo del row de grupo entra por el motor; el
			// chevron queda en `onToggle` puro.
			onGroupActivate: (id: string) => {
				this._activateGroupRow(id);
			},
			onRowClick: (id, event) => {
				if (isGroupHeader(id, this._groupIds)) {
					// B-groupbody: el motor ya no trae el cuerpo por aqui
					// (va a `onGroupActivate`); el auxclick si. Mismo camino.
					this._activateGroupRow(id);
					return;
				}
				if (this.interactionMode !== 'select') {
					if (this.dataSource) {
						const node = this.findNode(id);
						if (node) this.dataSource.activate(entityIdOf(node));
						return;
					}
					this._activateSettingSceneRow(id);
					return;
				}
				// U130-GGC-024: Shift/Ctrl+Shift range over the logical visible
				// order; plain click keeps the explicit toggle outcome.
				if (event?.shiftKey === true) {
					const mouse = event;
					const { selectedIds, anchorId } = resolveContextClickSelection({
						selectedIds: this.selectedNodeIds,
						anchorId: this.selectionAnchorId,
						orderedVisibleIds: this._orderedVisibleTreeIds(),
						invokedId: id,
						modifiers: {
							ctrlKey: mouse.ctrlKey,
							metaKey: mouse.metaKey,
							shiftKey: true,
						},
					});
					this.selectedNodeIds = selectedIds;
					this.selectionAnchorId = anchorId;
				} else if (this.selectedNodeIds.has(id)) {
					this.selectedNodeIds.delete(id);
					if (this.selectionAnchorId === id) this.selectionAnchorId = null;
				} else {
					this.selectedNodeIds.add(id);
					this.selectionAnchorId = id;
				}
				this._touchSelection();
				this.render();
			},
			onCellClick: (id, cellId) => {
				if (this.dataSource) {
					const node = this.findNode(id);
					if (node && !node.isGroupHeader) this.dataSource.cell(entityIdOf(node), cellId);
					return;
				}
				if (isGroupHeader(id, this._groupIds)) {
					// Spec 07 §2: `state` sobre una fila de grupo despacha a N
					// miembros, no a uno.
					if (cellId === 'state') void this.toggleGroup(id);
					return;
				}
				const node = this.findNode(id);
				if (!node) return;
				if (cellId === 'state') void this.toggle(node.meta);
				if (cellId === 'config') {
					openPluginSettings(this.plugin.app, node.meta.pluginId);
				}
				if (cellId === 'cell_update') void this.updatePlugin(node.meta);
			},
			rowTooltip: (node) => {
				const row = this.findNode(node.id);
				return this.dataSource && row ? this.dataSource.tooltip(row) : this.tooltip(node.meta as PluginMeta);
			},
			onEmptySpaceClick: () => this.clearSelection(),
			onRowHover: (id, row) => {
				const node = this.findNode(id);
				if (this.dataSource) {
					if (node && this.tooltipsOverride !== false) setTooltip(row, this.dataSource.tooltip(node));
					return;
				}
				if (node && this.tooltipsOverride !== false)
					setTooltip(row, this.tooltip(node.meta), {
				placement: tooltipPlacementForSetting(
					this.plugin.settings?.tooltipPlacement,
					this.containerEl,
				),
			});
			},
			onContextMenu: (id, event) => {
				if (isGroupHeader(id, this._groupIds)) {
					// U130 Slice B (spec-03 §24-40): cmenu universal de grupo.
					const header = this.findNode(id);
					this.plugin.contextMenuService.openPanelMenu(
						{
							nodeType: 'group',
							node: header ?? {
								id,
								label: id,
								meta: {},
								icon: '',
								depth: 0,
							},
							surface: 'panel',
							groupId: id,
							groupOwner: this._isCustomGroupId(id) ? 'custom' : 'preset',
							groupHidden: this.hiddenGroupIds.has(id),
							hideGroup: this.groupHideHandler,
							deleteGroup: this.groupDeleteHandler,
							groupExpanded: this._expandedGroupIds.has(id),
							materializePreset:
								this._isCustomGroupId(id) ||
								!header ||
								!this.materializePresetHandler
									? undefined
									: () =>
										this.materializePresetHandler!(
											snapshotPresetBucket(
												header,
												(node) => this._membershipUrnOf(node),
												this.selectionRevision,
											),
										),
							makeACopy: this._isCustomGroupId(id)
								? () => {
										if (this.groupCopyHandler) this.groupCopyHandler(id);
										else this._makeACopyOfGroup(id);
									}
								: undefined,
							renameGroup: this._isCustomGroupId(id)
								? async (targetId: string) => {
										if (this.groupRenameHandler) await this.groupRenameHandler(targetId);
										else await this._renameCustomGroup(targetId);
									}
								: undefined,
							updateGroupScope: this._isCustomGroupId(id)
								? () => {
										if (this.groupScopeHandler) this.groupScopeHandler(id);
										else this._updateCustomGroupScope(id);
									}
								: undefined,
							toggleGroupExpand: (groupId: string) => {
								this._toggleExpandedGroup(groupId);
							},
						},
						event,
					);
					return;
				}
				const node = this.findNode(id);
				if (this.dataSource && node) {
					this._includeInvokedInSelection(id, event);
					const menu = new Menu();
					const create = this._groupCreationMenuCtx().createGroupWithSelected;
					if (create) menu.addItem((item) => item.setTitle(translate('group.selected')).setIcon('lucide-boxes').onClick(() => { void create(); }));
					menu.showAtMouseEvent(event);
					return;
				}
				// U130 Slice A: `node_settings` no es plugin y no tiene menú
				// de plugin (su `pluginId` es '').
				if (!node || !node.meta.pluginId) return;
				this._includeInvokedInSelection(id, event);
				this.openMenu(node.meta, event);
			},
		});
		this.onIndexChanged?.();
		if (this.nodes.length === 0) {
			this.emptyEl = this.containerEl.createDiv({
				cls: 'vaultman-files-empty-state',
				// U130 Slice A: término no vacío con adapter ausente = estado
				// "native settings search unavailable" (clave existente, sin
				// strings nuevos); el resto conserva el vacío de siempre.
				text: translate(
					this.settingsSearchUnavailable
						? 'addons.plugins.unavailable'
						: 'addons.plugins.empty',
				),
			});
		}
	}

	private findNode(id: string): TreeNode<PluginMeta> | undefined {
		// Priorizar la ocurrencia proyectada exacta; el árbol fuente puede
		// contener settings anidados, así que el fallback también es recursivo.
		const projected = findProjectedNode(this._lastProjectedTree, id);
		if (projected) return projected;
		const walk = (
			list: readonly TreeNode<PluginMeta>[],
		): TreeNode<PluginMeta> | undefined => {
			for (const node of list) {
				if (node.id === id || entityIdOf(node) === id) return node;
				const found = walk(node.children ?? []);
				if (found) return found;
			}
			return undefined;
		};
		return walk(this.nodes);
	}

	/** B-groupbody: el chevron y el fallback open del cuerpo. Puro toggle. */
	private _toggleExpandedGroup(id: string): void {
		if (this._expandedGroupIds.has(id)) this._expandedGroupIds.delete(id);
		else this._expandedGroupIds.add(id);
		this.onExpansionChange?.();
		this.render();
	}

	/** Conmuta la selección de una fila (camino `select` y fallback F5). */
	private _toggleRowSelection(id: string): void {
		if (this.selectedNodeIds.has(id)) {
			this.selectedNodeIds.delete(id);
			if (this.selectionAnchorId === id) this.selectionAnchorId = null;
		} else {
			this.selectedNodeIds.add(id);
			this.selectionAnchorId = id;
		}
		this._touchSelection();
		this.render();
	}

	/**
	 * U130 parity C (F5 primero): activación en modo `open` (default).
	 *
	 * - Fila `node_plugin` con tab → su tab (`openPluginSettings` path).
	 * - Fila `node_settings` con `ref.tab` → el tab exacto vía
	 *   `openTabById(ref.tab)` (page-level solo cuando sea direccionable:
	 *   la API pública nativa direcciona tabs; la page queda para el
	 *   executor de design-01, fuera de alcance).
	 * - Con `settingSceneGoToTarget === 'panel_content'`, la fila
	 *   `node_settings` resoluble entra al modo content (F6) en vez del
	 *   modal; la fila `node_plugin` mantiene el modal (el contenido a
	 *   nivel de tab exige el executor, fuera de alcance: nunca una
	 *   superficie a medio construir).
	 * - Sin destino resoluble → selección (nunca un click muerto). Formas:
	 *   plugin sin tab registrado, settings sin tab, API nativa ausente.
	 */
	private _activateSettingSceneRow(id: string): void {
		const node = this.findNode(id);
		if (!node) return;
		const ref = settingsBridgeRefOf(node.meta);
		const hasPluginTab =
			!ref &&
			node.meta.pluginId !== '' &&
			pluginSettingTabIds(this.plugin.app).has(node.meta.pluginId);
		const activation = resolveSettingSceneActivation({
			row: {
				// A bridge ref identifies node_setting even when metadata keeps
				// the owning plugin id (including General and Files & links).
				pluginId: ref ? '' : node.meta.pluginId,
				settingsTab: ref ? ref.tab : '',
				hasPluginTab,
				// Coordinator wiring (NAV lane left tab-only): forward the
				// exact page/definition so execute can land on the precise
				// setting instead of the tab top. Absent ref = tab-level.
				settingsPage: ref?.page,
				settingsPagePath: ref?.pagePath,
				settingsDefinition: ref?.definition,
			},
			settingApiAvailable: hasSettingOpenApi(this.plugin.app),
		});
		const target = normalizeSettingSceneGoToTarget(
			this.plugin.settings.settingSceneGoToTarget,
		);
		if (target === 'panel_content' && activation.kind === 'open-settings-tab') {
			this.selectedNodeIds.add(id);
			this.settingSceneContentId = id;
			this.setSettingSceneMode('content');
			return;
		}
		const outcome = executeSettingSceneActivation(this.plugin.app, activation);
		if (outcome.status !== 'failed') return;
		this._toggleRowSelection(id);
	}

	/**
	 * B-groupbody: accion del CUERPO del row de grupo segun el modo. En
	 * `select` conmuta los MIEMBROS (ids de entidad, sin el sufijo `@grupo`
	 * de las filas multi-grupo), nunca el id del grupo; solo `open` colapsa o
	 * expande desde el cuerpo. El caret conserva su acción directa.
	 */
	private _activateGroupRow(id: string): void {
		if (this.interactionMode === 'select') {
			const tree =
				this._lastProjectedTree.length > 0
					? this._lastProjectedTree
					: this.nodes;
			const header = findProjectedNode(tree, id);
			if (!header?.children?.length) return;
			const members = collectGroupMemberIds(header.children);
			if (members.length === 0) return;
			const { next } = toggleGroupMembers(this.selectedNodeIds, members);
			this.selectedNodeIds = next;
			this._touchSelection();
			this.render();
			return;
		}
		if (this.interactionMode !== 'open') return;
		this._toggleExpandedGroup(id);
		if (
			id === 'group:community-plugins' ||
			id === 'vaultman.group.preset:community-plugins'
		) {
			openSettingsTabById(this.plugin.app, 'community-plugins');
		} else if (
			id === 'group:core-plugins' ||
			id === 'vaultman.group.preset:core-plugins'
		) {
			openSettingsTabById(this.plugin.app, 'plugins');
		}
	}

	private tooltip(meta: PluginMeta): string {
		return buildAddonHoverInfo(
			{
				name: meta.name,
				installed: formatAddonTimestamp(meta.installedTime),
				updated: formatAddonTimestamp(meta.updatedTime),
				version: meta.version,
				author: meta.author,
			},
			{
				installed: translate('addons.installed'),
				updated: translate('addons.updated'),
				version: translate('addons.version'),
				author: translate('addons.author'),
			},
		);
	}

	onIndexChanged?: (change?: FloatingTocExpansionChange) => void;

	getIndexNodes(rootId: string | null): IndexNodeRef[] {
		if (rootId !== null) return [];
		return this.nodes.map((node) => ({
			id: node.id,
			label: node.label,
			isContainer: false,
		}));
	}

	isIndexableSort(): boolean {
		return isFloatingTocSortIndexable(
			'plugins',
			activeScopeSort('plugins', this.sortState).sortBy,
		);
	}

	supportsKindToggle(): boolean {
		return false;
	}

	supportsDrill(): boolean {
		return false;
	}

	scopeRootForNode(_id: string): string | null {
		return null;
	}

	sortNodeLabel(id: string): string | null {
		const node = this.findNode(id);
		return node?.label ?? null;
	}

	scopeLevelForNode(_id: string): number | string | null {
		return null;
	}

	expandNodeById(_id: string): void {}

	revealNode(id: string, options?: { behavior?: ScrollBehavior }): boolean {
		if (!this.findNode(id)) return false;
		this.treeView?.scrollToId(id, 'start', options?.behavior ?? 'auto');
		return true;
	}


	private openMenu(meta: PluginMeta, event: MouseEvent): void {
		this.plugin.contextMenuService.openPanelMenu(
			{
				nodeType: 'plugin',
				node: { id: meta.pluginId, label: meta.name, meta, depth: 0 },
				// U121-062: same key mismatch as snippets -- ctx by id, selection by
				// `plugin:<id>`.
				selectedIds: new Set(
					[...this.selectedNodeIds].map((id) => id.replace(/^plugin:/, '')),
				),
				orderedIds: this.nodes.map((node) => node.meta.pluginId),
				surface: 'panel',
				...this._groupCreationMenuCtx(),
				...this._degroupMenuCtx(this.findNode(meta.pluginId) ?? { id: meta.pluginId, label: meta.name, depth: 0, meta }),
			},
			event,
		);
	}

	/**
	 * Spec 07 §2: cascada descendente. ACTION, no operation: cambio directo
	 * de estado del workspace sin pasar por la queue ni por
	 * `OperationSummaryModal`. Tri-estado como el toggle de
	 * expansion/colapso: si hay algo encendido, la primera pulsacion APAGA
	 * todo; solo con todo apagado la siguiente ENCIENDE todo.
	 */
	private async toggleGroup(groupId: string): Promise<void> {
		const header = this.projectedNodes().find(
			(node) => node.id === groupId,
		);
		const members = new Map<string, PluginMeta>();
		for (const child of header?.children ?? []) {
			const meta = child.meta;
			if (meta?.pluginId && !members.has(meta.pluginId)) {
				members.set(meta.pluginId, meta);
			}
		}
		if (members.size === 0) return;
		const listed = [...members.values()];
		const target = resolveGroupToggleTarget(
			listed.map((meta) => meta.enabled),
		);
		const todo = listed.filter(
			(meta) =>
				meta.enabled !== target &&
				!this.pendingToggleIds.has(meta.pluginId),
		);
		if (todo.length === 0) return;
		for (const meta of todo) this.pendingToggleIds.add(meta.pluginId);
		this.rebuildNodes();
		try {
			let failed = 0;
			for (const meta of todo) {
				const changed = await setCommunityPluginEnabled(
					this.plugin.app,
					meta.pluginId,
					target,
				);
				if (!changed) failed += 1;
			}
			if (failed > 0) {
				new Notice(translate('addons.plugins.failed'));
			}
			// Igual que el toggle individual: si nos apagamos a nosotros
			// mismos, el caller se descarga y no hay refresh que valga.
			const selfOff = todo.some(
				(meta) => meta.isVaultman && meta.enabled && !target,
			);
			if (!selfOff && !this.destroyed) await this.refresh();
		} catch (error) {
			new Notice(translate('addons.plugins.failed'));
			console.error('Vaultman community plugin group toggle failed', error);
		} finally {
			for (const meta of todo) this.pendingToggleIds.delete(meta.pluginId);
			if (!this.destroyed) this.rebuildNodes();
		}
	}

	private async toggle(meta: PluginMeta): Promise<void> {		if (this.pendingToggleIds.has(meta.pluginId)) return;
		this.pendingToggleIds.add(meta.pluginId);
		this.rebuildNodes();
		let callerWillUnload = false;
		try {
			const changed = await toggleCommunityPlugin(this.plugin.app, meta);
			if (!changed) {
				new Notice(translate('addons.plugins.unavailable'));
				return;
			}
			callerWillUnload = meta.isVaultman && meta.enabled;
			if (!callerWillUnload && !this.destroyed) await this.refresh();
		} catch (error) {
			new Notice(translate('addons.plugins.failed'));
			console.error('Vaultman community plugin toggle failed', error);
		} finally {
			this.pendingToggleIds.delete(meta.pluginId);
			if (!callerWillUnload && !this.destroyed) this.rebuildNodes();
		}
	}

	private async updatePlugin(meta: PluginMeta): Promise<void> {
		if (this.pendingUpdateIds.has(meta.pluginId)) return;
		this.pendingUpdateIds.add(meta.pluginId);
		this.rebuildNodes();
		try {
			if (!this.plugin.pluginUpdatesService) return;
			const result = await this.plugin.pluginUpdatesService.updatePlugin(meta.pluginId);
			if (result.status !== 'success') {
				new Notice(result.message ?? translate('addons.update_failed'));
			}
		} catch (error) {
			new Notice(translate('addons.update_failed'));
			console.error('Vaultman plugin update failed', error);
		} finally {
			this.pendingUpdateIds.delete(meta.pluginId);
			if (!this.destroyed) this.rebuildNodes();
		}
	}
}

/**
 * B-groupbody: busca una cabecera en el arbol PROYECTADO (el base `nodes` no
 * trae cabeceras).
 */
function findProjectedNode(
	rows: readonly TreeNode<PluginMeta>[],
	id: string,
): TreeNode<PluginMeta> | undefined {
	for (const row of rows) {
		if (row.id === id) return row;
		const found = row.children?.length
			? findProjectedNode(row.children, id)
			: undefined;
		if (found) return found;
	}
	return undefined;
}
