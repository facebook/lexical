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
  configExtension,
  defineExtension,
} from 'lexical';
import {useMemo} from 'react';

import {
  AIExtension,
  type AIExtensionConfig,
  defaultCreateWorker,
} from './ai/AIExtension';
import {Toolbar, ToolbarExtension} from './ToolbarExtension';
import {useExtensionSignalValue} from './utils/useExtensionHooks';

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
  'Lexical was created by Dominic Gannaway in London while working at Meta and is now maintained by Bob Ippolito in San Francisco, Ivaylo Pavlov at Bloomberg in London, and Gerard Rovira and Maksim Horbachevsky at Meta in New York. Ivaylo Pavlov built the table and drag-and-drop plugins, James Fitzsimmons in Melbourne contributed collaborative editing through Atticus, and Alessio Gravili in Vancouver contributed while working at Figma.';

function createEditorExtension(createWorker: () => Worker) {
  return defineExtension({
    $initialEditorState: () => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode(SAMPLE_TEXT)),
      );
    },
    dependencies: [
      RichTextExtension,
      HistoryExtension,
      TabIndentationExtension,
      configExtension(AIExtension, {createWorker}),
      ToolbarExtension,
    ],
    name: '@lexical/agent-example/editor',
    namespace: '@lexical/agent-example/editor',
    theme,
  });
}

export interface EditorProps {
  createWorker?: AIExtensionConfig['createWorker'];
}

export function Editor({createWorker = defaultCreateWorker}: EditorProps) {
  const extension = useMemo(
    () => createEditorExtension(createWorker),
    [createWorker],
  );
  return (
    <LexicalExtensionComposer extension={extension} contentEditable={null}>
      <EditorContent />
    </LexicalExtensionComposer>
  );
}

function EditorContent() {
  return (
    <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-solid border-black/10 shadow-sm dark:border-white/10 dark:bg-stone-800">
      <Toolbar />
      <div className="relative">
        <ContentEditable
          className="min-h-55 overflow-y-auto p-4 text-base leading-relaxed text-wrap outline-none"
          aria-label="Rich text editor"
          aria-placeholder="Enter some text..."
          placeholder={
            <div className="pointer-events-none absolute top-4 left-4 text-zinc-400 select-none">
              Enter some text...
            </div>
          }
        />
      </div>
      <LoadingIndicator />
    </div>
  );
}

function LoadingIndicator() {
  const modelStatus = useExtensionSignalValue(AIExtension, 'modelStatus');
  const loadProgress = useExtensionSignalValue(AIExtension, 'loadProgress');

  if (modelStatus !== 'loading') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 border-t border-solid border-black/5 bg-zinc-50 px-4 py-2 text-sm text-zinc-500 dark:border-white/5 dark:bg-zinc-800 dark:text-zinc-400">
      <span className="animate-pulse">
        Loading model
        {loadProgress !== null ? ` ${loadProgress}%` : '...'}
      </span>
      {loadProgress !== null && (
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{width: `${loadProgress}%`}}
          />
        </div>
      )}
    </div>
  );
}
