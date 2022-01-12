module.exports = {
  babel: {
    plugins: [['babel-plugin-transform-stylex', {dev: true}]],
  },
  webpack: {
    alias: {
      // Lexical Core Nodes
      'lexical/HeadingNode': 'lexical/dist/LexicalHeadingNode',
      'lexical/ListNode': 'lexical/dist/LexicalListNode',
      'lexical/ListItemNode': 'lexical/dist/LexicalListItemNode',
      'lexical/TableNode': 'lexical/dist/LexicalTableNode',
      'lexical/TableRowNode': 'lexical/dist/LexicalTableRowNode',
      'lexical/TableCellNode': 'lexical/dist/LexicalTableCellNode',
      'lexical/QuoteNode': 'lexical/dist/LexicalQuoteNode',
      'lexical/ParagraphNode': 'lexical/dist/LexicalParagraphNode',
      'lexical/CodeNode': 'lexical/dist/LexicalCodeNode',
      'lexical/LinkNode': 'lexical/dist/LexicalLinkNode',
      'lexical/HashtagNode': 'lexical/dist/LexicalHashtagNode',
      // Lexical Helpers
      '@lexical/helpers/selection':
        '@lexical/helpers/dist/LexicalSelectionHelpers',
      '@lexical/helpers/text': '@lexical/helpers/dist/LexicalTextHelpers',
      '@lexical/helpers/nodes': '@lexical/helpers/dist/LexicalNodeHelpers',
      '@lexical/helpers/elements':
        '@lexical/helpers/dist/LexicalElementHelpers',
      '@lexical/helpers/events': '@lexical/helpers/dist/LexicalEventHelpers',
      '@lexical/helpers/file': '@lexical/helpers/dist/LexicalFileHelpers',
      '@lexical/helpers/offsets': '@lexical/helpers/dist/LexicalOffsetHelpers',
      '@lexical/helpers/root': '@lexical/helpers/dist/LexicalRootHelpers',

      // Lexical React
      '@lexical/react/LexicalTreeView': '@lexical/react/dist/LexicalTreeView',
      '@lexical/react/useLexicalEditor': '@lexical/react/dist/useLexicalEditor',
      '@lexical/react/useLexicalRichText':
        '@lexical/react/dist/useLexicalRichText',
      '@lexical/react/useLexicalPlainText':
        '@lexical/react/dist/useLexicalPlainText',
      '@lexical/react/useLexicalRichTextWithCollab':
        '@lexical/react/dist/useLexicalRichTextWithCollab',
      '@lexical/react/useLexicalPlainTextWithCollab':
        '@lexical/react/dist/useLexicalPlainTextWithCollab',
      '@lexical/react/useLexicalEditorEvents':
        '@lexical/react/dist/useLexicalEditorEvents',
      '@lexical/react/useLexicalAutoFormatter':
        '@lexical/react/dist/useLexicalAutoFormatter',
      '@lexical/react/useLexicalDecorators':
        '@lexical/react/dist/useLexicalDecorators',
      '@lexical/react/useLexicalList': '@lexical/react/dist/useLexicalList',
      '@lexical/react/useLexicalIsBlank':
        '@lexical/react/dist/useLexicalIsBlank',
      '@lexical/react/useLexicalIsTextContentEmpty':
        '@lexical/react/dist/useLexicalIsTextContentEmpty',
      '@lexical/react/useLexicalCanShowPlaceholder':
        '@lexical/react/dist/useLexicalCanShowPlaceholder',
      '@lexical/react/useLexicalCharacterLimit':
        '@lexical/react/dist/useLexicalCharacterLimit',
      '@lexical/react/useLexicalHistory':
        '@lexical/react/dist/useLexicalHistory',
      '@lexical/react/withSubscriptions':
        '@lexical/react/dist/withSubscriptions',
      '@lexical/react/LexicalContentEditable':
        '@lexical/react/dist/LexicalContentEditable',

      // Composer and it's plugins
      '@lexical/react/LexicalComposer': '@lexical/react/dist/LexicalComposer',
      '@lexical/react/LexicalComposerContext':
        '@lexical/react/dist/LexicalComposerContext',
      ...[
        'LexicalAutoFormatterPlugin',
        'LexicalCharacterLimitPlugin',
        'LexicalHashtagPlugin',
        'LexicalPlainTextPlugin',
        'LexicalRichTextPlugin',
        'LexicalCollaborationPlugin',
        'LexicalHistoryPlugin',
        'LexicalTablePlugin',
        'LexicalTableActionMenuPlugin',
        'LexicalLinkPlugin',
      ].reduce(
        (aliases, plugin) => ({
          ...aliases,
          [`@lexical/react/${plugin}`]: `@lexical/react/dist/${plugin}`,
        }),
        {},
      ),
      //Shared
      'shared/environment': 'shared/dist/environment',
      'shared/useLayoutEffect': 'shared/dist/useLayoutEffect',
    },
  },
};
