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
  type RangeSelection,
  TextNode,
} from 'lexical';

import mergeRegister from './mergeRegister';
import positionNodeOnRange from './positionNodeOnRange';
import px from './px';

function $getOrderedSelectionPoints(selection: RangeSelection): [Point, Point] {
  const points = selection.getStartEndPoints()!;
  return selection.isBackward() ? [points[1], points[0]] : points;
}

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
  start: Point,
  startNode: ElementNode | TextNode,
  startDOM: HTMLElement,
  end: Point,
  endNode: ElementNode | TextNode,
  endDOM: HTMLElement,
): Range {
  const editorDocument = editor._window ? editor._window.document : document;
  const range = editorDocument.createRange();
  range.setStart(...rangeTargetFromPoint(start, startNode, startDOM));
  range.setEnd(...rangeTargetFromPoint(end, endNode, endDOM));
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
      const [start, end] = $getOrderedSelectionPoints(selection);
      const currentStartNode = start.getNode() as TextNode | ElementNode;
      const currentStartNodeKey = currentStartNode.getKey();
      const currentStartOffset = start.offset;
      const currentEndNode = end.getNode() as TextNode | ElementNode;
      const currentEndNodeKey = currentEndNode.getKey();
      const currentEndOffset = end.offset;
      const currentStartNodeDOM = editor.getElementByKey(currentStartNodeKey);
      const currentEndNodeDOM = editor.getElementByKey(currentEndNodeKey);
      const differentStartDOM =
        previousAnchorNode === null ||
        currentStartNodeDOM !== previousAnchorNodeDOM ||
        currentStartOffset !== previousAnchorOffset ||
        currentStartNodeKey !== previousAnchorNode.getKey();
      const differentEndDOM =
        previousFocusNode === null ||
        currentEndNodeDOM !== previousFocusNodeDOM ||
        currentEndOffset !== previousFocusOffset ||
        currentEndNodeKey !== previousFocusNode.getKey();
      if (
        (differentStartDOM || differentEndDOM) &&
        currentStartNodeDOM !== null &&
        currentEndNodeDOM !== null
      ) {
        const range = rangeFromPoints(
          editor,
          start,
          currentStartNode,
          currentStartNodeDOM,
          end,
          currentEndNode,
          currentEndNodeDOM,
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
      previousAnchorNode = currentStartNode;
      previousAnchorNodeDOM = currentStartNodeDOM;
      previousAnchorOffset = currentStartOffset;
      previousFocusNode = currentEndNode;
      previousFocusNodeDOM = currentEndNodeDOM;
      previousFocusOffset = currentEndOffset;
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
