module.exports = {
  babel: {
    plugins: [['babel-plugin-transform-stylex', {dev: true}]],
  },
  webpack: {
    alias: {
      // Lexical Extensions
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
      'lexical/selection': 'lexical/dist/LexicalSelectionHelpers',
      'lexical/text': 'lexical/dist/LexicalTextHelpers',
      'lexical/nodes': 'lexical/dist/LexicalNodeHelpers',
      'lexical/elements': 'lexical/dist/LexicalElementHelpers',
      'lexical/events': 'lexical/dist/LexicalEventHelpers',
      'lexical/file': 'lexical/dist/LexicalFileHelpers',
      'lexical/offsets': 'lexical/dist/LexicalOffsetHelpers',
      'lexical/root': 'lexical/dist/LexicalRootHelpers',

      // Lexical React
      'lexical-react/LexicalTreeView': 'lexical-react/dist/LexicalTreeView',
      'lexical-react/useLexicalEditor': 'lexical-react/dist/useLexicalEditor',
      'lexical-react/useLexicalRichText':
        'lexical-react/dist/useLexicalRichText',
      'lexical-react/useLexicalPlainText':
        'lexical-react/dist/useLexicalPlainText',
      'lexical-react/useLexicalRichTextWithCollab':
        'lexical-react/dist/useLexicalRichTextWithCollab',
      'lexical-react/useLexicalPlainTextWithCollab':
        'lexical-react/dist/useLexicalPlainTextWithCollab',
      'lexical-react/useLexicalEditorEvents':
        'lexical-react/dist/useLexicalEditorEvents',
      'lexical-react/useLexicalAutoFormatter':
        'lexical-react/dist/useLexicalAutoFormatter',
      'lexical-react/useLexicalDecorators':
        'lexical-react/dist/useLexicalDecorators',
      'lexical-react/useLexicalNestedList':
        'lexical-react/dist/useLexicalNestedList',
      'lexical-react/useLexicalList': 'lexical-react/dist/useLexicalList',
      'lexical-react/useLexicalIsBlank': 'lexical-react/dist/useLexicalIsBlank',
      'lexical-react/useLexicalIsTextContentEmpty':
        'lexical-react/dist/useLexicalIsTextContentEmpty',
      'lexical-react/useLexicalCanShowPlaceholder':
        'lexical-react/dist/useLexicalCanShowPlaceholder',
      'lexical-react/useLexicalCharacterLimit':
        'lexical-react/dist/useLexicalCharacterLimit',
      'lexical-react/useLexicalHistory': 'lexical-react/dist/useLexicalHistory',
      'lexical-react/withSubscriptions': 'lexical-react/dist/withSubscriptions',
      'lexical-react/LexicalComposerContentEditable':
        'lexical-react/dist/LexicalComposerContentEditable',

      // Composer and it's plugins
      'lexical-react/LexicalComposer': 'lexical-react/dist/LexicalComposer',
      'lexical-react/LexicalComposerContext':
        'lexical-react/dist/LexicalComposerContext',
      ...[
        'LexicalAutoFormatterPlugin',
        'LexicalCharacterLimitPlugin',
        'LexicalHashtagPlugin',
        'LexicalPlainTextPlugin',
        'LexicalRichTextPlugin',
        'LexicalCollaborationPlugin',
        'LexicalHistoryPlugin',
      ].reduce(
        (aliases, plugin) => ({
          ...aliases,
          [`lexical-react/${plugin}`]: `lexical-react/dist/${plugin}`,
        }),
        {},
      ),
      //Shared
      'shared/environment': 'shared/dist/environment',
      'shared/useLayoutEffect': 'shared/dist/useLayoutEffect',
    },
  },
};
