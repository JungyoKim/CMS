import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: '0.0.0.0', // 모든 네트워크 인터페이스에서 접근 가능
		port: 5173, // 기본 포트 (필요시 변경 가능)
		strictPort: false // 포트가 사용 중이면 다른 포트 자동 선택
	},
	test: {
		include: ['src/**/*.test.{js,ts}']
	}
});