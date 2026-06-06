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

for (const artifactName of artifactNames) {
	const sourcePath = path.join(root, artifactName);
	await stat(sourcePath);
	await cp(sourcePath, path.join(distBuildDir, artifactName), { force: true });

	for (const target of syncTargets) {
		try {
			await cp(sourcePath, path.join(target, artifactName), { force: true });
		} catch {
			console.warn(
				`Warning: Could not copy ${artifactName} to target: ${target}`,
			);
		}
	}
}

console.log('Synced test build artifacts to:');
console.log(`- ${distBuildDir}`);
console.log(`- ${pluginDevTarget}`);
