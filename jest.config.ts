import type { Config } from 'jest';

const config: Config = {
	coveragePathIgnorePatterns: [
		"<rootDir>/node_modules",
		"<rootDir>/projects/npm-pkg/src/lib/test-artifacts/"
	],
	moduleNameMapper: {
		'^src/(.*)$': '<rootDir>/src/$1',
	},
	preset: 'jest-preset-angular',
	setupFilesAfterEnv: [ '<rootDir>/setup-jest.ts' ],
	transform: {
		'^.+\\.(ts|mjs|js|html)$': [
			'jest-preset-angular', {
				tsconfig: '<rootDir>/projects/npm-pkg/tsconfig.spec.json',
				stringifyContentPathRegex: '\\.(html|svg)$',
				useESM: true, // Required for Angular 21 ESM support
			}
		]
	}
};

export default config;
