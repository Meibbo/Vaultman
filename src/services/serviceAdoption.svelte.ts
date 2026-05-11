import type { AdoptedNode } from '../types/typeAdoptedNode';

export class AdoptionService {
	enabled = $state(false);
	adoptHeaders = $state(true);
	adoptTasks = $state(false);
	adoptBlocks = $state(false);

	filterChildren(children: AdoptedNode[]): AdoptedNode[] {
		if (!this.enabled) return [];
		const out: AdoptedNode[] = [];
		for (const c of children) {
			if (c.kind === 'header' && !this.adoptHeaders) continue;
			if (c.kind === 'task' && !this.adoptTasks) continue;
			if (c.kind === 'block' && !this.adoptBlocks) continue;
			out.push({ ...c, children: this.filterChildren(c.children) });
		}
		return out;
	}
}
