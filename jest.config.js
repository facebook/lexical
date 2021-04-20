'use strict';

const common = {
  modulePathIgnorePatterns: ['/npm'],
};

module.exports = {
  projects: [
    {
      ...common,
      displayName: 'unit',
      testMatch: ['**/__tests__/unit/**/*.js'],
    },
    {
      ...common,
      displayName: 'e2e',
      testMatch: [
        '**/__tests__/e2e/**/*.js',
        '**/__tests__/regression/**/*.js'
      ],
    },
  ],
};
