import { describe, it, expect, vi } from 'vitest';
import { formatFileSize, getFileFromEvent } from './file-utils';

describe('formatFileSize', () => {
	it('0 바이트', () => {
		expect(formatFileSize(0)).toBe('0 B');
	});

	it('바이트 단위', () => {
		expect(formatFileSize(500)).toBe('500 B');
	});

	it('KB 단위', () => {
		expect(formatFileSize(1024)).toBe('1 KB');
		expect(formatFileSize(1536)).toBe('1.5 KB');
	});

	it('MB 단위', () => {
		expect(formatFileSize(1048576)).toBe('1 MB');
		expect(formatFileSize(1572864)).toBe('1.5 MB');
	});

	it('GB 단위', () => {
		expect(formatFileSize(1073741824)).toBe('1 GB');
	});
});

describe('getFileFromEvent', () => {
	it('파일이 있으면 File을 반환한다', () => {
		const file = new File(['content'], 'test.txt');
		const event = {
			target: { files: [file] }
		} as unknown as Event;

		expect(getFileFromEvent(event)).toBe(file);
	});

	it('파일이 없으면 null을 반환한다', () => {
		const event = {
			target: { files: [] }
		} as unknown as Event;

		expect(getFileFromEvent(event)).toBeNull();
	});

	it('files가 null이면 null을 반환한다', () => {
		const event = {
			target: { files: null }
		} as unknown as Event;

		expect(getFileFromEvent(event)).toBeNull();
	});
});
