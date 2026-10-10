import type { SasiDef } from './logicSasiRegistry';
import {
	API_SCENE_IDENTITY_KIND,
	apiSceneUrnFor,
	type ApiSceneNodeMeta,
	type ApiScenePublisherEntry,
	type ApiScenePublisherView,
} from './logicApiSceneModel';
import { toApiSceneNode } from './logicApiSceneNodeFactory';
import type { TreeNode } from '../types/typeTree';

interface CommandNodeContext {
	out: TreeNode<ApiSceneNodeMeta>[];
	publisher: ApiScenePublisherView | undefined;
	snapshotIds: ReadonlySet<string>;
}

interface CommandNodeSpec {
	id: string;
	label: string;
	supports: readonly string[];
	composes: readonly string[];
	icon?: string;
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
	'toggle-expansion': ['toggle-expansion'],
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
};

const COMMAND_SCOPE_MAP: Record<string, string> = {
	'apply-queue': 'workspace:all',
	open: 'workspace:last_focused',
	'open-updates': 'workspace:all',
	'focus-content-search': 'workspace:last_focused',
	'focus-active-explorer-search': 'workspace:last_focused',
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
	'toggle-expansion': 'scene:depth_scope',
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
};

function resolveScopeForCommand(id: string): string {
	if (COMMAND_SCOPE_MAP[id]) return COMMAND_SCOPE_MAP[id];
	if (id.startsWith('sasi.hover.')) {
		const parts = id.split('.');
		return parts[2] ? 'surface:' + parts[2] : 'workspace:all';
	}
	if (id.startsWith('sasi.scene.engine.')) {
		const parts = id.split('.');
		return parts[3] ? 'surface:' + parts[3] : 'surface:main';
	}
	if (id.startsWith('vaultman.scene.goto.')) {
		return 'workspace:last_focused';
	}
	return 'workspace:last_focused';
}

function appendCommandNode(
	context: CommandNodeContext,
	spec: CommandNodeSpec,
): void {
	const cmdScope = resolveScopeForCommand(spec.id);
	const actionIds =
		spec.composes && spec.composes.length > 0
			? spec.composes
			: COMMAND_ACTIONS_MAP[spec.id] ?? [spec.id];

	const children: TreeNode<ApiSceneNodeMeta>[] = [];

	for (const actionId of actionIds) {
		const actionScope = COMMAND_SCOPE_MAP[actionId] ?? cmdScope;
		const actionChild: TreeNode<ApiSceneNodeMeta> = {
			id: `sasi:command:${spec.id}:action:${actionId}`,
			label: actionId,
			icon: 'lucide-zap',
			typeText: 'action',
			depth: 1,
			showCaret: true,
			meta: {
				identityKind: API_SCENE_IDENTITY_KIND,
				urn: apiSceneUrnFor(`command:${spec.id}:action:${actionId}`, actionId),
				group: 'action',
				sasiId: actionId,
				labelKey: actionId,
				sasiKind: 'action',
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
			children: [
				{
					id: `sasi:command:${spec.id}:action:${actionId}:scope`,
					label: `scope: ${actionScope}`,
					icon: 'lucide-crosshair',
					typeText: 'scope',
					depth: 2,
					meta: {
						identityKind: API_SCENE_IDENTITY_KIND,
						urn: apiSceneUrnFor(
							`command:${spec.id}:action:${actionId}:scope`,
							actionScope,
						),
						group: 'scope',
						sasiId: actionScope,
						labelKey: actionScope,
						sasiKind: null,
						supports: [],
						composes: [],
						mutatesVault: false,
						publishable: false,
						published: false,
					},
				},
			],
		};
		children.push(actionChild);
	}

	children.push({
		id: `sasi:command:${spec.id}:scope`,
		label: `scope: ${cmdScope}`,
		icon: 'lucide-target',
		typeText: 'scope',
		depth: 1,
		meta: {
			identityKind: API_SCENE_IDENTITY_KIND,
			urn: apiSceneUrnFor(`command:${spec.id}:scope`, cmdScope),
			group: 'scope',
			sasiId: cmdScope,
			labelKey: cmdScope,
			sasiKind: null,
			supports: [],
			composes: [],
			mutatesVault: false,
			publishable: false,
			published: false,
		},
	});

	const node = toApiSceneNode({
		spec: {
			group: 'command',
			rowId: `sasi:command:${spec.id}`,
			canonicalId: `command:${spec.id}`,
			sasiId: spec.id,
			label: spec.label,
			labelKey: spec.label,
			...(spec.icon ? { icon: spec.icon } : {}),
			sasiKind: 'command',
			supports: spec.supports,
			composes: spec.composes,
			mutatesVault: false,
		},
		publisher: context.publisher,
		snapshotIds: context.snapshotIds,
		isCommand: true,
	});

	node.children = children;
	node.showCaret = children.length > 0;
	context.out.push(node);
}

export interface ApiSceneCommandRowsInput {
	out: TreeNode<ApiSceneNodeMeta>[];
	registryCommands: readonly SasiDef[];
	publisherEntries: readonly ApiScenePublisherEntry[];
	publisher: ApiScenePublisherView | undefined;
	snapshotIds: ReadonlySet<string>;
}

export function appendApiSceneCommandNodes({
	out,
	registryCommands,
	publisherEntries,
	publisher,
	snapshotIds,
}: ApiSceneCommandRowsInput): void {
	const descriptors = new Map(
		publisherEntries.map((entry) => [entry.id, entry] as const),
	);
	const projectedIds = new Set<string>();

	for (const def of registryCommands) {
		const descriptor = descriptors.get(def.id);
		projectedIds.add(def.id);
		appendCommandNode(
			{ out, publisher, snapshotIds },
			{
				id: def.id,
				label: descriptor?.descriptor?.name ?? def.labelKey,
				supports: def.supports.map((support) => support.surface),
				composes: def.composes ?? [],
				...(def.icon ? { icon: def.icon } : {}),
			},
		);
	}

	for (const entry of publisherEntries) {
		if (projectedIds.has(entry.id)) continue;
		appendCommandNode(
			{ out, publisher, snapshotIds },
			{
				id: entry.id,
				label: entry.descriptor?.name ?? entry.id,
				supports: [],
				composes:
					(entry.descriptor as { composes?: readonly string[] } | undefined)
						?.composes ?? [],
			},
		);
	}
}
