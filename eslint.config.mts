import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import oxlint from 'eslint-plugin-oxlint';
import noMutableVfs from './scripts/no-mutable-vfs.mjs'

export default tseslint.config(
	{
		ignores: [
			'node_modules',
			// Nested git worktrees are full repo copies; type-aware linting them hangs
			// eslint indefinitely (~50k files across worktrees). `.claude` below covers
			// `.claude/worktrees`; this covers `.worktrees`.
			'.worktrees',
			'dist',
			'codeql',
			'codeql-db',
			'node_modules.partial',
			'stress-test-data',
			'**/stress-vault',
			'obsidian-sample-plugin',
			'esbuild.config.mjs',
			'vite.config.ts',
			'svelte.config.js',
			'eslint.config.js',
			'version-bump.mjs',
			'versions.json',
			'main.js',
			'.obsidian',
			'.agents',
			'.claude',
			// Tooling configs, same convention as vite/svelte/esbuild configs above;
			// eslint.config.mts otherwise gets parsed by espree (no TS parser -> crash on `as`).
			'eslint.config.mts',
			'stylelint.config.mjs',
			'scripts',
			'test',
			'coverage',
			'vitest.config.ts',
			'wdio.conf.mts',
		],
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				$state: 'readonly',
				$derived: 'readonly',
				$effect: 'readonly',
				$inspect: 'readonly',
				$props: 'readonly',
				$bindable: 'readonly',
				$host: 'readonly',
			},
		},
	},
	{
		files: ['**/*.ts', '**/*.mts', '**/*.cts'],
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ['uno.config.ts'],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	...(obsidianmd as any).configs.recommended,
	// obsidianmd recommended registers its type-aware rule with no files scoping, so
	// it loads for json/mjs/config files whose parsers can never provide typescript
	// parser services — getParserServices throws and crashes the whole `eslint .` run
	// (first package.json, then stylelint.config.mjs, ...). Scope it structurally:
	// off everywhere, re-enabled only for the typed project-service TS sources.
	{
		rules: {
			'obsidianmd/no-plugin-as-component': 'off',
		},
	},
	{
		files: ['src/**/*.ts'],
		rules: {
			'obsidianmd/no-plugin-as-component': 'error',
		},
	},
	// T5: block (app as any) + explicit-any + type-unsafe rules — ts only
	// (.svelte files excluded: no Svelte parser configured, obsidianmd handles svelte via its own pipeline)
	{
		files: ['src/**/*.ts'],
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
			'no-restricted-syntax': [
				'error',
				{
					selector: 'TSAsExpression > TSAnyKeyword.typeAnnotation',
					message:
						'Cast to `any` is forbidden. Use a typed wrapper from src/types/obsidian-extended.ts or refine the type.',
				},
				{
					selector:
						"TSAsExpression[expression.type='Identifier'][expression.name='app'] > TSAnyKeyword",
					message: '(app as any) is forbidden. Use src/types/obsidian-extended.ts.',
				},
			],
		},
	},
	{
		files: ['package.json'],
		rules: {
			'depend/ban-dependencies': 'off',
		},
	},
	{
		files: ['src/**/*.ts'],
		plugins: {
			'vaultman-local': {
				rules: {
					'no-mutable-vfs': noMutableVfs,
				},
			},
		},
		rules: {
			'vaultman-local/no-mutable-vfs': 'error',
		},
	},
	// Disable ESLint rules already covered by Oxlint (avoids duplicate warnings)
	oxlint.configs['flat/recommended'],
);
