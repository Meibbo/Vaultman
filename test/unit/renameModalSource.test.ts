import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import renameModalSource from '../../src/modals/modalFileRename.ts?raw';

describe('file rename modal source guards', () => {
	it('uses localized property placeholder help instead of hardcoded Spanish copy', () => {
		expect(renameModalSource).toContain("translate('rename.help')");
		expect(renameModalSource).not.toContain('{propiedad}');
		expect(renameModalSource).not.toContain('[fecha]');
	});

	it('blocks invalid property rename patterns before queuing changes', () => {
		expect(renameModalSource).toContain(
			"new Notice(translate('rename.pattern_warning')",
		);
		expect(renameModalSource).toContain(
			'const blockedRenames = renames.filter',
		);
		expect(renameModalSource).toContain('if (blockedRenames.length > 0)');
		expect(renameModalSource).toContain('issues.length > 0');
	});

	it('localizes property rename validation warnings', () => {
		for (const messages of [en, es]) {
			expect(messages['rename.pattern_warning']).toContain('{count}');
			expect(messages['rename.pattern_warning']).toContain('{reason}');
			expect(messages['rename.issue.missing_property']).toContain('{property}');
			expect(messages['rename.issue.non_text_property']).toContain('{property}');
			expect(messages['rename.issue.invalid_pattern']).toContain('{token}');
		}
	});
});
