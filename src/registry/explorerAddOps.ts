/**
 * explorerAddOps — registry of `crear` (add) op builders, one per explorer kind.
 *
 * Spec: docs/work/hardening/specs/2026-05-07-multifacet-2/01-fnr-island-templating.md
 * Plan: docs/work/hardening/plans/2026-05-07-multifacet-2/01-fnr-island-island.md
 *
 * Phase 1a only supports `tag` and `prop`. Other kinds return `null` so the
 * `crear` button can render disabled with the "no soportado por este explorer"
 * tooltip until later phases land.
 */

import type { PendingChange } from '../types/typeOps';

/**
 * Builder signature: takes the user-entered label (raw query string from the
 * FnR searchbox) and returns a `PendingChange` ready for
 * `OperationQueueService.add(...)`. Returns `null` when the label is invalid
 * (e.g. empty, normalises to nothing) so the caller can no-op without queueing.
 */
export type AddOpBuilder = (label: string) => PendingChange | null;

/**
 * Resolve an add-op builder for the given explorer kind. Returns `null` when
 * the kind has no add semantics in this phase.
 *
 * Recognised kinds:
 * - `tag`  → enabled, ADD_TAG-shaped change.
 * - `prop` → enabled, ADD_PROPERTY-shaped change.
 * - `file`, `value`, `content`, anything else → `null` (button stays disabled).
 *
 * The builder produced for `tag`/`prop` mirrors the inline patterns already
 * present in `explorerTags.ts` (`_addTag`) and `explorerProps.ts` (`_addProp`)
 * so semantics stay identical to today's quick-action add flow. Files default
 * to an empty array because the searchbox-island is UI-only; the page shell
 * injects scope-resolved files before handing the change to the queue.
 */
export function getAddOpBuilder(explorerKind: string): AddOpBuilder | null {
	switch (explorerKind) {
		case 'tag':
			return buildTagAdd;
		case 'prop':
			return buildPropAdd;
		default:
			return null;
	}
}

function buildTagAdd(label: string): PendingChange | null {
	const trimmed = label.trim();
	if (trimmed.length === 0) return null;
	const tag = trimmed.replace(/^#+/, '');
	if (!tag) return null;
	return {
		type: 'tag',
		tag,
		action: 'add',
		details: `Add tag "#${tag}"`,
		files: [],
		customLogic: true,
		logicFunc: (_file, fm: Record<string, unknown>) => {
			const tags = Array.isArray(fm.tags)
				? fm.tags.filter((value): value is string => typeof value === 'string')
				: typeof fm.tags === 'string'
					? [fm.tags]
					: [];
			if (tags.some((value) => value.replace(/^#+/, '') === tag)) return null;
			return { tags: [...tags, tag] };
		},
	};
}

function buildPropAdd(label: string): PendingChange | null {
	const trimmed = label.trim();
	if (trimmed.length === 0) return null;
	return {
		type: 'property',
		property: trimmed,
		action: 'add',
		details: `Add property "${trimmed}"`,
		files: [],
		customLogic: true,
		logicFunc: (_file, fm) => {
			if (trimmed in fm) return null;
			return { [trimmed]: '' };
		},
	};
}
