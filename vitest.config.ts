import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			provider: 'istanbul', // or 'v8' or 'custom',
			reporter: [ 'text', 'json', 'html', 'lcov' ],
		},
	},
});
