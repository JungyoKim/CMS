<script lang="ts">
	import FirmwareTable from "$lib/components/firmware-table.svelte";

	export let data: {
		firmware: any[];
		totalCount: number;
		page: number;
		pageSize: number;
	};
</script>

<FirmwareTable 
	data={data.firmware} 
	totalCount={data.totalCount} 
	currentPage={data.page} 
	pageSize={data.pageSize} 
/>
