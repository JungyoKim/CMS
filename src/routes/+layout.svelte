<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import { ModeWatcher, setMode } from 'mode-watcher';
	import { page } from '$app/stores';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		// [수정 1] window.innerWidth 대신 matchMedia 사용 (더 정확함)
		// 모바일 기기라고 판단되면 즉시 리턴
		const isMobile = window.matchMedia('(max-width: 768px)').matches;
		if (isMobile) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	const isAuthRoute = $derived($page.route.id?.startsWith('/(auth)') ?? false);

	onMount(() => {
		const keys = ['mode-watcher-mode', 'mode-watcher', 'theme', 'mode'];
		const hasSaved = keys.some((k) => localStorage.getItem(k) != null);
		if (!hasSaved) {
			setMode('light');
		}
	});
</script>

<svelte:head>
	<title>고객 관리 시스템</title>
</svelte:head>

<ModeWatcher defaultMode="light" />

{#if isAuthRoute}
	{@render children()}
{:else}
	<Sidebar.Provider
		style="--sidebar-width: calc(var(--spacing) * 56); --header-height: calc(var(--spacing) * 12);"
	>
		<AppSidebar variant="inset" class="md:[view-transition-name:sidebar]" />

		<Sidebar.Inset class="flex flex-col overflow-visible md:overflow-hidden">
			<SiteHeader class="md:[view-transition-name:header]" />

			<div class="flex flex-1 flex-col overflow-y-auto overflow-x-hidden min-h-0">
				{@render children()}
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}

<style>
	@media (max-width: 768px) {
		/* 모바일에서는 뷰 트랜지션 그룹 전체의 애니메이션을 끔 */
		:global(::view-transition-group(*)) {
			animation-duration: 0s !important;
		}
		:global(::view-transition-old(*)),
		:global(::view-transition-new(*)) {
			animation: none !important;
		}
	}
</style>
