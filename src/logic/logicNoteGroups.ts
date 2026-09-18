import type { App, TFile } from 'obsidian';
import { Notice } from 'obsidian';
import type { SortScopeKey } from '../types/typeUI';
import type { NodeGroupDef } from './logicNodeGroup';
import { parseMembershipUrn } from './logicMembershipUrn';

export type NoteGroupTargetKind = 'level' | 'parent';

export type NoteGroupTarget =
	| { kind: 'level'; level: number }
	| { kind: 'parent'; path: string };

export interface ParsedNoteGroupKey {
	scene: 'prop' | 'tag';
	group: string;
	target: NoteGroupTarget;
}

export interface NoteGroupCollision {
	key: string;
	value: unknown;
	scene: 'prop' | 'tag';
	group: string;
	target: NoteGroupTarget;
}

export interface NoteGroupResolution {
	groups: readonly NodeGroupDef[];
	memberships: Record<string, readonly string[]>;
	collisions: readonly NoteGroupCollision[];
	originalKeys: readonly string[];
}

/**
 * Canonical UTF-8 percent encoding:
 * - encodeURIComponent encodes all non-ASCII UTF-8 characters and reserved URL characters.
 * - '_' MUST be encoded as '%5F'.
 * - '%' is encoded as '%25' by encodeURIComponent.
 * - Upper-case hex digits are produced by encodeURIComponent.
 */
export function encodeNoteGroupComponent(str: string): string {
	return encodeURIComponent(str).replace(/_/g, '%5F');
}

export function decodeNoteGroupComponent(raw: string): string | null {
	if (!raw || raw.includes('_')) return null;
	try {
		const decoded = decodeURIComponent(raw);
		// Exact canonical check: re-encoding must produce the exact original raw string
		if (encodeNoteGroupComponent(decoded) !== raw) {
			return null;
		}
		return decoded;
	} catch {
		return null;
	}
}

export function encodeNoteGroupKey(
	scene: 'prop' | 'tag',
	group: string,
	target: NoteGroupTarget,
): string {
	const encGroup = encodeNoteGroupComponent(group);
	let encTarget: string;
	if (target.kind === 'level') {
		encTarget = `level${target.level}`;
	} else {
		const sep = scene === 'prop' ? ':' : '/';
		const segments = target.path.split(sep);
		encTarget = segments.map(encodeNoteGroupComponent).join(sep);
	}
	return `${scene}_${encGroup}_${encTarget}`;
}

export function parseNoteGroupKey(key: string): ParsedNoteGroupKey | null {
	let scene: 'prop' | 'tag';
	let rest: string;
	if (key.startsWith('prop_')) {
		scene = 'prop';
		rest = key.slice('prop_'.length);
	} else if (key.startsWith('tag_')) {
		scene = 'tag';
		rest = key.slice('tag_'.length);
	} else {
		return null;
	}

	// Structural separator '_' between <grupo> and <target>.
	// Since '_' inside <grupo> is encoded as '%5F', the first literal '_' in rest MUST be the separator.
	const firstSep = rest.indexOf('_');
	if (firstSep <= 0) return null;

	const rawGroup = rest.slice(0, firstSep);
	const rawTarget = rest.slice(firstSep + 1);
	if (!rawGroup || !rawTarget) return null;

	const group = decodeNoteGroupComponent(rawGroup);
	if (group === null) return null;

	// Level target: level<N> (reject negative levels or leading zeros)
	const levelMatch = /^level(-?\d+)$/.exec(rawTarget);
	if (levelMatch) {
		const rawDigits = levelMatch[1];
		const level = parseInt(rawDigits, 10);
		if (level < 0 || String(level) !== rawDigits) return null;
		return {
			scene,
			group,
			target: { kind: 'level', level },
		};
	}

	// Parent path target: path components separated by ':' (props) or '/' (tags)
	const sep = scene === 'prop' ? ':' : '/';
	const rawSegments = rawTarget.split(sep);
	if (rawSegments.length === 0 || rawSegments.some((s) => !s)) return null;

	const decodedSegments: string[] = [];
	for (const rawSeg of rawSegments) {
		const dec = decodeNoteGroupComponent(rawSeg);
		if (dec === null) return null;
		decodedSegments.push(dec);
	}

	return {
		scene,
		group,
		target: { kind: 'parent', path: decodedSegments.join(sep) },
	};
}

export function isSameTarget(a: NoteGroupTarget, b: NoteGroupTarget): boolean {
	if (a.kind !== b.kind) return false;
	if (a.kind === 'level' && b.kind === 'level') return a.level === b.level;
	if (a.kind === 'parent' && b.kind === 'parent') return a.path === b.path;
	return false;
}

export function noteGroupTargetToScope(target: NoteGroupTarget): SortScopeKey {
	if (target.kind === 'level') {
		return `level:${target.level}`;
	}
	return `parent:${target.path}`;
}

export function scopeToNoteGroupTarget(
	scope: SortScopeKey,
	drillNodeId?: string | null,
): NoteGroupTarget | null {
	if (scope === 'all') return { kind: 'level', level: 1 };
	if (scope === 'drill') {
		return drillNodeId ? { kind: 'parent', path: drillNodeId } : null;
	}
	if (scope.startsWith('level:')) {
		const num = Number(scope.slice('level:'.length));
		if (Number.isInteger(num) && num >= 0) return { kind: 'level', level: num };
	}
	if (scope.startsWith('parent:')) {
		return { kind: 'parent', path: scope.slice('parent:'.length) };
	}
	return null;
}

export function targetToString(target: NoteGroupTarget): string {
	return target.kind === 'level' ? `level:${target.level}` : `parent:${target.path}`;
}

/**
 * Stably deduplicates a list of strings, preserving the first occurrence.
 */
export function stablyDeduplicateMembers(members: readonly string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const m of members) {
		if (!seen.has(m)) {
			seen.add(m);
			out.push(m);
		}
	}
	return out;
}

/**
 * Converts the explorer's custom-group URNs into the stable member identity
 * stored by a note group.  Props at level 1 use property names; value/parent
 * targets use the value suffix from `prop:name:value`; tags use their tag path.
 */
export function noteGroupMemberIdsFromMemberships(
	urns: readonly string[],
	scene: 'prop' | 'tag',
	target: NoteGroupTarget,
): string[] {
	const ids: string[] = [];
	for (const urn of urns) {
		const ref = parseMembershipUrn(urn);
		if (!ref || ref.providerId !== `${scene}s`) continue;
		if (scene === 'tag') {
			ids.push(ref.canonicalId.replace(/^#/, ''));
			continue;
		}
		if (ref.kind === 'value' && (target.kind === 'parent' || target.level !== 1)) {
			const separator = ref.canonicalId.indexOf(':');
			ids.push(separator >= 0 ? ref.canonicalId.slice(separator + 1) : ref.canonicalId);
		} else {
			ids.push(ref.canonicalId);
		}
	}
	return stablyDeduplicateMembers(ids);
}

/**
 * Parses frontmatter note groups for a given scene and optional target.
 * Reserved namespace check: if a matching key has a non-list value, it is recorded as a collision.
 */
export function parseFrontmatterNoteGroups(
	frontmatter: Record<string, unknown> | null | undefined,
	scene: 'prop' | 'tag',
	target?: NoteGroupTarget,
): NoteGroupResolution {
	if (!frontmatter || typeof frontmatter !== 'object') {
		return { groups: [], memberships: {}, collisions: [], originalKeys: [] };
	}

	const groups: NodeGroupDef[] = [];
	const memberships: Record<string, string[]> = {};
	const collisions: NoteGroupCollision[] = [];
	const originalKeys: string[] = [];

	for (const key of Object.keys(frontmatter)) {
		const parsed = parseNoteGroupKey(key);
		if (!parsed || parsed.scene !== scene) continue;
		if (target && !isSameTarget(parsed.target, target)) continue;

		const value = frontmatter[key];
		if (Array.isArray(value)) {
			originalKeys.push(key);
			// Dedup stably for projection
			const rawStrings = (value as unknown[]).map(String);
			const members = stablyDeduplicateMembers(rawStrings);
			groups.push({
				id: parsed.group,
				flavor: 'note',
				label: parsed.group,
				parentId: null,
				scope: noteGroupTargetToScope(parsed.target),
			});
			memberships[parsed.group] = members;
		} else {
			// Reserved grammar namespace collision: non-list value
			collisions.push({
				key,
				value,
				scene: parsed.scene,
				group: parsed.group,
				target: parsed.target,
			});
		}
	}

	return { groups, memberships, collisions, originalKeys };
}

/**
 * Checks for any collision in frontmatter for the given scene and optional target.
 */
export function detectCollisions(
	frontmatter: Record<string, unknown> | null | undefined,
	scene: 'prop' | 'tag',
	target?: NoteGroupTarget,
): readonly NoteGroupCollision[] {
	return parseFrontmatterNoteGroups(frontmatter, scene, target).collisions;
}

/**
 * Checks if custom groups and note groups are mutually exclusive on a given target.
 * Returns true if target cannot have both.
 */
export function isTargetExclusive(
	target: NoteGroupTarget,
	activeKind: 'custom' | 'note',
): { activeKind: 'custom' | 'note'; target: NoteGroupTarget } {
	return { activeKind, target };
}

// Queue per file path to serialize edits per note
const fileWriteQueues = new Map<string, Promise<unknown>>();

export interface NoteGroupWriteRequest {
	app: App;
	file: TFile;
	scene: 'prop' | 'tag';
	target: NoteGroupTarget;
	groups: readonly { name: string; members: readonly string[] }[];
	onRetry?: () => Promise<void>;
}

export interface NoteGroupWriteResult {
	ok: boolean;
	error?: string;
	collisions?: readonly NoteGroupCollision[];
	retry?: () => Promise<NoteGroupWriteResult>;
}

/**
 * Edits note groups in frontmatter through FileManager.processFrontMatter.
 * - Serialized per note.
 * - Fails closed on collision, error, or divergent re-read.
 * - Preserves unrelated keys.
 * - Stably deduplicates members before writing.
 */
export async function writeNoteGroups(
	request: NoteGroupWriteRequest,
): Promise<NoteGroupWriteResult> {
	const { app, file, scene, target, groups } = request;

	const prevPromise = fileWriteQueues.get(file.path) ?? Promise.resolve();

	const operation = async (): Promise<NoteGroupWriteResult> => {
		// 1. Read most recent frontmatter from cache
		const curCache = app.metadataCache.getFileCache(file);
		const curFm = (curCache?.frontmatter ?? {}) as Record<string, unknown>;

		// 2. Check collisions
		const existingCollisions = detectCollisions(curFm, scene, target);
		if (existingCollisions.length > 0) {
			const err = `Note group collision: key "${existingCollisions[0].key}" exists with non-list value.`;
			new Notice(err);
			return { ok: false, error: err, collisions: existingCollisions };
		}

		// Also check if any calculated new key already exists with non-list value
		for (const g of groups) {
			const k = encodeNoteGroupKey(scene, g.name, target);
			if (k in curFm && !Array.isArray(curFm[k])) {
				const col: NoteGroupCollision = {
					key: k,
					value: curFm[k],
					scene,
					group: g.name,
					target,
				};
				const err = `Note group collision: target key "${k}" exists with non-list value.`;
				new Notice(err);
				return { ok: false, error: err, collisions: [col] };
			}
		}

		// 3. Prepare expected entries with stably deduplicated members
		const expectedEntries = new Map<string, string[]>();
		for (const g of groups) {
			const k = encodeNoteGroupKey(scene, g.name, target);
			expectedEntries.set(k, stablyDeduplicateMembers(g.members));
		}

		// 4. Edit frontmatter through Obsidian FileManager.processFrontMatter.
		// Re-check inside the callback: metadataCache can lag another editor, while
		// the callback receives the frontmatter Obsidian is about to persist.
		let callbackCollision: NoteGroupCollision | undefined;
		try {
			await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				const currentCollisions = detectCollisions(fm, scene, target);
				if (currentCollisions.length > 0) {
					callbackCollision = currentCollisions[0];
					return;
				}
				for (const g of groups) {
					const k = encodeNoteGroupKey(scene, g.name, target);
					if (k in fm && !Array.isArray(fm[k])) {
						callbackCollision = {
							key: k,
							value: fm[k],
							scene,
							group: g.name,
							target,
						};
						return;
					}
				}
				// Delete all existing managed keys for this scene and target
				for (const k of Object.keys(fm)) {
					const parsed = parseNoteGroupKey(k);
					if (parsed && parsed.scene === scene && isSameTarget(parsed.target, target)) {
						delete fm[k];
					}
				}
				// Write updated keys
				for (const [k, members] of expectedEntries) {
					fm[k] = [...members];
				}
			});
		} catch (err) {
			const msg = `Failed to write note groups to frontmatter: ${String(err)}`;
			new Notice(msg);
			return {
				ok: false,
				error: msg,
				retry: () => writeNoteGroups(request),
			};
		}
		if (callbackCollision) {
			const msg = `Note group collision: key "${callbackCollision.key}" exists with non-list value.`;
			new Notice(msg);
			return { ok: false, error: msg, collisions: [callbackCollision] };
		}

		// 5. Re-read after write and verify
		const rereadCache = app.metadataCache.getFileCache(file);
		const rereadFm = (rereadCache?.frontmatter ?? {}) as Record<string, unknown>;

		let divergent = false;
		for (const [k, expectedList] of expectedEntries) {
			const actual = rereadFm[k];
			if (!Array.isArray(actual)) {
				divergent = true;
				break;
			}
			if (
				actual.length !== expectedList.length ||
				!actual.every((val, i) => String(val) === expectedList[i])
			) {
				divergent = true;
				break;
			}
		}

		// Ensure old managed keys for this target that were deleted are not in rereadFm
		for (const k of Object.keys(rereadFm)) {
			const parsed = parseNoteGroupKey(k);
			if (parsed && parsed.scene === scene && isSameTarget(parsed.target, target)) {
				if (!expectedEntries.has(k)) {
					divergent = true;
					break;
				}
			}
		}

		if (divergent) {
			const msg = `Frontmatter re-read diverged from expected note group state for ${file.path}`;
			new Notice(msg);
			return {
				ok: false,
				error: msg,
				retry: () => writeNoteGroups(request),
			};
		}

		return { ok: true };
	};

	const execution = prevPromise.then(operation, operation);
	fileWriteQueues.set(file.path, execution);
	return execution;
}

/**
 * Updates note group list members and parent target keys upon property/value/tag rename.
 * Modifies fm in place and returns true if any modification was made.
 */
export function updateNoteGroupMembersOnRename(
	fm: Record<string, unknown>,
	scene: 'prop' | 'tag',
	oldName: string,
	newName: string,
	target?: NoteGroupTarget,
): boolean {
	let changed = false;
	const keysToRename: { oldKey: string; newKey: string; value: unknown }[] = [];

	for (const key of Object.keys(fm)) {
		const parsed = parseNoteGroupKey(key);
		if (!parsed || parsed.scene !== scene) continue;
		if (target && !isSameTarget(parsed.target, target)) continue;

		// 1. If member of list matches oldName, update it
		const val = fm[key];
		if (Array.isArray(val)) {
			let listModified = false;
			const updatedList = (val as unknown[]).map((m) => {
				const str = String(m);
				if (scene === 'tag') {
					const clean = str.startsWith('#') ? str.slice(1) : str;
					if (clean === oldName) {
						listModified = true;
						return str.startsWith('#') ? `#${newName}` : newName;
					}
				} else {
					if (str === oldName) {
						listModified = true;
						return newName;
					}
				}
				return m;
			});
			if (listModified) {
				fm[key] = updatedList;
				changed = true;
			}
		}

		// 2. If parent target path matches oldName, key itself needs renaming
		if (parsed.target.kind === 'parent') {
			const sep = scene === 'prop' ? ':' : '/';
			const curPath = parsed.target.path;
			let newPath: string | null = null;
			if (curPath === oldName) {
				newPath = newName;
			} else if (curPath.startsWith(oldName + sep)) {
				newPath = newName + curPath.slice(oldName.length);
			} else {
				const segments = curPath.split(sep);
				let pathChanged = false;
				const newSegments = segments.map((seg) => {
					if (seg === oldName) {
						pathChanged = true;
						return newName;
					}
					return seg;
				});
				if (pathChanged) {
					newPath = newSegments.join(sep);
				}
			}
			if (newPath !== null && newPath !== curPath) {
				const newTarget: NoteGroupTarget = {
					kind: 'parent',
					path: newPath,
				};
				const newKey = encodeNoteGroupKey(scene, parsed.group, newTarget);
				keysToRename.push({ oldKey: key, newKey, value: fm[key] });
			}
		}
	}

	for (const { oldKey, newKey, value } of keysToRename) {
		if (oldKey === newKey) continue;
		const existing = fm[newKey];
		delete fm[oldKey];
		if (Array.isArray(existing) && Array.isArray(value)) {
			fm[newKey] = Array.from(new Set([...existing, ...value]));
		} else if (Array.isArray(existing) && !Array.isArray(value)) {
			// Preserve preexisting members; do not overwrite an array with a collision value.
			// Re-read the merged value if the renamed value is a list-like collision edge.
			fm[newKey] = existing;
		} else {
			fm[newKey] = value;
		}
		changed = true;
	}

	return changed;
}
