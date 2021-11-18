/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, Point, NodeMap, OutlineEditor} from 'outline';
import type {Binding} from './Bindings';

import {
  compareRelativePositions,
  createRelativePositionFromTypeIndex,
  createAbsolutePositionFromRelativePosition,
  // $FlowFixMe: need Flow typings for yjs
} from 'yjs';
import {isTextNode} from 'outline';

export type CursorSelection = {
  caret: HTMLElement,
  color: string,
  selections: Array<HTMLElement>,
  range: Range,
  anchor: {
    key: NodeKey,
    offset: number,
  },
  focus: {
    key: NodeKey,
    offset: number,
  },
};

export type Cursor = {
  color: string,
  name: string,
  selection: null | CursorSelection,
};

// $FlowFixMe: needs proper typings
export type RelaltivePosition = Object;

// $FlowFixMe: needs proper typings
export type AbsolutePosition = Object;

export function createCursor(name: string, color: string): Cursor {
  return {
    color: color,
    name: name,
    selection: null,
  };
}

export function createCursorSelection(
  cursor: Cursor,
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
): CursorSelection {
  const color = cursor.color;
  const caret = document.createElement('span');
  caret.style.cssText = `position:absolute;top:0;bottom:0;right:-1px;width:1px;background-color:rgb(${color})`;
  const name = document.createElement('span');
  name.textContent = cursor.name;
  name.style.cssText = `position:absolute;left:-2px;top:-16px;background-color:rgb(${color});color:#fff;line-height:12px;height:12px;font-size:12px;padding:2px;font-family:Arial;font-weight:bold;word-break: normal`;
  caret.appendChild(name);
  return {
    caret,
    name,
    color,
    range: document.createRange(),
    selections: [],
    anchor: {
      key: anchorKey,
      offset: anchorOffset,
    },
    focus: {
      key: focusKey,
      offset: focusOffset,
    },
  };
}

export function shouldUpdatePosition(
  currentPos: RelaltivePosition,
  pos: RelaltivePosition,
): boolean {
  if (currentPos === undefined) {
    if (pos !== undefined) {
      return true;
    }
  } else if (pos === undefined || !compareRelativePositions(currentPos, pos)) {
    return true;
  }
  return false;
}

export function createRelativePosition(
  point: Point,
  binding: Binding,
): null | RelaltivePosition {
  const yjsNodeMap = binding.nodeMap;
  const yjsNode = yjsNodeMap.get(point.key);
  if (yjsNode === undefined) {
    return null;
  }
  return createRelativePositionFromTypeIndex(yjsNode, point.offset);
}

export function createAbsolutePosition(
  relativePosition: RelaltivePosition,
  binding: Binding,
): AbsolutePosition {
  return createAbsolutePositionFromRelativePosition(
    relativePosition,
    binding.doc,
  );
}

function getDOMTextNode(element: Node | null): Text | null {
  let node = element;
  while (node != null) {
    if (node.nodeType === 3) {
      // $FlowFixMe: this is a Text
      return node;
    }
    node = node.firstChild;
  }
  return null;
}

export function updateCursor(
  binding: Binding,
  cursor: Cursor,
  nextSelection: null | CursorSelection,
  editor: OutlineEditor,
  nodeMap: NodeMap,
): void {
  const rootElement = editor.getRootElement();
  const cursorsContainer = binding.cursorsContainer;
  if (cursorsContainer === null || rootElement === null) {
    return;
  }
  const prevSelection = cursor.selection;
  if (nextSelection === null) {
    if (prevSelection === null) {
      return;
    } else {
      cursor.selection = null;
      destroySelection(binding, prevSelection);
      return;
    }
  } else {
    cursor.selection = nextSelection;
  }
  const range = nextSelection.range;
  const caret = nextSelection.caret;
  const color = nextSelection.color;
  const selections = nextSelection.selections;
  const anchor = nextSelection.anchor;
  const focus = nextSelection.focus;
  const anchorKey = anchor.key;
  const focusKey = focus.key;
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;
  const anchorNode = nodeMap.get(anchorKey);
  const focusNode = nodeMap.get(focusKey);
  let anchorDOM = editor.getElementByKey(anchorKey);
  let focusDOM = editor.getElementByKey(focusKey);

  if (isTextNode(anchorNode)) {
    anchorDOM = getDOMTextNode(anchorDOM);
  }
  if (isTextNode(focusNode)) {
    focusDOM = getDOMTextNode(focusDOM);
  }
  if (
    anchorNode === undefined ||
    focusNode === undefined ||
    anchorDOM === null ||
    focusDOM === null
  ) {
    throw new Error('Should never happen');
  }
  range.setStart(anchorDOM, anchorOffset);
  range.setEnd(focusDOM, focusOffset);
  if (
    range.collapsed &&
    (anchorOffset !== focusOffset || anchorKey !== focusKey)
  ) {
    // Range is backwards, we need to reverse it
    range.setStart(focusDOM, focusOffset);
    range.setEnd(anchorDOM, anchorOffset);
  }
  // We need to
  const rootRect = rootElement.getBoundingClientRect();
  const computedStyle = getComputedStyle(rootElement);
  const rootPadding =
    parseFloat(computedStyle.paddingLeft) +
    parseFloat(computedStyle.paddingRight);
  const selectionRects = Array.from(range.getClientRects());
  let selectionRectsLength = selectionRects.length;
  const selectionsLength = selections.length;

  for (let i = 0; i < selectionRectsLength; i++) {
    const selectionRect = selectionRects[i];
    if (selectionRect.width + rootPadding === rootRect.width) {
      // Exclude selections that span the entire block
      selectionRects.splice(i--, 1);
      selectionRectsLength--;
      continue;
    }
    let selection = selections[i];
    if (selection === undefined) {
      selection = document.createElement('span');
      selections[i] = selection;
      cursorsContainer.appendChild(selection);
    }
    const style = `position:absolute;top:${
      selectionRect.top - rootRect.top
    }px;left:${selectionRect.left - rootRect.left}px;height:${
      selectionRect.height
    }px;width:${
      selectionRect.width
    }px;background-color:rgba(${color}, 0.3);pointer-events:none`;
    selection.style.cssText = style;
    if (i === selectionRectsLength - 1) {
      if (caret.parentNode !== selection) {
        selection.appendChild(caret);
      }
    }
  }
  for (let i = selectionsLength - 1; i >= selectionRectsLength; i--) {
    const selection = selections[i];
    cursorsContainer.removeChild(selection);
    selections.pop();
  }
}

function destroySelection(binding: Binding, selection: CursorSelection) {
  const cursorsContainer = binding.cursorsContainer;
  if (cursorsContainer !== null) {
    const selections = selection.selections;
    const selectionsLength = selections.length;
    for (let i = 0; i < selectionsLength; i++) {
      cursorsContainer.removeChild(selections[i]);
    }
  }
}

export function destroyCursor(binding: Binding, cursor: Cursor) {
  const selection = cursor.selection;
  if (selection !== null) {
    destroySelection(binding, selection);
  }
}
