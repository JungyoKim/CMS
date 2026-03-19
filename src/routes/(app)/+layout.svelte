<script lang="ts">
	import { onNavigate } from '$app/navigation';

	let { children } = $props();

	// View Transition API 적용
	onNavigate((navigation) => {
		// 브라우저가 이 API를 지원하지 않으면(예: 구형 브라우저) 그냥 즉시 이동
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve(); // 이 시점에 현재 화면 스냅샷을 찍음
				await navigation.complete; // 새 페이지 로딩이 끝날 때까지 대기
				// 로딩이 끝나면 브라우저가 자동으로 새 화면으로 부드럽게 전환(Cross-fade)
			});
		});
	});
</script>

<div class="flex flex-1 flex-col overflow-hidden min-h-0">
	<div class="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6 w-full min-w-0">
			{@render children()}
		</div>
	</div>
</div>