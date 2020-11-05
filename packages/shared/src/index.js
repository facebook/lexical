import {useEffect} from 'react';

export const isBrowserFirefox =
  typeof navigator !== 'undefined' &&
  /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

export const isBrowserSafari =
  typeof navigator !== 'undefined' &&
  /Version\/[\d.]+.*Safari/.test(navigator.userAgent);

export const canUseDOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

let documentMode = null;
if (canUseDOM && 'documentMode' in document) {
  documentMode = document.documentMode;
}

export const canUseTextInputEvent =
  canUseDOM && 'TextEvent' in window && !documentMode;

export let canUseBeforeInputEvent = false;

if (canUseDOM && 'InputEvent' in window && !documentMode) {
  canUseBeforeInputEvent = 'getTargetRanges' in new window.InputEvent('input');
}

export const FORMAT_BOLD = 0;
export const FORMAT_ITALIC = 1;
export const FORMAT_STRIKETHROUGH = 2;
export const FORMAT_UNDERLINE = 3;

export function useEvent(editor, eventName, handler, pluginStateRef) {
  useEffect(() => {
    const state = pluginStateRef && pluginStateRef.current;
    if (state !== null && editor !== null) {
      const target =
        eventName === 'selectionchange' ? document : editor.getEditorElement();
      const wrapper = (event) => {
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
      };
      target.addEventListener(eventName, wrapper);
      return () => {
        target.removeEventListener(eventName, wrapper);
      };
    }
  }, [eventName, handler, editor, pluginStateRef]);
}

export function onCompositionEnd(event, view, state) {
  const data = event.data;
  // Only do this for Chrome
  state.isComposing = false;
  if (data && !isBrowserSafari && !isBrowserFirefox) {
    // The selection we get here will be with the composition text
    // already applied to the DOM, so it's too late. So instead we
    // restore the selection from when composition started.
    const selection = view.getSelection();
    const compositionSelection = state.compositionSelection;
    if (compositionSelection !== null) {
      selection.anchorOffset = compositionSelection.anchorOffset;
      selection.focusOffset = compositionSelection.focusOffset;
      state.compositionSelection = null;
    }
    selection.insertText(data);
  }
}

export function onCompositionStart(event, view, state) {
  state.isComposing = true;
  state.compositionSelection = view.getSelection();
}

export function onFocusIn(event, viewModel) {
  const body = viewModel.getBody();

  if (body.getFirstChild() === null) {
    const text = viewModel.createText();
    body.append(viewModel.createBlock('p').append(text));
    text.select();
  }
}

export function insertFromDataTransfer(event, editor) {
  const items = event.dataTransfer.items;
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
