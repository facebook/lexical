'use strict';

const common = {
  modulePathIgnorePatterns: ['/npm'],
};

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/packages/outline/src/core/**/*.js',
    '<rootDir>/packages/outline/src/extensions/**/*.js',
    '<rootDir>/packages/outline-react/src/**/*.js',
  ],
  coverageReporters: ['json', 'text'],
  projects: [
    {
      ...common,
      displayName: 'unit',
      testMatch: ['**/__tests__/unit/**/*.test.js'],
      moduleNameMapper: {
        '^outline$': '<rootDir>/packages/outline/src/core/index.js',
        '^outline/ParagraphNode$':
          '<rootDir>/packages/outline/src/extensions/OutlineParagraphNode.js',
        '^outline/HeadingNode$':
          '<rootDir>/packages/outline/src/extensions/OutlineHeadingNode.js',
        '^outline/ListNode$':
          '<rootDir>/packages/outline/src/extensions/OutlineListNode.js',
        '^outline/ListItemNode$':
          '<rootDir>/packages/outline/src/extensions/OutlineListItemNode.js',
        '^outline/LinkNode$':
          '<rootDir>/packages/outline/src/extensions/OutlineLinkNode.js',
        '^outline/QuoteNode$':
          '<rootDir>/packages/outline/src/extensions/OutlineQuoteNode.js',
        '^outline/CodeNode$':
          '<rootDir>/packages/outline/src/extensions/OutlineCodeNode.js',
        '^outline/HashtagNode$':
          '<rootDir>/packages/outline/src/extensions/OutlineHashtagNode.js',
        '^outline-react/useOutlineRichText$':
          '<rootDir>/packages/outline-react/src/useOutlineRichText.js',
        '^outline/history$':
          '<rootDir>/packages/outline/src/helpers/OutlineHistoryHelpers.js',
        '^outline/selection$':
          '<rootDir>/packages/outline/src/helpers/OutlineSelectionHelpers.js',
        '^outline/text$':
          '<rootDir>/packages/outline/src/helpers/OutlineTextHelpers.js',
        '^outline/keys$':
          '<rootDir>/packages/outline/src/helpers/OutlineKeyHelpers.js',
        '^outline/nodes$':
          '<rootDir>/packages/outline/src/helpers/OutlineNodeHelpers.js',
        '^outline/events$':
          '<rootDir>/packages/outline/src/helpers/OutlineEventHelpers.js',
        '^outline/root$':
          '<rootDir>/packages/outline/src/helpers/OutlineRootHelpers.js',
        '^shared/getDOMTextNodeFromElement$':
          '<rootDir>/packages/shared/src/getDOMTextNodeFromElement.js',
        '^shared/isImmutableOrInert$':
          '<rootDir>/packages/shared/src/isImmutableOrInert.js',
        '^shared/invariant$': '<rootDir>/packages/shared/src/invariant.js',
        '^shared/environment$': '<rootDir>/packages/shared/src/environment.js',
        '^shared/getPossibleDecoratorNode$':
          '<rootDir>/packages/shared/src/getPossibleDecoratorNode.js',
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
