/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const moduleResolution = [
  {
    lexical: '../lexical/src/index.ts',
  },
  {
    '@lexical/clipboard': '../lexical-clipboard/src/index.ts',
  },
  {
    '@lexical/selection': '../lexical-selection/src/index.ts',
  },
  {
    '@lexical/text': '../lexical-text/src/index.ts',
  },
  {
    '@lexical/headless': '../lexical-headless/src/index.ts',
  },
  {
    '@lexical/html': '../lexical-html/src/index.ts',
  },
  {
    '@lexical/hashtag': '../lexical-hashtag/src/index.ts',
  },
  {
    '@lexical/history': '../lexical-history/src/index.ts',
  },
  {
    '@lexical/list': '../lexical-list/src/index.ts',
  },
  {
    '@lexical/file': '../lexical-file/src/index.ts',
  },
  {
    '@lexical/table': '../lexical-table/src/index.ts',
  },
  {
    '@lexical/offset': '../lexical-offset/src/index.ts',
  },
  {
    '@lexical/utils': '../lexical-utils/src/index.ts',
  },
  {
    '@lexical/code': '../lexical-code/src/index.ts',
  },
  {
    '@lexical/plain-text': '../lexical-plain-text/src/index.ts',
  },
  {
    '@lexical/rich-text': '../lexical-rich-text/src/index.ts',
  },
  {
    '@lexical/dragon': '../lexical-dragon/src/index.ts',
  },
  {
    '@lexical/link': '../lexical-link/src/index.ts',
  },
  {
    '@lexical/overflow': '../lexical-overflow/src/index.ts',
  },
  {
    '@lexical/markdown': '../lexical-markdown/src/index.ts',
  },
  {
    '@lexical/mark': '../lexical-mark/src/index.ts',
  },
  {
    '@lexical/yjs': '../lexical-yjs/src/index.ts',
  },
  {
    '@lexical/react/LexicalTreeView':
      '../lexical-react/src/LexicalTreeView.tsx',
  },

  {
    '@lexical/react/LexicalComposer':
      '../lexical-react/src/LexicalComposer.tsx',
  },

  {
    '@lexical/react/LexicalComposerContext':
      '../lexical-react/src/LexicalComposerContext.ts',
  },

  {
    '@lexical/react/useLexicalIsTextContentEmpty':
      '../lexical-react/src/useLexicalIsTextContentEmpty.ts',
  },

  {
    '@lexical/react/useLexicalTextEntity':
      '../lexical-react/src/useLexicalTextEntity.ts',
  },

  {
    '@lexical/react/LexicalContentEditable':
      '../lexical-react/src/LexicalContentEditable.tsx',
  },

  {
    '@lexical/react/LexicalNestedComposer':
      '../lexical-react/src/LexicalNestedComposer.tsx',
  },

  {
    '@lexical/react/LexicalHorizontalRuleNode':
      '../lexical-react/src/LexicalHorizontalRuleNode.tsx',
  },

  {
    '@lexical/react/LexicalDecoratorBlockNode':
      '../lexical-react/src/LexicalDecoratorBlockNode.ts',
  },

  {
    '@lexical/react/LexicalBlockWithAlignableContents':
      '../lexical-react/src/LexicalBlockWithAlignableContents.tsx',
  },

  {
    '@lexical/react/useLexicalNodeSelection':
      '../lexical-react/src/useLexicalNodeSelection.ts',
  },

  {
    '@lexical/react/LexicalMarkdownShortcutPlugin':
      '../lexical-react/src/LexicalMarkdownShortcutPlugin.tsx',
  },

  {
    '@lexical/react/LexicalCharacterLimitPlugin':
      '../lexical-react/src/LexicalCharacterLimitPlugin.tsx',
  },

  {
    '@lexical/react/LexicalHashtagPlugin':
      '../lexical-react/src/LexicalHashtagPlugin.ts',
  },

  {
    '@lexical/react/LexicalPlainTextPlugin':
      '../lexical-react/src/LexicalPlainTextPlugin.tsx',
  },

  {
    '@lexical/react/LexicalRichTextPlugin':
      '../lexical-react/src/LexicalRichTextPlugin.tsx',
  },

  {
    '@lexical/react/LexicalClearEditorPlugin':
      '../lexical-react/src/LexicalClearEditorPlugin.ts',
  },

  {
    '@lexical/react/LexicalCollaborationContext':
      '../lexical-react/src/LexicalCollaborationContext.ts',
  },

  {
    '@lexical/react/LexicalCollaborationPlugin':
      '../lexical-react/src/LexicalCollaborationPlugin.ts',
  },

  {
    '@lexical/react/LexicalHistoryPlugin':
      '../lexical-react/src/LexicalHistoryPlugin.ts',
  },

  {
    '@lexical/react/LexicalTypeaheadMenuPlugin':
      '../lexical-react/src/LexicalTypeaheadMenuPlugin.tsx',
  },

  {
    '@lexical/react/LexicalTablePlugin':
      '../lexical-react/src/LexicalTablePlugin.ts',
  },

  {
    '@lexical/react/LexicalLinkPlugin':
      '../lexical-react/src/LexicalLinkPlugin.ts',
  },

  {
    '@lexical/react/LexicalListPlugin':
      '../lexical-react/src/LexicalListPlugin.ts',
  },

  {
    '@lexical/react/LexicalCheckListPlugin':
      '../lexical-react/src/LexicalCheckListPlugin.tsx',
  },

  {
    '@lexical/react/LexicalAutoFocusPlugin':
      '../lexical-react/src/LexicalAutoFocusPlugin.ts',
  },

  {
    '@lexical/react/LexicalTableOfContents__EXPERIMENTAL':
      '../lexical-react/src/LexicalTableOfContents__EXPERIMENTAL.tsx',
  },

  {
    '@lexical/react/LexicalAutoLinkPlugin':
      '../lexical-react/src/LexicalAutoLinkPlugin.ts',
  },

  {
    '@lexical/react/LexicalAutoEmbedPlugin':
      '../lexical-react/src/LexicalAutoEmbedPlugin.tsx',
  },

  {
    '@lexical/react/LexicalOnChangePlugin':
      '../lexical-react/src/LexicalOnChangePlugin.ts',
  },

  {
    '@lexical/react/LexicalAutoScrollPlugin':
      '../lexical-react/src/LexicalAutoScrollPlugin.ts',
  },

  {shared: '../shared/src'},
];

module.exports = {
  plugins: [
    [
      require.resolve('babel-plugin-module-resolver'),
      {
        alias: moduleResolution,
        extensions: ['jsx', 'js', 'ts', 'tsx', 'mjs'],
        root: ['/'],
      },
    ],
  ],
  presets: [require.resolve('@docusaurus/core/lib/babel/preset')],
};
