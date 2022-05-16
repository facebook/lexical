/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {
  $createLinkNode,
  $isLinkNode,
  LinkNode,
  TOGGLE_LINK_COMMAND,
} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isElementNode,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import {useEffect} from 'react';

function toggleLink(url: null | string) {
  const selection = $getSelection();
  if (selection !== null) {
    $setSelection(selection);
  }
  const sel = $getSelection();
  if (sel !== null) {
    const nodes = sel.extract();
    if (url === null) {
      // Remove LinkNodes
      nodes.forEach((node) => {
        const parent = node.getParent();

        if ($isLinkNode(parent)) {
          const children = parent.getChildren();
          for (let i = 0; i < children.length; i++) {
            parent.insertBefore(children[i]);
          }
          parent.remove();
        }
      });
    } else {
      // Add or merge LinkNodes
      if (nodes.length === 1) {
        const firstNode = nodes[0];
        // if the first node is a LinkNode or if its
        // parent is a LinkNode, we update the URL.
        if ($isLinkNode(firstNode)) {
          firstNode.setURL(url);
          return;
        } else {
          const parent = firstNode.getParent();
          if ($isLinkNode(parent)) {
            // set parent to be the current linkNode
            // so that other nodes in the same parent
            // aren't handled separately below.
            parent.setURL(url);
            return;
          }
        }
      }

      let prevParent = null;
      let linkNode = null;
      nodes.forEach((node) => {
        const parent = node.getParent();
        if (
          parent === linkNode ||
          parent === null ||
          ($isElementNode(node) && !node.isInline())
        ) {
          return;
        }
        if ($isLinkNode(parent)) {
          linkNode = parent;
          parent.setURL(url);
          return;
        }
        if (!parent.is(prevParent)) {
          prevParent = parent;
          linkNode = $createLinkNode(url);
          if ($isLinkNode(parent)) {
            if (node.getPreviousSibling() === null) {
              parent.insertBefore(linkNode);
            } else {
              parent.insertAfter(linkNode);
            }
          } else {
            node.insertBefore(linkNode);
          }
        }
        if ($isLinkNode(node)) {
          if (linkNode !== null) {
            const children = node.getChildren();
            for (let i = 0; i < children.length; i++) {
              linkNode.append(children[i]);
            }
          }
          node.remove();
          return;
        }
        if (linkNode !== null) {
          linkNode.append(node);
        }
      });
    }
  }
}

export default function LinkPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([LinkNode])) {
      throw new Error('LinkPlugin: LinkNode not registered on editor');
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      TOGGLE_LINK_COMMAND,
      (payload) => {
        const url: string | null = payload;
        toggleLink(url);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
