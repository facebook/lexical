/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineImportRule, DOMImportExtension, sel} from '@lexical/html';
import {$insertNodeToNearestRoot} from '@lexical/utils';
import {
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  type LexicalCommand,
} from 'lexical';

import {$createTweetNode, TweetNode} from '../../nodes/TweetNode';

export const INSERT_TWEET_COMMAND: LexicalCommand<string> =
  /* @__PURE__ */ createCommand('INSERT_TWEET_COMMAND');

const TweetImportRule = /* @__PURE__ */ defineImportRule({
  $import: ctx => [$createTweetNode(ctx.captures.id[0])],
  match: sel.tag('div').attr('data-lexical-tweet-id', /^.+$/, {capture: 'id'}),
  name: '@lexical/playground/tweet',
});

export const TwitterExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    /* @__PURE__ */ configExtension(DOMImportExtension, {
      rules: [TweetImportRule],
    }),
  ],
  name: '@lexical/playground/Twitter',
  nodes: [TweetNode],
  register: editor =>
    editor.registerCommand<string>(
      INSERT_TWEET_COMMAND,
      payload => {
        const tweetNode = $createTweetNode(payload);
        $insertNodeToNearestRoot(tweetNode);

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
});
