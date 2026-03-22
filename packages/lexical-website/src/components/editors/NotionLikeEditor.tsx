/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {TabIndentationExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {ListExtension} from '@lexical/list';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension} from 'lexical';
import {useState} from 'react';

import {DragPlugin} from './plugins/DragPlugin';
import {SlashMenuPlugin} from './plugins/SlashMenuPlugin';

const theme = {
  heading: {
    h1: 'mt-2 mb-1 text-[1.75rem] font-bold leading-[1.25]',
    h2: 'mt-2 mb-[0.15rem] text-[1.3rem] font-semibold leading-[1.3]',
    h3: 'mt-[0.4rem] mb-[0.1rem] text-[1.1rem] font-semibold leading-[1.35]',
  },
  list: {
    listitem: 'my-[0.1rem] leading-[1.6]',
    ol: 'my-[0.2rem] ml-5 p-0',
    ul: 'my-[0.2rem] ml-5 p-0',
  },
  paragraph: 'my-0 py-0.5 leading-[1.6]',
  quote:
    'my-[0.4rem] border-l-[3px] [border-left-style:solid] border-zinc-300 pl-3.5 italic text-zinc-500 dark:border-zinc-700 dark:text-zinc-400',
  text: {
    bold: 'font-bold',
    code: 'rounded-[3px] bg-[rgba(135,131,120,0.15)] px-[0.3em] py-[0.1em] font-mono text-[0.875em] dark:bg-white/10',
    italic: 'italic',
  },
};

const editorExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    ListExtension,
    TabIndentationExtension,
  ],
  name: '@lexical/website/notion-like-editor',
  namespace: '@lexical/website/notion-like-editor',
  theme,
});

export default function NotionLikeEditor() {
  const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);

  return (
    <LexicalExtensionComposer
      extension={editorExtension}
      contentEditable={null}>
      <div className="relative h-[400px] w-full overflow-y-auto rounded-lg border border-solid border-zinc-200 bg-white dark:border-white/[0.12] dark:bg-[#1f1f21] max-[996px]:h-[260px]">
        <div className="relative min-h-full" ref={setAnchorElem}>
          <ContentEditable
            className="min-h-full px-14 py-5 outline-none"
            aria-label="Rich text editor"
            aria-placeholder="Type '/' for commands..."
            placeholder={
              <div className="pointer-events-none absolute left-14 top-[22px] select-none text-[0.95rem] text-zinc-400">
                Type &apos;/&apos; for commands...
              </div>
            }
          />
          <SlashMenuPlugin />
          {anchorElem ? <DragPlugin anchorElem={anchorElem} /> : null}
        </div>
      </div>
    </LexicalExtensionComposer>
  );
}
