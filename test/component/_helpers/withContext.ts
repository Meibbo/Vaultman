import { mount, unmount, type Component } from 'svelte';
import ContextWrapper from './ContextWrapper.svelte';

export function withContext<TProps extends Record<string, unknown>>(
	target: HTMLElement,
	child: Component<TProps>,
	props: TProps,
	contextEntries: ReadonlyArray<readonly [symbol, unknown]>,
): { destroy(): void } {
	const instance = mount(ContextWrapper, {
		target,
		props: {
			child: child as Component<Record<string, unknown>>,
			childProps: props,
			contextEntries,
		},
	});
	return {
		destroy() {
			unmount(instance);
		},
	};
}
