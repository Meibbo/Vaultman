import { parse, stringify } from 'yaml';

export function parseYaml(input: string): unknown {
	if (!input || input.trim() === '') return null;
	return parse(input);
}

export function stringifyYaml(value: unknown): string {
	const out = stringify(value, { lineWidth: 0, aliasDuplicateObjects: false });
	return out.endsWith('\n') ? out : out + '\n';
}
