'use strict';

const common = {
  modulePathIgnorePatterns: ['<rootDir>/packages/outline/npm'],
};

module.exports = {
  projects: [
    {
      ...common,
      displayName: 'e2e',
      testPathIgnorePatterns: ['/__tests__/(?!e2e/)'],
    },
    {
      ...common,
      displayName: 'unit',
      testPathIgnorePatterns: ['/__tests__/e2e/'],
    },
  ],
};
