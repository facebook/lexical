/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Binding} from './Bindings';
import type {
  BaseSelection,
  EditorThemeClasses,
  NodeKey,
  NodeMap,
  Point,
} from 'lexical';
import type {AbsolutePosition, RelativePosition} from 'yjs';

import {createDOMRange} from '@lexical/selection';
import {
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
} from 'lexical';
import invariant from 'shared/invariant';
import {
  compareRelativePositions,
  createAbsolutePositionFromRelativePosition,
  createRelativePositionFromTypeIndex,
} from 'yjs';

import {Provider} from '.';
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
  editorThemeClasses: EditorThemeClasses,
  cursor: Cursor,
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
): CursorSelection {
  const color = cursor.color;
  const caret = document.createElement('span');
  if (
    editorThemeClasses.collaboration &&
    editorThemeClasses.collaboration.caret
  ) {
    caret.style.cssText = `--color:${color};`;
    caret.classList.add(editorThemeClasses.collaboration.caret);
  } else {
    caret.style.cssText = `position:absolute;top:0;bottom:0;right:-1px;width:1px;background-color:${color};z-index:10;`;
  }

  const name = document.createElement('span');
  name.textContent = cursor.name;
  if (
    editorThemeClasses.collaboration &&
    editorThemeClasses.collaboration.name
  ) {
    name.classList.add(editorThemeClasses.collaboration.name);
    name.style.cssText = `--color:${color};`;
  } else {
    name.style.cssText = `position:absolute;left:-2px;top:-16px;background-color:${color};color:#fff;line-height:12px;font-size:12px;padding:2px;font-family:Arial;font-weight:bold;white-space:nowrap;`;
  }

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

export function getCaretPosition(element: HTMLElement, caretOffset: number) {
  const textContent = element.textContent;
  const isRtl = getComputedStyle(element).direction === 'rtl';

  if (!textContent) {
    const elementRect = element.getBoundingClientRect();
    return new DOMRect(
      isRtl ? elementRect.right : elementRect.left,
      elementRect.top,
      0,
      elementRect.height,
    );
  }

  const range = document.createRange();
  range.setStart(element.firstChild!, caretOffset);
  range.setEnd(element.firstChild!, caretOffset);

  const rangeRect = range.getBoundingClientRect();

  return new DOMRect(
    isRtl ? rangeRect.right : rangeRect.left,
    rangeRect.top,
    0,
    rangeRect.height,
  );
}

export function getSelectionPosition(
  element: HTMLElement,
  offsetStart: number,
  offsetEnd: number,
  rootRect: DOMRect,
) {
  const fullText = element.textContent;
  if (!fullText) {
    return [];
  }

  const actualStartOffset = Math.min(offsetStart, offsetEnd);
  const actualEndOffset = Math.max(offsetStart, offsetEnd);
  const textSlice = fullText.slice(actualStartOffset, actualEndOffset);

  const words = textSlice.split(' ');

  const range = document.createRange();
  const rects: DOMRect[] = [];
  let lastRectTop: number | null = null;
  let wordStart = actualStartOffset;

  words.forEach((word) => {
    range.setStart(element.firstChild!, wordStart);
    range.setEnd(element.firstChild!, wordStart + word.length);

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      wordStart += word.length + 1;
      return;
    }

    if (lastRectTop === rect.top) {
      // Extend the current rect for RTL or LTR text
      rects[rects.length - 1] = new DOMRect(
        Math.min(rects[rects.length - 1].x, rect.x),
        rect.y,
        Math.max(rects[rects.length - 1].right, rect.right) -
          Math.min(rects[rects.length - 1].x, rect.x),
        rect.height,
      );
    } else {
      // New line or first word
      rects.push(new DOMRect(rect.x, rect.y, rect.width, rect.height));
      lastRectTop = rect.top;
    }

    wordStart += word.length + 1; // Move to the start of the next word
  });

  return rects.map(
    (r) =>
      new DOMRect(r.x - rootRect.left, r.y - rootRect.top, r.width, r.height),
  );
}

export function getElementsInRange(range: Range): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function (node) {
        if (range.intersectsNode(node)) {
          return NodeFilter.FILTER_ACCEPT;
        }

        return NodeFilter.FILTER_REJECT;
      },
    },
  );

  let node = walker.nextNode() as HTMLElement;
  while (node) {
    const hastElements = node.children.length > 0;
    if (hastElements) {
      node = walker.nextNode() as HTMLElement;
      continue;
    }
    elements.push(node as HTMLElement);
    node = walker.nextNode() as HTMLElement;
  }

  return elements;
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

  if (anchorNode === focusNode && anchor.offset === focus.offset) {
    const caretRect = getCaretPosition(
      editor.getElementByKey(anchorKey) as HTMLElement,
      anchor.offset,
    );
    selectionRects = [caretRect];
  } else if (anchorNode === focusNode) {
    selectionRects = getSelectionPosition(
      editor.getElementByKey(anchorKey) as HTMLElement,
      anchor.offset,
      focus.offset,
      containerRect,
    );
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
    const elements = getElementsInRange(range);

    const anchorElement = editor.getElementByKey(anchorKey);

    if (!anchorElement) {
      return;
    }

    // Calculating selection is forward or backward since it not saved on the selection
    const isForwardSelection =
      anchorElement.compareDocumentPosition(
        editor.getElementByKey(focusKey)!,
      ) === Node.DOCUMENT_POSITION_FOLLOWING;

    // Running this calculation on all elements is expensive,
    // we could do virtualization to only calculate the elements in view
    // or cap the number of elements to calculate
    selectionRects = elements.flatMap((element, index) => {
      if (!element.textContent) {
        return [];
      }
      const elementTextLength = element.textContent.length || 0;

      if (elementTextLength === 0) {
        return [];
      }
      let start = 0;
      let end = 0;
      if (index === 0) {
        // First element
        start = isForwardSelection ? anchor.offset : focus.offset;
        end = elementTextLength;
      } else if (index === elements.length - 1) {
        // Last element
        start = 0;
        end = isForwardSelection ? focus.offset : anchor.offset;
      } else {
        // Middle elements
        start = 0;
        end = elementTextLength;
      }

      return getSelectionPosition(element, start, end, containerRect);
    });
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

    const theme = editor._config.theme;

    const top = selectionRect.top - containerRect.top;
    const left = selectionRect.left - containerRect.left;
    const style = `position:absolute;top:${top}px;left:${left}px;height:${selectionRect.height}px;width:${selectionRect.width}px;pointer-events:none;z-index:5;`;
    if (theme.collaboration && theme.collaboration.selectionContainer) {
      selection.classList.add(theme.collaboration.selectionContainer);
      selection.style.cssText = `--top:${top}px;--left:${left}px;--height:${selectionRect.height}px;--width:${selectionRect.width}px;--color:${color};`;
    } else {
      selection.style.cssText = style;
    }

    if (theme.collaboration && theme.collaboration.selection) {
      (selection.firstChild as HTMLSpanElement).classList.add(
        theme.collaboration.selection,
      );
    } else {
      (
        selection.firstChild as HTMLSpanElement
      ).style.cssText = `${style}left:0;top:0;background-color:${color};opacity:0.3;`;
    }
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
  provider: Provider,
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

            const dir =
              getComputedStyle(
                editor.getElementByKey(focusKey) || document.documentElement,
              ).direction || 'ltr';

            if (selection === null) {
              const theme = editor._config.theme;
              selection = createCursorSelection(
                theme,
                cursor,
                anchorKey,
                anchorOffset,
                focusKey,
                focusOffset,
              );
              selection.caret.setAttribute('dir', dir);
              selection.name.setAttribute('dir', dir);
            } else {
              const anchor = selection.anchor;
              const focus = selection.focus;
              selection.caret.setAttribute('dir', dir);
              selection.name.setAttribute('dir', dir);
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
    anchorPos = createRelativePosition(nextSelection.anchor, binding);
    focusPos = createRelativePosition(nextSelection.focus, binding);
  }

  if (
    shouldUpdatePosition(currentAnchorPos, anchorPos) ||
    shouldUpdatePosition(currentFocusPos, focusPos)
  ) {
    awareness.setLocalState({
      anchorPos,
      awarenessData,
      color,
      focusPos,
      focusing,
      name,
    });
  }
}
