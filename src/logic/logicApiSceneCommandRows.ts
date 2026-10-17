import type { SasiCompatibility, SasiDef } from './logicSasiRegistry';
import {
	apiSceneUrnFor,
	type ApiSceneNodeMeta,
	type ApiScenePublisherEntry,
	type ApiScenePublisherView,
} from './logicApiSceneModel';
import { toApiSceneNode } from './logicApiSceneNodeFactory';
import type { TreeNode } from '../types/typeTree';
import {
	TOOLBAR_SCENE_MENU_ID,
	TOOLBAR_SORT_MENU_ID,
	TOOLBAR_TOGGLE_EXPANSION_ID,
	TOOLBAR_VIEW_MENU_ID,
} from './logicSasiToolbarActions';
import {
	FILTER_QUEUE_ACTIONS,
} from './logicSasiFilterQueueActions';

interface CommandNodeContext {
	publisher: ApiScenePublisherView | undefined;
	snapshotIds: ReadonlySet<string>;
	customScopes?: Record<string, string>;
	customNames?: Record<string, string>;
	allCommandIds?: ReadonlySet<string>;
}

interface CommandNodeSpec {
	id: string;
	label: string;
	groupKind: 'command.vaultman' | 'command.custom';
	supports: readonly string[];
	composes: readonly string[];
	compatibility?: SasiCompatibility;
	icon?: string;
	depth?: number;
}

const COMMAND_ACTIONS_MAP: Record<string, readonly string[]> = {
	'apply-queue': ['vaultman.queue.execute'],
	open: ['vaultman.workspace.activate'],
	'open-updates': ['vaultman.updates.open'],
	'focus-content-search': ['vaultman.search.focus-content'],
	'focus-active-explorer-search': ['vaultman.search.focus-explorer'],
	'sasi.hover.left-sidebar.hover': ['vaultman.hover.left-sidebar.hover'],
	'sasi.hover.left-sidebar.pin': ['vaultman.hover.left-sidebar.pin'],
	'sasi.hover.left-sidebar.hide': ['vaultman.hover.left-sidebar.hide'],
	'sasi.hover.right-sidebar.hover': ['vaultman.hover.right-sidebar.hover'],
	'sasi.hover.right-sidebar.pin': ['vaultman.hover.right-sidebar.pin'],
	'sasi.hover.right-sidebar.hide': ['vaultman.hover.right-sidebar.hide'],
	'sasi.hover.main.hover': ['vaultman.hover.main.hover'],
	'sasi.hover.main.pin': ['vaultman.hover.main.pin'],
	'sasi.hover.main.hide': ['vaultman.hover.main.hide'],
	'sasi.hover.lock': ['vaultman.hover.lock'],
	'sasi.hover.nested-ribbon': ['vaultman.hover.nested-ribbon'],
	'open-settings': ['vaultman.settings.open'],
	'reveal-active-file': ['reveal-active-file'],
	[TOOLBAR_TOGGLE_EXPANSION_ID]: [TOOLBAR_TOGGLE_EXPANSION_ID],
	'toggle-expansion': [TOOLBAR_TOGGLE_EXPANSION_ID],
	[TOOLBAR_SCENE_MENU_ID]: [TOOLBAR_SCENE_MENU_ID],
	[TOOLBAR_VIEW_MENU_ID]: [TOOLBAR_VIEW_MENU_ID],
	[TOOLBAR_SORT_MENU_ID]: [TOOLBAR_SORT_MENU_ID],
	scene_menu: [TOOLBAR_SCENE_MENU_ID],
	view_menu: [TOOLBAR_VIEW_MENU_ID],
	sort_menu: [TOOLBAR_SORT_MENU_ID],
	tabs: [TOOLBAR_SCENE_MENU_ID],
	view: [TOOLBAR_VIEW_MENU_ID],
	sort: [TOOLBAR_SORT_MENU_ID],
	searchbox: ['searchbox'],
	'cycle-category': ['cycle-category'],
	'create-target': ['create-target'],
	check_plugin_updates: ['check_plugin_updates'],
	update_all_plugins: ['update_all_plugins'],
	browse_community_plugins: ['browse_community_plugins'],
	open_restricted_mode: ['open_restricted_mode'],
	go_to_setting_scene: ['vaultman.scene.goto.plugins'],
	'props.add_property': [
		'vaultman.scene.goto.props',
		'reveal-active-file',
		'props.add_property',
	],
	'open-filter-scene': ['vaultman.scene.goto.files'],
	'open-queue': ['vaultman.queue.open'],
	'open-api-scene': ['vaultman.scene.goto.apiscene'],
	'vaultman.scene.goto.apiscene': ['vaultman.scene.goto.apiscene'],
	'vaultman.scene.goto.files': ['vaultman.scene.goto.files'],
	'vaultman.scene.goto.props': ['vaultman.scene.goto.props'],
	'vaultman.scene.goto.tags': ['vaultman.scene.goto.tags'],
	'vaultman.scene.goto.content': ['vaultman.scene.goto.content'],
	'vaultman.scene.goto.snippets': ['vaultman.scene.goto.snippets'],
	'vaultman.scene.goto.plugins': ['vaultman.scene.goto.plugins'],
	'change-engine-tree': ['vaultman.scene.engine.tree'],
	'change-engine-cards': ['vaultman.scene.engine.cards'],
	'change-engine-table': ['vaultman.scene.engine.table'],
	...Object.fromEntries(
		FILTER_QUEUE_ACTIONS.map((action) => [action.id, [action.id]]),
	),
};

const COMMAND_SCOPE_MAP: Record<string, string> = {
	'apply-queue': 'workspace:all',
	open: 'workspace:last_focused',
	'open-updates': 'workspace:all',
	'focus-content-search': 'workspace:last_focused',
	'focus-active-explorer-search': 'workspace:last_focused',
	// U200-L4: scoped panel moves + maximize. Mismo default que los colegas
	// (`workspace:last_focused`); el usuario lo edita por comando y el cambio
	// decide que objetos se ven afectados (ver `resolveScopedFocus`).
	'vaultman.move.tabLeftInGroup': 'workspace:last_focused',
	'vaultman.move.tabRightInGroup': 'workspace:last_focused',
	'vaultman.move.tabToStartOfGroup': 'workspace:last_focused',
	'vaultman.move.tabToEndOfGroup': 'workspace:last_focused',
	'vaultman.move.tabToPreviousGroup': 'workspace:last_focused',
	'vaultman.move.tabToNextGroup': 'workspace:last_focused',
	'vaultman.move.tabToFirstGroup': 'workspace:last_focused',
	'vaultman.move.tabToLastGroup': 'workspace:last_focused',
	'vaultman.move.tabToLeftGroup': 'workspace:last_focused',
	'vaultman.move.tabToRightGroup': 'workspace:last_focused',
	'vaultman.move.tabToAboveGroup': 'workspace:last_focused',
	'vaultman.move.tabToBelowGroup': 'workspace:last_focused',
	// U200-L5 (tabs-2): movimientos entre superficies. El alcance honesto es
	// la fuente (el panel enfocado en su superficie actual); el destino lo
	// fija la accion (`→surface:X` en `SasiCompatibility.target`).
	'vaultman.move.tabToLeftSidebar': 'surface_panel:current',
	'vaultman.move.tabToRightSidebar': 'surface_panel:current',
	'vaultman.move.tabToMainLeaf': 'surface_panel:current',
	'vaultman.move.groupLeft': 'workspace:last_focused',
	'vaultman.move.groupRight': 'workspace:last_focused',
	'vaultman.move.groupUp': 'workspace:last_focused',
	'vaultman.move.groupDown': 'workspace:last_focused',
	'vaultman.move.columnLeft': 'workspace:last_focused',
	'vaultman.move.columnRight': 'workspace:last_focused',
	'vaultman.move.rowUp': 'workspace:last_focused',
	'vaultman.move.rowDown': 'workspace:last_focused',
	'vaultman.toolbar.toggleMaximize': 'workspace:last_focused',
	'sasi.hover.left-sidebar.hover': 'surface:left-sidebar',
	'sasi.hover.left-sidebar.pin': 'surface:left-sidebar',
	'sasi.hover.left-sidebar.hide': 'surface:left-sidebar',
	'sasi.hover.right-sidebar.hover': 'surface:right-sidebar',
	'sasi.hover.right-sidebar.pin': 'surface:right-sidebar',
	'sasi.hover.right-sidebar.hide': 'surface:right-sidebar',
	'sasi.hover.main.hover': 'surface:main',
	'sasi.hover.main.pin': 'surface:main',
	'sasi.hover.main.hide': 'surface:main',
	'sasi.hover.lock': 'workspace:all',
	'sasi.hover.nested-ribbon': 'workspace:all',
	'open-settings': 'workspace:all',
	'reveal-active-file': 'scene:depth_scope',
	[TOOLBAR_TOGGLE_EXPANSION_ID]: 'this.scene -> {scope_depth}',
	'toggle-expansion': 'this.scene -> {scope_depth}',
	[TOOLBAR_SCENE_MENU_ID]: 'this.scene -> this.node',
	[TOOLBAR_VIEW_MENU_ID]: 'this.scene -> this.node',
	[TOOLBAR_SORT_MENU_ID]: 'this.scene -> this.node',
	scene_menu: 'this.scene -> this.node',
	view_menu: 'this.scene -> this.node',
	sort_menu: 'this.scene -> this.node',
	tabs: 'this.scene -> this.node',
	view: 'this.scene -> this.node',
	sort: 'this.scene -> this.node',
	searchbox: 'scene:depth_scope',
	'cycle-category': 'workspace:last_focused',
	'create-target': 'workspace:last_focused',
	check_plugin_updates: 'workspace:all',
	update_all_plugins: 'workspace:all',
	browse_community_plugins: 'workspace:all',
	open_restricted_mode: 'workspace:all',
	go_to_setting_scene: 'workspace:last_focused',
	'props.add_property': 'workspace:last_focused',
	'open-filter-scene': 'workspace:last_focused',
	'open-queue': 'workspace:all',
	'open-api-scene': 'workspace:all',
	'vaultman.scene.goto.apiscene': 'workspace:last_focused',
	'vaultman.scene.goto.files': 'workspace:last_focused',
	'vaultman.scene.goto.props': 'workspace:last_focused',
	'vaultman.scene.goto.tags': 'workspace:last_focused',
	'vaultman.scene.goto.content': 'workspace:last_focused',
	'vaultman.scene.goto.snippets': 'workspace:last_focused',
	'vaultman.scene.goto.plugins': 'workspace:last_focused',
	'change-engine-tree': 'last_focused-scene, +, last_focused-instance',
	'change-engine-cards': 'last_focused-scene, +, last_focused-instance',
	'change-engine-table': 'last_focused-scene, +, last_focused-instance',
	...Object.fromEntries(
		FILTER_QUEUE_ACTIONS.map((action) => [action.id, action.scope]),
	),
};

const CORE_PLUGIN_PREFIXES = new Set([
	'app',
	'workspace',
	'window',
	'editor',
	'file-explorer',
	'command-palette',
	'global-search',
	'switcher',
	'graph',
	'backlink',
	'canvas',
	'daily-notes',
	'templates',
	'note-composer',
	'outgoing-link',
	'tag-pane',
	'page-preview',
	'zk-prefixer',
	'random-note',
	'outline',
	'word-count',
	'slides',
	'audio-recorder',
	'workspaces',
	'file-recovery',
	'publish',
	'sync',
	'bookmarks',
	'properties',
	'theme',
	'markdown',
]);

function isSubCommandId(id: string, allCommandIds?: ReadonlySet<string>): boolean {
	if (
		id.startsWith('vaultman.scene.') ||
		id.startsWith('vaultman.workspace.') ||
		id.startsWith('vaultman.updates.') ||
		id.startsWith('vaultman.search.') ||
		id.startsWith('vaultman.hover.') ||
		id.startsWith('vaultman.queue.') ||
		id.startsWith('vaultman.move.') ||
		id.startsWith('vaultman.props.')
	) {
		return false;
	}
	if (allCommandIds?.has(id)) return true;
	if (id in COMMAND_ACTIONS_MAP || id in COMMAND_SCOPE_MAP) return true;
	if (id.startsWith('custom-')) return true;
	if (id.includes(':')) {
		const prefix = id.split(':')[0];
		if (CORE_PLUGIN_PREFIXES.has(prefix)) return true;
		return true;
	}
	return false;
}

function resolveScopeForCommand(
	id: string,
	customScopes?: Record<string, string>,
): string {
	if (customScopes && customScopes[id]) return customScopes[id];
	if (COMMAND_SCOPE_MAP[id]) return COMMAND_SCOPE_MAP[id];
	if (id.startsWith('sasi.hover.')) {
		const parts = id.split('.');
		return parts[2] ? 'surface:' + parts[2] : 'workspace:all';
	}
	if (id.startsWith('change-engine-')) {
		return 'last_focused-scene, +, last_focused-instance';
	}
	if (id.startsWith('vaultman.scene.goto.')) {
		return 'workspace:last_focused';
	}
	return 'workspace:last_focused';
}

function buildCompoundCommandNode(
	context: CommandNodeContext,
	spec: CommandNodeSpec,
): TreeNode<ApiSceneNodeMeta> {
	const depth = spec.depth ?? 1;
	const cmdScope = resolveScopeForCommand(spec.id, context.customScopes);
	const actionIds =
		spec.composes && spec.composes.length > 0
			? spec.composes
			: COMMAND_ACTIONS_MAP[spec.id] ?? [spec.id];

	const actionChildren: TreeNode<ApiSceneNodeMeta>[] = actionIds.map(
		(stepId) => {
			const isCmd = isSubCommandId(stepId, context.allCommandIds);
			if (isCmd) {
				const cmdLabel = context.customNames?.[stepId] ?? stepId;
				return {
					id: `sasi:command:${spec.id}:command:${stepId}`,
					label: cmdLabel,
					icon: 'lucide-terminal',
					typeText: 'command',
					depth: depth + 2,
					meta: {
						identityKind: 'node_commands',
						urn: apiSceneUrnFor(
							`command:${spec.id}:command:${stepId}`,
							cmdLabel,
							'node_commands',
						),
						group: 'command',
						sasiId: stepId,
						labelKey: cmdLabel,
						sasiKind: 'command',
						supports: [],
						composes: [],
						mutatesVault: false,
						publishable: false,
						published: false,
						commandId: spec.id,
					},
				};
			}

			return {
				id: `sasi:command:${spec.id}:action:${stepId}`,
				label: stepId,
				icon: 'lucide-zap',
				typeText: 'action',
				depth: depth + 2,
				meta: {
					identityKind: 'node_actions',
					urn: apiSceneUrnFor(
						`command:${spec.id}:action:${stepId}`,
						stepId,
						'node_actions',
					),
					group: 'action',
					sasiId: stepId,
					labelKey: stepId,
					sasiKind: 'action',
					supports: [],
					composes: [],
					mutatesVault: false,
					publishable: false,
					published: false,
					commandId: spec.id,
				},
			};
		},
	);

	const actionsGroupNode: TreeNode<ApiSceneNodeMeta> = {
		id: `sasi:command:${spec.id}:group:actions`,
		label: 'sasi.apiscene.command.actions_group',
		icon: 'lucide-folder',
		typeText: 'node_group',
		depth: depth + 1,
		showCaret: actionChildren.length > 0,
		children: actionChildren,
		meta: {
			identityKind: 'node_commands',
			urn: apiSceneUrnFor(
				`command:${spec.id}:group:actions`,
				'actions',
				'node_commands',
			),
			group: 'command',
			sasiId: `${spec.id}:actions`,
			labelKey: 'sasi.apiscene.command.actions_group',
			sasiKind: null,
			supports: [],
			composes: actionIds,
			mutatesVault: false,
			publishable: false,
			published: false,
			commandId: spec.id,
		},
	};

	const scopeChildNode: TreeNode<ApiSceneNodeMeta> = {
		id: `sasi:command:${spec.id}:scope:${cmdScope}`,
		label: `scope: ${cmdScope}`,
		icon: 'lucide-crosshair',
		typeText: 'scope',
		depth: depth + 2,
		meta: {
			identityKind: 'node_scopes',
			urn: apiSceneUrnFor(
				`command:${spec.id}:scope:${cmdScope}`,
				cmdScope,
				'node_scopes',
			),
			group: 'scope',
			sasiId: cmdScope,
			labelKey: cmdScope,
			sasiKind: null,
			supports: [],
			composes: [],
			mutatesVault: false,
			publishable: false,
			published: false,
			commandId: spec.id,
		},
	};

	const scopeGroupNode: TreeNode<ApiSceneNodeMeta> = {
		id: `sasi:command:${spec.id}:group:scope`,
		label: 'sasi.apiscene.command.scope_group',
		icon: 'lucide-folder',
		typeText: 'node_group',
		depth: depth + 1,
		showCaret: true,
		children: [scopeChildNode],
		meta: {
			identityKind: 'node_scopes',
			urn: apiSceneUrnFor(
				`command:${spec.id}:group:scope`,
				'scope',
				'node_scopes',
			),
			group: 'scope',
			sasiId: `${spec.id}:scope`,
			labelKey: 'sasi.apiscene.command.scope_group',
			sasiKind: null,
			supports: [],
			composes: [],
			mutatesVault: false,
			publishable: false,
			published: false,
			commandId: spec.id,
		},
	};

	const displayName = context.customNames?.[spec.id] ?? spec.label;

	const node = toApiSceneNode({
		spec: {
			group: 'command',
			rowId: `sasi:command:${spec.id}`,
			canonicalId: `command:${spec.id}`,
			sasiId: spec.id,
			label: displayName,
			labelKey: spec.label,
			...(spec.icon ? { icon: spec.icon } : {}),
			sasiKind: 'command',
			supports: spec.supports,
			composes: spec.composes,
			...(spec.compatibility ? { compatibility: spec.compatibility } : {}),
			mutatesVault: false,
			typeText:
				spec.groupKind === 'command.vaultman'
					? 'node_command_vaultman'
					: 'node_command_custom',
		},
		publisher: context.publisher,
		snapshotIds: context.snapshotIds,
		isCommand: true,
	});

	node.depth = depth;
	node.children = [actionsGroupNode, scopeGroupNode];
	node.showCaret = true;
	node.meta.commandId = spec.id;
	node.meta.subgroup = spec.groupKind;
	return node;
}

function buildProvidedCommandNode(
	context: CommandNodeContext,
	cmd: { id: string; name: string; icon?: string },
	depth = 2,
	subgroup = 'command.provided',
): TreeNode<ApiSceneNodeMeta> {
	const displayName = context.customNames?.[cmd.id] ?? cmd.name;
	const isPublished = context.publisher
		? context.publisher.isPublished(cmd.id)
		: true;

	const node = toApiSceneNode({
		spec: {
			group: 'command',
			rowId: `sasi:command:provided:${cmd.id}`,
			canonicalId: `command:${cmd.id}`,
			sasiId: cmd.id,
			label: displayName,
			labelKey: displayName,
			icon: cmd.icon ?? 'lucide-terminal',
			sasiKind: 'command',
			supports: [],
			composes: [],
			mutatesVault: false,
			typeText: 'node_command_provided',
		},
		publisher: context.publisher,
		snapshotIds: context.snapshotIds,
		isCommand: true,
	});

	node.depth = depth;
	node.showCaret = false;
	node.children = undefined;
	node.meta.publishable = true;
	node.meta.published = isPublished;
	node.cells = [
		{
			id: 'publish',
			kind: 'toggle',
			enabled: isPublished,
			style: 'native',
			label: isPublished
				? 'sasi.inspector.toggle.on'
				: 'sasi.inspector.toggle.off',
		},
	];
	node.meta.commandId = cmd.id;
	node.meta.subgroup = subgroup;
	return node;
}

export interface ApiSceneCommandRowsInput {
	out: TreeNode<ApiSceneNodeMeta>[];
	registryCommands: readonly SasiDef[];
	publisherEntries: readonly ApiScenePublisherEntry[];
	publisher: ApiScenePublisherView | undefined;
	snapshotIds: ReadonlySet<string>;
	customCommands?: Record<
		string,
		{ id: string; name: string; composes: readonly string[]; scope?: string }
	>;
	customScopes?: Record<string, string>;
	customNames?: Record<string, string>;
	providedCommands?: readonly { id: string; name: string; icon?: string }[];
	communityPluginNames?: Record<string, string>;
}

export function appendApiSceneCommandNodes({
	out,
	registryCommands,
	publisherEntries,
	publisher,
	snapshotIds,
	customCommands = {},
	customScopes = {},
	customNames = {},
	providedCommands = [],
	communityPluginNames = {},
}: ApiSceneCommandRowsInput): void {
	const allCommandIds = new Set<string>();
	for (const def of registryCommands) allCommandIds.add(def.id);
	for (const entry of publisherEntries) allCommandIds.add(entry.id);
	for (const id of Object.keys(customCommands)) allCommandIds.add(id);
	for (const prov of providedCommands) allCommandIds.add(prov.id);

	const descriptors = new Map(
		publisherEntries.map((entry) => [entry.id, entry] as const),
	);
	const projectedIds = new Set<string>();
	const context: CommandNodeContext = {
		publisher,
		snapshotIds,
		customScopes,
		customNames,
		allCommandIds,
	};

	// 1. Vaultman Default Commands
	const vaultmanNodes: TreeNode<ApiSceneNodeMeta>[] = [];

	for (const def of registryCommands) {
		if (customCommands[def.id]) continue;
		const descriptor = descriptors.get(def.id);
		projectedIds.add(def.id);
		vaultmanNodes.push(
			buildCompoundCommandNode(context, {
				id: def.id,
				label: descriptor?.descriptor?.name ?? def.labelKey,
				groupKind: 'command.vaultman',
				supports: def.supports.map((support) => support.surface),
				composes: def.composes ?? [],
				...(def.compatibility ? { compatibility: def.compatibility } : {}),
				...(def.icon ? { icon: def.icon } : {}),
				depth: 1,
			}),
		);
	}

	for (const entry of publisherEntries) {
		if (projectedIds.has(entry.id) || customCommands[entry.id]) continue;
		if (entry.id.startsWith('sasi.scene.engine.')) continue;

		projectedIds.add(entry.id);
		vaultmanNodes.push(
			buildCompoundCommandNode(context, {
				id: entry.id,
				label: entry.descriptor?.name ?? entry.id,
				groupKind: 'command.vaultman',
				supports: [],
				composes:
					(entry.descriptor)
						?.composes ?? [],
				depth: 1,
			}),
		);
	}

	// 2. Custom Commands
	const customNodes: TreeNode<ApiSceneNodeMeta>[] = [];
	for (const customCmd of Object.values(customCommands)) {
		projectedIds.add(customCmd.id);
		customNodes.push(
			buildCompoundCommandNode(context, {
				id: customCmd.id,
				label: customCmd.name,
				groupKind: 'command.custom',
				supports: [],
				composes: customCmd.composes ?? [],
				icon: 'lucide-sparkles',
				depth: 1,
			}),
		);
	}

	// 3. Provided Commands (Obsidian palette commands excluding vaultman/custom)
	const coreProvidedNodes: TreeNode<ApiSceneNodeMeta>[] = [];
	const communityProvidedMap = new Map<string, TreeNode<ApiSceneNodeMeta>[]>();

	for (const prov of providedCommands) {
		if (projectedIds.has(prov.id)) continue;
		projectedIds.add(prov.id);

		let pluginId = 'core';
		if (prov.id.includes(':')) {
			const prefix = prov.id.split(':')[0];
			if (!CORE_PLUGIN_PREFIXES.has(prefix)) {
				pluginId = prefix;
			}
		}

		if (pluginId === 'core') {
			coreProvidedNodes.push(
				buildProvidedCommandNode(context, prov, 2, 'command.provided.core'),
			);
		} else {
			let list = communityProvidedMap.get(pluginId);
			if (!list) {
				list = [];
				communityProvidedMap.set(pluginId, list);
			}
			list.push(
				buildProvidedCommandNode(
					context,
					prov,
					2,
					`command.provided.${pluginId}`,
				),
			);
		}
	}

	// Build Provided subgroups (level 0+3)
	const providedSubgroups: TreeNode<ApiSceneNodeMeta>[] = [];
	if (coreProvidedNodes.length > 0) {
		providedSubgroups.push({
			id: 'sasi:command:provided:subgroup:core',
			label: 'Obsidian',
			icon: 'lucide-app-window',
			typeText: 'node_group',
			depth: 1,
			showCaret: true,
			children: coreProvidedNodes,
			meta: {
				identityKind: 'node_commands',
				urn: apiSceneUrnFor(
					'command:provided:subgroup:core',
					'Obsidian',
					'node_commands',
				),
				group: 'command',
				subgroup: 'command.provided.core',
				sasiId: 'provided:core',
				labelKey: 'Obsidian',
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}

	for (const [pluginId, cmdNodes] of communityProvidedMap.entries()) {
		const pluginName =
			communityPluginNames[pluginId] ??
			pluginId.charAt(0).toUpperCase() + pluginId.slice(1);
		providedSubgroups.push({
			id: `sasi:command:provided:subgroup:${pluginId}`,
			label: pluginName,
			icon: 'lucide-puzzle',
			typeText: 'node_group',
			depth: 1,
			showCaret: true,
			children: cmdNodes,
			meta: {
				identityKind: 'node_commands',
				urn: apiSceneUrnFor(
					`command:provided:subgroup:${pluginId}`,
					pluginName,
					'node_commands',
				),
				group: 'command',
				subgroup: `command.provided.${pluginId}`,
				sasiId: `provided:${pluginId}`,
				labelKey: pluginName,
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}

	// 4. Wrap into Subsections (0+1: Vaultman, Custom, Provided)
	if (vaultmanNodes.length > 0) {
		out.push({
			id: 'sasi:command:subgroup:vaultman',
			label: 'Vaultman',
			icon: 'lucide-shield',
			typeText: 'node_group',
			depth: 0,
			showCaret: true,
			children: vaultmanNodes,
			meta: {
				identityKind: 'node_commands',
				urn: apiSceneUrnFor(
					'command:subgroup:vaultman',
					'Vaultman',
					'node_commands',
				),
				group: 'command',
				subgroup: 'command.vaultman',
				sasiId: 'subgroup:vaultman',
				labelKey: 'sasi.apiscene.commands.vaultman',
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}

	if (customNodes.length > 0) {
		out.push({
			id: 'sasi:command:subgroup:custom',
			label: 'Custom',
			icon: 'lucide-sparkles',
			typeText: 'node_group',
			depth: 0,
			showCaret: true,
			children: customNodes,
			meta: {
				identityKind: 'node_commands',
				urn: apiSceneUrnFor(
					'command:subgroup:custom',
					'Custom',
					'node_commands',
				),
				group: 'command',
				subgroup: 'command.custom',
				sasiId: 'subgroup:custom',
				labelKey: 'sasi.apiscene.commands.custom',
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}

	if (providedSubgroups.length > 0) {
		out.push({
			id: 'sasi:command:subgroup:provided',
			label: 'Provided',
			icon: 'lucide-terminal',
			typeText: 'node_group',
			depth: 0,
			showCaret: true,
			children: providedSubgroups,
			meta: {
				identityKind: 'node_commands',
				urn: apiSceneUrnFor(
					'command:subgroup:provided',
					'Provided',
					'node_commands',
				),
				group: 'command',
				subgroup: 'command.provided',
				sasiId: 'subgroup:provided',
				labelKey: 'sasi.apiscene.commands.provided',
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}
}

export function flattenApiSceneNodes(
	nodes: readonly TreeNode<ApiSceneNodeMeta>[],
): TreeNode<ApiSceneNodeMeta>[] {
	const out: TreeNode<ApiSceneNodeMeta>[] = [];
	function walk(n: TreeNode<ApiSceneNodeMeta>) {
		out.push(n);
		if (n.children) {
			for (const ch of n.children) walk(ch);
		}
	}
	for (const n of nodes) walk(n);
	return out;
}

export function findApiSceneNode(
	nodes: readonly TreeNode<ApiSceneNodeMeta>[],
	predicate: (node: TreeNode<ApiSceneNodeMeta>) => boolean,
): TreeNode<ApiSceneNodeMeta> | undefined {
	for (const node of nodes) {
		if (predicate(node)) return node;
		if (node.children) {
			const found = findApiSceneNode(node.children, predicate);
			if (found) return found;
		}
	}
	return undefined;
}
