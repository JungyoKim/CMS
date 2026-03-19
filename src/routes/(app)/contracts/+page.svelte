<script lang="ts">
	import ContractsTable from '$lib/components/contracts-table.svelte';

	let { data } = $props<{
		data: {
			contracts: any[];
			totalCount: number;
			page: number;
			pageSize: number;
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
	}>();
</script>

<ContractsTable
	data={data.contracts}
	totalCount={data.totalCount}
	currentPage={data.page}
	pageSize={data.pageSize}
	clientList={data.clientList}
	productList={data.productList}
	firmwareList={data.firmwareList}
/>
