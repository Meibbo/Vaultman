import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const viteBuildDir = path.join(root, 'dist', 'vite');
const distBuildDir = path.join(root, 'dist', 'build');

// User's specific test vault target
const driveVaultTarget = 'C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman';
const stressVaultTarget = path.join(root, 'test', 'vaults', 'stress-vault', '.obsidian', 'plugins', 'vaultman');

const artifactNames = ['main.js', 'manifest.json', 'styles.css'];

await mkdir(distBuildDir, { recursive: true });
const syncTargets = [driveVaultTarget, stressVaultTarget];

for (const target of syncTargets) {
	try {
		await mkdir(target, { recursive: true });
	} catch {
		console.warn(`Warning: Could not create/access target: ${target}`);
	}
}

for (const artifactName of artifactNames) {
	const viteArtifactPath = path.join(viteBuildDir, artifactName);
	const rootArtifactPath = path.join(root, artifactName);
	const sourcePath = artifactName === 'manifest.json' ? rootArtifactPath : viteArtifactPath;

	await stat(sourcePath);
	if (sourcePath !== rootArtifactPath) {
		await cp(sourcePath, rootArtifactPath, { force: true });
	}
	await cp(rootArtifactPath, path.join(distBuildDir, artifactName), { force: true });

	for (const target of syncTargets) {
		try {
			await cp(rootArtifactPath, path.join(target, artifactName), { force: true });
		} catch {
			console.warn(`Warning: Could not copy ${artifactName} to target: ${target}`);
		}
	}
}

console.log(`Synced Vite+ build artifacts to:`);
console.log(`- ${root}`);
console.log(`- ${distBuildDir}`);
console.log(`- ${driveVaultTarget}`);
console.log(`- ${stressVaultTarget}`);
