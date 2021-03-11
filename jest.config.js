'use strict';

const common = {
  modulePathIgnorePatterns: [
    '<rootDir>/packages/outline/npm',
    '<rootDir>/packages/outline-react/npm',
    '<rootDir>/packages/outline-extensions/npm',
  ],
};

module.exports = {
  projects: [
    {
      ...common,
      displayName: 'unit',
      testPathIgnorePatterns: [
        '<rootDir>/packages/outline-playground/',
        '<rootDir>/packages/outline-react/src/__tests__/utils',
      ],
    },
    {
      ...common,
      displayName: 'e2e',
      testPathIgnorePatterns: [
        '<rootDir>/packages/outline/',
        '<rootDir>/packages/outline-react/',
        '<rootDir>/packages/outline-playground/__tests__/utils/',
      ],
    },
  ],
};
