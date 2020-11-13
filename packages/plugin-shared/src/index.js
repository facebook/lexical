// @flow
import {useCallback, useEffect} from 'react';
import {createBlock, createText} from 'outline';
import {canUseBeforeInputEvent, isBrowserFirefox, isBrowserSafari} from './env';
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

function useEventWrapper<T>(
  handler: Function,
  editor: OutlineEditor,
  stateRef: RefObject<T>,
): (event: any) => void {
  return useCallback(
    (event) => {
      const state = stateRef && stateRef.current;
      if (state !== null) {
        const viewModel = editor.createViewModel((view) =>
          handler(event, view, state, editor),
        );
        // Uncomment to see how diffs might work:
        // if (viewModel !== outlineEditor.getCurrentViewModel()) {
        //   const diff = outlineEditor.getDiffFromViewModel(viewModel);
        //   debugger;
        // }
        if (!editor.isUpdating()) {
          editor.update(viewModel);
        }
      }
    },
    [stateRef, editor, handler],
  );
}

export function useEvent<T>(
  editor: OutlineEditor,
  eventName: string,
  handler: Function,
  stateRef: RefObject<T>,
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

export function onFocusIn(event: any, viewModel: ViewType) {
  const body = viewModel.getBody();

  if (body != null && body.getFirstChild() === null) {
    const text = createText();
    body.append(createBlock('p').append(text));
    text.select();
  }
}

export function insertFromDataTransfer(
  dataTransfer: DataTransfer,
  editor: OutlineEditor,
) {
  const items = dataTransfer.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'string' && item.type === 'text/plain') {
      item.getAsString((text) => {
        const viewModel = editor.createViewModel((view) => {
          view.getSelection().insertText(text);
        });
        if (!editor.isUpdating()) {
          editor.update(viewModel);
        }
      });
      break;
    }
  }
}

function onCompositionEnd(event, view: ViewType, compositionState) {
  const data = event.data;
  // Only do this for Chrome
  compositionState.isComposing = false;
  if (data) {
    view.getSelection().insertText(data);
  }
}

function onKeyDown(event, view: ViewType, state) {
  const selection = view.getSelection();

  if (!canUseBeforeInputEvent) {
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

function onPastePolyfill(event, view: ViewType, state, editor: OutlineEditor) {
  event.preventDefault();
  insertFromDataTransfer(event.clipboardData, editor);
}

function onCutPolyfill(event, view: ViewType, state, editor: OutlineEditor) {
  event.preventDefault();
  const clipboardData = event.clipboardData;
  const selection = view.getSelection();
  clipboardData.setData('text/plain', selection.getTextContent());
  view.getSelection().removeText();
}

function onPolyfilledBeforeInput(event, view: ViewType, state) {
  event.preventDefault();
  const data = event.data;
  if (data) {
    view.getSelection().insertText(data);
  }
}

function onNativeBeforeInput(
  event,
  view: ViewType,
  state,
  editor: OutlineEditor,
) {
  const inputType = event.inputType;

  if (
    inputType === 'insertCompositionText' ||
    inputType === 'deleteCompositionText'
  ) {
    return;
  }
  event.preventDefault();
  const selection = view.getSelection();

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
    case 'insertFromPaste': {
      insertFromDataTransfer(event.dataTransfer, editor);
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
      selection.insertText(event.data);
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
    case 'insertFromDrop': {
      insertFromDataTransfer(event.dataTransfer, editor);
      break;
    }
    default: {
      throw new Error('TODO - ' + inputType);
    }
  }
}

export function useEditorInputEvents<T>(
  editor: OutlineEditor,
  stateRef: RefObject<T>,
): {} | {onBeforeInput: Function} {
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
  const handleCompositionEnd = useEventWrapper(
    onCompositionEnd,
    editor,
    stateRef,
  );
  useEffect(() => {
    if (editor !== null) {
      const target = editor.getEditorElement();
      target.addEventListener('keydown', handleKeyDown);

      if (canUseBeforeInputEvent) {
        target.addEventListener('beforeinput', handleNativeBeforeInput);
        // Handle the fact that Chromium doesn't fire beforeInput composition
        // events properly, so we need to listen to the compositionend event
        // to apply the composition data.
        if (!isBrowserSafari && !isBrowserFirefox) {
          target.addEventListener('compositionend', handleCompositionEnd);
        }
      } else {
        target.addEventListener('paste', handlePaste);
        target.addEventListener('cut', handleCut);
      }
      return () => {
        target.removeEventListener('keydown', handleKeyDown);

        if (canUseBeforeInputEvent) {
          target.removeEventListener('beforeinput', handleNativeBeforeInput);
          if (!isBrowserSafari && !isBrowserFirefox) {
            target.removeEventListener('compositionend', handleCompositionEnd);
          }
        } else {
          target.removeEventListener('paste', handlePaste);
          target.removeEventListener('cut', handleCut);
        }
      };
    }
  }, [
    editor,
    handleCompositionEnd,
    handleCut,
    handleKeyDown,
    handleNativeBeforeInput,
    handlePaste,
  ]);

  return canUseBeforeInputEvent
    ? emptyObject
    : {onBeforeInput: handlePolyfilledBeforeInput};
}
