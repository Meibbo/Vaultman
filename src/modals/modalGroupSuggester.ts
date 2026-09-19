import { FuzzySuggestModal, type App } from 'obsidian';
import { parseMembershipUrn } from '../logic/logicMembershipUrn';
import { canAddMember, canNest, type NodeGroupDef } from '../logic/logicNodeGroup';

export type GroupBatchRejectReason =
	| 'would-create-cycle'
	| 'preset-is-terminal'
	| 'foreign-provider'
	| 'unparsable'
	| 'member-rejected';

export interface GroupBatchFailedPair {
	origin: string;
	into: string;
	reason: GroupBatchRejectReason;
}

export type GroupBatchPlan =
	| {
			ok: true;
			next: Record<string, readonly string[]>;
			added: string[];
	  }
	| {
			ok: false;
			failedPairs: GroupBatchFailedPair[];
	  };

function identityOf(urn: string): string | null {
	const ref = parseMembershipUrn(urn);
	if (!ref) return null;
	return `${ref.providerId}:${ref.kind}:${ref.canonicalId}`;
}

/**
 * U130 Slice B (spec-03 §41-50): atomic add-members planner.
 *
 * Origins are membership URNs (`providerId:kind:canonicalId|label`). Foreign
 * provider URNs never match nor count (defence, same guard as the projection).
 * Dedup is by `canonicalId` identity (nodemovemode §11.6): an origin already
 * present is skipped, not duplicated. `canNest`/`canAddMember` gate before
 * anything is written, and ANY failing origin rejects the WHOLE batch with
 * the pairs that failed — no partial writes.
 */
export function planGroupMembershipBatch(args: {
	memberships: Readonly<Record<string, readonly string[]>>;
	targetId: string;
	origins: readonly string[];
	groups: readonly NodeGroupDef[];
	providerId: string;
}): GroupBatchPlan {
	const { memberships, targetId, origins, groups, providerId } = args;
	const target = groups.find((group) => group.id === targetId) ?? null;
	if (target && target.flavor !== 'custom') {
		return {
			ok: false,
			failedPairs: origins.map((origin) => ({
				origin,
				into: targetId,
				reason: 'preset-is-terminal',
			})),
		};
	}
	const targetDef: NodeGroupDef = target ?? {
		id: targetId,
		flavor: 'custom',
		label: targetId,
		parentId: null,
		scope: 'all',
	};
	const existing = memberships[targetId] ?? [];
	const known = new Set<string>();
	for (const urn of existing) {
		const key = identityOf(urn);
		if (key) known.add(key);
	}
	const failedPairs: GroupBatchFailedPair[] = [];
	const toAdd: string[] = [];
	const seenBatch = new Set<string>();
	for (const origin of origins) {
		const ref = parseMembershipUrn(origin);
		if (!ref) {
			failedPairs.push({ origin, into: targetId, reason: 'unparsable' });
			continue;
		}
		if (ref.providerId !== providerId) {
			failedPairs.push({ origin, into: targetId, reason: 'foreign-provider' });
			continue;
		}
		if (!canAddMember(targetDef, { kind: ref.kind })) {
			failedPairs.push({ origin, into: targetId, reason: 'member-rejected' });
			continue;
		}
		// An origin that names a group nests it; anything else just joins.
		if (groups.some((group) => group.id === ref.canonicalId)) {
			const verdict = canNest(groups, ref.canonicalId, targetId);
			if (!verdict.ok) {
				failedPairs.push({ origin, into: targetId, reason: verdict.reason });
				continue;
			}
		}
		const key = `${ref.providerId}:${ref.kind}:${ref.canonicalId}`;
		if (known.has(key) || seenBatch.has(key)) continue;
		seenBatch.add(key);
		toAdd.push(origin);
	}
	if (failedPairs.length > 0) return { ok: false, failedPairs };
	return {
		ok: true,
		next: { ...memberships, [targetId]: [...existing, ...toAdd] },
		added: toAdd,
	};
}

export interface GroupSuggesterTarget {
	id: string;
	label: string;
	flavor: 'preset' | 'custom' | 'note';
	hidden?: boolean;
}

/**
 * Crear-o-añadir suggester: presets + customs of the active scene. Picking an
 * existing group resolves `{ kind: 'existing', id }`; dismissing resolves
 * `null` so the caller falls back to the new-name prompt. No silent
 * fallback: dismissal is an explicit null, never an invented target.
 */
export function openGroupSuggester(
	app: App,
	targets: readonly GroupSuggesterTarget[],
	placeholder: string,
): Promise<{ kind: 'existing'; id: string } | null> {
	class GroupSuggesterModal extends FuzzySuggestModal<GroupSuggesterTarget> {
		private resolve: (
			value: { kind: 'existing'; id: string } | null,
		) => void = () => undefined;
		wait(): Promise<{ kind: 'existing'; id: string } | null> {
			return new Promise((resolve) => {
				this.resolve = resolve;
			});
		}
		getItems(): GroupSuggesterTarget[] {
			return [...targets];
		}
		getItemText(item: GroupSuggesterTarget): string {
			return item.label;
		}
		onChooseItem(item: GroupSuggesterTarget): void {
			this.resolve({ kind: 'existing', id: item.id });
		}
		onClose(): void {
			super.onClose();
			this.resolve(null);
		}
	}
	const modal = new GroupSuggesterModal(app);
	modal.setPlaceholder(placeholder);
	modal.open();
	return modal.wait();
}
