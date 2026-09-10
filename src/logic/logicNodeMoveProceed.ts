import type { TFile } from 'obsidian';

import { movedParentPathForFolderFile } from './logicFolderQueue';
import type { MoveNodeRef } from './logicMoveRouting';
import {
	buildNodeMoveOperations,
	pruneDeadOrigins,
	proceedEnabled,
	type NodeMoveModeState,
	type NodeMoveOperation,
} from './logicNodeMoveMode';
import { COPY_FILE, MOVE_FILE } from '../types/typeOps';
import type { PendingChange } from '../types/typeOps';

/**
 * U130-02 proceed-queue: culminacion Proceed -> queue existente.
 *
 * Puro y sin montaje: no toca el vault, no abre modales, no registra
 * acciones. Recibe resolvers inyectados (TFile) y una queue con el
 * contrato minimo de `OperationQueueService`; la escritura real solo
 * ocurre dentro de la queue, al llamar a `addBatch` en modo stage o a
 * `addOrRun` tras consentimiento explicito en modo bypass.
 *
 * Puerto para lane-ui-dom: el contenedor conecta `findFile` /
 * `listFilesInFolder` / `isAlive` con el vault y decide el id de
 * invocacion (ver reporte: no reutilizar el id de valueMove).
 */

export type NodeMoveProceedUnresolvedReason =
	| 'origin-missing'
	| 'unsupported-kind'
	| 'same-path'
	| 'no-files';

export interface NodeMoveProceedUnresolved {
	originId: string;
	originCanonicalId: string;
	destinationId: string;
	destinationCanonicalId: string;
	reason: NodeMoveProceedUnresolvedReason;
}

export interface NodeMoveProceedPlan {
	changes: PendingChange[];
	unresolved: NodeMoveProceedUnresolved[];
	/** Pares deduplicados antes de planificar. */
	deduped: number;
}

export interface NodeMoveProceedResolvers {
	findFile: (canonicalId: string) => TFile | null;
	listFilesInFolder: (folderPath: string) => TFile[];
}

export interface NodeMoveQueuePort {
	operationMode: 'stage' | 'bypass';
	addBatch?: (changes: PendingChange[]) => void;
	add?: (change: PendingChange) => void;
	addOrRun?: (change: PendingChange) => void;
	readonly queue?: readonly PendingChange[];
}

export interface NodeMoveStageOutcome {
	staged: number;
	requiresConfirmation: boolean;
}

function normalizeFolder(canonicalId: string): string {
	return canonicalId.replace(/^\/|\/$/g, '');
}

function folderNameOf(folderPath: string): string {
	const clean = normalizeFolder(folderPath);
	const slash = clean.lastIndexOf('/');
	return slash >= 0 ? clean.slice(slash + 1) : clean;
}

function joinFolder(folder: string, name: string): string {
	return folder ? `${folder}/${name}` : name;
}

/** Fan-out estable y deduplicado: primer par gana, el orden se conserva. */
export function dedupeNodeMoveOperations(
	operations: readonly NodeMoveOperation[],
): { ops: NodeMoveOperation[]; deduped: number } {
	const seen = new Set<string>();
	const ops: NodeMoveOperation[] = [];
	for (const operation of operations) {
		const key = [
			operation.originId,
			operation.destinationId,
			operation.originDisposition,
			operation.write,
		].join('::');
		if (seen.has(key)) continue;
		seen.add(key);
		ops.push(operation);
	}
	return { ops, deduped: operations.length - ops.length };
}

function unsupportedKind(operation: NodeMoveOperation): boolean {
	const originOk =
		operation.originKind === 'file' || operation.originKind === 'folder';
	if (!originOk) return true;
	// El destino llega como ref de carpeta o root; el canonical decide.
	return false;
}

function describeMove(
	originDisposition: 'move' | 'copy',
	from: string,
	to: string,
): string {
	const verb = originDisposition === 'move' ? 'Move' : 'Copy';
	return `${verb} "${from}" to "${to}"`;
}

/**
 * Construye un plan de cambios stageables desde operaciones NodeMove.
 * Cada par es una entrada atribuible (details nombra origen y destino);
 * lo no resoluble queda en `unresolved` con motivo, nunca en silencio.
 */
export function buildNodeMoveQueueChanges(
	operations: readonly NodeMoveOperation[],
	resolvers: NodeMoveProceedResolvers,
): NodeMoveProceedPlan {
	const { ops, deduped } = dedupeNodeMoveOperations(operations);
	const changes: PendingChange[] = [];
	const unresolved: NodeMoveProceedUnresolved[] = [];

	for (const operation of ops) {
		if (unsupportedKind(operation)) {
			unresolved.push({
				originId: operation.originId,
				originCanonicalId: operation.originCanonicalId,
				destinationId: operation.destinationId,
				destinationCanonicalId: operation.destinationCanonicalId,
				reason: 'unsupported-kind',
			});
			continue;
		}
		const destinationFolder = normalizeFolder(
			operation.destinationCanonicalId,
		);
		if (operation.originKind === 'file') {
			const file = resolvers.findFile(operation.originCanonicalId);
			if (!file) {
				unresolved.push({
					originId: operation.originId,
					originCanonicalId: operation.originCanonicalId,
					destinationId: operation.destinationId,
					destinationCanonicalId: operation.destinationCanonicalId,
					reason: 'origin-missing',
				});
				continue;
			}
			const newPath = joinFolder(destinationFolder, file.name);
			if (newPath === file.path) {
				unresolved.push({
					originId: operation.originId,
					originCanonicalId: operation.originCanonicalId,
					destinationId: operation.destinationId,
					destinationCanonicalId: operation.destinationCanonicalId,
					reason: 'same-path',
				});
				continue;
			}
			if (operation.originDisposition === 'move') {
				const targetFolder = destinationFolder;
				changes.push({
					type: 'file_move',
					action: 'move',
					details: `${describeMove('move', file.path, newPath)} [${operation.originId}→${operation.destinationId}]`,
					files: [file],
					targetFolder,
					customLogic: true,
					logicFunc: () => ({ [MOVE_FILE]: targetFolder }),
				});
			} else {
				const targetPath = newPath;
				const targetFolder = destinationFolder;
				changes.push({
					type: 'file_copy',
					action: 'copy',
					details: `${describeMove('copy', file.path, targetPath)} [${operation.originId}→${operation.destinationId}]`,
					files: [file],
					targetFolder,
					customLogic: true,
					logicFunc: () => ({ [COPY_FILE]: targetPath }),
				});
			}
			continue;
		}
		// originKind === 'folder': se expande a los ficheros de dentro con la
		// misma algebra que el move de carpetas existente.
		const inner = resolvers.listFilesInFolder(operation.originCanonicalId);
		if (inner.length === 0) {
			unresolved.push({
				originId: operation.originId,
				originCanonicalId: operation.originCanonicalId,
				destinationId: operation.destinationId,
				destinationCanonicalId: operation.destinationCanonicalId,
				reason: 'no-files',
			});
			continue;
		}
		const folderName = folderNameOf(operation.originCanonicalId);
		const newFolderPath = joinFolder(destinationFolder, folderName);
		if (newFolderPath === normalizeFolder(operation.originCanonicalId)) {
			unresolved.push({
				originId: operation.originId,
				originCanonicalId: operation.originCanonicalId,
				destinationId: operation.destinationId,
				destinationCanonicalId: operation.destinationCanonicalId,
				reason: 'same-path',
			});
			continue;
		}
		const fromFolder = operation.originCanonicalId;
		if (operation.originDisposition === 'move') {
			changes.push({
				type: 'file_move',
				action: 'move',
				details: `${describeMove('move', fromFolder, newFolderPath)} [${operation.originId}→${operation.destinationId}]`,
				files: [...inner],
				targetFolder: newFolderPath,
				customLogic: true,
				logicFunc: (file) => ({
					[MOVE_FILE]: movedParentPathForFolderFile(
						file.path,
						fromFolder,
						newFolderPath,
					),
				}),
			});
		} else {
			changes.push({
				type: 'file_copy',
				action: 'copy',
				details: `${describeMove('copy', fromFolder, newFolderPath)} [${operation.originId}→${operation.destinationId}]`,
				files: [...inner],
				targetFolder: newFolderPath,
				customLogic: true,
				logicFunc: (file) => {
					const parent = movedParentPathForFolderFile(
						file.path,
						fromFolder,
						newFolderPath,
					);
					return { [COPY_FILE]: joinFolder(parent, file.name) };
				},
			});
		}
	}

	return { changes, unresolved, deduped };
}

/**
 * Stagea un plan respetando el modo de la queue.
 * - stage: `addBatch` (una sola notificacion); no ejecuta.
 * - bypass sin `confirmed`: no toca la queue; exige confirmacion.
 * - bypass con `confirmed`: `addOrRun` por cambio (ejecucion inmediata
 *   con consentimiento explicito del llamador/modal).
 */
export function stageNodeMovePlan(
	queueService: NodeMoveQueuePort,
	plan: NodeMoveProceedPlan,
	options: { confirmed: boolean },
): NodeMoveStageOutcome {
	if (plan.changes.length === 0) {
		return { staged: 0, requiresConfirmation: false };
	}
	if (queueService.operationMode === 'stage') {
		if (queueService.addBatch) {
			queueService.addBatch(plan.changes);
		} else if (queueService.add) {
			for (const change of plan.changes) queueService.add(change);
		}
		return { staged: plan.changes.length, requiresConfirmation: false };
	}
	if (!options.confirmed) {
		return { staged: 0, requiresConfirmation: true };
	}
	if (queueService.addOrRun) {
		for (const change of plan.changes) queueService.addOrRun(change);
	}
	return { staged: plan.changes.length, requiresConfirmation: false };
}

export interface NodeMoveProceedOutcome extends NodeMoveStageOutcome {
	plan: NodeMoveProceedPlan;
	pruned: readonly string[];
	prunedDestinations: readonly string[];
}

/**
 * Proceed completo: poda con liveness, construye operaciones via
 * `buildNodeMoveOperations`, planifica y stagea. Sin las dos mitades
 * (`proceedEnabled`) no emite nada.
 */
export function proceedNodeMoveToQueue(
	state: NodeMoveModeState,
	deps: NodeMoveProceedResolvers & {
		isAlive?: (ref: MoveNodeRef) => boolean;
		queueService: NodeMoveQueuePort;
		confirmed?: boolean;
	},
): NodeMoveProceedOutcome {
	const empty: NodeMoveProceedOutcome = {
		plan: { changes: [], unresolved: [], deduped: 0 },
		staged: 0,
		requiresConfirmation: false,
		pruned: Object.freeze([]),
		prunedDestinations: Object.freeze([]),
	};
	const isAlive = deps.isAlive;
	const pruned = isAlive
		? pruneDeadOrigins(state, isAlive)
		: { state, pruned: Object.freeze([]), prunedDestinations: Object.freeze([]) };
	if (!proceedEnabled(pruned.state)) {
		return {
			...empty,
			pruned: pruned.pruned,
			prunedDestinations: pruned.prunedDestinations,
		};
	}
	const operations = buildNodeMoveOperations(pruned.state);
	const plan = buildNodeMoveQueueChanges(operations, {
		findFile: deps.findFile,
		listFilesInFolder: deps.listFilesInFolder,
	});
	const staged = stageNodeMovePlan(deps.queueService, plan, {
		confirmed: deps.confirmed ?? false,
	});
	return {
		plan,
		staged: staged.staged,
		requiresConfirmation: staged.requiresConfirmation,
		pruned: pruned.pruned,
		prunedDestinations: pruned.prunedDestinations,
	};
}
