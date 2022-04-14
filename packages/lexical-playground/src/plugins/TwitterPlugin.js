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
import {$createTweetNode, TweetNode} from '../nodes/TweetNode.jsx';

export const INSERT_TWEET_COMMAND: LexicalCommand<string> = createCommand();

export default function TwitterPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TweetNode])) {
      throw new Error('TwitterPlugin: TweetNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand(
        INSERT_TWEET_COMMAND,
        (payload) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }
          const focusNode = selection.focus.getNode();
          if (focusNode !== null) {
            const tweetNode = $createTweetNode(payload);
            const embedNode = $createEmbedNode();
            const topLevelNode = focusNode.getTopLevelElementOrThrow();
            topLevelNode.insertAfter(embedNode);
            embedNode.append(tweetNode);
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
