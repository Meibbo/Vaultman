import { Component, Notice, setTooltip } from 'obsidian';
import type { VaultmanPlugin } from '../../main';
import { translate } from '../../i18n/index';
import type { SnippetMeta, TreeNode, TreeNodeCell } from '../../types/typeTree';
import type { ExplorerSortState, ExplorerViewMode } from '../../types/typeUI';
import type { AddonCellStyle } from '../../types/typeSettings';
import type { FloatingTocExpansionChange } from '../../services/routerFloatingToc';
import type { IndexNodeRef } from '../../logic/logicIndexGroups';
import {
	cssSnippetStateSignature,
	cssSnippetPath,
	listCssSnippetEntries,
	setCssSnippetEnabled,
} from '../../utils/obsidianAddons';
import {
	getAddonIconOverride,
	readAddonIconOverrides,
	resolveAddonIcon,
} from '../../logic/logicAddonIcons';
import {
	buildAddonHoverInfo,
	filterAddonEntries,
	formatAddonTimestamp,
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
import { normalizeAddonCellStyle } from '../../logic/logicAddonCells';
import {
	resolveGroupToggleTarget,
	summarizeGroupToggleState,
} from '../../logic/logicAddonGroupToggle';
import { queuedRenameBadgeForPath } from '../../logic/logicRenameBadges';
import { prefixesFromSettings, snippetAliasTokens } from '../../services/serviceNodeBinding';
import {
	deletionBadge,
	findDeletionMatch,
	queueDeletesSubject,
} from '../../logic/logicDeletionDecoration';
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
	collectSelectedMembershipUrns,
	expandNewGroupHeaders,
	isGroupHeader,
	projectGroupedTree,
	resolveCustomGroups,
	toggleGroupMembers,
} from '../../logic/logicTreeGroupProjection';
import {
	NO_GROUP_PRESET,
	sameGroupPreset,
	type GroupPreset,
} from '../../types/typeGroupPreset';
import { translatedRangeLabels } from '../../utils/groupPresetLabels';
import type { MenuCtx } from '../../types/typeCMenu';

export class SnippetsExplorerPanel
	extends Component
	implements AddonExplorerPanelPort
{
	private readonly containerEl: HTMLElement;
	private readonly plugin: VaultmanPlugin;
	private treeView: UnifiedTreeView | null = null;
	private nodes: TreeNode<SnippetMeta>[] = [];
	/** A07b-2: el ultimo arbol PROYECTADO (cabeceras + ocurrencias `id@grupo`),
	 *  como el `_lastRenderTree` de files. La seleccion guarda ids de fila
	 *  proyectada y solo este arbol los empareja todos. */
	private _lastProjectedTree: TreeNode<SnippetMeta>[] = [];
	private entries: SnippetMeta[] = [];
	private searchTerm = '';
	private sortState = normalizeExplorerSortState('snippets', null);
	private visibleCells = new Set(['checkbox', 'icon', 'text', 'state']);
	private emptyEl: HTMLElement | null = null;
	private destroyed = false;
	private refreshRevision = 0;
	private cellStyle: AddonCellStyle;
	private readonly pendingToggleIds = new Set<string>();
	private interactionMode: InteractionMode = 'open';
	private selectedNodeIds = new Set<string>();
	/** U130-03: ids de los grupos custom activos. Lo puebla la tarea 3.3. */
	private readonly _groupIds = new Set<string>();
	/** Spec 08 §3.2: the grouping switch IS this selection; `none` = off. */
	private groupPreset: GroupPreset = { ...NO_GROUP_PRESET };
	/** Spec 08: view_option `indent` per_instance. `false` flattens row padding
	 *  to 4px and zeroes the per-depth indent unit. Default (unset) keeps the
	 *  indented geometry of today. */
	private indentOverride: boolean | undefined;
	private onExpansionChange?: () => void;
	/** Spec 08 §3.3: set by the navbar; receives the selection's membership URNs. */
	private createGroupHandler?: (urns: readonly string[]) => void;
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
		this.treeView = new UnifiedTreeView(this.containerEl);
		void this.refresh();
		// Snippet toggles made in core Settings surface as css-change; the poll
		// is the fallback for silent state changes (BT4-006).
		this.registerEvent(
			this.plugin.app.workspace.on('css-change', () => {
				void this.refresh();
			}),
		);
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
		// BT5-019: Iconic never resolves snippets, but its adapter also fires
		// when the icon library itself changes; repaint through that existing
		// event (no new timer) and release the subscription on unload.
		const iconic = this.plugin.iconicService;
		if (iconic) {
			this.register(iconic.onChanged(this._scheduleIconRebuild));
		}
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
		const signature = cssSnippetStateSignature(this.plugin.app);
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
		this._lastExternalSignature = cssSnippetStateSignature(this.plugin.app);
		const entries = await listCssSnippetEntries(this.plugin.app);
		if (this.destroyed || revision !== this.refreshRevision) return;
		this.entries = entries;
		this.rebuildNodes();
	}

	setSearchTerm(term: string): void {
		if (this.searchTerm === term) return;
		this.searchTerm = term;
		this.rebuildNodes();
	}

	setSortState(state: ExplorerSortState): void {
		const normalized = normalizeExplorerSortState('snippets', state);
		if (sameExplorerSortState(this.sortState, normalized)) return;
		this.sortState = normalized;
		this.rebuildNodes();
	}

	setGroupPreset(preset: GroupPreset): void {
		if (sameGroupPreset(this.groupPreset, preset)) return;
		this.groupPreset = { ...preset };
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
		handler?: (urns: readonly string[]) => void,
	): void {
		this.createGroupHandler = handler;
	}

	private _membershipUrnOf(node: TreeNode<SnippetMeta>): string {
		return formatMembershipUrn({
			providerId: 'snippets',
			kind: 'snippet',
			canonicalId: node.meta.name,
			displayLabel: node.label,
		});
	}

	/** Spec 08 §3.3: only in select mode with a selection, and only if someone listens. */
	private _groupCreationMenuCtx(): Pick<MenuCtx, 'createGroupWithSelected'> {
		const handler = this.createGroupHandler;
		if (
			!handler ||
			this.interactionMode !== 'select' ||
			this.selectedNodeIds.size === 0
		) {
			return {};
		}
		return {
			createGroupWithSelected: () =>
				handler(
					collectSelectedMembershipUrns(
						// A07b-2: el proyectado, como files (`_lastRenderTree`):
						// la seleccion trae ids de fila (`id@grupo` en
						// ocurrencias multi-grupo) y el arbol sin proyectar
						// los pierde en silencio.
						this._lastProjectedTree.length > 0
							? this._lastProjectedTree
							: this.nodes,
						this.selectedNodeIds,
						(node) => this._membershipUrnOf(node),
						this._groupIds,
					),
				),
		};
	}

	/** Spec 08 §3.2: add-ons expose their install/update times as the date presets. */
	private _groupPresetValue(
		node: TreeNode<SnippetMeta>,
		kind: GroupPreset['kind'],
	): string | number | null {
		if (kind === 'modified') return node.meta.updatedTime ?? null;
		if (kind === 'created') return node.meta.installedTime ?? null;
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
		const normalized = normalizeInteractionMode('snippets', mode);
		if (this.interactionMode === normalized) return;
		this.interactionMode = normalized;
		this.render();
	}

	setCellStyle(style: AddonCellStyle): void {
		const next = normalizeAddonCellStyle(style);
		if (this.cellStyle === next) return;
		this.cellStyle = next;
		this.rebuildNodes();
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

	private renameBadges(name: string) {
		const badges = [];
		const rename = queuedRenameBadgeForPath(
			this.plugin.queueService.queue,
			cssSnippetPath(this.plugin.app, name),
		);
		if (rename) badges.push(rename);
		// U121-075: a staged snippet delete is now a real queued operation, so
		// it decorates its node like every other scene does.
		const match = findDeletionMatch(
			{ kind: 'snippet', name },
			this.plugin.queueService.queue,
		);
		if (match) badges.push(deletionBadge(match, { solid: true }));
		return badges.length > 0 ? badges : undefined;
	}

	private deletionCls(name: string): string | undefined {
		return queueDeletesSubject(
			{ kind: 'snippet', name },
			this.plugin.queueService.queue,
		)
			? 'is-deleted-snippet'
			: undefined;
	}

	private rebuildNodes(): void {
		const filtered = filterAddonEntries(
			this.entries,
			this.searchTerm,
			(entry) => entry.name,
		);
		const entries = sortAddonEntries(
			filtered,
			activeScopeSort('snippets', this.sortState),
		);
		// Read the override map once per rebuild, not once per row.
		const overrides = readAddonIconOverrides(this.plugin.settings);
		this.nodes = entries.map((entry) => ({
			id: `snippet:${entry.name}`,
			label: entry.name,
			// BT5-019: Iconic has no snippet item-kind and a snippet emits no
			// icon of its own, so the chain here is override > fallback. The
			// shared resolver still owns the decision.
			icon: resolveAddonIcon({
				override: getAddonIconOverride(overrides, 'snippet', entry.name),
				iconic: null,
				emitted: null,
				fallback: 'lucide-file-code',
			}).icon,
			iconColor: getAddonIconOverride(overrides, 'snippet', entry.name)?.color,
			ctimeText: formatAddonTimestamp(entry.installedTime),
			mtimeText: formatAddonTimestamp(entry.updatedTime),
			badges: this.renameBadges(entry.name),
			cls: this.deletionCls(entry.name),
			depth: 0,
			cells: [
				{
					id: 'state',
					kind: 'toggle',
					enabled: entry.enabled,
					style: this.cellStyle,
					label: translate(
						entry.enabled ? 'addons.enabled' : 'addons.disabled',
					),
					disabled: this.pendingToggleIds.has(entry.name),
				},
			],
			meta: entry,
			coreCls: 'tree-item-self nav-file-title tappable is-clickable',
		}));
		this.render();
	}

	
	private _decorateNodeNotes(nodes: TreeNode<SnippetMeta>[]): void {
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
			const snippetName = node.meta?.name ?? node.label;
			const snippetTokens = snippetAliasTokens(snippetName, prefixesFromSettings(this.plugin.settings));
			if (snippetTokens.some((t) => aliasSet.has(t))) {
				node.meta.hasNodeNote = true;
			}
		}
	}

	private projectedNodes(): TreeNode<SnippetMeta>[] {
		// U130-09: el mapa es el de ESTA scene de ESTA instancia; lo aplica el
		// navbar desde la cascada, igual que `hiddenGroupIds`. Ya no se busca
		// un layout por nombre: el layout solo copia su foto en la scene.
		const memberships = this.groupMemberships;
		const groups = resolveCustomGroups(memberships).filter(
			(group) => !this.hiddenGroupIds.has(group.id),
		);
		this._groupIds.clear();
		for (const group of groups) this._groupIds.add(group.id);
		const projected = projectGroupedTree<SnippetMeta>({
			nodes: this.nodes,
			groups,
			memberships,
			providerId: 'snippets',
			noGroupLabel: translate('explorer.group.no_group'),
			filtered: this.sortState?.filtered === true,
			urnOf: (node) => this._membershipUrnOf(node),
			// S07A: la cabecera muestra el agregado burbujeado (identidades,
			// no ocurrencias) en vez de `children.length`.
			groupTotals: bubbleMemberCountsToGroups({
				groups,
				memberships,
				providerId: 'snippets',
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
			headerMeta: { name: '', enabled: false },
			headerCoreCls: 'tree-item-self nav-file-title tappable is-clickable',
		}) as TreeNode<SnippetMeta>[];
		expandNewGroupHeaders(projected, this._seenGroupHeaderIds, this._expandedGroupIds, this._groupIds);
		return this.withGroupToggleCells(projected);
	}

	/**
	 * Spec 07 §2: la cabecera del grupo aloja su propio `cell_toggle` con el
	 * agregado de sus miembros. Sin cabeceras se devuelve la lista TAL CUAL,
	 * por identidad.
	 */
	private withGroupToggleCells(
		rows: readonly TreeNode<SnippetMeta>[],
	): TreeNode<SnippetMeta>[] {
		if (!rows.some((row) => isGroupHeader(row.id, this._groupIds))) {
			return rows as TreeNode<SnippetMeta>[];
		}
		return rows.map((row) => {
			if (!isGroupHeader(row.id, this._groupIds)) return row;
			if (!row.children?.length) return row;
			const states = row.children.map(
				(child) => child.meta?.enabled ?? false,
			);
			const { enabled, mixed } = summarizeGroupToggleState(states);
			const pending = row.children.some((child) =>
				this.pendingToggleIds.has(child.meta?.name ?? ''),
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
			surface: 'snippets',
			nodes: this._lastProjectedTree,
			visibleCells: this.visibleCells,
			// U130-t33 (L-PNODE): snippets no tiene anidacion propia, pero un
			// grupo activo si crea un nivel (cabecera -> miembros) que
			// necesita la guia igual que el resto de p-nodes con hijos.
			indentGuides: this.groupPreset.kind !== 'none',
			indent: this.indentOverride ?? true,
			renderLabel: (row, node) => {
				if (this.visibleCells.has('format') && (node.meta as SnippetMeta)?.hasNodeNote === true) {
					const label = row.createSpan({
						cls: 'vaultman-tree-label vaultman-node-note-link',
						text: node.label,
					});
					if (node.labelColor) label.style.color = node.labelColor;
					label.onclick = (e) => {
						e.stopPropagation();
						e.preventDefault();
						const meta = node.meta as SnippetMeta;
						void this.plugin.nodeBindingService?.bindOrCreate(
							{ kind: 'snippet', label: meta.name ?? node.label, snippetName: meta.name },
							{ newLeaf: e.ctrlKey || e.metaKey || e.button === 1 },
						);
					};
					return true;
				}
				return false;
			},
			iconInCaretSlot: this.plugin.settings.iconInCaretSlot === true,
			expandedIds: this._expandedGroupIds,
			...(this.interactionMode === 'select'
				? {
						selectedIds: this.selectedNodeIds,
						selectionCheckboxPosition:
							this.visibleCells.has('checkbox')
							? (this.plugin.settings.selectionCheckboxPosition ?? 'start')
							: 'hidden',
						onSelectionToggle: (id: string, selected: boolean) => {
							if (selected) this.selectedNodeIds.add(id);
							else this.selectedNodeIds.delete(id);
							this.render();
						},
					}
				: {}),
			onToggle: (id: string) => {
				// Solo las cabeceras se pliegan aqui: los snippets son hojas.
				this._toggleExpandedGroup(id);
			},
			// B-groupbody: el cuerpo del row de grupo entra por el motor; el
			// chevron queda en `onToggle` puro.
			onGroupActivate: (id: string) => {
				this._activateGroupRow(id);
			},
			onRowClick: (id) => {
				if (isGroupHeader(id, this._groupIds)) {
					// B-groupbody: el motor ya no trae el cuerpo por aqui
					// (va a `onGroupActivate`); el auxclick si. Mismo camino.
					this._activateGroupRow(id);
					return;
				}
				if (this.interactionMode !== 'select') return;
				if (this.selectedNodeIds.has(id)) this.selectedNodeIds.delete(id);
				else this.selectedNodeIds.add(id);
				this.render();
			},
			onCellClick: (id, cellId) => {
				if (isGroupHeader(id, this._groupIds)) {
					// Spec 07 §2: `state` sobre una fila de grupo despacha a N
					// miembros, no a uno.
					if (cellId === 'state') void this.toggleGroup(id);
					return;
				}
				if (cellId !== 'state') return;
				const node = this.findNode(id);
				if (node) void this.toggle(node.meta);
			},
			rowTooltip: (node) => this.tooltip(node.meta as SnippetMeta),
			onRowHover: (id, row) => {
				const node = this.findNode(id);
				if (node) setTooltip(row, this.tooltip(node.meta));
			},
			onContextMenu: (id, event) => {
				if (isGroupHeader(id, this._groupIds)) {
					// B-groupbody: sin nodeType 'group' en typeCMenu ni menu
					// de grupo en logicGroupContextMenu no hay menu que
					// abrir; no caer al menu del item (ver informe).
					return;
				}
				const node = this.findNode(id);
				if (node) this.openMenu(node.meta, event);
			},
			onBadgeDoubleClick: (queueIndex) => {
				this.plugin.queueService.remove(queueIndex);
			},
			badgeCancelClickMode: this.plugin.settings.badgeCancelClickMode,
		});
		this.onIndexChanged?.();
		if (this.nodes.length === 0) {
			this.emptyEl = this.containerEl.createDiv({
				cls: 'vaultman-files-empty-state',
				text: translate('addons.snippets.empty'),
			});
		}
	}

	private findNode(id: string): TreeNode<SnippetMeta> | undefined {
		const baseId = id.includes('@') ? id.slice(0, id.lastIndexOf('@')) : id;
		return this.nodes.find((node) => node.id === baseId || node.id === id);
	}

	/** B-groupbody: el chevron y el fallback open del cuerpo. Puro toggle. */
	private _toggleExpandedGroup(id: string): void {
		if (this._expandedGroupIds.has(id)) this._expandedGroupIds.delete(id);
		else this._expandedGroupIds.add(id);
		this.onExpansionChange?.();
		this.render();
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
			this.render();
			return;
		}
		this._toggleExpandedGroup(id);
	}

	private tooltip(meta: SnippetMeta): string {
		return buildAddonHoverInfo(
			{
				name: meta.name,
				installed: formatAddonTimestamp(meta.installedTime),
				updated: formatAddonTimestamp(meta.updatedTime),
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
			'snippets',
			activeScopeSort('snippets', this.sortState).sortBy,
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

	expandNodeById(_id: string): void {}

	revealNode(id: string, options?: { behavior?: ScrollBehavior }): boolean {
		if (!this.findNode(id)) return false;
		this.treeView?.scrollToId(id, 'start', options?.behavior ?? 'auto');
		return true;
	}


	private openMenu(meta: SnippetMeta, event: MouseEvent): void {
		this.plugin.contextMenuService.openPanelMenu(
			{
				nodeType: 'snippet',
				node: { id: meta.name, label: meta.name, meta, depth: 0 },
				// U121-062: the ctx node is keyed by NAME while the selection is
				// keyed by `snippet:<name>`. Normalising here keeps the mismatch out
				// of the action, which has no business knowing either key.
				selectedIds: new Set(
					[...this.selectedNodeIds].map((id) => id.replace(/^snippet:/, '')),
				),
				orderedIds: this.nodes.map((node) => node.meta.name),
				surface: 'panel',
				...this._groupCreationMenuCtx(),
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
		const members = new Map<string, SnippetMeta>();
		for (const child of header?.children ?? []) {
			const meta = child.meta;
			if (meta?.name && !members.has(meta.name)) {
				members.set(meta.name, meta);
			}
		}
		if (members.size === 0) return;
		const listed = [...members.values()];
		const target = resolveGroupToggleTarget(
			listed.map((meta) => meta.enabled),
		);
		const todo = listed.filter(
			(meta) =>
				meta.enabled !== target && !this.pendingToggleIds.has(meta.name),
		);
		if (todo.length === 0) return;
		for (const meta of todo) this.pendingToggleIds.add(meta.name);
		this.rebuildNodes();
		try {
			let failed = 0;
			for (const meta of todo) {
				const changed = await setCssSnippetEnabled(
					this.plugin.app,
					meta.name,
					target,
				);
				if (!changed) failed += 1;
			}
			if (failed > 0) {
				new Notice(translate('addons.snippets.failed'));
			}
			await this.refresh();
		} catch (error) {
			new Notice(translate('addons.snippets.failed'));
			console.error('Vaultman CSS snippet group toggle failed', error);
		} finally {
			for (const meta of todo) this.pendingToggleIds.delete(meta.name);
			if (!this.destroyed) this.rebuildNodes();
		}
	}

	private async toggle(meta: SnippetMeta): Promise<void> {
		if (this.pendingToggleIds.has(meta.name)) return;
		this.pendingToggleIds.add(meta.name);
		this.rebuildNodes();
		try {
			const changed = await setCssSnippetEnabled(
				this.plugin.app,
				meta.name,
				!meta.enabled,
			);
			if (!changed) {
				new Notice(translate('addons.snippets.unavailable'));
				return;
			}
			await this.refresh();
		} catch (error) {
			new Notice(translate('addons.snippets.failed'));
			console.error('Vaultman CSS snippet toggle failed', error);
		} finally {
			this.pendingToggleIds.delete(meta.name);
			if (!this.destroyed) this.rebuildNodes();
		}
	}
}

/**
 * B-groupbody: busca una cabecera en el arbol PROYECTADO (el base `nodes` no
 * trae cabeceras).
 */
function findProjectedNode(
	rows: readonly TreeNode<SnippetMeta>[],
	id: string,
): TreeNode<SnippetMeta> | undefined {
	for (const row of rows) {
		if (row.id === id) return row;
		const found = row.children?.length
			? findProjectedNode(row.children, id)
			: undefined;
		if (found) return found;
	}
	return undefined;
}
