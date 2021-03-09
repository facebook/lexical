'use strict';

const common = {
  modulePathIgnorePatterns: ['<rootDir>/packages/outline/npm'],
};

module.exports = {
  projects: [
    {
      ...common,
      testPathIgnorePatterns: ['/outline-playground/__tests__/'],
    },
  ],
};
