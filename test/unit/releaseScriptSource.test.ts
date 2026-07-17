import { describe, expect, it } from 'vitest';

import packageSource from '../../package.json?raw';
import workflowSource from '../../.github/workflows/release.yml?raw';
import releaseSource from '../../scripts/release.mjs?raw';

describe('release CLI safety contract', () => {
	it('exposes the multichannel release command and keeps the version lifecycle valid', () => {
		const packageJson = JSON.parse(packageSource as string) as {
			scripts: Record<string, string>;
		};
		expect(packageJson.scripts.release).toBe('node scripts/release.mjs');
		expect(packageJson.scripts.version).toContain('scripts/version-bump.mjs');
	});

	it('supports safe phases and all required headless gates', () => {
		expect(releaseSource).toContain("'--dry-run'");
		expect(releaseSource).toContain("'--prepare-only'");
		expect(releaseSource).toContain("'--yes'");
		expect(releaseSource).toContain("['run', 'verify']");
		expect(releaseSource).toContain("['run', 'security:audit']");
		expect(releaseSource).toContain("['run', 'build']");
		expect(releaseSource).toContain('shell: false');
	});

	it('checks forbidden AI paths and verifies the resulting GitHub release assets', () => {
		expect(releaseSource).toContain("'.agents/'");
		expect(releaseSource).toContain("'AGENTS.md'");
		expect(releaseSource).toContain("'main.js'");
		expect(releaseSource).toContain("'manifest.json'");
		expect(releaseSource).toContain("'styles.css'");
	});

	it('publishes curated release notes instead of replacing them with a generic body', () => {
		expect(releaseSource).toContain("'RELEASE_NOTES.md'");
		expect(workflowSource).toContain('--notes-file RELEASE_NOTES.md');
	});

	it('reports slow preflight boundaries instead of appearing stalled', () => {
		expect(releaseSource).toContain('Checking clean worktree');
		expect(releaseSource).toContain('Fetching remote tags');
		expect(releaseSource).toContain('Checking GitHub release state');
	});

	it('uses the release query as the auth check without the non-TTY gh auth hang', () => {
		expect(releaseSource).not.toContain("['auth', 'status']");
		expect(releaseSource).toContain('release not found');
	});

	it('accepts the literal separator forwarded by pnpm 11', () => {
		expect(releaseSource).toContain("argument !== '--'");
	});
});
