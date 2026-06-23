# `@lexical/mdast`

[![See API Documentation](https://lexical.dev/img/see-api-documentation.svg)](https://lexical.dev/docs/api/modules/lexical_mdast)

An alternative to `@lexical/markdown` that is built on the
[micromark](https://github.com/micromark/micromark) /
[mdast](https://github.com/syntax-tree/mdast) ecosystem.

Where `@lexical/markdown` ships its own regular-expression based parser, this
package delegates Markdown parsing and serialization to `micromark` and
`mdast-util-*`. That means:

- **CommonMark + GFM compliance** comes from the same battle-tested parser used
  by `remark`, including tables, task lists, strikethrough and autolinks.
- **Extensions compose.** A `MdastTransformer` bundles the micromark syntax
  extension, the `mdast-util` extension, and the Lexical node mapping in one
  object, so adding a Markdown feature is a single dependency away.
- **Streaming shortcuts.** `registerMarkdownShortcuts` feeds keystrokes into
  micromark's incremental tokenizer to recognize Markdown shortcuts as you
  type, using the exact same grammar as the full-document importer.

## Usage

```ts
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  registerMarkdownShortcuts,
} from '@lexical/mdast';

editor.update(() => {
  $convertFromMarkdownString('# Hello *world*');
});

const markdown = editor.read(() => $convertToMarkdownString());

const unregister = registerMarkdownShortcuts(editor);
```

Or, the recommended extension-first wiring:

```ts
import {MdastExtension, MdastShortcutsExtension} from '@lexical/mdast';
import {buildEditorFromExtensions} from '@lexical/extension';

const editor = buildEditorFromExtensions({
  name: 'editor',
  dependencies: [MdastExtension, MdastShortcutsExtension],
});
```
