# `@lexical/markdown`

[![See API Documentation](https://lexical.dev/img/see-api-documentation.svg)](https://lexical.dev/docs/api/modules/lexical_markdown)

This package contains markdown helpers for Lexical: import, export and shortcuts.

## Import and export
```js
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';

editor.update(() => {
  const markdown = $convertToMarkdownString(TRANSFORMERS);
  ...
});

editor.update(() => {
  $convertFromMarkdownString(markdown, TRANSFORMERS);
});
```

It can also be used for initializing editor's state from markdown string. Here's an example with react `<RichTextPlugin>`
```jsx
<LexicalComposer initialConfig={{
  editorState: () => $convertFromMarkdownString(markdown, TRANSFORMERS)
}}>
  <RichTextPlugin />
</LexicalComposer>
```

## Shortcuts
Can use `<MarkdownShortcutPlugin>` if using React
```jsx
import { TRANSFORMERS } from '@lexical/markdown';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';

<LexicalComposer>
  <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
</LexicalComposer>
```

Or `registerMarkdownShortcuts` to register it manually:
```js
import {
  registerMarkdownShortcuts,
  TRANSFORMERS,
} from '@lexical/markdown';

const editor = createEditor(...);
registerMarkdownShortcuts(editor, TRANSFORMERS);
```

## Paste
`MarkdownPasteExtension` offers to convert pasted text that looks like markdown into rich text. Pasting itself is
unchanged. When the clipboard's plain text looks like markdown (`looksLikeMarkdown`, or your own `isMarkdown`) and the
pasted content still shows the markdown syntax, which is the case for plain text and for HTML copied from terminals or
code editors, the paste is published as the extension's `offer` signal. A prompt can then dispatch
`CONVERT_PASTED_MARKDOWN_COMMAND`, which replaces the pasted content with the imported markdown as one undoable update,
or `DISMISS_PASTED_MARKDOWN_COMMAND`. The next edit, selection change or Escape drops the offer.
```js
import {
  buildEditorFromExtensions,
  effect,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {
  CONVERT_PASTED_MARKDOWN_COMMAND,
  MarkdownPasteExtension,
  TRANSFORMERS,
} from '@lexical/markdown';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension} from 'lexical';

const editor = buildEditorFromExtensions({
  dependencies: [
    RichTextExtension,
    configExtension(MarkdownPasteExtension, {transformers: TRANSFORMERS}),
  ],
  name: 'app',
});
const {offer} = getExtensionDependencyFromEditor(
  editor,
  MarkdownPasteExtension,
).output;
effect(() => {
  // Show or hide your prompt; on accept:
  // editor.dispatchCommand(CONVERT_PASTED_MARKDOWN_COMMAND, undefined);
  showPrompt(offer.value !== null);
});
```

Transformers whose nodes are not registered on the editor are skipped. Nothing is offered inside a code block.

## Transformers
Markdown functionality relies on transformers configuration. It's an array of objects that define how certain text or nodes
are processed during import, export or while typing. `@lexical/markdown` package provides set of built-in transformers:
```js
// Element transformers
UNORDERED_LIST
CODE
HEADING
ORDERED_LIST
QUOTE

// Text format transformers
BOLD_ITALIC_STAR
BOLD_ITALIC_UNDERSCORE
BOLD_STAR
BOLD_UNDERSCORE
INLINE_CODE
ITALIC_STAR
ITALIC_UNDERSCORE
STRIKETHROUGH

// Text match transformers
LINK
```

And bundles of commonly used transformers:
- `TRANSFORMERS` - all built-in transformers
- `ELEMENT_TRANSFORMERS` - all built-in element transformers
- `MULTILINE_ELEMENT_TRANSFORMERS` - all built-in multiline element transformers
- `TEXT_FORMAT_TRANSFORMERS` - all built-in text format transformers
- `TEXT_MATCH_TRANSFORMERS` - all built-in text match transformers

Transformers are explicitly passed to markdown API allowing application-specific subset of markdown or custom transformers.

There're three types of transformers:

- **Element transformer** handles top level elements (lists, headings, quotes, tables or code blocks)
- **Text format transformer** applies text range formats defined in `TextFormatType` (bold, italic, underline, strikethrough, code, subscript and superscript)
- **Text match transformer** relies on matching leaf text node content

See `MarkdownTransformers.js` for transformer implementation examples
