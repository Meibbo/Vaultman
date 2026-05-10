import type { TFile } from 'obsidian';
import type { NodeBase } from '../types/typeContracts';
import type { PendingChange } from '../types/typeOps';
import {
	resolveVerifiedOperationScopeFiles,
	type LegacyOperationScope,
} from './serviceOperationScope';

export type ServiceAPIRisk = 'non_destructive' | 'destructive';

export interface ServiceAPIIndexLike<TNode extends NodeBase = NodeBase> {
	readonly nodes?: readonly TNode[];
	readonly revision?: number;
}

export interface ServiceAPIFilterServiceLike {
	readonly filteredFiles?: readonly TFile[];
	readonly selectedFiles?: readonly TFile[];
	readonly visibleFiles?: readonly TFile[];
}

export interface ServiceAPIQueueLike {
	readonly pending?: readonly PendingChange[];
	readonly size?: number;
	add(change: PendingChange): void;
}

export interface ServiceAPIHost {
	readonly filesIndex?: ServiceAPIIndexLike;
	readonly tagsIndex?: ServiceAPIIndexLike;
	readonly propsIndex?: ServiceAPIIndexLike;
	readonly contentIndex?: ServiceAPIIndexLike;
	readonly operationsIndex?: ServiceAPIIndexLike;
	readonly activeFiltersIndex?: ServiceAPIIndexLike;
	readonly filterService?: ServiceAPIFilterServiceLike;
	readonly queueService: ServiceAPIQueueLike;
	readonly settings?: {
		readonly explorerOperationScope?: LegacyOperationScope;
	};
}

export interface ServiceAPIValidationError {
	code: string;
	message: string;
	target?: string;
	path?: string;
}

export interface ServiceAPICounts {
	files: number;
	tags: number;
	props: number;
	content: number;
	operations: number;
	activeFilters: number;
	queue: number;
	scopeFiles: number;
	selectedFiles: number;
	visibleFiles: number;
	changes: number;
	targetFiles: number;
	affectedNodes: number;
}

export interface ServiceAPIIndexHealth {
	name: 'files' | 'tags' | 'props' | 'content' | 'operations' | 'activeFilters';
	count: number;
	revision: number | null;
	stale: boolean;
}

export interface ServiceAPIScopeSummary {
	scope: 'auto' | 'selected' | 'filtered';
	source: 'selected' | 'filtered' | 'empty';
	paths: string[];
	selectedCount: number;
	visibleCount: number;
	staleSelectedPaths: string[];
}

export interface ServiceAPIResponseBase {
	counts: ServiceAPICounts;
	affectedPaths: string[];
	affectedNodeIds: string[];
	validationErrors: ServiceAPIValidationError[];
	rollbackLimits: string[];
	summary: string;
}

export interface ServiceAPIReadResponse extends ServiceAPIResponseBase {
	indexes: ServiceAPIIndexHealth[];
	scope: ServiceAPIScopeSummary;
}

export interface ServiceAPIPlanRequest {
	changes: PendingChange | PendingChange[];
	label?: string;
}

export interface ServiceAPIPlan extends ServiceAPIResponseBase {
	id: string;
	label?: string;
	changes: PendingChange[];
	risk: ServiceAPIRisk;
	requiresConfirmation: boolean;
	queueable: boolean;
}

export interface ServiceAPIEnqueueOptions {
	confirmed?: boolean;
}

export interface ServiceAPIEnqueueResponse extends ServiceAPIResponseBase {
	queued: number;
	plan: ServiceAPIPlan;
}

const ROLLBACK_LIMITS = [
	'Queued changes can be removed before execution.',
	'After queue execution, rollback is manual from Obsidian or file history.',
];

export class ServiceAPI {
	private planCounter = 0;

	constructor(private readonly host: ServiceAPIHost) {}

	read(): ServiceAPIReadResponse {
		const indexes = this.indexHealth();
		const scope = this.scopeSummary();
		const validationErrors = indexes
			.filter((index) => index.stale)
			.map((index) => ({
				code: 'index_revision_unknown',
				target: index.name,
				message: `${index.name} index revision is unknown`,
			}));

		return {
			counts: this.counts({ scope }),
			affectedPaths: scope.paths,
			affectedNodeIds: [],
			validationErrors,
			rollbackLimits: [...ROLLBACK_LIMITS],
			summary: `Read ${formatCount(scope.paths.length, 'scoped file')}`,
			indexes,
			scope,
		};
	}

	plan(request: ServiceAPIPlanRequest): ServiceAPIPlan {
		const changes = Array.isArray(request.changes) ? [...request.changes] : [request.changes];
		const validationErrors = this.validateChanges(changes);
		const affectedPaths = uniquePaths(changes.flatMap((change) => change.files ?? []));
		const risk: ServiceAPIRisk = changes.some(isDestructiveChange)
			? 'destructive'
			: 'non_destructive';
		const queueable = validationErrors.length === 0;

		return {
			id: `service-api-plan-${++this.planCounter}`,
			label: request.label,
			changes,
			risk,
			requiresConfirmation: risk === 'destructive',
			queueable,
			counts: this.counts({
				changes: changes.length,
				targetFiles: affectedPaths.length,
			}),
			affectedPaths,
			affectedNodeIds: [],
			validationErrors,
			rollbackLimits: [...ROLLBACK_LIMITS],
			summary: queueable
				? `Planned ${formatCount(changes.length, 'change')} for ${formatCount(affectedPaths.length, 'file')}`
				: `Plan has ${formatCount(validationErrors.length, 'validation error')}`,
		};
	}

	enqueue(plan: ServiceAPIPlan, options: ServiceAPIEnqueueOptions = {}): ServiceAPIEnqueueResponse {
		const validationErrors = [...plan.validationErrors];
		if (plan.requiresConfirmation && options.confirmed !== true) {
			validationErrors.push({
				code: 'confirmation_required',
				message: 'Destructive plans require explicit confirmation before enqueueing',
			});
		}
		if (!plan.queueable || validationErrors.length > 0) {
			return this.enqueueResponse(plan, 0, validationErrors);
		}

		const enqueueErrors: ServiceAPIValidationError[] = [];
		let queued = 0;
		for (const change of plan.changes) {
			try {
				this.host.queueService.add(change);
				queued += 1;
			} catch (error) {
				enqueueErrors.push({
					code: 'enqueue_failed',
					message: error instanceof Error ? error.message : String(error),
				});
			}
		}
		return this.enqueueResponse(plan, queued, enqueueErrors);
	}

	private enqueueResponse(
		plan: ServiceAPIPlan,
		queued: number,
		validationErrors: ServiceAPIValidationError[],
	): ServiceAPIEnqueueResponse {
		return {
			queued,
			plan,
			counts: this.counts({
				changes: plan.changes.length,
				targetFiles: plan.affectedPaths.length,
			}),
			affectedPaths: [...plan.affectedPaths],
			affectedNodeIds: [...plan.affectedNodeIds],
			validationErrors,
			rollbackLimits: [...ROLLBACK_LIMITS],
			summary:
				validationErrors.length > 0
					? `Enqueue blocked by ${formatCount(validationErrors.length, 'validation error')}`
					: `Queued ${formatCount(queued, 'change')}`,
		};
	}

	private validateChanges(changes: PendingChange[]): ServiceAPIValidationError[] {
		const errors: ServiceAPIValidationError[] = [];
		if (changes.length === 0) {
			errors.push({
				code: 'no_changes',
				message: 'Plan must include at least one change',
			});
		}
		for (const [index, change] of changes.entries()) {
			if (!change.files || change.files.length === 0) {
				errors.push({
					code: 'no_target_files',
					target: `changes[${index}]`,
					message: 'Change has no target files',
				});
				continue;
			}
			for (const file of change.files) {
				if (!file.path) {
					errors.push({
						code: 'invalid_file_path',
						target: `changes[${index}]`,
						message: 'Change target file has no path',
					});
				}
			}
		}
		return errors;
	}

	private scopeSummary(): ServiceAPIScopeSummary {
		const filterService = this.host.filterService;
		const filteredFiles = [...(filterService?.filteredFiles ?? [])];
		const selectedFiles = [...(filterService?.selectedFiles ?? [])];
		const visibleFiles = [...(filterService?.visibleFiles ?? filteredFiles)];
		const resolved = resolveVerifiedOperationScopeFiles({
			scope: this.host.settings?.explorerOperationScope,
			selectedFiles,
			filteredFiles,
			visibleFiles,
		});
		return {
			scope: resolved.scope,
			source: resolved.source,
			paths: uniquePaths(resolved.files),
			selectedCount: resolved.selectedCount,
			visibleCount: resolved.visibleCount,
			staleSelectedPaths: uniquePaths(resolved.staleSelectedFiles),
		};
	}

	private indexHealth(): ServiceAPIIndexHealth[] {
		return [
			this.health('files', this.host.filesIndex),
			this.health('tags', this.host.tagsIndex),
			this.health('props', this.host.propsIndex),
			this.health('content', this.host.contentIndex),
			this.health('operations', this.host.operationsIndex),
			this.health('activeFilters', this.host.activeFiltersIndex),
		];
	}

	private health(name: ServiceAPIIndexHealth['name'], index?: ServiceAPIIndexLike): ServiceAPIIndexHealth {
		const revision = typeof index?.revision === 'number' && Number.isFinite(index.revision)
			? index.revision
			: null;
		return {
			name,
			count: index?.nodes?.length ?? 0,
			revision,
			stale: revision == null,
		};
	}

	private counts(overrides: Partial<Pick<ServiceAPICounts, 'changes' | 'targetFiles'>> & {
		scope?: ServiceAPIScopeSummary;
	} = {}): ServiceAPICounts {
		const scope = overrides.scope ?? this.scopeSummary();
		return {
			files: this.host.filesIndex?.nodes?.length ?? 0,
			tags: this.host.tagsIndex?.nodes?.length ?? 0,
			props: this.host.propsIndex?.nodes?.length ?? 0,
			content: this.host.contentIndex?.nodes?.length ?? 0,
			operations: this.host.operationsIndex?.nodes?.length ?? 0,
			activeFilters: this.host.activeFiltersIndex?.nodes?.length ?? 0,
			queue: this.queueCount(),
			scopeFiles: scope.paths.length,
			selectedFiles: scope.selectedCount,
			visibleFiles: scope.visibleCount,
			changes: overrides.changes ?? 0,
			targetFiles: overrides.targetFiles ?? scope.paths.length,
			affectedNodes: 0,
		};
	}

	private queueCount(): number {
		if (typeof this.host.queueService.size === 'number') return this.host.queueService.size;
		return this.host.queueService.pending?.length ?? this.host.operationsIndex?.nodes?.length ?? 0;
	}
}

export function createServiceAPI(host: ServiceAPIHost): ServiceAPI {
	return new ServiceAPI(host);
}

function uniquePaths(files: readonly TFile[]): string[] {
	return [...new Set(files.map((file) => file.path).filter(Boolean))];
}

function isDestructiveChange(change: PendingChange): boolean {
	if (
		change.type === 'file_delete' ||
		change.type === 'file_move' ||
		change.type === 'file_rename' ||
		change.type === 'content_replace' ||
		change.type === 'template'
	) {
		return true;
	}
	const action = change.action.toLowerCase();
	return ['delete', 'rename', 'move', 'replace', 'apply_template', 'change_type', 'clean_empty'].some(
		(token) => action.includes(token),
	);
}

function formatCount(count: number, singular: string): string {
	return `${count} ${singular}${count === 1 ? '' : 's'}`;
}
