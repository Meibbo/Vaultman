import type { TFile } from 'obsidian';
import type { FnRScope } from '../types/typeFnR';

export type OperationScope = 'auto' | 'selected' | 'filtered';
export type LegacyOperationScope = OperationScope | 'all' | null | undefined;

export interface ResolveOperationScopeFilesInput {
	scope: LegacyOperationScope;
	selectedFiles: readonly TFile[];
	filteredFiles: readonly TFile[];
}

export function normalizeOperationScope(scope: LegacyOperationScope): OperationScope {
	if (scope === 'selected' || scope === 'filtered') return scope;
	return 'auto';
}

export function resolveOperationScopeFiles(input: ResolveOperationScopeFilesInput): TFile[] {
	const selectedFiles = [...input.selectedFiles];
	const filteredFiles = [...input.filteredFiles];
	const scope = normalizeOperationScope(input.scope);

	if (scope === 'selected') return selectedFiles;
	if (scope === 'filtered') return filteredFiles;
	if (selectedFiles.length > 0) return selectedFiles;
	if (filteredFiles.length > 0) return filteredFiles;
	return [];
}

export function operationScopeToFnRScope(scope: LegacyOperationScope): FnRScope {
	return normalizeOperationScope(scope) === 'selected' ? 'selected' : 'filtered';
}
