import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { clients, products, protocols, contracts, settings, passwords, rooms, repeaters, asRecords, installProducts } from '../src/lib/server/db/schema';
import fs from 'fs';

// If .env isn't loaded, let's just use local.db
const dbUrl = process.env.DATABASE_URL || 'local.db';

console.log(`Seeding database at ${dbUrl}...`);

const sqlite = new Database(dbUrl);
const db = drizzle(sqlite);

async function seed() {
	try {
		// 1. 설정 및 비밀번호
		await db.insert(settings).values([
			{ key: 'company_name', value: '예시 회사' },
			{ key: 'system_version', value: '1.0.0' }
		]).onConflictDoNothing();

		// 기본 비밀번호 (admin)
		const existingPw = await db.select().from(passwords).limit(1);
		if (existingPw.length === 0) {
			await db.insert(passwords).values([{ password: 'admin' }]);
		}

		// 2. 프로토콜
		const protocolData = [
			{ name: '예시 프로토콜 A', version: '1.0', memo: '기본 프로토콜' },
			{ name: '예시 프로토콜 B', version: '2.1', memo: '고급 버전 프로토콜' }
		];
		const insertedProtocols = await db.insert(protocols).values(protocolData).returning();

		// 3. 제품
		const productData = [
			{ name: '스마트 중계기 X1', code: 'PROD-001', price: 150000, protocolId: insertedProtocols[0].protocolId },
			{ name: '고급형 IoT 허브', code: 'PROD-002', price: 250000, protocolId: insertedProtocols[1].protocolId },
			{ name: '센서 모듈 S1', code: 'PROD-003', price: 50000, protocolId: insertedProtocols[0].protocolId }
		];
		const insertedProducts = await db.insert(products).values(productData).returning();

		// 4. 고객
		const clientData = [
			{
				businessNumber: '123-45-67890',
				name1: '서울호텔',
				address: '서울특별시 강남구 테헤란로 123',
				mainContactName: '홍길동',
				mainContactPhone: '010-1234-5678'
			},
			{
				businessNumber: '234-56-78901',
				name1: '제주리조트',
				address: '제주특별자치도 서귀포시 중문관광로 72',
				mainContactName: '이순신',
				mainContactPhone: '010-9876-5432'
			}
		];
		const insertedClients = await db.insert(clients).values(clientData).returning();

		// 5. 계약 및 관련 데이터
		for (const client of insertedClients) {
			const contract = await db.insert(contracts).values({
				clientId: client.clientId,
				name: `${client.name1} 시스템 구축 계약`,
				status: '진행중',
				contractDate: new Date().toISOString().split('T')[0],
				deposit: 5000000,
				managerName: client.mainContactName,
				managerPhone: client.mainContactPhone
			}).returning();

			const contractId = contract[0].contractId;

			// 설치 제품 추가
			await db.insert(installProducts).values([
				{ contractId, productId: insertedProducts[0].productId, quantity: 10 },
				{ contractId, productId: insertedProducts[2].productId, quantity: 50 }
			]);

			// 중계기 추가
			await db.insert(repeaters).values([
				{ contractId, repeaterCode: `R-${client.clientId}-01`, memo: '1층 로비' },
				{ contractId, repeaterCode: `R-${client.clientId}-02`, memo: '2층 복도' }
			]);

			// 객실 추가
			await db.insert(rooms).values([
				{ contractId, buildingName: '본관', roomNumber: '101호', roomCode: 'RM101' },
				{ contractId, buildingName: '본관', roomNumber: '102호', roomCode: 'RM102' }
			]);
			
			// AS 기록 예시
			await db.insert(asRecords).values([
				{ 
					contractId, 
					clientId: client.clientId, 
					requestDate: new Date().toISOString().substring(0, 10), 
					requestContent: '단말기 연결 불량',
					isCompleted: 0
				}
			]);
		}

		console.log('Successfully seeded database with example data!');
	} catch (error) {
		console.error('Failed to seed database:', error);
	} finally {
		sqlite.close();
	}
}

seed();
