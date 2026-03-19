<script lang="ts">
	import { Checkbox } from "$lib/components/ui/checkbox/index.js";
	import type { ComponentProps } from "svelte";

	type CheckboxProps = ComponentProps<typeof Checkbox>;

	let {
		checked = $bindable(false),
		indeterminate = false,
		onCheckedChange,
		...restProps
	}: CheckboxProps = $props();

	let previousChecked = $state(checked);

	$effect(() => {
		if (previousChecked !== checked && onCheckedChange) {
			onCheckedChange(checked);
		}
		previousChecked = checked;
	});
</script>

<div class="flex items-center justify-center" on:click|stopPropagation>
	<Checkbox bind:checked {indeterminate} {...restProps} />
</div>