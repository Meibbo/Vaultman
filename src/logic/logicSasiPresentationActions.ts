import type { SasiRegistry } from './logicSasiRegistry';
import { NATIVE_COMPAT_BOUNDARIES } from './logicNativeTreeCompat';

/** Index identities now; scope addressing and per-instance projection are deferred. */
export function registerPresentationActions(registry: SasiRegistry): void {
	const availability = {
		status: 'unavailable',
		reason: { code: 'scope-addressing-deferred', labelKey: 'sasi.presentation.scope_pending' },
	} as const;
	for (const mode of ['provided', 'lowercase', 'titlecase', 'uppercase'] as const) {
		registry.register({
			id: `vaultman.scene.text-case.${mode}`,
			axis: 'function', kind: 'action',
			labelKey: `settings.text_case.${mode}`,
			icon: 'lucide-case-sensitive', supports: [], availability,
		});
	}
	for (const boundary of NATIVE_COMPAT_BOUNDARIES) {
		for (const mode of ['compatible', 'locked'] as const) {
			registry.register({
				id: `vaultman.scene.native-compat.${boundary}.${mode}`,
				axis: 'function', kind: 'action',
				labelKey: `sasi.presentation.${boundary}.${mode}`,
				icon: 'lucide-paintbrush', supports: [], availability,
			});
		}
	}
}
