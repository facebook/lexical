/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$convertFromMarkdownString} from '@lexical/mdast';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useExtensionSignalValue} from '@lexical/react/useExtensionSignalValue';
import {HISTORY_MERGE_TAG} from 'lexical';
import {useState} from 'react';

import {MdastEditorExtension} from '../extensions/MdastEditorExtension';

/**
 * An editable Markdown source pane, synchronized in both directions:
 * editing the rich text editor re-serializes into this pane
 * ($convertToMarkdownString via the `markdown` signal), and typing in this
 * pane re-imports into the editor ($convertFromMarkdownString) on every
 * keystroke.
 *
 * While the pane is focused it shows the literal text being typed (a
 * `draft`) rather than the canonical serialization, so normalization
 * can't fight the caret mid-edit; on blur it snaps back to the canonical
 * round-trip output.
 */
export function MarkdownSourcePlugin() {
  const [editor] = useLexicalComposerContext();
  const markdown = useExtensionSignalValue(MdastEditorExtension, 'markdown');
  const [draft, setDraft] = useState<null | string>(null);
  return (
    <textarea
      aria-label="Markdown source"
      spellCheck={false}
      className="m-0 h-full w-full resize-none overflow-auto border-none bg-transparent p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 outline-none dark:text-zinc-200"
      value={draft !== null ? draft : markdown}
      onFocus={() => setDraft(markdown)}
      onBlur={() => setDraft(null)}
      onChange={event => {
        const text = event.target.value;
        setDraft(text);
        // Merge into one history entry so undo doesn't replay the pane
        // keystroke-by-keystroke.
        editor.update(
          () => {
            $convertFromMarkdownString(text);
          },
          {tag: HISTORY_MERGE_TAG},
        );
      }}
    />
  );
}
