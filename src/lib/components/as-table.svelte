<script lang="ts">
	import {
		getCoreRowModel,
		getSortedRowModel,
		type ColumnDef,
		type PaginationState,
		type RowSelectionState,
		type Row,
		type SortingState
	} from '@tanstack/table-core';
	import { createSvelteTable } from '$lib/components/ui/data-table/data-table.svelte.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ContactSection from '$lib/components/ui/contact-section.svelte';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		FlexRender,
		renderComponent,
		renderSnippet
	} from '$lib/components/ui/data-table/index.js';
	import type { Attachment } from 'svelte/attachments';
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import { DragDropProvider } from '@dnd-kit-svelte/svelte';
	import { move } from '@dnd-kit/helpers';
	import { useSortable } from '@dnd-kit-svelte/svelte/sortable';
	import DataTableCheckbox from '$lib/components/data-table-checkbox.svelte';
	import { createRawSnippet } from 'svelte';

	import GripVerticalIcon from '@tabler/icons-svelte/icons/grip-vertical';
	import ChevronLeftIcon from '@tabler/icons-svelte/icons/chevron-left';
	import ChevronRightIcon from '@tabler/icons-svelte/icons/chevron-right';
	import ChevronsLeftIcon from '@tabler/icons-svelte/icons/chevrons-left';
	import ChevronsRightIcon from '@tabler/icons-svelte/icons/chevrons-right';
	import SearchIcon from '@tabler/icons-svelte/icons/search';
	import TrashIcon from '@tabler/icons-svelte/icons/trash';
	import PlusIcon from '@tabler/icons-svelte/icons/plus';
	import XIcon from '@tabler/icons-svelte/icons/x';
	import AlertCircleTablerIcon from '@tabler/icons-svelte/icons/alert-circle';

	import { page } from '$app/stores';
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Field, FieldLabel, FieldContent } from '$lib/components/ui/field/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import { type DateValue, getLocalTimeZone } from '@internationalized/date';

	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import DotsVerticalIcon from '@tabler/icons-svelte/icons/dots-vertical';
	import LoaderIcon from '@tabler/icons-svelte/icons/loader';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { tick } from 'svelte';
	import { cn } from '$lib/utils.js';
	import {
		dateFormatter,
		stringToDateValue,
		dateValueToString,
		executeSearch as executeSearchUtil,
		executePagination as executePaginationUtil,
		validateEmail,
		validatePhone,
		formatPhoneNumber,
		getRedirectPageAfterChange,
		createPageRedirectUrl,
		formatCurrency,
		parseCurrency
	} from '$lib/components/data-table/utils.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import FileUploadField from '$lib/components/ui/file-upload-field.svelte';
	import HomeContractDialog from '$lib/components/home-contract-dialog.svelte';

	type ASRecord = {
		id: number;
		contractId: number | null;
		clientId?: number | null;
		customerName: string;
		contractName: string;
		requestDate: string;
		requestContent: string;
		responseDate: string;
		responseContent: string;
		cost: number;
		isCompleted: boolean;
		photoFileName?: string | null;
		photoFileListId?: string | null;
	};

	let {
		data,
		totalCount = 0,
		currentPage = 1,
		pageSize = 10,
		contractList = [],
		clientList = [],
		productList = [],
		firmwareList = []
	} = $props();

	let pagination = $state<PaginationState>({ pageIndex: currentPage - 1, pageSize: pageSize });
	let sorting = $state<SortingState>([]);
	let rowSelection = $state<RowSelectionState>({});
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let searchField = $state<string>($page.url.searchParams.get('field') || 'customerName');
	let searchDateRange = $state<any>(() => {
		const field = $page.url.searchParams.get('field');
		const search = $page.url.searchParams.get('search');
		if (search && (field === 'requestDate' || field === 'responseDate')) {
			const parts = search.split(',');
			if (parts.length === 2) {
				const start = stringToDateValue(parts[0]);
				const end = stringToDateValue(parts[1]);
				if (start && end) return { start, end };
			}
		}
		return undefined;
	});
	let dateRangeOpen = $state(false);
	let pageSizeSelectValue = $state<string>(String(pageSize));
	let paginationTimeout: ReturnType<typeof setTimeout> | null = null;

	// 드롭다운 데이터 지연 로딩을 위한 상태
	let internalContractList = $state(contractList);
	let internalClientList = $state(clientList);
	let internalProductList = $state(productList);
	let internalFirmwareList = $state(firmwareList);
	let optionsLoaded = $state(false);

	// props가 변경되면 internal 리스트도 업데이트 (invalidation 후 동기화)
	$effect(() => {
		if (clientList.length > 0 && !optionsLoaded) {
			internalClientList = clientList;
		}
	});
	$effect(() => {
		if (contractList.length > 0 && !optionsLoaded) {
			internalContractList = contractList;
		}
	});

	async function fetchOptions() {
		if (optionsLoaded) return;
		try {
			const res = await fetch('/api/as/options');
			if (res.ok) {
				const data = await res.json();
				internalContractList = data.contractList;
				internalClientList = data.clientList;
				internalProductList = data.productList;
				internalFirmwareList = data.firmwareList;
				optionsLoaded = true;
			}
		} catch (e) {
			console.error('Failed to fetch options', e);
		}
	}

	$effect(() => {
		pagination.pageIndex = currentPage - 1;
	});

	// 계약 수정 다이얼로그가 닫히면 옵션 데이터 갱신 (계약 이름 변경 반영)
	let previousContractEditDialogOpen = $state(false);
	$effect(() => {
		if (previousContractEditDialogOpen && !contractEditDialogOpen) {
			// 다이얼로그가 닫힘 - 옵션 데이터 새로고침
			optionsLoaded = false;
			fetchOptions();
		}
		previousContractEditDialogOpen = contractEditDialogOpen;
	});

	let previousPageSizeValue: string | undefined = $state(undefined);

	// Handle page size change
	$effect(() => {
		if (previousPageSizeValue === undefined) {
			previousPageSizeValue = pageSizeSelectValue;
			return;
		}
		if (pageSizeSelectValue && pageSizeSelectValue !== previousPageSizeValue) {
			const newPageSize = Number(pageSizeSelectValue);
			if (!isNaN(newPageSize) && newPageSize !== pagination.pageSize) {
				pagination.pageSize = newPageSize;
				pagination.pageIndex = 0;
				if (paginationTimeout) {
					clearTimeout(paginationTimeout);
					paginationTimeout = null;
				}
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

		const currentValue = String(pagination.pageSize);
		if (pageSizeSelectValue !== currentValue && pageSizeSelectValue === previousPageSizeValue) {
			pageSizeSelectValue = currentValue;
			previousPageSizeValue = currentValue;
		}
	});

	function executeSearch() {
		let query = searchQuery;
		if (searchField === 'requestDate' || searchField === 'responseDate') {
			if (searchDateRange?.start) {
				if (searchDateRange.end) {
					query = `${searchDateRange.start},${searchDateRange.end}`;
				} else {
					query = `${searchDateRange.start}`;
				}
			} else {
				query = '';
			}
		}

		const newUrl = executeSearchUtil('as', query, searchField, $page.url);
		if (newUrl) {
			if (newUrl.searchParams.get('page') === '1') {
				pagination.pageIndex = 0;
			}
			goto(newUrl.toString(), { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	// 검색어나 검색 필드가 변경될 때 검색 실행
	$effect(() => {
		executeSearch();
	});

	function executePagination() {
		if (paginationTimeout) {
			clearTimeout(paginationTimeout);
			paginationTimeout = null;
		}
		const newUrl = executePaginationUtil(
			'as',
			pagination.pageIndex,
			pagination.pageSize,
			$page.url,
			pageSize
		);
		if (newUrl) {
			goto(newUrl.toString(), { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	// AS 추가 다이얼로그 상태
	let dialogOpen = $state(false);
	let dialogCloseTimeout: ReturnType<typeof setTimeout> | null = null;
	let validationError = $state<string | null>(null);
	let submittingAS = $state(false);
	let dialogScrollContainer = $state<HTMLDivElement | null>(null);

	// 다이얼로그 열릴 때 옵션 로드
	$effect(() => {
		if (dialogOpen) {
			fetchOptions();
		}
	});

	// AS 타입 선택 (contract: 계약에 종속, single: 단일 AS)
	let asType = $state<'contract' | 'single'>('single');
	let selectedContractId = $state<string>('');
	let selectedClientId = $state<string>('');
	let editingASId = $state<number | null>(null);
	let isEditingAS = $derived(editingASId !== null);

	// Popover 상태
	let openContractSelect = $state(false);
	let openClientSelect = $state(false);
	let contractTriggerRef = $state<HTMLButtonElement | null>(null);
	let clientTriggerRef = $state<HTMLButtonElement | null>(null);
	let loadingContractId = $state<number | null>(null);
	let loadingClientId = $state<number | null>(null);

	// 수정 다이얼로그 상태
	let contractEditDialogOpen = $state(false);
	let clientEditDialogOpen = $state(false);
	let editingContractId = $state<number | null>(null);
	let editingClientId = $state<number | null>(null);
	let editingContractRow = $state<any>(null);

	// 고객사 수정 폼 상태
	let editingClientRow = $state<any>(null);
	let submittingClient = $state(false);
	let clientDialogScrollContainer = $state<HTMLDivElement | null>(null);
	let newCustomerName = $state('');
	let newCustomerSource = $state('');
	let newCustomerItem3 = $state('');
	let newCustomerItem4 = $state('');
	let newCustomerItem5 = $state('');
	let newCustomerBusinessNumber = $state('');
	let newCustomerZipCode = $state('');
	let newCustomerAddress = $state('');
	let newCustomerFax = $state('');
	let newCustomerMainContactName = $state('');
	let newCustomerMainContactPosition = $state('');
	let newCustomerMainContactPhone = $state('');
	let newCustomerMainContactEmail = $state('');
	let newCustomerSubContactName = $state('');
	let newCustomerSubContactPosition = $state('');
	let newCustomerSubContactPhone = $state('');
	let newCustomerSubContactEmail = $state('');
	let newCustomerBizLicenseFile = $state<File | null>(null);
	let existingCustomerRegistrationFileName = $state<string | null>(null);
	let existingCustomerRegistrationFileListId = $state<string | null>(null);
	let mainContactPhoneError = $state<string | null>(null);
	let mainContactEmailError = $state<string | null>(null);
	let subContactPhoneError = $state<string | null>(null);
	let subContactEmailError = $state<string | null>(null);
	let faxError = $state<string | null>(null);

	// AS 폼 상태 (DateValue 사용)
	let newASRequestDate = $state<DateValue | undefined>(undefined);
	let newASRequestDateOpen = $state(false);
	let newASRequestContent = $state('');
	let newASResponseDate = $state<DateValue | undefined>(undefined);
	let newASResponseDateOpen = $state(false);
	let newASResponseContent = $state('');

	let newASCost = $state('');
	let newASIsCompleted = $state(false);
	let newASFile = $state<File | null>(null);
	let existingASFileName = $state<string | null>(null);
	let existingASFileListId = $state<string | null>(null);

	function formatContractLabel(contract: { name: string; customerName: string }) {
		const name = (contract?.name ?? '').trim();
		return name || '계약을 선택하세요';
	}

	function resetASForm() {
		asType = 'single';
		selectedContractId = '';
		selectedClientId = '';
		editingASId = null;
		newASRequestDate = undefined;
		newASRequestDateOpen = false;
		newASRequestContent = '';
		newASResponseDate = undefined;
		newASResponseDateOpen = false;
		newASResponseContent = '';
		newASCost = '';
		newASIsCompleted = false;
		newASFile = null;
		existingASFileName = null;
		existingASFileListId = null;
		validationError = null;
	}

	function loadASRowIntoForm(row: ASRecord) {
		editingASId = row.id;
		newASRequestDate = row.requestDate ? stringToDateValue(row.requestDate) : undefined;
		newASResponseDate = row.responseDate ? stringToDateValue(row.responseDate) : undefined;
		newASRequestContent = row.requestContent || '';
		newASResponseContent = row.responseContent || '';
		newASCost = row.cost ? formatCurrency(String(row.cost)) : '';
		newASIsCompleted = !!row.isCompleted;
		existingASFileName = row.photoFileName || null;
		existingASFileListId = row.photoFileListId || null;
		newASFile = null;

		if (row.contractId) {
			asType = 'contract';
			selectedContractId = String(row.contractId);
			selectedClientId = '';
		} else {
			asType = 'single';
			selectedClientId = row.clientId ? String(row.clientId) : '';
			selectedContractId = '';
		}
	}

	function resetClientForm() {
		newCustomerName = '';
		newCustomerSource = '';
		newCustomerItem3 = '';
		newCustomerItem4 = '';
		newCustomerItem5 = '';
		newCustomerBusinessNumber = '';
		newCustomerZipCode = '';
		newCustomerAddress = '';
		newCustomerFax = '';
		newCustomerMainContactName = '';
		newCustomerMainContactPosition = '';
		newCustomerMainContactPhone = '';
		newCustomerMainContactEmail = '';
		newCustomerSubContactName = '';
		newCustomerSubContactPosition = '';
		newCustomerSubContactPhone = '';
		newCustomerSubContactEmail = '';
		newCustomerBizLicenseFile = null;
		existingCustomerRegistrationFileName = null;
		existingCustomerRegistrationFileListId = null;
		mainContactPhoneError = null;
		mainContactEmailError = null;
		subContactPhoneError = null;
		subContactEmailError = null;
		faxError = null;
		editingClientRow = null;
		editingClientId = null;
	}

	const columns: ColumnDef<ASRecord>[] = [
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
			accessorKey: 'customerName',
			header: '고객명',
			cell: ({ row }) => row.original.customerName || '-'
		},
		{
			accessorKey: 'contractName',
			header: '계약명',
			cell: ({ row }) => row.original.contractName || '-'
		},
		{
			accessorKey: 'requestDate',
			header: '요청일자',
			cell: ({ row }) => row.original.requestDate || '-'
		},
		{
			accessorKey: 'requestContent',
			header: '요청내용',
			cell: ({ row }) => row.original.requestContent || '-'
		},
		{
			accessorKey: 'responseDate',
			header: '대응일자',
			cell: ({ row }) => row.original.responseDate || '-'
		},
		{
			accessorKey: 'responseContent',
			header: '대응내용',
			cell: ({ row }) => row.original.responseContent || '-'
		},
		{
			accessorKey: 'cost',
			header: '비용',
			cell: ({ row }) => (row.original.cost ? row.original.cost.toLocaleString() + '원' : '-')
		},
		{
			accessorKey: 'isCompleted',
			header: '상태',
			cell: ({ row }) => {
				return row.original.isCompleted ? '완료' : '진행중';
			}
		},
		{
			accessorKey: 'photoFileName',
			header: '첨부파일',
			cell: ({ row }) => {
				const fileName = row.original.photoFileName;
				const fileListId = row.original.photoFileListId;

				if (!fileName || !fileListId) return '-';

				// products-table.svelte와 동일한 renderSnippet 패턴 사용
				// 여기서는 간단하게 파일명만 링크로 표시하거나 아이콘 사용
				return renderSnippet(
					createRawSnippet<[{ fileName: string; fileListId: string }]>((getFile) => {
						const { fileName, fileListId } = getFile();
						return {
							render: () =>
								`<a href="/api/files/${fileListId}" class="text-primary hover:underline flex items-center gap-1" download target="_blank">
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-file"><path d="M14 3v4a1 1 0 0 0 1 1h4"></path><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path></svg>
									${fileName}
								</a>`
						};
					}),
					{ fileName, fileListId }
				);
			}
		}
	];

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
		getSortedRowModel: getSortedRowModel(),
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
			}
		}
	});

	const totalPages = $derived(Math.ceil(totalCount / pagination.pageSize) || 1);
</script>

<div class="flex flex-wrap items-center gap-2 px-4 lg:px-6">
	<Label for="search-field-selector" class="sr-only">검색 필드</Label>
	<Select.Root
		type="single"
		value={searchField}
		onValueChange={(v) => {
			searchField = v;
			searchQuery = '';
			searchDateRange = undefined;
		}}
	>
		<Select.Trigger class="w-fit" size="sm" id="search-field-selector">
			{searchField === 'customerName'
				? '고객명'
				: searchField === 'contractName'
					? '계약명'
					: searchField === 'requestContent'
						? '요청내용'
						: searchField === 'responseContent'
							? '대응내용'
							: searchField === 'requestDate'
								? '요청일자'
								: searchField === 'responseDate'
									? '대응일자'
									: searchField === 'status'
										? '상태'
										: '검색 필드'}
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="customerName">고객명</Select.Item>
			<Select.Item value="contractName">계약명</Select.Item>
			<Select.Item value="requestContent">요청내용</Select.Item>
			<Select.Item value="responseContent">대응내용</Select.Item>
			<Select.Item value="requestDate">요청일자</Select.Item>
			<Select.Item value="responseDate">대응일자</Select.Item>
			<Select.Item value="status">상태</Select.Item>
		</Select.Content>
	</Select.Root>

	{#if searchField === 'requestDate' || searchField === 'responseDate'}
		<div class="order-last w-full sm:order-none sm:w-auto">
			<Popover.Root bind:open={dateRangeOpen}>
				<Popover.Trigger class="w-full sm:w-auto">
					{#snippet child({ props })}
						<Button
							variant="outline"
							size="sm"
							class={cn(
								'w-full justify-start text-left font-normal sm:w-[260px]',
								!searchDateRange && 'text-muted-foreground'
							)}
							{...props}
						>
							<CalendarIcon class="mr-2 h-4 w-4" />
							{#if searchDateRange?.start}
								{#if searchDateRange.end}
									{dateFormatter.format(searchDateRange.start.toDate(getLocalTimeZone()))} - {dateFormatter.format(
										searchDateRange.end.toDate(getLocalTimeZone())
									)}
								{:else}
									{dateFormatter.format(searchDateRange.start.toDate(getLocalTimeZone()))}
								{/if}
							{:else}
								날짜 선택
							{/if}
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-0" align="start">
					<RangeCalendar
						bind:value={searchDateRange}
						captionLayout="dropdown"
						locale="ko-KR"
						class="rounded-lg border shadow-sm"
						onValueChange={(v) => {
							// 이미 선택된 시작일을 다시 클릭했을 때(결과가 start==end이고 이전 start와 같음) -> 선택 해제
							const isSameDayClick =
								v.start &&
								v.end &&
								v.start.toString() === v.end.toString() &&
								searchDateRange?.start?.toString() === v.start.toString();

							if (isSameDayClick) {
								searchDateRange = undefined;
								executeSearch();
								return;
							}

							searchDateRange = v;
							executeSearch();
						}}
					/>
				</Popover.Content>
			</Popover.Root>
		</div>
	{:else if searchField === 'status'}
		<ButtonGroup.Root class="items-center">
			{#each [{ v: 'processing', l: '진행중' }, { v: 'completed', l: '완료' }] as s}
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
				oninput={() => executeSearch()}
			/>
		</div>
	{/if}

	<div class="ms-auto flex items-center gap-2">
		{#if table.getFilteredSelectedRowModel().rows.length > 0}
			<form
				method="POST"
				action="?/deleteASRecords"
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
							toast.success('AS 기록이 삭제되었습니다.');
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
						<span class="sr-only">Close</span>
					</Button>
				</Alert.Root>
			</div>
		{/if}

		<Dialog.Root
			bind:open={dialogOpen}
			onOpenChange={(open) => {
				if (open) {
					if (dialogCloseTimeout) {
						clearTimeout(dialogCloseTimeout);
						dialogCloseTimeout = null;
					}
					return;
				}
				if (!open) {
					if (dialogCloseTimeout) clearTimeout(dialogCloseTimeout);
					dialogCloseTimeout = setTimeout(() => {
						if (!dialogOpen) {
							resetASForm();
						}
					}, 500);
				}
			}}
		>
			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					if (dialogCloseTimeout) {
						clearTimeout(dialogCloseTimeout);
						dialogCloseTimeout = null;
					}
					resetASForm();
					dialogOpen = true;
				}}
			>
				<PlusIcon />
				<span class="hidden lg:inline">AS 추가</span>
				<span class="lg:hidden">추가</span>
			</Button>
			<Dialog.Content
				class="w-[95vw] max-w-[95vw] sm:w-full sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
			>
				<div class="px-6 pt-6">
					<Dialog.Header>
						<Dialog.Title>{isEditingAS ? 'AS 수정' : '새 AS 추가'}</Dialog.Title>
					</Dialog.Header>
				</div>

				<form
					method="POST"
					enctype="multipart/form-data"
					action={isEditingAS ? '?/updateASRecord' : '?/createASRecord'}
					use:enhance={({ formData, cancel }) => {
						submittingAS = true;

						validationError = null;

						formData.set('asType', asType);
						if (isEditingAS && editingASId !== null) {
							formData.set('id', String(editingASId));
						}
						if (asType === 'contract') {
							formData.set('contractId', selectedContractId || '');
						} else {
							formData.set('clientId', selectedClientId || '');
						}

						formData.set(
							'requestDate',
							newASRequestDate ? dateValueToString(newASRequestDate) : ''
						);
						formData.set('requestContent', newASRequestContent || '');
						formData.set(
							'responseDate',
							newASResponseDate ? dateValueToString(newASResponseDate) : ''
						);
						formData.set('responseContent', newASResponseContent || '');
						formData.set('cost', parseCurrency(newASCost) || '0');
						formData.set('isCompleted', newASIsCompleted ? '1' : '0');

						// 파일 처리 - formData.set은 enhance 내부에서 자동으로 처리됨
						if (newASFile) {
							formData.set('asFile', newASFile);
						}

						const wasEditing = isEditingAS;

						return async ({ result, update }) => {
							submittingAS = false;

							if (result.type === 'success') {
								dialogOpen = false;
								// 추가/수정 후 현재 페이지 유지하면서 데이터 새로고침
								await update({ reset: false });
								await invalidateAll();
								toast.success(
									wasEditing ? 'AS 기록이 수정되었습니다.' : 'AS 기록이 추가되었습니다.'
								);
							} else if (result.type === 'failure') {
								const errorMessage = result.data?.message ?? '추가에 실패했습니다.';
								toast.error(String(errorMessage));
							}
						};
					}}
					class="flex-1 flex flex-col min-h-0"
				>
					{#if isEditingAS && editingASId !== null}
						<input type="hidden" name="id" value={editingASId} />
					{/if}
					<div bind:this={dialogScrollContainer} class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
						<div class="space-y-4">
							<div class="flex flex-col md:flex-row gap-4 md:items-end">
								<div class="space-y-2 flex-[2]">
									<Label>AS 타입</Label>
									<ButtonGroup.Root class="w-full">
										<Button
											variant={asType === 'contract' ? 'default' : 'outline'}
											size="sm"
											type="button"
											class="flex-1"
											onclick={() => {
												asType = 'contract';
												selectedContractId = '';
											}}
										>
											계약 AS
										</Button>
										<Button
											variant={asType === 'single' ? 'default' : 'outline'}
											size="sm"
											type="button"
											class="flex-1"
											onclick={() => {
												asType = 'single';
												selectedClientId = '';
											}}
										>
											단일 AS
										</Button>
									</ButtonGroup.Root>
								</div>

								{#if asType === 'contract'}
									<div class="space-y-2 flex-[3]">
										<Label>계약 선택</Label>
										<Popover.Root bind:open={openContractSelect}>
											<Popover.Trigger bind:ref={contractTriggerRef} class="w-full">
												{#snippet child({ props })}
													<Button
														variant="outline"
														role="combobox"
														aria-expanded={openContractSelect}
														class="w-full justify-between overflow-hidden min-w-0"
														{...props}
													>
														<span class="flex-1 min-w-0 truncate text-left mr-2">
															{selectedContractId
																? (() => {
																		const contract = internalContractList.find(
																			(c) => c.id.toString() === selectedContractId
																		);
																		return contract
																			? formatContractLabel(contract)
																			: '계약을 선택하세요';
																	})()
																: '계약을 선택하세요'}
														</span>
														<ChevronsUpDownIcon class="h-4 w-4 shrink-0 opacity-50" />
													</Button>
												{/snippet}
											</Popover.Trigger>
											<Popover.Content
												align="start"
												class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0"
											>
												<Command.Root>
													<Command.Input placeholder="계약 검색..." />
													<Command.List>
														<Command.Empty>계약을 찾을 수 없습니다.</Command.Empty>
														<Command.Group>
															{#each internalContractList as contract (contract.id)}
																<Command.Item
																	value={`${contract.id} ${contract.name} ${contract.customerName}`}
																	onSelect={() => {
																		selectedContractId = contract.id.toString();
																		openContractSelect = false;
																		tick().then(() => contractTriggerRef?.focus());
																	}}
																	class="flex items-center justify-between group"
																>
																	<div class="flex items-center gap-2">
																		<CheckIcon
																			class={cn(
																				'me-2 size-4',
																				selectedContractId !== contract.id.toString() &&
																					'text-transparent'
																			)}
																		/>
																		{(contract?.name ?? '').trim()}
																	</div>
																	<Button
																		variant="ghost"
																		size="icon"
																		class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
																		disabled={loadingContractId === contract.id}
																		onclick={async (e) => {
																			e.preventDefault();
																			e.stopPropagation();
																			loadingContractId = contract.id;
																			try {
																				const response = await fetch(
																					`/api/contracts/${contract.id}`
																				);
																				if (response.ok) {
																					const contractData = await response.json();
																					if (contractData) {
																						editingContractRow = contractData;
																						editingContractId = contract.id;
																						contractEditDialogOpen = true;
																						openContractSelect = false;
																					} else {
																						toast.error('계약 데이터를 불러오는데 실패했습니다.');
																					}
																				} else {
																					const errorText = await response.text();
																					console.error('Failed to fetch contract:', errorText);
																					toast.error('계약 데이터를 불러오는데 실패했습니다.');
																				}
																			} catch (error) {
																				console.error('Failed to load contract:', error);
																				toast.error('계약 데이터를 불러오는데 실패했습니다.');
																			} finally {
																				loadingContractId = null;
																			}
																		}}
																	>
																		{#if loadingContractId === contract.id}
																			<LoaderIcon class="h-3 w-3 animate-spin" />
																		{:else}
																			<DotsVerticalIcon class="h-4 w-4" />
																		{/if}
																		<span class="sr-only">Edit contract</span>
																	</Button>
																</Command.Item>
															{/each}
														</Command.Group>
													</Command.List>
												</Command.Root>
											</Popover.Content>
										</Popover.Root>
									</div>
								{:else}
									<div class="space-y-2 flex-[3]">
										<Label>고객사 선택</Label>
										<Popover.Root bind:open={openClientSelect}>
											<Popover.Trigger bind:ref={clientTriggerRef} class="w-full">
												{#snippet child({ props })}
													<Button
														variant="outline"
														role="combobox"
														aria-expanded={openClientSelect}
														class="w-full justify-between overflow-hidden min-w-0"
														{...props}
													>
														<span class="flex-1 min-w-0 truncate text-left mr-2">
															{selectedClientId
																? (() => {
																		const client = internalClientList.find(
																			(c) => c.id.toString() === selectedClientId
																		);
																		return client ? client.customerName : '고객사를 선택하세요';
																	})()
																: '고객사를 선택하세요'}
														</span>
														<ChevronsUpDownIcon class="h-4 w-4 shrink-0 opacity-50" />
													</Button>
												{/snippet}
											</Popover.Trigger>
											<Popover.Content
												align="start"
												class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0"
											>
												<Command.Root>
													<Command.Input placeholder="고객사 검색..." />
													<Command.List>
														<Command.Empty>고객사를 찾을 수 없습니다.</Command.Empty>
														<Command.Group>
															{#each internalClientList as client (client.id)}
																<Command.Item
																	value={`${client.id} ${client.customerName}`}
																	onSelect={() => {
																		selectedClientId = client.id.toString();
																		openClientSelect = false;
																		tick().then(() => clientTriggerRef?.focus());
																	}}
																	class="flex items-center justify-between group"
																>
																	<div class="flex items-center gap-2">
																		<CheckIcon
																			class={cn(
																				'me-2 size-4',
																				selectedClientId !== client.id.toString() &&
																					'text-transparent'
																			)}
																		/>
																		{client.customerName}
																	</div>
																	<Button
																		variant="ghost"
																		size="icon"
																		class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
																		disabled={loadingClientId === client.id}
																		onclick={async (e) => {
																			e.preventDefault();
																			e.stopPropagation();
																			loadingClientId = client.id;
																			try {
																				const response = await fetch(`/api/clients/${client.id}`);
																				if (response.ok) {
																					const clientData = await response.json();
																					if (clientData) {
																						editingClientRow = clientData;
																						newCustomerName = clientData.name1 || '';
																						newCustomerSource = clientData.name2 || '';
																						newCustomerItem3 = clientData.name3 || '';
																						newCustomerItem4 = clientData.name4 || '';
																						newCustomerItem5 = clientData.name5 || '';
																						newCustomerBusinessNumber =
																							clientData.businessNumber || '';
																						newCustomerZipCode = clientData.zipCode || '';
																						newCustomerAddress = clientData.address || '';
																						newCustomerFax = clientData.fax || '';
																						newCustomerMainContactName =
																							clientData.mainContactName || '';
																						newCustomerMainContactPosition =
																							clientData.mainContactPosition || '';
																						newCustomerMainContactPhone =
																							clientData.mainContactPhone || '';
																						newCustomerMainContactEmail =
																							clientData.mainContactEmail || '';
																						newCustomerSubContactName =
																							clientData.subContactName || '';
																						newCustomerSubContactPosition =
																							clientData.subContactPosition || '';
																						newCustomerSubContactPhone =
																							clientData.subContactPhone || '';
																						newCustomerSubContactEmail =
																							clientData.subContactEmail || '';
																						existingCustomerRegistrationFileListId =
																							clientData.registrationFileListId || null;
																						existingCustomerRegistrationFileName =
																							clientData.registrationFileName || null;
																						newCustomerBizLicenseFile = null;
																						editingClientId = client.id;
																						clientEditDialogOpen = true;
																						openClientSelect = false;
																					} else {
																						toast.error('고객사 데이터를 불러오는데 실패했습니다.');
																					}
																				} else {
																					const errorText = await response.text();
																					console.error('Failed to fetch client:', errorText);
																					toast.error('고객사 데이터를 불러오는데 실패했습니다.');
																				}
																			} catch (error) {
																				console.error('Failed to load client:', error);
																				toast.error('고객사 데이터를 불러오는데 실패했습니다.');
																			} finally {
																				loadingClientId = null;
																			}
																		}}
																	>
																		{#if loadingClientId === client.id}
																			<LoaderIcon class="h-3 w-3 animate-spin" />
																		{:else}
																			<DotsVerticalIcon class="h-4 w-4" />
																		{/if}
																		<span class="sr-only">Edit client</span>
																	</Button>
																</Command.Item>
															{/each}
														</Command.Group>
													</Command.List>
												</Command.Root>
											</Popover.Content>
										</Popover.Root>
									</div>
								{/if}

								<div class="flex-[2] flex flex-col md:flex-row gap-4">
									<div class="space-y-2 flex-1">
										<Label>비용</Label>
										<Input
											type="text"
											placeholder="비용"
											bind:value={newASCost}
											class="text-left"
											oninput={(e) => {
												newASCost = formatCurrency(e.currentTarget.value);
											}}
										/>
									</div>

									<div class="space-y-2 md:w-auto md:shrink-0">
										<Label>완료 여부</Label>
										<div class="flex items-center space-x-2 h-9">
											<Checkbox id="as-completed" bind:checked={newASIsCompleted} />
											<Label
												for="as-completed"
												class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
											>
												완료
											</Label>
										</div>
									</div>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-4 flex-1">
									<div class="space-y-2 w-full">
										<Label>요청일자</Label>
										<Popover.Root bind:open={newASRequestDateOpen}>
											<Popover.Trigger class="w-full">
												{#snippet child({ props })}
													<Button
														variant="outline"
														class={cn(
															'w-full justify-start text-start font-normal',
															!newASRequestDate && 'text-muted-foreground'
														)}
														{...props}
													>
														<CalendarIcon class="me-2 size-4" />
														{newASRequestDate
															? dateFormatter.format(newASRequestDate.toDate(getLocalTimeZone()))
															: '요청일자 선택'}
													</Button>
												{/snippet}
											</Popover.Trigger>
											<Popover.Content class="w-auto p-0 z-[250]">
												<Calendar
													type="single"
													bind:value={newASRequestDate}
													captionLayout="dropdown"
												/>
											</Popover.Content>
										</Popover.Root>
									</div>
									<div class="space-y-2">
										<Label>요청내용</Label>
										<Textarea
											bind:value={newASRequestContent}
											class="resize-none w-full"
											rows={3}
											placeholder="요청내용을 입력하세요."
										/>
									</div>
								</div>
								<div class="space-y-4 flex-1">
									<div class="space-y-2 w-full">
										<Label>대응일자</Label>
										<Popover.Root bind:open={newASResponseDateOpen}>
											<Popover.Trigger class="w-full">
												{#snippet child({ props })}
													<Button
														variant="outline"
														class={cn(
															'w-full justify-start text-start font-normal',
															!newASResponseDate && 'text-muted-foreground'
														)}
														{...props}
													>
														<CalendarIcon class="me-2 size-4" />
														{newASResponseDate
															? dateFormatter.format(newASResponseDate.toDate(getLocalTimeZone()))
															: '대응일자 선택'}
													</Button>
												{/snippet}
											</Popover.Trigger>
											<Popover.Content class="w-auto p-0 z-[250]">
												<Calendar
													type="single"
													bind:value={newASResponseDate}
													captionLayout="dropdown"
												/>
											</Popover.Content>
										</Popover.Root>
									</div>
									<div class="space-y-2">
										<Label>대응내용</Label>
										<Textarea
											bind:value={newASResponseContent}
											class="resize-none w-full"
											rows={3}
											placeholder="대응내용을 입력하세요."
										/>
									</div>
								</div>
							</div>
						</div>

						<Field class="mt-4">
							<FieldLabel>첨부파일</FieldLabel>
							<FieldContent>
								<FileUploadField
									bind:newFile={newASFile}
									bind:existingFileListId={existingASFileListId}
									bind:existingFileName={existingASFileName}
									inputId="as-file"
									inputName="asFile"
									scrollContainer={dialogScrollContainer}
								/>
							</FieldContent>
						</Field>
					</div>

					<div class="px-6 pb-6">
						<Dialog.Footer class="flex-row justify-end gap-2">
							<Button
								variant="outline"
								type="button"
								onclick={() => {
									dialogOpen = false;
								}}
							>
								취소
							</Button>
							<Button
								type="submit"
								disabled={submittingAS ||
									(asType === 'contract' && !selectedContractId) ||
									(asType === 'single' && !selectedClientId)}
							>
								{#if submittingAS}
									<Spinner class="size-4" />
								{/if}
								{isEditingAS ? '수정 저장' : 'AS 추가'}
							</Button>
						</Dialog.Footer>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>
</div>

<div class="relative flex flex-col gap-4 px-4 lg:px-6 pb-4 pt-0 overflow-auto">
	<!-- 테이블 -->
	<div class="rounded-lg border flex flex-col overflow-hidden">
		<DragDropProvider
			modifiers={[
				// @ts-expect-error @dnd-kit/abstract types are botched atm
				RestrictToVerticalAxis
			]}
			onDragEnd={(e) => {
				// AS 기록은 드래그로 순서 변경이 필요 없으므로 빈 함수로 처리
			}}
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
									<Table.Cell colspan={columns.length} class="text-center py-8">
										<span class="text-muted-foreground text-sm">결과가 없습니다.</span>
									</Table.Cell>
								</Table.Row>
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		</DragDropProvider>
	</div>

	<div class="flex items-center justify-between px-4">
		<div class="hidden">
			{totalCount}개 행
		</div>
		<div class="flex w-full items-center justify-between">
			<div class="hidden items-center gap-2 lg:flex">
				<Label for="rows-per-page" class="text-sm font-medium">페이지당 행 수</Label>
				<Select.Root type="single" bind:value={pageSizeSelectValue}>
					<Select.Trigger size="sm" class="w-20" id="rows-per-page">
						{pagination.pageSize}
					</Select.Trigger>
					<Select.Content side="top">
						{#each [10, 25, 50, 100] as pageSizeOption}
							<Select.Item value={pageSizeOption.toString()}>{pageSizeOption}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex items-center gap-2">
				<div class="flex w-fit items-center justify-center text-sm font-medium">
					{currentPage} / {totalPages || 1} 페이지
				</div>
				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						class="hidden h-8 w-8 p-0 lg:flex"
						onclick={() => {
							pagination.pageIndex = 0;
							if (paginationTimeout) {
								clearTimeout(paginationTimeout);
								paginationTimeout = null;
							}
							executePagination();
						}}
						disabled={currentPage <= 1}
					>
						<span class="sr-only">첫 페이지로 이동</span>
						<ChevronsLeftIcon />
					</Button>
					<Button
						variant="outline"
						class="size-8"
						size="icon"
						onclick={() => {
							pagination.pageIndex = Math.max(0, pagination.pageIndex - 1);
							if (paginationTimeout) {
								clearTimeout(paginationTimeout);
								paginationTimeout = null;
							}
							executePagination();
						}}
						disabled={currentPage <= 1}
					>
						<span class="sr-only">이전 페이지로 이동</span>
						<ChevronLeftIcon />
					</Button>
					<Button
						variant="outline"
						class="size-8"
						size="icon"
						onclick={() => {
							pagination.pageIndex = pagination.pageIndex + 1;
							if (paginationTimeout) {
								clearTimeout(paginationTimeout);
								paginationTimeout = null;
							}
							executePagination();
						}}
						disabled={currentPage >= (totalPages || 1)}
					>
						<span class="sr-only">다음 페이지로 이동</span>
						<ChevronRightIcon />
					</Button>
					<Button
						variant="outline"
						class="hidden size-8 lg:flex"
						size="icon"
						onclick={() => {
							pagination.pageIndex = (totalPages || 1) - 1;
							if (paginationTimeout) {
								clearTimeout(paginationTimeout);
								paginationTimeout = null;
							}
							executePagination();
						}}
						disabled={currentPage >= (totalPages || 1)}
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
		<span class="sr-only">Drag to reorder</span>
	</Button>
{/snippet}

{#snippet DraggableRow({ row, index }: { row: Row<ASRecord>; index: number })}
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
			const target = e.target as HTMLElement | null;
			if (target?.closest('button,input,a,textarea,select')) return;
			if (dialogCloseTimeout) {
				clearTimeout(dialogCloseTimeout);
				dialogCloseTimeout = null;
			}
			loadASRowIntoForm(row.original);
			dialogOpen = true;
		}}
	>
		{#each row.getVisibleCells() as cell}
			<Table.Cell>
				{#if cell.column.id === 'isCompleted'}
					{#if row.original.isCompleted}
						<Badge variant="default">완료</Badge>
					{:else}
						<Badge variant="secondary">진행중</Badge>
					{/if}
				{:else}
					<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
				{/if}
			</Table.Cell>
		{/each}
	</Table.Row>
{/snippet}

<!-- 고객사 수정 Dialog -->
<Dialog.Root
	bind:open={clientEditDialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			setTimeout(() => {
				resetClientForm();
			}, 500);
		}
	}}
>
	<Dialog.Content
		class="w-[95vw] max-w-[95vw] sm:w-full sm:max-w-5xl max-h-[90vh] flex flex-col p-0 z-[150] overflow-hidden"
	>
		<div class="px-6 pt-6">
			<Dialog.Header>
				<Dialog.Title>고객사 수정</Dialog.Title>
			</Dialog.Header>
		</div>

		<form
			method="POST"
			enctype="multipart/form-data"
			novalidate
			action="/clients?/updateClient"
			use:enhance={({ formData, cancel }) => {
				if (newCustomerBizLicenseFile) {
					submittingClient = true;
				}

				if (!newCustomerName || !newCustomerName.trim()) {
					validationError = '고객사명을 입력하세요.';
					setTimeout(() => {
						validationError = null;
					}, 5000);
					cancel();
					submittingClient = false;
					return;
				}

				if (newCustomerMainContactPhone && !validatePhone(newCustomerMainContactPhone)) {
					mainContactPhoneError = '올바른 전화번호 형식이 아닙니다.';
					cancel();
					submittingClient = false;
					return;
				}
				if (newCustomerMainContactEmail && !validateEmail(newCustomerMainContactEmail)) {
					mainContactEmailError = '올바른 이메일 형식이 아닙니다.';
					cancel();
					submittingClient = false;
					return;
				}
				if (newCustomerSubContactPhone && !validatePhone(newCustomerSubContactPhone)) {
					subContactPhoneError = '올바른 전화번호 형식이 아닙니다.';
					cancel();
					submittingClient = false;
					return;
				}
				if (newCustomerSubContactEmail && !validateEmail(newCustomerSubContactEmail)) {
					subContactEmailError = '올바른 이메일 형식이 아닙니다.';
					cancel();
					submittingClient = false;
					return;
				}
				if (newCustomerFax && !validatePhone(newCustomerFax)) {
					faxError = '올바른 전화번호 형식이 아닙니다.';
					cancel();
					submittingClient = false;
					return;
				}

				validationError = null;

				if (editingClientRow && editingClientId) {
					formData.set('id', String(editingClientId));
				}

				formData.set('name1', newCustomerName || '');
				formData.set('name2', newCustomerSource || '');
				formData.set('name3', newCustomerItem3 || '');
				formData.set('name4', newCustomerItem4 || '');
				formData.set('name5', newCustomerItem5 || '');
				formData.set('businessNumber', newCustomerBusinessNumber || '');
				formData.set('zipCode', newCustomerZipCode || '');
				formData.set('address', newCustomerAddress || '');
				formData.set('fax', newCustomerFax || '');
				formData.set('mainContactName', newCustomerMainContactName || '');
				formData.set('mainContactPosition', newCustomerMainContactPosition || '');
				formData.set('mainContactPhone', newCustomerMainContactPhone || '');
				formData.set('mainContactEmail', newCustomerMainContactEmail || '');
				formData.set('subContactName', newCustomerSubContactName || '');
				formData.set('subContactPosition', newCustomerSubContactPosition || '');
				formData.set('subContactPhone', newCustomerSubContactPhone || '');
				formData.set('subContactEmail', newCustomerSubContactEmail || '');

				if (editingClientRow) {
					const originalFileListId = editingClientRow.registrationFileListId;
					if (
						originalFileListId &&
						!existingCustomerRegistrationFileListId &&
						!newCustomerBizLicenseFile
					) {
						formData.set('removeRegistrationFile', 'true');
					}
				}
				if (newCustomerBizLicenseFile) {
					formData.set('registrationFile', newCustomerBizLicenseFile);
				}

				return async ({ result, update }) => {
					submittingClient = false;

					if (result.type === 'success') {
						clientEditDialogOpen = false;
						await update({ reset: false });
						await invalidate('clients:update');
						await invalidate('as:update');

						// 드롭다운 데이터 즉시 갱신
						optionsLoaded = false;
						await fetchOptions();

						toast.success(String('고객사가 수정되었습니다.'));
					} else if (result.type === 'failure') {
						const wasEditing = editingClientRow !== null;
						const errorMessage =
							result.data?.message ??
							(wasEditing ? '수정에 실패했습니다.' : '추가에 실패했습니다.');
						toast.error(String(errorMessage));
						console.error('Form action failed:', result);
					}
				};
			}}
			class="flex-1 flex flex-col min-h-0"
		>
			<div bind:this={clientDialogScrollContainer} class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
				{#if validationError}
					<div class="mb-4">
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
								<span class="sr-only">Close</span>
							</Button>
						</Alert.Root>
					</div>
				{/if}
				{@render ClientForm()}
			</div>

			<div class="px-6 pb-6">
				<Dialog.Footer class="flex-row justify-end gap-2">
					<Button
						variant="outline"
						type="button"
						onclick={() => {
							clientEditDialogOpen = false;
						}}
					>
						취소
					</Button>
					<Button type="submit" disabled={submittingClient || !newCustomerName?.trim()}>
						{#if submittingClient}
							<Spinner class="size-4" />
						{/if}
						고객사 수정
					</Button>
				</Dialog.Footer>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

{#snippet ClientForm()}
	<div class="space-y-4">
		<div class="space-y-3">
			<Label>고객사명</Label>
			<div class="grid grid-cols-1 md:grid-cols-5 gap-4">
				<Input name="name1" placeholder="항목 1" bind:value={newCustomerName} />
				<Input name="name2" placeholder="항목 2" bind:value={newCustomerSource} />
				<Input name="name3" placeholder="항목 3" bind:value={newCustomerItem3} />
				<Input name="name4" placeholder="항목 4" bind:value={newCustomerItem4} />
				<Input name="name5" placeholder="항목 5" bind:value={newCustomerItem5} />
			</div>
		</div>

		<Separator />

		<Field>
			<FieldLabel>사업자등록번호</FieldLabel>
			<FieldContent>
				<Input
					name="businessNumber"
					placeholder="123-45-67890"
					bind:value={newCustomerBusinessNumber}
				/>
			</FieldContent>
		</Field>

		<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
			<Field class="md:col-span-7">
				<FieldLabel>주소</FieldLabel>
				<FieldContent>
					<Input
						name="address"
						placeholder="서울특별시 강남구..."
						bind:value={newCustomerAddress}
					/>
				</FieldContent>
			</Field>
			<Field class="md:col-span-2">
				<FieldLabel>우편번호</FieldLabel>
				<FieldContent>
					<Input name="zipCode" placeholder="12345" bind:value={newCustomerZipCode} />
				</FieldContent>
			</Field>
			<Field class="md:col-span-3">
				<FieldLabel>FAX</FieldLabel>
				<FieldContent>
					<div class="flex flex-col gap-1">
						<Input
							name="fax"
							placeholder="02-123-4567"
							bind:value={newCustomerFax}
							aria-invalid={faxError ? 'true' : 'false'}
							oninput={(e) => {
								const formatted = formatPhoneNumber(e.currentTarget.value);
								newCustomerFax = formatted;
								if (faxError) {
									faxError = null;
								}
							}}
							onblur={() => {
								faxError = validatePhone(newCustomerFax)
									? null
									: '올바른 전화번호 형식이 아닙니다.';
							}}
						/>
						{#if faxError}
							<p class="text-xs text-destructive">{faxError}</p>
						{/if}
					</div>
				</FieldContent>
			</Field>
		</div>

		<Separator />

		<ContactSection
			label="담당자(주)"
			namePrefix="mainContact"
			bind:name={newCustomerMainContactName}
			bind:position={newCustomerMainContactPosition}
			bind:phone={newCustomerMainContactPhone}
			bind:email={newCustomerMainContactEmail}
			bind:phoneError={mainContactPhoneError}
			bind:emailError={mainContactEmailError}
		/>

		<ContactSection
			label="담당자(부)"
			namePrefix="subContact"
			bind:name={newCustomerSubContactName}
			bind:position={newCustomerSubContactPosition}
			bind:phone={newCustomerSubContactPhone}
			bind:email={newCustomerSubContactEmail}
			bind:phoneError={subContactPhoneError}
			bind:emailError={subContactEmailError}
		/>

		<Separator />

		<Field>
			<FieldLabel>사업자등록증</FieldLabel>
			<FieldContent>
				<FileUploadField
					bind:newFile={newCustomerBizLicenseFile}
					bind:existingFileListId={existingCustomerRegistrationFileListId}
					bind:existingFileName={existingCustomerRegistrationFileName}
					inputId="client-biz-license-file"
					scrollContainer={clientDialogScrollContainer}
					uploadLabel="Upload License"
					uploadHint="PDF, IMG, etc."
				/>
			</FieldContent>
		</Field>
	</div>
{/snippet}

<!-- 계약 수정 Dialog -->
<HomeContractDialog
	bind:open={contractEditDialogOpen}
	bind:contract={editingContractRow}
	clientList={internalClientList.map((client) => ({
		id: client.id,
		name: client.customerName,
		name1: client.name1,
		name2: client.name2,
		name3: client.name3,
		name4: client.name4,
		name5: client.name5,
		mainContactName: client.mainContactName,
		mainContactPosition: client.mainContactPosition,
		mainContactPhone: client.mainContactPhone,
		mainContactEmail: client.mainContactEmail,
		subContactName: client.subContactName,
		subContactPosition: client.subContactPosition,
		subContactPhone: client.subContactPhone,
		subContactEmail: client.subContactEmail,
		address: client.address
	}))}
	productList={internalProductList}
	firmwareList={internalFirmwareList}
/>
