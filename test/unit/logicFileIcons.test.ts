import { describe, expect, it } from 'vitest';

import { resolveScopedFileIcon } from '../../src/logic/logicFileIcons';

describe('Files icon scope', () => {
	it('keeps default or Iconic icons for every node in all mode', () => {
		expect(
			resolveScopedFileIcon('all', false, 'lucide-file', {
				icon: 'lucide-star',
				color: '#ff0',
			}),
		).toEqual({ icon: 'lucide-star', color: '#ff0' });
		expect(resolveScopedFileIcon('all', true, 'lucide-folder', null)).toEqual({
			icon: 'lucide-folder',
		});
	});

	it('can limit icons to files or folders', () => {
		expect(
			resolveScopedFileIcon('files', true, 'lucide-folder', null),
		).toBeNull();
		expect(resolveScopedFileIcon('files', false, 'lucide-file', null)).toEqual({
			icon: 'lucide-file',
		});
		expect(
			resolveScopedFileIcon('folders', false, 'lucide-file', null),
		).toBeNull();
	});

	it('shows only explicitly customized Iconic nodes in custom mode', () => {
		expect(
			resolveScopedFileIcon('custom', false, 'lucide-file', null),
		).toBeNull();
		expect(
			resolveScopedFileIcon('custom', true, 'lucide-folder', {
				color: 'var(--color-red)',
			}),
		).toEqual({ icon: 'lucide-folder', color: 'var(--color-red)' });
	});
});
