/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isGridSelection,
  $isNodeSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
} from 'lexical';
import {useEffect} from 'react';

import {$createYouTubeNode, YouTubeNode} from '../nodes/YouTubeNode';

export const INSERT_YOUTUBE_COMMAND: LexicalCommand<string> = createCommand();

export default function YouTubePlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([YouTubeNode])) {
      throw new Error('YouTubePlugin: YouTubeNode not registered on editor');
    }

    return editor.registerCommand<string>(
      INSERT_YOUTUBE_COMMAND,
      (payload) => {
        const selection = $getSelection();
        const youTubeNode = $createYouTubeNode(payload);
        if ($isRangeSelection(selection)) {
          const focusNode = selection.focus.getNode();
          focusNode.getTopLevelElementOrThrow().insertAfter(youTubeNode);
        } else if ($isNodeSelection(selection) || $isGridSelection(selection)) {
          const nodes = selection.getNodes();
          nodes[nodes.length - 1]
            .getTopLevelElementOrThrow()
            .insertAfter(youTubeNode);
        } else {
          const root = $getRoot();
          root.append(youTubeNode);
        }
        const paragraphNode = $createParagraphNode();
        youTubeNode.insertAfter(paragraphNode);
        paragraphNode.select();

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
