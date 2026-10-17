import { Menu, Notice } from 'obsidian';
import type { VaultmanPlugin } from '../main';
import { translate } from '../i18n';
import type { AddonExplorerDataSource } from './logicAddonDataSource';
import {
	buildApiSceneGroups,
	PUBLISH_CELL_ID,
	type ApiSceneNodeMeta,
	type ApiScenePublisherView,
} from './logicApiSceneModel';
import { buildApiSceneNodes } from './logicApiSceneNodes';
import { flattenApiSceneNodes } from './logicApiSceneCommandRows';
import { apiSceneMemberships, nestApiScenePluginKinds } from './logicApiSceneTree';
import { formatAddonTimestamp } from './logicAddonExplorer';
import { resolveGroupToggleTarget } from './logicAddonGroupToggle';
import { setInstanceCellName } from './logicInstanceRegistry';
import { showInputModal } from '../utils/inputModal';
import { entityIdOf } from './logicTreeGroupProjection';
import { executeObsidianCommand, listObsidianCommands } from '../utils/obsidianCommands';
import { refreshCommandPaletteCache } from './logicCommandPaletteInterceptor';
import type { PluginMeta, TreeNode } from '../types/typeTree';

export interface ApiSceneDataSourceOptions {
	onClose?: () => void;
	onOpenInstance?: (id: string) => Promise<boolean | { ok: boolean; reason?: string }>;
}

export function createApiSceneDataSource(
	plugin: VaultmanPlugin,
	options: ApiSceneDataSourceOptions = {},
): AddonExplorerDataSource {
	let flatNodes: readonly TreeNode<ApiSceneNodeMeta>[] = [];

	const publisherView = (): ApiScenePublisherView | undefined => {
		const pub = plugin.sasiCommandPublisher;
		return {
			isPublished: (id) => {
				if (plugin.settings.sasiPublishedCommands && id in plugin.settings.sasiPublishedCommands) {
					return plugin.settings.sasiPublishedCommands[id];
				}
				if (pub?.isPublishable(id)) return pub.isPublished(id);
				return true;
			},
			snapshot: () => pub?.snapshot() ?? [],
			isPublishable: (_id) => true,
		};
	};

	const projectRowChildren = (
		children: TreeNode<ApiSceneNodeMeta>[] | undefined,
		cTime?: number,
		mTime?: number,
	): TreeNode<PluginMeta>[] | undefined => {
		if (!children || children.length === 0) return undefined;
		return children.map((ch) => ({
			...ch,
			children: projectRowChildren(ch.children, cTime, mTime),
			showCaret: Boolean(ch.children?.length),
			ctimeText: formatAddonTimestamp(cTime),
			mtimeText: formatAddonTimestamp(mTime),
			label: translate(ch.meta?.labelKey ?? '') || ch.label,
			cells: ch.cells?.map((cell) =>
				'label' in cell
					? { ...cell, id: cell.id === PUBLISH_CELL_ID ? 'state' : cell.id, label: translate(cell.label) || cell.label }
					: cell,
			),
			meta: {
				...ch.meta,
				pluginId: ch.id,
				name: ch.label,
				enabled: ch.meta?.published ?? false,
				loaded: false,
				isVaultman: false,
				installedTime: cTime,
				updatedTime: mTime,
			},
		}));
	};

	const getNodes = (): TreeNode<PluginMeta>[] => {
		const instances = plugin.settings.instanceRegistry;
		const view = publisherView();
		const provided = listObsidianCommands(plugin.app);
		const manifests = (plugin.app as any).plugins?.manifests;
		const communityPluginNames: Record<string, string> = {};
		if (manifests) {
			for (const [id, m] of Object.entries(manifests)) {
				if (m && typeof (m as any).name === 'string') {
					communityPluginNames[id] = (m as any).name;
				}
			}
		}

		const rawNodes = buildApiSceneNodes(
			plugin.sasiRegistry,
			view,
			instances,
			{
				customCommands: plugin.settings.sasiCustomCommands,
				customScopes: plugin.settings.sasiCommandCustomScopes,
				customNames: plugin.settings.sasiCommandCustomNames,
				providedCommands: provided,
				communityPluginNames,
			},
		);
		flatNodes = flattenApiSceneNodes(rawNodes);

		const mapped = rawNodes.map((node) => {
			const lifecycle = plugin.sasiProvider.lifecycleFor(node.meta.sasiId);
			const instance = node.meta.group === 'instance' ? instances?.instances[node.meta.sasiId] : undefined;
			const createdAt = instance?.createdAt ?? lifecycle?.createdAt;
			const updatedAt = instance?.lastActiveAt ?? lifecycle?.updatedAt;
			return {
				...node,
				children: projectRowChildren(node.children, createdAt, updatedAt),
				showCaret: Boolean(node.children?.length),
				ctimeText: formatAddonTimestamp(createdAt),
				mtimeText: formatAddonTimestamp(updatedAt),
				label: translate(node.meta.labelKey) || node.label,
				cells: node.cells?.map((cell) =>
					'label' in cell
						? { ...cell, id: cell.id === PUBLISH_CELL_ID ? 'state' : cell.id, label: translate(cell.label) || cell.label }
						: cell,
				),
				meta: {
					...node.meta,
					pluginId: node.id,
					name: node.label,
					enabled: node.meta.published,
					loaded: false,
					isVaultman: false,
					installedTime: createdAt,
					updatedTime: updatedAt,
				},
			};
		});

		return nestApiScenePluginKinds(mapped);
	};

	const handleCell = (rowId: string, cellId: string, refresh?: () => void) => {
		if (cellId !== PUBLISH_CELL_ID && cellId !== 'state') return;
		const node = flatNodes.find((leaf) => leaf.id === rowId);
		if (!node || !node.meta.publishable) return;
		const next = !node.meta.published;
		node.meta.published = next;
		if (plugin.sasiCommandPublisher?.isPublishable(node.meta.sasiId)) {
			plugin.sasiCommandPublisher.setPublished(node.meta.sasiId, next);
		}
		if (!plugin.settings.sasiPublishedCommands) {
			plugin.settings.sasiPublishedCommands = {};
		}
		plugin.settings.sasiPublishedCommands[node.meta.sasiId] = next;
		void plugin.saveData(plugin.settings);
		refreshCommandPaletteCache(plugin.app);
		refresh?.();
	};

	const promptCreateCommand = async (
		steps: TreeNode<ApiSceneNodeMeta>[],
		selectedIds: ReadonlySet<string>,
		refresh?: () => void,
	) => {
		if (steps.length === 0) return;
		const stepIds = steps.map((a) => a.meta.sasiId);
		const defaultName = steps.map((a) => translate(a.meta.labelKey) || a.label).join(' + ');

		let detectedScope: string | undefined = undefined;
		for (const selId of selectedIds) {
			const candidate = flatNodes.find((c) => c.id === selId);
			if (candidate) {
				if (candidate.meta.group.startsWith('scope')) {
					detectedScope = candidate.meta.sasiId;
					break;
				} else if (candidate.meta.group === 'instance') {
					detectedScope = 'instance:' + candidate.meta.sasiId;
					break;
				}
			}
		}

		const chosenName = await showInputModal(
			plugin.app,
			translate('sasi.apiscene.create_command.title') || 'Crear comando',
			{
				initialValue: defaultName,
				placeholder: translate('sasi.apiscene.create_command.placeholder') || 'Nombre del comando...',
			},
		);

		if (!chosenName || chosenName.trim() === '') return;

		const commandName = chosenName.trim();
		const commandId = 'custom-' + Date.now();
		const scope = detectedScope ?? 'workspace:last_focused';

		plugin.sasiCommandPublisher?.register({
			id: commandId,
			name: commandName,
			composes: stepIds,
			handler: async () => {
				for (const stepId of stepIds) {
					if (executeObsidianCommand(plugin.app, stepId)) {
						continue;
					}
					await plugin.invokeActionById(stepId, scope);
				}
			},
		});
		plugin.sasiCommandPublisher?.setPublished(commandId, true);

		if (!plugin.settings.sasiCustomCommands) {
			plugin.settings.sasiCustomCommands = {};
		}
		plugin.settings.sasiCustomCommands[commandId] = {
			id: commandId,
			name: commandName,
			composes: stepIds,
			scope,
		};
		await plugin.saveData(plugin.settings);
		refresh?.();
		new Notice(translate('sasi.apiscene.command_created') || 'Comando creado con éxito');
	};

	const promptRenameCommand = async (
		node: TreeNode<PluginMeta>,
		refresh?: () => void,
	) => {
		const sasiId = (node.meta as unknown as ApiSceneNodeMeta)?.sasiId ?? node.id;
		const currentName = node.label;

		const newName = await showInputModal(
			plugin.app,
			translate('sasi.apiscene.rename_command.title') || translate('group.row.rename') || 'Renombrar comando',
			{
				initialValue: currentName,
				placeholder: currentName,
			},
		);

		if (!newName || newName.trim() === '' || newName.trim() === currentName) return;

		const trimmed = newName.trim();
		plugin.sasiCommandPublisher?.rename(sasiId, trimmed);

		if (!plugin.settings.sasiCommandCustomNames) {
			plugin.settings.sasiCommandCustomNames = {};
		}
		plugin.settings.sasiCommandCustomNames[sasiId] = trimmed;
		if (plugin.settings.sasiCustomCommands?.[sasiId]) {
			plugin.settings.sasiCustomCommands[sasiId].name = trimmed;
		}
		await plugin.saveData(plugin.settings);
		refresh?.();
		new Notice(translate('sasi.apiscene.command_renamed') || 'Comando renombrado');
	};

	const promptChangeScope = async (
		commandId: string,
		refresh?: () => void,
	) => {
		const currentScope =
			plugin.settings.sasiCommandCustomScopes?.[commandId] ??
			plugin.settings.sasiCustomCommands?.[commandId]?.scope ??
			'workspace:last_focused';

		const newScope = await showInputModal(
			plugin.app,
			translate('sasi.apiscene.cmenu.change_scope') || 'Cambiar ámbito',
			{
				initialValue: currentScope,
				placeholder: 'workspace:all, workspace:last_focused, surface:..., instance:...',
			},
		);

		if (!newScope || newScope.trim() === '' || newScope.trim() === currentScope) return;

		const trimmed = newScope.trim();
		if (!plugin.settings.sasiCommandCustomScopes) {
			plugin.settings.sasiCommandCustomScopes = {};
		}
		plugin.settings.sasiCommandCustomScopes[commandId] = trimmed;
		if (plugin.settings.sasiCustomCommands?.[commandId]) {
			plugin.settings.sasiCustomCommands[commandId].scope = trimmed;
		}
		await plugin.saveData(plugin.settings);
		refresh?.();
		new Notice(translate('sasi.apiscene.cmenu.change_scope') + ': ' + trimmed);
	};

	const promptRenameInstance = async (
		instanceId: string,
		refresh?: () => void,
	) => {
		const registry = plugin.settings.instanceRegistry;
		const record = registry?.instances[instanceId];
		const currentName = record?.cell_name || record?.id || instanceId;

		const newName = await showInputModal(
			plugin.app,
			translate('sasi.apiscene.instance.rename') || 'Renombrar instancia',
			{
				initialValue: currentName,
				placeholder: instanceId,
			},
		);

		if (newName === null || newName === undefined || newName.trim() === '' || newName.trim() === currentName) return;

		const trimmed = newName.trim();
		const next = setInstanceCellName(plugin.settings.instanceRegistry!, instanceId, trimmed);
		plugin.settings.instanceRegistry = next;
		await plugin.saveSettings();
		refresh?.();
		new Notice(`${translate('sasi.apiscene.instance.rename')}: ${trimmed || instanceId}`);
	};

	const handleRelocateInstance = async (
		instanceId: string,
		target: 'left-sidebar' | 'right-sidebar' | 'main-leaf',
		refresh?: () => void,
	) => {
		await plugin.relocateWorkspaceInstance(instanceId, target);
		refresh?.();
	};

	return {
		providerId: 'sasi',
		groups: buildApiSceneGroups(),
		memberships: () => apiSceneMemberships(flatNodes),
		nodes: getNodes,
		urnOf: (node: TreeNode<PluginMeta>) => flatNodes.find((row) => row.id === entityIdOf(node))?.meta.urn ?? '',
		activate: (id: string) => {
			const node = flatNodes.find((n) => n.id === id || n.meta.sasiId === id);
			if (node && (node.meta.group === 'instance' || node.meta.subgroup === 'scope.instances')) {
				const instanceId = node.meta.sasiId.replace(/^instance:/, '');
				void plugin.openWorkspaceInstance(instanceId);
				options.onClose?.();
			}
		},
		cell: (id: string, cellId: string) => handleCell(id, cellId),
		toggleGroup: (_groupId: string, memberIds?: readonly string[]) => {
			const targetNodes = memberIds?.length
				? flatNodes.filter(
						(n) => (memberIds.includes(n.id) || (n.meta?.sasiId && memberIds.includes(n.meta.sasiId))) && n.meta.publishable,
				  )
				: flatNodes.filter((n) => n.meta.publishable);
			if (targetNodes.length === 0) return;
			const targetEnabled = resolveGroupToggleTarget(
				targetNodes.map((n) => n.meta.published),
			);
			for (const sel of targetNodes) {
				sel.meta.published = targetEnabled;
				if (plugin.sasiCommandPublisher?.isPublishable(sel.meta.sasiId)) {
					plugin.sasiCommandPublisher.setPublished(sel.meta.sasiId, targetEnabled);
				}
				if (!plugin.settings.sasiPublishedCommands) {
					plugin.settings.sasiPublishedCommands = {};
				}
				plugin.settings.sasiPublishedCommands[sel.meta.sasiId] = targetEnabled;
			}
			void plugin.saveData(plugin.settings);
			refreshCommandPaletteCache(plugin.app);
		},
		tooltip: (node: TreeNode<PluginMeta>) => {
			const meta = node.meta as unknown as ApiSceneNodeMeta;
			if (meta?.group === 'instance' || meta?.subgroup === 'scope.instances') {
				return `${meta.cell_name || meta.sasiId} (${meta.sasiId})`;
			}
			return translate(node.meta.name) || node.label;
		},
		contextMenu: (node: TreeNode<PluginMeta>, event: MouseEvent, selectedIds: ReadonlySet<string>) => {
			const rawMeta = node.meta as unknown as ApiSceneNodeMeta;
			const group = rawMeta?.group;
			const menu = new Menu();

			// 1. Actions / Commands cmenu: create command or compound command
			if (group === 'action' || group === 'command') {
				const selectedSteps: TreeNode<ApiSceneNodeMeta>[] = [];
				for (const selId of selectedIds) {
					const row = flatNodes.find((c) => c.id === selId);
					if (row && (row.meta.group === 'action' || (row.meta.group === 'command' && row.typeText !== 'node_group'))) {
						selectedSteps.push(row);
					}
				}
				if (selectedSteps.length === 0) {
					const clicked = flatNodes.find((c) => c.id === node.id);
					if (clicked && clicked.typeText !== 'node_group') selectedSteps.push(clicked);
				}
				if (selectedSteps.length > 0) {
					const isMultiple = selectedSteps.length > 1;
					const title = isMultiple
						? (translate('sasi.apiscene.cmenu.create_compound_command') || 'Crear comando único con seleccionados')
						: (translate('sasi.apiscene.cmenu.create_command') || 'Crear comando');
					menu.addItem((item) => {
						item
							.setTitle(title)
							.setIcon('lucide-plus-circle')
							.onClick(() => {
								void promptCreateCommand(selectedSteps, selectedIds);
							});
					});
				}
			}

			// 2. Command cmenu: rename, toggle publish, bulk toggle publish
			if (group?.startsWith('command') && node.typeText !== 'node_group') {
				menu.addItem((item) => {
					item
						.setTitle(translate('sasi.apiscene.cmenu.rename') || 'Renombrar')
						.setIcon('lucide-edit-3')
						.onClick(() => {
							void promptRenameCommand(node);
						});
				});
				menu.addItem((item) => {
					item
						.setTitle(translate('sasi.apiscene.cmenu.toggle_publish') || 'Alternar publicación')
						.setIcon('lucide-toggle-right')
						.onClick(() => {
							handleCell(node.id, PUBLISH_CELL_ID);
						});
				});
				if (selectedIds.size > 1) {
					menu.addItem((item) => {
						item
							.setTitle(translate('sasi.apiscene.cmenu.toggle_selected') || 'Alternar publicación de seleccionados')
							.setIcon('lucide-check-square')
							.onClick(() => {
								const selectedNodes = flatNodes.filter(
									(n) => selectedIds.has(n.id) && n.meta.publishable,
								);
								const targetEnabled = resolveGroupToggleTarget(
									selectedNodes.map((n) => n.meta.published),
								);
								for (const sel of selectedNodes) {
									sel.meta.published = targetEnabled;
									if (plugin.sasiCommandPublisher?.isPublishable(sel.meta.sasiId)) {
										plugin.sasiCommandPublisher.setPublished(sel.meta.sasiId, targetEnabled);
									}
									if (!plugin.settings.sasiPublishedCommands) {
										plugin.settings.sasiPublishedCommands = {};
									}
									plugin.settings.sasiPublishedCommands[sel.meta.sasiId] = targetEnabled;
								}
								void plugin.saveData(plugin.settings);
								refreshCommandPaletteCache(plugin.app);
							});
					});
				}
				menu.showAtMouseEvent(event);
				return true;
			}

			// 3. Scope group / node cmenu: change scope
			if (group?.startsWith('scope') || rawMeta?.commandId) {
				const cmdId = rawMeta?.commandId ?? (node.id.split(':').slice(2, 3)[0]);
				if (cmdId) {
					menu.addItem((item) => {
						item
							.setTitle(translate('sasi.apiscene.cmenu.change_scope') || 'Cambiar ámbito')
							.setIcon('lucide-crosshair')
							.onClick(() => {
								void promptChangeScope(cmdId);
							});
					});
					if (
						cmdId === 'toggle-expansion' ||
						cmdId === 'vaultman.toolbar.toggleExpansion' ||
						node.id.includes('toggleExpansion') ||
						node.id.includes('toggle-expansion')
					) {
						const isAnchored = Boolean(plugin.settings.sasiAnchorScope);
						menu.addItem((item) => {
							item
								.setTitle(translate('sasi.apiscene.cmenu.anchor_scope') || 'Anchor scope')
								.setIcon('lucide-anchor')
								.setChecked(isAnchored)
								.onClick(() => {
									plugin.settings.sasiAnchorScope = !isAnchored;
									void plugin.saveData(plugin.settings);
									new Notice(
										(translate('sasi.apiscene.cmenu.anchor_scope') || 'Anchor scope') +
											': ' +
											(!isAnchored ? 'ON' : 'OFF'),
									);
								});
						});
					}
					menu.showAtMouseEvent(event);
					return true;
				}
			}

			// 4. Instance cmenu: rename, relocate, open
			if (group === 'instance' || rawMeta?.subgroup === 'scope.instances') {
				const instId = rawMeta.sasiId.replace(/^instance:/, '');
				menu.addItem((item) => {
					item
						.setTitle(translate('sasi.apiscene.instance.rename') || 'Renombrar instancia')
						.setIcon('lucide-edit-3')
						.onClick(() => {
							void promptRenameInstance(instId);
						});
				});
				menu.addItem((item) => {
					item
						.setTitle(translate('sasi.apiscene.instance.open') || 'Abrir / Enfocar')
						.setIcon('lucide-external-link')
						.onClick(() => {
							void plugin.openWorkspaceInstance(instId);
							options.onClose?.();
						});
				});
				menu.addItem((item) => {
					item.setTitle(translate('sasi.apiscene.instance.relocate') || 'Cambiar ubicación');
					const sub = (item as any).setSubmenu ? (item as any).setSubmenu() : menu;
					sub.addItem((subItem: any) => {
						subItem.setTitle('Left sidebar').onClick(() => {
							void handleRelocateInstance(instId, 'left-sidebar');
						});
					});
					sub.addItem((subItem: any) => {
						subItem.setTitle('Right sidebar').onClick(() => {
							void handleRelocateInstance(instId, 'right-sidebar');
						});
					});
					sub.addItem((subItem: any) => {
						subItem.setTitle('Main leaf').onClick(() => {
							void handleRelocateInstance(instId, 'main-leaf');
						});
					});
				});
				menu.showAtMouseEvent(event);
				return true;
			}

			return false;
		},
	};
}
