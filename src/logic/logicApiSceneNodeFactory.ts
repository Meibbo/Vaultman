import type { SasiFunctionKind } from './logicSasiRegistry';
import {
	API_SCENE_IDENTITY_KIND,
	PUBLISH_CELL_ID,
	apiSceneUrnFor,
	type ApiSceneNodeMeta,
	type ApiScenePublisherView,
} from './logicApiSceneModel';
import type { TreeNode } from '../types/typeTree';

export interface ApiSceneLeafSpec {
	group:
		| 'action'
		| 'operation'
		| 'command'
		| 'kind'
		| 'provider'
		| 'instance'
		| 'scene'
		| 'surface';
	rowId: string;
	canonicalId: string;
	sasiId: string;
	label: string;
	labelKey: string;
	icon?: string;
	sasiKind: SasiFunctionKind | null;
	supports: readonly string[];
	composes: readonly string[];
	mutatesVault: boolean;
	activeScene?: string;
	tombstoned?: boolean;
	revision?: number;
}

function resolvePublishable(
	publisher: ApiScenePublisherView | undefined,
	id: string,
	snapshotIds: ReadonlySet<string>,
): boolean {
	if (!publisher) return false;
	return typeof publisher.isPublishable === 'function'
		? publisher.isPublishable(id)
		: snapshotIds.has(id);
}

export interface ApiSceneNodeInput {
	spec: ApiSceneLeafSpec;
	publisher: ApiScenePublisherView | undefined;
	snapshotIds: ReadonlySet<string>;
	isCommand?: boolean;
}

export function toApiSceneNode({
	spec,
	publisher,
	snapshotIds,
	isCommand = false,
}: ApiSceneNodeInput): TreeNode<ApiSceneNodeMeta> {
	const publishable =
		isCommand && resolvePublishable(publisher, spec.sasiId, snapshotIds);
	const published = publishable
		? (publisher?.isPublished(spec.sasiId) ?? false)
		: false;

	return {
		id: spec.rowId,
		label: spec.label,
		...(spec.icon ? { icon: spec.icon } : {}),
		typeText: spec.sasiKind ?? spec.group,
		depth: 0,
		...(publishable
			? {
					cells: [
						{
							id: PUBLISH_CELL_ID,
							kind: 'toggle',
							enabled: published,
							style: 'native',
							label: published
								? 'sasi.inspector.toggle.on'
								: 'sasi.inspector.toggle.off',
						},
					],
				}
			: {}),
		meta: {
			identityKind: API_SCENE_IDENTITY_KIND,
			urn: apiSceneUrnFor(spec.canonicalId, spec.label),
			group: spec.group,
			sasiId: spec.sasiId,
			labelKey: spec.labelKey,
			sasiKind: spec.sasiKind,
			supports: spec.supports,
			composes: spec.composes,
			mutatesVault: spec.mutatesVault,
			publishable,
			published,
			...(spec.activeScene !== undefined
				? { activeScene: spec.activeScene }
				: {}),
			...(spec.tombstoned !== undefined ? { tombstoned: spec.tombstoned } : {}),
			...(spec.revision !== undefined ? { revision: spec.revision } : {}),
		},
	};
}
