import { describe, expect, it } from 'vitest';

import {
	shouldShowUpdates,
	updatesAnchorForVersion,
	updatesUrlForVersion,
} from '../../src/logic/logicUpdateNotice';
import { releaseBulletinAnchor } from '../../scripts/release-core.mjs';
import mainSource from '../../src/main.ts?raw';
import modalSource from '../../src/modals/modalUpdates.ts?raw';

describe('versioned Updates welcome', () => {
	it('shows once when the installed version changes', () => {
		expect(shouldShowUpdates(undefined, '1.2.0-beta.2')).toBe(true);
		expect(shouldShowUpdates('', '1.2.0-beta.2')).toBe(true);
		expect(shouldShowUpdates('1.2.0-beta.1', '1.2.0-beta.2')).toBe(true);
		expect(shouldShowUpdates('1.2.0-beta.2', '1.2.0-beta.2')).toBe(false);
		expect(shouldShowUpdates('1.2.0-beta.2', '')).toBe(false);
	});

	it('pins the bulletin URL and anchor to the exact installed tag', () => {
		expect(updatesAnchorForVersion('1.2.0-beta.5')).toBe('v1-2-0-beta-5');
		expect(releaseBulletinAnchor('1.2.0-beta.5')).toBe(
			updatesAnchorForVersion('1.2.0-beta.5'),
		);
		expect(updatesUrlForVersion('1.2.0-beta.5')).toBe(
			'https://github.com/Meibbo/Vaultman/blob/1.2.0-beta.5/docs/whats-new.md#v1-2-0-beta-5',
		);
		expect(updatesUrlForVersion('2.0.0')).toBe(
			'https://github.com/Meibbo/Vaultman/blob/2.0.0/docs/whats-new.md#v2-0-0',
		);
		expect(updatesUrlForVersion('1.2.1')).toBe(
			'https://github.com/Meibbo/Vaultman/blob/1.2.1/docs/whats-new.md#v1-2-1',
		);
		expect(() => updatesUrlForVersion('dev')).toThrow('Invalid release version');
	});

	it('uses a non-blocking prompt, the manifest version, and remains reopenable', () => {
		expect(mainSource).toContain('showUpdatesIfNeeded');
		expect(mainSource).toContain('this.app.workspace.onLayoutReady');
		expect(mainSource).toContain('lastSeenUpdatesVersion');
		expect(mainSource).toContain('const currentVersion = this.manifest.version');
		expect(mainSource).toContain('new Notice(fragment, 0)');
		expect(mainSource).toContain("id: 'open-updates'");
		expect(mainSource).not.toContain('CURRENT_UPDATES_VERSION');
		expect(modalSource).toContain('updatesUrlForVersion(this.version)');
		expect(modalSource).toContain("translate('updates.copy_url')");
		expect(modalSource).not.toContain("'updates.clean_filters'");
	});
});
