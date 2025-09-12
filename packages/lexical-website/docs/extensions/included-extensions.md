# Included Extensions

@lexical/code

- [CodeExtension](/docs/api/modules/lexical_code#codeextension) - CodeNode (code blocks)

@lexical/code-shiki

- [CodeHighlighterShikiExtension](/docs/api/modules/lexical_code-shiki#codehighlightershikiextension) - Highlighting with Shiki for CodeNode

@lexical/dragon

- [DragonExtension](/docs/api/modules/lexical_dragon#dragonextension) - Dragon (speech to text) support, included by default with RichTextExtension and PlainTextExtension

@lexical/extension

- [AutoFocusExtension](/docs/api/modules/lexical_extension#autofocusextension) - Focus the editor when it is created (e.g. on page load)
- [ClearEditorExtension](/docs/api/modules/lexical_extension#cleareditorextension) - Implementation for the `CLEAR_EDITOR_COMMAND`
- [EditorStateExtension](/docs/api/modules/lexical_extension#editorstateextension) - Provide EditorState as a signal (alternative to `registerUpdateListener`)
- [HorizontalRuleExtension](/docs/api/modules/lexical_extension#horizontalruleextension) - HorizontalRuleNode (`<hr>` tag)
- [InitialStateExtension](/docs/api/modules/lexical_extension#initialstateextension) - Sets the initial state of the editor (always included)
- [NodeSelectionExtension](/docs/api/modules/lexical_extension#nodeselectionextension) - Tracks selection, typically for DecoratorNodes
- [TabIndentationExtension](/docs/api/modules/lexical_extension#tabindentationextension) - Changes Tab key to insert tabs and indent instead of natively focusing the next field

@lexical/hashtag

- [HashtagExtension](/docs/api/modules/lexical_hashtag#hashtagextension) - HashtagNode

@lexical/history

- [HistoryExtension](/docs/api/modules/lexical_history#historyextension) - History support (undo/redo)
- [SharedHistoryExtension](/docs/api/modules/lexical_history#sharedhistoryextension) - History sharing between a parent editor and its nested editors

@lexical/link

- [AutoLinkExtension](/docs/api/modules/lexical_link#autolinkextension) - AutoLinkNode, note that matchers have to be manually configured
- [ClickableLinkExtension](/docs/api/modules/lexical_link#clickablelinkextension) - Toggle between lexical selection and native click to open behavior for links
- [LinkExtension](/docs/api/modules/lexical_link#linkextension) - LinkNode (`<a>` tag)

@lexical/list

- [ListExtension](/docs/api/modules/lexical_list#listextension) - ListNode, ListItemNode
- [CheckListExtension](/docs/api/modules/lexical_list#checklistextension) - Checklist support for ListNode and ListItemNode

@lexical/mark

- [MarkExtension](/docs/api/modules/lexical_mark#markextension) - MarkNode

@lexical/overflow

- [OverflowExtension](/docs/api/modules/lexical_overflow#overflowextension) - OverflowNode

@lexical/plain-text

- [PlainTextExtension](/docs/api/modules/lexical_plain_text#plaintextextension) - Plain text editor, return creates a LineBreakNode by default (one ParagraphNode per document)

@lexical/react

- [ReactExtension](/docs/api/modules/lexical_react_ReactExtension#reactextension)
- [ReactPluginHostExtension](/docs/api/modules/lexical_react_ReactPluginHostExtension#reactpluginhostextension)
- [ReactProviderExtension](/docs/api/modules/lexical_react_ReactProviderExtension#reactproviderextension)
- [TreeViewExtension](/docs/api/modules/lexical_react_TreeViewExtension#treeviewextension)

@lexical/rich-text

- [RichTextExtension](/docs/api/modules/lexical_rich_text#richtextextension) - Rich Text editor (QuoteNode, HeadingNode), return creates a ParagraphNode by default (multiple ParagraphNode per document)

@lexical/table

- [TableExtension](/docs/api/modules/lexical_table#tableextension) - TableNode, TableRowNode, TableCellNode

@lexical/tailwind

- [TailwindExtension](/docs/api/modules/lexical_tailwind#tailwindextension) - A theme configuration that uses Tailwind classes
