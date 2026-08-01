import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distBuildDir = path.join(root, 'dist', 'build');
const pluginDevTarget =
	'C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman';

const artifactNames = ['main.js', 'manifest.json', 'styles.css'];
const syncTargets = [pluginDevTarget];

await mkdir(distBuildDir, { recursive: true });
for (const target of syncTargets) {
	try {
		await mkdir(target, { recursive: true });
	} catch {
		console.warn(`Warning: Could not create/access target: ${target}`);
	}
}

/**
 * U121-029: a failed copy used to be swallowed into a one-line warning above a
 * "Synced test build artifacts to:" banner that named the target anyway — so a
 * build that never reached the vault still read as a success, and the dev
 * smoke-tested a stale plugin. Failures are now collected, reported with their
 * real error code, and turned into a non-zero exit.
 */
const failures = [];

for (const artifactName of artifactNames) {
	const sourcePath = path.join(root, artifactName);
	await stat(sourcePath);
	await cp(sourcePath, path.join(distBuildDir, artifactName), { force: true });

	for (const target of syncTargets) {
		try {
			await cp(sourcePath, path.join(target, artifactName), { force: true });
		} catch (error) {
			failures.push({ artifactName, target, error });
		}
	}
}

if (failures.length > 0) {
	console.error('Failed to sync test build artifacts:');
	for (const { artifactName, target, error } of failures) {
		console.error(
			`- ${artifactName} -> ${target}: ${error.code ?? 'ERROR'} ${error.message}`,
		);
	}
	console.error(
		`The build is still in ${distBuildDir}; copy it manually or re-run once the target is writable.`,
	);
	process.exitCode = 1;
} else {
	console.log('Synced test build artifacts to:');
	console.log(`- ${distBuildDir}`);
	console.log(`- ${pluginDevTarget}`);
}
