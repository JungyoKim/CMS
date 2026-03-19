import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// Body size limit 설정 (대용량 파일 업로드 지원)
			bodySizeLimit: process.env.BODY_SIZE_LIMIT === 'Infinity' ? Infinity : parseInt(process.env.BODY_SIZE_LIMIT || '524288')
		}),
		// CSRF 보호 설정: 기본적으로 SvelteKit은 프로덕션에서 CSRF 보호 활성화
		// trustedOrigins에 추가로 신뢰할 origin을 지정 (필요시)
		csrf: {
			trustedOrigins: []
		}
	}
};

export default config;
