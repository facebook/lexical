/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getSelection,
  $isRangeSelection,
  type EditorState,
  ElementNode,
  type LexicalEditor,
  TextNode,
} from 'lexical';

import mergeRegister from './mergeRegister';
import positionNodeOnRange from './positionNodeOnRange';
import px from './px';

/**
 * Place one or multiple newly created Nodes at the current selection. Multiple
 * nodes will only be created when the selection spans multiple lines (aka
 * client rects).
 *
 * This function can come useful when you want to show the selection but the
 * editor has been focused away.
 */
export default function markSelection(
  editor: LexicalEditor,
  onReposition?: (node: Array<HTMLElement>) => void,
): () => void {
  let previousAnchorNode: null | TextNode | ElementNode = null;
  let previousAnchorOffset: null | number = null;
  let previousFocusNode: null | TextNode | ElementNode = null;
  let previousFocusOffset: null | number = null;
  let removeRangeListener: () => void = () => {};
  function compute(editorState: EditorState) {
    editorState.read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        // TODO
        previousAnchorNode = null;
        previousAnchorOffset = null;
        previousFocusNode = null;
        previousFocusOffset = null;
        removeRangeListener();
        removeRangeListener = () => {};
        return;
      }
      const {anchor, focus} = selection;
      const currentAnchorNode = anchor.getNode();
      const currentAnchorNodeKey = currentAnchorNode.getKey();
      const currentAnchorOffset = anchor.offset;
      const currentFocusNode = focus.getNode();
      const currentFocusNodeKey = currentFocusNode.getKey();
      const currentFocusOffset = focus.offset;
      const currentAnchorNodeDOM = editor.getElementByKey(currentAnchorNodeKey);
      const currentFocusNodeDOM = editor.getElementByKey(currentFocusNodeKey);
      const differentAnchorDOM =
        previousAnchorNode === null ||
        currentAnchorNodeDOM === null ||
        currentAnchorOffset !== previousAnchorOffset ||
        currentAnchorNodeKey !== previousAnchorNode.getKey() ||
        (currentAnchorNode !== previousAnchorNode &&
          (!(previousAnchorNode instanceof TextNode) ||
            currentAnchorNode.updateDOM(
              previousAnchorNode,
              currentAnchorNodeDOM,
              editor._config,
            )));
      const differentFocusDOM =
        previousFocusNode === null ||
        currentFocusNodeDOM === null ||
        currentFocusOffset !== previousFocusOffset ||
        currentFocusNodeKey !== previousFocusNode.getKey() ||
        (currentFocusNode !== previousFocusNode &&
          (!(previousFocusNode instanceof TextNode) ||
            currentFocusNode.updateDOM(
              previousFocusNode,
              currentFocusNodeDOM,
              editor._config,
            )));
      if (differentAnchorDOM || differentFocusDOM) {
        const anchorHTMLElement = editor.getElementByKey(
          anchor.getNode().getKey(),
        );
        const focusHTMLElement = editor.getElementByKey(
          focus.getNode().getKey(),
        );
        if (anchorHTMLElement !== null && focusHTMLElement !== null) {
          const range = document.createRange();
          let firstHTMLElement;
          let firstOffset;
          let lastHTMLElement;
          let lastOffset;
          if (focus.isBefore(anchor)) {
            firstHTMLElement = focusHTMLElement;
            firstOffset = focus.offset;
            lastHTMLElement = anchorHTMLElement;
            lastOffset = anchor.offset;
          } else {
            firstHTMLElement = anchorHTMLElement;
            firstOffset = anchor.offset;
            lastHTMLElement = focusHTMLElement;
            lastOffset = focus.offset;
          }
          const firstHTMLElementTextChild = firstTextChild(firstHTMLElement);
          const lastHTMLElementtextChild = firstTextChild(lastHTMLElement);
          range.setStart(
            firstHTMLElementTextChild || firstHTMLElement,
            firstOffset,
          );
          range.setEnd(lastHTMLElementtextChild || lastHTMLElement, lastOffset);
          removeRangeListener();
          removeRangeListener = positionNodeOnRange(
            editor,
            range,
            (domNodes) => {
              if (onReposition === undefined) {
                for (const domNode of domNodes) {
                  const domNodeStyle = domNode.style;

                  if (domNodeStyle.background !== 'Highlight') {
                    domNodeStyle.background = 'Highlight';
                  }
                  if (domNodeStyle.color !== 'HighlightText') {
                    domNodeStyle.color = 'HighlightText';
                  }
                  if (domNodeStyle.marginTop !== px(-1.5)) {
                    domNodeStyle.marginTop = px(-1.5);
                  }
                  if (domNodeStyle.paddingTop !== px(4)) {
                    domNodeStyle.paddingTop = px(4);
                  }
                  if (domNodeStyle.paddingBottom !== px(0)) {
                    domNodeStyle.paddingBottom = px(0);
                  }
                }
              } else {
                onReposition(domNodes);
              }
            },
          );
        }
      }
      previousAnchorNode = currentAnchorNode;
      previousAnchorOffset = currentAnchorOffset;
      previousFocusNode = currentFocusNode;
      previousFocusOffset = currentFocusOffset;
    });
  }
  compute(editor.getEditorState());
  return mergeRegister(
    editor.registerUpdateListener(({editorState}) => compute(editorState)),
    removeRangeListener,
    () => {
      removeRangeListener();
    },
  );
}

function firstTextChild(node: Node): null | Text {
  let text: null | Node = node;
  while (text !== null && !(text instanceof Text)) {
    text = text.firstChild || null;
  }
  return text;
}
