import type { SasiDef, SasiRegistry } from './logicSasiRegistry';
import {
	API_SCENE_SELF_ID,
	API_SCENE_TABS,
	type ApiSceneNodeMeta,
	type ApiScenePublisherView,
} from './logicApiSceneModel';
import {
	toApiSceneNode,
	type ApiSceneLeafSpec,
} from './logicApiSceneNodeFactory';
import { appendApiSceneCommandNodes } from './logicApiSceneCommandRows';
import type { InstanceRegistryData } from '../types/typeInstance';
import type { TreeNode } from '../types/typeTree';

type FunctionGroup = 'action' | 'operation' | 'command';
type AxisGroup = 'kind' | 'provider' | 'surface';

interface NodeBuildContext {
	out: TreeNode<ApiSceneNodeMeta>[];
	publisher: ApiScenePublisherView | undefined;
	snapshotIds: ReadonlySet<string>;
}

function appendFunctionNodes(
	context: NodeBuildContext,
	defs: readonly SasiDef[],
	group: FunctionGroup,
): void {
	for (const def of defs) {
		context.out.push(
			toApiSceneNode({
				spec: {
					group,
					rowId: `sasi:${group}:${def.id}`,
					canonicalId: `${group}:${def.id}`,
					sasiId: def.id,
					label: def.labelKey,
					labelKey: def.labelKey,
					...(def.icon ? { icon: def.icon } : {}),
					sasiKind: group,
					supports: def.supports.map((support) => support.surface),
					composes: def.composes ?? [],
					mutatesVault: group === 'operation' && def.mutatesVault === true,
				},
				publisher: context.publisher,
				snapshotIds: context.snapshotIds,
				isCommand: group === 'command',
			}),
		);
	}
}

function appendAxisNodes(
	context: NodeBuildContext,
	defs: readonly SasiDef[],
	group: AxisGroup,
): void {
	for (const def of defs) {
		context.out.push(
			toApiSceneNode({
				spec: {
					group,
					rowId: `sasi:${group}:${def.id}`,
					canonicalId: `${group}:${def.id}`,
					sasiId: def.id,
					label: def.labelKey,
					labelKey: def.labelKey,
					...(def.icon ? { icon: def.icon } : {}),
					sasiKind: def.kind ?? null,
					supports: def.supports.map((support) => support.surface),
					composes: def.composes ?? [],
					mutatesVault: false,
				},
				publisher: context.publisher,
				snapshotIds: context.snapshotIds,
			}),
		);
	}
}

function appendInstanceNodes(
	context: NodeBuildContext,
	instances: InstanceRegistryData | undefined,
): void {
	const records = Object.values(instances?.instances ?? {}).sort((a, b) =>
		a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
	);
	for (const record of records) {
		context.out.push(
			toApiSceneNode({
				spec: {
					group: 'instance',
					rowId: `sasi:instance:${record.id}`,
					canonicalId: `instance:${record.id}`,
					sasiId: record.id,
					label: record.id,
					labelKey: record.id,
					sasiKind: null,
					supports: [],
					composes: [],
					mutatesVault: false,
					...(record.activeScene !== undefined
						? { activeScene: record.activeScene }
						: {}),
					tombstoned: record.tombstoned,
					revision: record.revision,
				},
				publisher: context.publisher,
				snapshotIds: context.snapshotIds,
			}),
		);
	}
}

function appendSceneNodes(
	context: NodeBuildContext,
	registry: SasiRegistry,
): void {
	const byId = new Map(
		registry.list('function').map((def) => [def.id, def] as const),
	);
	for (const tab of API_SCENE_TABS) {
		const gotoId = `vaultman.scene.goto.${tab}`;
		const def = byId.get(gotoId);
		const spec: ApiSceneLeafSpec = {
			group: 'scene',
			rowId: `sasi:scene:${tab}`,
			canonicalId: `scene:${tab}`,
			sasiId: gotoId,
			label: def?.labelKey ?? `sasi.scene.goto.${tab}`,
			labelKey: def?.labelKey ?? `sasi.scene.goto.${tab}`,
			...(def?.icon ? { icon: def.icon } : {}),
			sasiKind: def?.kind ?? null,
			supports: def ? def.supports.map((support) => support.surface) : [],
			composes: def?.composes ?? [],
			mutatesVault: false,
		};
		context.out.push(
			toApiSceneNode({
				spec,
				publisher: context.publisher,
				snapshotIds: context.snapshotIds,
			}),
		);
	}
	context.out.push(
		toApiSceneNode({
			spec: {
				group: 'scene',
				rowId: 'sasi:scene:apiscene',
				canonicalId: 'scene:apiscene',
				sasiId: API_SCENE_SELF_ID,
				label: 'sasi.apiscene.scene',
				labelKey: 'sasi.apiscene.scene',
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
			},
			publisher: context.publisher,
			snapshotIds: context.snapshotIds,
		}),
	);
}

export function buildApiSceneNodes(
	registry: SasiRegistry,
	publisher?: ApiScenePublisherView,
	instances?: InstanceRegistryData,
): readonly TreeNode<ApiSceneNodeMeta>[] {
	const snapshot = publisher?.snapshot() ?? [];
	const snapshotIds = new Set(snapshot.map((entry) => entry.id));
	const publishedById = new Map(
		snapshot.map((entry) => [entry.id, entry.published]),
	);
	const coherentPublisher: ApiScenePublisherView | undefined = publisher
		? {
				isPublished: (id) => publishedById.get(id) ?? false,
				snapshot: () => snapshot,
				...(typeof publisher.isPublishable === 'function'
					? {
							isPublishable: (id: string) =>
								publisher.isPublishable?.(id) ?? false,
						}
					: {}),
			}
		: undefined;
	const viewPublisher = coherentPublisher ?? publisher;
	const out: TreeNode<ApiSceneNodeMeta>[] = [];
	const context: NodeBuildContext = {
		out,
		publisher: viewPublisher,
		snapshotIds,
	};

	appendFunctionNodes(context, registry.listActions(), 'action');
	appendFunctionNodes(context, registry.listOperations(), 'operation');
	appendApiSceneCommandNodes({
		...context,
		registryCommands: registry.listCommands(),
		publisherEntries: snapshot,
	});
	appendAxisNodes(context, registry.list('kind'), 'kind');
	appendAxisNodes(context, registry.list('provider'), 'provider');
	appendInstanceNodes(context, instances);
	appendSceneNodes(context, registry);
	appendAxisNodes(context, registry.list('surface'), 'surface');

	return out;
}
