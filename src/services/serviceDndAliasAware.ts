// Pure helpers for alias-aware drag/drop semantics.
// These do not replace the existing DnD pipeline in serviceDnd.ts; they
// provide the contract for resolving drop effects based on the source's
// alias kind and the target's role.
//
// Owned by Thread 4 of the UI modernization plan.

import {
	aliasForPluginId,
	aliasForSnippetFile,
	aliasForTag,
} from './serviceAliasTokens';

export type AliasDragKind =
	| 'file'
	| 'folder'
	| 'tag'
	| 'property'
	| 'snippet'
	| 'plugin'
	| 'adopted-header'
	| 'adopted-task'
	| 'adopted-block';

export interface AliasDragSource {
	kind: AliasDragKind;
	label: string;
	parentPath?: string;
	blockId?: string;
}

export interface AliasDropTarget {
	kind: 'editor' | 'note' | 'frontmatter' | 'tab';
	path?: string;
}

export interface AliasModifiers {
	alt: boolean;
	shift: boolean;
	ctrl: boolean;
	meta: boolean;
}

export type AliasDropEffect =
	| { kind: 'insert-text'; text: string }
	| { kind: 'inject-frontmatter'; property: string; targetPath: string }
	| { kind: 'move-block'; fromPath: string; toPath: string; blockId: string }
	| { kind: 'open' };

export function formatDropPayload(input: {
	source: AliasDragSource;
	modifiers: AliasModifiers;
}): string {
	const { source, modifiers } = input;
	if (source.kind === 'file' || source.kind === 'folder') {
		const label = source.label;
		return modifiers.shift ? `![[${label}]]` : `[[${label}]]`;
	}
	if (source.kind === 'tag') return aliasForTag(source.label);
	if (source.kind === 'snippet') return aliasForSnippetFile(source.label);
	if (source.kind === 'plugin') return aliasForPluginId(source.label);
	return source.label;
}

export function resolveDropEffect(input: {
	source: AliasDragSource;
	target: AliasDropTarget;
	modifiers?: AliasModifiers;
}): AliasDropEffect {
	const { source, target } = input;
	const modifiers = input.modifiers ?? { alt: false, shift: false, ctrl: false, meta: false };

	if (source.kind === 'property' && target.kind === 'note' && target.path) {
		const property = source.label.replace(/^\[|\]$/g, '');
		return { kind: 'inject-frontmatter', property, targetPath: target.path };
	}

	if (
		source.kind === 'adopted-block' &&
		target.kind === 'note' &&
		target.path &&
		source.parentPath &&
		source.blockId
	) {
		return {
			kind: 'move-block',
			fromPath: source.parentPath,
			toPath: target.path,
			blockId: source.blockId,
		};
	}

	if (target.kind === 'editor' || target.kind === 'note') {
		return {
			kind: 'insert-text',
			text: formatDropPayload({ source, modifiers }),
		};
	}

	return { kind: 'open' };
}
