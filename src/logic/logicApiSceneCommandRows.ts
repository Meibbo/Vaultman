import type { SasiDef } from './logicSasiRegistry';
import {
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

function appendCommandNode(
	context: CommandNodeContext,
	spec: CommandNodeSpec,
): void {
	context.out.push(
		toApiSceneNode({
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
		}),
	);
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
				composes: [],
			},
		);
	}
}
