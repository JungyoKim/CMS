<script lang="ts">
	import ProductsTable from "$lib/components/products-table.svelte";

	export let data: {
		products: any[];
		totalCount: number;
		page: number;
		pageSize: number;
		firmwareList: Array<{ id: number; name: string }>;
	};
</script>

<ProductsTable data={data.products} totalCount={data.totalCount} currentPage={data.page} pageSize={data.pageSize} firmwareList={data.firmwareList} />