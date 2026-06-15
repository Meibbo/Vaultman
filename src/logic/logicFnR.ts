/**
 * logicFnR — PURE find-and-replace projection logic (Q4 lane A, slice 5).
 *
 * The label / preview / scope-summary projections the FnR surfaces build inline:
 *  - `fnrRenamePreview` — an active rename handoff -> a structured i18n descriptor
 *    (the old `Toolbar.svelte#renameContext`).
 *  - `fnrScopeSummary` — (scope, file count) -> a structured i18n descriptor
 *    (the old `tabContent.svelte#scopeLabel`).
 *  - `fnrContentReplaceLabel` / `fnrContentReplaceScopeCount` — the content-replace
 *    `details` line + its file count (the inline projection in
 *    `serviceFnR.buildContentReplaceChange`).
 *
 * ZERO `obsidian`, DOM, or Svelte imports (spec AC#1). It does not import `typeFnR`
 * either (that reaches `obsidian` via `TFile`); instead it declares app-free input
 * shapes that are structurally compatible with `FnRRenameSourceKind` / `FnRScope`,
 * and the file scope is taken as a count / plain array — never a `TFile[]`.
 *
 * PREVIEW-BEFORE-APPLY (ledger §014): every function here is a PROJECTION. It reads
 * the FnR state + the already-resolved scope and returns a preview/label/count. It
 * NEVER mutates the state, the scope, or the vault; producing a preview must remain
 * decoupled from applying the change. The impure `translate()` call and the actual
 * queue mutation stay at the service/component boundary.
 *
 * Namespacing (D6): FnR does NOT emit `TreeNode`s today (its outputs are
 * `PendingChange`/`ContentChange`). `formulaNodeId` is provided for the forward case
 * where a formula/rule surfaces as a node, so that emission uses `formula.<id>`.
 */

/** App-free rename source kinds (structurally matches `FnRRenameSourceKind`). */
export type FnRRenameKind = 'prop' | 'value' | 'tag' | 'file';

/** App-free replace scope (structurally matches `FnRScope`). */
export type FnRScopeKind = 'filtered' | 'selected';

/**
 * A structured, app-free description of a translatable string: the i18n `key` plus
 * its interpolation `params`. The component/service passes this to `translate()`;
 * keeping the projection at the data level is what makes it pure and testable.
 */
export interface FnRMessageDescriptor {
	key: string;
	params: Record<string, string | number>;
}

/** Input for the rename preview projection (the active handoff, app-free). */
export interface FnRRenamePreviewInput {
	sourceKind: FnRRenameKind;
	original: string;
	/** Owning property name; required for the value-specific preview. */
	propName?: string;
	/** Number of files in the resolved rename scope. */
	fileCount: number;
}

export const FNR_FORMULA_ID_PREFIX = 'formula.';

const RENAME_CONTEXT_KEY = 'fnr.rename.context';
const RENAME_CONTEXT_VALUE_KEY = 'fnr.rename.context_value';
const RENAME_KIND_KEY_PREFIX = 'fnr.rename.kind.';
const SCOPE_LABEL_KEY = 'fnr.scope_label';
const SCOPE_KEY_PREFIX = 'fnr.scope.';

/** Namespaced node id (D6) for a formula/rule, used only if FnR emits a node. */
export function formulaNodeId(id: string): string {
	return `${FNR_FORMULA_ID_PREFIX}${id}`;
}

/**
 * Project an active rename handoff into a structured i18n preview descriptor.
 *
 * A value rename (with a known owning prop) routes to `fnr.rename.context_value`,
 * carrying the original value, its `prop`, and the file `count`. Every other kind
 * (and a value rename that has lost its prop) routes to the generic
 * `fnr.rename.context`, carrying the kind's own translation key, the `original`,
 * and the `count`. Pure: does not mutate input.
 */
export function fnrRenamePreview(input: FnRRenamePreviewInput): FnRMessageDescriptor {
	if (input.sourceKind === 'value' && input.propName) {
		return {
			key: RENAME_CONTEXT_VALUE_KEY,
			params: { original: input.original, prop: input.propName, count: input.fileCount },
		};
	}
	return {
		key: RENAME_CONTEXT_KEY,
		params: {
			kindKey: `${RENAME_KIND_KEY_PREFIX}${input.sourceKind}`,
			original: input.original,
			count: input.fileCount,
		},
	};
}

/**
 * Project the replace scope + its resolved file count into a structured i18n
 * summary descriptor (`fnr.scope_label` with the `count` and the scope's own
 * translation key). Pure: reads only the scope + count, mutates nothing.
 */
export function fnrScopeSummary(scope: FnRScopeKind, fileCount: number): FnRMessageDescriptor {
	return {
		key: SCOPE_LABEL_KEY,
		params: { count: fileCount, scopeKey: `${SCOPE_KEY_PREFIX}${scope}` },
	};
}

/**
 * Build the content-replace `details` label (preview of the queued change), with
 * singular/plural file wording. Pure string projection; never applies anything.
 */
export function fnrContentReplaceLabel(find: string, replace: string, fileCount: number): string {
	const noun = fileCount === 1 ? 'file' : 'files';
	return `Replace "${find}" with "${replace}" in ${fileCount} ${noun}`;
}

/** Scope count for a content replace, straight from the resolved scope list. */
export function fnrContentReplaceScopeCount(files: readonly unknown[]): number {
	return files.length;
}
