/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createParagraphNode, $getSelection, $isRangeSelection} from 'lexical';
import {useEffect} from 'react';

import {$createTweetNode, TweetNode} from '../nodes/TweetNode.jsx';

export default function TwitterPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TweetNode])) {
      throw new Error('TwitterPlugin: TweetNode not registered on editor');
    }

    return editor.registerCommand('insertTweet', (payload) => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const focusNode = selection.focus.getNode();
        if (focusNode !== null) {
          const tweetNode = $createTweetNode(payload);
          selection.focus
            .getNode()
            .getTopLevelElementOrThrow()
            .insertAfter(tweetNode);
          const paragraphNode = $createParagraphNode();
          tweetNode.insertAfter(paragraphNode);
          paragraphNode.select();
        }
      }
      return true;
    });
  }, [editor]);
  return null;
}
