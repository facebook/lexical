import {useEffect, useRef} from 'react';

const isBrowserFirefox =
  typeof navigator !== 'undefined' &&
  /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

const isBrowserSafari =
  typeof navigator !== 'undefined' &&
  /Version\/[\d.]+.*Safari/.test(navigator.userAgent);

const FORMAT_BOLD = 0;
const FORMAT_ITALIC = 1;
const FORMAT_STRIKETHROUGH = 2;
const FORMAT_UNDERLINE = 3;

function insertFromDataTransfer(event, editor) {
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

function onBeforeInput(event, view, state, editor) {
  const inputType = event.inputType;

  if (
    inputType !== 'insertCompositionText' &&
    inputType !== 'deleteCompositionText'
  ) {
    event.preventDefault();
  }
  const selection = view.getSelection();

  switch (inputType) {
    case 'formatBold': {
      selection.formatText(FORMAT_BOLD);
      break;
    }
    case 'formatItalic': {
      selection.formatText(FORMAT_ITALIC);
      break;
    }
    case 'formatStrikeThrough': {
      selection.formatText(FORMAT_STRIKETHROUGH);
      break;
    }
    case 'formatUnderline': {
      selection.formatText(FORMAT_UNDERLINE);
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
      insertFromDataTransfer(event, editor);
      break;
    }
    case 'insertLineBreak': {
      selection.insertText('\n');
      break;
    }
    case 'insertParagraph': {
      selection.insertParagraph();
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
    case 'insertFromDrop': {
      insertFromDataTransfer(event, editor);
      break;
    }
    default: {
      console.log('TODO?', inputType);
    }
  }
}

function onCompositionEnd(event, view, state) {
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

function onCompositionStart(event, view, state) {
  state.isComposing = true;
  state.compositionSelection = view.getSelection();
}

function onFocusIn(event, viewModel) {
  const body = viewModel.getBody();

  if (body.getFirstChild() === null) {
    const text = viewModel.createText();
    body.append(viewModel.createBlock('p').append(text));
    text.select();
  }
}

function onKeyDown() {
  // TODO
}

function onSelectionChange(event, helpers) {
  // TODO
}

function useEvent(editor, eventName, handler, pluginStateRef) {
  useEffect(() => {
    const state = pluginStateRef.current;
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

export function useRichTextPlugin(outlineEditor, isReadOnly = false) {
  const pluginStateRef = useRef(null);

  // Handle event plugin state
  useEffect(() => {
    const pluginsState = pluginStateRef.current;

    if (pluginsState === null) {
      pluginStateRef.current = {
        compositionSelection: null,
        isComposing: false,
        isReadOnly,
      };
    } else {
      pluginsState.isReadOnly = isReadOnly;
    }
  }, [isReadOnly]);

  useEvent(outlineEditor, 'beforeinput', onBeforeInput, pluginStateRef);
  useEvent(outlineEditor, 'focusin', onFocusIn, pluginStateRef);
  useEvent(
    outlineEditor,
    'compositionstart',
    onCompositionStart,
    pluginStateRef,
  );
  useEvent(outlineEditor, 'compositionend', onCompositionEnd, pluginStateRef);
  useEvent(outlineEditor, 'keydown', onKeyDown, pluginStateRef);
  useEvent(outlineEditor, 'selectionchange', onSelectionChange, pluginStateRef);
}
