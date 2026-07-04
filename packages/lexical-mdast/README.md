# `@lexical/mdast`

[![See API Documentation](https://lexical.dev/img/see-api-documentation.svg)](https://lexical.dev/docs/api/modules/lexical_mdast)

An alternative to `@lexical/markdown` that is built on the
[micromark](https://github.com/micromark/micromark) /
[mdast](https://github.com/syntax-tree/mdast) ecosystem.

Where `@lexical/markdown` ships its own regular-expression based parser, this
package delegates Markdown parsing and serialization to `micromark` and
`mdast-util-*`. That means **CommonMark + GFM compliance** comes from the same
parser used by `remark`, and Markdown **shortcuts** are recognized by feeding
keystrokes back through that same parser — there is no second grammar to keep
in sync.

Like `@lexical/markdown`, the original syntax of a construct is preserved on
the Lexical nodes (the bullet character of a list, a code block's fence, and a
hard line break's style), so re-serializing produces **minimally different**
Markdown — `* a`/`+ b` bullets and `~~~` fences round-trip unchanged.

## Configured through extensions

`@lexical/mdast` is set up **exclusively** through the Lexical extension
system, modelled on `@lexical/html`'s `DOMImportExtension`. Each feature
extension ships the nodes it needs and contributes its import/export rules (and
the micromark/mdast extensions that tokenize them) to the core
`MdastImportExtension` registry:

CommonMark features:

| Extension | Ships | Adds |
| --- | --- | --- |
| `MdastHeadingExtension` | `HeadingNode` | ATX & setext headings |
| `MdastBlockquoteExtension` | `QuoteNode` | block quotes |
| `MdastListExtension` | `ListNode`, `ListItemNode` | ordered/unordered lists |
| `MdastCodeExtension` | `CodeNode` | fenced & indented code |
| `MdastLinkExtension` | `LinkNode` | links, `<autolinks>`, reference links |
| `MdastHorizontalRuleExtension` | `HorizontalRuleNode` | thematic breaks (`---`) |

GFM features:

| Extension | Ships | Adds |
| --- | --- | --- |
| `MdastStrikethroughExtension` | – | `~~strikethrough~~` |
| `MdastTaskListExtension` | – | task lists (`- [x] …`) |
| `MdastAutolinkLiteralExtension` | – | literal autolinks (bare `https://…` in prose) |
| `MdastTableExtension` | `TableNode`, … | tables |

Behavior and convenience bundles:

| Extension | Adds |
| --- | --- |
| `MdastCommonMarkExtension` | bundle of the six CommonMark extensions |
| `MdastGfmExtension` | bundle of the four GFM extensions |
| `MdastRichTextExtension` | bundle of heading + blockquote |
| `MdastExportExtension` | serialization back to Markdown (`$convertToMarkdownString`) |
| `MdastExtension` | bundle of `MdastImportExtension` + `MdastExportExtension` |
| `MdastShadowRootQuoteExtension` | opt-in: blockquotes as block containers (full-fidelity nested content) |
| `MdastShortcutsExtension` | streaming keyboard shortcuts |

Everything composes granularly and degrades gracefully: an editor with only
the extensions it wants imports unsupported constructs as their content
(a table becomes its cell text), and the typing shortcuts — driven by the
same registry — only fire for constructs the editor can represent (`> `
stays literal without `MdastBlockquoteExtension`).

Import and export are separate extensions: `MdastImportExtension` (and the
feature extensions that contribute to it) only parse, and
`MdastExportExtension` compiles the same registry into a serializer. An
editor that never converts back to Markdown simply omits
`MdastExportExtension` and doesn't bundle `mdast-util-to-markdown`. When you
want both directions without thinking about it, depend on `MdastExtension`,
which bundles the two.

## Usage

```ts
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  MdastCommonMarkExtension,
  MdastExtension,
  MdastGfmExtension,
  MdastShortcutsExtension,
} from '@lexical/mdast';
import {buildEditorFromExtensions} from '@lexical/extension';
import {defineExtension} from 'lexical';

const editor = buildEditorFromExtensions(
  defineExtension({
    // CommonMark + GFM grammar, import + export (MdastExtension), and
    // typing shortcuts. Swap bundles for individual feature extensions
    // to trim what you don't need.
    dependencies: [
      MdastCommonMarkExtension,
      MdastGfmExtension,
      MdastExtension,
      MdastShortcutsExtension,
    ],
    name: '[root]',
  }),
);

// Import / export run inside the editor; both are `$`-functions.
editor.update(() => {
  $convertFromMarkdownString('# Hello *world*');
});
const markdown = editor.read(() => $convertToMarkdownString());
```

The same API is available from the editor as
`$getExtensionOutput(MdastImportExtension).$convertFromMarkdownString(...)`
and
`$getExtensionOutput(MdastExportExtension).$convertToMarkdownString(...)`.

### Custom mappings

Because extensions are the unit of configuration, you add or override behavior
by contributing rules to `MdastImportExtension` from your own extension:

```ts
import {MdastImportExtension} from '@lexical/mdast';
import {configExtension, defineExtension} from 'lexical';

export const MyMdastExtension = defineExtension({
  name: 'my-mdast',
  nodes: [MyNode],
  dependencies: [
    configExtension(MdastImportExtension, {
      importRules: [{type: 'myMdastType', $import: $importMyNode}],
      exportRules: [{type: 'my-node', $export: $exportMyNode}],
      micromarkExtensions: [myMicromarkExtension()],
      mdastExtensions: [myMdastExtension()],
      toMarkdownExtensions: [myToMarkdownExtension()],
    }),
  ],
});
```
