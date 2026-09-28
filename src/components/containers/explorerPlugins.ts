import { Component, Notice, setTooltip } from 'obsidian';
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
	GLOBAL_SETTINGS_GROUP_LABEL,
	isGlobalSettingsTab,
	isSettingsSearchActive,
	listCorePluginStubs,
	pluginCanonicalGroup,
	resolveSettingsBridgeNodes,
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
import { bubbleMemberCountsToGroups } from '../../logic/logicBadgeBubbling';
import {
	collectGroupMemberIds,
	entityIdOf,
	expandNewGroupHeaders,
	isGroupHeader,
	occurrenceOwnerOf,
	projectGroupedTree,
	resolveCustomGroups,
	toggleGroupMembers,
} from '../../logic/logicTreeGroupProjection';
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
	shouldClearExplorerSelectionOnEscape,
} from '../../logic/logicSelectionTargets';
import { flattenVisibleTree } from '../../utils/treeVirtualization';

export class PluginsExplorerPanel
	extends Component
	implements AddonExplorerPanelPort
{
	private readonly containerEl: HTMLElement;
	private readonly plugin: VaultmanPlugin;
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
	private visibleCells = new Set(['checkbox', 'icon', 'text', 'state', 'config', 'nested']);
	private emptyEl: HTMLElement | null = null;
	private destroyed = false;
	private refreshRevision = 0;
	private cellStyle: AddonCellStyle;
	private readonly pendingToggleIds = new Set<string>();
	private interactionMode: InteractionMode = 'open';
	private selectedNodeIds = new Set<string>();
	/** U130-GGC-022/024: per-instance/scene range anchor (occurrence row id). */
	private selectionAnchorId: string | null = null;
	private createGroupHandler?: CreateGroupHandler;
	private degroupSelectedHandler?: DegroupSelectedHandler;
	private materializePresetHandler?: MaterializePresetHandler;
	private groupHideHandler?: (groupId: string, hidden: boolean) => void;
	private groupDeleteHandler?: (groupId: string) => void;
	private selectionInstanceId: string | null = null;
	private selectionRevision: number | null = null;

	private _selectionKey(): string {
		return selectionKeyFor('plugins', 'plugins', this.selectionInstanceId);
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
	private onExpansionChange?: () => void;
	/** Spec 08 §3.3: set by the navbar; receives the selection's membership URNs. */
	/** Spec 08 §4: hidden custom groups of this instance; they project as `No group`. */
	private hiddenGroupIds: ReadonlySet<string> = new Set();
	/** U130-09: custom groups of this scene of this instance (`SceneConfig.groupMemberships`). */
	private groupMemberships: Readonly<Record<string, readonly string[]>> = {};
	/** Group headers this explorer has already shown once (they open on first sight). */
	private readonly _seenGroupHeaderIds = new Set<string>();
	private _expandedGroupIds = new Set<string>();

	constructor(containerEl: HTMLElement, plugin: VaultmanPlugin) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.cellStyle = normalizeAddonCellStyle(plugin.settings.addonCellStyle);
	}

	onload(): void {
		this.destroyed = false;
		this.containerEl.addEventListener('keydown', this._handleSelectionEscape);
		this.register(() =>
			this.containerEl.removeEventListener('keydown', this._handleSelectionEscape),
		);
		this.treeView = new UnifiedTreeView(this.containerEl);
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
		const revision = ++this.refreshRevision;
		const manifestId = this.plugin.manifest.id;
		this._lastExternalSignature = communityPluginStateSignature(
			this.plugin.app,
		);
		const entries = await listCommunityPluginEntries(this.plugin.app);
		if (this.destroyed || revision !== this.refreshRevision) return;
		this.entries = entries.map((entry) => ({
			...entry,
			isVaultman: entry.pluginId === manifestId,
		}));
		this.rebuildNodes();
	}

	setSearchTerm(term: string): void {
		if (this.searchTerm === term) return;
		this.searchTerm = term;
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

	setSelectionScope(scope: { instanceId: string | null; revision: number | null; scene: string }): void {
		this.selectionInstanceId = scope.instanceId;
		this.selectionRevision = scope.revision;
	}

	private _membershipUrnOf(node: TreeNode<PluginMeta>): string {
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

	private _degroupMenuCtx(node: TreeNode<PluginMeta>): Pick<MenuCtx, 'degroupSelected' | 'membershipOwner' | 'occurrenceEntityId' | 'groupOwner'> {
		const owner = occurrenceOwnerOf(node);
		if (
			!owner ||
			!this.degroupSelectedHandler ||
			this.selectedNodeIds.size === 0 ||
			!this._groupIds.has(owner)
		)
			return {};
		return {
			membershipOwner: owner,
			groupOwner: this._groupIds.has(owner) ? 'custom' : 'preset',
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
				return this.degroupSelectedHandler?.(snapshot, owner) ?? { status: 'cancelled' };
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
			// U130-C1: en reposo (term vacío) las filas top-level son
			// `node_plugin` + `node_settings` globales planas. El bucket
			// lo gobierna `projectGroupedTree`: plugins → Core/Community
			// (por id, F10) y settings globales → Global settings.
			const ref = settingsBridgeRefOf(node.meta);
			if (ref) {
				if (isGlobalSettingsTab(ref.tab)) return GLOBAL_SETTINGS_GROUP_LABEL;
				return ref.tab;
			}
			const pluginId = node.meta?.pluginId ?? '';
			if (pluginId !== '') {
				return pluginCanonicalGroup(pluginId, this._communityIds) === 'core'
					? 'Core plugins'
					: 'Community plugins';
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

	/**
	 * A07: la unica expansibilidad de un explorer plano son sus cabeceras de
	 * grupo. Sin preset no hay nada que plegar.
	 */
	private _expansionEnabled(): boolean {
		return this.groupPreset.kind !== 'none';
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
		for (const row of this.projectedNodes()) {
			if (isGroupHeader(row.id, this._groupIds)) {
				this._expandedGroupIds.add(row.id);
			}
		}
		this.onExpansionChange?.();
		this.render();
	}

	collapseAll(): void {
		this._expandedGroupIds.clear();
		this.onExpansionChange?.();
		this.render();
	}

	private rebuildNodes(): void {
		// U130 Slice A: término activo = camino nativo (sin `searchText`
		// local, sin re-sort: el ranking es el orden nativo). Término vacío
		// = forma canónica 2026-09-25: grupos core/community → plugins →
		// tabs/pages en orden nativo. Sin tabs el plugin queda hoja (F4).
		if (isSettingsSearchActive(this.searchTerm)) {
			this.rebuildSettingsBridgeNodes();
			return;
		}
		const filtered = filterAddonEntries(
			this.entries,
			this.searchTerm,
			(entry) =>
				[entry.name, entry.version, entry.author, entry.description]
					.filter(Boolean)
					.join(' '),
		);
		const scopeSort = activeScopeSort('plugins', this.sortState);
		const entries = sortAddonEntries(filtered, scopeSort);
		// U130 forma canónica: core por id (nunca display name). Los stubs
		// core llevan el mismo sort de scope que los community.
		const communityIds = new Set(this.entries.map((entry) => entry.pluginId));
		const coreMetas: PluginMeta[] = sortAddonEntries(
			listCorePluginStubs(this.plugin.app, communityIds).map((stub) => ({
				name: stub.name,
				enabled: stub.enabled,
				pluginId: stub.pluginId,
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
		// U130 parity B (F1): con nesting off, filas planas sin caret.
		// U130-C1: también planas las globales (mismo orden que el camino anidado).
		const nestedOn = this._nestedEnabled();
		if (!nestedOn) {
			this._communityIds = communityIds;
			const flat = [
				...buildGlobalSettingsNodes(this.plugin.app, communityIds),
				...communityNodes,
				...coreNodes,
			];
			for (const node of flat) {
				node.children = [];
				node.showCaret = false;
			}
			this.nodes = flat;
			this.settingsSearchHighlightIds = new Set<string>();
			this.render();
			return;
		}
		// U130-C1 (Defecto 1): el preset viaja hasta las raíces: con
		// `none` el árbol es plano (sin cabeceras `group:*`); el
		// `sections` lo agrupa `projectGroupedTree`, no esta función.
		this._communityIds = communityIds;
		this.nodes = buildCanonicalRestRoots({
			app: this.plugin.app,
			pluginNodes: [...communityNodes, ...coreNodes],
			communityIds,
			groupPreset: this.groupPreset,
		});
		this.settingsSearchHighlightIds = new Set<string>();
		this.render();
	}

	/**
	 * Camino nativo: resuelve los grupos cacheados contra las entries
	 * frescas. Espacios, cero resultados, adapter ausente o nativo roto
	 * limpian el árbol previo (nada de rows stale, nada de filtro local).
	 */
	private rebuildSettingsBridgeNodes(): void {
		if (this.settingsSearchUnavailable || !this.settingsSearchGroups) {
			this.nodes = [];
			this.settingsSearchHighlightIds = new Set<string>();
			this.render();
			return;
		}
		const ordered = sortAddonEntries(
			this.entries,
			activeScopeSort('plugins', this.sortState),
		);
		const byId = new Map<string, TreeNode<PluginMeta>>();
		for (const node of this.buildPluginNodes(ordered)) {
			byId.set(node.meta.pluginId, node);
		}
		const bridge = resolveSettingsBridgeNodes({
			pluginNodesById: byId,
			groups: this.settingsSearchGroups,
		});
		this.nodes = bridge.nodes;
		this.settingsSearchHighlightIds = this.searchHighlightEnabled
			? bridge.highlightIds
			: new Set<string>();
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
			cells.push({
				id: 'state',
				kind: 'toggle',
				enabled: entry.enabled,
				style: this.cellStyle,
				label: translate(
					entry.enabled ? 'addons.enabled' : 'addons.disabled',
				),
				disabled: this.pendingToggleIds.has(entry.pluginId),
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
		const memberships = this.groupMemberships;
		const groups = resolveCustomGroups(memberships).filter(
			(group) => !this.hiddenGroupIds.has(group.id),
		);
		this._groupIds.clear();
		for (const group of groups) this._groupIds.add(group.id);

		// U130 parity A2 (F3): las filas del puente nunca entran a
		// grupos custom (ni padres nativos ni sus hijos settings/plugin;
		// tampoco los tabs/pages de term vacío, que viajan con su plugin
		// por holarchy). Con búsqueda activa los padres nativos quedan
		// arriba sin re-envolver; los hijos viajan con ellos.
		const searchActive = isSettingsSearchActive(this.searchTerm ?? '');
		let nodesForGrouping = this.nodes;
		let nativeParents: TreeNode<PluginMeta>[] | undefined;
		if (searchActive) {
			const protectedIds = new Set<string>();
			for (const node of this.nodes) {
				// Padres nativos (grupo `settings:tab::pagePath::`) y
				// cualquier fila puente top-level (`settings:…`, incl.
				// hijos con `#tab`/`#page` si alguna vez suben a raíz).
				if (node.id.startsWith('settings:')) {
					protectedIds.add(node.id);
				}
			}
			// Separate: native parents stay at top level, rest get grouped
			nativeParents = this.nodes.filter((node) =>
				protectedIds.has(node.id),
			);
			nodesForGrouping = this.nodes.filter(
				(node) => !protectedIds.has(node.id),
			);
			if (nodesForGrouping.length === 0) {
				return this.withGroupToggleCells(nativeParents);
			}
		}

		const projected = projectGroupedTree<PluginMeta>({
			nodes: nodesForGrouping,
			groups,
			memberships,
			providerId: 'plugins',
			noGroupLabel: translate('explorer.group.no_group'),
			filtered: this.sortState?.filtered === true,
			hiddenGroupIds: this.hiddenGroupIds,
			urnOf: (node) => this._membershipUrnOf(node),
			// S07A: la cabecera muestra el agregado burbujeado (identidades,
			// no ocurrencias) en vez de `children.length`.
			groupTotals: bubbleMemberCountsToGroups({
				groups,
				memberships,
				providerId: 'plugins',
			}),
			// Spec 08 §3.1.bis: the preset selection is the switch, never the
			// sort scope.
			enabled: this.groupPreset.kind !== 'none',
			preset: this.groupPreset,
			presetValueOf: (node, kind) => this._groupPresetValue(node, kind),
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
		const result = this.withGroupToggleCells(projected);
		// U130: prepend native group parents so they stay at top level
		// and are not rewrapped by custom groups during native search.
		if (searchActive && nativeParents && nativeParents.length > 0) {
			return [...nativeParents, ...result];
		}
		return result;
	}

	/**
	 * Spec 07 §2: la cabecera del grupo aloja su propio `cell_toggle` con el
	 * agregado de sus miembros. Sin cabeceras se devuelve la lista TAL CUAL,
	 * por identidad.
	 */
	private withGroupToggleCells(
		rows: readonly TreeNode<PluginMeta>[],
	): TreeNode<PluginMeta>[] {
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
				},
			];
			return { ...row, cells };
		});
	}

	private render(): void {
		if (!this.treeView) return;
		if (this.visibleCells.has('format')) {
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
			tooltipsEnabled: this.tooltipsOverride ?? true,
			tooltipPlacement: tooltipPlacementForSetting(this.plugin.settings?.tooltipPlacement),
			renderLabel: (row, node) => {
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
			iconInCaretSlot: this.plugin.settings.iconInCaretSlot === true,
			expansionAnimation: this.plugin.settings.treeExpansionAnimation === true,
			expandedIds: this._expandedGroupIds,
			selectedIds: this.selectedNodeIds,
			selectionCheckboxPosition: this.visibleCells.has('checkbox')
				? (this.plugin.settings.selectionCheckboxPosition ?? 'start')
				: 'hidden',
			onSelectionToggle: (id: string, selected: boolean) => {
				if (selected) {
					this.selectedNodeIds.add(id);
					this.selectionAnchorId = id;
				} else {
					this.selectedNodeIds.delete(id);
					if (this.selectionAnchorId === id) this.selectionAnchorId = null;
				}
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
					this._activateSettingSceneRow(id);
					return;
				}
				// U130-GGC-024: Shift/Ctrl+Shift range over the logical visible
				// order; plain click keeps the explicit toggle outcome.
				if ((event as MouseEvent | undefined)?.shiftKey === true) {
					const mouse = event as MouseEvent;
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
			},
			rowTooltip: (node) => this.tooltip(node.meta as PluginMeta),
			onRowHover: (id, row) => {
				const node = this.findNode(id);
				if (node && this.tooltipsOverride !== false)
					setTooltip(row, this.tooltip(node.meta), {
				placement: tooltipPlacementForSetting(
					this.plugin.settings?.tooltipPlacement,
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
							groupOwner: this._groupIds.has(id) ? 'custom' : 'preset',
							groupHidden: this.hiddenGroupIds.has(id),
							hideGroup: this.groupHideHandler,
							deleteGroup: this.groupDeleteHandler,
							groupExpanded: this._expandedGroupIds.has(id),
							materializePreset:
								this._groupIds.has(id) ||
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
							toggleGroupExpand: (groupId: string) => {
								this._toggleExpandedGroup(groupId);
							},
						},
						event,
					);
					return;
				}
				const node = this.findNode(id);
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
			node.meta.pluginId !== '' &&
			pluginSettingTabIds(this.plugin.app).has(node.meta.pluginId);
		const activation = resolveSettingSceneActivation({
			row: {
				pluginId: node.meta.pluginId,
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
		if (executeSettingSceneActivation(this.plugin.app, activation)) return;
		this._toggleRowSelection(id);
	}

	/**
	 * B-groupbody: accion del CUERPO del row de grupo segun el modo. En
	 * `select` conmuta los MIEMBROS (ids de entidad, sin el sufijo `@grupo`
	 * de las filas multi-grupo), nunca el id del grupo; en el resto
	 * colapsa/expande como una carpeta.
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
		this._toggleExpandedGroup(id);
		if (id === 'group:community-plugins') {
			openSettingsTabById(this.plugin.app, 'community-plugins');
		} else if (id === 'group:core-plugins') {
			openSettingsTabById(this.plugin.app, 'core-plugins');
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

	scopeLevelForNode(_id: string): number | null {
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
