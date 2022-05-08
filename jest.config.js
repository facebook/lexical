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
        IS_REACT_ACT_ENVIRONMENT: true,
        __DEV__: true,
        'ts-jest': {
          tsconfig: 'tsconfig.test.json',
        },
      },
      moduleNameMapper: {
        '^./dist/(.+)': './src/$1',
        '^@lexical/clipboard$':
          '<rootDir>/packages/lexical-clipboard/src/index.js',
        '^@lexical/code$': '<rootDir>/packages/lexical-code/src/index.ts',
        '^@lexical/dragon$': '<rootDir>/packages/lexical-dragon/src/index.ts',
        '^@lexical/file$': '<rootDir>/packages/lexical-file/src/index.js',
        '^@lexical/hashtag$': '<rootDir>/packages/lexical-hashtag/src/index.js',
        '^@lexical/history$': '<rootDir>/packages/lexical-history/src/index.ts',
        '^@lexical/link$': '<rootDir>/packages/lexical-link/src/index.js',
        '^@lexical/list$': '<rootDir>/packages/lexical-list/src/index.js',
        '^@lexical/mark$': '<rootDir>/packages/lexical-mark/src/index.js',
        '^@lexical/offset$': '<rootDir>/packages/lexical-offset/src/index.js',
        '^@lexical/overflow$':
          '<rootDir>/packages/lexical-overflow/src/index.js',
        '^@lexical/plain-text$':
          '<rootDir>/packages/lexical-plain-text/src/index.js',
        '^@lexical/react/DEPRECATED_useLexicalRichText$':
          '<rootDir>/packages/lexical-react/src/DEPRECATED_useLexicalRichText.js',
        '^@lexical/react/LexicalAutoLinkPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalAutoLinkPlugin.js',
        '^@lexical/react/LexicalAutoScrollPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalAutoScrollPlugin.js',
        '^@lexical/react/LexicalCheckListPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalCheckListPlugin.js',
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
        '^@lexical/rich-text$':
          '<rootDir>/packages/lexical-rich-text/src/index.js',
        '^@lexical/selection$':
          '<rootDir>/packages/lexical-selection/src/index.js',
        '^@lexical/table$': '<rootDir>/packages/lexical-table/src/index.js',
        '^@lexical/text$': '<rootDir>/packages/lexical-text/src/index.js',
        '^@lexical/utils$': '<rootDir>/packages/lexical-utils/src/index.js',
        '^@lexical/yjs$': '<rootDir>/packages/lexical-yjs/src/index.js',
        '^lexical$': '<rootDir>/packages/lexical/src/index.js',
        '^shared/canUseDOM$': '<rootDir>/packages/shared/src/canUseDOM.js',
        '^shared/environment$': '<rootDir>/packages/shared/src/environment.js',
        '^shared/getDOMSelection$':
          '<rootDir>/packages/shared/src/getDOMSelection.js',
        '^shared/invariant$': '<rootDir>/packages/shared/src/invariant.js',
        '^shared/simpleDiffWithCursor$':
          '<rootDir>/packages/shared/src/simpleDiffWithCursor.js',
        '^shared/useLayoutEffect$':
          '<rootDir>/packages/shared/src/useLayoutEffect.js',
        formatProdErrorMessage:
          '<rootDir>/scripts/error-codes/formatProdErrorMessage.js',
      },
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['**/__tests__/unit/**/*.test{.ts,.js}'],
      transform: {
        '^.+\\.jsx?$': 'babel-jest',
        '^.+\\.tsx$': 'ts-jest',
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
