import type { TFile } from 'obsidian';
import type { FnRScope } from '../types/typeFnR';

export type OperationScope = 'auto' | 'selected' | 'filtered';
export type LegacyOperationScope = OperationScope | 'all' | null | undefined;

export interface ResolveOperationScopeFilesInput {
	scope: LegacyOperationScope;
	selectedFiles: readonly TFile[];
	filteredFiles: readonly TFile[];
	visibleFiles?: readonly TFile[];
}

export type OperationScopeSource = 'selected' | 'filtered' | 'empty';

export interface ResolvedOperationScopeFiles {
	scope: OperationScope;
	source: OperationScopeSource;
	files: TFile[];
	selectedCount: number;
	visibleCount: number;
	staleSelectedFiles: TFile[];
}

export function normalizeOperationScope(scope: LegacyOperationScope): OperationScope {
	if (scope === 'selected' || scope === 'filtered') return scope;
	return 'auto';
}

export function resolveOperationScopeFiles(input: ResolveOperationScopeFilesInput): TFile[] {
	return resolveVerifiedOperationScopeFiles(input).files;
}

export function resolveVerifiedOperationScopeFiles(
	input: ResolveOperationScopeFilesInput,
): ResolvedOperationScopeFiles {
	const selectedFiles = [...input.selectedFiles];
	const filteredFiles = [...input.filteredFiles];
	const visibleFiles = [...(input.visibleFiles ?? input.filteredFiles)];
	const visiblePaths = new Set(visibleFiles.map((file) => file.path));
	const scope = normalizeOperationScope(input.scope);
	const visibleSelectedFiles = selectedFiles.filter((file) => visiblePaths.has(file.path));
	const staleSelectedFiles = selectedFiles.filter((file) => !visiblePaths.has(file.path));
	const visibleFilteredFiles = filteredFiles.filter((file) => visiblePaths.has(file.path));

	if (scope === 'selected') {
		return buildResolvedScope(scope, 'selected', visibleSelectedFiles, selectedFiles, visibleFiles, staleSelectedFiles);
	}
	if (scope === 'filtered') {
		return buildResolvedScope(scope, 'filtered', visibleFilteredFiles, selectedFiles, visibleFiles, staleSelectedFiles);
	}
	if (visibleSelectedFiles.length > 0) {
		return buildResolvedScope(scope, 'selected', visibleSelectedFiles, selectedFiles, visibleFiles, staleSelectedFiles);
	}
	if (visibleFilteredFiles.length > 0) {
		return buildResolvedScope(scope, 'filtered', visibleFilteredFiles, selectedFiles, visibleFiles, staleSelectedFiles);
	}
	return buildResolvedScope(scope, 'empty', [], selectedFiles, visibleFiles, staleSelectedFiles);
}

export function operationScopeToFnRScope(scope: LegacyOperationScope): FnRScope {
	return normalizeOperationScope(scope) === 'selected' ? 'selected' : 'filtered';
}

function buildResolvedScope(
	scope: OperationScope,
	source: OperationScopeSource,
	files: TFile[],
	selectedFiles: TFile[],
	visibleFiles: TFile[],
	staleSelectedFiles: TFile[],
): ResolvedOperationScopeFiles {
	return {
		scope,
		source,
		files,
		selectedCount: selectedFiles.length,
		visibleCount: visibleFiles.length,
		staleSelectedFiles,
	};
}
