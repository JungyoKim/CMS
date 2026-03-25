<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { open = $bindable(false) } = $props();

	let password = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let submitting = $state(false);
	let countdown = $state<number | null>(null);
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	// 다이얼로그가 닫힐 때 카운트다운 정리
	$effect(() => {
		if (!open && countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
			countdown = null;
			success = null;
		}
	});

</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[500px] z-[100]">
		{#snippet children()}
			<Dialog.Header>
				<Dialog.Title>비밀번호 변경</Dialog.Title>
			</Dialog.Header>
			<div class="space-y-6 py-4">
			<!-- 비밀번호 변경 -->
			<div class="space-y-4">
				<form
					method="POST"
					action="/settings?/changePassword"
					use:enhance={({ cancel }) => {
						// 클라이언트 측 검증: 현재 비밀번호와 새 비밀번호가 같은지 확인
						if (password === newPassword) {
							error = '현재 비밀번호와 새 비밀번호가 같습니다.';
							success = null;
							submitting = false;
							cancel();
							return;
						}
						
						submitting = true;
						error = null;
						success = null;
						return async ({ result }) => {
							submitting = false;
							if (result.type === 'success' && result.data && !(result.data as any).success) {
								error = ((result.data as any).message as string) || '비밀번호 변경에 실패했습니다.';
								success = null;
							} else if (result.type === 'success') {
								error = null;
								password = '';
								newPassword = '';
								confirmPassword = '';
								await invalidateAll();
								
								// 카운트다운 시작 (10초)
								countdown = 10;
								success = `비밀번호가 변경되었습니다. ${countdown}초 후 로그아웃됩니다.`;
								
								// 카운트다운 업데이트
								countdownInterval = setInterval(() => {
									if (countdown !== null && countdown > 0) {
										countdown--;
										success = `비밀번호가 변경되었습니다. ${countdown}초 후 로그아웃됩니다.`;
									} else if (countdown === 0) {
										success = '비밀번호가 변경되었습니다. 로그아웃 중...';
									}
								}, 1000);
								
								// 10초 후 로그아웃
								setTimeout(async () => {
									if (countdownInterval) {
										clearInterval(countdownInterval);
										countdownInterval = null;
									}
									try {
										const response = await fetch('/logout', {
											method: 'POST',
											credentials: 'include',
											redirect: 'manual'
										});
										window.location.href = '/login';
									} catch (error) {
										console.error('Logout failed:', error);
										window.location.href = '/login';
									}
								}, 10000);
							}
						};
					}}
				>
					<div class="space-y-3">
						<div class="space-y-2">
							<Label for="current-password">현재 비밀번호</Label>
							<Input
								id="current-password"
								name="currentPassword"
								type="password"
								placeholder="현재 비밀번호"
								required
								bind:value={password}
								disabled={submitting}
							/>
						</div>
						<div class="space-y-2">
							<Label for="new-password">새 비밀번호</Label>
							<Input
								id="new-password"
								name="newPassword"
								type="password"
								placeholder="새 비밀번호"
								required
								bind:value={newPassword}
								disabled={submitting}
							/>
						</div>
						<div class="space-y-2">
							<Label for="confirm-password">비밀번호 확인</Label>
							<Input
								id="confirm-password"
								name="confirmPassword"
								type="password"
								placeholder="비밀번호 확인"
								required
								bind:value={confirmPassword}
								disabled={submitting}
							/>
						</div>
						<Button type="submit" disabled={submitting} class="w-full">
							{submitting ? '변경 중...' : '비밀번호 변경'}
						</Button>
					</div>
				</form>
			</div>

			{#if error}
				<div class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			{/if}
			{#if success}
				<div class="rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
					{success}
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="outline">닫기</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Footer>
		{/snippet}
	</Dialog.Content>
</Dialog.Root>

