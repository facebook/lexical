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
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

const moduleResolution = [
  {
    find: /lexical$/,
    replacement: path.resolve('../lexical/dist/Lexical.js'),
  },
  {
    find: '@lexical/clipboard',
    replacement: path.resolve('../lexical-clipboard/dist/LexicalClipboard.js'),
  },
  {
    find: '@lexical/selection',
    replacement: path.resolve('../lexical-selection/dist/LexicalSelection.js'),
  },
  {
    find: '@lexical/text',
    replacement: path.resolve('../lexical-text/dist/LexicalText.js'),
  },
  {
    find: '@lexical/headless',
    replacement: path.resolve('../lexical-headless/dist/LexicalHeadless.js'),
  },
  {
    find: '@lexical/html',
    replacement: path.resolve('../lexical-html/dist/LexicalHtml.js'),
  },
  {
    find: '@lexical/hashtag',
    replacement: path.resolve('../lexical-hashtag/dist/LexicalHashtag.js'),
  },
  {
    find: '@lexical/history',
    replacement: path.resolve('../lexical-history/dist/LexicalHistory.js'),
  },
  {
    find: '@lexical/list',
    replacement: path.resolve('../lexical-list/dist/LexicalList.js'),
  },
  {
    find: '@lexical/file',
    replacement: path.resolve('../lexical-file/dist/LexicalFile.js'),
  },
  {
    find: '@lexical/table',
    replacement: path.resolve('../lexical-table/dist/LexicalTable.js'),
  },
  {
    find: '@lexical/offset',
    replacement: path.resolve('../lexical-offset/dist/LexicalOffset.js'),
  },
  {
    find: '@lexical/utils',
    replacement: path.resolve('../lexical-utils/dist/LexicalUtils.js'),
  },
  {
    find: '@lexical/code',
    replacement: path.resolve('../lexical-code/dist/LexicalCode.js'),
  },
  {
    find: '@lexical/plain-text',
    replacement: path.resolve('../lexical-plain-text/dist/LexicalPlainText.js'),
  },
  {
    find: '@lexical/rich-text',
    replacement: path.resolve('../lexical-rich-text/dist/LexicalRichText.js'),
  },
  {
    find: '@lexical/dragon',
    replacement: path.resolve('../lexical-dragon/dist/LexicalDragon.js'),
  },
  {
    find: '@lexical/link',
    replacement: path.resolve('../lexical-link/dist/LexicalLink.js'),
  },
  {
    find: '@lexical/overflow',
    replacement: path.resolve('../lexical-overflow/dist/LexicalOverflow.js'),
  },
  {
    find: '@lexical/markdown',
    replacement: path.resolve('../lexical-markdown/dist/LexicalMarkdown.js'),
  },
  {
    find: '@lexical/mark',
    replacement: path.resolve('../lexical-mark/dist/LexicalMark.js'),
  },
  {
    find: '@lexical/yjs',
    replacement: path.resolve('../lexical-yjs/dist/LexicalYjs.js'),
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
  let resolvedPath = path.resolve(`../lexical-react/dist/${module}.js`);
  moduleResolution.push({
    find: `@lexical/react/${module}`,
    replacement: resolvedPath,
  });
});

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    "process.env.IS_PREACT": process.env.IS_PREACT,
  },
  server: {
    port: 3000,
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
      plugins: ['@babel/plugin-transform-flow-strip-types'],
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
    commonjs({
      include: '../../node_modules/**',
      // left-hand side can be an absolute path, a path
      // relative to the current directory, or the name
      // of a module in node_modules
      namedExports: {
        '../../node_modules/react/index.js': [
          'cloneElement',
          'createContext',
          'Component',
          'createElement'
        ],
        '../../node_modules/react-dom/index.js': ['render', 'hydrate'],
        '../../node_modules/react-is/index.js': [
          'isElement',
          'isValidElementType',
          'ForwardRef'
        ],
        "../lexical-react/dist/LexicalHistoryPlugin.js": [
          'createEmptyHistoryState'
        ]
      }
    })
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
    commonjsOptions: {include: []},
    minify: 'terser',
    terserOptions: {
      compress: {
        toplevel: true,
      }
    },
  },
});
