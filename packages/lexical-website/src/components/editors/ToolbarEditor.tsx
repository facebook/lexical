/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {HistoryExtension} from '@lexical/history';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension} from 'lexical';

import ToolbarPlugin from './plugins/ToolbarPlugin';

const toolbarTheme = {
  heading: {
    h1: 'mb-2 text-[1.875rem] font-bold',
    h2: 'mb-2 text-2xl font-bold',
    h3: 'mb-1 text-[1.25rem] font-semibold',
  },
  paragraph: 'm-0',
  quote:
    'my-2 border-l-4 [border-left-style:solid] border-zinc-300 pl-4 italic text-zinc-500 dark:border-zinc-500 dark:text-zinc-400',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
};

const toolbarEditorExtension = defineExtension({
  dependencies: [RichTextExtension, HistoryExtension],
  name: '@lexical/website/toolbar-editor',
  namespace: '@lexical/website/toolbar-editor',
  theme: toolbarTheme,
});

export default function ToolbarEditor() {
  return (
    <LexicalExtensionComposer
      extension={toolbarEditorExtension}
      contentEditable={null}>
      <div className="relative h-[400px] w-full overflow-y-scroll rounded-lg border border-solid border-zinc-300 dark:border-white/[0.15] max-[996px]:h-[200px]">
        <ToolbarPlugin />
        <div className="relative h-[88%]">
          <ContentEditable
            className="h-full p-4 outline-none"
            aria-label="Rich text editor"
            aria-placeholder="Enter some text..."
            placeholder={
              <div className="pointer-events-none absolute left-4 top-4 select-none text-[#999]">
                Enter some text...
              </div>
            }
          />
        </div>
      </div>
    </LexicalExtensionComposer>
  );
}
