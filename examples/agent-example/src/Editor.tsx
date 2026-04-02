/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {TabIndentationExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from 'lexical';

import {AIExtension} from './ai/AIExtension';
import {useAI} from './ai/useAI';
import {ToolbarPlugin} from './plugins/ToolbarPlugin';

const theme = {
  heading: {
    h1: 'mb-2 text-3xl font-bold',
    h2: 'mb-2 text-2xl font-bold',
    h3: 'mb-1 text-xl font-semibold',
  },
  paragraph: 'my-0',
  quote:
    'my-2 border-l-4 [border-left-style:solid] border-zinc-300 pl-4 italic text-zinc-500 dark:border-zinc-600 dark:text-zinc-400',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
};

const SAMPLE_TEXT =
  'Lexical is an extensible JavaScript web text-editor framework with an emphasis on reliability, accessibility, and performance. It provides a robust foundation for building rich text editing experiences. Lexical supports features like real-time collaboration, custom nodes, and plugin architectures. The framework is designed to be lightweight and can run in any modern browser including mobile Safari.';

const agentEditorExtension = defineExtension({
  $initialEditorState: () => {
    const root = $getRoot();
    const paragraph = $createParagraphNode();
    paragraph.append($createTextNode(SAMPLE_TEXT));
    root.append(paragraph);
  },
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    TabIndentationExtension,
    AIExtension,
  ],
  name: '@lexical/agent-example/editor',
  namespace: '@lexical/agent-example/editor',
  theme,
});

export default function Editor() {
  return (
    <LexicalExtensionComposer
      extension={agentEditorExtension}
      contentEditable={null}>
      <EditorContent />
    </LexicalExtensionComposer>
  );
}

function EditorContent() {
  const ai = useAI();

  return (
    <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-solid border-black/10 shadow-sm dark:border-white/10 dark:bg-stone-800">
      <ToolbarPlugin ai={ai} />
      <div className="relative">
        <ContentEditable
          className="min-h-[220px] overflow-y-auto p-4 text-base leading-relaxed text-wrap outline-none"
          aria-label="Rich text editor"
          aria-placeholder="Enter some text..."
          placeholder={
            <div className="pointer-events-none absolute top-4 left-4 text-zinc-400 select-none">
              Enter some text...
            </div>
          }
        />
      </div>
      {ai.modelStatus === 'loading' && (
        <div className="flex items-center gap-2 border-t border-solid border-black/5 bg-zinc-50 px-4 py-2 text-sm text-zinc-500 dark:border-white/5 dark:bg-zinc-800 dark:text-zinc-400">
          <span className="animate-pulse">
            Loading model
            {ai.loadProgress !== null ? ` ${ai.loadProgress}%` : '...'}
          </span>
          {ai.loadProgress !== null && (
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{width: `${ai.loadProgress}%`}}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
