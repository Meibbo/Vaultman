import { mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import viewOutlineExplorer from '../../src/components/views/viewOutlineExplorer.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import { AdoptionService } from '../../src/services/serviceAdoption.svelte';
import type { AdoptedNode } from '../../src/types/typeAdoptedNode';

const tree: AdoptedNode[] = [
	{
		id: 'h1',
		kind: 'header',
		label: 'Top',
		depth: 1,
		line: 0,
		parentPath: 'n.md',
		file: {} as never,
		children: [
			{
				id: 't1',
				kind: 'task',
				label: 'Do X',
				depth: 2,
				line: 1,
				parentPath: 'n.md',
				taskState: ' ',
				file: {} as never,
				children: [],
			},
		],
	},
];

const apps: ReturnType<typeof mount>[] = [];

afterEach(() => {
	while (apps.length) unmount(apps.pop()!);
});

describe('viewOutlineExplorer', () => {
	it('renders header and task adopted nodes as native tree rows', () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const theme = new ThemeService();
		theme.mode = 'thin';
		theme.identity = 'outline';
		const adoption = new AdoptionService();
		adoption.enabled = true;

		apps.push(
			mount(viewOutlineExplorer, {
				target: host,
				props: { tree, themeService: theme, adoptionService: adoption },
			}),
		);

		expect(host.querySelector('[data-vm-explorer="outline"]')).toBeTruthy();
		expect(host.querySelectorAll('.tree-item')).toHaveLength(2);
		expect(host.querySelectorAll('.tree-item-self')).toHaveLength(2);
		expect(host.querySelectorAll('.tree-item-inner')).toHaveLength(2);
		expect(host.textContent).toContain('Top');
		expect(host.textContent).toContain('Do X');
		host.remove();
	});
});
