<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Button } from "$lib/components/ui/button";
	import { Label } from "$lib/components/ui/label";
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';

	let password = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);
</script>

<div class="flex h-screen w-full items-center justify-center bg-background p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl text-center">고객 관리 시스템</Card.Title>
		</Card.Header>
		<Card.Content class="grid gap-4">
			<form
				method="POST"
				use:enhance={({ formData }) => {
					submitting = true;
					error = null;
					return async ({ result, update }) => {
						submitting = false;
						if (result.type === 'failure') {
							error = (result.data?.error as string) || '로그인에 실패했습니다.';
							await update();
						} else if (result.type === 'redirect') {
							await goto(result.location);
						} else {
							await update();
						}
					};
				}}
			>
				<div class="grid gap-2">
					<Input
						id="password"
						name="password"
						type="password"
						placeholder="암호"
						required
						bind:value={password}
						disabled={submitting}
						class="w-full"
					/>
					{#if error}
						<p class="text-sm text-destructive" transition:fade={{ duration: 200 }}>
							{error}
						</p>
					{/if}
				</div>
				<Card.Footer class="pt-4 px-0">
					<Button type="submit" class="w-full" disabled={submitting}>
						{submitting ? '로그인 중...' : '로그인'}
					</Button>
				</Card.Footer>
			</form>
		</Card.Content>
	</Card.Root>
</div>