<script lang="ts">
	import {
		getCoreRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		type ColumnDef,
		type PaginationState,
		type Row,
		type RowSelectionState,
		type SortingState
	} from '@tanstack/table-core';
	import type { Schema } from './schemas.js';
	import type { Attachment } from 'svelte/attachments';
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import { createSvelteTable } from '$lib/components/ui/data-table/data-table.svelte.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Field, FieldLabel, FieldContent } from '$lib/components/ui/field/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import {
		FlexRender,
		renderComponent,
		renderSnippet
	} from '$lib/components/ui/data-table/index.js';
	import { toast } from 'svelte-sonner';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { DragDropProvider } from '@dnd-kit-svelte/svelte';
	import { move } from '@dnd-kit/helpers';
	import { useSortable } from '@dnd-kit-svelte/svelte/sortable';
	import { cn } from '$lib/utils.js';
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import { tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { type DateValue, getLocalTimeZone } from '@internationalized/date';
	import {
		dateFormatter,
		dateValueToString,
		stringToDateValue,
		formatPhoneNumber,
		validateEmail,
		validatePhone,
		formatCurrency,
		parseCurrency,
		executeSearch as executeSearchUtil,
		executePagination as executePaginationUtil,
		downloadFile,
		removeFileWithScrollPreserve,
		generateId,
		calculateBalance,
		getRedirectPageAfterChange,
		createPageRedirectUrl
	} from './data-table/utils.js';
	import DataTableCheckbox from './data-table-checkbox.svelte';
	import HomeContractDialog from './home-contract-dialog.svelte';

	// Icons
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import GripVerticalIcon from '@tabler/icons-svelte/icons/grip-vertical';
	import ChevronLeftIcon from '@tabler/icons-svelte/icons/chevron-left';
	import ChevronRightIcon from '@tabler/icons-svelte/icons/chevron-right';
	import ChevronsLeftIcon from '@tabler/icons-svelte/icons/chevrons-left';
	import ChevronsRightIcon from '@tabler/icons-svelte/icons/chevrons-right';
	import TrashIcon from '@tabler/icons-svelte/icons/trash';
	import PlusIcon from '@tabler/icons-svelte/icons/plus';
	import SearchIcon from '@tabler/icons-svelte/icons/search';
	import XIcon from '@tabler/icons-svelte/icons/x';
	import FileIcon from '@tabler/icons-svelte/icons/file';
	import DownloadIcon from '@tabler/icons-svelte/icons/download';
	import AlertCircleTablerIcon from '@tabler/icons-svelte/icons/alert-circle';
	import FileTextIcon from '@tabler/icons-svelte/icons/file-text';
	import CheckCircleIcon from '@tabler/icons-svelte/icons/circle-check-filled';
	import BanIcon from '@tabler/icons-svelte/icons/ban';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import Check from '@lucide/svelte/icons/check';
	import DotsVerticalIcon from '@tabler/icons-svelte/icons/dots-vertical';
	import LoaderIcon from '@tabler/icons-svelte/icons/loader';

	let {
		data,
		totalCount = 0,
		currentPage = 1,
		pageSize = 10,
		clientList = [],
		productList = [],
		firmwareList = []
	}: {
		data: Schema[];
		totalCount?: number;
		currentPage?: number;
		pageSize?: number;
		clientList?: Array<any>;
		productList?: Array<{ id: number; name: string }>;
		firmwareList?: Array<{ id: number; name: string }>;
	} = $props();

	// --- Table State ---
	let pagination = $state<PaginationState>({ pageIndex: currentPage - 1, pageSize: pageSize });
	let sorting = $state<SortingState>([]);
	let rowSelection = $state<RowSelectionState>({});
	let pageSizeSelectValue = $state<string>(String(pageSize));
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let searchField = $state<string | undefined>($page.url.searchParams.get('field') || 'name');

	// --- Form & Dialog State ---
	let dialogOpen = $state(false);
	let editingRow = $state<Schema | null>(null);
	let validationError = $state<string | null>(null);

	$effect(() => {
		pagination.pageIndex = currentPage - 1;
	});

	let paginationTimeout: ReturnType<typeof setTimeout> | null = null;
	let previousPageSizeValue: string | undefined = undefined;

	$effect(() => {
		if (previousPageSizeValue === undefined) {
			previousPageSizeValue = pageSizeSelectValue;
		} else if (pageSizeSelectValue && pageSizeSelectValue !== previousPageSizeValue) {
			const newPageSize = Number(pageSizeSelectValue);
			if (!isNaN(newPageSize) && newPageSize !== pagination.pageSize) {
				pagination.pageSize = newPageSize;
				pagination.pageIndex = 0;
				if (paginationTimeout) clearTimeout(paginationTimeout);
				executePagination();
				// Save setting
				fetch('/api/settings/page-size', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ pageSize: newPageSize })
				}).catch(console.error);
			}
			previousPageSizeValue = pageSizeSelectValue;
		}
	});

	function executeSearch() {
		const newUrl = executeSearchUtil('contracts', searchQuery, searchField, $page.url);
		if (newUrl) {
			if (newUrl.searchParams.get('page') === '1') pagination.pageIndex = 0;
			goto(newUrl.toString(), { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	$effect(() => {
		executeSearch();
	});

	function executePagination() {
		const newUrl = executePaginationUtil(
			'contracts',
			pagination.pageIndex,
			pagination.pageSize,
			$page.url,
			pageSize
		);
		if (newUrl) goto(newUrl.toString(), { replaceState: true, noScroll: true, keepFocus: true });
	}

	const columns = $derived<ColumnDef<Schema>[]>([
		{
			id: 'drag',
			header: () => null,
			cell: () => renderSnippet(DragHandle)
		},
		{
			id: 'select',
			header: ({ table }) =>
				renderComponent(DataTableCheckbox, {
					checked: table.getIsAllPageRowsSelected(),
					indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
					onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
					'aria-label': 'Select all'
				}),
			cell: ({ row }) =>
				renderComponent(DataTableCheckbox, {
					checked: row.getIsSelected(),
					onCheckedChange: (value) => row.toggleSelected(!!value),
					'aria-label': 'Select row'
				}),
			enableSorting: false,
			enableHiding: false
		},
		{
			accessorKey: 'name',
			header: '계약명',
			cell: ({ row }) => {
				// @ts-expect-error
				return row.original.name || '-';
			}
		},
		{
			accessorKey: 'customerName',
			header: '고객명',
			cell: ({ row }) => {
				// @ts-expect-error
				return row.original.customerName || row.original.header || '-';
			}
		},
		{
			accessorKey: 'phone',
			header: '연락처',
			cell: ({ row }) => {
				// @ts-expect-error
				return row.original.phone || '-';
			}
		},
		{
			accessorKey: 'email',
			header: '이메일',
			cell: ({ row }) => {
				// @ts-expect-error
				return row.original.email || '-';
			}
		},
		{
			accessorKey: 'address',
			header: '주소',
			cell: ({ row }) => {
				// @ts-expect-error
				return row.original.address || '-';
			}
		},
		{
			accessorKey: 'customerStatus',
			header: '고객상태',
			cell: ({ row }) => renderSnippet(DataTableCustomerStatus, { row })
		},
		{
			accessorKey: 'asStatus',
			header: 'AS상태',
			cell: ({ row }) => {
				// @ts-expect-error
				const status = row.original.asStatus || '없음';
				// @ts-expect-error
				const count = row.original.asIncompleteCount || 0;
				return renderSnippet(DataTableASStatus, { status, count });
			}
		}
	]);

	const table = createSvelteTable({
		get data() {
			return data;
		},
		get columns() {
			return columns;
		},
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get rowSelection() {
				return rowSelection;
			}
		},
		getRowId: (row) => row.id.toString(),
		enableRowSelection: true,
		getCoreRowModel: getCoreRowModel(),
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') pagination = updater(pagination);
			else pagination = updater;
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') rowSelection = updater(rowSelection);
			else rowSelection = updater;
		}
	});

	// views와 searchableFields는 테이블 생성 후에 정의되어야 함
	const views = $derived.by(() => {
		const allColumns = table.getAllColumns();
		return allColumns
			.filter((col) => {
				// header가 있고, id가 있는 컬럼만 포함 (select, drag, actions 제외)
				if (!col.id || col.id === 'select' || col.id === 'drag' || col.id === 'actions') {
					return false;
				}
				const header = col.columnDef.header;
				if (typeof header === 'function') {
					return false;
				}
				return true;
			})
			.map((col) => {
				const header = col.columnDef.header;
				let label = col.id;
				if (typeof header === 'string') {
					label = header;
				} else if (header && typeof header === 'object' && 'render' in header) {
					// renderSnippet의 경우 id를 사용
					label = col.id;
				}
				return {
					id: col.id,
					label: label,
					badge: 0
				};
			});
	});

	// 검색 가능한 필드 목록 (views 재사용)
	const searchableFields = $derived(views);

	// 검색 필드 기본값 설정
	$effect(() => {
		if (!searchField && searchableFields.length > 0) {
			searchField = searchableFields[0].id;
		}
	});

	// 상태 버튼(customerStatus/asStatus)에서 다른 필드로 전환 시, 버튼 값(searchQuery)이 검색창에 남지 않도록 초기화
	$effect(() => {
		if (searchField !== 'customerStatus' && searchField !== 'asStatus') {
			const statusValues = new Set(['active', 'terminated', 'pre-sales', '없음', '완료', '진행중']);
			if (statusValues.has(searchQuery)) {
				searchQuery = '';
			}
		}
	});

	const totalPages = $derived(Math.ceil(totalCount / pagination.pageSize) || 1);
	const currentPageNum = $derived(pagination.pageIndex + 1);
</script>

<div class="flex flex-wrap items-center gap-2 px-4 lg:px-6">
	<Label for="search-field-selector" class="sr-only">검색 필드</Label>
	<Select.Root type="single" bind:value={searchField as any}>
		<Select.Trigger class="w-fit" size="sm" id="search-field-selector">
			{searchableFields.find((f) => f.id === searchField)?.label ?? '검색 필드'}
		</Select.Trigger>
		<Select.Content>
			{#each searchableFields as field (field.id)}
				<Select.Item value={field.id}>{field.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	{#if searchField === 'customerStatus'}
		<ButtonGroup.Root class="items-center">
			{#each [{ v: 'active', l: '계약완료' }, { v: 'terminated', l: '계약해지' }, { v: 'pre-sales', l: '사전영업' }] as s}
				<Button
					variant={searchQuery === s.v ? 'default' : 'outline'}
					size="sm"
					onclick={() => {
						searchQuery = searchQuery === s.v ? '' : s.v;
						executeSearch();
					}}
				>
					{s.l}
				</Button>
			{/each}
		</ButtonGroup.Root>
	{:else if searchField === 'asStatus'}
		<ButtonGroup.Root class="items-center">
			{#each [{ v: '없음', l: '기록없음' }, { v: '완료', l: 'AS완료' }, { v: '진행중', l: 'AS남음' }] as s}
				<Button
					variant={searchQuery === s.v ? 'default' : 'outline'}
					size="sm"
					onclick={() => {
						searchQuery = searchQuery === s.v ? '' : s.v;
						executeSearch();
					}}
				>
					{s.l}
				</Button>
			{/each}
		</ButtonGroup.Root>
	{:else}
		<div
			class="relative order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:min-w-[180px] sm:max-w-[320px]"
		>
			<SearchIcon class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
			<Input
				type="search"
				placeholder="검색..."
				class="h-8 w-full rounded-lg bg-background pl-8"
				bind:value={searchQuery}
			/>
		</div>
	{/if}

	<div class="ms-auto flex items-center gap-2">
		{#if table.getFilteredSelectedRowModel().rows.length > 0}
			<form
				method="POST"
				action="?/deleteContracts"
				use:enhance={() => {
					const deletingCount = table.getFilteredSelectedRowModel().rows.length;
					return async ({ result }) => {
						if (result.type === 'success') {
							rowSelection = {};
							// 삭제 후 적절한 페이지로 이동 (빈 페이지면 이전 페이지로)
							const targetPage = getRedirectPageAfterChange(
								currentPage,
								totalCount,
								deletingCount,
								pageSize
							);
							const url = createPageRedirectUrl($page.url, targetPage);
							await goto(url.toString(), {
								replaceState: true,
								noScroll: true,
								invalidateAll: true
							});
							toast.success('삭제되었습니다.');
						} else if (result.type === 'failure') {
							toast.error('삭제에 실패했습니다.');
						}
					};
				}}
			>
				{#each table.getFilteredSelectedRowModel().rows as row (row.id)}
					<input type="hidden" name="ids" value={row.original.id} />
				{/each}
				<Button type="submit" variant="destructive" size="sm">
					<TrashIcon class="h-4 w-4" />
					<span class="hidden lg:inline">선택 삭제</span>
					<span class="lg:hidden">삭제</span>
				</Button>
			</form>
		{/if}

		{#if validationError}
			<div
				class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
				in:slide={{ axis: 'y', duration: 300 }}
				out:slide={{ axis: 'y', duration: 300 }}
			>
				<Alert.Root variant="destructive" class="relative shadow-lg">
					<AlertCircleTablerIcon class="h-4 w-4" />
					<Alert.Title>입력 오류</Alert.Title>
					<Alert.Description>{validationError}</Alert.Description>
					<Button
						variant="ghost"
						size="icon"
						class="absolute right-2 top-2 h-6 w-6"
						onclick={() => (validationError = null)}
					>
						<XIcon class="h-4 w-4" />
					</Button>
				</Alert.Root>
			</div>
		{/if}

		<Button
			variant="outline"
			size="sm"
			onclick={() => {
				editingRow = null;
				dialogOpen = true;
			}}
		>
			<PlusIcon />
			<span class="hidden lg:inline">계약 추가</span>
			<span class="lg:hidden">추가</span>
		</Button>
	</div>
</div>

<div class="relative flex flex-col gap-4 px-4 lg:px-6 pb-4 pt-0 overflow-auto">
	<div class="rounded-lg border flex flex-col overflow-hidden">
		<DragDropProvider
			modifiers={[
				// @ts-expect-error @dnd-kit/abstract types are botched atm
				RestrictToVerticalAxis
			]}
			onDragEnd={(e) => (data = move(data, e))}
		>
			<div class="flex flex-col md:h-full md:min-h-0 overflow-hidden">
				<div class="md:flex-1 md:overflow-y-auto md:min-h-0 overflow-x-auto">
					<Table.Root>
						<Table.Header class="bg-muted sticky top-0 z-10">
							{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
								<Table.Row>
									{#each headerGroup.headers as header (header.id)}
										<Table.Head colspan={header.colSpan}>
											{#if !header.isPlaceholder}
												<FlexRender
													content={header.column.columnDef.header}
													context={header.getContext()}
												/>
											{/if}
										</Table.Head>
									{/each}
								</Table.Row>
							{/each}
						</Table.Header>
						<Table.Body class="**:data-[slot=table-cell]:first:w-8">
							{#if table.getRowModel().rows?.length}
								{#each table.getRowModel().rows as row, index (row.id)}
									{@render DraggableRow({ row, index })}
								{/each}
							{:else}
								<Table.Row>
									<Table.Cell
										colspan={columns.length}
										class="text-center py-8 text-muted-foreground">결과가 없습니다.</Table.Cell
									>
								</Table.Row>
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		</DragDropProvider>
	</div>

	<div class="flex items-center justify-between px-4">
		<div class="hidden">{table.getFilteredSelectedRowModel().rows.length}개 선택됨</div>
		<div class="flex w-full items-center justify-between">
			<div class="hidden items-center gap-2 lg:flex">
				<Label for="rows-per-page" class="text-sm font-medium">페이지당 행 수</Label>
				<Select.Root type="single" bind:value={pageSizeSelectValue}>
					<Select.Trigger size="sm" class="w-20" id="rows-per-page"
						>{pagination.pageSize}</Select.Trigger
					>
					<Select.Content side="top">
						{#each [10, 25, 50, 100] as pageSizeOption}<Select.Item
								value={pageSizeOption.toString()}>{pageSizeOption}</Select.Item
							>{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex items-center gap-2">
				<div class="flex w-fit items-center justify-center text-sm font-medium">
					{currentPage} / {Math.ceil(totalCount / pageSize) || 1} 페이지
				</div>
				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						class="hidden h-8 w-8 p-0 lg:flex"
						onclick={() => {
							pagination.pageIndex = 0;
							executePagination();
						}}
						disabled={currentPage <= 1}
					>
						<span class="sr-only">첫 페이지로 이동</span>
						<ChevronsLeftIcon />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="size-8"
						onclick={() => {
							pagination.pageIndex--;
							executePagination();
						}}
						disabled={currentPage <= 1}
					>
						<span class="sr-only">이전 페이지로 이동</span>
						<ChevronLeftIcon />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="size-8"
						onclick={() => {
							pagination.pageIndex++;
							executePagination();
						}}
						disabled={currentPage >= Math.ceil(totalCount / pageSize)}
					>
						<span class="sr-only">다음 페이지로 이동</span>
						<ChevronRightIcon />
					</Button>
					<Button
						variant="outline"
						class="hidden size-8 lg:flex"
						size="icon"
						onclick={() => {
							pagination.pageIndex = Math.ceil(totalCount / pageSize) - 1;
							executePagination();
						}}
						disabled={currentPage >= Math.ceil(totalCount / pageSize)}
					>
						<span class="sr-only">마지막 페이지로 이동</span>
						<ChevronsRightIcon />
					</Button>
				</div>
			</div>
		</div>
	</div>
</div>

{#snippet DragHandle({ attach }: { attach: Attachment })}
	<Button
		{@attach attach}
		variant="ghost"
		size="icon"
		class="text-muted-foreground size-7 hover:bg-transparent"
	>
		<GripVerticalIcon class="text-muted-foreground size-3" />
		<span class="sr-only">행 이동</span>
	</Button>
{/snippet}

{#snippet DataTableCustomerStatus({ row }: { row: Row<Schema> })}
	{@const status = (row.original as any).customerStatus || row.original.status || '-'}
	{@const config = {
		'pre-sales': {
			text: '사전영업',
			icon: FileTextIcon,
			variant: 'secondary' as const,
			class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
		},
		active: {
			text: '계약완료',
			icon: CheckCircleIcon,
			variant: 'default' as const,
			class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
		},
		terminated: {
			text: '계약해지',
			icon: BanIcon,
			variant: 'destructive' as const,
			class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
		}
	}[status as string] || {
		text: status as string,
		icon: null,
		variant: 'outline' as const,
		class: 'text-muted-foreground'
	}}
	<Badge
		variant={config.variant}
		class={cn('px-2 py-0 gap-1.5 flex items-center w-fit', config.class)}
	>
		{#if config.icon}<config.icon class="size-3" />{/if}{config.text}
	</Badge>
{/snippet}

{#snippet DataTableASStatus({ status, count }: { status: string; count: number })}
	{@const config = {
		없음: {
			text: 'AS기록 없음',
			icon: XIcon,
			class: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
		},
		완료: {
			text: 'AS완료',
			icon: CheckCircleIcon,
			class: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
		},
		진행중: {
			text: `AS ${count}개 남음`,
			icon: AlertCircleTablerIcon,
			class: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
		}
	}[status] || { text: status, icon: null, class: 'text-muted-foreground' }}
	<Badge variant="outline" class={cn('px-2 py-0 gap-1.5 flex items-center w-fit', config.class)}>
		{#if config.icon}<config.icon class="size-3" />{/if}{config.text}
	</Badge>
{/snippet}

{#snippet DraggableRow({ row, index }: { row: Row<Schema>; index: number })}
	{@const { ref, isDragging, handleRef } = useSortable({
		id: String(row.original.id),
		index: () => index
	})}
	<Table.Row
		data-state={row.getIsSelected() && 'selected'}
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer hover:bg-muted/50"
		{@attach ref}
		onclick={(e) => {
			const target = e.target as HTMLElement;
			if (target.closest('[role="checkbox"]') || target.closest('button') || target.closest('a'))
				return;
			e.stopPropagation();
			if (dialogOpen) return;
			editingRow = row.original;
			dialogOpen = true;
		}}
	>
		{#each row.getVisibleCells() as cell (cell.id)}
			<Table.Cell>
				<FlexRender
					attach={handleRef}
					content={cell.column.columnDef.cell}
					context={cell.getContext()}
				/>
			</Table.Cell>
		{/each}
	</Table.Row>
{/snippet}
<HomeContractDialog
	bind:open={dialogOpen}
	bind:contract={editingRow}
	{clientList}
	{productList}
	{firmwareList}
	createAction="?/createContract"
	updateAction="?/updateContract"
/>
