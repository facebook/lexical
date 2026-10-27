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

### Text and Markdown syntax

The default exporter treats `TextNode` content as literal text. Characters that
could become character references, HTML, or link syntax are escaped, including
when a construct spans several styled text nodes or a partial selection.
Import reads backslash escapes and decimal and hexadecimal character references
once. Decoded characters remain text rather than new Markdown syntax. Named
references remain literal text, matching legacy import behavior. Reference-looking
literal text is escaped on export so a subsequent Markdown parser preserves it.

Links have a `LinkNode` representation. Angle URI and email autolinks import as
links and export using normal link syntax. Code spans and fenced code blocks
keep their own literal-content rules. With `shouldPreserveNewLines`, soft source lines remain separate blocks; real
hard breaks use `LineBreakNode`, including their source marker spelling. Literal
backslashes at block boundaries remain text. Editing, copying and JSON use the
normal node lifecycle rather than hidden state attached to paragraph boundaries.
Copied hard breaks retain their marker so they do not become soft breaks when
exported; earlier versions discarded that source state during copying.

The default transformers do not interpret raw HTML. HTML-looking text imports
as text and exports escaped. Applications that intentionally support raw HTML
or other source constructs should represent them with custom nodes and
transformers, rather than relying on unescaped `TextNode` content. An export
transformer owns any Markdown syntax it authors. Use its `exportFormat` callback
for literal text and `exportChildren` for ordinary child content. Returning an
unchanged callback result or their concatenation in call order delegates that
content to the surrounding formatting stream; nodes
are not exported again. Wrapping or rewriting a result instead produces an
opaque Markdown string that is emitted unchanged. Such transformers must supply
complete syntax and account for its boundaries with surrounding content. Ordinary
child inspection is memoized within each block export, including overlapping
subtrees, so inspecting content does not repeat descendant transformers.

There're three types of transformers:

- **Element transformer** handles top level elements (lists, headings, quotes, tables or code blocks)
- **Text format transformer** applies text range formats defined in `TextFormatType` (bold, italic, underline, strikethrough, code, subscript and superscript)
- **Text match transformer** relies on matching leaf text node content

See `MarkdownTransformers.js` for transformer implementation examples
