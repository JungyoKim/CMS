<script lang="ts">
	import DashboardIcon from '@tabler/icons-svelte/icons/dashboard';
	import FileDescriptionIcon from '@tabler/icons-svelte/icons/file-description';
	import UsersIcon from '@tabler/icons-svelte/icons/users';
	import PackageIcon from '@tabler/icons-svelte/icons/package';
	import CpuIcon from '@tabler/icons-svelte/icons/cpu';
	import ToolsIcon from '@tabler/icons-svelte/icons/tools';
	import InnerShadowTopIcon from '@tabler/icons-svelte/icons/inner-shadow-top';
	import AppWindowIcon from '@tabler/icons-svelte/icons/app-window';
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import { page } from '$app/stores';
	import type { ComponentProps } from 'svelte';

	const data = {
		user: {
			name: '관리자',
			email: 'm@example.com',
			avatar: ''
		},
		navMain: [
			{
				title: '홈',
				url: '/',
				icon: DashboardIcon
			},
			{
				title: '계약 관리',
				url: '/contracts',
				icon: FileDescriptionIcon
			},
			{
				title: 'AS 관리',
				url: '/as',
				icon: ToolsIcon
			},
			{
				title: '고객사 관리',
				url: '/clients',
				icon: UsersIcon
			},
			{
				title: '제품 관리',
				url: '/products',
				icon: PackageIcon
			},
			{
				title: '펌웨어 관리',
				url: '/firmware',
				icon: CpuIcon
			}
		]
	};

	let { collapsible = 'icon', ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

	const sidebar = useSidebar();

	function handleHeaderLinkClick() {
		// 모바일에서 헤더 링크 클릭 시 사이드바 닫기
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}

	const isHomeActive = $derived($page.url.pathname === '/');
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="data-[slot=sidebar-menu-button]:!p-1.5">
					{#snippet child({ props })}
						<a href="/" {...props} onclick={handleHeaderLinkClick}>
							<AppWindowIcon class="!size-5" />
							<span class="text-base font-semibold">고객 관리 시스템</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
</Sidebar.Root>
