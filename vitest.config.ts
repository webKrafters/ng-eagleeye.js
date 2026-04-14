import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
      codeCoverage: true,
      enabled: true,
			provider: 'istanbul', // or 'v8' or 'custom',
			reporter: [ 'text', 'lcov' ],
      reportsDirectory: './coverage',
    }
	}
});
