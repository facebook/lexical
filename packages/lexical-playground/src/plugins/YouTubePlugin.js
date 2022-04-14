/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalCommand} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$findMatchingParent, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  createCommand,
  INSERT_TEXT_COMMAND,
} from 'lexical';
import {useEffect} from 'react';

import {$createEmbedNode, $isEmbedNode} from '../nodes/EmbedNode.jsx';
import {$createYouTubeNode, YouTubeNode} from '../nodes/YouTubeNode.jsx';

export const INSERT_YOUTUBE_COMMAND: LexicalCommand<string> = createCommand();

export default function YouTubePlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([YouTubeNode])) {
      throw new Error('YouTubePlugin: YouTubeNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand(
        INSERT_YOUTUBE_COMMAND,
        (payload) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }
          const focusNode = selection.focus.getNode();
          if (focusNode !== null) {
            const embedNode = $createEmbedNode();
            const youTubeNode = $createYouTubeNode(payload);
            const topLevelNode = focusNode.getTopLevelElementOrThrow();
            topLevelNode.insertAfter(embedNode);
            embedNode.append(youTubeNode);
            embedNode.insertAfter($createParagraphNode());
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        INSERT_TEXT_COMMAND,
        (payload) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }
          const focusNode = selection.focus.getNode();
          const parentEmbedNode = $findMatchingParent(focusNode, (node) =>
            $isEmbedNode(node),
          );
          return parentEmbedNode !== null;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor]);
  return null;
}
