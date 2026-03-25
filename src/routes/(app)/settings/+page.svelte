<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// 설정은 다이얼로그로 제공됩니다. 직접 접근 시 홈으로 이동합니다.
	onMount(() => {
		goto('/');
	});
</script>
