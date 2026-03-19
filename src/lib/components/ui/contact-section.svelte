<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { formatPhoneNumber, validatePhone, validateEmail } from '$lib/components/data-table/utils.js';

	interface Props {
		/** 섹션 라벨 */
		label: string;
		/** 이름 */
		name: string;
		/** 직급/직책 */
		position: string;
		/** 연락처 */
		phone: string;
		/** 이메일 */
		email: string;
		/** input name 접두사 (예: mainContact, subContact) */
		namePrefix: string;
		/** 상단에 Separator 표시 여부 */
		showSeparator?: boolean;
		/** 전화번호 에러 (양방향 바인딩) */
		phoneError?: string | null;
		/** 이메일 에러 (양방향 바인딩) */
		emailError?: string | null;
	}

	let {
		label,
		name = $bindable(''),
		position = $bindable(''),
		phone = $bindable(''),
		email = $bindable(''),
		namePrefix,
		showSeparator = true,
		phoneError = $bindable(null),
		emailError = $bindable(null)
	}: Props = $props();
</script>

{#if showSeparator}
	<Separator />
{/if}

<div class="space-y-3">
	<Label>{label}</Label>
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
		<Input name="{namePrefix}Name" placeholder="이름" bind:value={name} />
		<Input name="{namePrefix}Position" placeholder="직급/직책" bind:value={position} />
		<div class="flex flex-col gap-1">
			<Input
				name="{namePrefix}Phone"
				placeholder="연락처"
				bind:value={phone}
				aria-invalid={phoneError ? 'true' : 'false'}
				oninput={(e) => {
					const formatted = formatPhoneNumber(e.currentTarget.value);
					phone = formatted;
					if (phoneError) phoneError = null;
				}}
				onblur={() => {
					phoneError = validatePhone(phone) ? null : '올바른 전화번호 형식이 아닙니다.';
				}}
			/>
			{#if phoneError}
				<p class="text-xs text-destructive">{phoneError}</p>
			{/if}
		</div>
		<div class="flex flex-col gap-1">
			<Input
				name="{namePrefix}Email"
				type="email"
				placeholder="이메일"
				bind:value={email}
				aria-invalid={emailError ? 'true' : 'false'}
				onblur={() => {
					emailError = validateEmail(email) ? null : '올바른 이메일 형식이 아닙니다.';
				}}
			/>
			{#if emailError}
				<p class="text-xs text-destructive">{emailError}</p>
			{/if}
		</div>
	</div>
</div>
