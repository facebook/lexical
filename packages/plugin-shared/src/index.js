// @flow strict-local

import {useCallback, useEffect} from 'react';
import {createParagraph, createText} from 'outline';
import {CAN_USE_BEFORE_INPUT, IS_FIREFOX, IS_SAFARI} from './env';
import {
  isDeleteBackward,
  isDeleteForward,
  isLineBreak,
  isMoveBackward,
  isMoveForward,
  isMoveWordBackward,
  isMoveWordForward,
  isParagraph,
} from './hotKeys';

import type {OutlineEditor, ViewType} from 'outline';

export const emptyObject: {} = {};

export const FORMAT_BOLD = 0;
export const FORMAT_ITALIC = 1;
export const FORMAT_STRIKETHROUGH = 2;
export const FORMAT_UNDERLINE = 3;
export const FORMAT_CODE = 4;

// FlowFixMe: Flow doesn't know of the CompositionEvent?
// $FlowFixMe: TODO
type CompositionEvent = Object;
// $FlowFixMe: TODO
type UnknownEvent = Object;
// $FlowFixMe: TODO
type UnknownState = Object;

function useEventWrapper<T>(
  handler: (
    event: UnknownEvent,
    view: ViewType,
    state: UnknownState,
    editor: OutlineEditor,
  ) => void,
  editor: null | OutlineEditor,
  stateRef?: RefObject<T>,
): (event: UnknownEvent) => void {
  return useCallback(
    (event) => {
      const state = stateRef && stateRef.current;
      if (editor !== null) {
        const viewModel = editor.draft((view) =>
          handler(event, view, state, editor),
        );
        if (!editor.isUpdating()) {
          editor.update(viewModel);
        }
      }
    },
    [stateRef, editor, handler],
  );
}

export function useEvent<T>(
  editor: null | OutlineEditor,
  eventName: string,
  handler: (event: UnknownEvent, view: ViewType) => void,
  stateRef?: RefObject<T>,
): void {
  const wrapper = useEventWrapper(handler, editor, stateRef);
  useEffect(() => {
    if (editor !== null) {
      const target =
        eventName === 'selectionchange' ? document : editor.getEditorElement();

      // $FlowFixMe
      target.addEventListener(eventName, wrapper);
      return () => {
        // $FlowFixMe
        target.removeEventListener(eventName, wrapper);
      };
    }
  }, [eventName, editor, wrapper]);
}

export function onFocusIn(event: FocusEvent, view: ViewType) {
  const root = view.getRoot();

  if (root.getFirstChild() === null) {
    const text = createText();
    root.append(createParagraph().append(text));
    text.select();
  }
}

export function insertFromDataTransfer(
  dataTransfer: DataTransfer,
  editor: OutlineEditor,
): void {
  const items = dataTransfer.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'string' && item.type === 'text/plain') {
      item.getAsString((text) => {
        const viewModel = editor.draft((view) => {
          const selection = view.getSelection();
          if (selection !== null) {
            selection.insertText(text);
          }
        });
        if (!editor.isUpdating()) {
          editor.update(viewModel);
        }
      });
      break;
    }
  }
}

function onCompositionStart(
  event: CompositionEvent,
  view: ViewType,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  editor.setComposing(true);
}

function onCompositionEnd(
  event: CompositionEvent,
  view: ViewType,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  const data = event.data;
  const selection = view.getSelection();
  editor.setComposing(false);
  if (data != null && selection !== null) {
    // Handle the fact that Chromium doesn't fire beforeInput composition
    // events properly, so we need to listen to the compositionend event
    // to apply the composition data.
    if (!IS_SAFARI && !IS_FIREFOX) {
      selection.insertText(data);
    }
  }
}

function onSelectionChange(event, view, state, editor): void {
  view.getSelection();
}

function onKeyDown(
  event: KeyboardEvent,
  view: ViewType,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  if (editor.isComposing()) {
    return;
  }
  const selection = view.getSelection();
  if (selection === null) {
    return;
  }

  if (!CAN_USE_BEFORE_INPUT) {
    if (isDeleteBackward(event)) {
      event.preventDefault();
      selection.deleteBackward();
    } else if (isDeleteForward(event)) {
      event.preventDefault();
      selection.deleteForward();
    } else if (isLineBreak(event)) {
      event.preventDefault();
      selection.insertText('\n');
    } else if (isParagraph(event)) {
      event.preventDefault();
      selection.insertParagraph();
    }
  }
  if (isMoveBackward(event)) {
    event.preventDefault();
    selection.moveBackward();
  } else if (isMoveForward(event)) {
    event.preventDefault();
    selection.moveForward();
  } else if (isMoveWordBackward(event)) {
    event.preventDefault();
    selection.moveWordBackward();
  } else if (isMoveWordForward(event)) {
    event.preventDefault();
    selection.moveWordForward();
  }
}

function onPastePolyfill(
  event: ClipboardEvent,
  view: ViewType,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  event.preventDefault();
  const clipboardData = event.clipboardData;
  if (clipboardData != null) {
    insertFromDataTransfer(clipboardData, editor);
  }
}

function onCutPolyfill(
  event: ClipboardEvent,
  view: ViewType,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  event.preventDefault();
  const clipboardData = event.clipboardData;
  const selection = view.getSelection();
  if (selection !== null) {
    if (clipboardData != null) {
      clipboardData.setData('text/plain', selection.getTextContent());
    }
    selection.removeText();
  }
}

function onPolyfilledBeforeInput(
  event: SyntheticInputEvent<EventTarget>,
  view: ViewType,
  state: UnknownState,
): void {
  event.preventDefault();
  const selection = view.getSelection();
  const data = event.data;
  if (data != null && selection !== null) {
    selection.insertText(data);
  }
}

function onNativeBeforeInput(
  event: InputEvent,
  view: ViewType,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  // $FlowFixMe: Flow doesn't know of the inputType field
  const inputType = event.inputType;

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

  switch (inputType) {
    case 'formatBold': {
      if (state.richText) {
        selection.formatText(FORMAT_BOLD);
      }
      break;
    }
    case 'formatItalic': {
      if (state.richText) {
        selection.formatText(FORMAT_ITALIC);
      }
      break;
    }
    case 'formatStrikeThrough': {
      if (state.richText) {
        selection.formatText(FORMAT_STRIKETHROUGH);
      }
      break;
    }
    case 'formatUnderline': {
      if (state.richText) {
        selection.formatText(FORMAT_UNDERLINE);
      }
      break;
    }
    case 'insertFromComposition': {
      const data = event.data;
      if (data) {
        selection.insertText(data);
      }
      break;
    }
    case 'insertFromDrop':
    case 'insertReplacementText':
    case 'insertFromPaste': {
      // $FlowFixMe: Flow doesn't know about the dataTransfer field
      const dataTransfer = event.dataTransfer;
      if (dataTransfer != null) {
        insertFromDataTransfer(dataTransfer, editor);
      }
      break;
    }
    case 'insertLineBreak': {
      selection.insertText('\n');
      break;
    }
    case 'insertParagraph': {
      if (state.richText) {
        selection.insertParagraph();
      }
      break;
    }
    case 'insertText': {
      const data = event.data;
      if (data != null) {
        selection.insertText(data);
      }
      break;
    }
    case 'deleteByCut': {
      selection.removeText();
      break;
    }
    case 'deleteContentBackward': {
      selection.deleteBackward();
      break;
    }
    case 'deleteContentForward': {
      selection.deleteForward();
      break;
    }
    case 'deleteSoftLineBackward': {
      selection.deleteLineBackward();
      break;
    }
    default: {
      throw new Error('TODO - ' + inputType);
    }
  }
}

export function useEditorInputEvents<T>(
  editor: null | OutlineEditor,
  stateRef: RefObject<T>,
): {} | {onBeforeInput: (event: SyntheticInputEvent<T>) => void} {
  const handleNativeBeforeInput = useEventWrapper(
    onNativeBeforeInput,
    editor,
    stateRef,
  );
  const handlePolyfilledBeforeInput = useEventWrapper(
    onPolyfilledBeforeInput,
    editor,
    stateRef,
  );
  const handleKeyDown = useEventWrapper(onKeyDown, editor, stateRef);
  const handlePaste = useEventWrapper(onPastePolyfill, editor, stateRef);
  const handleCut = useEventWrapper(onCutPolyfill, editor, stateRef);
  const handleCompositionStart = useEventWrapper(
    onCompositionStart,
    editor,
    stateRef,
  );
  const handleCompositionEnd = useEventWrapper(
    onCompositionEnd,
    editor,
    stateRef,
  );
  const handleSelectionChange = useEventWrapper(
    onSelectionChange,
    editor,
    stateRef,
  );
  useEffect(() => {
    if (editor !== null) {
      const target: HTMLElement = editor.getEditorElement();
      target.addEventListener('keydown', handleKeyDown);
      target.addEventListener('compositionstart', handleCompositionStart);
      target.addEventListener('compositionend', handleCompositionEnd);
      document.addEventListener('selectionchange', handleSelectionChange);

      if (CAN_USE_BEFORE_INPUT) {
        target.addEventListener('beforeinput', handleNativeBeforeInput);
      } else {
        target.addEventListener('paste', handlePaste);
        target.addEventListener('cut', handleCut);
      }
      return () => {
        target.removeEventListener('keydown', handleKeyDown);
        target.removeEventListener('compositionstart', handleCompositionStart);
        target.removeEventListener('compositionend', handleCompositionEnd);
        document.removeEventListener('selectionchange', handleSelectionChange);

        if (CAN_USE_BEFORE_INPUT) {
          target.removeEventListener('beforeinput', handleNativeBeforeInput);
        } else {
          target.removeEventListener('paste', handlePaste);
          target.removeEventListener('cut', handleCut);
        }
      };
    }
  }, [
    editor,
    handleCompositionStart,
    handleCompositionEnd,
    handleCut,
    handleKeyDown,
    handleNativeBeforeInput,
    handlePaste,
    handleSelectionChange,
  ]);

  return CAN_USE_BEFORE_INPUT
    ? emptyObject
    : {onBeforeInput: handlePolyfilledBeforeInput};
}
