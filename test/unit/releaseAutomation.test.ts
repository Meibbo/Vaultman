import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// @ts-expect-error release.mjs has no declaration file
import { isAlreadyPrepared } from '../../scripts/release.mjs';
import {
	branchForChannel,
	applyVersionMetadata,
	insertChangelogRelease,
	parseChangeFragment,
	parseVersion,
	previousVersionForRelease,
	renderReleaseNotes,
	releaseBulletinAnchor,
	resolveReleaseRequest,
	resolveVersion,
	selectChangeFragments,
	updateChangelogLinks,
	validateReleaseBulletin,
	validateExplicitVersion,
} from '../../scripts/release-core.mjs';

describe('multichannel release version resolver', () => {
	it('parses stable and prerelease SemVer tags', () => {
		expect(parseVersion('1.2.3')).toMatchObject({
			major: 1,
			minor: 2,
			patch: 3,
			channel: 'stable',
		});
		expect(parseVersion('1.3.0-beta.4')).toMatchObject({
			major: 1,
			minor: 3,
			patch: 0,
			channel: 'beta',
			prereleaseNumber: 4,
		});
		expect(() => parseVersion('v1.3')).toThrow('Invalid SemVer');
	});

	it('increments a stable patch inside its line despite a newer beta train', () => {
		expect(
			resolveVersion({
				channel: 'stable',
				line: '1.2',
				tags: ['1.2.0', '1.3.0-beta.3'],
			}),
		).toBe('1.2.1');
	});

	it('promotes prereleases to the matching stable core before incrementing patches', () => {
		expect(
			resolveVersion({
				channel: 'stable',
				line: '1.3',
				tags: ['1.2.6', '1.3.0-alpha.2', '1.3.0-beta.4'],
			}),
		).toBe('1.3.0');
	});

	it('increments prereleases independently per core and channel', () => {
		expect(
			resolveVersion({
				channel: 'alpha',
				line: '2.0',
				tags: ['1.3.0-alpha.9', '2.0.0-alpha.2'],
			}),
		).toBe('2.0.0-alpha.3');
		expect(
			resolveVersion({
				channel: 'beta',
				line: '1.3',
				tags: ['1.3.0-alpha.4'],
			}),
		).toBe('1.3.0-beta.1');
	});

	it('rejects channel regressions on the same core', () => {
		expect(() =>
			resolveVersion({
				channel: 'alpha',
				line: '1.3',
				tags: ['1.3.0-beta.1'],
			}),
		).toThrow('already reached beta');
		expect(() =>
			resolveVersion({
				channel: 'beta',
				line: '1.3',
				tags: ['1.3.0'],
			}),
		).toThrow('already reached stable');
	});

	it('validates explicit versions without silently correcting them', () => {
		expect(
			validateExplicitVersion({
				version: '1.3.0-beta.4',
				tags: ['1.2.0', '1.3.0-beta.1'],
			}),
		).toMatchObject({
			version: '1.3.0-beta.4',
			channel: 'beta',
			line: '1.3',
		});
		expect(() =>
			validateExplicitVersion({
				version: '1.3.0-beta.1',
				tags: ['1.3.0-beta.1'],
			}),
		).toThrow('Suggested version: 1.3.0-beta.2');
	});

	it('maps release channels to their publication branches', () => {
		expect(branchForChannel('alpha')).toBe('sandbox');
		expect(branchForChannel('beta')).toBe('dev');
		expect(branchForChannel('stable')).toBe('main');
	});

	it('supports calculated and explicit one-command requests', () => {
		expect(
			resolveReleaseRequest(['beta', '1.3'], ['1.3.0-beta.1']),
		).toMatchObject({ version: '1.3.0-beta.2', branch: 'dev' });
		expect(
			resolveReleaseRequest(['1.2.1'], ['1.2.0', '1.3.0-beta.1']),
		).toMatchObject({ version: '1.2.1', branch: 'main' });
	});

	it('chooses comparison bases inside the relevant train', () => {
		expect(
			previousVersionForRelease('1.2.1', ['1.2.0', '1.3.0-beta.2']),
		).toBe('1.2.0');
		expect(
			previousVersionForRelease('1.3.0', [
				'1.2.1',
				'1.3.0-alpha.2',
				'1.3.0-beta.3',
			]),
		).toBe('1.3.0-beta.3');
	});
});

describe('release-note fragments', () => {
	const betaFragment = parseChangeFragment(
		'changes/1.3/floating-toc.md',
		'---\ntype: Fixed\nreviewed: true\n---\nFixed the floating index rail.',
	);
	const patchFragment = parseChangeFragment(
		'changes/1.2/sidebar.md',
		'---\ntype: Changed\nreviewed: true\n---\nImproved sidebar sizing.',
	);

	it('derives the release line from the fragment path and validates categories', () => {
		expect(betaFragment).toEqual({
			line: '1.3',
			type: 'Fixed',
			reviewed: true,
			text: 'Fixed the floating index rail.',
			source: 'changes/1.3/floating-toc.md',
		});
		expect(() =>
			parseChangeFragment(
				'changes/1.3/bad.md',
				'---\ntype: Surprise\nreviewed: true\n---\nNo.',
			),
		).toThrow('Unsupported changelog category');
		expect(() =>
			parseChangeFragment(
				'changes/1.3/unreviewed.md',
				'---\ntype: Fixed\n---\nNot reviewed.',
			),
		).toThrow('must declare reviewed: true');
	});

	it('selects only reviewed notes for the requested release line', () => {
		expect(
			selectChangeFragments([betaFragment, patchFragment], '1.3'),
		).toEqual([betaFragment]);
	});

	it('renders deterministic cumulative notes by Keep a Changelog category', () => {
		const notes = renderReleaseNotes(
			[
				betaFragment,
				parseChangeFragment(
					'changes/1.3/add.md',
					'---\ntype: Added\nreviewed: true\n---\nAdded plugin explorer.',
				),
			],
			'1.3.0-beta.1',
		);

		expect(notes).not.toContain('# 1.3.0-beta.1');
		expect(notes).toMatch(/^## Added/u);
		expect(notes.indexOf('## Added')).toBeLessThan(notes.indexOf('## Fixed'));
		expect(notes).toContain('- Added plugin explorer.');
	});

	it('adds the mandatory instability notice to alpha notes', () => {
		const notes = renderReleaseNotes([betaFragment], '1.3.0-alpha.1');
		expect(notes).toContain('extremely unstable');
		expect(notes).toContain('no migration guarantee');
	});

	it('inserts a release section below Unreleased without losing older trains', () => {
		const changelog = [
			'# Changelog',
			'',
			'## [Unreleased]',
			'',
			'## [1.2.0-beta.1] - 2026-07-15',
			'',
			'### Added',
			'',
			'- Earlier work.',
			'',
		].join('\n');
		const notes = '# 1.2.0-beta.2\n\n## Fixed\n\n- New fix.\n';
		const result = insertChangelogRelease(
			changelog,
			'1.2.0-beta.2',
			'2026-07-17',
			notes,
		);

		expect(result).toContain('## [1.2.0-beta.2] - 2026-07-17');
		expect(result).toContain('## [1.2.0-beta.1] - 2026-07-15');
		expect(result.indexOf('[1.2.0-beta.2]')).toBeLessThan(
			result.indexOf('[1.2.0-beta.1]'),
		);
	});

	it('updates comparison links for the new release', () => {
		const changelog = [
			'[Unreleased]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.1...HEAD',
			'[1.2.0-beta.1]: https://github.com/Meibbo/Vaultman/compare/1.1.6...1.2.0-beta.1',
		].join('\n');
		const result = updateChangelogLinks(changelog, {
			version: '1.2.0-beta.2',
			previousVersion: '1.2.0-beta.1',
			repositoryUrl: 'https://github.com/Meibbo/Vaultman',
		});

		expect(result).toContain(
			'[Unreleased]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.2...HEAD',
		);
		expect(result).toContain(
			'[1.2.0-beta.2]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.1...1.2.0-beta.2',
		);
	});

	it('keeps package, manifest, and compatibility versions aligned', () => {
		const result = applyVersionMetadata({
			packageJson: { name: 'vaultman', version: '1.2.0-beta.1' },
			manifest: { version: '1.2.0-beta.1', minAppVersion: '1.12.0' },
			versions: { '1.2.0-beta.1': '1.12.0' },
			version: '1.2.0-beta.2',
		});

		expect(result.packageJson.version).toBe('1.2.0-beta.2');
		expect(result.manifest.version).toBe('1.2.0-beta.2');
		expect(result.versions['1.2.0-beta.2']).toBe('1.12.0');
	});
});

describe('tag-pinned release bulletin', () => {
	const version = '1.3.0-beta.2';
	const anchor = 'v1-3-0-beta-2';
	const changelog = [
		'# Changelog',
		'',
		'## [1.3.0-beta.2] - 2026-07-20',
		'',
		'### Added',
		'',
		'- A reviewed change.',
	].join('\n');
	const bulletin = [
		'# What is new in Vaultman',
		'',
		`<a id="${anchor}"></a>`,
		`## ${version} — Faster daily work`,
		'<!-- reviewed: true -->',
		'',
		'- **Faster:** visible explorer rows settle first.',
		'',
		'![Explorer preview](../img/feature.png)',
		'',
		'[Full changelog](../CHANGELOG.md#130-beta2---2026-07-20)',
		'',
		'<a id="v1-3-0-beta-1"></a>',
		'## 1.3.0-beta.1',
	].join('\n');

	it('shares the plugin anchor policy and returns relative targets for preflight', () => {
		expect(releaseBulletinAnchor(version)).toBe(anchor);
		expect(
			validateReleaseBulletin({ bulletin, changelog, version }),
		).toMatchObject({
			anchor,
			relativeTargets: [
				'../img/feature.png',
				'../CHANGELOG.md#130-beta2---2026-07-20',
			],
		});
	});

	it('requires explicit editorial review and a same-version changelog link', () => {
		expect(() =>
			validateReleaseBulletin({
				bulletin: bulletin.replace('<!-- reviewed: true -->', ''),
				changelog,
				version,
			}),
		).toThrow('reviewed');
		expect(() =>
			validateReleaseBulletin({
				bulletin: bulletin.replace('../CHANGELOG.md#', '../README.md#'),
				changelog,
				version,
			}),
		).toThrow('CHANGELOG');
	});

	it('rejects a changelog link whose fragment does not match the release heading', () => {
		expect(() =>
			validateReleaseBulletin({
				bulletin: bulletin.replace(
					'130-beta2---2026-07-20',
					'wrong-release-anchor',
				),
				changelog,
				version,
			}),
		).toThrow('exact CHANGELOG anchor');
	});

	it('rejects mutable-branch GitHub media in the target section', () => {
		expect(() =>
			validateReleaseBulletin({
				bulletin: bulletin.replace(
					'../img/feature.png',
					'https://github.com/Meibbo/Vaultman/blob/dev/img/feature.png',
				),
				changelog,
				version,
			}),
		).toThrow('mutable branch');
	});
});

describe('isAlreadyPrepared compara tambien las notas (beta.3)', () => {
	function setupPreparedDir(version: string, notesContent: string) {
		const dir = mkdtempSync(join(tmpdir(), 'vaultman-prepared-'));
		writeFileSync(join(dir, 'package.json'), JSON.stringify({ version }));
		writeFileSync(
			join(dir, 'manifest.json'),
			JSON.stringify({ version, minAppVersion: '1.12.0' }),
		);
		writeFileSync(join(dir, 'CHANGELOG.md'), `# Changelog\n\n## [${version}] - 2026-08-28\n\nBody\n`);
		writeFileSync(join(dir, 'RELEASE_NOTES.md'), notesContent);
		return dir;
	}

	it('preparada + notas iguales da true', () => {
		const version = '1.3.0-beta.3';
		const notes = '## Added\n\n- Fix A\n';
		const dir = setupPreparedDir(version, notes);
		const previousCwd = process.cwd();
		try {
			process.chdir(dir);
			expect(isAlreadyPrepared({ version } as any, notes)).toBe(true);
		} finally {
			process.chdir(previousCwd);
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('preparada + notas distintas da false (caso beta.3: funcion revertida)', () => {
		const version = '1.3.0-beta.3';
		const staleNotes = '## Added\n\n- Added floating column view\n';
		const freshNotes = '## Fixed\n\n- Fixed tree indent regression\n';
		const dir = setupPreparedDir(version, staleNotes);
		const previousCwd = process.cwd();
		try {
			process.chdir(dir);
			expect(isAlreadyPrepared({ version } as any, freshNotes)).toBe(false);
		} finally {
			process.chdir(previousCwd);
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('normaliza salto final y \\r\\n para no marcar desfasada una release bien preparada', () => {
		const version = '1.3.0-beta.3';
		const fileNotes = '## Added\n\n- Fix A\r\n';
		const expectedNotes = '## Added\n\n- Fix A\n';
		const dir = setupPreparedDir(version, fileNotes);
		const previousCwd = process.cwd();
		try {
			process.chdir(dir);
			expect(isAlreadyPrepared({ version } as any, expectedNotes)).toBe(true);
			expect(isAlreadyPrepared({ version } as any, expectedNotes.replace('\n', '\r\n'))).toBe(true);
			expect(isAlreadyPrepared({ version } as any, `${expectedNotes.trimEnd()}`)).toBe(true);
		} finally {
			process.chdir(previousCwd);
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('no esta preparada si falta RELEASE_NOTES.md o la version no coincide', () => {
		const version = '1.3.0-beta.3';
		const notes = '## Added\n\n- Fix A\n';
		const dir = mkdtempSync(join(tmpdir(), 'vaultman-prepared-'));
		writeFileSync(join(dir, 'package.json'), JSON.stringify({ version }));
		writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ version, minAppVersion: '1.12.0' }));
		writeFileSync(join(dir, 'CHANGELOG.md'), `# Changelog\n\n## [${version}] - 2026-08-28\n\nBody\n`);
		const previousCwd = process.cwd();
		try {
			process.chdir(dir);
			expect(isAlreadyPrepared({ version } as any, notes)).toBe(false);
			writeFileSync(join(dir, 'RELEASE_NOTES.md'), notes);
			expect(isAlreadyPrepared({ version: '1.3.0-beta.4' } as any, notes)).toBe(false);
		} finally {
			process.chdir(previousCwd);
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
