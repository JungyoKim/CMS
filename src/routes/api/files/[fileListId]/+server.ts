import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { files } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * FILE_LIST_ID로 파일 다운로드
 * GET /api/files/[fileListId]
 */
export const GET: RequestHandler = async ({ params }) => {
	const fileListId = params.fileListId;

	if (!fileListId) {
		return json({ error: '파일 ID가 필요합니다.' }, { status: 400 });
	}

	try {
		// 데이터베이스에서 파일 정보 조회 (삭제되지 않은 파일만)
		const fileRow = await db
			.select({
				storedFilePath: files.storedFilePath,
				originalFileName: files.originalFileName,
				extension: files.extension
			})
			.from(files)
			.where(and(eq(files.fileListId, fileListId), isNull(files.deletedAt)))
			.limit(1)
			.then(rows => rows[0]);

		if (!fileRow || !fileRow.storedFilePath) {
			return json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
		}

		// 파일이 실제로 존재하는지 확인
		try {
			await fs.access(fileRow.storedFilePath);
		} catch {
			return json({ error: '파일이 존재하지 않습니다.' }, { status: 404 });
		}

		// 파일 읽기
		const fileBuffer = await fs.readFile(fileRow.storedFilePath);
		const originalFileName = fileRow.originalFileName || 'download';
		
		// 확장자 결정 (원본 파일명 또는 DB에 저장된 확장자)
		let extension = '';
		if (fileRow.extension) {
			extension = fileRow.extension.startsWith('.') ? fileRow.extension : `.${fileRow.extension}`;
		} else {
			extension = path.extname(originalFileName);
		}

		// Content-Type 결정
		const contentTypeMap: Record<string, string> = {
			'pdf': 'application/pdf',
			'doc': 'application/msword',
			'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'xls': 'application/vnd.ms-excel',
			'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'jpg': 'image/jpeg',
			'jpeg': 'image/jpeg',
			'png': 'image/png',
			'gif': 'image/gif',
			'txt': 'text/plain',
			'zip': 'application/zip',
			'bin': 'application/octet-stream'
		};

		const ext = extension.toLowerCase().replace('.', '');
		const contentType = contentTypeMap[ext] || 'application/octet-stream';

		// 파일 다운로드 응답
		return new Response(fileBuffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `attachment; filename="${encodeURIComponent(originalFileName)}"`,
				'Content-Length': fileBuffer.length.toString()
			}
		});
	} catch (error) {
		console.error('파일 다운로드 오류:', error);
		return json({ error: '파일 다운로드 중 오류가 발생했습니다.' }, { status: 500 });
	}
};








