/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$convertFromMarkdownString} from '@lexical/markdown';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {defineExtension} from 'lexical';
import {useCallback, useMemo} from 'react';

import {
  MARKDOWN_TRANSFORMERS,
  MarkdownExtension,
} from './extensions/MarkdownExtension';
import {MarkdownPreviewPlugin} from './plugins/MarkdownPreviewPlugin';

const STORAGE_KEY = '@lexical/markdown-editor-example/document';

const DEMO_MARKDOWN = `# Markdown Editor

This is a **WYSIWYG** editor synchronized with a *live markdown preview*.
Try editing on the left — the markdown on the right updates as you type.

## Try the inline shortcuts

Type any of the following at the start of a line (or around text) to see the
markdown shortcut transform fire:

- \`# \`, \`## \`, \`### \` for headings
- \`**bold**\`, \`*italic*\`, \`***both***\`
- Wrap text in \`backticks\` for inline code
- \`- \` or \`1. \` for unordered / ordered lists
- \`- [ ] \` and \`- [x] \` for check lists

## Lists

1. Ordered list item one
2. Ordered list item two
3. Ordered list item three

- Bullet one
- Bullet two
- Bullet three

## Things to do

- [x] Define a markdown extension
- [x] Wire up the live preview
- [ ] Ship it
`;

const theme = {
  heading: {
    h1: 'mb-2 text-3xl font-bold',
    h2: 'mb-2 text-2xl font-bold',
    h3: 'mb-1 text-xl font-semibold',
  },
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
  text: {
    bold: 'font-bold',
    code: 'rounded bg-zinc-200/70 px-1 py-0.5 font-mono text-[0.9em] dark:bg-zinc-700/60',
    italic: 'italic',
  },
};

function loadInitialMarkdown(): string {
  if (typeof window === 'undefined') {
    return DEMO_MARKDOWN;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored ?? DEMO_MARKDOWN;
}

const initialMarkdown = loadInitialMarkdown();

const markdownEditorExtension = defineExtension({
  $initialEditorState: () => {
    $convertFromMarkdownString(initialMarkdown, MARKDOWN_TRANSFORMERS);
  },
  dependencies: [MarkdownExtension],
  name: '@lexical/markdown-editor-example/Editor',
  namespace: '@lexical/markdown-editor-example',
  theme,
});

export default function Editor() {
  const handlePreviewChange = useCallback((markdown: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, markdown);
    }
  }, []);

  const transformers = useMemo(() => MARKDOWN_TRANSFORMERS, []);

  return (
    <LexicalExtensionComposer
      extension={markdownEditorExtension}
      contentEditable={null}>
      <div className="grid h-full w-full grid-cols-1 overflow-hidden rounded-2xl border border-solid border-black/10 md:grid-cols-2 dark:border-white/10 dark:bg-stone-800">
        <div className="relative flex min-h-0 flex-col border-b [border-bottom-style:solid] border-b-black/10 md:border-r md:border-b-0 md:[border-right-style:solid] md:border-r-black/10 dark:border-b-white/10 dark:md:border-r-white/10">
          <div className="flex items-center justify-between border-b [border-bottom-style:solid] border-b-black/10 bg-zinc-50 px-4 py-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:border-b-white/10 dark:bg-zinc-800 dark:text-zinc-400">
            Editor
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
          <div className="flex items-center justify-between border-b [border-bottom-style:solid] border-b-black/10 bg-zinc-50 px-4 py-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:border-b-white/10 dark:bg-zinc-800 dark:text-zinc-400">
            <span>Markdown</span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem(STORAGE_KEY);
                  window.location.reload();
                }
              }}
              className="cursor-pointer rounded-md border border-solid border-transparent bg-transparent px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-500 normal-case transition-colors duration-150 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700">
              Reset
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-white dark:bg-stone-800">
            <MarkdownPreviewPlugin
              transformers={transformers}
              onChange={handlePreviewChange}
            />
          </div>
        </div>
      </div>
    </LexicalExtensionComposer>
  );
}
