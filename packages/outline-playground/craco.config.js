module.exports = {
  webpack: {
    alias: {
      // Outline Extensions
      'outline/HeadingNode': 'outline/dist/OutlineHeadingNode',
      'outline/ListNode': 'outline/dist/OutlineListNode',
      'outline/ListItemNode': 'outline/dist/OutlineListItemNode',
      'outline/QuoteNode': 'outline/dist/OutlineQuoteNode',
      'outline/ParagraphNode': 'outline/dist/OutlineParagraphNode',
      'outline/CodeNode': 'outline/dist/OutlineCodeNode',
      'outline/LinkNode': 'outline/dist/OutlineLinkNode',
      'outline/HashtagNode': 'outline/dist/OutlineHashtagNode',
      // Outline Helpers
      'outline/SelectionHelpers': 'outline/dist/OutlineSelectionHelpers',
      'outline/TextHelpers': 'outline/dist/OutlineTextHelpers',
      'outline/HistoryHelpers': 'outline/dist/OutlineHistoryHelpers',
      'outline/KeyHelpers': 'outline/dist/OutlineKeyHelpers',
      'outline/NodeHelpers': 'outline/dist/OutlineNodeHelpers',
      'outline/EventHelpers': 'outline/dist/OutlineEventHelpers',
      'outline/OffsetHelpers': 'outline/dist/OutlineOffsetHelpers',
      // Outline React
      'outline-react/OutlineTreeView': 'outline-react/dist/OutlineTreeView',
      'outline-react/useOutlineEditor': 'outline-react/dist/useOutlineEditor',
      'outline-react/useOutlineRichText':
        'outline-react/dist/useOutlineRichText',
      'outline-react/useOutlinePlainText':
        'outline-react/dist/useOutlinePlainText',
      'outline-react/useOutlineEditorEvents':
        'outline-react/dist/useOutlineEditorEvents',
      'outline-react/useOutlineAutoFormatter':
        'outline-react/dist/useOutlineAutoFormatter',
      'outline-react/useOutlineDecorators':
        'outline-react/dist/useOutlineDecorators',
      'outline-react/useOutlineNestedList':
        'outline-react/dist/useOutlineNestedList',
      'outline-react/useOutlineCharacterLimit':
        'outline-react/dist/useOutlineCharacterLimit',
    },
  },
};
