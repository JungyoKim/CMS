<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import SunIcon from "@tabler/icons-svelte/icons/sun";
	import MoonIcon from "@tabler/icons-svelte/icons/moon";
	import { toggleMode } from "mode-watcher";
	import { page } from '$app/stores';
	import { cn } from "$lib/utils.js";

	let { class: className, ...restProps }: { class?: string; [key: string]: unknown } = $props();

	const pageNames: Record<string, string> = {
		'/': '홈',
		'/contracts': '계약 관리',
		'/as': 'AS 관리',
		'/clients': '고객사 관리',
		'/products': '제품 관리',
		'/firmware': '펌웨어 관리'
	};
</script>

<header
	class={cn("h-(--header-height) group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) flex shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear sticky top-0 z-50 bg-background md:static", className)}
	{...restProps}
>
	<div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
		<Sidebar.Trigger class="-ms-1" />
		<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
		<h1 class="text-base font-medium">{pageNames[$page.url.pathname] ?? 'Documents'}</h1>
		<div class="ms-auto flex items-center gap-2">
			<Button onclick={toggleMode} variant="ghost" size="icon">
				<SunIcon
					class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
				/>
				<MoonIcon
					class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>
		</div>
	</div>
</header>