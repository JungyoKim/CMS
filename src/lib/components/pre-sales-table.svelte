<script lang="ts">
	import {
		getCoreRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		type ColumnDef,
		type PaginationState,
		type Row,
		type SortingState
	} from '@tanstack/table-core';
	import type { Schema, ContractData } from './schemas.js';
	import type { Attachment } from 'svelte/attachments';
	import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers';
	import { createSvelteTable } from '$lib/components/ui/data-table/data-table.svelte.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { FlexRender, renderSnippet } from '$lib/components/ui/data-table/index.js';
	import GripVerticalIcon from '@tabler/icons-svelte/icons/grip-vertical';
	import { Button } from '$lib/components/ui/button/index.js';
	import { DragDropProvider } from '@dnd-kit-svelte/svelte';
	import { move } from '@dnd-kit/helpers';
	import { useSortable } from '@dnd-kit-svelte/svelte/sortable';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils.js';
	import HomeContractDialogComponent from './home-contract-dialog.svelte';

	let {
		data = $bindable([]),
		pagination = $bindable({ pageIndex: 0, pageSize: 10 }),
		sorting = $bindable([{ id: 'contractDate', desc: true }]),
		clientList = [],
		productList = [],
		firmwareList = []
	}: {
		data: Schema[];
		pagination?: PaginationState;
		sorting?: SortingState;
		clientList?: any[];
		productList?: any[];
		firmwareList?: any[];
	} = $props();

	// --- Dialog State ---
	let homeContractDialogOpen = $state(false);
	let homeContractEditingRow = $state<ContractData | null>(null);

	// Define columns
	const columns = $derived.by(() => {
		return [
			{
				id: 'drag',
				header: () => null,
				cell: () => renderSnippet(DragHandle)
			},
			{
				accessorKey: 'customerName',
				header: '고객명',
				cell: ({ row }) => {
					return row.original.customerName || '-';
				}
			},
			{
				accessorKey: 'orderer',
				header: '발주사',
				cell: ({ row }) => {
					return row.original.orderer || '-';
				}
			},
			{
				accessorKey: 'name',
				header: '계약명',
				cell: ({ row }) => {
					return row.original.name || '-';
				}
			},
			{
				accessorKey: 'amount',
				header: '총계약금액',
				cell: ({ row }) => {
					const amount = row.original.amount || row.original.price || 0;
					return amount ? new Intl.NumberFormat('ko-KR').format(Number(amount)) + '원' : '-';
				}
			},
			{
				accessorKey: 'address',
				header: '주소',
				cell: ({ row }) => {
					return row.original.address || '-';
				}
			}
		] as ColumnDef<Schema>[];
	});

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
			}
		},
		getRowId: (row) => row.id.toString(),
		enableRowSelection: false,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
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
		}
	});
</script>

{#snippet DragHandle({ attach }: { attach: Attachment })}
	<Button
		{@attach attach}
		variant="ghost"
		size="icon"
		class="text-muted-foreground size-7 hover:bg-transparent"
		onclick={(e) => e.stopPropagation()}
		onmousedown={(e) => e.stopPropagation()}
	>
		<GripVerticalIcon class="text-muted-foreground size-3" />
		<span class="sr-only">Drag to reorder</span>
	</Button>
{/snippet}

{#snippet DraggableRow({ row, index }: { row: Row<Schema>; index: number })}
	{@const { ref, isDragging, handleRef } = useSortable({
		id: row.original.id,
		index: () => index
	})}

	<Table.Row
		data-state={row.getIsSelected() && 'selected'}
		data-dragging={isDragging.current}
		class="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer hover:bg-muted/50"
		{@attach ref}
		onclick={async (e) => {
			// 체크박스나 버튼 클릭 시에는 dialog를 열지 않음
			const target = e.target as HTMLElement;
			if (target.closest('[role="checkbox"]') || target.closest('button') || target.closest('a')) {
				return;
			}
			e.stopPropagation();

			// 이미 홈 화면용 dialog가 열려있으면 다시 열지 않음
			if (homeContractDialogOpen) {
				return;
			}

			let contractId = row.original.contractId;
			if (!contractId) {
				contractId = row.original.id;
			}

			if (contractId) {
				try {
					const response = await fetch(`/api/contracts/${contractId}`);
					if (response.ok) {
						const contractData = await response.json();
						homeContractEditingRow = contractData as ContractData;
						homeContractDialogOpen = true;
					} else {
						toast.error('계약 데이터를 불러올 수 없습니다.');
					}
				} catch (error) {
					console.error('[Home Table Click] Error fetching contract data:', error);
					toast.error('계약 데이터를 불러오는 중 오류가 발생했습니다.');
				}
			} else {
				toast.error('계약 ID를 찾을 수 없습니다.');
			}
		}}
	>
		{#each row.getVisibleCells() as cell (cell.id)}
			<Table.Cell class={cell.column.id === 'amount' ? 'text-end' : ''}>
				<FlexRender
					attach={cell.column.id === 'drag' ? handleRef : undefined}
					content={cell.column.columnDef.cell}
					context={cell.getContext()}
				/>
			</Table.Cell>
		{/each}
	</Table.Row>
{/snippet}

<div class="rounded-lg border flex flex-col md:h-full md:min-h-0 overflow-hidden">
	<DragDropProvider
		modifiers={[
			RestrictToVerticalAxis
		]}
		onDragEnd={(e) => (data = move(data, e))}
	>
		<div class="flex flex-col md:h-full md:min-h-0 overflow-hidden">
			<div class="md:flex-1 md:min-h-0 relative">
				<!-- 헤더 우측 스크롤바 덮개 (UI 개선) -->
				<div
					class="absolute top-0 right-0 w-[20px] h-[41px] bg-muted border-b z-20 pointer-events-none hidden md:block"
				></div>
				<div class="h-full overflow-auto [&>[data-slot=table-container]]:h-full">
					<Table.Root>
						<Table.Header class="bg-muted sticky top-0 z-10">
							{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
								<Table.Row>
									{#each headerGroup.headers as header (header.id)}
										<Table.Head
											colspan={header.colSpan}
											class={header.column.id === 'amount' ? 'text-end' : ''}
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
								<Table.Row class="hover:[&,&>svelte-css-wrapper]:[&>th,td]:!bg-transparent">
									<Table.Cell
										colspan={columns.length}
										class="text-center py-8 hover:!bg-transparent"
									>
										<span class="text-muted-foreground text-sm">결과가 없습니다.</span>
									</Table.Cell>
								</Table.Row>
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		</div>
	</DragDropProvider>
</div>

<HomeContractDialogComponent
	bind:open={homeContractDialogOpen}
	contract={homeContractEditingRow}
	{clientList}
	{productList}
	{firmwareList}
	updateAction="/contracts?/updateContract"
	createAction="/contracts?/createContract"
/>
