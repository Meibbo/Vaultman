<script lang="ts">
	import BindablePoc from './BindablePoc.svelte';

	class BindableHost {
		#value = $state('initial');

		get value(): string {
			return this.#value;
		}

		set value(v: string) {
			this.#value = v;
		}
	}

	const host = new BindableHost();
</script>

<BindablePoc bind:value={host.value} />
<span data-testid="host-readback">{host.value}</span>
