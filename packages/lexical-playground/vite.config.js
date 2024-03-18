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
import path from 'path';
import fs from 'fs';
import {replaceCodePlugin} from 'vite-plugin-replace';
import babel from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy';

const moduleResolution = [
  {
    find: /lexical$/,
    replacement: path.resolve('../lexical/src/index.ts'),
  },
  {
    find: '@lexical/clipboard',
    replacement: path.resolve('../lexical-clipboard/src/index.ts'),
  },
  {
    find: '@lexical/selection',
    replacement: path.resolve('../lexical-selection/src/index.ts'),
  },
  {
    find: '@lexical/text',
    replacement: path.resolve('../lexical-text/src/index.ts'),
  },
  {
    find: '@lexical/headless',
    replacement: path.resolve('../lexical-headless/src/index.ts'),
  },
  {
    find: '@lexical/html',
    replacement: path.resolve('../lexical-html/src/index.ts'),
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
    replacement: path.resolve('../lexical-list/src/index.ts'),
  },
  {
    find: '@lexical/file',
    replacement: path.resolve('../lexical-file/src/index.ts'),
  },
  {
    find: '@lexical/table',
    replacement: path.resolve('../lexical-table/src/index.ts'),
  },
  {
    find: '@lexical/offset',
    replacement: path.resolve('../lexical-offset/src/index.ts'),
  },
  {
    find: '@lexical/utils',
    replacement: path.resolve('../lexical-utils/src/index.ts'),
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
    replacement: path.resolve('../lexical-link/src/index.ts'),
  },
  {
    find: '@lexical/overflow',
    replacement: path.resolve('../lexical-overflow/src/index.ts'),
  },
  {
    find: '@lexical/markdown',
    replacement: path.resolve('../lexical-markdown/src/index.ts'),
  },
  {
    find: '@lexical/mark',
    replacement: path.resolve('../lexical-mark/src/index.ts'),
  },
  {
    find: '@lexical/yjs',
    replacement: path.resolve('../lexical-yjs/src/index.ts'),
  },
  {
    find: 'shared',
    replacement: path.resolve('../shared/src'),
  },
];
// Lexical React
[
  'LexicalTreeView',
  'LexicalComposer',
  'LexicalComposerContext',
  'useLexicalIsTextContentEmpty',
  'useLexicalTextEntity',
  'useLexicalSubscription',
  'useLexicalEditable',
  'LexicalContentEditable',
  'LexicalNestedComposer',
  'LexicalHorizontalRuleNode',
  'LexicalHorizontalRulePlugin',
  'LexicalDecoratorBlockNode',
  'LexicalBlockWithAlignableContents',
  'useLexicalNodeSelection',
  'LexicalMarkdownShortcutPlugin',
  'LexicalCharacterLimitPlugin',
  'LexicalHashtagPlugin',
  'LexicalErrorBoundary',
  'LexicalPlainTextPlugin',
  'LexicalRichTextPlugin',
  'LexicalClearEditorPlugin',
  'LexicalClickableLinkPlugin',
  'LexicalCollaborationContext',
  'LexicalCollaborationPlugin',
  'LexicalHistoryPlugin',
  'LexicalTypeaheadMenuPlugin',
  'LexicalNodeMenuPlugin',
  'LexicalContextMenuPlugin',
  'LexicalTablePlugin',
  'LexicalLinkPlugin',
  'LexicalListPlugin',
  'LexicalCheckListPlugin',
  'LexicalAutoFocusPlugin',
  "LexicalTableOfContents",
  'LexicalAutoLinkPlugin',
  'LexicalAutoEmbedPlugin',
  'LexicalOnChangePlugin',
  'LexicalNodeEventPlugin',
  'LexicalTabIndentationPlugin',
  'LexicalEditorRefPlugin'
].forEach((module) => {
  let resolvedPath = path.resolve(`../lexical-react/src/${module}.ts`);

  if (fs.existsSync(resolvedPath)) {
    moduleResolution.push({
      find: `@lexical/react/${module}`,
      replacement: resolvedPath,
    });
  } else {
    resolvedPath = path.resolve(`../lexical-react/src/${module}.tsx`);
    moduleResolution.push({
      find: `@lexical/react/${module}`,
      replacement: resolvedPath,
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    "process.env.IS_PREACT": process.env.IS_PREACT,
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
      extensions: ['jsx', 'js', 'ts', 'tsx', 'mjs'],
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
    react(),
    copy({
      hook: 'writeBundle',
      verbose: true,
      targets: [
        {src: './esm/*', dest: './build/esm/'},
        {src: ['./*.png', './*.ico'], dest: './build/'},
        ...((() => {
          const m = /<script type="importmap">([\s\S]+?)<\/script>/g.exec(fs.readFileSync('./esm/index.html', 'utf8'));
          if (!m) {
            throw new Error('Could not parse importmap from esm/index.html');
          }
          return Object.entries(JSON.parse(m[1]).imports).map(([k, v]) => ({
            src: path.join(`../${k.replace(/^@/, '').replace(/\//g, '-')}`, v),
            dest: './build/esm/dist/',
          }));
        })()),
      ],
    }),
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
