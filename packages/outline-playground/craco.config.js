module.exports = {
  webpack: {
    alias: {
      // Outline Extensions
      'outline/HeadingNode': 'outline/dist/OutlineHeadingNode',
      'outline/ListNode': 'outline/dist/OutlineListNode',
      'outline/ListItemNode': 'outline/dist/OutlineListItemNode',
      'outline/TableNode': 'outline/dist/OutlineTableNode',
      'outline/TableRowNode': 'outline/dist/OutlineTableRowNode',
      'outline/TableCellNode': 'outline/dist/OutlineTableCellNode',
      'outline/QuoteNode': 'outline/dist/OutlineQuoteNode',
      'outline/ParagraphNode': 'outline/dist/OutlineParagraphNode',
      'outline/CodeNode': 'outline/dist/OutlineCodeNode',
      'outline/LinkNode': 'outline/dist/OutlineLinkNode',
      'outline/HashtagNode': 'outline/dist/OutlineHashtagNode',
      // Outline Helpers
      'outline/selection': 'outline/dist/OutlineSelectionHelpers',
      'outline/text': 'outline/dist/OutlineTextHelpers',
      'outline/keys': 'outline/dist/OutlineKeyHelpers',
      'outline/nodes': 'outline/dist/OutlineNodeHelpers',
      'outline/elements': 'outline/dist/OutlineElementHelpers',
      'outline/events': 'outline/dist/OutlineEventHelpers',
      'outline/offsets': 'outline/dist/OutlineOffsetHelpers',
      'outline/root': 'outline/dist/OutlineRootHelpers',

      // Outline React
      'outline-react/OutlineTreeView': 'outline-react/dist/OutlineTreeView',
      'outline-react/useOutlineEditor': 'outline-react/dist/useOutlineEditor',
      'outline-react/useOutlineRichText':
        'outline-react/dist/useOutlineRichText',
      'outline-react/useOutlinePlainText':
        'outline-react/dist/useOutlinePlainText',
      'outline-react/useOutlineRichTextWithCollab':
        'outline-react/dist/useOutlineRichTextWithCollab',
      'outline-react/useOutlineEditorEvents':
        'outline-react/dist/useOutlineEditorEvents',
      'outline-react/useOutlineAutoFormatter':
        'outline-react/dist/useOutlineAutoFormatter',
      'outline-react/useOutlineDecorators':
        'outline-react/dist/useOutlineDecorators',
      'outline-react/useOutlineNestedList':
        'outline-react/dist/useOutlineNestedList',
      'outline-react/useOutlineIsBlank': 'outline-react/dist/useOutlineIsBlank',
      'outline-react/useOutlineIsTextContentEmpty':
        'outline-react/dist/useOutlineIsTextContentEmpty',
      'outline-react/useOutlineCanShowPlaceholder':
        'outline-react/dist/useOutlineCanShowPlaceholder',
      'outline-react/useOutlineCharacterLimit':
        'outline-react/dist/useOutlineCharacterLimit',
      'outline-react/useOutlineHistory': 'outline-react/dist/useOutlineHistory',

      // Composer and it's plugins
      'outline-react/OutlineComposer': 'outline-react/dist/OutlineComposer',
      'outline-react/OutlineComposerContext':
        'outline-react/dist/OutlineComposerContext',
      ...[
        'AutoFormatterPlugin',
        'BlockControlsPlugin',
        'CharacterLimitPlugin',
        'HashtagsPlugin',
      ].reduce(
        (aliases, plugin) => ({
          ...aliases,
          [`outline-react/${plugin}`]: `outline-react/dist/${plugin}`,
        }),
        {},
      ),
      //Shared
      'shared/environment': 'shared/dist/environment',
      'shared/useLayoutEffect': 'shared/dist/useLayoutEffect',
    },
  },
};
