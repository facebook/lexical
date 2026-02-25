/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  BaseSelection,
  LexicalNode,
  NodeKey,
  NodeMap,
  Point,
} from 'lexical';

import {createDOMRange, createRectsFromDOMRange} from '@lexical/selection';
import {
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
} from 'lexical';
import invariant from 'shared/invariant';
import {
  AbsolutePosition,
  compareRelativePositions,
  createAbsolutePositionFromRelativePosition,
  createRelativePositionFromTypeIndex,
  RelativePosition,
  XmlElement,
  XmlText,
} from 'yjs';

import {Provider, UserState} from '.';
import {
  AnyBinding,
  type BaseBinding,
  type Binding,
  type BindingV2,
  isBindingV1,
} from './Bindings';
import {CollabDecoratorNode} from './CollabDecoratorNode';
import {CollabElementNode} from './CollabElementNode';
import {CollabLineBreakNode} from './CollabLineBreakNode';
import {CollabTextNode} from './CollabTextNode';
import {CollabV2Mapping} from './CollabV2Mapping';
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
    invariant($isElementNode(parent), 'Element point must be an element node');
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

function createRelativePositionV2(
  point: Point,
  binding: BindingV2,
): null | RelativePosition {
  const {mapping} = binding;
  const {offset} = point;
  const node = point.getNode();
  const yType = mapping.getSharedType(node);
  if (yType === undefined) {
    return null;
  }
  if (point.type === 'text') {
    invariant($isTextNode(node), 'Text point must be a text node');
    let prevSibling = node.getPreviousSibling();
    let adjustedOffset = offset;
    while ($isTextNode(prevSibling)) {
      adjustedOffset += prevSibling.getTextContentSize();
      prevSibling = prevSibling.getPreviousSibling();
    }
    return createRelativePositionFromTypeIndex(yType, adjustedOffset);
  } else if (point.type === 'element') {
    invariant($isElementNode(node), 'Element point must be an element node');
    let i = 0;
    let child = node.getFirstChild();
    while (child !== null && i < offset) {
      if ($isTextNode(child)) {
        let nextSibling = child.getNextSibling();
        while ($isTextNode(nextSibling)) {
          nextSibling = nextSibling.getNextSibling();
        }
      }
      i++;
      child = child.getNextSibling();
    }
    return createRelativePositionFromTypeIndex(yType, i);
  }
  return null;
}

function createAbsolutePosition(
  relativePosition: RelativePosition,
  binding: BaseBinding,
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

function destroySelection(binding: BaseBinding, selection: CursorSelection) {
  const cursorsContainer = binding.cursorsContainer;

  if (cursorsContainer !== null) {
    const selections = selection.selections;
    const selectionsLength = selections.length;

    for (let i = 0; i < selectionsLength; i++) {
      cursorsContainer.removeChild(selections[i]);
    }
  }
}

function destroyCursor(binding: BaseBinding, cursor: Cursor) {
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
  binding: BaseBinding,
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
  // apparently take up no visual space :/
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

    (selection.firstChild as HTMLSpanElement).style.cssText =
      `${style}left:0;top:0;background-color:${color};opacity:0.3;`;

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

type AnyCollabNode =
  | CollabDecoratorNode
  | CollabElementNode
  | CollabTextNode
  | CollabLineBreakNode;

/**
 * @deprecated Use `$getAnchorAndFocusForUserState` instead.
 */
export function getAnchorAndFocusCollabNodesForUserState(
  binding: Binding,
  userState: UserState,
) {
  const {anchorPos, focusPos} = userState;
  let anchorCollabNode: AnyCollabNode | null = null;
  let anchorOffset = 0;
  let focusCollabNode: AnyCollabNode | null = null;
  let focusOffset = 0;

  if (anchorPos !== null && focusPos !== null) {
    const anchorAbsPos = createAbsolutePosition(anchorPos, binding);
    const focusAbsPos = createAbsolutePosition(focusPos, binding);

    if (anchorAbsPos !== null && focusAbsPos !== null) {
      [anchorCollabNode, anchorOffset] = getCollabNodeAndOffset(
        anchorAbsPos.type,
        anchorAbsPos.index,
      );
      [focusCollabNode, focusOffset] = getCollabNodeAndOffset(
        focusAbsPos.type,
        focusAbsPos.index,
      );
    }
  }

  return {
    anchorCollabNode,
    anchorOffset,
    focusCollabNode,
    focusOffset,
  };
}

export function $getAnchorAndFocusForUserState(
  binding: AnyBinding,
  userState: UserState,
): {
  anchorKey: NodeKey | null;
  anchorOffset: number;
  focusKey: NodeKey | null;
  focusOffset: number;
} {
  const {anchorPos, focusPos} = userState;
  const anchorAbsPos = anchorPos
    ? createAbsolutePosition(anchorPos, binding)
    : null;
  const focusAbsPos = focusPos
    ? createAbsolutePosition(focusPos, binding)
    : null;

  if (anchorAbsPos === null || focusAbsPos === null) {
    return {
      anchorKey: null,
      anchorOffset: 0,
      focusKey: null,
      focusOffset: 0,
    };
  }

  if (isBindingV1(binding)) {
    const [anchorCollabNode, anchorOffset] = getCollabNodeAndOffset(
      anchorAbsPos.type,
      anchorAbsPos.index,
    );
    const [focusCollabNode, focusOffset] = getCollabNodeAndOffset(
      focusAbsPos.type,
      focusAbsPos.index,
    );
    return {
      anchorKey: anchorCollabNode !== null ? anchorCollabNode.getKey() : null,
      anchorOffset,
      focusKey: focusCollabNode !== null ? focusCollabNode.getKey() : null,
      focusOffset,
    };
  }

  let [anchorNode, anchorOffset] = $getNodeAndOffsetV2(
    binding.mapping,
    anchorAbsPos,
  );
  let [focusNode, focusOffset] = $getNodeAndOffsetV2(
    binding.mapping,
    focusAbsPos,
  );
  // For a non-collapsed selection, if the start of the selection is as the end of a text node,
  // move it to the beginning of the next text node (if one exists).
  if (
    focusNode &&
    anchorNode &&
    (focusNode !== anchorNode || focusOffset !== anchorOffset)
  ) {
    const isBackwards = focusNode.isBefore(anchorNode);
    const startNode = isBackwards ? focusNode : anchorNode;
    const startOffset = isBackwards ? focusOffset : anchorOffset;
    if (
      $isTextNode(startNode) &&
      $isTextNode(startNode.getNextSibling()) &&
      startOffset === startNode.getTextContentSize()
    ) {
      if (isBackwards) {
        focusNode = startNode.getNextSibling();
        focusOffset = 0;
      } else {
        anchorNode = startNode.getNextSibling();
        anchorOffset = 0;
      }
    }
  }
  return {
    anchorKey: anchorNode !== null ? anchorNode.getKey() : null,
    anchorOffset,
    focusKey: focusNode !== null ? focusNode.getKey() : null,
    focusOffset,
  };
}

export function $syncLocalCursorPosition(
  binding: AnyBinding,
  provider: Provider,
): void {
  const awareness = provider.awareness;
  const localState = awareness.getLocalState();

  if (localState === null) {
    return;
  }

  const {anchorKey, anchorOffset, focusKey, focusOffset} =
    $getAnchorAndFocusForUserState(binding, localState);

  if (anchorKey !== null && focusKey !== null) {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    $setPoint(selection.anchor, anchorKey, anchorOffset);
    $setPoint(selection.focus, focusKey, focusOffset);
  }
}

function $setPoint(point: Point, key: NodeKey, offset: number): void {
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
): [null | AnyCollabNode, number] {
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

function $getNodeAndOffsetV2(
  mapping: CollabV2Mapping,
  absolutePosition: AbsolutePosition,
): [null | LexicalNode, number] {
  const yType = absolutePosition.type as XmlElement | XmlText;
  const yOffset = absolutePosition.index;
  if (yType instanceof XmlElement) {
    const node = mapping.get(yType);
    if (node === undefined) {
      return [null, 0];
    }
    if (!$isElementNode(node)) {
      return [node, yOffset];
    }
    let remainingYOffset = yOffset;
    let lexicalOffset = 0;
    const children = node.getChildren();
    while (remainingYOffset > 0 && lexicalOffset < children.length) {
      const child = children[lexicalOffset];
      remainingYOffset -= 1;
      lexicalOffset += 1;
      if ($isTextNode(child)) {
        while (
          lexicalOffset < children.length &&
          $isTextNode(children[lexicalOffset])
        ) {
          lexicalOffset += 1;
        }
      }
    }
    return [node, lexicalOffset];
  } else {
    const nodes = mapping.get(yType);
    if (nodes === undefined) {
      return [null, 0];
    }
    let i = 0;
    let adjustedOffset = yOffset;
    while (
      adjustedOffset > nodes[i].getTextContentSize() &&
      i + 1 < nodes.length
    ) {
      adjustedOffset -= nodes[i].getTextContentSize();
      i++;
    }
    const textNode = nodes[i];
    return [textNode, Math.min(adjustedOffset, textNode.getTextContentSize())];
  }
}

export type SyncCursorPositionsFn = (
  binding: AnyBinding,
  provider: Provider,
  options?: SyncCursorPositionsOptions,
) => void;

export type SyncCursorPositionsOptions = {
  getAwarenessStates?: (
    binding: BaseBinding,
    provider: Provider,
  ) => Map<number, UserState>;
};

function getAwarenessStatesDefault(
  _binding: BaseBinding,
  provider: Provider,
): Map<number, UserState> {
  return provider.awareness.getStates();
}

export function syncCursorPositions(
  binding: AnyBinding,
  provider: Provider,
  options?: SyncCursorPositionsOptions,
): void {
  const {getAwarenessStates = getAwarenessStatesDefault} = options ?? {};
  const awarenessStates = Array.from(getAwarenessStates(binding, provider));
  const localClientID = binding.clientID;
  const cursors = binding.cursors;
  const editor = binding.editor;
  const nodeMap = editor._editorState._nodeMap;
  const visitedClientIDs = new Set();

  for (let i = 0; i < awarenessStates.length; i++) {
    const awarenessState = awarenessStates[i];
    const [clientID, awareness] = awarenessState;

    if (clientID !== 0 && clientID !== localClientID) {
      visitedClientIDs.add(clientID);
      const {name, color, focusing} = awareness;
      let selection = null;

      let cursor = cursors.get(clientID);

      if (cursor === undefined) {
        cursor = createCursor(name, color);
        cursors.set(clientID, cursor);
      }

      if (focusing) {
        const {anchorKey, anchorOffset, focusKey, focusOffset} = editor.read(
          () => $getAnchorAndFocusForUserState(binding, awareness),
        );

        if (anchorKey !== null && focusKey !== null) {
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
  binding: AnyBinding,
  provider: Provider,
  prevSelection: null | BaseSelection,
  nextSelection: null | BaseSelection,
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
    awarenessData,
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
    if (isBindingV1(binding)) {
      anchorPos = createRelativePosition(nextSelection.anchor, binding);
      focusPos = createRelativePosition(nextSelection.focus, binding);
    } else {
      anchorPos = createRelativePositionV2(nextSelection.anchor, binding);
      focusPos = createRelativePositionV2(nextSelection.focus, binding);
    }
  }

  if (
    shouldUpdatePosition(currentAnchorPos, anchorPos) ||
    shouldUpdatePosition(currentFocusPos, focusPos)
  ) {
    awareness.setLocalState({
      ...localState,
      anchorPos,
      awarenessData,
      color,
      focusPos,
      focusing,
      name,
    });
  }
}
