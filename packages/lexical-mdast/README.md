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

## Configured through extensions

`@lexical/mdast` is set up **exclusively** through the Lexical extension
system, modelled on `@lexical/html`'s `DOMImportExtension`. Each feature
extension ships the nodes it needs and contributes its import/export rules (and
the micromark/mdast extensions that tokenize them) to the core
`MdastExtension` registry:

| Extension | Ships | Adds |
| --- | --- | --- |
| `MdastRichTextExtension` | `HeadingNode`, `QuoteNode` | headings, block quotes |
| `MdastListExtension` | `ListNode`, `ListItemNode` | ordered/unordered/task lists |
| `MdastCodeExtension` | `CodeNode` | fenced & indented code |
| `MdastLinkExtension` | `LinkNode` | links, GFM autolinks |
| `MdastStrikethroughExtension` | – | GFM `~~strikethrough~~` |
| `MdastTableExtension` | `TableNode`, … | GFM tables |
| `MdastCommonMarkExtension` | – | bundle of the five above (no tables) |
| `MdastShortcutsExtension` | – | streaming keyboard shortcuts |

## Usage

```ts
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  MdastShortcutsExtension,
  MdastTableExtension,
} from '@lexical/mdast';
import {buildEditorFromExtensions} from '@lexical/extension';
import {defineExtension} from 'lexical';

const editor = buildEditorFromExtensions(
  defineExtension({
    // MdastShortcutsExtension pulls in MdastCommonMarkExtension; add
    // MdastTableExtension for GFM tables.
    dependencies: [MdastShortcutsExtension, MdastTableExtension],
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
`$getExtensionOutput(MdastExtension).$convertFromMarkdownString(...)` /
`.$convertToMarkdownString(...)`.

### Custom mappings

Because extensions are the unit of configuration, you add or override behavior
by contributing rules to `MdastExtension` from your own extension:

```ts
import {MdastExtension} from '@lexical/mdast';
import {configExtension, defineExtension} from 'lexical';

export const MyMdastExtension = defineExtension({
  name: 'my-mdast',
  nodes: [MyNode],
  dependencies: [
    configExtension(MdastExtension, {
      importRules: [{type: 'myMdastType', $import: $importMyNode}],
      exportRules: [{type: 'my-node', $export: $exportMyNode}],
      micromarkExtensions: [myMicromarkExtension()],
      mdastExtensions: [myMdastExtension()],
      toMarkdownExtensions: [myToMarkdownExtension()],
    }),
  ],
});
```
