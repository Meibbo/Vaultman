import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

await mkdir('dist/release', { recursive: true });

const cdxgenArgs = [
	'-t',
	'js',
	'--no-recurse',
	'--no-install-deps',
	'--required-only',
	'--spec-version',
	'1.6',
	'-o',
	'dist/release/sbom.cdx.json',
	'.',
];
const command = process.platform === 'win32' ? 'cmd.exe' : 'cdxgen';
const commandArgs =
	process.platform === 'win32' ? ['/d', '/s', '/c', 'cdxgen', ...cdxgenArgs] : cdxgenArgs;
const env = { ...process.env };
delete env.NODE_PATH;

const result = spawnSync(command, commandArgs, {
	env,
	stdio: 'inherit',
});

process.exit(result.status ?? 1);
