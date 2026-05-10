import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import oxlint from 'eslint-plugin-oxlint';

export default tseslint.config(
	{
		ignores: [
			'node_modules',
			'dist',
			'codeql',
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
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...(obsidianmd as any).configs.recommended,
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
	// Disable ESLint rules already covered by Oxlint (avoids duplicate warnings)
	oxlint.configs['flat/recommended'],
);
