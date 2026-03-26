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
	import type { Schema, FirmwareEditData } from './schemas.js';
	import type { Attachment } from 'svelte/attachments';
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import { createSvelteTable } from '$lib/components/ui/data-table/data-table.svelte.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Field, FieldLabel, FieldContent } from '$lib/components/ui/field/index.js';
	import {
		FlexRender,
		renderComponent,
		renderSnippet
	} from '$lib/components/ui/data-table/index.js';
	import GripVerticalIcon from '@tabler/icons-svelte/icons/grip-vertical';
	import PlusIcon from '@tabler/icons-svelte/icons/plus';
	import ChevronsLeftIcon from '@tabler/icons-svelte/icons/chevrons-left';
	import ChevronLeftIcon from '@tabler/icons-svelte/icons/chevron-left';
	import ChevronRightIcon from '@tabler/icons-svelte/icons/chevron-right';
	import ChevronsRightIcon from '@tabler/icons-svelte/icons/chevrons-right';
	import DotsVerticalIcon from '@tabler/icons-svelte/icons/dots-vertical';
	import TrashIcon from '@tabler/icons-svelte/icons/trash';
	import FileTextIcon from '@tabler/icons-svelte/icons/file-text';
	import { toast } from 'svelte-sonner';
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
	import { cn } from '$lib/utils.js';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto, invalidate, invalidateAll } from '$app/navigation';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import AlertCircleTablerIcon from '@tabler/icons-svelte/icons/alert-circle';
	import {
		executeSearch as executeSearchUtil,
		executePagination as executePaginationUtil,
		getRedirectPageAfterChange,
		createPageRedirectUrl
	} from './data-table/utils.js';

	let {
		data,
		totalCount = 0,
		currentPage = 1,
		pageSize = 10
	}: {
		data: Schema[];
		totalCount?: number;
		currentPage?: number;
		pageSize?: number;
	} = $props();

	let pagination = $state<PaginationState>({ pageIndex: currentPage - 1, pageSize: pageSize });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let rowSelection = $state<RowSelectionState>({});
	let columnVisibility = $state<VisibilityState>({});
	let pageSizeSelectValue = $state<string>(String(pageSize));

	// currentPage prop이 변경되면(페이지 이동 시) 내부 상태도 업데이트
	$effect(() => {
		pagination.pageIndex = currentPage - 1;
	});

	// pageSizeSelectValue 변경 감지 및 페이지네이션 실행
	let previousPageSizeValue: string | undefined = $state(undefined);
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

	let dialogOpen = $state(false);
	let editingRow = $state<Schema | null>(null);
	let validationError = $state<string | null>(null);
	let dialogCloseTimeout: ReturnType<typeof setTimeout> | null = null;
	let dialogScrollContainer = $state<HTMLDivElement | null>(null);
	let firmwareEditDialogOpen = $state(false);
	let editingFirmwareId = $state<number | null>(null);
	let editingFirmwareRow = $state<FirmwareEditData | null>(null);
	let loadingFirmwareId = $state<number | null>(null);
	let submittingFirmware = $state(false);

	// 로컬 상태로 검색어와 필드 관리
	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let searchField = $state<string | undefined>($page.url.searchParams.get('field') || undefined);

	// 검색 실행 함수
	function executeSearch() {
		const newUrl = executeSearchUtil('firmware', searchQuery, searchField ?? null, $page.url);
		if (newUrl) {
			if (newUrl.searchParams.get('page') === '1') {
				pagination.pageIndex = 0;
			}
			goto(newUrl.toString(), { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	// 서버 사이드 검색 - 즉시 검색
	$effect(() => {
		executeSearch();
	});

	// 페이지 변경 실행 함수
	function executePagination() {
		const newUrl = executePaginationUtil(
			'firmware',
			pagination.pageIndex,
			pagination.pageSize,
			$page.url,
			pageSize
		);
		if (newUrl) {
			goto(newUrl.toString(), { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	let paginationTimeout: ReturnType<typeof setTimeout> | null = null;

	// Firmware Form States
	let newFirmwareName = $state('');
	let newFirmwareVersion = $state('');
	let newFirmwareMemo = $state('');
	let newFirmwareDocFile = $state<File | null>(null);
	let newFirmwareBinFile = $state<File | null>(null);
	let existingFirmwareFileName = $state<string | null>(null);
	let existingFirmwareFileListId = $state<string | null>(null);
	let existingDocFileName = $state<string | null>(null);
	let existingDocFileListId = $state<string | null>(null);

	// 검색 필드 기본값 설정
	$effect(() => {
		if (!searchField && searchableFields.length > 0) {
			searchField = searchableFields[0].id;
		}
	});

	// 검색 필드가 변경될 때, 고객상태나 AS상태가 아닌 경우 검색어 초기화
	$effect(() => {
		if (searchField && searchField !== 'customerStatus' && searchField !== 'asStatus') {
			// 고객상태나 AS상태 관련 검색어인지 확인
			const statusValues = ['active', 'terminated', 'pre-sales', '없음', '완료', '진행중'];
			if (statusValues.includes(searchQuery)) {
				searchQuery = '';
				executeSearch();
			}
		}
	});

	// Define columns
	const columns = $derived.by(() => {
		return [
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
				header: '이름',
				cell: ({ row }) => {
					return row.original.name || row.original.header || '-';
				}
			},
			{
				accessorKey: 'memo',
				header: '메모',
				cell: ({ row }) => {
					return row.original.memo || '-';
				}
			},
			{
				accessorKey: 'docFileName',
				header: '문서 파일',
				cell: ({ row }) => {
					const fileName = row.original.docFileName;
					const fileListId = row.original.docFileListId;

					if (!fileName || !fileListId) {
						return '-';
					}

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
			},
			{
				accessorKey: 'firmwareFileName',
				header: '펌웨어 파일',
				cell: ({ row }) => {
					const fileName = row.original.firmwareFileName;
					const fileListId = row.original.firmwareFileListId;

					if (!fileName || !fileListId) {
						return '-';
					}

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
		] as ColumnDef<Schema>[];
	});

	// 폼 초기화 함수
	function resetForm() {
		newFirmwareName = '';
		newFirmwareVersion = '';
		newFirmwareMemo = '';
		newFirmwareDocFile = null;
		newFirmwareBinFile = null;
		existingFirmwareFileName = null;
		existingFirmwareFileListId = null;
		existingDocFileName = null;
		existingDocFileListId = null;
		editingRow = null;
	}

	// 펌웨어 수정 다이얼로그 전용 리셋
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
		validationError = null;
	}

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
				columnFilters = Array.isArray(updater) ? updater : [...columnFilters, ...updater];
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
		},
		enableRowSelection: true,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),

		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues()
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

	// 총 페이지 수 계산
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
				action="?/deleteFirmware"
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
				in:slide={{ axis: 'y', duration: 300 }}
				out:slide={{ axis: 'y', duration: 300 }}
			>
				<Alert.Root variant="destructive" class="relative shadow-lg">
					<AlertCircleTablerIcon class="h-4 w-4" />
					<Alert.Title>입력 오류</Alert.Title>
					<Alert.Description>
						{validationError}
					</Alert.Description>
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
				if (!open) {
					resetForm();
					validationError = null;
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
					resetForm();
					editingRow = null;
					validationError = null;
					dialogOpen = true;
				}}
			>
				<PlusIcon />
				<span class="hidden lg:inline">펌웨어 추가</span>
				<span class="lg:hidden">추가</span>
			</Button>
		</Dialog.Root>
	</div>
</div>
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
			// 다이얼로그 닫힘 애니메이션이 완료된 후 초기화 (약 200ms 지연)
			if (dialogCloseTimeout) clearTimeout(dialogCloseTimeout);
			dialogCloseTimeout = setTimeout(() => {
				if (!dialogOpen) {
					resetForm();
					validationError = null;
				}
			}, 200);
		}
	}}
>
	<Dialog.Content class="sm:max-w-5xl max-h-[90vh] flex flex-col p-0">
		<div class="px-6 pt-6">
			<Dialog.Header>
				{#if editingRow}
					<Dialog.Title>펌웨어 수정</Dialog.Title>
				{:else}
					<Dialog.Title>새 펌웨어 추가</Dialog.Title>
				{/if}
			</Dialog.Header>
		</div>

		<form
			method="POST"
			enctype="multipart/form-data"
			novalidate
			action={editingRow ? '?/updateFirmware' : '?/createFirmware'}
			use:enhance={({ formData, cancel }) => {
				if (newFirmwareBinFile || newFirmwareDocFile) {
					submittingFirmware = true;
				}

				if (!newFirmwareName || !newFirmwareName.trim()) {
					validationError = '펌웨어 이름을 입력하세요.';
					setTimeout(() => {
						validationError = null;
					}, 5000);
					submittingFirmware = false;
					cancel();
					return;
				}

				validationError = null;

				if (editingRow) {
					formData.set('id', String(editingRow.id));
				}

				if (editingRow) {
					const originalFirmwareFileListId = editingRow.firmwareFileListId;
					const originalDocFileListId = editingRow.docFileListId;

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
						const wasEditing = editingRow !== null;

						// Dialog를 먼저 닫고, onOpenChange에서 초기화가 일어나도록 함
						// 변수 초기화는 onOpenChange의 setTimeout에서 처리되므로 여기서는 하지 않음
						validationError = null;
						dialogOpen = false;
						await update({ reset: false });
						await invalidateAll();
						toast.success(wasEditing ? '펌웨어가 수정되었습니다.' : '펌웨어가 추가되었습니다.');
					} else if (result.type === 'failure') {
						const wasEditing = editingRow !== null;
						const errorMessage =
							(result.data?.message as string) ||
							(wasEditing ? '수정에 실패했습니다.' : '추가에 실패했습니다.');
						toast.error(errorMessage);
						console.error('Form action failed:', result);
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
							resetForm();
							validationError = null;
							dialogOpen = false;
						}}
					>
						취소
					</Button>
					<Button type="submit" disabled={submittingFirmware || !newFirmwareName?.trim()}>
						{#if submittingFirmware}
							<Spinner class="size-4" />
						{/if}
						{#if editingRow}
							펌웨어 수정
						{:else}
							펌웨어 추가
						{/if}
					</Button>
				</Dialog.Footer>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- 펌웨어 수정 Dialog -->
<Dialog.Root
	bind:open={firmwareEditDialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			// Dialog 닫힘 애니메이션이 완료된 후 초기화 (약 200ms 지연)
			setTimeout(() => {
				resetFirmwareEditDialog();
			}, 200);
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
				if (!newFirmwareName || !newFirmwareName.trim()) {
					validationError = '펌웨어 이름을 입력하세요.';
					setTimeout(() => {
						validationError = null;
					}, 5000);
					cancel();
					return;
				}

				validationError = null;

				if (editingFirmwareRow) {
					formData.set('id', String(editingFirmwareRow.id));
				}

				if (editingFirmwareRow) {
					const originalFirmwareFileListId = editingFirmwareRow.firmwareFileListId;
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
					if (result.type === 'success') {
						// Dialog를 먼저 닫고, onOpenChange에서 초기화가 일어나도록 함
						firmwareEditDialogOpen = false;
						// 데이터 갱신
						await update({ reset: false });
						await invalidateAll();
						toast.success('펌웨어가 수정되었습니다.');
					} else if (result.type === 'failure') {
						const errorMessage = (result.data?.message as string) || '수정에 실패했습니다.';
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
							resetFirmwareEditDialog();
							validationError = null;
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

<div class="relative flex flex-col gap-4 px-4 lg:px-6 pb-4 pt-0 overflow-auto">
	<!-- 테이블 -->
	<div class="rounded-lg border flex flex-col overflow-hidden">
		<DragDropProvider
			modifiers={[
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
											class={header.column.id === 'amount' ||
											header.column.id === 'cost' ||
											header.column.id === 'price' ||
											header.column.id === 'totalQuantity'
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

	<!-- 페이지네이션 -->
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
						{#each [10, 25, 50, 100] as pageSizeOption (pageSizeOption)}
							<Select.Item value={pageSizeOption.toString()}>
								{pageSizeOption}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex items-center gap-2">
				<div class="flex w-fit items-center justify-center text-sm font-medium">
					{currentPageNum} / {Math.ceil(totalCount / pagination.pageSize) || 1} 페이지
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
						disabled={currentPageNum <= 1}
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
						disabled={currentPageNum <= 1}
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
						disabled={currentPageNum >= totalPages}
					>
						<span class="sr-only">다음 페이지로 이동</span>
						<ChevronRightIcon />
					</Button>
					<Button
						variant="outline"
						class="hidden size-8 lg:flex"
						size="icon"
						onclick={() => {
							pagination.pageIndex = totalPages - 1;
							if (paginationTimeout) {
								clearTimeout(paginationTimeout);
								paginationTimeout = null;
							}
							executePagination();
						}}
						disabled={currentPageNum >= totalPages}
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
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer hover:bg-muted/50"
		{@attach ref}
		onclick={(e) => {
			const target = e.target as HTMLElement;
			if (target.closest('[role="checkbox"]') || target.closest('button') || target.closest('a')) {
				return;
			}

			if (firmwareEditDialogOpen) {
				return;
			}
			e.stopPropagation();

			const firmwareId = row.original.id;
			if (firmwareId) {
				const firmwareIdNum = typeof firmwareId === 'number' ? firmwareId : Number(firmwareId);
				loadingFirmwareId = firmwareIdNum;
				fetch(`/api/firmware/${firmwareIdNum}`)
					.then((response) => {
						if (!response.ok) {
							return response.text().then((text) => {
								console.error('Failed to fetch firmware:', text);
								throw new Error(`HTTP ${response.status}: ${text}`);
							});
						}
						return response.json();
					})
					.then((data) => {
						if (data.firmware) {
							editingFirmwareId = firmwareIdNum;
							editingFirmwareRow = {
								id: data.firmware.id,
								name: data.firmware.name,
								memo: data.firmware.memo,
								firmwareFileName: data.firmware.firmwareFileName,
								firmwareFileListId: data.firmware.firmwareFileListId,
								docFileName: data.firmware.docFileName,
								docFileListId: data.firmware.docFileListId
							};

							newFirmwareName = data.firmware.name || '';
							newFirmwareVersion = data.firmware.version || '';
							newFirmwareMemo = data.firmware.memo || '';
							existingFirmwareFileName = data.firmware.firmwareFileName || null;
							existingFirmwareFileListId = data.firmware.firmwareFileListId || null;
							existingDocFileName = data.firmware.docFileName || null;
							existingDocFileListId = data.firmware.docFileListId || null;
							newFirmwareDocFile = null;
							newFirmwareBinFile = null;

							firmwareEditDialogOpen = true;
						} else {
							toast.error('펌웨어 데이터를 불러오는데 실패했습니다.');
						}
					})
					.catch((error) => {
						console.error('Failed to load firmware:', error);
						toast.error('펌웨어 데이터를 불러오는데 실패했습니다.');
					})
					.finally(() => {
						loadingFirmwareId = null;
					});
			}
		}}
	>
		{#each row.getVisibleCells() as cell (cell.id)}
			<Table.Cell
				class={cell.column.id === 'amount' ||
				cell.column.id === 'cost' ||
				cell.column.id === 'price' ||
				cell.column.id === 'totalQuantity'
					? 'text-end'
					: ''}
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
					uploadHint="PDF, DOCX 등"
				/>
			</FieldContent>
		</Field>
		<Field>
			<FieldLabel>펌웨어 파일</FieldLabel>
			<FieldContent>
				<FileUploadField
					bind:newFile={newFirmwareBinFile}
					bind:existingFileListId={existingFirmwareFileListId}
					bind:existingFileName={existingFirmwareFileName}
					inputId="firmware-bin-file"
					inputName="firmwareBinFile"
					scrollContainer={dialogScrollContainer}
					uploadHint="BIN, HEX 등"
				/>
			</FieldContent>
		</Field>
	</div>
{/snippet}
