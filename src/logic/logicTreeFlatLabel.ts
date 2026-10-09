import type { TreeNode } from '../types/typeTree';

/** Separate context from the operable node without changing its identity. */
export function flatTreeLabelTarget(parent: HTMLElement, node: TreeNode): { readonly host: HTMLElement; readonly node: TreeNode } {
	if (!node.flatParentLabel || node.flatOwnLabel === undefined || node.label === node.flatOwnLabel) return { host: parent, node };
	const doc = parent.ownerDocument;
	const host = doc.createElement('span');
	host.className = 'vaultman-tree-label vaultman-tree-flat-label';
	const context = doc.createElement('span');
	context.className = 'vaultman-tree-flat-parent';
	context.dataset.cell = 'parent';
	context.textContent = node.flatParentLabel;
	const separator = doc.createElement('span');
	separator.className = 'vaultman-tree-flat-separator';
	separator.textContent = node.label.slice(node.flatParentLabel.length, node.label.length - node.flatOwnLabel.length);
	host.append(context, separator);
	parent.append(host);
	return { host, node: { ...node, label: node.flatOwnLabel } };
}
