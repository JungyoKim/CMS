<script lang="ts">
	import AsTable from '$lib/components/as-table.svelte';

	let { data } = $props();
</script>

<AsTable
	data={data.asRecords}
	totalCount={data.totalCount}
	currentPage={data.page}
	pageSize={data.pageSize}
	contractList={data.contractList}
	clientList={data.clientList}
	productList={data.productList}
	firmwareList={data.firmwareList}
/>
