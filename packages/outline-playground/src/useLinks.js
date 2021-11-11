/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */



import type {OutlineEditor, State} from 'outline';

import {TextNode, createTextNode, isLineBreakNode} from 'outline';
import {LinkNode, createLinkNode, isLinkNode} from 'outline/LinkNode';

import * as React from 'react';
import {useCallback, useEffect} from 'react';

export default function useLinks(
  editor: OutlineEditor,
  findMatch: (string: string) => ?string,
  onLinkCreation?: (url: string) => void,
): void {
  const handleLinks = useCallback((node: TextNode, state: State): void => {
    if (!node.isSimpleText()) {
      return;
    }

    let updatedNode = node;
    const selection = state.getSelection();
    // Ensure we are taking into account the user's current selection
    // if the node being transformed is the anchor node.
    if (
      selection !== null &&
      selection.isCollapsed() &&
      selection.anchor.type === 'text' &&
      selection.anchor.key === node.getKey()
    ) {
      [updatedNode] = updatedNode.splitText(0, selection.anchor.offset);
    }

    let text = updatedNode.getTextContent();

    let match = findMatch(text);

    while (match != null && updatedNode != null && text != null) {
      const startIndex = text.indexOf(match);
      const endIndex = startIndex + match.length;
      const nextSibling = updatedNode.getNextSibling();

      let nodeToReplace;

      if (startIndex === 0) {
        [nodeToReplace, updatedNode] = updatedNode.splitText(endIndex);
      } else {
        [, nodeToReplace, updatedNode] = updatedNode.splitText(
          startIndex,
          endIndex,
        );
      }
      const hasSpaceAfterOrHasLineBreakAfter =
        text[endIndex] === ' ' ||
        (nextSibling != null && nextSibling.getTextContent()[0] === ' ') ||
        isLineBreakNode(nextSibling);

      if (hasSpaceAfterOrHasLineBreakAfter) {
        const url = nodeToReplace.getTextContent();
        const urlNode = createLinkNode(url, url);

        nodeToReplace.replace(urlNode);
        onLinkCreation && onLinkCreation(url);
      }

      text = updatedNode?.getTextContent();
      match = text != null ? findMatch(text) : null;
    }
  }, []);

  const manageLinkEdits = (node: TextNode, _state: State): void => {
    if (!isLinkNode(node)) {
      return;
    }

    const text = node.getTextContent();
    const match = findMatch(text);

    if (match != null) {
      const startIndex = text.indexOf(match);
      const endIndex = match.length + startIndex;

      let beforeTextNode;
      let nodeToReplace;
      let afterTextNode;

      if (startIndex === 0) {
        [nodeToReplace, afterTextNode] = node.splitText(endIndex);
      } else {
        [beforeTextNode, nodeToReplace, afterTextNode] = node.splitText(
          startIndex,
          endIndex,
        );
      }

      const url = nodeToReplace.getTextContent();
      const urlNode = createLinkNode(url, url);
      nodeToReplace.replace(urlNode);
      onLinkCreation && onLinkCreation(url);

      if (beforeTextNode != null) {
        const textNode = createTextNode(beforeTextNode.getTextContent());
        beforeTextNode.replace(textNode);
      }
      if (afterTextNode != null) {
        const textNode = createTextNode(afterTextNode.getTextContent());
        afterTextNode.replace(textNode);
      }
    } else {
      const textNode = createTextNode(node.getTextContent());
      node.replace(textNode);
    }
  };

  useEffect(() => {
    if (editor != null) {
      editor.registerNodeType('link', LinkNode);
      // add debounce here if it possible to get it to work with the Outline Editor
      const removeTextTransform = editor.addTextNodeTransform(handleLinks);
      const removeLinkManager = editor.addTextNodeTransform(manageLinkEdits);

      return () => {
        removeTextTransform();
        removeLinkManager();
      };
    }
  }, [editor, handleLinks]);
}
