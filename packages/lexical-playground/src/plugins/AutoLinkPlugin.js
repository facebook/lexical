/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';

import {TextNode, $createTextNode, $getSelection} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import withSubscriptions from '@lexical/react/withSubscriptions';
import {useEffect} from 'react';
import {$isLinkNode} from 'lexical/LinkNode';
import {
  $createAutoLinkNode,
  $isAutoLinkNode,
  AutoLinkNode,
} from '../nodes/AutoLinkNode';

type LinkMatcherResult = {
  text: string,
  url: string,
  length: number,
  index: number,
};

type LinkMatcher = (text: string) => LinkMatcherResult | null;

function findFirstMatch(
  text: string,
  matchers: Array<LinkMatcher>,
): LinkMatcherResult | null {
  for (let i = 0; i < matchers.length; i++) {
    const match = matchers[i](text);
    if (match) {
      return match;
    }
  }
  return null;
}

function textNodeTransform(node: TextNode, matchers: Array<LinkMatcher>): void {
  if (!node.isSimpleText()) {
    return;
  }

  const selection = $getSelection();
  if (selection === null || !selection.isCollapsed()) {
    return;
  }

  const parent = node.getParent();
  if (parent === null) {
    return;
  }

  if ($isAutoLinkNode(parent)) {
    // If it's already auto link see if we can expand more
    // (if matching pattern) or should escape
    const text = node.getTextContent();
    const match = findFirstMatch(text, matchers);

    // If content no longer matches pattern then remove auto link
    if (match === null) {
      parent.replace(node);
      return;
    }

    // If content matches the pattern, but some of the trailing text
    // does not, then move that text outside of auto link. This allows
    // escaping continious typing within the link
    if (text.length > match.length) {
      const endOffset = match.index + match.length;
      const partials = node.splitText(endOffset);
      parent.insertAfter(partials[1]);
    }

    // Update auto link url to reflect latest match
    parent.setURL(match.url);
  } else if ($isLinkNode(parent)) {
    // If it's already a regular link leave it as is, to allow
    // manual link even for matched patterns
    return;
  } else {
    // If it's a plain text then check pattern match (could have mulitple entries per node)
    // and wrap those matches into auto link
    let currentNode = node;
    while (currentNode) {
      const match = findFirstMatch(currentNode.getTextContent(), matchers);
      if (match === null) {
        break;
      }

      const startOffset = match.index;
      const endOffset = startOffset + match.length;
      let targetNode;

      if (startOffset === 0) {
        [targetNode, currentNode] = currentNode.splitText(endOffset);
      } else {
        [, targetNode, currentNode] = currentNode.splitText(
          startOffset,
          endOffset,
        );
      }

      const textNode = $createTextNode(match.text);
      const linkNode = $createAutoLinkNode(match.url);
      linkNode.append(textNode);
      targetNode.replace(linkNode);
    }
  }
}

const URL_MATCHER =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMAIL_MATCHER =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const Matchers: $ReadOnly<{
  url: LinkMatcher,
  email: LinkMatcher,
}> = {
  url: (text) => {
    const match = URL_MATCHER.exec(text);
    return (
      match && {
        text: match[0],
        length: match[0].length,
        index: match.index,
        url: match[0],
      }
    );
  },

  email: (text) => {
    const match = EMAIL_MATCHER.exec(text);
    return (
      match && {
        text: match[0],
        length: match[0].length,
        index: match.index,
        url: `mailto:${match[0]}`,
      }
    );
  },
};

function useAutoLink(editor: LexicalEditor): void {
  useEffect(() => {
    return withSubscriptions(
      editor.registerNodes([AutoLinkNode]),
      editor.addTransform(TextNode, (node) =>
        textNodeTransform(node, [Matchers.url, Matchers.email]),
      ),
    );
  }, [editor]);
}

export default function AutoLinkPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  useAutoLink(editor);
  return null;
}
