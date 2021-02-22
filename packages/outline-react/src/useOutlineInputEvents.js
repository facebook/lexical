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
import {useCallback, useEffect, useRef} from 'react';
import useOutlineEventWrapper from 'outline-react/useOutlineEventWrapper';
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
// $FlowFixMe: TODO
type UnknownState = Object;

const emptyObject: {} = {};

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
  state: UnknownState,
  view: View,
  editor: OutlineEditor,
) {
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

function onKeyDown(
  event: KeyboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  editor.setKeyDown(true);
  if (editor.isComposing()) {
    return;
  }
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
            if (prevSibling.isInert()) {
              shouldPreventDefault = true;
              targetPrevSibling = null;
            } else if (prevSibling.isImmutable() || prevSibling.isSegmented()) {
              if (isLeftArrow) {
                announceNode(prevSibling);
                targetPrevSibling = prevSibling.getPreviousSibling();
              } else if (!isModifierActive(event)) {
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
            if (nextSibling.isInert() && selectionAtEnd) {
              shouldPreventDefault = true;
            } else if (nextSibling.isImmutable() || nextSibling.isSegmented()) {
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
}

function onPastePolyfill(
  event: ClipboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  event.preventDefault();
  const selection = view.getSelection();
  const clipboardData = event.clipboardData;
  if (clipboardData != null && selection !== null) {
    insertDataTransfer(clipboardData, selection, state, view, editor);
  }
}

function onDropPolyfill(
  event: ClipboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
) {
  // TODO
  event.preventDefault();
}

function onDragStartPolyfill(
  event: ClipboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
) {
  // TODO: seems to be only FF that supports dragging content
  event.preventDefault();
}

function onCut(
  event: ClipboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  onCopy(event, view, state, editor);
  const selection = view.getSelection();
  if (selection !== null) {
    removeText(selection);
  }
}

function onCopy(
  event: ClipboardEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  event.preventDefault();
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
}

function onCompositionStart(
  event: CompositionEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
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
}

function onCompositionEnd(
  event: CompositionEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  const data = event.data;
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
}

function onSelectionChange(
  event: FocusEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  view.getSelection();
}

function onNativeBeforeInput(
  event: InputEvent,
  view: View,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  // $FlowFixMe: Flow doesn't know of the inputType field
  const inputType = event.inputType;

  // These two types occur while a user is composing text and can't be
  // cancelled. Let them through and wait for the composition to end.
  if (
    inputType === 'insertCompositionText' ||
    inputType === 'deleteCompositionText'
  ) {
    return;
  }
  event.preventDefault();
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
      selection.applyDOMRange(targetRange, editorElement);
    }
  }

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
      const data = event.data;
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
        const data = event.data;
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
    default: {
      throw new Error('TODO - ' + inputType);
    }
  }
}

function onPolyfilledBeforeInput(
  event: SyntheticInputEvent<EventTarget>,
  view: View,
  state: UnknownState,
): void {
  event.preventDefault();
  const selection = view.getSelection();
  const data = event.data;
  if (data != null && selection !== null) {
    insertText(selection, data);
  }
}

export default function useOutlineInputEvents<T>(
  editor: OutlineEditor,
  stateRef: RefObject<T>,
): {} | {onBeforeInput: (event: SyntheticInputEvent<T>) => void} {
  const isHandlingPointerRef = useRef(false);
  const handleNativeBeforeInput = useOutlineEventWrapper(
    onNativeBeforeInput,
    editor,
    stateRef,
  );
  const handlePolyfilledBeforeInput = useOutlineEventWrapper(
    onPolyfilledBeforeInput,
    editor,
    stateRef,
  );
  const handleKeyDown = useOutlineEventWrapper(onKeyDown, editor, stateRef);
  const handleKeyUp = useCallback(() => {
    editor.setKeyDown(false);
  }, [editor]);
  const handlePointerDown = useCallback(() => {
    isHandlingPointerRef.current = true;
    // Throttle setting of the flag for 50ms, as we don't want this to trigger
    // for simple clicks.
    setTimeout(() => {
      if (isHandlingPointerRef.current) {
        editor.setPointerDown(true);
      }
    }, 50);
  }, [editor]);
  const handlePointerUp = useCallback(() => {
    isHandlingPointerRef.current = false;
    editor.setPointerDown(false);
  }, [editor]);
  const handlePaste = useOutlineEventWrapper(onPastePolyfill, editor, stateRef);
  const handleCut = useOutlineEventWrapper(onCut, editor, stateRef);
  const handleCopy = useOutlineEventWrapper(onCopy, editor, stateRef);
  const handleDrop = useOutlineEventWrapper(onDropPolyfill, editor, stateRef);
  const handleDragStart = useOutlineEventWrapper(
    onDragStartPolyfill,
    editor,
    stateRef,
  );
  const handleCompositionStart = useOutlineEventWrapper(
    onCompositionStart,
    editor,
    stateRef,
  );
  const handleCompositionEnd = useOutlineEventWrapper(
    onCompositionEnd,
    editor,
    stateRef,
  );
  const handleSelectionChange = useOutlineEventWrapper(
    onSelectionChange,
    editor,
    stateRef,
  );
  useEffect(() => {
    if (editor !== null) {
      const target: null | HTMLElement = editor.getEditorElement();

      if (target !== null) {
        target.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        target.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
        target.addEventListener('compositionstart', handleCompositionStart);
        target.addEventListener('compositionend', handleCompositionEnd);
        target.addEventListener('cut', handleCut);
        target.addEventListener('copy', handleCopy);
        document.addEventListener('selectionchange', handleSelectionChange);

        if (CAN_USE_BEFORE_INPUT) {
          target.addEventListener('beforeinput', handleNativeBeforeInput);
        } else {
          target.addEventListener('paste', handlePaste);
          target.addEventListener('drop', handleDrop);
          target.addEventListener('dragstart', handleDragStart);
        }
        return () => {
          target.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
          target.removeEventListener(
            'compositionstart',
            handleCompositionStart,
          );
          target.removeEventListener('compositionend', handleCompositionEnd);
          target.removeEventListener('cut', handleCut);
          target.removeEventListener('copy', handleCopy);
          document.removeEventListener(
            'selectionchange',
            handleSelectionChange,
          );

          if (CAN_USE_BEFORE_INPUT) {
            target.removeEventListener('beforeinput', handleNativeBeforeInput);
          } else {
            target.removeEventListener('paste', handlePaste);
            target.removeEventListener('drop', handleDrop);
            target.removeEventListener('dragstart', handleDragStart);
          }
        };
      }
    }
  }, [
    editor,
    handleCompositionStart,
    handleCompositionEnd,
    handleCut,
    handleKeyDown,
    handleKeyUp,
    handleNativeBeforeInput,
    handlePaste,
    handleSelectionChange,
    handleDrop,
    handleDragStart,
    handleCopy,
    handlePointerDown,
    handlePointerUp,
  ]);

  return CAN_USE_BEFORE_INPUT
    ? emptyObject
    : {onBeforeInput: handlePolyfilledBeforeInput};
}
