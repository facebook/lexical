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
      globals: {
        __DEV__: true,
      },
      moduleNameMapper: {
        '^./dist/(.+)': './src/$1',
        '^@lexical/clipboard$':
          '<rootDir>/packages/lexical-clipboard/src/index.js',
        '^@lexical/file$': '<rootDir>/packages/lexical-file/src/index.js',
        '^@lexical/hashtag$': '<rootDir>/packages/lexical-hashtag/src/index.js',
        '^@lexical/helpers/elements$':
          '<rootDir>/packages/lexical-helpers/src/LexicalElementHelpers.js',
        '^@lexical/helpers/nodes$':
          '<rootDir>/packages/lexical-helpers/src/LexicalNodeHelpers.js',
        '^@lexical/helpers/offsets$':
          '<rootDir>/packages/lexical-helpers/src/LexicalOffsetHelpers.js',
        '^@lexical/helpers/root$':
          '<rootDir>/packages/lexical-helpers/src/LexicalRootHelpers.js',
        '^@lexical/list$': '<rootDir>/packages/lexical-list/src/index.js',
        '^@lexical/react/DEPRECATED_useLexicalRichText$':
          '<rootDir>/packages/lexical-react/src/DEPRECATED_useLexicalRichText.js',
        '^@lexical/react/LexicalAutoLinkPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalAutoLinkPlugin.js',
        '^@lexical/react/LexicalCollaborationPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalCollaborationPlugin.js',
        '^@lexical/react/LexicalComposerContext$':
          '<rootDir>/packages/lexical-react/src/LexicalComposerContext.js',
        '^@lexical/react/LexicalContentEditable$':
          '<rootDir>/packages/lexical-react/src/LexicalContentEditable.jsx',
        '^@lexical/react/LexicalLinkPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalLinkPlugin.js',
        '^@lexical/react/LexicalListPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalListPlugin.js',
        '^@lexical/react/LexicalPlainTextPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalPlainTextPlugin.js',
        '^@lexical/react/LexicalTablePlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalTablePlugin.js',
        '^@lexical/react/useLexicalCanShowPlaceholder$':
          '<rootDir>/packages/lexical-react/src/useLexicalCanShowPlaceholder.js',
        '^@lexical/react/useLexicalDecorators$':
          '<rootDir>/packages/lexical-react/src/useLexicalDecorators.js',
        '^@lexical/react/useLexicalEditor$':
          '<rootDir>/packages/lexical-react/src/useLexicalEditor.js',
        '^@lexical/react/withSubscriptions$':
          '<rootDir>/packages/lexical-react/src/withSubscriptions.js',
        '^@lexical/selection$':
          '<rootDir>/packages/lexical-selection/src/index.js',
        '^@lexical/table$': '<rootDir>/packages/lexical-table/src/index.js',
        '^@lexical/text$': '<rootDir>/packages/lexical-text/src/index.js',
        '^@lexical/yjs$': '<rootDir>/packages/lexical-yjs/src/index.js',
        '^lexical$': '<rootDir>/packages/lexical/src/index.js',
        '^lexical/AutoLinkNode$':
          '<rootDir>/packages/lexical/src/nodes/extended/LexicalAutoLinkNode.js',
        '^lexical/CodeHighlightNode$':
          '<rootDir>/packages/lexical/src/nodes/extended/LexicalCodeHighlightNode.js',
        '^lexical/CodeNode$':
          '<rootDir>/packages/lexical/src/nodes/extended/LexicalCodeNode.js',
        '^lexical/ExtendedNodes$':
          '<rootDir>/packages/lexical/src/nodes/extended/LexicalExtendedNodes.js',
        '^lexical/HeadingNode$':
          '<rootDir>/packages/lexical/src/nodes/extended/LexicalHeadingNode.js',
        '^lexical/LinkNode$':
          '<rootDir>/packages/lexical/src/nodes/extended/LexicalLinkNode.js',
        '^lexical/OverflowNode$':
          '<rootDir>/packages/lexical/src/nodes/extended/LexicalOverflowNode.js',
        '^lexical/QuoteNode$':
          '<rootDir>/packages/lexical/src/nodes/extended/LexicalQuoteNode.js',
        '^shared/canUseDOM$': '<rootDir>/packages/shared/src/canUseDOM.js',
        '^shared/environment$': '<rootDir>/packages/shared/src/environment.js',
        '^shared/getDOMSelection$':
          '<rootDir>/packages/shared/src/getDOMSelection.js',
        '^shared/invariant$': '<rootDir>/packages/shared/src/invariant.js',
        '^shared/useLayoutEffect$':
          '<rootDir>/packages/shared/src/useLayoutEffect.js',
        formatProdErrorMessage:
          '<rootDir>/scripts/error-codes/formatProdErrorMessage.js',
      },
      testMatch: ['**/__tests__/unit/**/*.test.js'],
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
