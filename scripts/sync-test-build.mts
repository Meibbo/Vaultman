import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	defaultResolveEnv,
	parseArgs,
	planSync,
	usageText,
	UsageError,
} from './sync-test-build-core.mts';
import type {
	EnvMap,
	FsDeps,
	MainDeps,
	ParsedArgs,
	SyncFailure,
	SyncPlan,
} from './sync-test-build-core.mts';

export * from './sync-test-build-core.mts';

function describeError(error: unknown): { code: string; message: string } {
	if (error instanceof Error) {
		const code =
			'code' in error && typeof error.code === 'string' ? error.code : 'ERROR';
		return { code, message: error.message };
	}
	return { code: 'ERROR', message: String(error) };
}

export async function executeSync(plan: SyncPlan, fs: FsDeps): Promise<number> {
	await fs.mkdir(plan.distBuildDir, { recursive: true });
	try {
		await fs.mkdir(plan.targetDir, { recursive: true });
	} catch {
		console.warn(`Warning: Could not create/access target: ${plan.targetDir}`);
	}

	/**
	 * U121-029: a failed copy used to be swallowed into a one-line warning above a
	 * "Synced test build artifacts to:" banner that named the target anyway — so a
	 * build that never reached the vault still read as a success, and the dev
	 * smoke-tested a stale plugin. Failures are now collected, reported with their
	 * real error code, and turned into a non-zero exit.
	 */
	const failures: SyncFailure[] = [];

	for (const artifact of plan.artifacts) {
		await fs.stat(artifact.sourcePath);
		if (artifact.sourcePath !== artifact.distPath) {
			await fs.cp(artifact.sourcePath, artifact.distPath, { force: true });
		}

		try {
			await fs.cp(artifact.sourcePath, artifact.targetPath, { force: true });
		} catch (error) {
			failures.push({
				artifactName: artifact.name,
				target: plan.targetDir,
				error,
			});
		}
	}

	if (failures.length > 0) {
		console.error('Failed to sync test build artifacts:');
		for (const failure of failures) {
			const details = describeError(failure.error);
			console.error(
				`- ${failure.artifactName} -> ${failure.target}: ${details.code} ${details.message}`,
			);
		}
		console.error(
			`The build is still in ${plan.distBuildDir}; copy it manually or re-run once the target is writable.`,
		);
		return 1;
	}

	console.log('Synced test build artifacts to:');
	console.log(`- ${plan.distBuildDir}`);
	console.log(`- ${plan.targetDir}`);
	return 0;
}

export function printDryRun(plan: SyncPlan): void {
	console.log(`[dry-run] Plugin target: ${plan.targetDir}`);
	console.log(`[dry-run] Dist dir: ${plan.distBuildDir}`);
	console.log('[dry-run] Artifacts:');
	for (const artifact of plan.artifacts) {
		console.log(
			`- ${artifact.name}: ${artifact.sourcePath} -> ${artifact.distPath}, ${artifact.targetPath}`,
		);
	}
}

export async function runMain(
	argv: readonly string[],
	env: EnvMap,
	deps: MainDeps = {},
): Promise<number> {
	let parsed: ParsedArgs;
	try {
		parsed = parseArgs(argv);
	} catch (error) {
		if (error instanceof UsageError) {
			console.error(error.message);
			return 2;
		}
		throw error;
	}

	if (parsed.showHelp) {
		console.log(usageText());
		return 0;
	}

	const resolveEnv = defaultResolveEnv(deps);

	let plan: SyncPlan;
	try {
		plan = planSync(parsed.vaultTarget, env, resolveEnv);
	} catch (error) {
		if (error instanceof UsageError) {
			console.error(error.message);
			return 2;
		}
		throw error;
	}

	if (parsed.dryRun) {
		printDryRun(plan);
		return 0;
	}

	const fs: FsDeps = deps.fs ?? { mkdir, stat, cp };
	try {
		return await executeSync(plan, fs);
	} catch (error) {
		const details = describeError(error);
		console.error(`Sync failed: ${details.code} ${details.message}`);
		return 1;
	}
}

const invokedPath = process.argv[1];
const isMainEntry =
	typeof invokedPath === 'string' &&
	path.resolve(invokedPath) === fileURLToPath(import.meta.url);

if (isMainEntry) {
	const exitCode = await runMain(process.argv.slice(2), process.env);
	process.exitCode = exitCode;
}
