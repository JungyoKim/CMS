<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

	let {
		ref = $bindable(null),
		class: className,
		value,
		...restProps
	}: WithoutChildrenOrChild<CalendarPrimitive.YearSelectProps> = $props();
</script>

<span
	class={cn(
		"has-focus:border-ring border-input bg-background shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative flex rounded-md border",
		className
	)}
>
	<CalendarPrimitive.YearSelect bind:ref {...restProps}>
		{#snippet child({ props, yearItems, selectedYearItem })}
			<select {...props} {value} class="absolute inset-0 w-full h-full cursor-pointer opacity-0 z-10">
				{#each yearItems as yearItem (yearItem.value)}
					<option
						value={yearItem.value}
						selected={value !== undefined
							? yearItem.value === value
							: yearItem.value === selectedYearItem.value}
					>
						{yearItem.label}
					</option>
				{/each}
			</select>
			<span
				class="[&>svg]:text-muted-foreground flex h-8 select-none items-center gap-1 rounded-md pe-1 ps-2 text-sm font-medium [&>svg]:size-3.5 pointer-events-none"
				aria-hidden="true"
			>
				{yearItems.find((item) => item.value === value)?.label || selectedYearItem.label}
				<ChevronDownIcon class="size-4" />
			</span>
		{/snippet}
	</CalendarPrimitive.YearSelect>
</span>
