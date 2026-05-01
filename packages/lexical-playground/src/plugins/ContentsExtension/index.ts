/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$createLinkNode, LinkNode} from '@lexical/link';
import {$findMatchingParent} from '@lexical/utils';
import {defineExtension, mergeRegister, TextNode} from 'lexical';

import {ContentsItemNode} from './ContentsItemNode';
import {
  $createContentsLinkNode,
  $isContentsLinkNode,
  ContentsLinkNode,
} from './ContentsLinkNode';
import {$isContentsListNode, ContentsListNode} from './ContentsListNode';

export const ContentsExtension = defineExtension({
  name: '@lexical/playground/Contents',
  nodes: () => [ContentsListNode, ContentsItemNode, ContentsLinkNode],
  register: editor => {
    return mergeRegister(
      editor.registerNodeTransform(TextNode, textNode => {
        const parent = textNode.getParent();
        const previousSibling = textNode.getPreviousSibling();
        const nextSibling = textNode.getNextSibling();
        // Skip if textNode is already part of an ContentsLink (idempotency check)
        if ($isContentsLinkNode(parent)) {
          return;
        }
        if ($isContentsLinkNode(previousSibling)) {
          previousSibling.append(textNode);
        } else if ($isContentsLinkNode(nextSibling)) {
          nextSibling.splice(0, 0, [textNode]);
        }
      }),
      // The contents link must be within the contents
      // If it's moved outside the contents, convert it to a regular link
      editor.registerNodeTransform(LinkNode, node => {
        if ($findMatchingParent(node, $isContentsListNode)) {
          node.replace(
            $createContentsLinkNode(node.getURL(), {
              rel: node.getRel(),
              target: node.getTarget(),
              title: node.getRel(),
            }),
            true,
          );
        }
      }),
      editor.registerNodeTransform(ContentsLinkNode, node => {
        if (!$findMatchingParent(node, $isContentsListNode)) {
          node.replace(
            $createLinkNode(node.getURL(), {
              rel: node.getRel(),
              target: node.getTarget(),
              title: node.getRel(),
            }),
            true,
          );
        }
      }),
    );
  },
});
