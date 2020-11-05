import {useEffect, useRef} from 'react';
import {
  FORMAT_BOLD,
  FORMAT_ITALIC,
  FORMAT_STRIKETHROUGH,
  FORMAT_UNDERLINE,
  insertFromDataTransfer,
  onCompositionEnd,
  onCompositionStart,
  onFocusIn,
  useEvent,
} from 'shared';

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

function onKeyDown() {
  // TODO
}

function onSelectionChange(event, helpers) {
  // TODO
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
