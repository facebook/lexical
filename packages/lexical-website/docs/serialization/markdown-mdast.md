# Markdown with @lexical/mdast

:::warning Experimental

`@lexical/mdast` and everything described on this page are marked
`@experimental` and may change between any two Lexical releases —
including breaking renames, signature changes, or behavior changes —
until the API stabilizes. We track issues and proposals in the
[GitHub repo](https://github.com/facebook/lexical); breaking changes
will be called out in release notes.

The existing `@lexical/markdown` package is unchanged and remains the
supported default for production apps that don't want to track an
experimental API.

:::

[`@lexical/mdast`](/docs/api/modules/lexical_mdast) is an alternative
to `@lexical/markdown` built on the
[micromark](https://github.com/micromark/micromark) /
[mdast](https://github.com/syntax-tree/mdast) ecosystem. Where
`@lexical/markdown` ships its own regular-expression based parser,
`@lexical/mdast` delegates parsing and serialization to the same
spec-compliant parser used by `remark`, and recognizes Markdown typing
shortcuts by feeding keystrokes back through that same grammar — there
is no second set of regular expressions to keep in sync with import.

The trade-off is bundle weight: the micromark/mdast stack costs
roughly 26 kB (min+gzip) more than the bespoke `@lexical/markdown`
implementation in an equivalent configuration, in exchange for
CommonMark + GFM compliance, one grammar shared by import and typing
shortcuts, and the micromark/mdast extension ecosystem (footnotes,
frontmatter, directives, ...) as the path for new syntax.

## Extensions are the unit of configuration

Modeled on `@lexical/html`'s `DOMImportExtension`, the package is
configured **exclusively** through the
[extension system](/docs/extensions/intro). Each feature extension
ships the nodes it needs and contributes its import/export rules (and
the micromark grammar that tokenizes them) to the core
`MdastImportExtension` registry. There is no transformer list to
curate and no `registerMarkdownShortcuts` call:

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
    dependencies: [
      // CommonMark: headings, quotes, lists, code, links, thematic breaks
      MdastCommonMarkExtension,
      // GFM: strikethrough, task lists, literal autolinks, tables
      MdastGfmExtension,
      // Import + export (MdastExtension bundles both directions)
      MdastExtension,
      // Streaming typing shortcuts, driven by the registry's grammar
      MdastShortcutsExtension,
    ],
    name: '[root]',
  }),
);

editor.update(() => $convertFromMarkdownString('# Hello *world*'));
const markdown = editor.read(() => $convertToMarkdownString());
```

The bundles unpack into granular, one-construct-each extensions
(`MdastHeadingExtension`, `MdastBlockquoteExtension`,
`MdastTaskListExtension`, ...) for editors that only want some of the
grammar — see the
[full list](/docs/extensions/included-extensions) or the
[package README](/docs/packages/lexical-mdast). Granular
configurations degrade gracefully: unsupported constructs import as
their content (a table becomes its cell text), and typing shortcuts
only fire for constructs the editor can represent (`> ` stays literal
without `MdastBlockquoteExtension`).

## Import and export are split

`MdastImportExtension` owns the compiled registry and parsing;
`MdastExportExtension` compiles the same registry into a serializer
(`$convertToMarkdownString`). An editor that never converts back to
Markdown simply omits `MdastExportExtension` and doesn't bundle
`mdast-util-to-markdown`. `MdastExtension` is a convenience bundle of
both directions.

## Round-trips are minimally different

The literal syntax of each construct is preserved on the Lexical
nodes with [NodeState](/docs/concepts/node-state): list bullet
`-`/`*`/`+`, ordered delimiter `.`/`)`, code fence style and
info-string meta, setext vs ATX headings, hard-break style, soft line
breaks, thematic break marker, table column alignment, `_` vs `*`
emphasis, and link style (`[text](url)` vs `<autolink>` vs bare GFM
literal). Normalization is never forced; nodes created in the editor
defer to the document-level serialization options, which can be
configured by contributing `mdast-util-to-markdown` options through
`toMarkdownExtensions`.

## unified / remark interop

The mdast tree itself is part of the API, so editor content can flow
through the wider [unified](https://unifiedjs.com/) ecosystem — remark
plugins, `remark-rehype` for HTML rendering, tree diffing:

```ts
import {$convertFromMdast, $convertToMdast} from '@lexical/mdast';

// Editor -> mdast tree (before serialization).
const tree = editor.read(() => $convertToMdast());
// ... run remark plugins / transform the tree ...
// mdast tree -> editor.
editor.update(() => $convertFromMdast(tree));
```

## Custom syntax

New syntax is added the same way the built-in features are built: an
extension contributes import/export rules and the micromark/mdast
grammar for its construct, and ships the nodes those rules need. See
the [package README](/docs/packages/lexical-mdast) for a template.

## Comparison with @lexical/markdown

| | `@lexical/markdown` | `@lexical/mdast` |
| --- | --- | --- |
| Parser | bespoke regular expressions | micromark (CommonMark + GFM spec-compliant) |
| Configuration | transformer arrays | extensions (nodes ship with their rules) |
| Typing shortcuts | separate matchers | same grammar as document import |
| Syntax preservation | partial | extensive, via NodeState |
| mdast tree access | – | `$convertToMdast` / `$convertFromMdast` |
| New syntax | custom transformer | micromark/mdast extension ecosystem |
| Bundle cost | baseline | ~+26 kB min+gzip |
| Stability | stable | **experimental** |
