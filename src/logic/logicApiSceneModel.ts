import type { NodeGroupDef } from './logicNodeGroup';
import { formatMembershipUrn } from './logicMembershipUrn';
import type {
	SasiCatalogKind,
	SasiCompatibility,
	SasiFunctionKind,
} from './logicSasiRegistry';

export const API_SCENE_PROVIDER_ID = 'sasi';
export const API_SCENE_IDENTITY_KIND = 'node_apis';
export const API_SCENE_GROUP_KIND = 'node_groups';
export const PUBLISH_CELL_ID = 'publish';

export type ApiSceneIdentityKind =
	| 'node_actions'
	| 'node_operations'
	| 'node_commands'
	| 'node_scopes'
	| 'node_kinds'
	| 'node_providers'
	| 'node_instances'
	| 'node_scenes'
	| 'node_surfaces'
	| 'node_apis'
	| 'node_inputs'
	| 'node_input_keyboard'
	| 'node_input_mouse';

export type ApiSceneGroupName =
	| 'action'
	| 'operation'
	| 'command'
	| 'input'
	| 'kind'
	| 'provider'
	| 'instance'
	| 'scene'
	| 'surface'
	| 'scope';

export const API_SCENE_GROUP_NAMES: readonly ApiSceneGroupName[] = [
	'action',
	'operation',
	'command',
	'input',
	'kind',
	'provider',
	'instance',
	'scene',
	'surface',
	'scope',
];

export const API_SCENE_GROUP_IDS: Record<ApiSceneGroupName, string> = {
	action: 'sasi.group.action',
	operation: 'sasi.group.operation',
	command: 'sasi.group.command',
	input: 'sasi.group.input',
	kind: 'sasi.group.kind',
	provider: 'sasi.group.provider',
	instance: 'sasi.group.instance',
	scene: 'sasi.group.scene',
	surface: 'sasi.group.surface',
	scope: 'sasi.group.scope',
};

export const API_SCENE_GROUP_LABEL_KEYS: Record<ApiSceneGroupName, string> = {
	action: 'sasi.apiscene.group.action',
	operation: 'sasi.apiscene.group.operation',
	command: 'sasi.apiscene.group.command',
	input: 'sasi.apiscene.group.input',
	kind: 'sasi.apiscene.group.kind',
	provider: 'sasi.apiscene.group.provider',
	instance: 'sasi.apiscene.group.instance',
	scene: 'sasi.apiscene.group.scene',
	surface: 'sasi.apiscene.group.surface',
	scope: 'sasi.apiscene.group.scope',
};

export const API_SCENE_COMMAND_SUBGROUP_LABELS: Record<string, string> = {
	'command.vaultman': 'sasi.apiscene.commands.vaultman',
	'command.custom': 'sasi.apiscene.commands.custom',
	'command.provided': 'sasi.apiscene.commands.provided',
};

export function apiSceneIdentityKindFor(
	group: ApiSceneGroupName,
): ApiSceneIdentityKind {
	switch (group) {
		case 'action':
			return 'node_actions';
		case 'operation':
			return 'node_operations';
		case 'command':
			return 'node_commands';
		case 'input':
			return 'node_inputs';
		case 'scope':
			return 'node_scopes';
		case 'kind':
			return 'node_kinds';
		case 'provider':
			return 'node_providers';
		case 'instance':
			return 'node_instances';
		case 'scene':
			return 'node_scenes';
		case 'surface':
			return 'node_surfaces';
		default:
			return 'node_apis';
	}
}

export const API_SCENE_TABS = [
	'files',
	'props',
	'tags',
	'snippets',
	'plugins',
] as const;

export const API_SCENE_SELF_ID = 'vaultman.scene.apiscene';

export interface ApiSceneNodeMeta {
	identityKind: ApiSceneIdentityKind | (string & {});
	urn: string;
	group: ApiSceneGroupName;
	sasiId: string;
	labelKey: string;
	sasiKind: SasiFunctionKind | null;
	catalogKind?: SasiCatalogKind;
	supports: readonly string[];
	composes: readonly string[];
	scope?: string;
	/** U200-L4: limites de la accion, misma fuente que el inspector. */
	compatibility?: SasiCompatibility;
	mutatesVault: boolean;
	publishable: boolean;
	published: boolean;
	activeScene?: string;
	tombstoned?: boolean;
	revision?: number;
	cell_name?: string;
	commandId?: string;
	subgroup?: string;
}

export interface ApiSceneGroupMeta {
	identityKind: typeof API_SCENE_GROUP_KIND;
	group: ApiSceneGroupName;
}

export interface ApiScenePublisherEntry {
	readonly id: string;
	readonly published: boolean;
	readonly descriptor?: { readonly name?: string; readonly composes?: readonly string[] };
}

export interface ApiScenePublisherView {
	isPublished(id: string): boolean;
	snapshot(): readonly ApiScenePublisherEntry[];
	isPublishable?(id: string): boolean;
}

export function apiSceneUrnFor(
	canonicalId: string,
	displayLabel: string,
	identityKind: string = API_SCENE_IDENTITY_KIND,
): string {
	return formatMembershipUrn({
		providerId: API_SCENE_PROVIDER_ID,
		kind: identityKind,
		canonicalId,
		displayLabel,
	});
}

export function buildApiSceneGroups(
	labelOf: (name: ApiSceneGroupName) => string = (name) =>
		API_SCENE_GROUP_LABEL_KEYS[name],
): readonly NodeGroupDef[] {
	return API_SCENE_GROUP_NAMES.map((name) => ({
		id: API_SCENE_GROUP_IDS[name],
		flavor: 'custom',
		label: labelOf(name),
		parentId: null,
		scope: 'all',
	}));
}
