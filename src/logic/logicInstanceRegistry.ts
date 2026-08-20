import type { InstanceRegistryData, WorkspaceInstanceId, WorkspaceInstanceRecord } from '../types/typeInstance';

export const EMPTY_REGISTRY: InstanceRegistryData = { schema: 1, instances: {} };

export function createInstanceRecord(id: WorkspaceInstanceId): WorkspaceInstanceRecord {
	return {
		id,
		createdAt: Date.now(),
		revision: 1,
		tombstoned: false,
		self: {},
		scenes: {},
	};
}
