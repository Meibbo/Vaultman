// src/logic/PropsLogic.ts
import { prepareSimpleSearch, type App } from 'obsidian';
import type { TreeNode, PropMeta } from '../types/typeTree';

const COMPATIBLE_TYPES: Record<string, (v: unknown) => boolean> = {
	checkbox: (v) => v === true || v === false || v === 'true' || v === 'false',
	number: (v) => !isNaN(Number(v)),
	date: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
	datetime: (v) => typeof v === 'string' && !isNaN(Date.parse(v)),
};

function isCompatible(value: unknown, type: string): boolean {
	const check = COMPATIBLE_TYPES[type];
	return check ? check(value) : true; // text, list, multitext always compatible
}

export type PropertyConflictReasonCode =
	| 'type-mismatch'
	| 'incompatible-format'
	| 'parse-error';

export interface PropertyConflict {
	reasonCode: PropertyConflictReasonCode;
	reasonText: string;
}

/**
 * Names a frontmatter value in a conflict message. A property can hold a map or
 * an array, and those stringify to `[object Object]`, which tells the user
 * nothing about the value that is actually in conflict.
 */
function describeConflictValue(value: unknown): string {
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value) ?? Object.prototype.toString.call(value);
		} catch {
			return Object.prototype.toString.call(value);
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-base-to-string -- Allow default stringification
	return String(value);
}

export function checkPropertyValueConflict(
	expectedType: string,
	value: unknown,
): PropertyConflict | null {
	if (value === undefined || value === null) return null;
	if (isCompatible(value, expectedType)) return null;

	const described = describeConflictValue(value);
	if (expectedType === 'checkbox') {
		return {
			reasonCode: 'type-mismatch',
			reasonText: `Value '${described}' is not valid for checkbox`,
		};
	}
	if (expectedType === 'date' || expectedType === 'datetime') {
		return {
			reasonCode: 'parse-error',
			reasonText: `Value '${described}' cannot be parsed as ${expectedType}`,
		};
	}
	return {
		reasonCode: 'type-mismatch',
		reasonText: `Value '${described}' does not match type ${expectedType}`,
	};
}

export class PropsLogic {
	private app: App;
	private _cache: TreeNode<PropMeta>[] | null = null;
	private _stale = true;

	constructor(app: App) {
		this.app = app;
	}

	invalidate(): void {
		this._stale = true;
	}

	getTree(): TreeNode<PropMeta>[] {
		if (this._stale || !this._cache) {
			this._cache = this._buildTree();
			this._stale = false;
		}
		return this._cache;
	}

	filterTree(
		nodes: TreeNode<PropMeta>[],
		term: string,
		mode: number = 0,
	): TreeNode<PropMeta>[] {
		if (!term) return nodes;
		const search = prepareSimpleSearch(term);
		return this._filterNodes(nodes, search, mode);
	}

	expansionIdsForSearchMatches(
		nodes: TreeNode<PropMeta>[],
		term: string,
		mode: number = 0,
	): Set<string> {
		const expansionIds = new Set<string>();
		if (!term) return expansionIds;
		const search = prepareSimpleSearch(term);

		const walk = (node: TreeNode<PropMeta>, ancestors: string[]): void => {
			const matches =
				mode === 0
					? !!search(node.label)
					: !node.meta.isValueNode && !!search(node.label);
			if (matches && ancestors.length > 0) {
				for (const ancestorId of ancestors) expansionIds.add(ancestorId);
			}
			for (const child of node.children ?? []) {
				walk(child, [...ancestors, node.id]);
			}
		};

		for (const node of nodes) walk(node, []);
		return expansionIds;
	}

	private _filterNodes(
		nodes: TreeNode<PropMeta>[],
		search: (text: string) => { score: number } | null,
		mode: number,
	): TreeNode<PropMeta>[] {
		const result: TreeNode<PropMeta>[] = [];
		for (const node of nodes) {
			const isMatch = !!search(node.label);

			// mode 0 = all property text; mode 1 = property names only.
			const currentMatches =
				mode === 0 ? isMatch : !node.meta.isValueNode && isMatch;

			const filteredChildren =
				mode === 0 && !node.meta.isValueNode && currentMatches
					? (node.children ?? [])
					: node.children
						? this._filterNodes(node.children, search, mode)
						: [];

			if (currentMatches || filteredChildren.length > 0) {
				result.push({ ...node, children: filteredChildren });
			}
		}
		return result;
	}

	private _buildTree(): TreeNode<PropMeta>[] {
		const allProps =
			(
				this.app.metadataCache as unknown as {
					getAllPropertyInfos(): Record<
						string,
						{ type?: string; widget?: string }
					>;
				}
			).getAllPropertyInfos?.() ?? {};

		// Map to store values and their frequencies
		const valueMap = new Map<string, Map<string, number>>();
		// Map to store which files contain which property (for accurate file count)
		const propFileMap = new Map<string, Set<string>>();
		const observedProps = new Set<string>();

		for (const file of this.app.vault.getMarkdownFiles()) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			for (const [key, val] of Object.entries(fm)) {
				if (key === 'position') continue;

				observedProps.add(key);

				// Track unique files per property
				if (!propFileMap.has(key)) propFileMap.set(key, new Set());
				propFileMap.get(key)!.add(file.path);

				// Track value frequencies
				if (!valueMap.has(key)) valueMap.set(key, new Map());
				const vals = Array.isArray(val) && val.length > 0 ? val : [val];
				for (const v of vals) {
					const str =
						v == null || (Array.isArray(v) && v.length === 0)
							? ''
							: describeConflictValue(v);
					const vMap = valueMap.get(key)!;
					vMap.set(str, (vMap.get(str) ?? 0) + 1);
				}
			}
		}

		const infoByLower = new Map(
			Object.entries(allProps).map(([propName, info]) => [
				propName.toLowerCase(),
				info,
			]),
		);
		const observedLower = new Set(
			[...observedProps].map((propName) => propName.toLowerCase()),
		);
		const propNames = [
			...observedProps,
			...Object.keys(allProps).filter(
				(propName) => !observedLower.has(propName.toLowerCase()),
			),
		];

		const nodes: TreeNode<PropMeta>[] = [];
		for (const propName of propNames) {
			const info =
				allProps[propName] ?? infoByLower.get(propName.toLowerCase());
			const propType = info?.widget ?? info?.type ?? 'text';
			const valuesMap = (valueMap.get(propName) ?? new Map()) as Map<
				string,
				number
			>;

			// Accurate file count: how many unique files have this property
			const fileCount = propFileMap.get(propName)?.size ?? 0;

			const valueNodes: TreeNode<PropMeta>[] = Array.from(valuesMap.entries())
				.map(([rawValue, cnt]: [string, number]) => ({
					id: `${propName}::${rawValue}`,
					label: rawValue === '' ? 'empty' : rawValue,
					count: cnt,
					depth: 1,
					coreCls: 'tree-item-self tappable is-clickable',
					children: [],
					meta: {
						propName,
						propType,
						isValueNode: true,
						rawValue,
						isTypeIncompatible: !isCompatible(rawValue, propType),
					},
				}))
				.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

			nodes.push({
				id: propName,
				label: propName,
				count: fileCount,
				depth: 0,
				coreCls: 'tree-item-self tappable is-clickable',
				children: valueNodes,
				meta: { propName, propType, isValueNode: false },
			});
		}
		return nodes.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
	}
}
