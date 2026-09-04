import yaml from 'js-yaml';

export function parseYaml(input: string): unknown {
	if (!input || input.trim() === '') return null;
	return yaml.load(input);
}

export function stringifyYaml(value: unknown): string {
	const out = yaml.dump(value, { lineWidth: -1, noRefs: true });
	return out.endsWith('\n') ? out : out + '\n';
}
