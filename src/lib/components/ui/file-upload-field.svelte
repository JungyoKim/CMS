<script lang="ts">
	import { tick } from 'svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FileIcon from '@tabler/icons-svelte/icons/file';
	import DownloadIcon from '@tabler/icons-svelte/icons/download';
	import XIcon from '@tabler/icons-svelte/icons/x';

	interface Props {
		/** 새로 선택된 파일 (양방향 바인딩) */
		newFile?: File | null;
		/** 기존 파일의 FILE_LIST_ID */
		existingFileListId?: string | null;
		/** 기존 파일명 */
		existingFileName?: string | null;
		/** input의 id (label 연결용) */
		inputId: string;
		/** 파일 제거 시 스크롤 유지를 위한 컨테이너 */
		scrollContainer?: HTMLElement | null;
		/** 업로드 안내 텍스트 */
		uploadLabel?: string;
		/** 업로드 서브텍스트 */
		uploadHint?: string;
		/** input의 name 속성 (form 제출용) */
		inputName?: string;
	}

	let {
		newFile = $bindable(null),
		existingFileListId = $bindable(null),
		existingFileName = $bindable(null),
		inputId,
		scrollContainer = null,
		uploadLabel = '파일 업로드',
		uploadHint = 'PDF, 이미지 등',
		inputName
	}: Props = $props();

	function handleChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			newFile = input.files[0];
		}
	}

	function downloadNewFile() {
		if (!newFile) return;
		const url = URL.createObjectURL(newFile);
		const a = document.createElement('a');
		a.href = url;
		a.download = newFile.name;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function removeNewFile() {
		const savedScroll = scrollContainer?.scrollTop ?? 0;
		newFile = null;
		await tick();
		if (scrollContainer) scrollContainer.scrollTop = savedScroll;
	}

	async function removeExistingFile() {
		const savedScroll = scrollContainer?.scrollTop ?? 0;
		existingFileName = null;
		existingFileListId = null;
		await tick();
		if (scrollContainer) scrollContainer.scrollTop = savedScroll;
	}
</script>

{#if newFile}
	<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
		<div class="flex items-center gap-2 truncate">
			<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
			<span class="text-sm truncate">{newFile.name}</span>
		</div>
		<div class="flex items-center gap-1">
			<Button variant="ghost" size="icon" class="h-8 w-8" onclick={downloadNewFile}>
				<DownloadIcon class="h-4 w-4" />
				<span class="sr-only">Download</span>
			</Button>
			<Button
				variant="ghost"
				size="icon"
				class="h-8 w-8 text-destructive hover:text-destructive"
				type="button"
				onclick={(e) => { e.preventDefault(); e.stopPropagation(); removeNewFile(); }}
			>
				<XIcon class="h-4 w-4" />
				<span class="sr-only">Remove</span>
			</Button>
		</div>
	</div>
{:else if existingFileListId && existingFileName}
	<div class="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
		<div class="flex items-center gap-2 truncate">
			<FileIcon class="h-4 w-4 text-muted-foreground shrink-0" />
			<a
				href="/api/files/{existingFileListId}"
				class="text-sm text-primary hover:underline overflow-x-auto whitespace-nowrap scrollbar-hide"
				download
			>
				{existingFileName}
			</a>
		</div>
		<div class="flex items-center gap-1">
			<Button
				variant="ghost"
				size="icon"
				class="h-8 w-8"
				onclick={() => window.open(`/api/files/${existingFileListId}`, '_blank')}
			>
				<DownloadIcon class="h-4 w-4" />
				<span class="sr-only">Download</span>
			</Button>
			<Button
				variant="ghost"
				size="icon"
				class="h-8 w-8 text-destructive hover:text-destructive"
				onclick={removeExistingFile}
			>
				<XIcon class="h-4 w-4" />
				<span class="sr-only">Remove</span>
			</Button>
		</div>
	</div>
{:else}
	<div class="flex items-center justify-center w-full">
		<label
			for={inputId}
			class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 border-muted-foreground/25"
		>
			<div class="flex flex-col items-center justify-center pt-5 pb-6">
				<FileIcon class="w-8 h-8 mb-2 text-muted-foreground" />
				<p class="text-sm text-muted-foreground">
					<span class="font-semibold">{uploadLabel}</span>
				</p>
				<p class="text-xs text-muted-foreground">{uploadHint}</p>
			</div>
			<input id={inputId} name={inputName} type="file" class="hidden" onchange={handleChange} />
		</label>
	</div>
{/if}
