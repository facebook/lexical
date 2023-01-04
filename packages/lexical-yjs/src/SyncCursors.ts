/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Binding} from './Bindings';
import type {
  GridSelection,
  NodeKey,
  NodeMap,
  NodeSelection,
  Point,
  RangeSelection,
} from 'lexical';
import type {AbsolutePosition, RelativePosition} from 'yjs';

import {createDOMRange, createRectsFromDOMRange} from '@lexical/selection';
import {
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
} from 'lexical';
import {WebsocketProvider} from 'y-websocket';
import {
  compareRelativePositions,
  createAbsolutePositionFromRelativePosition,
  createRelativePositionFromTypeIndex,
} from 'yjs';

import {CollabDecoratorNode} from './CollabDecoratorNode';
import {CollabElementNode} from './CollabElementNode';
import {CollabLineBreakNode} from './CollabLineBreakNode';
import {CollabTextNode} from './CollabTextNode';
import {getPositionFromElementAndOffset} from './Utils';

export type CursorSelection = {
  anchor: {
    key: NodeKey;
    offset: number;
  };
  caret: HTMLElement;
  color: string;
  focus: {
    key: NodeKey;
    offset: number;
  };
  name: HTMLSpanElement;
  selections: Array<HTMLElement>;
};
export type Cursor = {
  color: string;
  name: string;
  selection: null | CursorSelection;
};

function createRelativePosition(
  point: Point,
  binding: Binding,
): null | RelativePosition {
  const collabNodeMap = binding.collabNodeMap;
  const collabNode = collabNodeMap.get(point.key);

  if (collabNode === undefined) {
    return null;
  }

  let offset = point.offset;
  let sharedType = collabNode.getSharedType();

  if (collabNode instanceof CollabTextNode) {
    sharedType = collabNode._parent._xmlText;
    const currentOffset = collabNode.getOffset();

    if (currentOffset === -1) {
      return null;
    }

    offset = currentOffset + 1 + offset;
  } else if (
    collabNode instanceof CollabElementNode &&
    point.type === 'element'
  ) {
    const parent = point.getNode();
    let accumulatedOffset = 0;
    let i = 0;
    let node = parent.getFirstChild();
    while (node !== null && i++ < offset) {
      if ($isTextNode(node)) {
        accumulatedOffset += node.getTextContentSize() + 1;
      } else {
        accumulatedOffset++;
      }
      node = node.getNextSibling();
    }
    offset = accumulatedOffset;
  }

  return createRelativePositionFromTypeIndex(sharedType, offset);
}

function createAbsolutePosition(
  relativePosition: RelativePosition,
  binding: Binding,
): AbsolutePosition | null {
  return createAbsolutePositionFromRelativePosition(
    relativePosition,
    binding.doc,
  );
}

function shouldUpdatePosition(
  currentPos: RelativePosition | null | undefined,
  pos: RelativePosition | null | undefined,
): boolean {
  if (currentPos == null) {
    if (pos != null) {
      return true;
    }
  } else if (pos == null || !compareRelativePositions(currentPos, pos)) {
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

function createCursorSelection(
  cursor: Cursor,
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
): CursorSelection {
  const color = cursor.color;
  const caret = document.createElement('span');
  caret.style.cssText = `position:absolute;top:0;bottom:0;right:-1px;width:1px;background-color:${color};z-index:10;`;
  const name = document.createElement('span');
  name.textContent = cursor.name;
  name.style.cssText = `position:absolute;left:-2px;top:-16px;background-color:${color};color:#fff;line-height:12px;font-size:12px;padding:2px;font-family:Arial;font-weight:bold;white-space:nowrap;`;
  caret.appendChild(name);
  return {
    anchor: {
      key: anchorKey,
      offset: anchorOffset,
    },
    caret,
    color,
    focus: {
      key: focusKey,
      offset: focusOffset,
    },
    name,
    selections: [],
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

  const cursorsContainerOffsetParent = cursorsContainer.offsetParent;
  if (cursorsContainerOffsetParent === null) {
    return;
  }

  const containerRect = cursorsContainerOffsetParent.getBoundingClientRect();
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

  const caret = nextSelection.caret;
  const color = nextSelection.color;
  const selections = nextSelection.selections;
  const anchor = nextSelection.anchor;
  const focus = nextSelection.focus;
  const anchorKey = anchor.key;
  const focusKey = focus.key;
  const anchorNode = nodeMap.get(anchorKey);
  const focusNode = nodeMap.get(focusKey);

  if (anchorNode == null || focusNode == null) {
    return;
  }
  let selectionRects: Array<DOMRect>;

  // In the case of a collapsed selection on a linebreak, we need
  // to improvise as the browser will return nothing here as <br>
  // apparantly take up no visual space :/
  // This won't work in all cases, but it's better than just showing
  // nothing all the time.
  if (anchorNode === focusNode && $isLineBreakNode(anchorNode)) {
    const brRect = (
      editor.getElementByKey(anchorKey) as HTMLElement
    ).getBoundingClientRect();
    selectionRects = [brRect];
  } else {
    const range = createDOMRange(
      editor,
      anchorNode,
      anchor.offset,
      focusNode,
      focus.offset,
    );

    if (range === null) {
      return;
    }
    selectionRects = createRectsFromDOMRange(editor, range);
  }

  const selectionsLength = selections.length;
  const selectionRectsLength = selectionRects.length;

  for (let i = 0; i < selectionRectsLength; i++) {
    const selectionRect = selectionRects[i];
    let selection = selections[i];

    if (selection === undefined) {
      selection = document.createElement('span');
      selections[i] = selection;
      const selectionBg = document.createElement('span');
      selection.appendChild(selectionBg);
      cursorsContainer.appendChild(selection);
    }

    const top = selectionRect.top - containerRect.top;
    const left = selectionRect.left - containerRect.left;
    const style = `position:absolute;top:${top}px;left:${left}px;height:${selectionRect.height}px;width:${selectionRect.width}px;pointer-events:none;z-index:5;`;
    selection.style.cssText = style;

    (
      selection.firstChild as HTMLSpanElement
    ).style.cssText = `${style}left:0;top:0;background-color:${color};opacity:0.3;`;

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
  provider: WebsocketProvider,
): void {
  const awareness = provider.awareness;
  const localState = awareness.getLocalState();

  if (localState === null) {
    return;
  }

  const anchorPos = localState.anchorPos;
  const focusPos = localState.focusPos;

  if (anchorPos !== null && focusPos !== null) {
    const anchorAbsPos = createAbsolutePosition(anchorPos, binding);
    const focusAbsPos = createAbsolutePosition(focusPos, binding);

    if (anchorAbsPos !== null && focusAbsPos !== null) {
      const [anchorCollabNode, anchorOffset] = getCollabNodeAndOffset(
        anchorAbsPos.type,
        anchorAbsPos.index,
      );
      const [focusCollabNode, focusOffset] = getCollabNodeAndOffset(
        focusAbsPos.type,
        focusAbsPos.index,
      );

      if (anchorCollabNode !== null && focusCollabNode !== null) {
        const anchorKey = anchorCollabNode.getKey();
        const focusKey = focusCollabNode.getKey();

        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return;
        }
        const anchor = selection.anchor;
        const focus = selection.focus;

        setPoint(anchor, anchorKey, anchorOffset);
        setPoint(focus, focusKey, focusOffset);
      }
    }
  }
}

function setPoint(point: Point, key: NodeKey, offset: number): void {
  if (point.key !== key || point.offset !== offset) {
    let anchorNode = $getNodeByKey(key);
    if (
      anchorNode !== null &&
      !$isElementNode(anchorNode) &&
      !$isTextNode(anchorNode)
    ) {
      const parent = anchorNode.getParentOrThrow();
      key = parent.getKey();
      offset = anchorNode.getIndexWithinParent();
      anchorNode = parent;
    }
    point.set(key, offset, $isElementNode(anchorNode) ? 'element' : 'text');
  }
}

function getCollabNodeAndOffset(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sharedType: any,
  offset: number,
): [
  (
    | null
    | CollabDecoratorNode
    | CollabElementNode
    | CollabTextNode
    | CollabLineBreakNode
  ),
  number,
] {
  const collabNode = sharedType._collabNode;

  if (collabNode === undefined) {
    return [null, 0];
  }

  if (collabNode instanceof CollabElementNode) {
    const {node, offset: collabNodeOffset} = getPositionFromElementAndOffset(
      collabNode,
      offset,
      true,
    );

    if (node === null) {
      return [collabNode, 0];
    } else {
      return [node, collabNodeOffset];
    }
  }

  return [null, 0];
}

export function syncCursorPositions(
  binding: Binding,
  provider: WebsocketProvider,
): void {
  const awarenessStates = Array.from(provider.awareness.getStates());
  const localClientID = binding.clientID;
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
          const [anchorCollabNode, anchorOffset] = getCollabNodeAndOffset(
            anchorAbsPos.type,
            anchorAbsPos.index,
          );
          const [focusCollabNode, focusOffset] = getCollabNodeAndOffset(
            focusAbsPos.type,
            focusAbsPos.index,
          );

          if (anchorCollabNode !== null && focusCollabNode !== null) {
            const anchorKey = anchorCollabNode.getKey();
            const focusKey = focusCollabNode.getKey();
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

export function syncLexicalSelectionToYjs(
  binding: Binding,
  provider: WebsocketProvider,
  prevSelection: null | RangeSelection | NodeSelection | GridSelection,
  nextSelection: null | RangeSelection | NodeSelection | GridSelection,
): void {
  const awareness = provider.awareness;
  const localState = awareness.getLocalState();

  if (localState === null) {
    return;
  }

  const {
    anchorPos: currentAnchorPos,
    focusPos: currentFocusPos,
    name,
    color,
    focusing,
  } = localState;
  let anchorPos = null;
  let focusPos = null;

  if (
    nextSelection === null ||
    (currentAnchorPos !== null && !nextSelection.is(prevSelection))
  ) {
    if (prevSelection === null) {
      return;
    }
  }

  if ($isRangeSelection(nextSelection)) {
    anchorPos = createRelativePosition(nextSelection.anchor, binding);
    focusPos = createRelativePosition(nextSelection.focus, binding);
  }

  if (
    shouldUpdatePosition(currentAnchorPos, anchorPos) ||
    shouldUpdatePosition(currentFocusPos, focusPos)
  ) {
    awareness.setLocalState({
      anchorPos,
      color,
      focusPos,
      focusing,
      name,
    });
  }
}
