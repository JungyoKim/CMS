import { tick } from 'svelte';

/**
 * File upload handler
 * @param event - Input change event
 * @returns The selected File or null
 */
export function getFileFromEvent(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
        return input.files[0];
    }
    return null;
}

/**
 * Download a File object by creating a temporary link
 * @param file - File to download
 */
export function downloadFile(file: File | null): void {
    if (!file) return;

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Remove file and preserve scroll position
 * @param scrollContainer - Container element to preserve scroll position
 * @param callback - Function to execute (should clear file states)
 */
export async function removeFileWithScrollPreserve(
    scrollContainer: HTMLElement | null,
    callback: () => void
): Promise<void> {
    const savedScrollTop = scrollContainer?.scrollTop ?? 0;

    callback();

    await tick();

    if (scrollContainer) {
        scrollContainer.scrollTop = savedScrollTop;
    }
}

/**
 * Format file size to human readable string
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
