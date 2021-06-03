'use strict';

const common = {
  modulePathIgnorePatterns: ['/npm'],
};

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/packages/outline/**/src/*.js',
    '<rootDir>/packages/outline-extensions/**/src/*.js',
    '<rootDir>/packages/outline-react/**/src/*.js',
  ],
  coverageReporters: ['json', 'text'],
  projects: [
    {
      ...common,
      displayName: 'unit',
      testMatch: ['**/__tests__/unit/**/*.test.js'],
      moduleNameMapper: {
        '^outline$': '<rootDir>/packages/outline/src/index.js',
        '^outline-extensions/(.+)':
          '<rootDir>/packages/outline-extensions/src/Outline$1.js',
        '^./dist/(.+)': './src/$1',
      },
      globals: {
        __DEV__: true,
      },
    },
    {
      ...common,
      displayName: 'e2e',
      testMatch: [
        '**/__tests__/e2e/**/*.js',
        '**/__tests__/regression/**/*.js',
      ],
    },
  ],
};
