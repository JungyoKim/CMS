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
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { slide } from 'svelte/transition';
	import { Label } from '$lib/components/ui/label/index.js';
	import ContactSection from '$lib/components/ui/contact-section.svelte';
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
	import TrashIcon from '@tabler/icons-svelte/icons/trash';
	import ChevronsLeftIcon from '@tabler/icons-svelte/icons/chevrons-left';
	import ChevronLeftIcon from '@tabler/icons-svelte/icons/chevron-left';
	import ChevronRightIcon from '@tabler/icons-svelte/icons/chevron-right';
	import ChevronsRightIcon from '@tabler/icons-svelte/icons/chevrons-right';
	import DotsVerticalIcon from '@tabler/icons-svelte/icons/dots-vertical';
	import { toast } from 'svelte-sonner';
	import DataTableCheckbox from './data-table-checkbox.svelte';
	import { createRawSnippet } from 'svelte';
	import { DragDropProvider } from '@dnd-kit-svelte/svelte';
	import { move } from '@dnd-kit/helpers';
	import { useSortable } from '@dnd-kit-svelte/svelte/sortable';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import SearchIcon from '@tabler/icons-svelte/icons/search';
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
		formatPhoneNumber,
		validateEmail,
		validatePhone,
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

	$effect(() => {
		pagination.pageIndex = currentPage - 1;
	});

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
	let clientEditDialogOpen = $state(false);
	let editingClientId = $state<number | null>(null);
	let editingClientRow = $state<Schema | null>(null);
	let submittingClient = $state(false);

	let searchQuery = $state($page.url.searchParams.get('search') || '');
	let searchField = $state<string | undefined>($page.url.searchParams.get('field') || undefined);

	function executeSearch() {
		const newUrl = executeSearchUtil('clients', searchQuery, searchField ?? null, $page.url);
		if (newUrl) {
			if (newUrl.searchParams.get('page') === '1') {
				pagination.pageIndex = 0;
			}
			goto(newUrl.toString(), { replaceState: true, noScroll: true, keepFocus: true });
		}
	}

	$effect(() => {
		executeSearch();
	});

	function executePagination() {
		const newUrl = executePaginationUtil(
			'clients',
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

	// Client Form States
	let newCustomerName = $state('');
	let newCustomerSource = $state('');
	let newCustomerItem3 = $state('');
	let newCustomerItem4 = $state('');
	let newCustomerItem5 = $state('');
	let newCustomerZipCode = $state('');
	let newCustomerAddress = $state('');
	let newCustomerFax = $state('');
	let newCustomerBusinessNumber = $state('');

	// Primary Contact
	let newCustomerMainContactName = $state('');
	let newCustomerMainContactPosition = $state('');
	let newCustomerMainContactPhone = $state('');
	let newCustomerMainContactEmail = $state('');

	// Secondary Contact
	let newCustomerSubContactName = $state('');
	let newCustomerSubContactPosition = $state('');
	let newCustomerSubContactPhone = $state('');
	let newCustomerSubContactEmail = $state('');

	// Business License
	let newCustomerBizLicenseFile = $state<File | null>(null);
	let existingCustomerRegistrationFileName = $state<string | null>(null);
	let existingCustomerRegistrationFileListId = $state<string | null>(null);

	// 고객사 수정 폼 에러 상태
	let mainContactPhoneError = $state<string | null>(null);
	let mainContactEmailError = $state<string | null>(null);
	let subContactPhoneError = $state<string | null>(null);
	let subContactEmailError = $state<string | null>(null);
	let faxError = $state<string | null>(null);

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
				accessorKey: 'customerName',
				header: '고객명',
				cell: ({ row }) => {
					return row.original.customerName || row.original.header || '-';
				}
			},
			{
				accessorKey: 'businessNumber',
				header: '사업자번호',
				cell: ({ row }) => {
					return row.original.businessNumber || '-';
				}
			},
			{
				accessorKey: 'phone',
				header: '연락처',
				cell: ({ row }) => {
					return row.original.phone || '-';
				}
			},
			{
				accessorKey: 'email',
				header: '이메일',
				cell: ({ row }) => {
					return row.original.email || '-';
				}
			},
			{
				accessorKey: 'address',
				header: '주소',
				cell: ({ row }) => {
					return row.original.address || '-';
				}
			},
			{
				accessorKey: 'registrationFileName',
				header: '등록증 파일',
				cell: ({ row }) => {
					const fileName = row.original.registrationFileName;
					const fileListId = row.original.registrationFileListId;

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

	function resetForm() {
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
		editingRow = null;
		mainContactPhoneError = null;
		mainContactEmailError = null;
		subContactPhoneError = null;
		subContactEmailError = null;
		faxError = null;
	}

	// editingRow 내용을 폼 상태로 복사
	function loadEditingRowIntoForm() {
		if (!editingRow) return;

		newCustomerName = editingRow.name1 || '';
		newCustomerSource = editingRow.name2 || '';
		newCustomerItem3 = editingRow.name3 || '';
		newCustomerItem4 = editingRow.name4 || '';
		newCustomerItem5 = editingRow.name5 || '';
		newCustomerBusinessNumber = editingRow.businessNumber || '';
		newCustomerZipCode = editingRow.zipCode || '';
		newCustomerAddress = editingRow.address || '';
		newCustomerFax = editingRow.fax || '';
		newCustomerMainContactName = editingRow.mainContactName || '';
		newCustomerMainContactPosition = editingRow.mainContactPosition || '';
		newCustomerMainContactPhone = editingRow.mainContactPhone || '';
		newCustomerMainContactEmail = editingRow.mainContactEmail || '';
		newCustomerSubContactName = editingRow.subContactName || '';
		newCustomerSubContactPosition = editingRow.subContactPosition || '';
		newCustomerSubContactPhone = editingRow.subContactPhone || '';
		newCustomerSubContactEmail = editingRow.subContactEmail || '';
		existingCustomerRegistrationFileName = editingRow.registrationFileName || null;
		existingCustomerRegistrationFileListId = editingRow.registrationFileListId || null;
		newCustomerBizLicenseFile = null;
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

	// 검색 필드 기본값 설정
	$effect(() => {
		if (!searchField && searchableFields.length > 0) {
			searchField = searchableFields[0].id;
		}
	});
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
				action="?/deleteClients"
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
							toast.success('고객사가 삭제되었습니다.');
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
				onclick={(e) => {
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
				<span class="hidden lg:inline">고객사 추가</span>
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
			// 다이얼로그 닫힘 애니메이션이 완료된 후 초기화 (약 500ms 지연)
			if (dialogCloseTimeout) clearTimeout(dialogCloseTimeout);
			dialogCloseTimeout = setTimeout(() => {
				if (!dialogOpen) {
					resetForm();
					validationError = null;
				}
			}, 500);
		}
	}}
>
	<Dialog.Content class="sm:max-w-5xl max-h-[90vh] flex flex-col p-0">
		<div class="px-6 pt-6">
			<Dialog.Header>
				{#if editingRow}
					<Dialog.Title>고객사 수정</Dialog.Title>
				{:else}
					<Dialog.Title>새 고객사 추가</Dialog.Title>
				{/if}
			</Dialog.Header>
		</div>

		<form
			method="POST"
			enctype="multipart/form-data"
			novalidate
			action={editingRow ? '?/updateClient' : '?/createClient'}
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

				// 전화번호 및 이메일 검증
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

				if (editingRow) {
					formData.set('id', String(editingRow.id));
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

				if (editingRow) {
					const originalFileListId = editingRow.registrationFileListId;
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
						const wasEditing = editingRow !== null;

						// 다이얼로그 닫기 (이것이 onOpenChange를 트리거함)
						dialogOpen = false;

						// 데이터 갱신 (reset: false로 폼 자동 리셋 방지)
						await update({ reset: false });
						await invalidateAll();
						toast.success(wasEditing ? '고객사가 수정되었습니다.' : '고객사가 추가되었습니다.');

						// resetForm()은 onOpenChange에서 setTimeout으로 처리됨
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
				{@render ClientForm()}
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
					<Button type="submit" disabled={submittingClient || !newCustomerName?.trim()}>
						{#if submittingClient}
							<Spinner class="size-4" />
						{/if}
						{#if editingRow}
							고객사 수정
						{:else}
							고객사 추가
						{/if}
					</Button>
				</Dialog.Footer>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- 고객사 수정 Dialog -->
<Dialog.Root
	bind:open={clientEditDialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			// 다이얼로그 닫힘 애니메이션이 완료된 후 초기화 (약 500ms 지연)
			setTimeout(() => {
				resetForm();
				editingClientRow = null;
				editingClientId = null;
			}, 500);
		}
	}}
>
	<Dialog.Content class="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 z-[150]">
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

				validationError = null;

				if (editingClientRow) {
					formData.set('id', String(editingClientRow.id));
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
						// 다이얼로그 닫기 (이것이 onOpenChange를 트리거함)
						clientEditDialogOpen = false;

						// 데이터 갱신 (reset: false로 폼 자동 리셋 방지)
						await update({ reset: false });
						await invalidate('clients:update');

						toast.success('고객사가 수정되었습니다.');

						// resetForm()은 onOpenChange에서 setTimeout으로 처리됨
					} else if (result.type === 'failure') {
						submittingClient = false;
						const wasEditing = editingClientRow !== null;
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
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer hover:bg-muted/50"
		{@attach ref}
		onclick={(e) => {
			const target = e.target as HTMLElement;
			if (target.closest('[role="checkbox"]') || target.closest('button') || target.closest('a')) {
				return;
			}

			if (clientEditDialogOpen) {
				return;
			}
			e.stopPropagation();

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
					scrollContainer={dialogScrollContainer}
				/>
			</FieldContent>
		</Field>
	</div>
{/snippet}
