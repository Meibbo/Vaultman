<script lang="ts">
	let {
		checked = $bindable(false),
		label,
		disabled = false,
		onChange,
	}: {
		checked: boolean;
		label: string;
		disabled?: boolean;
		onChange?: (next: boolean) => void;
	} = $props();

	function handleChange(event: Event): void {
		checked = (event.currentTarget as HTMLInputElement).checked;
		onChange?.(checked);
	}
</script>

<label class="vm-toggle" class:is-disabled={disabled}>
	<input type="checkbox" {checked} {disabled} onchange={handleChange} />
	<span class="vm-toggle-knob"></span>
	<span class="vm-toggle-label">{label}</span>
</label>
