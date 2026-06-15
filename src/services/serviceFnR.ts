import {
	FIND_REPLACE_CONTENT,
	NATIVE_RENAME_PROP,
	RENAME_FILE,
	type ContentChange,
	type PendingChange,
} from '../types/typeOps';
import { fnrContentReplaceLabel, fnrContentReplaceScopeCount } from '../logic/logicFnR';
import { buildFileRenameChange, normalizeFileRenameTarget } from './serviceFileQueue';
import { buildTagRenameChange } from './serviceTagQueue';
import type {
	BuildContentReplaceChangeInput,
	ActiveFnRRenameHandoff,
	FnRPattern,
	FnRRenameHandoff,
	FnRState,
	FnRSyntax,
	FnRSyntaxOption,
	StartFileRenameHandoffInput,
	StartPropRenameHandoffInput,
	StartTagRenameHandoffInput,
	StartValueRenameHandoffInput,
} from '../types/typeFnR';

export const FNR_SYNTAX_OPTIONS: FnRSyntaxOption[] = [
	{
		id: 'plain',
		label: 'Plain',
		description: 'Literal text matching.',
		canReplaceContent: true,
	},
	{
		id: 'regex',
		label: 'Regex',
		description: 'JavaScript regular expression matching.',
		canReplaceContent: true,
	},
	{
		id: 'obsidian-search',
		label: 'Obsidian',
		description: 'Core Search operators such as file:, path:, tag:, and property filters.',
		canReplaceContent: false,
	},
	{
		id: 'obsidian-bases',
		label: 'Bases',
		description: 'Bases filter/formula expressions.',
		canReplaceContent: false,
	},
	{
		id: 'dataview-dql',
		label: 'Dataview',
		description: 'Dataview DQL expressions.',
		canReplaceContent: false,
	},
	{
		id: 'ant-renamer',
		label: 'Ant',
		description: 'Ant Renamer style regex with numbered replacement groups.',
		canReplaceContent: true,
	},
];

export function createFnRState(): FnRState {
	return {
		expanded: false,
		replace: '',
		syntax: 'plain',
		caseSensitive: false,
		wholeWord: false,
		scope: 'filtered',
		rename: createInactiveRenameHandoff(),
	};
}

export function createInactiveRenameHandoff(): FnRRenameHandoff {
	return { status: 'inactive' };
}

export function startPropRenameHandoff(
	state: FnRState,
	input: StartPropRenameHandoffInput,
): FnRState {
	return {
		...state,
		expanded: true,
		replace: '',
		scope: input.scope,
		rename: {
			status: 'editing',
			sourceKind: 'prop',
			original: input.propName,
			replacement: '',
			propName: input.propName,
			files: [...input.files],
			scope: input.scope,
		},
	};
}

export function startValueRenameHandoff(
	state: FnRState,
	input: StartValueRenameHandoffInput,
): FnRState {
	return {
		...state,
		expanded: true,
		replace: '',
		scope: input.scope,
		rename: {
			status: 'editing',
			sourceKind: 'value',
			original: input.oldValue,
			replacement: '',
			propName: input.propName,
			oldValue: input.oldValue,
			files: [...input.files],
			scope: input.scope,
		},
	};
}

export function startTagRenameHandoff(
	state: FnRState,
	input: StartTagRenameHandoffInput,
): FnRState {
	return {
		...state,
		expanded: true,
		replace: '',
		scope: input.scope,
		rename: {
			status: 'editing',
			sourceKind: 'tag',
			original: input.tagPath,
			replacement: '',
			files: [...input.files],
			scope: input.scope,
		},
	};
}

export function startFileRenameHandoff(
	state: FnRState,
	input: StartFileRenameHandoffInput,
): FnRState {
	const firstFile = input.files[0];
	return {
		...state,
		expanded: true,
		replace: '',
		scope: input.scope,
		rename: {
			status: 'editing',
			sourceKind: 'file',
			original: firstFile?.name ?? '',
			replacement: '',
			files: [...input.files],
			scope: input.scope,
		},
	};
}

export function updateRenameHandoffReplacement(state: FnRState, replacement: string): FnRState {
	const rename = state.rename;
	if (!isActiveRenameHandoff(rename)) return state;
	const trimmed = replacement.trim();
	return {
		...state,
		replace: replacement,
		rename: {
			...rename,
			replacement,
			status: trimmed && trimmed !== rename.original ? 'ready' : 'editing',
		},
	};
}

export function cancelRenameHandoff(state: FnRState): FnRState {
	return { ...state, rename: { status: 'cancelled' } };
}

export function markRenameHandoffQueued(state: FnRState): FnRState {
	return { ...state, rename: { status: 'queued' } };
}

export function buildRenameHandoffChange(handoff: FnRRenameHandoff): PendingChange | null {
	if (!isActiveRenameHandoff(handoff) || handoff.status !== 'ready') return null;
	const replacement = handoff.replacement.trim();
	if (!replacement || replacement === handoff.original || handoff.files.length === 0) return null;

	if (handoff.sourceKind === 'prop' && handoff.propName) {
		return buildPropRenameChange(handoff, replacement);
	}
	if (handoff.sourceKind === 'value' && handoff.propName && handoff.oldValue != null) {
		return buildValueRenameChange(handoff, replacement);
	}
	if (handoff.sourceKind === 'tag') {
		return buildTagRenameChange(handoff.original, replacement, [...handoff.files]);
	}
	if (handoff.sourceKind === 'file') {
		return buildFileRenameHandoffChange(handoff, replacement);
	}
	return null;
}

export function resolveFnRPattern(
	find: string,
	state: Pick<FnRState, 'syntax' | 'wholeWord'>,
): FnRPattern {
	const trimmed = find.trim();
	if (state.syntax === 'regex' || state.syntax === 'ant-renamer') {
		return { pattern: trimmed, isRegex: true };
	}
	if (state.wholeWord) {
		return { pattern: String.raw`\b${escapeRegex(trimmed)}\b`, isRegex: true };
	}
	return { pattern: trimmed, isRegex: false };
}

export function normalizeAntReplacement(replacement: string): string {
	return replacement.replace(/\$0+([1-9]\d?)/g, '$$$1');
}

export function canReplaceContent(syntax: FnRSyntax): boolean {
	return FNR_SYNTAX_OPTIONS.find((option) => option.id === syntax)?.canReplaceContent ?? false;
}

export function buildContentReplaceChange(
	input: BuildContentReplaceChangeInput,
): ContentChange | null {
	const find = input.find.trim();
	if (!find || input.files.length === 0 || !canReplaceContent(input.state.syntax)) return null;

	const pattern = resolveFnRPattern(find, input.state);
	const replacement =
		input.state.syntax === 'ant-renamer'
			? normalizeAntReplacement(input.state.replace)
			: input.state.replace;
	const files = [...input.files];
	const fileCount = fnrContentReplaceScopeCount(files);

	return {
		type: 'content_replace',
		action: 'replace',
		details: fnrContentReplaceLabel(find, replacement, fileCount),
		files,
		find,
		replace: replacement,
		isRegex: pattern.isRegex,
		caseSensitive: input.state.caseSensitive,
		customLogic: true,
		logicFunc: () => ({
			[FIND_REPLACE_CONTENT]: {
				pattern: pattern.pattern,
				replacement,
				isRegex: pattern.isRegex,
				caseSensitive: input.state.caseSensitive,
			},
		}),
	};
}

function buildPropRenameChange(
	handoff: ActiveFnRRenameHandoff,
	replacement: string,
): PendingChange {
	const propName = handoff.propName ?? handoff.original;
	const files = [...handoff.files];
	return {
		type: 'property',
		property: propName,
		action: 'rename',
		details: `Rename property "${propName}" to "${replacement}"`,
		files,
		customLogic: true,
		logicFunc: () => {
			return {
				[NATIVE_RENAME_PROP]: {
					oldName: propName,
					newName: replacement,
				},
			};
		},
	};
}

function buildValueRenameChange(
	handoff: ActiveFnRRenameHandoff,
	replacement: string,
): PendingChange {
	const propName = handoff.propName ?? '';
	const oldValue = handoff.oldValue ?? handoff.original;
	const files = [...handoff.files];
	return {
		type: 'property',
		property: propName,
		action: 'set',
		details: `Rename value "${oldValue}" to "${replacement}"`,
		files,
		value: replacement,
		oldValue,
		customLogic: true,
		logicFunc: (_file, fm) => {
			const actualKey = frontmatterKey(fm, propName);
			if (!actualKey) return null;
			return replaceValueUpdate(actualKey, fm[actualKey], oldValue, replacement);
		},
	};
}

function buildFileRenameHandoffChange(
	handoff: ActiveFnRRenameHandoff,
	replacement: string,
): PendingChange | null {
	const files = [...handoff.files];
	if (files.length === 0) return null;
	const single = buildFileRenameChange(files[0], replacement);
	if (!single) return null;
	if (files.length === 1) return single;
	return {
		...single,
		details: `Rename ${files.length} files to "${replacement}"`,
		files,
		logicFunc: (file) => {
			const targetName = normalizeFileRenameTarget(file, replacement);
			if (!targetName || targetName === file.name) return null;
			return { [RENAME_FILE]: targetName };
		},
	};
}

function isActiveRenameHandoff(handoff: FnRRenameHandoff): handoff is ActiveFnRRenameHandoff {
	return handoff.status === 'editing' || handoff.status === 'ready';
}

function frontmatterKey(fm: Record<string, unknown>, propName: string): string | null {
	const expected = propName.toLowerCase();
	return Object.keys(fm).find((key) => key.toLowerCase() === expected) ?? null;
}

function replaceValueUpdate(
	propName: string,
	current: unknown,
	oldValue: string,
	newValue: string,
): Record<string, unknown> | null {
	if (Array.isArray(current)) {
		if (!valueContains(current, oldValue)) return null;
		const values = current as unknown[];
		return {
			[propName]: values.map((item): unknown =>
				valueToString(item) === oldValue ? newValue : item,
			),
		};
	}
	if (valueToString(current) !== oldValue) return null;
	return { [propName]: newValue };
}

function valueContains(value: unknown, needle: string): boolean {
	if (Array.isArray(value))
		return (value as unknown[]).some((item) => valueToString(item) === needle);
	return valueToString(value) === needle;
}

function valueToString(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}
	return JSON.stringify(value) ?? '';
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
