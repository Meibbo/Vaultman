import { describe, expect, it } from 'vitest';

import {
	branchForChannel,
	applyVersionMetadata,
	insertChangelogRelease,
	parseChangeFragment,
	parseVersion,
	previousVersionForRelease,
	renderReleaseNotes,
	resolveReleaseRequest,
	resolveVersion,
	selectChangeFragments,
	updateChangelogLinks,
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

		expect(notes).toContain('# 1.3.0-beta.1');
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
