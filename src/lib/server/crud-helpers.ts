import { db } from '$lib/server/db';
import { sql, inArray } from 'drizzle-orm';
import { deleteFilesByListId, handleFileUpload } from '$lib/server/file-storage';
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core';

/**
 * 소프트 삭제를 수행한다.
 * 1. 삭제 대상의 파일 ID 조회
 * 2. 파일 물리 삭제
 * 3. deletedAt 타임스탬프 설정
 */
export async function softDeleteWithFiles<T extends SQLiteTable>(opts: {
	table: T;
	idColumn: SQLiteColumn;
	ids: number[];
	fileColumns: SQLiteColumn[];
}) {
	const { table, idColumn, ids, fileColumns } = opts;

	if (ids.length === 0) {
		return { success: false, message: '삭제할 항목을 선택하세요.' };
	}

	// 파일 ID 조회를 위한 select 객체 생성
	const selectObj: Record<string, SQLiteColumn> = {};
	for (const col of fileColumns) {
		selectObj[col.name] = col;
	}

	const rowsToDelete = await db
		.select(selectObj)
		.from(table)
		.where(sql`${idColumn} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)}) AND deleted_at IS NULL`);

	// 파일 삭제
	for (const row of rowsToDelete) {
		for (const col of fileColumns) {
			const fileListId = (row as Record<string, unknown>)[col.name];
			if (typeof fileListId === 'string') {
				await deleteFilesByListId(fileListId);
			}
		}
	}

	// Soft delete
	const deletedAt = new Date().toISOString();
	await db
		.update(table)
		.set({ deletedAt } as Record<string, unknown>)
		.where(inArray(idColumn, ids));

	return { success: true };
}

/**
 * 업데이트 시 파일 첨부를 처리한다.
 * 새 파일 업로드 + 기존 파일 제거 플래그를 한 번에 처리.
 */
export async function updateFileAttachment(opts: {
	formData: FormData;
	fieldName: string;
	removeFieldName: string;
	category: string;
	currentFileListId: string | null;
}): Promise<{ fileListId: string | null; error?: { success: false; message: string } }> {
	const { formData, fieldName, removeFieldName, category, currentFileListId } = opts;
	let fileListId = currentFileListId;

	// 새 파일 업로드
	const { fileListId: newFileListId, error: fileError } = await handleFileUpload(
		formData, fieldName, category, fileListId
	);
	if (fileError) return { fileListId, error: fileError };
	if (newFileListId) {
		fileListId = newFileListId;
	}

	// 파일 제거 플래그
	const removeFile = formData.get(removeFieldName) === 'true';
	if (removeFile && fileListId) {
		await deleteFilesByListId(fileListId);
		fileListId = null;
	}

	return { fileListId };
}

/**
 * 삭제 액션에서 FormData로부터 ID 목록을 추출한다.
 */
export function parseDeleteIds(formData: FormData): number[] {
	return formData.getAll('ids').map(id => Number(id));
}
