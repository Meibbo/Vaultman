import { NO_GROUP_ID, projectGroupedTree } from './logicTreeGroupProjection';
import {
	API_SCENE_GROUP_IDS,
	API_SCENE_GROUP_KIND,
	API_SCENE_GROUP_NAMES,
	API_SCENE_IDENTITY_KIND,
	API_SCENE_PROVIDER_ID,
	buildApiSceneGroups,
	type ApiSceneGroupMeta,
	type ApiSceneGroupName,
	type ApiSceneNodeMeta,
} from './logicApiSceneModel';
import type { NodeGroupDef } from './logicNodeGroup';
import type { TreeNode } from '../types/typeTree';

export interface ProjectApiSceneOptions {
	expandedIds?: ReadonlySet<string>;
	labelOf?: (name: ApiSceneGroupName) => string;
	noGroupLabel?: string;
}

export function apiSceneMemberships(
	nodes: readonly TreeNode<ApiSceneNodeMeta>[],
): Record<string, readonly string[]> {
	const memberships: Record<string, string[]> = {};
	for (const name of API_SCENE_GROUP_NAMES) {
		memberships[API_SCENE_GROUP_IDS[name]] = [];
	}
	for (const node of nodes) {
		memberships[API_SCENE_GROUP_IDS[node.meta.group]]?.push(node.meta.urn);
	}
	return memberships;
}

export function apiSceneUrnOf(node: TreeNode<ApiSceneNodeMeta>): string {
	return node.meta.urn;
}

export function projectApiSceneTree(
	nodes: readonly TreeNode<ApiSceneNodeMeta>[],
	options: ProjectApiSceneOptions = {},
): readonly TreeNode<ApiSceneNodeMeta | ApiSceneGroupMeta>[] {
	type Meta = ApiSceneNodeMeta | ApiSceneGroupMeta;
	const groups: readonly NodeGroupDef[] = buildApiSceneGroups(options.labelOf);
	const memberships = apiSceneMemberships(nodes);
	const projected = projectGroupedTree<Meta>({
		nodes,
		groups,
		memberships,
		providerId: API_SCENE_PROVIDER_ID,
		noGroupLabel: options.noGroupLabel ?? '',
		filtered: false,
		urnOf: (node) => {
			if (isApiSceneNode(node)) return node.meta.urn;
			return '';
		},
		enabled: true,
		preset: { kind: 'custom', direction: 'asc' },
		expandedIds: options.expandedIds,
		headerMeta: undefined,
		headerCoreCls: 'tree-item-self nav-file-title tappable is-clickable',
		decorateHeader: (header, members) => {
			const group = API_SCENE_GROUP_NAMES.find(
				(name) => API_SCENE_GROUP_IDS[name] === header.id,
			);
			if (group) {
				header.meta = { identityKind: API_SCENE_GROUP_KIND, group };
			}
			header.count = members.length;
		},
	});
	return projected.filter((row) => row.id !== NO_GROUP_ID);
}

export function isApiSceneNode(
	node: TreeNode<ApiSceneNodeMeta | ApiSceneGroupMeta>,
): node is TreeNode<ApiSceneNodeMeta> {
	return node.meta.identityKind === API_SCENE_IDENTITY_KIND;
}

export function apiScenePublishState(node: TreeNode<ApiSceneNodeMeta>): {
	publishable: boolean;
	published: boolean;
} {
	return {
		publishable: node.meta.publishable,
		published: node.meta.published,
	};
}
