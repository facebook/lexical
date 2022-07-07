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

import {$createTweetNode, TweetNode} from '../nodes/TweetNode';

export const INSERT_TWEET_COMMAND: LexicalCommand<string> = createCommand();

export default function TwitterPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TweetNode])) {
      throw new Error('TwitterPlugin: TweetNode not registered on editor');
    }

    return editor.registerCommand<string>(
      INSERT_TWEET_COMMAND,
      (payload) => {
        const selection = $getSelection();
        const tweetNode = $createTweetNode(payload);
        if ($isRangeSelection(selection)) {
          const focusNode = selection.focus.getNode();
          focusNode.getTopLevelElementOrThrow().insertAfter(tweetNode);
        } else if ($isNodeSelection(selection) || $isGridSelection(selection)) {
          const nodes = selection.getNodes();
          nodes[nodes.length - 1]
            .getTopLevelElementOrThrow()
            .insertAfter(tweetNode);
        } else {
          const root = $getRoot();
          root.append(tweetNode);
        }
        const paragraphNode = $createParagraphNode();
        tweetNode.insertAfter(paragraphNode);
        paragraphNode.select();

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
