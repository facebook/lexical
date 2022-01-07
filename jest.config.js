'use strict';

const common = {
  modulePathIgnorePatterns: ['/npm'],
};

module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/packages/lexical/src/core/**/*.js',
    '<rootDir>/packages/lexical/src/extensions/**/*.js',
    '<rootDir>/packages/lexical-react/src/**/*.js',
  ],
  coverageReporters: ['json', 'text'],
  projects: [
    {
      ...common,
      displayName: 'unit',
      testMatch: ['**/__tests__/unit/**/*.test.js'],
      moduleNameMapper: {
        '^@lexical/core$': '<rootDir>/packages/lexical-core/src/index.js',
        '^@lexical/core/ParagraphNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalParagraphNode.js',
        '^@lexical/core/HeadingNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalHeadingNode.js',
        '^@lexical/core/ListNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalListNode.js',
        '^@lexical/core/ListItemNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalListItemNode.js',
        '^@lexical/core/TableNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalTableNode.js',
        '^@lexical/core/TableRowNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalTableRowNode.js',
        '^@lexical/core/TableCellNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalTableCellNode.js',
        '^@lexical/core/LinkNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalLinkNode.js',
        '^@lexical/core/QuoteNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalQuoteNode.js',
        '^@lexical/core/CodeNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalCodeNode.js',
        '^@lexical/core/HashtagNode$':
          '<rootDir>/packages/lexical-core/src/nodes/extended/LexicalHashtagNode.js',
        '^@lexical/react/useLexicalRichText$':
          '<rootDir>/packages/lexical-react/src/useLexicalRichText.js',
        '^@lexical/react/useLexicalCanShowPlaceholder$':
          '<rootDir>/packages/lexical-react/src/useLexicalCanShowPlaceholder.js',
        '^@lexical/react/withSubscriptions$':
          '<rootDir>/packages/lexical-react/src/withSubscriptions.js',
        '^@lexical/react/LexicalCollaborationPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalCollaborationPlugin.js',
        '^@lexical/react/LexicalPlainTextPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalPlainTextPlugin.js',
        '^@lexical/react/LexicalComposerContext$':
          '<rootDir>/packages/lexical-react/src/LexicalComposerContext.js',
        '^@lexical/react/LexicalComposerContentEditable$':
          '<rootDir>/packages/lexical-react/src/LexicalComposerContentEditable.js',
        '^@lexical/react/useLexicalEditor$':
          '<rootDir>/packages/lexical-react/src/useLexicalEditor.js',
        '^@lexical/react/useLexicalDecorators$':
          '<rootDir>/packages/lexical-react/src/useLexicalDecorators.js',
        '^@lexical/helpers/selection$':
          '<rootDir>/packages/lexical-helpers/src/LexicalSelectionHelpers.js',
        '^@lexical/helpers/text$':
          '<rootDir>/packages/lexical-helpers/src/LexicalTextHelpers.js',
        '^@lexical/helpers/nodes$':
          '<rootDir>/packages/lexical-helpers/src/LexicalNodeHelpers.js',
        '^@lexical/helpers/elements$':
          '<rootDir>/packages/lexical-helpers/src/LexicalElementHelpers.js',
        '^@lexical/helpers/events$':
          '<rootDir>/packages/lexical-helpers/src/LexicalEventHelpers.js',
        '^@lexical/helpers/file$':
          '<rootDir>/packages/lexical-helpers/src/LexicalFileHelpers.js',
        '^@lexical/helpers/offsets$':
          '<rootDir>/packages/lexical-helpers/src/LexicalOffsetHelpers.js',
        '^@lexical/helpers/root$':
          '<rootDir>/packages/lexical-helpers/src/LexicalRootHelpers.js',
        '^shared/getDOMTextNodeFromElement$':
          '<rootDir>/packages/shared/src/getDOMTextNodeFromElement.js',
        '^shared/isTokenOrInert$':
          '<rootDir>/packages/shared/src/isTokenOrInert.js',
        '^shared/invariant$': '<rootDir>/packages/shared/src/invariant.js',
        '^shared/environment$': '<rootDir>/packages/shared/src/environment.js',
        '^shared/getPossibleDecoratorNode$':
          '<rootDir>/packages/shared/src/getPossibleDecoratorNode.js',
        '^shared/useLayoutEffect$':
          '<rootDir>/packages/shared/src/useLayoutEffect.js',
        '^@lexical/yjs$': '<rootDir>/packages/lexical-yjs/src/index.js',
        '^./dist/(.+)': './src/$1',
        formatProdErrorMessage:
          '<rootDir>/scripts/error-codes/formatProdErrorMessage.js',
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
