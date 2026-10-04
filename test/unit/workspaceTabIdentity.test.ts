import { describe, expect, it } from 'vitest';
import { workspaceTabIdentity } from '../../src/logic/logicWorkspaceTabIdentity';

describe('workspace tab scene identity', () => {
	it('retains Vaultman identity when mirroring is off', () => {
		expect(workspaceTabIdentity(false, 'files')).toEqual({ labelKey: 'plugin.frame_name', icon: 'lucide-vault' });
	});
	it('uses scene menu metadata when mirroring is on', () => {
		expect(workspaceTabIdentity(true, 'files')).toEqual({ labelKey: 'filter.tab.files', icon: 'lucide-folder' });
		expect(workspaceTabIdentity(true, 'plugins')).toEqual({ labelKey: 'filter.tab.plugins', icon: 'lucide-plug' });
	});
	it('does not invent a scene identity for a missing instance or unknown scene', () => {
		expect(workspaceTabIdentity(true, undefined)).toEqual(workspaceTabIdentity(false, 'files'));
		expect(workspaceTabIdentity(true, 'unknown')).toEqual(workspaceTabIdentity(false, 'files'));
	});
});
