/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {
  OutlineEditor,
  View,
  NodeKey,
  Selection,
  OutlineNode,
  ParsedNodeMap,
} from 'outline';

import {BlockNode, TextNode} from 'outline';
import {useEffect} from 'react';
import {
  CAN_USE_BEFORE_INPUT,
  IS_SAFARI,
  IS_CHROME,
} from 'outline-react/OutlineEnv';
import {
  isDeleteBackward,
  isDeleteForward,
  isDeleteLineBackward,
  isDeleteLineForward,
  isDeleteWordBackward,
  isDeleteWordForward,
  isLineBreak,
  isParagraph,
  isBold,
  isItalic,
} from 'outline-react/OutlineHotKeys';
import {
  deleteBackward,
  deleteForward,
  deleteLineBackward,
  deleteLineForward,
  deleteWordBackward,
  deleteWordForward,
  insertParagraph,
  formatText,
  insertNodes,
  insertText,
  removeText,
  getNodesInRange,
} from 'outline-react/OutlineSelectionHelpers';

// FlowFixMe: Flow doesn't know of the CompositionEvent?
// $FlowFixMe: TODO
type CompositionEvent = Object;

// TODO the Flow types here needs fixing
export type EventHandler = (
  // $FlowFixMe: not sure how to handle this generic properly
  event: Object,
  editor: OutlineEditor,
  state: EventHandlerState,
) => void;

export type InputEvents = Array<[string, EventHandler]>;

export type EventHandlerState = {
  isReadOnly: boolean,
  compositionSelection: null | Selection,
  richText: boolean,
  isHandlingPointer: boolean,
};

const emptyObject: {} = {};

const events: InputEvents = [
  ['selectionchange', onSelectionChange],
  ['keydown', onKeyDown],
  ['keyup', onKeyUp],
  ['pointerdown', onPointerDown],
  ['pointerup', onPointerUp],
  ['pointercancel', onPointerUp],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['cut', onCut],
  ['copy', onCopy],
];

if (CAN_USE_BEFORE_INPUT) {
  events.push(['beforeinput', onNativeBeforeInput]);
} else {
  events.push(
    ['paste', onPastePolyfill],
    ['drop', onDropPolyfill],
    ['dragstart', onDragStartPolyfill],
  );
}

function generateNodes(
  nodeRange: {range: Array<NodeKey>, nodeMap: ParsedNodeMap},
  view: View,
): Array<OutlineNode> {
  const {range, nodeMap: parsedNodeMap} = nodeRange;
  const nodes = [];
  for (let i = 0; i < range.length; i++) {
    const key = range[i];
    const parsedNode = parsedNodeMap[key];
    const node = view.createNodeFromParse(parsedNode, parsedNodeMap);
    nodes.push(node);
  }
  return nodes;
}

function insertDataTransfer(
  dataTransfer: DataTransfer,
  selection: Selection,
  state: EventHandlerState,
  view: View,
  editor: OutlineEditor,
): void {
  if (state.richText) {
    const outlineNodesString = dataTransfer.getData(
      'application/x-outline-nodes',
    );

    if (outlineNodesString) {
      const nodeRange = JSON.parse(outlineNodesString);
      const nodes = generateNodes(nodeRange, view);
      insertNodes(selection, nodes);
      return;
    }
  }
  const text = dataTransfer.getData('text/plain');
  if (text != null) {
    insertText(selection, text);
  }
}

let _graphemeIterator = null;
// $FlowFixMe: Missing a Flow type for `Intl.Segmenter`.
function getGraphemeIterator(): Intl.Segmenter {
  if (_graphemeIterator === null) {
    _graphemeIterator =
      // $FlowFixMe: Missing a Flow type for `Intl.Segmenter`.
      new Intl.Segmenter(undefined /* locale */, {granularity: 'grapheme'});
  }
  return _graphemeIterator;
}

function hasAtLeastTwoVisibleChars(s: string): boolean {
  try {
    const iterator = getGraphemeIterator().segment(s);
    return iterator.next() != null && iterator.next() != null;
  } catch {
    // TODO: Implement polyfill for `Intl.Segmenter`.
    return [...s].length > 1;
  }
}

function announceString(s: string): void {
  const body = document.body;
  if (body != null) {
    const announce = document.createElement('div');
    announce.setAttribute('id', 'outline_announce_' + Date.now());
    announce.setAttribute('aria-live', 'polite');
    announce.style.cssText =
      'clip: rect(0, 0, 0, 0); height: 1px; overflow: hidden; position: absolute; width: 1px';
    body.appendChild(announce);

    // The trick to make all screen readers to read the text is to create AND update an element with a unique id:
    // - JAWS remains silent without update
    // - VO remains silent without create, if the text is the same (and doing `announce.textContent=''` doesn't help)
    setTimeout(() => {
      announce.textContent = s;
    }, 100);

    setTimeout(() => {
      body.removeChild(announce);
    }, 500);
  }
}

function announceNode(node: OutlineNode): void {
  if (
    node instanceof TextNode &&
    hasAtLeastTwoVisibleChars(node.getTextContent())
  ) {
    announceString(node.getTextContent());
  }
}

function isModifierActive(event: KeyboardEvent): boolean {
  // We don't need to check for metaKey here as we already
  // do this before we reach this block.
  return event.shiftKey || event.altKey || event.ctrlKey;
}

function onKeyUp(event: KeyboardEvent, editor: OutlineEditor): void {
  editor.setKeyDown(false);
}

function onKeyDown(
  event: KeyboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  editor.setKeyDown(true);
  if (editor.isComposing()) {
    return;
  }
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection === null) {
      return;
    }
    let shouldPreventDefault = false;
    // If we can use native beforeinput, we handle
    // these cases in that function.
    if (!CAN_USE_BEFORE_INPUT) {
      if (isDeleteBackward(event)) {
        shouldPreventDefault = true;
        deleteBackward(selection);
      } else if (isDeleteForward(event)) {
        shouldPreventDefault = true;
        deleteForward(selection);
      } else if (isDeleteLineBackward(event)) {
        shouldPreventDefault = true;
        deleteLineBackward(selection);
      } else if (isDeleteLineForward(event)) {
        shouldPreventDefault = true;
        deleteLineForward(selection);
      } else if (isDeleteWordBackward(event)) {
        shouldPreventDefault = true;
        deleteWordBackward(selection);
      } else if (isDeleteWordForward(event)) {
        shouldPreventDefault = true;
        deleteWordForward(selection);
      } else if (isParagraph(event)) {
        shouldPreventDefault = true;
        if (state.richText) {
          insertParagraph(selection);
        } else {
          insertText(selection, '\n');
        }
      } else if (isLineBreak(event)) {
        shouldPreventDefault = true;
        insertText(selection, '\n');
      }
    }
    // Used for screen readers and speech tooling
    if (state.richText) {
      if (isBold(event)) {
        shouldPreventDefault = true;
        formatText(selection, 'bold');
      } else if (isItalic(event)) {
        shouldPreventDefault = true;
        formatText(selection, 'italic');
      }
    }
    const editorElement = editor.getEditorElement();
    // Handle moving/deleting selection with left/right around immutable or segmented nodes, which should be handled as a single character.
    // This is important for screen readers + text to speech accessibility tooling. About screen readers and caret moves:
    // In Windows, JAWS and NVDA always announce the character at the right of the caret.
    // In MacOS, VO always announces the character over which the caret jumped.
    if (selection.isCaret() && editorElement !== null && !event.metaKey) {
      const key = event.key;
      const isLeftArrow = key === 'ArrowLeft';
      const isRightArrow = key === 'ArrowRight';
      const isDelete = key === 'Delete';
      const isBackspace = key === 'Backspace';

      if (isLeftArrow || isRightArrow || isDelete || isBackspace) {
        const anchorNode = selection.getAnchorNode();
        const offset = selection.anchorOffset;
        const textContent = anchorNode.getTextContent();

        if (isLeftArrow || isBackspace) {
          const selectionAtStart = offset === 0;

          if (selectionAtStart) {
            const prevSibling = anchorNode.getPreviousSibling();

            if (prevSibling === null) {
              // On empty text nodes, we always move native DOM selection
              // to offset 1. Although it's at 1, we really mean that it
              // is at 0 in our model. So when we encounter a left arrow
              // we need to move selection to the previous block if
              // we have no previous sibling.
              if (isLeftArrow && textContent === '') {
                const parent = anchorNode.getParentOrThrow();
                const parentSibling = parent.getPreviousSibling();

                if (parentSibling instanceof BlockNode) {
                  const lastChild = parentSibling.getLastChild();
                  if (lastChild instanceof TextNode) {
                    lastChild.select();
                    shouldPreventDefault = true;
                  }
                }
              }
            } else {
              let targetPrevSibling = prevSibling;
              if (prevSibling.isImmutable() || prevSibling.isSegmented()) {
                if (isLeftArrow) {
                  announceNode(prevSibling);
                  targetPrevSibling = prevSibling.getPreviousSibling();
                } else if (!isModifierActive(event)) {
                  deleteBackward(selection);
                  shouldPreventDefault = true;
                }
              } else if (prevSibling.isInert()) {
                targetPrevSibling = prevSibling.getPreviousSibling();
                if (
                  !isLeftArrow &&
                  selection.isCaret() &&
                  targetPrevSibling instanceof TextNode
                ) {
                  const prevKey = targetPrevSibling.getKey();
                  const prevOffset = targetPrevSibling.getTextContent().length;
                  selection.setRange(prevKey, prevOffset, prevKey, prevOffset);
                  deleteBackward(selection);
                  shouldPreventDefault = true;
                }
              }
              // Due to empty text nodes having an offset of 1, we need to
              // account for this and move selection accordingly when right
              // arrow is pressed.
              if (isLeftArrow && targetPrevSibling instanceof TextNode) {
                shouldPreventDefault = true;
                if (targetPrevSibling === prevSibling) {
                  const prevSiblingTextContent = targetPrevSibling.getTextContent();
                  // We adjust the offset by 1, as we will have have moved between
                  // two adjacent nodes.
                  const endOffset = prevSiblingTextContent.length - 1;
                  targetPrevSibling.select(endOffset, endOffset);
                } else {
                  // We don't adjust offset as the nodes are not adjacent (the target
                  // isn't the same as the prevSibling).
                  targetPrevSibling.select();
                }
              }
            }
          }
        } else {
          const textContentLength = textContent.length;
          const selectionAtEnd = textContentLength === offset;
          const selectionJustBeforeEnd = textContentLength === offset + 1;

          if (selectionAtEnd || selectionJustBeforeEnd) {
            const nextSibling = anchorNode.getNextSibling();

            if (nextSibling !== null) {
              if (nextSibling.isImmutable() || nextSibling.isSegmented()) {
                if (isRightArrow) {
                  if (
                    (IS_APPLE && selectionAtEnd) ||
                    (!IS_APPLE && selectionJustBeforeEnd)
                  ) {
                    announceNode(nextSibling);
                  }
                } else if (selectionAtEnd && !isModifierActive(event)) {
                  deleteForward(selection);
                  shouldPreventDefault = true;
                }
              }
            }
          }
        }
      }
    }
    if (shouldPreventDefault) {
      event.preventDefault();
    }
  });
}

function onPastePolyfill(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  event.preventDefault();
  editor.update((view) => {
    const selection = view.getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && selection !== null) {
      insertDataTransfer(clipboardData, selection, state, view, editor);
    }
  });
}

function onDropPolyfill(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  // TODO
  event.preventDefault();
}

function onDragStartPolyfill(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  // TODO: seems to be only FF that supports dragging content
  event.preventDefault();
}

function onCut(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  onCopy(event, editor, state);
  editor.update((view) => {
    const selection = view.getSelection();
    if (selection !== null) {
      removeText(selection);
    }
  });
}

function onCopy(
  event: ClipboardEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  event.preventDefault();
  editor.update((view) => {
    const clipboardData = event.clipboardData;
    const selection = view.getSelection();
    if (selection !== null) {
      if (clipboardData != null) {
        const domSelection = window.getSelection();
        const range = domSelection.getRangeAt(0);
        if (range) {
          const container = document.createElement('div');
          const frag = range.cloneContents();
          container.appendChild(frag);
          clipboardData.setData('text/html', container.innerHTML);
        }
        clipboardData.setData('text/plain', selection.getTextContent());
        clipboardData.setData(
          'application/x-outline-nodes',
          JSON.stringify(getNodesInRange(selection)),
        );
      }
    }
  });
}

function onCompositionStart(
  event: CompositionEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  editor.update((view) => {
    const selection = view.getSelection();
    editor.setComposing(true);
    if (selection !== null) {
      // We only have native beforeinput composition events for
      // Safari, so we have to apply the composition selection for
      // other browsers.
      if (!IS_SAFARI) {
        state.compositionSelection = selection;
      }
      if (!selection.isCaret()) {
        removeText(selection);
      }
    }
  });
}

function onCompositionEnd(
  event: CompositionEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const data = event.data;
  editor.update((view) => {
    const selection = view.getSelection();
    editor.setComposing(false);
    if (data != null && selection !== null) {
      // We only have native beforeinput composition events for
      // Safari, so we have to apply the composition selection for
      // other browsers.
      if (!IS_SAFARI) {
        const compositionSelection = state.compositionSelection;
        state.compositionSelection = null;
        if (compositionSelection !== null) {
          selection.setRange(
            compositionSelection.anchorKey,
            compositionSelection.anchorOffset,
            compositionSelection.focusKey,
            compositionSelection.focusOffset,
          );
        }
      }
      // Handle the fact that Chromium/FF nightly doesn't fire beforeInput's
      // insertFromComposition/deleteByComposition composition events, so we
      // need to listen to the compositionend event to apply the composition
      // data and also handle composition selection. There's no good way of
      // detecting this, so we'll have to use browser agents.
      if (!IS_SAFARI && CAN_USE_BEFORE_INPUT) {
        insertText(selection, data);
      }
    }
  });
}

function onSelectionChange(
  event: Event,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const selection = window.getSelection();
  const editorElement = editor.getEditorElement();
  if (editorElement && !editorElement.contains(selection.anchorNode)) {
    return;
  }
  editor.update((view) => {
    view.getSelection();
  });
}

function onPointerDown(
  event: PointerEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  state.isHandlingPointer = true;
  // Throttle setting of the flag for 50ms, as we don't want this to trigger
  // for simple clicks.
  setTimeout(() => {
    if (state.isHandlingPointer) {
      editor.setPointerDown(true);
    }
  }, 50);
}

function onPointerUp(
  event: PointerEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  state.isHandlingPointer = false;
  editor.setPointerDown(false);
}

function onNativeBeforeInput(
  event: InputEvent,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const inputType = event.inputType;

  // These two types occur while a user is composing text and can't be
  // cancelled. Let them through and wait for the composition to end.
  if (
    inputType === 'insertCompositionText' ||
    inputType === 'deleteCompositionText'
  ) {
    return;
  }
  // $FlowFixMe: Flow doesn't think we can prevent Input Events
  event.preventDefault();
  editor.update((view) => {
    const selection = view.getSelection();

    if (selection === null) {
      return;
    }
    // Chromium has a bug with the wrong offsets for deleteSoftLineBackward.
    // See: https://bugs.chromium.org/p/chromium/issues/detail?id=1043564
    if (inputType !== 'deleteSoftLineBackward' || !IS_CHROME) {
      // $FlowFixMe: Flow doesn't know of getTargetRanges
      const targetRange = event.getTargetRanges()[0];
      const editorElement = editor.getEditorElement();

      if (targetRange != null && editorElement !== null) {
        selection.applyDOMRange(targetRange);
      }
    }
    const data = event.data;

    switch (inputType) {
      case 'formatBold': {
        if (state.richText) {
          formatText(selection, 'bold');
        }
        break;
      }
      case 'formatItalic': {
        if (state.richText) {
          formatText(selection, 'italic');
        }
        break;
      }
      case 'formatStrikeThrough': {
        if (state.richText) {
          formatText(selection, 'strikethrough');
        }
        break;
      }
      case 'formatUnderline': {
        if (state.richText) {
          formatText(selection, 'underline');
        }
        break;
      }
      case 'insertText':
      case 'insertFromComposition': {
        if (data) {
          insertText(selection, data);
        }
        break;
      }
      case 'insertFromYank':
      case 'insertFromDrop':
      case 'insertReplacementText':
      case 'insertFromPaste': {
        // $FlowFixMe: Flow doesn't know about the dataTransfer field
        const dataTransfer = event.dataTransfer;
        if (dataTransfer != null) {
          insertDataTransfer(dataTransfer, selection, state, view, editor);
        } else {
          if (data) {
            insertText(selection, data);
          }
        }
        break;
      }
      case 'insertLineBreak': {
        insertText(selection, '\n');
        break;
      }
      case 'insertParagraph': {
        if (state.richText) {
          insertParagraph(selection);
        } else {
          insertText(selection, '\n');
        }
        break;
      }
      case 'deleteByComposition':
      case 'deleteByDrag':
      case 'deleteByCut': {
        removeText(selection);
        break;
      }
      case 'deleteContentBackward': {
        deleteBackward(selection);
        break;
      }
      case 'deleteContent':
      case 'deleteContentForward': {
        deleteForward(selection);
        break;
      }
      case 'deleteWordBackward': {
        deleteWordBackward(selection);
        break;
      }
      case 'deleteWordForward': {
        deleteWordForward(selection);
        break;
      }
      case 'deleteHardLineBackward':
      case 'deleteSoftLineBackward': {
        deleteLineBackward(selection);
        break;
      }
      case 'deleteSoftLineForward': {
        deleteLineForward(selection);
        break;
      }
      case 'historyUndo':
      case 'historyRedo':
        // Handled with useOutlineHistory
        break;
      default:
      // NO-OP
    }
  });
}

function onPolyfilledBeforeInput(
  event: SyntheticInputEvent<EventTarget>,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  event.preventDefault();
  editor.update((view) => {
    const selection = view.getSelection();
    const data = event.data;
    if (data != null && selection !== null) {
      insertText(selection, data);
    }
  });
}

export default function useOutlineInputEvents(
  editor: OutlineEditor,
  state: EventHandlerState,
): {} | {onBeforeInput: (event: SyntheticInputEvent<>) => void} {
  useEffect(() => {
    if (editor !== null) {
      const target: null | HTMLElement = editor.getEditorElement();

      if (target !== null && state !== null) {
        const teardown = events.map(([eventName, handler]) => {
          let eventTarget = target;
          if (
            eventName === 'selectionchange' ||
            eventName === 'keyup' ||
            eventName === 'pointerup' ||
            eventName === 'pointercancel'
          ) {
            eventTarget = target.ownerDocument;
          }
          const handlerWrapper = (event: Event) => {
            handler(event, editor, state);
          };
          eventTarget.addEventListener(eventName, handlerWrapper);
          return () => {
            eventTarget.removeEventListener(eventName, handlerWrapper);
          };
        });

        return () => {
          teardown.forEach((destroy) => destroy());
        };
      }
    }
  }, [editor, state]);

  return CAN_USE_BEFORE_INPUT
    ? emptyObject
    : {
        onBeforeInput: (event: SyntheticInputEvent<EventTarget>) => {
          onPolyfilledBeforeInput(event, editor, state);
        },
      };
}
