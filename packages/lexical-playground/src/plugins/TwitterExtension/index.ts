/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertNodeToNearestRoot} from '@lexical/utils';
import {
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  defineExtension,
  LexicalCommand,
} from 'lexical';

import {$createTweetNode, TweetNode} from '../../nodes/TweetNode';

export const INSERT_TWEET_COMMAND: LexicalCommand<string> = createCommand(
  'INSERT_TWEET_COMMAND',
);

export const TwitterExtension = defineExtension({
  name: '@lexical/playground/Twitter',
  nodes: [TweetNode],
  register: (editor) =>
    editor.registerCommand<string>(
      INSERT_TWEET_COMMAND,
      (payload) => {
        const tweetNode = $createTweetNode(payload);
        $insertNodeToNearestRoot(tweetNode);

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
});
