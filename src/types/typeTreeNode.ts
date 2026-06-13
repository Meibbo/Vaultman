/**
 * App-free node-contract primitives. Kept import-clean (NO `obsidian`, DOM, or
 * Svelte) so pure `logic*` modules can build/transform `TreeNode`s without pulling
 * the Obsidian API into their dependency graph (Q4 AC#1). `typeNode.ts` re-exports
 * these and adds the domain `*Meta` shapes that DO reference `TFile`.
 */

export interface NodeBadge {
	text?: string;
	icon?: string;
	color?:
		| 'accent'
		| 'warning'
		| 'error'
		| 'success'
		| 'info'
		| 'faint'
		| 'red'
		| 'blue'
		| 'purple'
		| 'orange'
		| 'green';
	solid?: boolean;
	isInherited?: boolean;
	quickAction?: boolean;
	title?: string;
	ariaLabel?: string;
	onClick?: () => void | Promise<void>;
	/** Queue operation index for click-to-remove. Undefined = visual-only badge. */
	queueIndex?: number;
}

/**
 * Node-contract relation kinds (umbrella shard 02 / D7). Q4 introduces the TYPE
 * and its emission by the spine providers; visual consumption is N.R/V.D.
 *
 * - `holarchy` — parent/child containment (folder->file, prop->value, tag->subtag).
 * - `adopted`  — external-provider placement (outline headers/tasks under a file).
 * - `related`  — heterarchy links/backlinks (DEFER: type only, no emission yet).
 */
export type NodeRelationKind = 'holarchy' | 'adopted' | 'related';

export interface TreeNode<TMeta = unknown> {
	id: string;
	label: string;
	labelPrefix?: string;
	icon?: string;
	count?: number;
	countLabel?: string;
	badges?: NodeBadge[];
	children?: TreeNode<TMeta>[];
	depth: number;
	meta: TMeta;
	cls?: string;
	highlights?: { start: number; end: number }[];
	/** Empty folders reserve a caret slot (SDF-013). */
	showCaret?: boolean;
	/** Node-contract relation kind this node participates in (D7, Q4 emits holarchy/adopted). */
	relation?: NodeRelationKind;
}
