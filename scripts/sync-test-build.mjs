import { cp, mkdir, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const root = process.cwd();
const viteBuildDir = path.join(root, 'dist', 'vite');
const distBuildDir = path.join(root, 'dist', 'build');

// User's specific test vault target
const driveVaultTarget = 'C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman';
const stressVaultTarget = path.join(root, 'test', 'vaults', 'stress-vault', '.obsidian', 'plugins', 'vaultman');

// m1a: test vault on m1 (proot archlinux) — Android shared storage, Documents/obsidian.
// Windows OpenSSH ssh.exe hangs when spawned under Node (the child gets no
// console); WSL's Unix ssh/scp works from Node, propagates exit codes and
// needs no console, so the m1a sync runs through WSL (distro archlinux, user vic).
const M1_HOST = 'poco-x6-pro-5g';
const M1_PORT = '8022';
const M1_USER = 'u0_a315';
const M1_VAULT_PLUGIN_DIR =
	'/storage/emulated/0/Documents/obsidian/.obsidian/plugins/vaultman';
const M1_SSH_OPTS =
	'-o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i ~/.ssh/id_ed25519';

async function wslRun(cmdLine) {
	return execFileAsync(
		'wsl',
		['-d', 'archlinux', '-u', 'vic', '--', 'bash', '-lc', cmdLine],
		{ timeout: 60_000 },
	);
}

function anyToWsl(winPath) {
	return winPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_m, d) => `/mnt/${d.toLowerCase()}`);
}

async function syncToM1a(artifactPath) {
	await wslRun(
		`ssh ${M1_SSH_OPTS} -p ${M1_PORT} ${M1_USER}@${M1_HOST} "mkdir -p ${M1_VAULT_PLUGIN_DIR}"`,
	);
	await wslRun(
		`scp ${M1_SSH_OPTS} -P ${M1_PORT} -q "${anyToWsl(artifactPath)}" ${M1_USER}@${M1_HOST}:${M1_VAULT_PLUGIN_DIR}/`,
	);
}

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

	try {
		await syncToM1a(rootArtifactPath);
	} catch (error) {
		console.warn(
			`Warning: Could not sync ${artifactName} to m1a vault (${M1_HOST}): ${error.message}`,
		);
	}
}

console.log(`Synced Vite+ build artifacts to:`);
console.log(`- ${root}`);
console.log(`- ${distBuildDir}`);
console.log(`- ${driveVaultTarget}`);
console.log(`- ${stressVaultTarget}`);
console.log(`- m1a vault (${M1_HOST}:${M1_VAULT_PLUGIN_DIR})`);