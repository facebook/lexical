module.exports = {
  webpack: {
    alias: {
      // Outline Extensions
      'outline/HeadingNode': 'outline/dist/OutlineHeadingNode',
      'outline/ListNode': 'outline/dist/OutlineListNode',
      'outline/ListItemNode': 'outline/dist/OutlineListItemNode',
      'outline/ImageNode': 'outline/dist/OutlineImageNode',
      'outline/QuoteNode': 'outline/dist/OutlineQuoteNode',
      'outline/ParagraphNode': 'outline/dist/OutlineParagraphNode',
      'outline/CodeNode': 'outline/dist/OutlineCodeNode',
      // Outline React
      'outline-react/useOutlineRichText':
        'outline-react/dist/useOutlineRichText',
      'outline-react/useOutlinePlainText':
        'outline-react/dist/useOutlinePlainText',
      'outline-react/useOutlineEditorEvents':
        'outline-react/dist/useOutlineEditorEvents',
      'outline-react/useOutlineAutoFormatter':
        'outline-react/dist/useOutlineAutoFormatter',
      'outline-react/OutlineHistory': 'outline-react/dist/OutlineHistory',
      'outline-react/OutlineKeyHelpers': 'outline-react/dist/OutlineKeyHelpers',
      'outline-react/OutlineSelectionHelpers':
        'outline-react/dist/OutlineSelectionHelpers',
      'outline-react/OutlineTextHelpers':
        'outline-react/dist/OutlineTextHelpers',
      'outline-react/OutlineEventHandlers':
        'outline-react/dist/OutlineEventHandlers',
    },
  },
};
