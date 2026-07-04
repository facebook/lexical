/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {configExtension, defineExtension} from 'lexical';

import {
  MarkdownPersistenceExtension,
  RESET_MARKDOWN_COMMAND,
} from './extensions/MarkdownPersistenceExtension';
import {ToolbarStateExtension} from './extensions/ToolbarStateExtension';
import {MarkdownPreviewPlugin} from './plugins/MarkdownPreviewPlugin';
import {ToolbarPlugin} from './plugins/ToolbarPlugin';

const STORAGE_KEY = '@lexical/dev-mdast-editor-example/document';

const DEMO_MARKDOWN = `# Mdast Editor

This is a **WYSIWYG** editor built on [@lexical/mdast](https://github.com/facebook/lexical),
which parses with *micromark* — the same CommonMark + GFM parser used by remark —
and keeps the markdown on the right in sync as you type.

## Try the inline shortcuts

- \`# \`, \`## \`, \`### \` for headings
- \`**bold**\`, \`*italic*\`, \`***both***\`, \`~~strikethrough~~\`
- Wrap text in \`backticks\` for inline code
- \`[text](url)\` for links
- \`- \` or \`1. \` for lists, \`- [ ] \` / \`- [x] \` for check lists
- \`> \` for a blockquote, \`\`\`\`\`js\`\`\` + Enter for a code block

## Round-trip fidelity

The original syntax is preserved on the nodes, so what you paste is what
you export — bullet styles, code fences, setext headings, hard breaks:

> Blockquotes survive round-trips,
> including *inline formatting*.

1. Ordered list item one
2. Ordered list item two

- [x] Streaming shortcuts share the import grammar
- [x] Syntax preserved via NodeState
- [ ] Ship it

---

\`\`\`ts
const editor = buildEditorFromExtensions({
  name: 'editor',
  dependencies: [MdastShortcutsExtension],
});
\`\`\`
`;

const theme = {
  code: 'my-2 block rounded-md bg-zinc-100 p-3 font-mono text-sm whitespace-pre dark:bg-zinc-900',
  heading: {
    h1: 'mb-2 text-3xl font-bold',
    h2: 'mb-2 text-2xl font-bold',
    h3: 'mb-1 text-xl font-semibold',
  },
  link: 'text-blue-600 underline dark:text-blue-400',
  list: {
    checklist: 'list-none pl-0',
    listitem: 'mx-6 my-0.5',
    listitemChecked:
      'relative list-none pl-6 line-through text-zinc-500 before:absolute before:top-0.5 before:left-0 before:flex before:h-4 before:w-4 before:items-center before:justify-center before:rounded-sm before:border before:border-solid before:border-zinc-400 before:bg-blue-500 before:text-[10px] before:leading-none before:text-white before:content-["✓"]',
    listitemUnchecked:
      'relative list-none pl-6 before:absolute before:top-0.5 before:left-0 before:h-4 before:w-4 before:rounded-sm before:border before:border-solid before:border-zinc-400 before:bg-transparent before:content-[""]',
    nested: {
      listitem: 'list-none',
    },
    ol: 'm-0 list-decimal pl-6',
    ul: 'm-0 list-disc pl-6',
  },
  paragraph: 'my-1',
  quote:
    'my-2 border-l-4 border-solid border-zinc-300 pl-3 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300',
  text: {
    bold: 'font-bold',
    code: 'rounded bg-zinc-200/70 px-1 py-0.5 font-mono text-[0.9em] dark:bg-zinc-700/60',
    italic: 'italic',
    strikethrough: 'line-through',
  },
};

const mdastEditorExtension = defineExtension({
  dependencies: [
    configExtension(MarkdownPersistenceExtension, {
      defaultMarkdown: DEMO_MARKDOWN,
      storageKey: STORAGE_KEY,
    }),
    ToolbarStateExtension,
  ],
  name: '@lexical/dev-mdast-editor-example/Editor',
  namespace: '@lexical/dev-mdast-editor-example',
  theme,
});

function ResetButton() {
  const [editor] = useLexicalComposerContext();
  return (
    <button
      type="button"
      onClick={() => editor.dispatchCommand(RESET_MARKDOWN_COMMAND, undefined)}
      className="cursor-pointer rounded-md border border-solid border-transparent bg-transparent px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-500 normal-case transition-colors duration-150 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700">
      Reset
    </button>
  );
}

export default function Editor() {
  return (
    <LexicalExtensionComposer
      extension={mdastEditorExtension}
      contentEditable={null}>
      <div className="grid h-full w-full grid-cols-1 overflow-hidden rounded-2xl border border-solid border-black/10 md:grid-cols-2 dark:border-white/10 dark:bg-stone-800">
        <div className="relative flex min-h-0 flex-col border-b [border-bottom-style:solid] border-b-black/10 md:border-r md:border-b-0 md:[border-right-style:solid] md:border-r-black/10 dark:border-b-white/10 dark:md:border-r-white/10">
          <div className="flex h-11 shrink-0 items-center gap-1 border-b [border-bottom-style:solid] border-b-black/10 bg-zinc-50 px-2 dark:border-b-white/10 dark:bg-zinc-800">
            <ToolbarPlugin />
          </div>
          <div className="relative flex-1 overflow-auto">
            <ContentEditable
              className="min-h-full p-4 text-base leading-relaxed text-wrap outline-none"
              aria-label="Markdown editor"
              aria-placeholder="Start writing markdown..."
              placeholder={
                <div className="pointer-events-none absolute top-4 left-4 text-zinc-400 select-none">
                  Start writing markdown...
                </div>
              }
            />
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="flex h-11 shrink-0 items-center justify-between border-b [border-bottom-style:solid] border-b-black/10 bg-zinc-50 px-4 dark:border-b-white/10 dark:bg-zinc-800">
            <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Markdown
            </span>
            <ResetButton />
          </div>
          <div className="flex-1 overflow-auto bg-white dark:bg-stone-800">
            <MarkdownPreviewPlugin />
          </div>
        </div>
      </div>
    </LexicalExtensionComposer>
  );
}
