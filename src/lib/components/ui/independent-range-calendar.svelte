<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { type DateValue, CalendarDate, isSameDay } from '@internationalized/date';
	import type { DateRange } from 'bits-ui';

	let {
		value = $bindable<DateRange | undefined>(undefined),
		onValueChange,
		locale = 'ko-KR',
		class: className
	}: {
		value?: DateRange;
		onValueChange?: (value: DateRange) => void;
		locale?: string;
		class?: string;
	} = $props();

	// Internal month states - completely separate from value
	let leftMonth = $state<DateValue>(new CalendarDate(2026, 1, 15));
	let rightMonth = $state<DateValue>(new CalendarDate(2026, 2, 15));

	// Track selection state
	let rangeStart = $state<DateValue | undefined>(undefined);
	let rangeEnd = $state<DateValue | undefined>(undefined);
	let isSelectingEnd = $state(false);

	// Sync from prop
	$effect(() => {
		if (value?.start) rangeStart = value.start;
		if (value?.end) rangeEnd = value.end;
	});

	function handleDateClick(date: DateValue) {
		if (!isSelectingEnd) {
			rangeStart = date;
			rangeEnd = undefined;
			isSelectingEnd = true;
		} else {
			if (rangeStart && date.compare(rangeStart) >= 0) {
				rangeEnd = date;
			} else {
				rangeEnd = rangeStart;
				rangeStart = date;
			}
			isSelectingEnd = false;
			const newValue = { start: rangeStart, end: rangeEnd };
			value = newValue;
			onValueChange?.(newValue);
		}
	}

	function isInRange(date: DateValue): boolean {
		if (!rangeStart || !rangeEnd) return false;
		return date.compare(rangeStart) >= 0 && date.compare(rangeEnd) <= 0;
	}

	function isRangeStart(date: DateValue): boolean {
		return rangeStart ? isSameDay(date, rangeStart) : false;
	}

	function isRangeEnd(date: DateValue): boolean {
		return rangeEnd ? isSameDay(date, rangeEnd) : false;
	}

	function setLeftMonth(month: number) {
		leftMonth = leftMonth.set({ month });
		if (rightMonth.compare(leftMonth) <= 0) {
			rightMonth = leftMonth.add({ months: 1 });
		}
	}

	function setLeftYear(year: number) {
		leftMonth = leftMonth.set({ year });
		if (rightMonth.compare(leftMonth) <= 0) {
			rightMonth = leftMonth.add({ months: 1 });
		}
	}

	function setRightMonth(month: number) {
		const newRight = rightMonth.set({ month });
		if (newRight.compare(leftMonth) > 0) {
			rightMonth = newRight;
		}
	}

	function setRightYear(year: number) {
		const newRight = rightMonth.set({ year });
		if (newRight.compare(leftMonth) > 0) {
			rightMonth = newRight;
		}
	}

	// Generate calendar grid
	function getMonthDays(monthDate: DateValue) {
		const year = monthDate.year;
		const month = monthDate.month;
		const firstDay = new CalendarDate(year, month, 1);
		const daysInMonth = new Date(year, month, 0).getDate();

		const days: DateValue[] = [];
		for (let d = 1; d <= daysInMonth; d++) {
			days.push(new CalendarDate(year, month, d));
		}
		return { firstDay, days, daysInMonth };
	}

	function getStartOfWeek(date: DateValue): number {
		const d = new Date(date.year, date.month - 1, date.day);
		return d.getDay(); // 0 = Sunday
	}

	// Derived calendar data
	const leftCalendarData = $derived(getMonthDays(leftMonth));
	const leftStartDay = $derived(getStartOfWeek(leftCalendarData.firstDay));
	const rightCalendarData = $derived(getMonthDays(rightMonth));
	const rightStartDay = $derived(getStartOfWeek(rightCalendarData.firstDay));
</script>

<div class={cn('bg-background flex gap-4 rounded-lg border p-3 shadow-sm', className)}>
	<!-- Left Calendar -->
	<div class="flex-1">
		<div class="flex items-center gap-1 justify-center mb-2">
			<select
				class="bg-background border rounded px-2 py-1 text-sm font-medium cursor-pointer"
				value={leftMonth.month}
				onchange={(e) => setLeftMonth(Number(e.currentTarget.value))}
			>
				{#each Array.from({ length: 12 }, (_, i) => i + 1) as m}
					<option value={m}>{m}월</option>
				{/each}
			</select>
			<select
				class="bg-background border rounded px-2 py-1 text-sm font-medium cursor-pointer"
				value={leftMonth.year}
				onchange={(e) => setLeftYear(Number(e.currentTarget.value))}
			>
				{#each Array.from({ length: 21 }, (_, i) => 2020 + i) as y}
					<option value={y}>{y}년</option>
				{/each}
			</select>
		</div>
		<div class="grid grid-cols-7 gap-1 text-center text-sm">
			{#each ['일', '월', '화', '수', '목', '금', '토'] as day}
				<div class="font-medium text-muted-foreground py-1">{day}</div>
			{/each}
			{#each Array(leftStartDay) as _}
				<div></div>
			{/each}
			{#each leftCalendarData.days as date}
				<button
					type="button"
					class={cn(
						'size-8 rounded-md text-sm hover:bg-accent',
						isRangeStart(date) && 'bg-primary text-primary-foreground',
						isRangeEnd(date) && 'bg-primary text-primary-foreground',
						isInRange(date) && !isRangeStart(date) && !isRangeEnd(date) && 'bg-accent'
					)}
					onclick={() => handleDateClick(date)}
				>
					{date.day}
				</button>
			{/each}
		</div>
	</div>

	<!-- Right Calendar -->
	<div class="flex-1">
		<div class="flex items-center gap-1 justify-center mb-2">
			<select
				class="bg-background border rounded px-2 py-1 text-sm font-medium cursor-pointer"
				value={rightMonth.month}
				onchange={(e) => setRightMonth(Number(e.currentTarget.value))}
			>
				{#each Array.from({ length: 12 }, (_, i) => i + 1) as m}
					<option value={m}>{m}월</option>
				{/each}
			</select>
			<select
				class="bg-background border rounded px-2 py-1 text-sm font-medium cursor-pointer"
				value={rightMonth.year}
				onchange={(e) => setRightYear(Number(e.currentTarget.value))}
			>
				{#each Array.from({ length: 21 }, (_, i) => 2020 + i) as y}
					<option value={y}>{y}년</option>
				{/each}
			</select>
		</div>
		<div class="grid grid-cols-7 gap-1 text-center text-sm">
			{#each ['일', '월', '화', '수', '목', '금', '토'] as day}
				<div class="font-medium text-muted-foreground py-1">{day}</div>
			{/each}
			{#each Array(rightStartDay) as _}
				<div></div>
			{/each}
			{#each rightCalendarData.days as date}
				<button
					type="button"
					class={cn(
						'size-8 rounded-md text-sm hover:bg-accent',
						isRangeStart(date) && 'bg-primary text-primary-foreground',
						isRangeEnd(date) && 'bg-primary text-primary-foreground',
						isInRange(date) && !isRangeStart(date) && !isRangeEnd(date) && 'bg-accent'
					)}
					onclick={() => handleDateClick(date)}
				>
					{date.day}
				</button>
			{/each}
		</div>
	</div>
</div>
