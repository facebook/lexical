/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'path';
import {flowPlugin, esbuildFlowPlugin} from '@bunchtogether/vite-plugin-flow';
import path from 'path';
import fs from 'fs';
import {replaceCodePlugin} from 'vite-plugin-replace';
import babel from '@rollup/plugin-babel';

const moduleResolution = [
  {
    find: /lexical$/,
    replacement: path.resolve('../lexical/src/index.js'),
  },
  {
    find: '@lexical/clipboard',
    replacement: path.resolve('../lexical-clipboard/src/index.js'),
  },
  {
    find: '@lexical/selection',
    replacement: path.resolve('../lexical-selection/src/index.js'),
  },
  {
    find: '@lexical/text',
    replacement: path.resolve('../lexical-text/src/index.js'),
  },
  {
    find: '@lexical/hashtag',
    replacement: path.resolve('../lexical-hashtag/src/index.ts'),
  },
  {
    find: '@lexical/history',
    replacement: path.resolve('../lexical-history/src/index.ts'),
  },
  {
    find: '@lexical/list',
    replacement: path.resolve('../lexical-list/src/index.js'),
  },
  {
    find: '@lexical/file',
    replacement: path.resolve('../lexical-file/src/index.ts'),
  },
  {
    find: '@lexical/table',
    replacement: path.resolve('../lexical-table/src/index.js'),
  },
  {
    find: '@lexical/offset',
    replacement: path.resolve('../lexical-offset/src/index.js'),
  },
  {
    find: '@lexical/utils',
    replacement: path.resolve('../lexical-utils/src/index.js'),
  },
  {
    find: '@lexical/code',
    replacement: path.resolve('../lexical-code/src/index.ts'),
  },
  {
    find: '@lexical/plain-text',
    replacement: path.resolve('../lexical-plain-text/src/index.ts'),
  },
  {
    find: '@lexical/rich-text',
    replacement: path.resolve('../lexical-rich-text/src/index.ts'),
  },
  {
    find: '@lexical/dragon',
    replacement: path.resolve('../lexical-dragon/src/index.ts'),
  },
  {
    find: '@lexical/link',
    replacement: path.resolve('../lexical-link/src/index.js'),
  },
  {
    find: '@lexical/overflow',
    replacement: path.resolve('../lexical-overflow/src/index.js'),
  },
  {
    find: '@lexical/markdown',
    replacement: path.resolve('../lexical-markdown/src/index.js'),
  },
  {
    find: '@lexical/mark',
    replacement: path.resolve('../lexical-mark/src/index.ts'),
  },
  {
    find: '@lexical/yjs',
    replacement: path.resolve('../lexical-yjs/src/index.js'),
  },
  {
    find: 'shared',
    replacement: path.resolve('../shared/src'),
  },
  {
    find: 'shared-ts',
    replacement: path.resolve('../shared-ts/src'),
  },
];
// Lexical React
[
  'LexicalTreeView',
  'LexicalComposer',
  'LexicalComposerContext',
  'useLexicalIsTextContentEmpty',
  'useLexicalTextEntity',
  'LexicalContentEditable',
  'LexicalNestedComposer',
  'LexicalHorizontalRuleNode',
  'LexicalDecoratorBlockNode',
  'LexicalBlockWithAlignableContents',
  'useLexicalNodeSelection',
  'LexicalMarkdownShortcutPlugin',
  'LexicalCharacterLimitPlugin',
  'LexicalHashtagPlugin',
  'LexicalPlainTextPlugin',
  'LexicalRichTextPlugin',
  'LexicalClearEditorPlugin',
  'LexicalCollaborationPlugin',
  'LexicalHistoryPlugin',
  'LexicalTablePlugin',
  'LexicalLinkPlugin',
  'LexicalListPlugin',
  'LexicalCheckListPlugin',
  'LexicalAutoFocusPlugin',
  'LexicalAutoLinkPlugin',
  'LexicalOnChangePlugin',
  'LexicalAutoScrollPlugin',
].forEach((module) => {
  let resolvedPath = path.resolve(`../lexical-react/src/${module}.js`);

  if (fs.existsSync(resolvedPath)) {
    moduleResolution.push({
      find: `@lexical/react/${module}`,
      replacement: resolvedPath,
    });
  } else {
    resolvedPath = path.resolve(`../lexical-react/src/${module}.jsx`);
    moduleResolution.push({
      find: `@lexical/react/${module}`,
      replacement: resolvedPath,
    });
  }
}); 

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      plugins: [esbuildFlowPlugin()],
    },
  },
  plugins: [
    replaceCodePlugin({
      replacements: [
        {
          from: /__DEV__/g,
          to: 'true',
        },
      ],
    }),
    babel({
      babelHelpers: 'bundled',
      babelrc: false,
      configFile: false,
      exclude: '/**/node_modules/**',
      plugins: [
        '@babel/plugin-transform-flow-strip-types',
        [
          require('../../scripts/error-codes/transform-error-messages'),
          {
            noMinify: true,
          },
        ],
      ],
      presets: ['@babel/preset-react'],
    }),
    flowPlugin(),
    react(),
  ],
  resolve: {
    alias: moduleResolution,
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        split: new URL('./split/index.html', import.meta.url).pathname,
      },
    },
  },
});
