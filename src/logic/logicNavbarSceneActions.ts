import type {
	PanelWidgetActionInvocation,
	ScenePanelWidgetActionPort,
} from '../types/typePanelWidget';

export type ScenePanelWidgetActionHandler = (
	invocation: PanelWidgetActionInvocation,
) => void | Promise<void>;

export function createScenePanelWidgetActionPort(
	handlers: Readonly<Record<string, ScenePanelWidgetActionHandler>>,
): ScenePanelWidgetActionPort {
	return {
		async invoke(invocation): Promise<boolean> {
			const handler = handlers[invocation.actionId];
			if (!handler) return false;
			await handler(invocation);
			return true;
		},
	};
}
