import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { files } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

type SaveFileParams = {
	file: File;
	/**
	 * 이미 존재하는 FILE_LIST_ID 에 파일을 추가할 때 사용.
	 * 없으면 새로 생성하여 반환.
	 */
	listId?: string;
	/**
	 * 파일 저장 하위 디렉터리 구분용 카테고리
	 * 예: 'products', 'firmware', 'contracts' 등
	 */
	category: string;
};

export async function saveFileToList({ file, listId, category }: SaveFileParams): Promise<string> {
	const fileListId = listId ?? randomUUID();

	// 연도/월 폴더 구조 생성 (YYYY/MM 형식)
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12 형식
	
	const uploadDir = path.join(UPLOAD_ROOT, category, String(year), month);
	await fs.mkdir(uploadDir, { recursive: true });

	const original = file.name;
	const extWithDot = path.extname(original);
	const ext = extWithDot.startsWith('.') ? extWithDot.slice(1) : extWithDot;

	const storedName = `${fileListId}-${Date.now()}${extWithDot}`;
	const fullPath = path.join(uploadDir, storedName);

	const buf = Buffer.from(await file.arrayBuffer());
	await fs.writeFile(fullPath, buf);

	try {
		await db.insert(files).values({
			fileListId: fileListId,
			title: null,
			originalFileName: original,
			storedFilePath: fullPath,
			extension: ext || null,
			fileSize: buf.length,
			deletedAt: null
		});
	} catch (err) {
		// DB 기록 실패 시 고아 파일 정리
		await fs.unlink(fullPath).catch(() => {});
		throw err;
	}

	return fileListId;
}

/**
 * FILE_LIST_ID로 연결된 파일들의 원본 파일명 목록을 조회 (삭제되지 않은 파일만)
 */
export async function getFileNamesByListId(fileListId: string | null): Promise<string[]> {
	if (!fileListId) return [];
	
	const fileRows = await db
		.select({ originalFileName: files.originalFileName })
		.from(files)
		.where(and(eq(files.fileListId, fileListId), isNull(files.deletedAt)));
	
	return fileRows
		.map(row => row.originalFileName)
		.filter((name): name is string => name !== null);
}

/**
 * FILE_LIST_ID로 연결된 파일 정보 조회 (파일명과 FILE_LIST_ID 반환, 삭제되지 않은 파일만)
 */
export async function getFileInfoByListId(fileListId: string | null): Promise<{ fileListId: string; fileName: string } | null> {
	if (!fileListId) return null;
	
	const fileRows = await db
		.select({ originalFileName: files.originalFileName })
		.from(files)
		.where(and(eq(files.fileListId, fileListId), isNull(files.deletedAt)));
	
	if (fileRows.length === 0) return null;
	
	const fileName = fileRows[0].originalFileName;
	if (!fileName) return null;
	
	return {
		fileListId,
		fileName
	};
}

/**
 * FILE_LIST_ID로 연결된 모든 파일을 Soft Deletion으로 삭제 (파일은 실제로 삭제하지 않음)
 */
/**
 * FormData에서 파일을 추출하여 저장하고 fileListId를 반환하는 헬퍼.
 * 파일이 없거나 비어있으면 null을 반환.
 * 저장 실패 시 { success: false, message } 를 반환.
 */
export async function handleFileUpload(
	formData: FormData,
	fieldName: string,
	category: string,
	existingListId?: string | null
): Promise<{ fileListId: string | null; error?: { success: false; message: string } }> {
	const file = formData.get(fieldName);

	if (!(file instanceof File) || file.size === 0) {
		return { fileListId: null };
	}

	// 기존 파일이 있으면 soft delete
	if (existingListId) {
		await deleteFilesByListId(existingListId);
	}

	try {
		const fileListId = await saveFileToList({ file, category });
		return { fileListId };
	} catch {
		return {
			fileListId: null,
			error: { success: false, message: '파일 저장에 실패했습니다.' }
		};
	}
}

export async function deleteFilesByListId(fileListId: string | null): Promise<void> {
	if (!fileListId) return;
	
	// FILE_LIST_ID로 연결된 모든 파일 조회 (삭제되지 않은 파일만)
	const fileRows = await db
		.select({
			fileId: files.fileId
		})
		.from(files)
		.where(and(eq(files.fileListId, fileListId), isNull(files.deletedAt)));
	
	if (fileRows.length === 0) {
		return;
	}
	
	// Soft Deletion: deletedAt을 현재 시간으로 설정 (파일은 실제로 삭제하지 않음)
	const deletedAt = new Date().toISOString();
	await db
		.update(files)
		.set({ deletedAt })
		.where(and(eq(files.fileListId, fileListId), isNull(files.deletedAt)));
}

