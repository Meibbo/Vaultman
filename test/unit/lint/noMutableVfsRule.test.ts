import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - .mjs default export
import rule from '../../../eslint-rules/no-mutable-vfs.mjs';

const tester = new RuleTester({
	languageOptions: { parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
});

describe('no-mutable-vfs', () => {
	it('passes valid and rejects invalid cases', () => {
		tester.run('no-mutable-vfs', rule, {
			valid: [
				{ code: 'const next = op.apply(vfs);' },
				{ code: 'const fm = { ...vfs.fm, k: 1 };' },
				{ code: 'const body = vfs.body;' },
			],
			invalid: [
				{ code: 'vfs.fm = { k: 1 };', errors: [{ messageId: 'noVfsFieldAssign' }] },
				{ code: "vfs.body = 'x';", errors: [{ messageId: 'noVfsFieldAssign' }] },
				{ code: 'vfs.ops.push(op);', errors: [{ messageId: 'noVfsArrayMutator' }] },
				{ code: 'vfs.ops.splice(0, 1);', errors: [{ messageId: 'noVfsArrayMutator' }] },
			],
		});
	});
});
