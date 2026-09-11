import os from 'node:os';
import path from 'node:path';

export const ARTIFACT_NAMES: readonly string[] = [
	'main.js',
	'manifest.json',
	'styles.css',
];

export const PLUGIN_SUFFIX: readonly string[] = [
	'.obsidian',
	'plugins',
	'vaultman',
];

export const DEFAULT_ALIAS = 'plugin-dev';

export const TARGET_FLAG = '--vault-target';
export const DRY_RUN_FLAG = '--dry-run';

export const VAULT_ALIASES: Readonly<Record<string, string>> = {
	'plugin dev': 'plugin-dev',
	'obsidian help': 'Obsidian Help',
	'obsidian developers': 'Obsidian Developers',
	'start of the road': 'start of the road',
	'edificio tangerine': 'Edificio Tangerine',
};

export class UsageError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UsageError';
	}
}

export type ParsedArgs = {
	vaultTarget: string | undefined;
	dryRun: boolean;
	showHelp: boolean;
};

export type EnvMap = {
	readonly [key: string]: string | undefined;
};

export type ResolveEnv = {
	readonly cwd: string;
	readonly homedir: string;
	readonly documentsBase: string;
};

export type SyncArtifact = {
	readonly name: string;
	readonly sourcePath: string;
	readonly distPath: string;
	readonly targetPath: string;
};

export type SyncPlan = {
	readonly distBuildDir: string;
	readonly targetDir: string;
	readonly artifacts: readonly SyncArtifact[];
};

export type SyncFailure = {
	readonly artifactName: string;
	readonly target: string;
	readonly error: unknown;
};

export type FsDeps = {
	readonly mkdir: (
		dir: string,
		options: { readonly recursive: boolean },
	) => Promise<unknown>;
	readonly stat: (targetPath: string) => Promise<unknown>;
	readonly cp: (
		source: string,
		destination: string,
		options: { readonly force: boolean },
	) => Promise<unknown>;
};

export type MainDeps = {
	readonly cwd?: string;
	readonly homedir?: string;
	readonly documentsBase?: string;
	readonly fs?: FsDeps;
};

export function usageText(): string {
	return [
		'Usage: node scripts/sync-test-build.mts [--vault-target <alias|path>] [--dry-run]',
		'',
		'Options:',
		'  --vault-target <value>  Vault alias or path of the plugin target.',
		'    Accepts "--vault-target=value" and "--vault-target value".',
		'    Aliases (case/accent/spacing-insensitive): plugin-dev, "Obsidian Help",',
		'    "Obsidian Developers", "start of the road", "Edificio Tangerine".',
		'    Paths: absolute, ~/<...>, ./relative (must contain a slash), a vault',
		'    root (the plugin suffix is appended), or a full',
		'    .obsidian/plugins/vaultman directory.',
		'  --dry-run                    Print the resolved target and artifacts',
		'    without writing anything.',
		'  --help, -h                   Show this help.',
		'',
		'Precedence: --vault-target > VAULTMAN_TARGET > "plugin-dev" (default).',
		'Exit codes: 0 synced (or dry-run resolved), 1 sync failure, 2 usage error.',
	].join('\n');
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
	let vaultTarget: string | undefined;
	let dryRun = false;
	let showHelp = false;

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === DRY_RUN_FLAG) {
			dryRun = true;
		} else if (arg === '--help' || arg === '-h') {
			showHelp = true;
		} else if (arg === TARGET_FLAG) {
			const next = argv[index + 1];
			if (next === undefined || next.startsWith('--')) {
				throw new UsageError(
					`Missing value for ${TARGET_FLAG}.\n${usageText()}`,
				);
			}
			if (next.trim().length === 0) {
				throw new UsageError(
					`Empty value for ${TARGET_FLAG}.\n${usageText()}`,
				);
			}
			vaultTarget = next;
			index += 1;
		} else if (arg.startsWith(`${TARGET_FLAG}=`)) {
			const value = arg.slice(TARGET_FLAG.length + 1);
			if (value.trim().length === 0) {
				throw new UsageError(
					`Empty value for ${TARGET_FLAG}.\n${usageText()}`,
				);
			}
			vaultTarget = value;
		} else if (arg.startsWith('--')) {
			throw new UsageError(`Unknown argument: ${arg}.\n${usageText()}`);
		} else {
			throw new UsageError(`Unexpected positional argument: ${arg}.\n${usageText()}`);
		}
	}

	return { vaultTarget, dryRun, showHelp };
}

export function normalizeAliasName(value: string): string {
	const lowered = value.toLowerCase();
	const withoutAccents = lowered
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
	const spaced = withoutAccents.replace(/[_-]+/g, ' ');
	return spaced.replace(/\s+/g, ' ').trim();
}

function splitSegments(targetPath: string): string[] {
	return targetPath.split(/[\\/]/).filter((segment) => segment.length > 0);
}

function endsWithSegments(
	targetPath: string,
	segments: readonly string[],
): boolean {
	const parts = splitSegments(targetPath);
	if (parts.length < segments.length) {
		return false;
	}
	return segments.every(
		(segment, offset) => parts[parts.length - segments.length + offset] === segment,
	);
}

function looksLikePath(value: string): boolean {
	return (
		path.isAbsolute(value) ||
		value.startsWith('~') ||
		value.startsWith('.') ||
		value.includes('/') ||
		value.includes('\\')
	);
}

export function resolvePluginTarget(
	raw: string | undefined,
	env: EnvMap,
	resolveEnv: ResolveEnv,
): string {
	const cliValue = raw === undefined ? undefined : raw.trim();
	if (raw !== undefined && (cliValue === undefined || cliValue.length === 0)) {
		throw new UsageError(`Empty value for ${TARGET_FLAG}.\n${usageText()}`);
	}
	const envValue = env['VAULTMAN_TARGET'];
	const trimmedEnv = envValue === undefined ? undefined : envValue.trim();
	const selected =
		cliValue ?? (trimmedEnv !== undefined && trimmedEnv.length > 0 ? trimmedEnv : undefined) ?? DEFAULT_ALIAS;

	if (!looksLikePath(selected)) {
		const vaultDir = VAULT_ALIASES[normalizeAliasName(selected)];
		if (vaultDir === undefined) {
			throw new UsageError(
				`Unknown plugin target alias: ${selected}.\n${usageText()}`,
			);
		}
		return path.join(resolveEnv.documentsBase, vaultDir, ...PLUGIN_SUFFIX);
	}

	const expanded = selected.startsWith('~/')
		? path.join(resolveEnv.homedir, selected.slice(2))
		: selected;
	const resolved = path.resolve(resolveEnv.cwd, expanded);

	if (endsWithSegments(resolved, PLUGIN_SUFFIX)) {
		return resolved;
	}
	if (endsWithSegments(resolved, ['.obsidian', 'plugins'])) {
		return path.join(resolved, 'vaultman');
	}
	if (endsWithSegments(resolved, ['.obsidian'])) {
		return path.join(resolved, 'plugins', 'vaultman');
	}
	return path.join(resolved, ...PLUGIN_SUFFIX);
}

export function defaultResolveEnv(overrides: MainDeps): ResolveEnv {
	const homedir = overrides.homedir ?? os.homedir();
	return {
		cwd: overrides.cwd ?? process.cwd(),
		homedir,
		documentsBase:
			overrides.documentsBase ?? path.join(homedir, 'storage/shared/Documents'),
	};
}

export function planSync(
	raw: string | undefined,
	env: EnvMap,
	resolveEnv: ResolveEnv,
): SyncPlan {
	const targetDir = resolvePluginTarget(raw, env, resolveEnv);
	const distBuildDir = path.join(resolveEnv.cwd, 'dist', 'build');
	const artifacts = ARTIFACT_NAMES.map((name) => {
		// build-styles writes dist/build/styles.css directly; the repo root no
		// longer ships a styles.css, so the styles source lives in dist.
		const sourcePath =
			name === 'styles.css' ? path.join(distBuildDir, name) : path.join(resolveEnv.cwd, name);
		return {
			name,
			sourcePath,
			distPath: path.join(distBuildDir, name),
			targetPath: path.join(targetDir, name),
		};
	});
	return { distBuildDir, targetDir, artifacts };
}
