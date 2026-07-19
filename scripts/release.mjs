import { spawnSync } from 'node:child_process';
import {
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import process from 'node:process';

import {
	applyVersionMetadata,
	insertChangelogRelease,
	parseChangeFragment,
	previousVersionForRelease,
	releaseBulletinAnchor,
	renderReleaseNotes,
	resolveReleaseRequest,
	selectChangeFragments,
	updateChangelogLinks,
	validateReleaseBulletin,
} from './release-core.mjs';

const FLAGS = new Set(['--dry-run', '--prepare-only', '--yes']);
const FORBIDDEN_PATHS = [
	'.agents/',
	'.claude/',
	'AGENTS.md',
	'CLAUDE.md',
];
const REQUIRED_ASSETS = ['main.js', 'manifest.json', 'styles.css'];
const GATES = [
	['run', 'verify'],
	['run', 'security:audit'],
	['run', 'build'],
];
const RELEASE_FILES = [
	'package.json',
	'manifest.json',
	'versions.json',
	'CHANGELOG.md',
	'RELEASE_NOTES.md',
	'docs/whats-new.md',
];
const REPOSITORY_URL = 'https://github.com/Meibbo/Vaultman';
const BULLETIN_PATH = 'docs/whats-new.md';

function executable(name) {
	return name;
}

function run(command, args, options = {}) {
	const result = spawnSync(executable(command), args, {
		cwd: process.cwd(),
		encoding: 'utf8',
		stdio: options.capture ? 'pipe' : 'inherit',
		shell: false,
	});
	if (result.error) throw result.error;
	if (result.status !== 0 && !options.allowFailure) {
		const detail = options.capture
			? `\n${result.stdout ?? ''}${result.stderr ?? ''}`.trimEnd()
			: '';
		throw new Error(
			`${command} ${args.join(' ')} failed with exit code ${result.status}.${detail}`,
		);
	}
	return result;
}

function output(command, args) {
	return run(command, args, { capture: true }).stdout.trim();
}

function parseArguments(argv) {
	const normalized = argv.filter((argument) => argument !== '--');
	const flags = new Set(normalized.filter((argument) => FLAGS.has(argument)));
	const unknownFlags = normalized.filter(
		(argument) => argument.startsWith('--') && !FLAGS.has(argument),
	);
	if (unknownFlags.length > 0) {
		throw new Error(`Unknown release option(s): ${unknownFlags.join(', ')}`);
	}
	return {
		request: normalized.filter((argument) => !argument.startsWith('--')),
		dryRun: flags.has('--dry-run'),
		prepareOnly: flags.has('--prepare-only'),
		yes: flags.has('--yes'),
	};
}

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
	writeFileSync(path, `${JSON.stringify(value, null, '\t')}\n`, 'utf8');
}

function listMarkdownFiles(directory) {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return listMarkdownFiles(path);
		return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
	});
}

function loadFragments() {
	return listMarkdownFiles('changes')
		.map((path) => [relative(process.cwd(), path).replaceAll('\\', '/'), path])
		.filter(([source]) => /^changes\/\d+\.\d+\/[^/]+\.md$/u.test(source))
		.map(([source, path]) =>
			parseChangeFragment(source, readFileSync(path, 'utf8')),
		);
}

function listTags() {
	const tags = output('git', ['tag', '--list']);
	return tags ? tags.split(/\r?\n/u).filter(Boolean) : [];
}

function ensureCleanWorktree() {
	const status = output('git', ['status', '--porcelain']);
	if (status) {
		throw new Error(
			'Release worktree must be clean. Commit or stash implementation changes first.',
		);
	}
}

function ensureExpectedBranch(branch) {
	const current = output('git', ['branch', '--show-current']);
	if (current !== branch) {
		throw new Error(`Release channel requires branch ${branch}; current branch is ${current}.`);
	}
}

function ensureUpstreamContainsHeadBase(branch) {
	const remoteRef = `origin/${branch}`;
	const result = run('git', ['merge-base', '--is-ancestor', remoteRef, 'HEAD'], {
		capture: true,
		allowFailure: true,
	});
	if (result.status !== 0) {
		throw new Error(`${branch} is behind or diverged from ${remoteRef}; synchronize first.`);
	}
}

function ensureNoForbiddenPublicPaths(branch) {
	const range = branch === 'main' ? 'HEAD' : 'origin/main...HEAD';
	const files = output('git', [
		branch === 'main' ? 'ls-files' : 'diff',
		...(branch === 'main' ? [] : ['--name-only', range]),
	])
		.split(/\r?\n/u)
		.filter(Boolean);
	const forbidden = files.filter((path) =>
		FORBIDDEN_PATHS.some(
			(prefix) => path === prefix || path.startsWith(prefix),
		),
	);
	if (forbidden.length > 0) {
		throw new Error(`AI workflow files cannot be published:\n${forbidden.join('\n')}`);
	}
}

function ensureGitHubState(version, tags) {
	const release = run(
		'gh',
		['release', 'view', version, '--json', 'tagName,isPrerelease,url'],
		{ capture: true, allowFailure: true },
	);
	const releaseError = `${release.stderr ?? ''}`.trim();
	if (release.status !== 0 && !releaseError.toLowerCase().includes('release not found')) {
		throw new Error(`GitHub release check failed: ${releaseError || `exit ${release.status}`}`);
	}
	if (release.status === 0 || tags.includes(version)) {
		const detail = release.status === 0 ? release.stdout.trim() : 'tag exists without release';
		throw new Error(`Release ${version} already exists or is interrupted: ${detail}`);
	}
}

function captureFiles(paths) {
	return new Map(
		paths.map((path) => [
			path,
			existsSync(path) ? readFileSync(path) : null,
		]),
	);
}

function restoreFiles(snapshot) {
	for (const [path, content] of snapshot) {
		if (content === null) {
			if (existsSync(path)) rmSync(path, { force: true });
		} else {
			writeFileSync(path, content);
		}
	}
}

function printPlan(target, notes, options) {
	console.log('\nVaultman release plan');
	console.log(`  version: ${target.version}`);
	console.log(`  channel: ${target.channel}`);
	console.log(`  branch:  ${target.branch}`);
	console.log(`  mode:    ${options.dryRun ? 'dry-run' : options.prepareOnly ? 'prepare-only' : 'publish'}`);
	console.log('\nReviewed cumulative notes:\n');
	console.log(notes.trim());
}

async function confirmRelease(options) {
	if (options.yes || options.dryRun) return;
	const reader = createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = await reader.question('\nPrepare this release? Type "release" to continue: ');
		if (answer.trim() !== 'release') throw new Error('Release cancelled.');
	} finally {
		reader.close();
	}
}

function changelogForRelease(target, releaseNotes, tags) {
	const previousVersion = previousVersionForRelease(target.version, tags);
	let changelog = insertChangelogRelease(
		readFileSync('CHANGELOG.md', 'utf8'),
		target.version,
		new Date().toISOString().slice(0, 10),
		releaseNotes,
	);
	changelog = updateChangelogLinks(changelog, {
		version: target.version,
		previousVersion,
		repositoryUrl: REPOSITORY_URL,
	});
	return changelog;
}

function ensureReleaseBulletinTargets(target, changelog) {
	if (!existsSync(BULLETIN_PATH)) {
		throw new Error(`Release bulletin is missing: ${BULLETIN_PATH}`);
	}
	const validation = validateReleaseBulletin({
		bulletin: readFileSync(BULLETIN_PATH, 'utf8'),
		changelog,
		version: target.version,
	});
	const repositoryRoot = resolve(process.cwd());
	for (const targetReference of validation.relativeTargets) {
		const encodedPath = targetReference.split(/[?#]/u, 1)[0];
		let decodedPath;
		try {
			decodedPath = decodeURIComponent(encodedPath);
		} catch {
			throw new Error(
				`Release bulletin has an invalid encoded target: ${targetReference}`,
			);
		}
		const targetPath = resolve(dirname(BULLETIN_PATH), decodedPath);
		const repositoryRelative = relative(repositoryRoot, targetPath);
		if (
			repositoryRelative.startsWith('..') ||
			isAbsolute(repositoryRelative)
		) {
			throw new Error(
				`Release bulletin target escapes the repository: ${targetReference}`,
			);
		}
		if (!existsSync(targetPath)) {
			throw new Error(
				`Release bulletin target does not exist: ${targetReference}`,
			);
		}
	}
	return validation;
}

function prepareMetadata(target, fragments, tags) {
	const packageJson = readJson('package.json');
	const manifest = readJson('manifest.json');
	const versions = readJson('versions.json');
	if (packageJson.version !== manifest.version) {
		throw new Error('package.json and manifest.json versions are not aligned.');
	}

	const metadata = applyVersionMetadata({
		packageJson,
		manifest,
		versions,
		version: target.version,
	});
	const releaseNotes = renderReleaseNotes(fragments, target.version);
	const changelog = changelogForRelease(target, releaseNotes, tags);

	writeJson('package.json', metadata.packageJson);
	writeJson('manifest.json', metadata.manifest);
	writeJson('versions.json', metadata.versions);
	writeFileSync('CHANGELOG.md', changelog, 'utf8');
	writeFileSync('RELEASE_NOTES.md', releaseNotes, 'utf8');

	if (target.channel === 'stable') {
		for (const fragment of fragments) rmSync(fragment.source);
	}
}

function isAlreadyPrepared(target) {
	if (!existsSync('RELEASE_NOTES.md')) return false;
	const packageJson = readJson('package.json');
	const manifest = readJson('manifest.json');
	const changelog = readFileSync('CHANGELOG.md', 'utf8');
	return (
		packageJson.version === target.version &&
		manifest.version === target.version &&
		changelog.includes(`## [${target.version}]`)
	);
}

function runGates() {
	for (const args of GATES) runPnpm(args);
}

function runPnpm(args) {
	if (process.platform !== 'win32') {
		run('corepack', ['pnpm', ...args]);
		return;
	}
	const corepackCli = join(
		dirname(process.execPath),
		'node_modules',
		'corepack',
		'dist',
		'corepack.js',
	);
	if (!existsSync(corepackCli)) {
		throw new Error(`Cannot locate the Corepack CLI at ${corepackCli}.`);
	}
	run(process.execPath, [corepackCli, 'pnpm', ...args]);
}

function createReleaseCommit(target, fragments) {
	const stagedPaths = [...RELEASE_FILES];
	if (target.channel === 'stable') {
		stagedPaths.push(...fragments.map((fragment) => fragment.source));
	}
	run('git', ['add', '--', ...stagedPaths]);
	run('git', ['commit', '-m', `chore(release): prepare ${target.version}`]);
}

function findWorkflowRun(version) {
	const result = JSON.parse(
		output('gh', [
			'run',
			'list',
			'--workflow',
			'release.yml',
			'--limit',
			'20',
			'--json',
			'databaseId,headBranch,status,conclusion,url',
		]),
	);
	return result.find((runRecord) => runRecord.headBranch === version) ?? null;
}

async function waitForWorkflow(version) {
	let workflow = null;
	for (let attempt = 0; attempt < 24 && !workflow; attempt += 1) {
		workflow = findWorkflowRun(version);
		if (!workflow) await new Promise((resolve) => setTimeout(resolve, 5000));
	}
	if (!workflow) throw new Error(`Timed out waiting for release.yml for ${version}.`);
	console.log(`Watching ${workflow.url}`);
	run('gh', ['run', 'watch', String(workflow.databaseId), '--exit-status']);
}

function verifyPublishedRelease(target) {
	const release = JSON.parse(
		output('gh', [
			'release',
			'view',
			target.version,
			'--json',
			'tagName,isPrerelease,isDraft,url,assets',
		]),
	);
	const expectedPrerelease = target.channel !== 'stable';
	if (
		release.tagName !== target.version ||
		release.isDraft ||
		release.isPrerelease !== expectedPrerelease
	) {
		throw new Error(`GitHub release channel metadata is incorrect: ${JSON.stringify(release)}`);
	}
	const assetNames = new Set(release.assets.map((asset) => asset.name));
	const missing = REQUIRED_ASSETS.filter((asset) => !assetNames.has(asset));
	if (missing.length > 0) {
		throw new Error(`GitHub release is missing assets: ${missing.join(', ')}`);
	}
	verifyPublishedBulletin(target);
	console.log(`Published ${target.version}: ${release.url}`);
}

function verifyPublishedBulletin(target) {
	const record = JSON.parse(
		output('gh', [
			'api',
			`repos/Meibbo/Vaultman/contents/${BULLETIN_PATH}?ref=${encodeURIComponent(target.version)}`,
		]),
	);
	const source = Buffer.from(
		String(record.content ?? '').replace(/\s/gu, ''),
		'base64',
	).toString('utf8');
	const anchor = releaseBulletinAnchor(target.version);
	if (!record.download_url || !source.includes(`<a id="${anchor}"></a>`)) {
		throw new Error(
			`Published bulletin URL or anchor is unavailable for ${target.version}.`,
		);
	}
}

async function main() {
	const options = parseArguments(process.argv.slice(2));
	if (Number(process.versions.node.split('.')[0]) < 24) {
		throw new Error('Vaultman releases require Node.js 24 or newer.');
	}
	console.log('Checking clean worktree...');
	ensureCleanWorktree();
	console.log('Fetching remote tags...');
	run('git', ['fetch', 'origin', '--tags']);
	const tags = listTags();
	const target = resolveReleaseRequest(options.request, tags);
	console.log(`Checking ${target.channel} branch and public diff...`);
	ensureExpectedBranch(target.branch);
	ensureUpstreamContainsHeadBase(target.branch);
	ensureNoForbiddenPublicPaths(target.branch);
	console.log('Checking GitHub release state...');
	ensureGitHubState(target.version, tags);

	const fragments = selectChangeFragments(loadFragments(), target.line);
	const releaseNotes = renderReleaseNotes(fragments, target.version);
	const alreadyPrepared = isAlreadyPrepared(target);
	const candidateChangelog = alreadyPrepared
		? readFileSync('CHANGELOG.md', 'utf8')
		: changelogForRelease(target, releaseNotes, tags);
	console.log('Checking release bulletin...');
	ensureReleaseBulletinTargets(target, candidateChangelog);
	printPlan(target, releaseNotes, options);
	if (alreadyPrepared) console.log('\nThis release is already prepared; publication can resume.');
	await confirmRelease(options);
	if (options.dryRun) {
		console.log('\nDry run complete; no files or remote state changed.');
		return;
	}

	const touchedPaths = [
		...RELEASE_FILES,
		...(target.channel === 'stable'
			? fragments.map((fragment) => fragment.source)
			: []),
	];
	if (!alreadyPrepared) {
		const snapshot = captureFiles(touchedPaths);
		let committed = false;
		try {
			prepareMetadata(target, fragments, tags);
			runGates();
			createReleaseCommit(target, fragments);
			committed = true;
		} catch (error) {
			if (!committed) restoreFiles(snapshot);
			throw error;
		}
	} else {
		runGates();
	}

	if (options.prepareOnly) {
		console.log(`Prepared ${target.version}; no push or tag was created.`);
		return;
	}

	run('git', ['push', 'origin', target.branch]);
	run('git', ['tag', '-a', target.version, '-m', target.version]);
	run('git', ['push', 'origin', target.version]);
	await waitForWorkflow(target.version);
	verifyPublishedRelease(target);
}

main().catch((error) => {
	console.error(`\nRelease failed: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
});
