/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const common = {
  modulePathIgnorePatterns: ['/npm'],
};

module.exports = {
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
          '<rootDir>/packages/lexical-clipboard/src/index.ts',
        '^@lexical/code$': '<rootDir>/packages/lexical-code/src/index.ts',
        '^@lexical/dragon$': '<rootDir>/packages/lexical-dragon/src/index.ts',
        '^@lexical/file$': '<rootDir>/packages/lexical-file/src/index.ts',
        '^@lexical/hashtag$': '<rootDir>/packages/lexical-hashtag/src/index.ts',
        '^@lexical/headless$':
          '<rootDir>/packages/lexical-headless/src/index.ts',
        '^@lexical/history$': '<rootDir>/packages/lexical-history/src/index.ts',
        '^@lexical/html$': '<rootDir>/packages/lexical-html/src/index.ts',
        '^@lexical/link$': '<rootDir>/packages/lexical-link/src/index.ts',
        '^@lexical/list$': '<rootDir>/packages/lexical-list/src/index.ts',
        '^@lexical/mark$': '<rootDir>/packages/lexical-mark/src/index.ts',
        '^@lexical/markdown$':
          '<rootDir>/packages/lexical-markdown/src/index.ts',
        '^@lexical/offset$': '<rootDir>/packages/lexical-offset/src/index.ts',
        '^@lexical/overflow$':
          '<rootDir>/packages/lexical-overflow/src/index.ts',
        '^@lexical/plain-text$':
          '<rootDir>/packages/lexical-plain-text/src/index.ts',
        '^@lexical/react/DEPRECATED_useLexicalRichText$':
          '<rootDir>/packages/lexical-react/src/DEPRECATED_useLexicalRichText.ts',
        '^@lexical/react/LexicalAutoEmbedPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalAutoEmbedPlugin.tsx',
        '^@lexical/react/LexicalAutoLinkPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalAutoLinkPlugin.ts',
        '^@lexical/react/LexicalCheckListPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalCheckListPlugin.ts',
        '^@lexical/react/LexicalCollaborationContext$':
          '<rootDir>/packages/lexical-react/src/LexicalCollaborationContext.ts',
        '^@lexical/react/LexicalCollaborationPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalCollaborationPlugin.ts',
        '^@lexical/react/LexicalComposerContext$':
          '<rootDir>/packages/lexical-react/src/LexicalComposerContext.ts',
        '^@lexical/react/LexicalContentEditable$':
          '<rootDir>/packages/lexical-react/src/LexicalContentEditable.tsx',
        '^@lexical/react/LexicalLinkPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalLinkPlugin.ts',
        '^@lexical/react/LexicalListPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalListPlugin.ts',
        '^@lexical/react/LexicalPlainTextPlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalPlainTextPlugin.ts',
        '^@lexical/react/LexicalTablePlugin$':
          '<rootDir>/packages/lexical-react/src/LexicalTablePlugin.ts',
        '^@lexical/react/useLexicalCanShowPlaceholder$':
          '<rootDir>/packages/lexical-react/src/useLexicalCanShowPlaceholder.ts',
        '^@lexical/react/useLexicalDecorators$':
          '<rootDir>/packages/lexical-react/src/useLexicalDecorators.ts',
        '^@lexical/react/useLexicalEditor$':
          '<rootDir>/packages/lexical-react/src/useLexicalEditor.ts',
        '^@lexical/rich-text$':
          '<rootDir>/packages/lexical-rich-text/src/index.ts',
        '^@lexical/selection$':
          '<rootDir>/packages/lexical-selection/src/index.ts',
        '^@lexical/table$': '<rootDir>/packages/lexical-table/src/index.ts',
        '^@lexical/text$': '<rootDir>/packages/lexical-text/src/index.ts',
        '^@lexical/utils$': '<rootDir>/packages/lexical-utils/src/index.ts',
        '^@lexical/yjs$': '<rootDir>/packages/lexical-yjs/src/index.ts',
        '^lexical$': '<rootDir>/packages/lexical/src/index.ts',
        '^shared/canUseDOM$': '<rootDir>/packages/shared/src/canUseDOM.ts',
        '^shared/caretFromPoint$':
          '<rootDir>/packages/shared/src/caretFromPoint.ts',
        '^shared/environment$': '<rootDir>/packages/shared/src/environment.ts',
        '^shared/getDOMSelection$':
          '<rootDir>/packages/shared/src/getDOMSelection.ts',
        '^shared/invariant$': '<rootDir>/packages/shared/src/invariant.ts',
        '^shared/simpleDiffWithCursor$':
          '<rootDir>/packages/shared/src/simpleDiffWithCursor.ts',
        '^shared/useLayoutEffect$':
          '<rootDir>/packages/shared/src/useLayoutEffect.ts',
        '^shared/warnOnlyOnce$':
          '<rootDir>/packages/shared/src/warnOnlyOnce.ts',
        formatProdErrorMessage:
          '<rootDir>/scripts/error-codes/formatProdErrorMessage.js',
      },
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['**/__tests__/unit/**/*.test{.ts,.tsx,.js,.jsx}'],
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
