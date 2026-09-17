import {
	mergeFilesMenuLayout,
	type FilesMenuItem,
} from './logicFilesContextMenu';
import {
	TOOLBAR_MENU_CANONICAL_ORDER,
	toolbarMenuActionIds,
	toolbarMenuCatalog,
	type ToolbarMenuKind,
} from './logicToolbarMenuCatalog';

export type ToolbarMenuNodeAnchor = {
	readonly id: string;
	readonly placement: 'before' | 'after';
};

export type ToolbarMenuItem<T> = {
	readonly id: string;
	readonly value: T;
	readonly children?: readonly ToolbarMenuNode<T>[];
	readonly anchor?: ToolbarMenuNodeAnchor;
};

export type ToolbarMenuNode<T> =
	| { readonly kind: 'item'; readonly item: ToolbarMenuItem<T> }
	| { readonly kind: 'divider'; readonly id: string };

export type ToolbarMenuSubmenuValueFactory<T> = (
	id: string,
	label: string,
) => T;

type LayoutDivider = {
	readonly id: string;
	readonly position: number;
	readonly group?: string;
};

type LayoutState = {
	readonly hasSavedLayout: boolean;
	readonly positions: ReadonlyMap<string, number>;
	readonly visibility: ReadonlyMap<string, boolean>;
	readonly dividers: readonly LayoutDivider[];
	readonly submenus: readonly { id: string; label: string; position: number }[];
	readonly parentByAction: ReadonlyMap<string, string>;
};

type ProjectionContext = {
	readonly layout: LayoutState;
	readonly catalogGroups: ReadonlyMap<string, string>;
	readonly parentByGroup: ReadonlyMap<string, string>;
	readonly visibleCatalogIds: ReadonlySet<string>;
	readonly catalogIds: ReadonlySet<string>;
	readonly inlineGroups: ReadonlySet<string>;
	readonly customSubmenuIds: ReadonlySet<string>;
	readonly allowMixedGroups: boolean;
};

type PositionedNode<T> = {
	readonly node: ToolbarMenuNode<T>;
	readonly rank: number;
	readonly sourceIndex: number;
};

export function projectToolbarMenu<T>(
	kind: ToolbarMenuKind,
	saved: unknown,
	rootNodes: readonly ToolbarMenuNode<T>[],
	inlineGroups: readonly string[] = [],
	createSubmenuValue?: ToolbarMenuSubmenuValueFactory<T>,
): readonly ToolbarMenuNode<T>[] {
	const catalog = toolbarMenuCatalog(kind);
	const catalogGroups = new Map(
		catalog.flatMap((entry) =>
			entry.submenu ? [[entry.id, entry.submenu] as const] : [],
		),
	);
	const parentByGroup = new Map<string, string>();
	for (const entry of catalog) {
		if (entry.submenu && !parentByGroup.has(entry.submenu)) {
			parentByGroup.set(entry.submenu, entry.id);
		}
	}
	const catalogIds = new Set(catalog.map((entry) => entry.id));
	const layout = readLayout(kind, saved, catalogGroups);
	const customSubmenuIds = new Set(
		layout.submenus.map((submenu) => submenu.id),
	);
	const customChildren = new Map<string, ToolbarMenuNode<T>[]>();
	const sourceNodes = createSubmenuValue
		? partitionCustomChildren(rootNodes, layout.parentByAction, customChildren)
		: rootNodes;
	const customSubmenuNodes = createSubmenuValue
		? layout.submenus.flatMap((submenu) => {
				const children = customChildren.get(submenu.id) ?? [];
				return children.length === 0
					? []
					: [
							{
								kind: 'item' as const,
								item: {
									id: submenu.id,
									value: createSubmenuValue(submenu.id, submenu.label),
									children,
								},
							},
						];
			})
		: [];
	const projectedSource = [...sourceNodes, ...customSubmenuNodes];
	const descriptorIds = collectDescriptorIds(projectedSource);
	const visibleCatalogIds = satisfyRequirements(
		catalog,
		descriptorIds,
		layout.visibility,
	);
	const context: ProjectionContext = {
		layout,
		catalogGroups,
		parentByGroup,
		visibleCatalogIds,
		catalogIds,
		inlineGroups: new Set(inlineGroups),
		customSubmenuIds,
		allowMixedGroups: false,
	};
	return projectSequence(projectedSource, undefined, context);
}

function readLayout(
	kind: ToolbarMenuKind,
	saved: unknown,
	catalogGroups: ReadonlyMap<string, string>,
): LayoutState {
	const merged = mergeFilesMenuLayout(
		saved,
		toolbarMenuActionIds(kind),
		TOOLBAR_MENU_CANONICAL_ORDER[kind],
	);
	const positions = new Map<string, number>();
	const visibility = new Map<string, boolean>();
	const submenus: { id: string; label: string; position: number }[] = [];
	const submenuIds = new Set<string>();
	for (const [position, item] of merged.entries()) {
		if (item.kind === 'submenu') {
			submenus.push({ id: item.id, label: item.label, position });
			submenuIds.add(item.id);
			positions.set(item.id, position);
			continue;
		}
		if (item.kind !== 'action') continue;
		positions.set(item.id, position);
		visibility.set(item.id, item.visible);
	}
	const parentByAction = new Map<string, string>();
	for (const item of merged) {
		if (item.kind === 'action' && item.parent && submenuIds.has(item.parent)) {
			parentByAction.set(item.id, item.parent);
		}
	}
	const dividers = merged.flatMap((item, position) => {
		if (item.kind !== 'divider') return [];
		return [
			{
				id: item.id,
				position,
				...dividerGroup(merged, position, catalogGroups),
			},
		];
	});
	return {
		hasSavedLayout: Array.isArray(saved),
		positions,
		visibility,
		dividers,
		submenus,
		parentByAction,
	};
}

function partitionCustomChildren<T>(
	nodes: readonly ToolbarMenuNode<T>[],
	parentByAction: ReadonlyMap<string, string>,
	childrenByParent: Map<string, ToolbarMenuNode<T>[]>,
): readonly ToolbarMenuNode<T>[] {
	const remaining: ToolbarMenuNode<T>[] = [];
	for (const node of nodes) {
		if (node.kind === 'divider') {
			remaining.push(node);
			continue;
		}
		const parent = parentByAction.get(node.item.id);
		if (parent) {
			const children = childrenByParent.get(parent) ?? [];
			children.push(node);
			childrenByParent.set(parent, children);
			continue;
		}
		const children = node.item.children
			? partitionCustomChildren(
					node.item.children,
					parentByAction,
					childrenByParent,
				)
			: undefined;
		remaining.push({
			kind: 'item',
			item: {
				...node.item,
				...(children ? { children } : {}),
			},
		});
	}
	return remaining;
}

function dividerGroup(
	items: readonly FilesMenuItem[],
	position: number,
	catalogGroups: ReadonlyMap<string, string>,
): { readonly group?: string } {
	let previous: string | undefined;
	for (let index = position - 1; index >= 0; index -= 1) {
		const item = items[index];
		if (item?.kind === 'action') {
			previous = catalogGroups.get(item.id);
			break;
		}
	}
	let next: string | undefined;
	for (let index = position + 1; index < items.length; index += 1) {
		const item = items[index];
		if (item?.kind === 'action') {
			next = catalogGroups.get(item.id);
			break;
		}
	}
	return previous !== undefined && previous === next ? { group: previous } : {};
}

function collectDescriptorIds<T>(
	nodes: readonly ToolbarMenuNode<T>[],
	ids = new Set<string>(),
): ReadonlySet<string> {
	for (const node of nodes) {
		if (node.kind !== 'item') continue;
		ids.add(node.item.id);
		if (node.item.children) collectDescriptorIds(node.item.children, ids);
	}
	return ids;
}

function satisfyRequirements(
	catalog: ReturnType<typeof toolbarMenuCatalog>,
	descriptorIds: ReadonlySet<string>,
	visibility: ReadonlyMap<string, boolean>,
): ReadonlySet<string> {
	const satisfied = new Set<string>();
	let changed = true;
	while (changed) {
		changed = false;
		for (const entry of catalog) {
			if (
				descriptorIds.has(entry.id) &&
				visibility.get(entry.id) !== false &&
				entry.requires.every((requirement) => satisfied.has(requirement)) &&
				!satisfied.has(entry.id)
			) {
				satisfied.add(entry.id);
				changed = true;
			}
		}
	}
	return satisfied;
}

function projectSequence<T>(
	nodes: readonly ToolbarMenuNode<T>[],
	group: string | undefined,
	context: ProjectionContext,
): readonly ToolbarMenuNode<T>[] {
	const positioned: PositionedNode<T>[] = [];
	for (const [sourceIndex, node] of nodes.entries()) {
		if (node.kind === 'divider') {
			if (!context.layout.hasSavedLayout) {
				positioned.push({
					node,
					rank: nativeRank(nodes, sourceIndex, context),
					sourceIndex,
				});
			}
			continue;
		}

		const itemGroup = context.catalogGroups.get(node.item.id);
		const isGroupParent =
			itemGroup !== undefined &&
			context.parentByGroup.get(itemGroup) === node.item.id;
		if (
			group === undefined &&
			itemGroup !== undefined &&
			!context.allowMixedGroups
		) {
			if (!isGroupParent) continue;
			if (context.inlineGroups.has(itemGroup)) {
				if (!context.visibleCatalogIds.has(node.item.id)) continue;
				const flattened = projectSequence(
					node.item.children ?? [],
					itemGroup,
					context,
				);
				for (const [index, child] of flattened.entries()) {
					positioned.push({
						node: child,
						rank: rankForNode(child, index, flattened, context),
						sourceIndex: sourceIndex + index,
					});
				}
				continue;
			}
		}
		if (
			group !== undefined &&
			itemGroup !== undefined &&
			itemGroup !== group &&
			!context.allowMixedGroups
		) {
			continue;
		}
		if (
			context.catalogIds.has(node.item.id) &&
			!context.visibleCatalogIds.has(node.item.id)
		) {
			continue;
		}

		const children = node.item.children
			? projectSequence(node.item.children, itemGroup, {
					...context,
					allowMixedGroups:
						context.allowMixedGroups ||
						context.customSubmenuIds.has(node.item.id),
				})
			: undefined;
		if (
			context.customSubmenuIds.has(node.item.id) &&
			(children === undefined || children.length === 0)
		) {
			continue;
		}
		positioned.push({
			node: {
				kind: 'item',
				item: {
					...node.item,
					...(children ? { children } : {}),
				},
			},
			rank: rankForNode(node, sourceIndex, nodes, context),
			sourceIndex,
		});
	}

	if (context.layout.hasSavedLayout) {
		for (const divider of context.layout.dividers) {
			if (divider.group !== group) continue;
			positioned.push({
				node: { kind: 'divider', id: divider.id },
				rank: divider.position,
				sourceIndex: nodes.length + divider.position,
			});
		}
	}

	positioned.sort(
		(left, right) =>
			left.rank - right.rank || left.sourceIndex - right.sourceIndex,
	);
	return normalizeNodes(positioned.map((entry) => entry.node));
}

function rankForNode<T>(
	node: ToolbarMenuNode<T>,
	sourceIndex: number,
	nodes: readonly ToolbarMenuNode<T>[],
	context: ProjectionContext,
): number {
	if (node.kind === 'divider') return nativeRank(nodes, sourceIndex, context);
	const position = context.layout.positions.get(node.item.id);
	if (position !== undefined) return position;
	const anchor = node.item.anchor;
	if (anchor) {
		const anchorPosition = context.layout.positions.get(anchor.id);
		if (anchorPosition !== undefined) {
			return anchorPosition + (anchor.placement === 'before' ? -0.25 : 0.25);
		}
	}
	return nativeRank(nodes, sourceIndex, context);
}

function nativeRank<T>(
	nodes: readonly ToolbarMenuNode<T>[],
	sourceIndex: number,
	context: ProjectionContext,
): number {
	const previous = surroundingRank(nodes, sourceIndex, -1, context);
	const next = surroundingRank(nodes, sourceIndex, 1, context);
	if (previous !== undefined && next !== undefined)
		return (previous + next) / 2;
	if (previous !== undefined) return previous + 0.5;
	if (next !== undefined) return next - 0.5;
	return sourceIndex;
}

function surroundingRank<T>(
	nodes: readonly ToolbarMenuNode<T>[],
	sourceIndex: number,
	direction: -1 | 1,
	context: ProjectionContext,
): number | undefined {
	for (
		let index = sourceIndex + direction;
		index >= 0 && index < nodes.length;
		index += direction
	) {
		const node = nodes[index];
		if (node?.kind !== 'item') continue;
		const position = context.layout.positions.get(node.item.id);
		if (position !== undefined) return position;
	}
	return undefined;
}

function normalizeNodes<T>(
	nodes: readonly ToolbarMenuNode<T>[],
): readonly ToolbarMenuNode<T>[] {
	const normalized: ToolbarMenuNode<T>[] = [];
	for (const node of nodes) {
		if (
			node.kind === 'divider' &&
			(normalized.length === 0 || normalized.at(-1)?.kind === 'divider')
		) {
			continue;
		}
		normalized.push(node);
	}
	while (normalized.at(-1)?.kind === 'divider') normalized.pop();
	return normalized;
}
