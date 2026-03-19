<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/context.svelte.js";
	import { page } from "$app/stores";
	import type { Icon } from "@tabler/icons-svelte";

	let { items }: { items: { title: string; url: string; icon?: Icon }[] } = $props();
	
	const sidebar = useSidebar();
	
	function handleLinkClick() {
		// 모바일에서 링크 클릭 시 사이드바 닫기
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}
	
	function isActive(url: string): boolean {
		const currentPath = $page.url.pathname;
		// 정확히 일치하거나, 홈이 아닌 경우 경로가 시작하는지 확인
		if (url === '/') {
			return currentPath === '/';
		}
		return currentPath.startsWith(url);
	}
</script>

<Sidebar.Group>
	<Sidebar.GroupContent class="flex flex-col gap-2">
		<Sidebar.Menu>
			{#each items as item (item.title)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton tooltipContent={item.title} isActive={isActive(item.url)}>
						{#snippet child({ props })}
							<a href={item.url} {...props} onclick={handleLinkClick}>
						{#if item.icon}
							<item.icon />
						{/if}
						<span>{item.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.GroupContent>
</Sidebar.Group>