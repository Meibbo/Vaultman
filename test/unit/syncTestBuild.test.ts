import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	ARTIFACT_NAMES,
	DEFAULT_ALIAS,
	PLUGIN_SUFFIX,
	UsageError,
	executeSync,
	normalizeAliasName,
	parseArgs,
	planSync,
	printDryRun,
	resolvePluginTarget,
	runMain,
	usageText,
	type EnvMap,
	type FsDeps,
	type ResolveEnv,
	type SyncPlan,
} from '../../scripts/sync-test-build.mts';

const RESOLVE_ENV: ResolveEnv = {
	cwd: '/repo',
	homedir: '/home/tester',
	documentsBase: '/home/tester/storage/shared/Documents',
};

const EMPTY_ENV: EnvMap = {};

function pluginDir(vaultDir: string): string {
	return `/home/tester/storage/shared/Documents/${vaultDir}/${PLUGIN_SUFFIX.join('/')}`;
}

function throwingFs(): FsDeps & {
	calls: string[];
} {
	const calls: string[] = [];
	const fail = async (what: string): Promise<unknown> => {
		calls.push(what);
		throw new Error(`filesystem write attempted: ${what}`);
	};
	return {
		calls,
		mkdir: (dir: string) => fail(`mkdir:${dir}`),
		stat: (targetPath: string) => fail(`stat:${targetPath}`),
		cp: (source: string, destination: string) => fail(`cp:${source}->${destination}`),
	};
}

function recordingFs(failTargetCp: boolean): FsDeps & {
	mkdirCalls: string[];
	cpCalls: Array<{ source: string; destination: string }>;
	statCalls: string[];
} {
	const mkdirCalls: string[] = [];
	const cpCalls: Array<{ source: string; destination: string }> = [];
	const statCalls: string[] = [];
	return {
		mkdirCalls,
		cpCalls,
		statCalls,
		mkdir: async (dir: string) => {
			mkdirCalls.push(dir);
			return undefined;
		},
		stat: async (targetPath: string) => {
			statCalls.push(targetPath);
			return undefined;
		},
		cp: async (source: string, destination: string) => {
			cpCalls.push({ source, destination });
			if (failTargetCp && destination.includes('.obsidian')) {
				throw Object.assign(new Error('permission denied'), {
					code: 'EACCES',
				});
			}
			return undefined;
		},
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('sync-test-build parseArgs', () => {
	it('accepts the equals form of the target flag', () => {
		expect(parseArgs(['--vault-target=Obsidian Help'])).toEqual({
			vaultTarget: 'Obsidian Help',
			dryRun: false,
			showHelp: false,
		});
	});

	it('accepts the space-separated form of the target flag', () => {
		const parsed = parseArgs(['--vault-target', 'plugin-dev']);
		expect(parsed.vaultTarget).toBe('plugin-dev');
		expect(parsed.dryRun).toBe(false);
	});

	it('parses dry-run alongside the target flag in any order', () => {
		const parsed = parseArgs([
			'--dry-run',
			'--vault-target',
			'start of the road',
		]);
		expect(parsed).toEqual({
			vaultTarget: 'start of the road',
			dryRun: true,
			showHelp: false,
		});
	});

	it('rejects a missing flag value with a usage error', () => {
		expect(() => parseArgs(['--vault-target'])).toThrow(UsageError);
	});

	it('rejects an empty equals value with a usage error', () => {
		expect(() => parseArgs(['--vault-target=  '])).toThrow(UsageError);
	});

	it('rejects unknown flags with a usage error', () => {
		expect(() => parseArgs(['--bogus'])).toThrow(UsageError);
	});

	it('rejects positional arguments with a usage error', () => {
		expect(() => parseArgs(['plugin-dev'])).toThrow(UsageError);
	});

	it('lets the last duplicate flag win', () => {
		const parsed = parseArgs([
			'--vault-target=plugin-dev',
			'--vault-target=Obsidian Help',
		]);
		expect(parsed.vaultTarget).toBe('Obsidian Help');
	});
});

describe('sync-test-build normalizeAliasName', () => {
	it('folds case, hyphens, underscores, and extra spacing', () => {
		expect(normalizeAliasName('Start-of_the  Road')).toBe('start of the road');
		expect(normalizeAliasName('  PLUGIN-DEV ')).toBe('plugin dev');
	});

	it('strips accents without renaming on-disk paths', () => {
		expect(normalizeAliasName('Edifício Tangerine')).toBe('edificio tangerine');
		expect(normalizeAliasName('Obsidian Hélp')).toBe('obsidian help');
	});
});

describe('sync-test-build resolvePluginTarget', () => {
	it('resolves every verified vault alias to its plugin directory', () => {
		expect(resolvePluginTarget('plugin-dev', EMPTY_ENV, RESOLVE_ENV)).toBe(
			pluginDir('plugin-dev'),
		);
		expect(resolvePluginTarget('Obsidian Help', EMPTY_ENV, RESOLVE_ENV)).toBe(
			pluginDir('Obsidian Help'),
		);
		expect(
			resolvePluginTarget('Obsidian Developers', EMPTY_ENV, RESOLVE_ENV),
		).toBe(pluginDir('Obsidian Developers'));
		expect(
			resolvePluginTarget('start of the road', EMPTY_ENV, RESOLVE_ENV),
		).toBe(pluginDir('start of the road'));
		expect(
			resolvePluginTarget('Edificio Tangerine', EMPTY_ENV, RESOLVE_ENV),
		).toBe(pluginDir('Edificio Tangerine'));
	});

	it('resolves stylistic alias spellings to the same on-disk vault', () => {
		expect(
			resolvePluginTarget('START-OF_THE_ROAD', EMPTY_ENV, RESOLVE_ENV),
		).toBe(pluginDir('start of the road'));
		expect(
			resolvePluginTarget('edificio tangerine', EMPTY_ENV, RESOLVE_ENV),
		).toBe(pluginDir('Edificio Tangerine'));
	});

	it('defaults to plugin-dev when neither flag nor env is set', () => {
		expect(resolvePluginTarget(undefined, EMPTY_ENV, RESOLVE_ENV)).toBe(
			pluginDir('plugin-dev'),
		);
		expect(DEFAULT_ALIAS).toBe('plugin-dev');
	});

	it('prefers the env var over the default', () => {
		expect(
			resolvePluginTarget(
				undefined,
				{ VAULTMAN_TARGET: 'Obsidian Help' },
				RESOLVE_ENV,
			),
		).toBe(pluginDir('Obsidian Help'));
	});

	it('prefers the CLI flag over the env var', () => {
		expect(
			resolvePluginTarget(
				'Edificio Tangerine',
				{ VAULTMAN_TARGET: 'Obsidian Help' },
				RESOLVE_ENV,
			),
		).toBe(pluginDir('Edificio Tangerine'));
	});

	it('passes absolute plugin-directory paths through unchanged', () => {
		const full = pluginDir('plugin-dev');
		expect(resolvePluginTarget(full, EMPTY_ENV, RESOLVE_ENV)).toBe(full);
	});

	it('appends the plugin suffix to vault-root paths', () => {
		expect(
			resolvePluginTarget(
				'/home/tester/storage/shared/Documents/Obsidian Help',
				EMPTY_ENV,
				RESOLVE_ENV,
			),
		).toBe(pluginDir('Obsidian Help'));
	});

	it('expands ~/ paths against the home directory', () => {
		expect(
			resolvePluginTarget(
				'~/storage/shared/Documents/plugin-dev',
				EMPTY_ENV,
				RESOLVE_ENV,
			),
		).toBe(pluginDir('plugin-dev'));
	});

	it('resolves ./ relative paths against the working directory', () => {
		expect(
			resolvePluginTarget('./local-vault', EMPTY_ENV, RESOLVE_ENV),
		).toBe('/repo/local-vault/.obsidian/plugins/vaultman');
	});

	it('completes partial .obsidian paths instead of doubling segments', () => {
		expect(
			resolvePluginTarget(
				'/vaults/demo/.obsidian',
				EMPTY_ENV,
				RESOLVE_ENV,
			),
		).toBe('/vaults/demo/.obsidian/plugins/vaultman');
		expect(
			resolvePluginTarget(
				'/vaults/demo/.obsidian/plugins',
				EMPTY_ENV,
				RESOLVE_ENV,
			),
		).toBe('/vaults/demo/.obsidian/plugins/vaultman');
	});

	it('rejects unknown single-word aliases with a usage error', () => {
		expect(() => resolvePluginTarget('nope', EMPTY_ENV, RESOLVE_ENV)).toThrow(
			UsageError,
		);
	});

	it('rejects empty flag values with a usage error', () => {
		expect(() => resolvePluginTarget('   ', EMPTY_ENV, RESOLVE_ENV)).toThrow(
			UsageError,
		);
	});
});

describe('sync-test-build planSync', () => {
	it('plans dist and target copies for every artifact without touching the fs', () => {
		const plan = planSync('plugin-dev', EMPTY_ENV, RESOLVE_ENV);
		expect(plan.distBuildDir).toBe('/repo/dist/build');
		expect(plan.targetDir).toBe(pluginDir('plugin-dev'));
		expect(plan.artifacts.map((artifact) => artifact.name)).toEqual([
			...ARTIFACT_NAMES,
		]);
		for (const artifact of plan.artifacts) {
			const expectedSource =
				artifact.name === 'styles.css'
					? `/repo/dist/build/${artifact.name}`
					: `/repo/${artifact.name}`;
			expect(artifact.sourcePath).toBe(expectedSource);
			expect(artifact.distPath).toBe(`/repo/dist/build/${artifact.name}`);
			expect(artifact.targetPath).toBe(
				`${pluginDir('plugin-dev')}/${artifact.name}`,
			);
		}
		expect(PLUGIN_SUFFIX).toEqual(['.obsidian', 'plugins', 'vaultman']);
	});

	it('sources the styles artifact from dist/build instead of the repo root', () => {
		const plan = planSync('plugin-dev', EMPTY_ENV, RESOLVE_ENV);
		const styles = plan.artifacts.find((artifact) => artifact.name === 'styles.css');
		expect(styles?.sourcePath).toBe('/repo/dist/build/styles.css');
		expect(styles?.sourcePath).toBe(styles?.distPath);
		for (const artifact of plan.artifacts) {
			if (artifact.name === 'styles.css') {
				continue;
			}
			expect(artifact.sourcePath).toBe(`/repo/${artifact.name}`);
		}
	});

	it('never copies an artifact onto itself when source and dist match', async () => {
		const fs = recordingFs(false);
		const plan = planSync('plugin-dev', EMPTY_ENV, RESOLVE_ENV);
		const exitCode = await executeSync(plan, fs);
		expect(exitCode).toBe(0);
		for (const call of fs.cpCalls) {
			expect(call.destination).not.toBe(call.source);
		}
		expect(
			fs.cpCalls.filter((call) => call.source === '/repo/dist/build/styles.css'),
		).toHaveLength(1);
	});
});

describe('sync-test-build runMain', () => {
	it('dry-run resolves and prints without any filesystem writes', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const fs = throwingFs();
		const exitCode = await runMain(['--dry-run'], EMPTY_ENV, {
			...RESOLVE_ENV,
			fs,
		});
		expect(exitCode).toBe(0);
		expect(fs.calls).toEqual([]);
		const printed = log.mock.calls.map((call) => String(call[0])).join('\n');
		expect(printed).toContain(pluginDir('plugin-dev'));
		expect(printed).toContain('main.js');
	});

	it('dry-run honors an explicit target without writing', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const fs = throwingFs();
		const exitCode = await runMain(
			['--vault-target=Edificio Tangerine', '--dry-run'],
			EMPTY_ENV,
			{ ...RESOLVE_ENV, fs },
		);
		expect(exitCode).toBe(0);
		expect(fs.calls).toEqual([]);
		const printed = log.mock.calls.map((call) => String(call[0])).join('\n');
		expect(printed).toContain(pluginDir('Edificio Tangerine'));
	});

	it('returns exit code 2 for unknown aliases', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const fs = throwingFs();
		const exitCode = await runMain(
			['--vault-target=nope'],
			EMPTY_ENV,
			{ ...RESOLVE_ENV, fs },
		);
		expect(exitCode).toBe(2);
		expect(fs.calls).toEqual([]);
		expect(String(error.mock.calls[0]?.[0])).toContain('Unknown plugin target');
	});

	it('returns exit code 2 for invalid arguments', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const fs = throwingFs();
		const exitCode = await runMain(['--bogus'], EMPTY_ENV, {
			...RESOLVE_ENV,
			fs,
		});
		expect(exitCode).toBe(2);
		expect(fs.calls).toEqual([]);
		expect(String(error.mock.calls[0]?.[0])).toContain('Unknown argument');
	});

	it('prints help with exit code 0', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const fs = throwingFs();
		const exitCode = await runMain(['--help'], EMPTY_ENV, {
			...RESOLVE_ENV,
			fs,
		});
		expect(exitCode).toBe(0);
		expect(fs.calls).toEqual([]);
		expect(String(log.mock.calls[0]?.[0])).toContain('--vault-target');
	});
});

describe('sync-test-build executeSync', () => {
	function testPlan(): SyncPlan {
		return planSync('plugin-dev', EMPTY_ENV, RESOLVE_ENV);
	}

	it('copies every artifact to dist and target and reports success', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const fs = recordingFs(false);
		const exitCode = await executeSync(testPlan(), fs);
		expect(exitCode).toBe(0);
		expect(fs.mkdirCalls).toEqual([
			'/repo/dist/build',
			pluginDir('plugin-dev'),
		]);
		expect(fs.statCalls).toEqual([
			'/repo/main.js',
			'/repo/manifest.json',
			'/repo/dist/build/styles.css',
		]);
		expect(fs.cpCalls).toHaveLength(5);
		expect(
			fs.cpCalls.filter((call) => call.destination.startsWith('/repo/dist/build')),
		).toEqual([
			{ source: '/repo/main.js', destination: '/repo/dist/build/main.js' },
			{ source: '/repo/manifest.json', destination: '/repo/dist/build/manifest.json' },
		]);
		const printed = log.mock.calls.map((call) => String(call[0])).join('\n');
		expect(printed).toContain('Synced test build artifacts to:');
	});

	it('collects per-artifact failures with error codes and exits non-zero', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const fs = recordingFs(true);
		const exitCode = await executeSync(testPlan(), fs);
		expect(exitCode).toBe(1);
		const printed = error.mock.calls
			.map((call) => String(call[0]))
			.join('\n');
		expect(printed).toContain('Failed to sync test build artifacts:');
		expect(printed).toContain('EACCES');
		expect(printed).toContain('main.js');
		expect(printed).toContain(pluginDir('plugin-dev'));
	});
});

describe('sync-test-build printDryRun', () => {
	it('lists the target and every artifact', () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		printDryRun(planSync('plugin-dev', EMPTY_ENV, RESOLVE_ENV));
		const printed = log.mock.calls.map((call) => String(call[0])).join('\n');
		expect(printed).toContain('[dry-run]');
		expect(printed).toContain(pluginDir('plugin-dev'));
		expect(usageText()).toContain('VAULTMAN_TARGET');
	});
});
