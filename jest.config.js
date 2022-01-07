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
        '^lexical$': '<rootDir>/packages/lexical/src/core/index.js',
        '^lexical/ParagraphNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalParagraphNode.js',
        '^lexical/HeadingNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalHeadingNode.js',
        '^lexical/ListNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalListNode.js',
        '^lexical/ListItemNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalListItemNode.js',
        '^lexical/TableNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalTableNode.js',
        '^lexical/TableRowNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalTableRowNode.js',
        '^lexical/TableCellNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalTableCellNode.js',
        '^lexical/LinkNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalLinkNode.js',
        '^lexical/QuoteNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalQuoteNode.js',
        '^lexical/CodeNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalCodeNode.js',
        '^lexical/HashtagNode$':
          '<rootDir>/packages/lexical/src/extensions/LexicalHashtagNode.js',
        '^lexical-react/useLexicalRichText$':
          '<rootDir>/packages/lexical-react/src/useLexicalRichText.js',
        '^lexical-react/useLexicalCanShowPlaceholder$':
          '<rootDir>/packages/lexical-react/src/useLexicalCanShowPlaceholder.js',
        '^lexical-react/withSubscriptions$':
          '<rootDir>/packages/lexical-react/src/withSubscriptions.js',
        '^lexical-react/LexicalCollaborationPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalCollaborationPlugin.js',
        '^lexical-react/LexicalPlainTextPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalPlainTextPlugin.js',
        '^lexical-react/LexicalComposerContext$':
          '<rootDir>/packages/lexical-react/src/LexicalComposerContext.js',
        '^lexical-react/LexicalComposerContentEditable$':
          '<rootDir>/packages/lexical-react/src/LexicalComposerContentEditable.js',
        '^lexical-react/useLexicalEditor$':
          '<rootDir>/packages/lexical-react/src/useLexicalEditor.js',
        '^lexical-react/useLexicalDecorators$':
          '<rootDir>/packages/lexical-react/src/useLexicalDecorators.js',
        '^lexical/selection$':
          '<rootDir>/packages/lexical/src/helpers/LexicalSelectionHelpers.js',
        '^lexical/text$':
          '<rootDir>/packages/lexical/src/helpers/LexicalTextHelpers.js',
        '^lexical/nodes$':
          '<rootDir>/packages/lexical/src/helpers/LexicalNodeHelpers.js',
        '^lexical/elements$':
          '<rootDir>/packages/lexical/src/helpers/LexicalElementHelpers.js',
        '^lexical/events$':
          '<rootDir>/packages/lexical/src/helpers/LexicalEventHelpers.js',
        '^lexical/file$':
          '<rootDir>/packages/lexical/src/helpers/LexicalFileHelpers.js',
        '^lexical/offsets$':
          '<rootDir>/packages/lexical/src/helpers/LexicalOffsetHelpers.js',
        '^lexical/root$':
          '<rootDir>/packages/lexical/src/helpers/LexicalRootHelpers.js',
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
        '^lexical-yjs$': '<rootDir>/packages/lexical-yjs/src/index.js',
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
