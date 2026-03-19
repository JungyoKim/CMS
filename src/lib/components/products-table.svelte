<script lang="ts">
	import {
		getCoreRowModel,
		getFacetedRowModel,
		getFacetedUniqueValues,
		getFilteredRowModel,
		getSortedRowModel,
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type Row,
		type RowSelectionState,
		type SortingState,
		type VisibilityState
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
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Field, FieldLabel, FieldContent } from '$lib/components/ui/field/index.js';
	import {
		FlexRender,
		renderComponent,
		renderSnippet
	} from '$lib/components/ui/data-table/index.js';
	import GripVerticalIcon from '@tabler/icons-svelte/icons/grip-vertical';
	import ChevronLeftIcon from '@tabler/icons-svelte/icons/chevron-left';
	import ChevronRightIcon from '@tabler/icons-svelte/icons/chevron-right';
	import ChevronsLeftIcon from '@tabler/icons-svelte/icons/chevrons-left';
	import ChevronsRightIcon from '@tabler/icons-svelte/icons/chevrons-right';
	import LoaderIcon from '@tabler/icons-svelte/icons/loader';
	import DotsVerticalIcon from '@tabler/icons-svelte/icons/dots-vertical';
	import { toast } from 'svelte-sonner';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import DataTableCheckbox from './data-table-checkbox.svelte';
	import { createRawSnippet } from 'svelte';
	import { DragDropProvider } from '@dnd-kit-svelte/svelte';
	import { move } from '@dnd-kit/helpers';
	import { useSortable } from '@dnd-kit-svelte/svelte/sortable';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import SearchIcon from '@tabler/icons-svelte/icons/search';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import XIcon from '@tabler/icons-svelte/icons/x';
	import FileUploadField from '$lib/components/ui/file-upload-field.svelte';
	import TrashIcon from '@tabler/icons-svelte/icons/trash';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { cn } from '$lib/utils.js';
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import { page } from '$app/stores';
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { type DateValue, getLocalTimeZone } from '@internationalized/date';
	import {
		dateFormatter,
		dateValueToString,
		stringToDateValue,
		executeSearch as executeSearchUtil,
		executePagination as executePaginationUtil,
		getRedirectPageAfterChange,
		createPageRedirectUrl
	} from './data-table/utils.js';
	import PlusIcon from '@tabler/icons-svelte/icons/plus';
	import AlertCircleTablerIcon from '@tabler/icons-svelte/icons/alert-circle';

	// Props Definition
	let {
		data,
		totalCount = 0,
		currentPage = 1,
		pageSize = 10,
		firmwareList = []
	}: {
		data: Schema[];
		totalCount?: number;
		currentPage?: number;
		pageSize?: number;
		firmwareList?: Array<{ id: number; name: string }>;
	} = $props();

	// State Management
	let pagination = $state<PaginationState>({ pageIndex: currentPage - 1, pageSize: pageSize });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let rowSelection = $state<RowSelectionState>({});
	let columnVisibility = $state<VisibilityState>({});
	let pageSizeSelectValue = $state<string>(String(pageSize));

	// Search & Filter State
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let searchField = $state<string | undefined>(
		$page.url.searchParams.get('field') || 'productName'
	); // Default to productName

	// Dialog & Edit State
	let dialogOpen = $state(false);
	let editingRow = $state<Schema | null>(null);
	let isEditingMode = $state(false);
	let validationError = $state<string | null>(null);
	let dialogCloseTimeout: ReturnType<typeof setTimeout> | null = null;
	let dialogScrollContainer: HTMLDivElement | null = null;
	let submittingProduct = $state(false);

	// Product Form State
	let newProductName = $state('');
	let newProductCode = $state('');
	let newProductVersion = $state('');
	let newProductDescription = $state('');
	let newProductPrice = $state('');
	let newProductFirmwareId = $state<string>('');
	let newProductFile = $state<File | null>(null);
	let existingProductFileName = $state<string | null>(null);
	let existingProductFileListId = $state<string | null>(null);
	let loadingFirmwareId = $state<number | null>(null);
	let firmwareEditDialogOpen = $state(false);
	let editingFirmwareId = $state<number | null>(null);
	let editingFirmwareRow = $state<Schema | null>(null);
	let submittingFirmware = $state(false);

	// Firmware Form State
	let newFirmwareName = $state('');
	let newFirmwareVersion = $state('');
	let newFirmwareMemo = $state('');
	let newFirmwareDocFile = $state<File | null>(null);
	let newFirmwareBinFile = $state<File | null>(null);
	let existingFirmwareFileName = $state<string | null>(null);
	let existingFirmwareFileListId = $state<string | null>(null);
	let existingDocFileName = $state<string | null>(null);
	let existingDocFileListId = $state<string | null>(null);

	// Firmware Select State
	let productFirmwareOpen = $state(false);
	let productFirmwareTriggerRef = $state<HTMLButtonElement>(null!);

	// Inventory State
	type InventoryEntry = {
		id: string;
		checked: boolean;
		type: string; // 'in' | 'out'
		content: string;
		date: DateValue | undefined;
		quantity: string;
		dateOpen?: boolean;
	};
	let productInventory = $state<InventoryEntry[]>([]);
	let openInventoryDialog = $state(false);

	let productTotalQuantity = $derived.by(() => {
		return productInventory.reduce((total, inv) => {
			const qty = parseInt(inv.quantity) || 0;
			if (inv.type === 'in') {
				return total + qty;
			} else if (inv.type === 'out') {
				return total - qty;
			}
			return total;
		}, 0);
	});

	// --- Pagination & Search Logic ---

	// Sync pagination state with props
	$effect(() => {
		pagination.pageIndex = currentPage - 1;
	});

	let previousPageSizeValue = $state<string>(String(pageSize));
	let paginationTimeout: ReturnType<typeof setTimeout> | null = null;

	// Handle page size change
	$effect(() => {
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
	});

	function executeSearch() {
		const newUrl = executeSearchUtil('products', searchQuery, searchField ?? null, $page.url);
		if (newUrl) {
			if (newUrl.searchParams.get('page') === '1') {
				pagination.pageIndex = 0;
			}
			goto(newUrl.toString(), { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	// Trigger search on typing
	$effect(() => {
		executeSearch();
	});

	function executePagination() {
		const newUrl = executePaginationUtil(
			'products',
			pagination.pageIndex,
			pagination.pageSize,
			$page.url,
			pageSize
		);
		if (newUrl) {
			goto(newUrl.toString(), { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	// --- Form Logic ---

	function resetForm() {
		newProductName = '';
		newProductCode = '';
		newProductVersion = '';
		newProductPrice = '';
		newProductDescription = '';
		newProductFirmwareId = '';
		newProductFile = null;
		existingProductFileName = null;
		existingProductFileListId = null;
		productInventory = [];
		editingRow = null;
		isEditingMode = false;
	}

	function loadEditingRowIntoForm() {
		if (!editingRow) return;

		// @ts-expect-error - Schema fields
		newProductName = editingRow.productName || '';
		// @ts-expect-error
		newProductCode = editingRow.productCode || '';
		// @ts-expect-error
		newProductVersion = editingRow.version || '';
		// @ts-expect-error
		newProductPrice = editingRow.price ? String(editingRow.price) : '';
		// @ts-expect-error
		newProductDescription = editingRow.memo || '';
		// @ts-expect-error
		newProductFirmwareId = editingRow.protocolId ? String(editingRow.protocolId) : '';
		// @ts-expect-error
		existingProductFileName = editingRow.photoFileName || null;
		// @ts-expect-error
		existingProductFileListId = editingRow.photoFileListId || null;
		newProductFile = null;

		// @ts-expect-error
		const inventoryData = editingRow.inventoryData || [];
		productInventory = inventoryData.map((inv: any) => ({
			id: Math.random().toString(),
			checked: false,
			type: inv.type || 'in',
			content: inv.content || '',
			date: stringToDateValue(inv.date),
			quantity: inv.quantity ? String(inv.quantity) : '',
			dateOpen: false
		}));
	}

	// editingRow가 변경되고 dialogOpen이 true일 때 폼 로드
	$effect(() => {
		if (editingRow && dialogOpen) {
			loadEditingRowIntoForm();
		}
	});

	function resetFirmwareEditDialog() {
		newFirmwareName = '';
		newFirmwareVersion = '';
		newFirmwareMemo = '';
		newFirmwareDocFile = null;
		newFirmwareBinFile = null;
		existingFirmwareFileName = null;
		existingFirmwareFileListId = null;
		existingDocFileName = null;
		existingDocFileListId = null;
		editingFirmwareRow = null;
		editingFirmwareId = null;
	}

	// --- Inventory Helper Functions ---

	function addInventoryRow() {
		productInventory = [
			...productInventory,
			{
				id: Math.random().toString(),
				checked: false,
				type: 'in',
				content: '',
				date: undefined,
				quantity: '',
				dateOpen: false
			}
		];
	}

	function removeSelectedInventory() {
		const scrollPosition = window.scrollY || document.documentElement.scrollTop;
		productInventory = productInventory.filter((item) => !item.checked);
		requestAnimationFrame(() => {
			window.scrollTo(0, scrollPosition);
		});
	}

	// --- Table Configuration ---

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
			accessorKey: 'productName',
			header: '제품명',
			cell: ({ row }) => {
				// @ts-expect-error
				return row.original.productName || row.original.header || '-';
			}
		},
		{
			accessorKey: 'productCode',
			header: '관리코드',
			cell: ({ row }) => {
				// @ts-expect-error
				return row.original.productCode || '-';
			}
		},
		{
			accessorKey: 'protocolId',
			header: '펌웨어',
			cell: ({ row }) => {
				// @ts-expect-error
				const protocolId = row.original.protocolId;
				if (!protocolId) return '-';
				const firmware = firmwareList.find((f) => String(f.id) === String(protocolId));
				return firmware?.name || '-';
			}
		},
		{
			accessorKey: 'price',
			header: '단가',
			cell: ({ row }) => {
				// @ts-expect-error
				const price = row.original.price;
				return price
					? typeof price === 'number'
						? price.toLocaleString() + '원'
						: price + '원'
					: '-';
			}
		},
		{
			accessorKey: 'memo',
			header: '메모',
			cell: ({ row }) => {
				// @ts-expect-error
				return row.original.memo || '-';
			}
		},
		{
			accessorKey: 'totalQuantity',
			header: '재고',
			cell: ({ row }) => {
				// @ts-expect-error
				const totalQuantity = row.original.totalQuantity;
				return totalQuantity !== undefined ? totalQuantity.toLocaleString() + '개' : '0개';
			}
		},
		{
			accessorKey: 'photoFileName',
			header: '파일명',
			cell: ({ row }) => {
				// @ts-expect-error
				const fileName = row.original.photoFileName;
				// @ts-expect-error
				const fileListId = row.original.photoFileListId;

				if (!fileName || !fileListId) return '-';

				const fileLinkSnippet = createRawSnippet<[{ fileName: string; fileListId: string }]>(
					(getFile) => {
						const { fileName, fileListId } = getFile();
						return {
							render: () =>
								`<a href="/api/files/${fileListId}" class="text-primary hover:underline" download>${fileName}</a>`
						};
					}
				);
				return renderSnippet(fileLinkSnippet, { fileName, fileListId });
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
			get columnFilters() {
				return columnFilters;
			},
			get rowSelection() {
				return rowSelection;
			},
			get columnVisibility() {
				return columnVisibility;
			}
		},
		getRowId: (row) => row.id.toString(),
		enableRowSelection: true,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),

		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = { ...pagination, ...updater };
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = Array.isArray(updater) ? updater : [...sorting, ...updater];
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = Array.isArray(updater) ? columnFilters : [...columnFilters, ...updater];
			}
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = typeof updater === 'object' && updater !== null ? updater : {};
			}
		},
		onColumnVisibilityChange: (updater) => {
			if (typeof updater === 'function') {
				columnVisibility = updater(columnVisibility);
			} else {
				columnVisibility = typeof updater === 'object' && updater !== null ? updater : {};
			}
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

	const totalPages = $derived(Math.ceil(totalCount / pagination.pageSize) || 1);
	const currentPageNum = $derived(pagination.pageIndex + 1);
</script>

<div class="flex flex-wrap items-center gap-2 px-4 lg:px-6">
	<Label for="search-field-selector" class="sr-only">검색 필드</Label>
	<Select.Root type="single" bind:value={searchField}>
		<Select.Trigger class="w-fit" size="sm" id="search-field-selector">
			{searchableFields.find((f) => f.id === searchField)?.label ??
				searchableFields[0]?.label ??
				'검색 필드'}
		</Select.Trigger>
		<Select.Content>
			{#each searchableFields as field (field.id)}
				<Select.Item value={field.id}>{field.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

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

	<div class="ms-auto flex items-center gap-2">
		{#if table.getFilteredSelectedRowModel().rows.length > 0}
			<form
				method="POST"
				action="?/deleteProducts"
				use:enhance={() => {
					const deletingCount = table.getFilteredSelectedRowModel().rows.length;
					return async ({ result }) => {
						if (result.type === 'success') {
							rowSelection = {};
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
				in:slide={{ axis: 'y', duration: 300, start: -20 }}
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
				// 다이얼로그 닫힘 애니메이션이 완료된 후 초기화 (약 500ms 지연)
				if (dialogCloseTimeout) clearTimeout(dialogCloseTimeout);
				dialogCloseTimeout = setTimeout(() => {
					if (!dialogOpen) {
						resetForm();
						validationError = null;
					}
				}, 500);
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
					resetForm();
					validationError = null;
					dialogOpen = true;
				}}
			>
				<PlusIcon />
				<span class="hidden lg:inline">제품 추가</span>
				<span class="lg:hidden">추가</span>
			</Button>
			<Dialog.Content class="sm:max-w-5xl max-h-[90vh] flex flex-col p-0">
				<div class="px-6 pt-6">
					<Dialog.Header>
						<Dialog.Title>{editingRow ? '제품 수정' : '새 제품 추가'}</Dialog.Title>
					</Dialog.Header>
				</div>

				<form
					method="POST"
					enctype="multipart/form-data"
					novalidate
					action={editingRow ? '?/updateProduct' : '?/createProduct'}
					use:enhance={({ formData, cancel }) => {
						if (newProductFile) submittingProduct = true;

						if (!newProductName || !newProductName.trim()) {
							validationError = '제품명을 입력하세요.';
							setTimeout(() => (validationError = null), 5000);
							cancel();
							submittingProduct = false;
							return;
						}
						validationError = null;

						if (editingRow) {
							formData.set('id', String(editingRow.id));
							// @ts-expect-error
							const originalFileListId = editingRow.photoFileListId;
							if (originalFileListId && !existingProductFileListId && !newProductFile) {
								formData.set('removeProductFile', 'true');
							}
						}
						if (newProductFile) {
							formData.set('productFile', newProductFile);
						}
						formData.set('productName', newProductName || '');
						formData.set('productCode', newProductCode || '');
						formData.set('productVersion', newProductVersion || '');
						formData.set('productPrice', newProductPrice || '0');
						formData.set('productMemo', newProductDescription || '');
						formData.set('productFirmwareId', newProductFirmwareId || '');
						formData.set(
							'inventoryData',
							JSON.stringify(
								productInventory.map((item) => ({
									type: item.type,
									content: item.content,
									date: item.date ? dateValueToString(item.date) : null,
									quantity: item.quantity ? parseInt(item.quantity) || 0 : 0
								}))
							)
						);

						return async ({ result, update }) => {
							submittingProduct = false;
							if (result.type === 'success') {
								const wasEditing = editingRow !== null;

								// 다이얼로그 닫기 (이것이 onOpenChange를 트리거함)
								dialogOpen = false;

								// 데이터 갱신 (reset: false로 폼 자동 리셋 방지)
								await update({ reset: false });
								await invalidateAll();
								toast.success(wasEditing ? '제품이 수정되었습니다.' : '제품이 추가되었습니다.');

								// resetForm()은 onOpenChange에서 setTimeout으로 처리됨
							} else if (result.type === 'failure') {
								const wasEditing = editingRow !== null;
								const errorMessage =
									typeof result.data?.message === 'string'
										? result.data.message
										: wasEditing
											? '수정에 실패했습니다.'
											: '추가에 실패했습니다.';
								toast.error(errorMessage);
							}
						};
					}}
					class="flex-1 flex flex-col min-h-0"
				>
					<div bind:this={dialogScrollContainer} class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
						{@render ProductForm()}
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
							<Button type="submit" disabled={submittingProduct || !newProductName?.trim()}>
								{#if submittingProduct}
									<Spinner class="size-4" />
								{/if}
								{editingRow ? '제품 수정' : '제품 추가'}
							</Button>
						</Dialog.Footer>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Root>
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
										<Table.Head
											colspan={header.colSpan}
											class={header.column.id === 'price' || header.column.id === 'totalQuantity'
												? 'text-end'
												: ''}
										>
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
			{table.getFilteredSelectedRowModel().rows.length}개 / {totalCount}개 행 선택됨
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
					{currentPage} / {Math.ceil(totalCount / pageSize) || 1} 페이지
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
						disabled={currentPage >= (Math.ceil(totalCount / pageSize) || 1)}
					>
						<span class="sr-only">다음 페이지로 이동</span>
						<ChevronRightIcon />
					</Button>
					<Button
						variant="outline"
						class="hidden size-8 lg:flex"
						size="icon"
						onclick={() => {
							pagination.pageIndex = (Math.ceil(totalCount / pageSize) || 1) - 1;
							if (paginationTimeout) {
								clearTimeout(paginationTimeout);
								paginationTimeout = null;
							}
							executePagination();
						}}
						disabled={currentPage >= (Math.ceil(totalCount / pageSize) || 1)}
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
			if (target.closest('[role="checkbox"]') || target.closest('button') || target.closest('a')) {
				return;
			}
			e.stopPropagation();
			if (dialogOpen) return;
			if (dialogCloseTimeout) {
				clearTimeout(dialogCloseTimeout);
				dialogCloseTimeout = null;
			}
			editingRow = row.original;
			loadEditingRowIntoForm();
			dialogOpen = true;
		}}
	>
		{#each row.getVisibleCells() as cell (cell.id)}
			<Table.Cell
				class={cell.column.id === 'price' || cell.column.id === 'totalQuantity' ? 'text-end' : ''}
			>
				<FlexRender
					attach={handleRef}
					content={cell.column.columnDef.cell}
					context={cell.getContext()}
				/>
			</Table.Cell>
		{/each}
	</Table.Row>
{/snippet}

{#snippet ProductForm()}
	<div class="space-y-4">
		<Field>
			<FieldLabel>제품명</FieldLabel>
			<FieldContent>
				<Input
					name="productName"
					placeholder="예: IoT 컨트롤러"
					bind:value={newProductName}
					required
					aria-required="true"
				/>
			</FieldContent>
		</Field>
		<div class="grid grid-cols-2 gap-4">
			<Field>
				<FieldLabel>관리코드</FieldLabel>
				<FieldContent>
					<Input name="productCode" placeholder="예: PRD-001" bind:value={newProductCode} />
				</FieldContent>
			</Field>
			<Field>
				<FieldLabel>펌웨어</FieldLabel>
				<FieldContent>
					<Popover.Root bind:open={productFirmwareOpen}>
						<Popover.Trigger bind:ref={productFirmwareTriggerRef}>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="outline"
									class="w-full justify-between overflow-hidden min-w-0"
									role="combobox"
									aria-expanded={productFirmwareOpen}
								>
									<span class="overflow-x-auto whitespace-nowrap scrollbar-hide flex-1 text-left">
										{firmwareList.find((f) => String(f.id) === newProductFirmwareId)?.name ||
											'펌웨어 선택...'}
									</span>
									<ChevronsUpDownIcon class="opacity-50 shrink-0" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content
							align="start"
							class="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[90vw] p-0 z-[130]"
						>
							<Command.Root>
								<Command.Input placeholder="펌웨어 검색..." />
								<Command.List>
									<Command.Empty>펌웨어를 찾을 수 없습니다.</Command.Empty>
									<Command.Group>
										{#each firmwareList as firmware (firmware.id)}
											<Command.Item
												value={`${firmware.id} ${firmware.name}`}
												onSelect={() => {
													newProductFirmwareId = String(firmware.id);
													productFirmwareOpen = false;
													tick().then(() => {
														productFirmwareTriggerRef?.focus();
													});
												}}
												class="flex items-center justify-between group"
											>
												<div class="flex items-center gap-2 flex-1 min-w-0">
													<CheckIcon
														class={cn(
															'me-2 size-4 shrink-0',
															String(firmware.id) !== newProductFirmwareId && 'text-transparent'
														)}
													/>
													<span class="overflow-x-auto whitespace-nowrap scrollbar-hide"
														>{firmware.name}</span
													>
												</div>
												<Button
													variant="ghost"
													size="icon"
													class="h-6 w-6 shrink-0 ml-2 pointer-events-auto"
													disabled={loadingFirmwareId === firmware.id}
													onclick={async (e) => {
														e.preventDefault();
														e.stopPropagation();
														e.stopImmediatePropagation();
														loadingFirmwareId = firmware.id;
														try {
															const response = await fetch(`/api/firmware/${firmware.id}`);
															if (response.ok) {
																const data = await response.json();
																if (data.firmware) {
																	editingFirmwareId = firmware.id;
																	editingFirmwareRow = {
																		id: data.firmware.id,
																		name: data.firmware.name,
																		memo: data.firmware.memo,
																		firmwareFileName: data.firmware.firmwareFileName,
																		firmwareFileListId: data.firmware.firmwareFileListId,
																		docFileName: data.firmware.docFileName,
																		docFileListId: data.firmware.docFileListId
																	} as unknown as Schema;

																	newFirmwareName = data.firmware.name || '';
																	newFirmwareVersion = data.firmware.version || '';
																	newFirmwareMemo = data.firmware.memo || '';
																	existingFirmwareFileName = data.firmware.firmwareFileName || null;
																	existingFirmwareFileListId =
																		data.firmware.firmwareFileListId || null;
																	existingDocFileName = data.firmware.docFileName || null;
																	existingDocFileListId = data.firmware.docFileListId || null;
																	newFirmwareDocFile = null;
																	newFirmwareBinFile = null;

																	firmwareEditDialogOpen = true;
																	productFirmwareOpen = false;
																}
															} else {
																toast.error('펌웨어 데이터를 불러오는데 실패했습니다.');
															}
														} catch (error) {
															console.error('Failed to load firmware:', error);
															toast.error('펌웨어 데이터를 불러오는데 실패했습니다.');
														} finally {
															loadingFirmwareId = null;
														}
													}}
												>
													{#if loadingFirmwareId === firmware.id}
														<LoaderIcon class="h-3 w-3 animate-spin" />
													{:else}
														<DotsVerticalIcon class="h-4 w-4" />
													{/if}
													<span class="sr-only">Edit firmware</span>
												</Button>
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
					<input type="hidden" name="productFirmwareId" value={newProductFirmwareId} />
				</FieldContent>
			</Field>
		</div>
		<Field>
			<FieldLabel>설명/메모</FieldLabel>
			<FieldContent>
				<Textarea
					name="productMemo"
					placeholder="제품에 대한 설명을 입력하세요."
					class="resize-none"
					bind:value={newProductDescription}
				/>
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>단가</FieldLabel>
			<FieldContent>
				<Input name="productPrice" type="number" placeholder="0" bind:value={newProductPrice} />
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>입고/출고 기록</FieldLabel>
			<FieldContent>
				<Dialog.Root bind:open={openInventoryDialog}>
					<Dialog.Overlay class="z-[139]" />
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button
								variant="outline"
								class="w-full justify-between overflow-hidden min-w-0"
								{...props}
							>
								{`재고 ${productTotalQuantity}개`}
								<ChevronsUpDownIcon class="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content
						showCloseButton={false}
						class="sm:max-w-5xl h-[90vh] max-h-[90vh] flex flex-col p-0 z-[140]"
					>
						<Dialog.Header class="px-6 pt-6 pb-2">
							<div class="flex items-center justify-between">
								<Dialog.Title>입고/출고 기록 관리</Dialog.Title>
								<div class="flex items-center gap-2">
									{#if productInventory.some((item) => item.checked)}
										<Button
											variant="destructive"
											size="sm"
											type="button"
											onclick={(e) => {
												e.preventDefault();
												removeSelectedInventory();
											}}
											class="gap-2"
										>
											<TrashIcon class="size-4" />
											선택 삭제
										</Button>
									{/if}
									<Button size="sm" onclick={addInventoryRow} class="gap-2">
										<PlusIcon class="size-4" />
										추가
									</Button>
								</div>
							</div>
						</Dialog.Header>
						<div class="flex-1 overflow-y-auto px-6 py-2 min-h-0">
							<div class="border rounded-md overflow-hidden">
								{#if productInventory.length === 0}
									<Table.Root>
										<Table.Header class="bg-muted">
											<Table.Row>
												<Table.Head class="w-12"></Table.Head>
												<Table.Head class="w-12">
													<Checkbox checked={false} onCheckedChange={() => {}} />
												</Table.Head>
												<Table.Head>입고/출고</Table.Head>
												<Table.Head>내용</Table.Head>
												<Table.Head>날짜</Table.Head>
												<Table.Head>수량</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											<Table.Row>
												<Table.Cell colspan={6} class="text-center text-muted-foreground py-8">
													데이터가 없습니다.
												</Table.Cell>
											</Table.Row>
										</Table.Body>
									</Table.Root>
								{:else}
									<Table.Root>
										<Table.Header class="bg-muted">
											<Table.Row>
												<Table.Head class="w-12"></Table.Head>
												<Table.Head class="w-12">
													<Checkbox
														checked={productInventory.length > 0 &&
															productInventory.every((item) => item.checked)}
														onCheckedChange={(v) => {
															productInventory = productInventory.map((item) => ({
																...item,
																checked: !!v
															}));
														}}
													/>
												</Table.Head>
												<Table.Head>입고/출고</Table.Head>
												<Table.Head>내용</Table.Head>
												<Table.Head>날짜</Table.Head>
												<Table.Head>수량</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each productInventory as item, index (item.id)}
												<Table.Row>
													<Table.Cell class="w-12">
														<GripVerticalIcon class="h-4 w-4 text-muted-foreground" />
													</Table.Cell>
													<Table.Cell class="w-12">
														<Checkbox
															checked={item.checked}
															onCheckedChange={(v) => {
																productInventory = productInventory.map((inv) =>
																	inv.id === item.id ? { ...inv, checked: !!v } : inv
																);
															}}
														/>
													</Table.Cell>
													<Table.Cell>
														<Select.Root type="single" bind:value={item.type}>
															<Select.Trigger class="w-full">
																{item.type === 'in'
																	? '입고'
																	: item.type === 'out'
																		? '출고'
																		: '선택'}
															</Select.Trigger>
															<Select.Content>
																<Select.Item value="in">입고</Select.Item>
																<Select.Item value="out">출고</Select.Item>
															</Select.Content>
														</Select.Root>
													</Table.Cell>
													<Table.Cell>
														<Input
															placeholder="내용"
															bind:value={item.content}
															oninput={(e) => {
																productInventory = productInventory.map((inv) =>
																	inv.id === item.id
																		? { ...inv, content: e.currentTarget.value }
																		: inv
																);
															}}
														/>
													</Table.Cell>
													<Table.Cell>
														<Popover.Root>
															<Popover.Trigger>
																{#snippet child({ props })}
																	<Button
																		variant="outline"
																		{...props}
																		class="w-full justify-start text-left font-normal"
																		type="button"
																	>
																		<CalendarIcon class="mr-2 h-4 w-4" />
																		{item.date
																			? dateFormatter.format(item.date.toDate(getLocalTimeZone()))
																			: '날짜 선택'}
																	</Button>
																{/snippet}
															</Popover.Trigger>
															<Popover.Content class="w-auto p-0 z-[150]" align="start">
																<Calendar
																	type="single"
																	bind:value={item.date}
																	captionLayout="dropdown"
																/>
															</Popover.Content>
														</Popover.Root>
													</Table.Cell>
													<Table.Cell>
														<Input
															type="number"
															placeholder="수량"
															bind:value={item.quantity}
															oninput={(e) => {
																productInventory = productInventory.map((inv) =>
																	inv.id === item.id
																		? { ...inv, quantity: e.currentTarget.value }
																		: inv
																);
															}}
														/>
													</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								{/if}
							</div>
						</div>
						<div class="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
							<Dialog.Close>
								{#snippet child({ props })}
									<Button variant="outline" {...props}>취소</Button>
								{/snippet}
							</Dialog.Close>
							<Button onclick={() => (openInventoryDialog = false)}>저장</Button>
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>제품사진</FieldLabel>
			<FieldContent>
				<FileUploadField
					bind:newFile={newProductFile}
					bind:existingFileListId={existingProductFileListId}
					bind:existingFileName={existingProductFileName}
					inputId="product-file"
					inputName="productFile"
					scrollContainer={dialogScrollContainer}
					uploadLabel="파일 업로드"
					uploadHint="SVG, PNG, JPG 또는 GIF"
				/>
			</FieldContent>
		</Field>
	</div>
{/snippet}

<!-- 펌웨어 수정 Dialog -->
<Dialog.Root
	bind:open={firmwareEditDialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			// 다이얼로그 닫힘 애니메이션이 완료된 후 초기화 (약 300ms 지연)
			setTimeout(() => {
				resetFirmwareEditDialog();
			}, 300);
		}
	}}
>
	<Dialog.Overlay class="z-[139]" />
	<Dialog.Content class="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 z-[140]">
		<div class="px-6 pt-6">
			<Dialog.Header>
				<Dialog.Title>펌웨어 수정</Dialog.Title>
			</Dialog.Header>
		</div>

		<form
			method="POST"
			enctype="multipart/form-data"
			novalidate
			action="/firmware?/updateFirmware"
			use:enhance={({ formData, cancel }) => {
				if (newFirmwareBinFile || newFirmwareDocFile) {
					submittingFirmware = true;
				}

				if (!newFirmwareName || !newFirmwareName.trim()) {
					validationError = '펌웨어 이름을 입력하세요.';
					setTimeout(() => {
						validationError = null;
					}, 5000);
					cancel();
					submittingFirmware = false;
					return;
				}

				validationError = null;

				if (editingFirmwareRow) {
					formData.set('id', String(editingFirmwareRow.id));
				}

				if (editingFirmwareRow) {
					// @ts-expect-error
					const originalFirmwareFileListId = editingFirmwareRow.firmwareFileListId;
					// @ts-expect-error
					const originalDocFileListId = editingFirmwareRow.docFileListId;

					if (originalFirmwareFileListId && !existingFirmwareFileListId && !newFirmwareBinFile) {
						formData.set('removeFirmwareFile', 'true');
					}
					if (originalDocFileListId && !existingDocFileListId && !newFirmwareDocFile) {
						formData.set('removeDocFile', 'true');
					}
				}
				if (newFirmwareBinFile) {
					formData.set('firmwareBinFile', newFirmwareBinFile);
				}
				if (newFirmwareDocFile) {
					formData.set('firmwareDocFile', newFirmwareDocFile);
				}

				formData.set('firmwareName', newFirmwareName || '');
				formData.set('firmwareVersion', newFirmwareVersion || '');
				formData.set('firmwareMemo', newFirmwareMemo || '');

				return async ({ result, update }) => {
					submittingFirmware = false;

					if (result.type === 'success') {
						// Dialog를 먼저 닫고, onOpenChange에서 초기화가 일어나도록 함
						firmwareEditDialogOpen = false;
						await update({ reset: false });
						await invalidate('firmware:update');
						toast.success('펌웨어가 수정되었습니다.');
					} else if (result.type === 'failure') {
						const errorMessage = result.data?.message || '수정에 실패했습니다.';
						toast.error(errorMessage);
					}
				};
			}}
			class="flex-1 flex flex-col min-h-0"
		>
			<div bind:this={dialogScrollContainer} class="flex-1 overflow-y-auto px-6 py-4 min-h-0">
				{@render FirmwareForm()}
			</div>

			<div class="px-6 pb-6">
				<Dialog.Footer class="flex-row justify-end gap-2">
					<Button
						variant="outline"
						type="button"
						onclick={() => {
							firmwareEditDialogOpen = false;
						}}
					>
						취소
					</Button>
					<Button type="submit" disabled={submittingFirmware || !newFirmwareName?.trim()}>
						{#if submittingFirmware}
							<Spinner class="size-4" />
						{/if}
						수정
					</Button>
				</Dialog.Footer>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

{#snippet FirmwareForm()}
	<div class="space-y-4">
		<Field>
			<FieldLabel>이름</FieldLabel>
			<FieldContent>
				<Input name="firmwareName" placeholder="예: 펌웨어 v1.0" bind:value={newFirmwareName} />
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>메모</FieldLabel>
			<FieldContent>
				<Textarea
					name="firmwareMemo"
					placeholder="펌웨어 변경사항이나 메모를 입력하세요."
					class="resize-none"
					bind:value={newFirmwareMemo}
				/>
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>관련문서</FieldLabel>
			<FieldContent>
				<FileUploadField
					bind:newFile={newFirmwareDocFile}
					bind:existingFileListId={existingDocFileListId}
					bind:existingFileName={existingDocFileName}
					inputId="firmware-doc-file"
					inputName="firmwareDocFile"
					scrollContainer={dialogScrollContainer}
					uploadLabel="문서 업로드"
					uploadHint="PDF, DOCX 등"
				/>
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>펌웨어</FieldLabel>
			<FieldContent>
				<FileUploadField
					bind:newFile={newFirmwareBinFile}
					bind:existingFileListId={existingFirmwareFileListId}
					bind:existingFileName={existingFirmwareFileName}
					inputId="firmware-bin-file"
					inputName="firmwareBinFile"
					scrollContainer={dialogScrollContainer}
					uploadLabel="펌웨어 파일 업로드"
					uploadHint="BIN, HEX 등"
				/>
			</FieldContent>
		</Field>
	</div>
{/snippet}
