import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
      codeCoverage: true,
      enabled: true,
			provider: 'v8', // or 'istanbul' or 'custom',
			reporter: [ 'text', 'lcov', 'json-summary' ]
    }
	}
});
