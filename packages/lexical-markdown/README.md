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
Import reads backslash escapes and decimal, hexadecimal, and named character
references once. Their decoded characters remain text, not new Markdown syntax.
Source spelling of references and escapes is not preserved.

Named-reference decoding is editor-scoped. `MarkdownExtension` configures its
`decodeNamedCharacterReference` function for imports, detached-node generation,
and link shortcuts. The default uses native HTML parsing and does not include
the full entity table. Existing editors without this extension use the same
native default. Without a document, that default preserves named references as
text, as earlier DOM-free imports did; numeric references and escapes still work.

For full named-reference decoding on a server or in a Web Worker, explicitly
import `SSRMarkdownExtension`. It configures `MarkdownExtension` with the full
table, without requiring a document, a bundler condition, or global settings:

```ts
import {buildEditorFromExtensions} from '@lexical/extension';
import {SSRMarkdownExtension} from '@lexical/markdown/SSRMarkdownExtension';

const editor = buildEditorFromExtensions(SSRMarkdownExtension);
```

Register the nodes required by your transformers separately, as with existing
Markdown APIs. This extension only configures decoding; it does not register
nodes, shortcuts, or a DOM implementation. Legacy `createEditor()` callers can
keep using native decoding, or migrate to `buildEditorFromExtensions` to choose
the DOM-free decoder. Do not re-export the SSR entry from a shared browser
barrel if that barrel retains all exports.

Applications can instead use `configExtension(MarkdownExtension, {
decodeNamedCharacterReference: customDecoder})`. The synchronous function receives
a complete bare entity name, without `&` and `;`, and returns its text or
`undefined` for an unknown name. Lexical owns reference matching, numeric
decoding, and backslash handling in a single pass; decoder output is never
reinterpreted as syntax. Configuration belongs to each editor, including nested
editors, and is not serialized into document state.

Where `Element.setHTML` is available, the browser decoder uses that safe native
API without creating a Trusted Types policy. Older browsers use the native
string HTML sink; decoding named references throws if strict Trusted Types
blocks that sink. Such applications can explicitly use `SSRMarkdownExtension`
or a custom decoder, accepting its cost. The default browser path neither bundles that fallback
nor weakens CSP or installs a policy.

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
unchanged callback result, their concatenation in call order, or repetitions of
either form delegates that content to the surrounding formatting stream; nodes
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
