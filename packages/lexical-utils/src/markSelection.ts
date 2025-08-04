/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  type EditorState,
  ElementNode,
  getDOMTextNode,
  type LexicalEditor,
  Point,
  TextNode,
} from 'lexical';

import mergeRegister from './mergeRegister';
import positionNodeOnRange from './positionNodeOnRange';
import px from './px';

function rangeTargetFromPoint(
  point: Point,
  node: ElementNode | TextNode,
  dom: HTMLElement,
): [HTMLElement | Text, number] {
  if (point.type === 'text' || !$isElementNode(node)) {
    const textDOM = getDOMTextNode(dom) || dom;
    return [textDOM, point.offset];
  } else {
    const slot = node.getDOMSlot(dom);
    return [slot.element, slot.getFirstChildOffset() + point.offset];
  }
}

function rangeFromPoints(
  editor: LexicalEditor,
  anchor: Point,
  anchorNode: ElementNode | TextNode,
  anchorDOM: HTMLElement,
  focus: Point,
  focusNode: ElementNode | TextNode,
  focusDOM: HTMLElement,
): Range {
  const editorDocument = editor._window ? editor._window.document : document;
  const range = editorDocument.createRange();

  const isBackwardSelection =
    focusNode.isBefore(anchorNode) ||
    (focusNode === anchorNode && focus.offset < anchor.offset);

  if (isBackwardSelection) {
    range.setStart(...rangeTargetFromPoint(focus, focusNode, focusDOM));
    range.setEnd(...rangeTargetFromPoint(anchor, anchorNode, anchorDOM));
  } else {
    range.setStart(...rangeTargetFromPoint(anchor, anchorNode, anchorDOM));
    range.setEnd(...rangeTargetFromPoint(focus, focusNode, focusDOM));
  }
  return range;
}
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
  let previousAnchorNodeDOM: null | HTMLElement = null;
  let previousAnchorOffset: null | number = null;
  let previousFocusNode: null | TextNode | ElementNode = null;
  let previousFocusNodeDOM: null | HTMLElement = null;
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
        currentAnchorNodeDOM !== previousAnchorNodeDOM ||
        currentAnchorOffset !== previousAnchorOffset ||
        currentAnchorNodeKey !== previousAnchorNode.getKey();
      const differentFocusDOM =
        previousFocusNode === null ||
        currentFocusNodeDOM !== previousFocusNodeDOM ||
        currentFocusOffset !== previousFocusOffset ||
        currentFocusNodeKey !== previousFocusNode.getKey();
      if (
        (differentAnchorDOM || differentFocusDOM) &&
        currentAnchorNodeDOM !== null &&
        currentFocusNodeDOM !== null
      ) {
        const range = rangeFromPoints(
          editor,
          anchor,
          currentAnchorNode,
          currentAnchorNodeDOM,
          focus,
          currentFocusNode,
          currentFocusNodeDOM,
        );
        removeRangeListener();
        removeRangeListener = positionNodeOnRange(editor, range, (domNodes) => {
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
        });
      }
      previousAnchorNode = currentAnchorNode;
      previousAnchorNodeDOM = currentAnchorNodeDOM;
      previousAnchorOffset = currentAnchorOffset;
      previousFocusNode = currentFocusNode;
      previousFocusNodeDOM = currentFocusNodeDOM;
      previousFocusOffset = currentFocusOffset;
    });
  }
  compute(editor.getEditorState());
  return mergeRegister(
    editor.registerUpdateListener(({editorState}) => compute(editorState)),
    () => {
      removeRangeListener();
    },
  );
}
