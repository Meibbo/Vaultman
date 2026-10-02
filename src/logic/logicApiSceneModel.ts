import type { NodeGroupDef } from './logicNodeGroup';
import { formatMembershipUrn } from './logicMembershipUrn';
import type { SasiFunctionKind } from './logicSasiRegistry';

export const API_SCENE_PROVIDER_ID = 'sasi';
export const API_SCENE_IDENTITY_KIND = 'node_apis';
export const API_SCENE_GROUP_KIND = 'node_groups';
export const PUBLISH_CELL_ID = 'publish';

export type ApiSceneGroupName =
	| 'action'
	| 'operation'
	| 'command'
	| 'kind'
	| 'provider'
	| 'instance'
	| 'scene'
	| 'surface';

export const API_SCENE_GROUP_NAMES: readonly ApiSceneGroupName[] = [
	'action',
	'operation',
	'command',
	'kind',
	'provider',
	'instance',
	'scene',
	'surface',
];

export const API_SCENE_GROUP_IDS: Record<ApiSceneGroupName, string> = {
	action: 'sasi.group.action',
	operation: 'sasi.group.operation',
	command: 'sasi.group.command',
	kind: 'sasi.group.kind',
	provider: 'sasi.group.provider',
	instance: 'sasi.group.instance',
	scene: 'sasi.group.scene',
	surface: 'sasi.group.surface',
};

export const API_SCENE_GROUP_LABEL_KEYS: Record<ApiSceneGroupName, string> = {
	action: 'sasi.apiscene.group.action',
	operation: 'sasi.apiscene.group.operation',
	command: 'sasi.apiscene.group.command',
	kind: 'sasi.apiscene.group.kind',
	provider: 'sasi.apiscene.group.provider',
	instance: 'sasi.apiscene.group.instance',
	scene: 'sasi.apiscene.group.scene',
	surface: 'sasi.apiscene.group.surface',
};

export const API_SCENE_TABS = [
	'files',
	'props',
	'tags',
	'snippets',
	'plugins',
] as const;

export const API_SCENE_SELF_ID = 'vaultman.scene.apiscene';

export interface ApiSceneNodeMeta {
	identityKind: typeof API_SCENE_IDENTITY_KIND;
	urn: string;
	group: ApiSceneGroupName;
	sasiId: string;
	labelKey: string;
	sasiKind: SasiFunctionKind | null;
	supports: readonly string[];
	composes: readonly string[];
	mutatesVault: boolean;
	publishable: boolean;
	published: boolean;
	activeScene?: string;
	tombstoned?: boolean;
	revision?: number;
}

export interface ApiSceneGroupMeta {
	identityKind: typeof API_SCENE_GROUP_KIND;
	group: ApiSceneGroupName;
}

export interface ApiScenePublisherEntry {
	readonly id: string;
	readonly published: boolean;
	readonly descriptor?: { readonly name?: string };
}

export interface ApiScenePublisherView {
	isPublished(id: string): boolean;
	snapshot(): readonly ApiScenePublisherEntry[];
	isPublishable?(id: string): boolean;
}

export function apiSceneUrnFor(
	canonicalId: string,
	displayLabel: string,
): string {
	return formatMembershipUrn({
		providerId: API_SCENE_PROVIDER_ID,
		kind: API_SCENE_IDENTITY_KIND,
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
