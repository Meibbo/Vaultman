import { cp, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distBuildDir = path.join(root, 'dist', 'build');

const artifactNames = ['main.js', 'manifest.json', 'styles.css'];

await mkdir(distBuildDir, { recursive: true });

for (const artifactName of artifactNames) {
	const sourcePath = path.join(root, artifactName);
	await stat(sourcePath);
	await cp(sourcePath, path.join(distBuildDir, artifactName), { force: true });
}

console.log(`Synced test build artifacts to ${distBuildDir}`);
