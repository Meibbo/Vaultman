import { describe, expect, it } from 'vitest';

import renameModalSource from '../../src/modals/modalFileRename.ts?raw';

describe('file rename modal source guards', () => {
	it('uses localized property placeholder help instead of hardcoded Spanish copy', () => {
		expect(renameModalSource).toContain("translate('rename.help')");
		expect(renameModalSource).not.toContain('{propiedad}');
		expect(renameModalSource).not.toContain('[fecha]');
	});
});
