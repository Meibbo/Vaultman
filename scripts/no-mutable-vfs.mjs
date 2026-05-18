const VFS_FIELDS = new Set(['fm', 'body']);
const VFS_ARRAY_FIELDS = new Set(['ops']);
const ARRAY_MUTATORS = new Set([
	'copyWithin',
	'fill',
	'pop',
	'push',
	'reverse',
	'shift',
	'sort',
	'splice',
	'unshift',
]);

function staticPropertyName(node) {
	if (!node) return null;
	if (node.type === 'Identifier') return node.name;
	if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
	return null;
}

function isVfsMember(node, fields) {
	if (!node || node.type !== 'MemberExpression') return false;
	if (node.object?.type !== 'Identifier' || node.object.name !== 'vfs') return false;
	const property = staticPropertyName(node.property);
	return property !== null && fields.has(property);
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'disallow direct mutation of immutable VFS snapshots',
		},
		messages: {
			noVfsFieldAssign: 'Do not assign directly to VFS fields; create a replacement snapshot.',
			noVfsArrayMutator: 'Do not mutate VFS arrays in place; create a replacement snapshot.',
		},
		schema: [],
	},
	create(context) {
		return {
			AssignmentExpression(node) {
				if (isVfsMember(node.left, VFS_FIELDS)) {
					context.report({ node: node.left, messageId: 'noVfsFieldAssign' });
				}
			},
			CallExpression(node) {
				const callee = node.callee;
				if (!callee || callee.type !== 'MemberExpression') return;
				const mutator = staticPropertyName(callee.property);
				if (!mutator || !ARRAY_MUTATORS.has(mutator)) return;
				if (isVfsMember(callee.object, VFS_ARRAY_FIELDS)) {
					context.report({ node: callee, messageId: 'noVfsArrayMutator' });
				}
			},
		};
	},
};
