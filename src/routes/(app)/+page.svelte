<script lang="ts">
	import PreSalesTable from "$lib/components/pre-sales-table.svelte";
	import IncompleteASTable from "$lib/components/incomplete-as-table.svelte";
	import CompletedASTable from "$lib/components/completed-as-table.svelte";

	export let data: {
		preSalesData: any[];
		incompleteASData: any[];
		completedASData: any[];
		clientList: Array<{
			id: number;
			name: string;
			name1: string | null;
			name2: string | null;
			name3: string | null;
			name4: string | null;
			name5: string | null;
			mainContactName: string | null;
			mainContactPosition: string | null;
			mainContactPhone: string | null;
			mainContactEmail: string | null;
			subContactName: string | null;
			subContactPosition: string | null;
			subContactPhone: string | null;
			subContactEmail: string | null;
			address: string | null;
		}>;
		productList: Array<{
			id: number;
			name: string;
		}>;
		firmwareList: Array<{
			id: number;
			name: string;
		}>;
	};


</script>

<div class="flex flex-col md:h-[calc(100vh-var(--header-height)-theme(spacing.16))] px-4 lg:px-6">
	<div class="flex flex-col md:h-full gap-4">
		<div class="flex flex-col gap-2 md:flex-1 md:min-h-0">
			<h2 class="text-lg shrink-0">사전영업중 고객</h2>
			<div class="md:flex-1 md:min-h-0">
				<PreSalesTable data={data.preSalesData as any} clientList={data.clientList} productList={data.productList} firmwareList={data.firmwareList} />
			</div>
		</div>
		<div class="flex flex-col gap-2 md:flex-1 md:min-h-0">
			<h2 class="text-lg shrink-0">AS미완료</h2>
			<div class="md:flex-1 md:min-h-0">
				<IncompleteASTable data={data.incompleteASData as any} clientList={data.clientList} productList={data.productList} firmwareList={data.firmwareList} />
			</div>
		</div>
		<div class="flex flex-col gap-2 md:flex-1 md:min-h-0">
			<h2 class="text-lg shrink-0">최근 AS완료 고객</h2>
			<div class="md:flex-1 md:min-h-0">
				<CompletedASTable data={data.completedASData as any} clientList={data.clientList} productList={data.productList} firmwareList={data.firmwareList} />
			</div>
		</div>
	</div>
</div>
