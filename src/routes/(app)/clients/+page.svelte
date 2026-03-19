<script lang="ts">
	import ClientsTable from "$lib/components/clients-table.svelte";

	export let data: {
		clients: any[];
		totalCount: number;
		page: number;
		pageSize: number;
	};
</script>

<ClientsTable data={data.clients} totalCount={data.totalCount} currentPage={data.page} pageSize={data.pageSize} />