/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, Point, NodeMap, Selection} from 'outline';
import type {Binding} from './Bindings';
import type {Provider} from '.';
import type {AbsolutePosition, RelativePosition} from 'yjs';

import {
  compareRelativePositions,
  createRelativePositionFromTypeIndex,
  createAbsolutePositionFromRelativePosition,
  // $FlowFixMe: need Flow typings for yjs
} from 'yjs';
import {isTextNode, isBlockNode, getNodeByKey, getSelection} from 'outline';

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

function createRelativePosition(
  point: Point,
  binding: Binding,
): null | RelativePosition {
  const yjsNodeMap = binding.nodeMap;
  const yjsNode = yjsNodeMap.get(point.key);
  if (yjsNode === undefined) {
    return null;
  }
  return createRelativePositionFromTypeIndex(yjsNode, point.offset);
}

function createAbsolutePosition(
  relativePosition: RelativePosition,
  binding: Binding,
): AbsolutePosition {
  return createAbsolutePositionFromRelativePosition(
    relativePosition,
    binding.doc,
  );
}

function shouldUpdatePosition(
  currentPos: RelativePosition,
  pos: null | RelativePosition,
): boolean {
  if (currentPos === undefined) {
    if (pos !== undefined) {
      return true;
    }
  } else if (pos === null || !compareRelativePositions(currentPos, pos)) {
    return true;
  }
  return false;
}

function createCursor(name: string, color: string): Cursor {
  return {
    color: color,
    name: name,
    selection: null,
  };
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

function destroyCursor(binding: Binding, cursor: Cursor) {
  const selection = cursor.selection;
  if (selection !== null) {
    destroySelection(binding, selection);
  }
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

function createCursorSelection(
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
  name.style.cssText = `position:absolute;left:-2px;top:-16px;background-color:rgb(${color});color:#fff;line-height:12px;height:12px;font-size:12px;padding:2px;font-family:Arial;font-weight:bold`;
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

function updateCursor(
  binding: Binding,
  cursor: Cursor,
  nextSelection: null | CursorSelection,
  nodeMap: NodeMap,
): void {
  const editor = binding.editor;
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
    return;
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
    const style = `position:absolute;top:${selectionRect.top}px;left:${selectionRect.left}px;height:${selectionRect.height}px;width:${selectionRect.width}px;background-color:rgba(${color}, 0.3);pointer-events:none`;
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

export function syncLocalCursorPosition(
  binding: Binding,
  provider: Provider,
): void {
  const awareness = provider.awareness;
  const localState = awareness.getLocalState();
  const anchorPos = localState.anchorPos;
  const focusPos = localState.focusPos;

  if (anchorPos !== null && focusPos !== null) {
    const anchorAbsPos = createAbsolutePosition(anchorPos, binding);
    const focusAbsPos = createAbsolutePosition(focusPos, binding);

    if (anchorAbsPos !== null && focusAbsPos !== null) {
      const reverseNodeMap = binding.reverseNodeMap;
      const anchorKey = reverseNodeMap.get(anchorAbsPos.type);
      const focusKey = reverseNodeMap.get(focusAbsPos.type);
      const anchorOffset = anchorAbsPos.index;
      const focusOffset = focusAbsPos.index;

      if (anchorKey !== undefined && focusKey !== undefined) {
        const selection = getSelection();
        if (selection === null) {
          throw new Error('TODO: syncLocalCursorPosition');
        }
        const anchor = selection.anchor;
        const focus = selection.focus;

        if (anchor.key !== anchorKey || anchor.offset !== anchorOffset) {
          const anchorNode = getNodeByKey(anchorKey);
          selection.anchor.set(
            anchorKey,
            anchorOffset,
            isBlockNode(anchorNode) ? 'block' : 'text',
          );
        }
        if (focus.key !== focusKey || focus.offset !== focusOffset) {
          const focusNode = getNodeByKey(focusKey);
          selection.focus.set(
            focusKey,
            focusOffset,
            isBlockNode(focusNode) ? 'block' : 'text',
          );
        }
      }
    }
  }
}

export function syncCursorPositions(
  binding: Binding,
  provider: Provider,
): void {
  const awarenessStates = Array.from(provider.awareness.getStates());
  const localClientID = binding.doc.clientID;
  const reverseNodeMap = binding.reverseNodeMap;
  const cursors = binding.cursors;
  const editor = binding.editor;
  const nodeMap = editor._editorState._nodeMap;
  const visitedClientIDs = new Set();

  for (let i = 0; i < awarenessStates.length; i++) {
    const awarenessState = awarenessStates[i];
    const [clientID, awareness] = awarenessState;

    if (clientID !== localClientID) {
      visitedClientIDs.add(clientID);
      const {anchorPos, focusPos, name, color, focusing} = awareness;
      let selection = null;

      let cursor = cursors.get(clientID);
      if (cursor === undefined) {
        cursor = createCursor(name, color);
        cursors.set(clientID, cursor);
      }
      if (anchorPos !== null && focusPos !== null && focusing) {
        const anchorAbsPos = createAbsolutePosition(anchorPos, binding);
        const focusAbsPos = createAbsolutePosition(focusPos, binding);

        if (anchorAbsPos !== null && focusAbsPos !== null) {
          const anchorKey = reverseNodeMap.get(anchorAbsPos.type);
          const focusKey = reverseNodeMap.get(focusAbsPos.type);
          if (anchorKey !== undefined && focusKey !== undefined) {
            const anchorOffset = anchorAbsPos.index;
            const focusOffset = focusAbsPos.index;
            selection = cursor.selection;

            if (selection === null) {
              selection = createCursorSelection(
                cursor,
                anchorKey,
                anchorOffset,
                focusKey,
                focusOffset,
              );
            } else {
              const anchor = selection.anchor;
              const focus = selection.focus;
              anchor.key = anchorKey;
              anchor.offset = anchorOffset;
              focus.key = focusKey;
              focus.offset = focusOffset;
            }
          }
        }
      }
      updateCursor(binding, cursor, selection, nodeMap);
    }
  }
  const allClientIDs = Array.from(cursors.keys());
  for (let i = 0; i < allClientIDs.length; i++) {
    const clientID = allClientIDs[i];
    if (!visitedClientIDs.has(clientID)) {
      const cursor = cursors.get(clientID);
      if (cursor !== undefined) {
        destroyCursor(binding, cursor);
        cursors.delete(clientID);
      }
    }
  }
}

export function syncOutlineSelectionToYjs(
  binding: Binding,
  provider: Provider,
  selection: null | Selection,
): void {
  const awareness = provider.awareness;
  const {
    anchorPos: currentAnchorPos,
    focusPos: currentFocusPos,
    name,
    color,
    focusing,
  } = awareness.getLocalState();
  let anchorPos = null;
  let focusPos = null;

  if (selection !== null) {
    anchorPos = createRelativePosition(selection.anchor, binding);
    focusPos = createRelativePosition(selection.focus, binding);
  }

  if (
    shouldUpdatePosition(currentAnchorPos, anchorPos) ||
    shouldUpdatePosition(currentFocusPos, focusPos)
  ) {
    awareness.setLocalState({name, color, anchorPos, focusPos, focusing});
  }
}
