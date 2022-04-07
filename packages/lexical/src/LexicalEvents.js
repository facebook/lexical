/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from './LexicalEditor';
import type {RangeSelection} from './LexicalSelection';
import type {ElementNode} from './nodes/LexicalElementNode';
import type {TextNode} from './nodes/LexicalTextNode';

import {CAN_USE_BEFORE_INPUT, IS_FIREFOX} from 'shared/environment';
import getDOMSelection from 'shared/getDOMSelection';

import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $setCompositionKey,
  BLUR_COMMAND,
  CLICK_COMMAND,
  COPY_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  FOCUS_COMMAND,
  FORMAT_TEXT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  INSERT_TEXT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  PASTE_COMMAND,
  REDO_COMMAND,
  REMOVE_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from '.';
import {
  $flushMutations,
  $getNodeByKey,
  $isTokenOrInert,
  $setSelection,
  $shouldPreventDefaultAndInsertText,
  $updateSelectedTextFromDOM,
  $updateTextNodeFromDOMContent,
  getDOMTextNode,
  getEditorsToPropagate,
  getNearestEditorFromDOMNode,
  isBackspace,
  isBold,
  isDelete,
  isDeleteBackward,
  isDeleteForward,
  isDeleteLineBackward,
  isDeleteLineForward,
  isDeleteWordBackward,
  isDeleteWordForward,
  isEscape,
  isFirefoxClipboardEvents,
  isItalic,
  isLineBreak,
  isMoveBackward,
  isMoveDown,
  isMoveForward,
  isMoveUp,
  isOpenLineBreak,
  isParagraph,
  isRedo,
  isTab,
  isUnderline,
  isUndo,
} from './LexicalUtils';

type RootElementRemoveHandles = Array<() => void>;
type RootElementEvents = Array<
  [string, {} | ((event: Event, editor: LexicalEditor) => void)],
>;

const PASS_THROUGH_COMMAND = Object.freeze({});

const rootElementEvents: RootElementEvents = [
  // $FlowIgnore bad event inheritance
  ['keydown', onKeyDown],
  // $FlowIgnore bad event inheritance
  ['compositionstart', onCompositionStart],
  // $FlowIgnore bad event inheritance
  ['compositionend', onCompositionEnd],
  // $FlowIgnore bad event inheritance
  ['input', onInput],
  // $FlowIgnore bad event inheritance
  ['click', onClick],
  ['cut', PASS_THROUGH_COMMAND],
  ['copy', PASS_THROUGH_COMMAND],
  ['dragstart', PASS_THROUGH_COMMAND],
  ['paste', PASS_THROUGH_COMMAND],
  ['focus', PASS_THROUGH_COMMAND],
  ['blur', PASS_THROUGH_COMMAND],
];

if (CAN_USE_BEFORE_INPUT) {
  // $FlowIgnore bad event inheritance
  rootElementEvents.push(['beforeinput', onBeforeInput]);
} else {
  rootElementEvents.push(['drop', PASS_THROUGH_COMMAND]);
}

let lastKeyWasMaybeAndroidSoftKey = false;
let rootElementsRegistered = 0;

function onSelectionChange(
  domSelection: Selection,
  editor: LexicalEditor,
  isActive: boolean,
): void {
  editor.update(() => {
    // Non-active editor don't need any extra logic for selection, it only needs update
    // to reconcile selection (set it to null) to ensure that only one editor has non-null selection.
    if (!isActive) {
      $setSelection(null);
      return;
    }

    const selection = $getSelection();
    // Update the selection format
    if ($isRangeSelection(selection) && selection.isCollapsed()) {
      // Badly interpreted range selection when collapsed - #1482
      if (domSelection.type === 'Range') {
        selection.dirty = true;
      }
      const anchor = selection.anchor;
      if (anchor.type === 'text') {
        const anchorNode = anchor.getNode();
        selection.format = anchorNode.getFormat();
      } else if (anchor.type === 'element') {
        selection.format = 0;
      }
    }
    editor.dispatchCommand(SELECTION_CHANGE_COMMAND);
  });
}

// This is a work-around is mainly Chrome specific bug where if you select
// the contents of an empty block, you cannot easily unselect anything.
// This results in a tiny selection box that looks buggy/broken. This can
// also help other browsers when selection might "appear" lost, when it
// really isn't.
function onClick(event: MouseEvent, editor: LexicalEditor): void {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      if (
        anchor.type === 'element' &&
        anchor.offset === 0 &&
        selection.isCollapsed() &&
        $getRoot().getChildrenSize() === 1 &&
        anchor.getNode().getTopLevelElementOrThrow().isEmpty()
      ) {
        const lastSelection = editor.getEditorState()._selection;
        if (lastSelection !== null && selection.is(lastSelection)) {
          getDOMSelection().removeAllRanges();
          selection.dirty = true;
        }
      }
    }
    editor.dispatchCommand(CLICK_COMMAND, event);
  });
}

function $applyTargetRange(selection: RangeSelection, event: InputEvent): void {
  if (event.getTargetRanges) {
    const targetRange = event.getTargetRanges()[0];

    if (targetRange) {
      selection.applyDOMRange(targetRange);
    }
  }
}

function $canRemoveText(
  anchorNode: TextNode | ElementNode,
  focusNode: TextNode | ElementNode,
): boolean {
  return (
    anchorNode !== focusNode ||
    $isElementNode(anchorNode) ||
    $isElementNode(focusNode) ||
    !$isTokenOrInert(anchorNode) ||
    !$isTokenOrInert(focusNode)
  );
}

function onBeforeInput(event: InputEvent, editor: LexicalEditor): void {
  const inputType = event.inputType;

  // We let the browser do its own thing for composition.
  if (
    inputType === 'deleteCompositionText' ||
    inputType === 'insertCompositionText' ||
    // If we're pasting in FF, we shouldn't get this event
    // as the `paste` event should have triggered, unless the
    // user has dom.event.clipboardevents.enabled disabled in
    // about:config. In that case, we need to process the
    // pasted content in the DOM mutation phase.
    (IS_FIREFOX && isFirefoxClipboardEvents())
  ) {
    return;
  }

  editor.update(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    if (inputType === 'deleteContentBackward') {
      // Used for Android
      $setCompositionKey(null);
      event.preventDefault();
      editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
      return;
    }
    const data = event.data;

    if (
      !selection.dirty &&
      selection.isCollapsed() &&
      !$isRootNode(selection.anchor.getNode())
    ) {
      $applyTargetRange(selection, event);
    }
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();

    if (inputType === 'insertText') {
      if (data === '\n') {
        event.preventDefault();
        editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND);
      } else if (data === '\n\n') {
        event.preventDefault();
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND);
      } else if (data == null && event.dataTransfer) {
        // Gets around a Safari text replacement bug.
        const text = event.dataTransfer.getData('text/plain');
        event.preventDefault();
        selection.insertRawText(text);
      } else if (
        data != null &&
        $shouldPreventDefaultAndInsertText(selection, data, true)
      ) {
        event.preventDefault();
        editor.dispatchCommand(INSERT_TEXT_COMMAND, data);
      }
      return;
    }

    // Prevent the browser from carrying out
    // the input event, so we can control the
    // output.
    event.preventDefault();

    switch (inputType) {
      case 'insertFromYank':
      case 'insertFromDrop':
      case 'insertReplacementText': {
        editor.dispatchCommand(INSERT_TEXT_COMMAND, event);
        break;
      }
      case 'insertFromComposition': {
        // This is the end of composition
        $setCompositionKey(null);
        editor.dispatchCommand(INSERT_TEXT_COMMAND, event);
        break;
      }
      case 'insertLineBreak': {
        // Used for Android
        $setCompositionKey(null);
        editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND);
        break;
      }
      case 'insertParagraph': {
        // Used for Android
        $setCompositionKey(null);
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND);
        break;
      }
      case 'insertFromPaste':
      case 'insertFromPasteAsQuotation': {
        editor.dispatchCommand(PASTE_COMMAND, event);
        break;
      }
      case 'deleteByComposition': {
        if ($canRemoveText(anchorNode, focusNode)) {
          editor.dispatchCommand(REMOVE_TEXT_COMMAND);
        }
        break;
      }
      case 'deleteByDrag':
      case 'deleteByCut': {
        editor.dispatchCommand(REMOVE_TEXT_COMMAND);
        break;
      }
      case 'deleteContent': {
        editor.dispatchCommand(DELETE_CHARACTER_COMMAND, false);
        break;
      }
      case 'deleteWordBackward': {
        editor.dispatchCommand(DELETE_WORD_COMMAND, true);
        break;
      }
      case 'deleteWordForward': {
        editor.dispatchCommand(DELETE_WORD_COMMAND, false);
        break;
      }
      case 'deleteHardLineBackward':
      case 'deleteSoftLineBackward': {
        editor.dispatchCommand(DELETE_LINE_COMMAND, true);
        break;
      }
      case 'deleteContentForward':
      case 'deleteHardLineForward':
      case 'deleteSoftLineForward': {
        editor.dispatchCommand(DELETE_LINE_COMMAND, false);
        break;
      }
      case 'formatStrikeThrough': {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
        break;
      }
      case 'formatBold': {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        break;
      }
      case 'formatItalic': {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        break;
      }
      case 'formatUnderline': {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        break;
      }
      case 'historyUndo': {
        editor.dispatchCommand(UNDO_COMMAND);
        break;
      }
      case 'historyRedo': {
        editor.dispatchCommand(REDO_COMMAND);
        break;
      }
      default:
      // NO-OP
    }
  });
}

function onInput(event: InputEvent, editor: LexicalEditor): void {
  // We don't want the onInput to bubble, in the case of nested editors.
  event.stopPropagation();
  editor.update(() => {
    const selection = $getSelection();
    const data = event.data;
    if (
      data != null &&
      $isRangeSelection(selection) &&
      $shouldPreventDefaultAndInsertText(selection, data, false)
    ) {
      editor.dispatchCommand(INSERT_TEXT_COMMAND, data);
    } else {
      $updateSelectedTextFromDOM(editor, null);
    }
    // Also flush any other mutations that might have occured
    // since the change.
    $flushMutations();
  });
}

function onCompositionStart(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection) && !editor.isComposing()) {
      const anchor = selection.anchor;
      $setCompositionKey(anchor.key);
      if (
        !lastKeyWasMaybeAndroidSoftKey ||
        anchor.type === 'element' ||
        !selection.isCollapsed()
      ) {
        // We insert an empty space, ready for the composition
        // to get inserted into the new node we create. If
        // we don't do this, Safari will fail on us because
        // there is no text node matching the selection.
        editor.dispatchCommand(INSERT_TEXT_COMMAND, ' ');
      }
    }
  });
}

function onCompositionEnd(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {
  editor.update(() => {
    const compositionKey = editor._compositionKey;
    $setCompositionKey(null);
    // Handle termination of composition, as it can sometimes
    // move to an adjacent DOM node when backspacing.
    if (compositionKey !== null && event.data === '') {
      const node = $getNodeByKey(compositionKey);
      const textNode = getDOMTextNode(editor.getElementByKey(compositionKey));
      if (textNode !== null && $isTextNode(node)) {
        $updateTextNodeFromDOMContent(
          node,
          textNode.nodeValue,
          null,
          null,
          true,
        );
      }
      return;
    }
    $updateSelectedTextFromDOM(editor, event);
  });
}

function updateAndroidSoftKeyFlagIfAny(event: KeyboardEvent): void {
  lastKeyWasMaybeAndroidSoftKey =
    event.key === 'Unidentified' && event.keyCode === 229;
}

function onKeyDown(event: KeyboardEvent, editor: LexicalEditor): void {
  updateAndroidSoftKeyFlagIfAny(event);
  if (editor.isComposing()) {
    return;
  }
  const {keyCode, shiftKey, ctrlKey, metaKey, altKey} = event;

  if (isMoveForward(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
    editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);
  } else if (isMoveBackward(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
    editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);
  } else if (isMoveUp(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
    editor.dispatchCommand(KEY_ARROW_UP_COMMAND, event);
  } else if (isMoveDown(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
    editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, event);
  } else if (isLineBreak(keyCode, shiftKey)) {
    editor.dispatchCommand(KEY_ENTER_COMMAND, event);
  } else if (isOpenLineBreak(keyCode, ctrlKey)) {
    event.preventDefault();
    editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, true);
  } else if (isParagraph(keyCode, shiftKey)) {
    editor.dispatchCommand(KEY_ENTER_COMMAND, event);
  } else if (isDeleteBackward(keyCode, altKey, metaKey, ctrlKey)) {
    if (isBackspace(keyCode)) {
      editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
    } else {
      editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
    }
  } else if (isEscape(keyCode)) {
    editor.dispatchCommand(KEY_ESCAPE_COMMAND, event);
  } else if (isDeleteForward(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
    if (isDelete(keyCode)) {
      editor.dispatchCommand(KEY_DELETE_COMMAND, event);
    } else {
      event.preventDefault();
      editor.dispatchCommand(DELETE_CHARACTER_COMMAND, false);
    }
  } else if (isDeleteWordBackward(keyCode, altKey, ctrlKey)) {
    event.preventDefault();
    editor.dispatchCommand(DELETE_WORD_COMMAND, true);
  } else if (isDeleteWordForward(keyCode, altKey, ctrlKey)) {
    event.preventDefault();
    editor.dispatchCommand(DELETE_WORD_COMMAND, false);
  } else if (isDeleteLineBackward(keyCode, metaKey)) {
    event.preventDefault();
    editor.dispatchCommand(DELETE_LINE_COMMAND, true);
  } else if (isDeleteLineForward(keyCode, metaKey)) {
    event.preventDefault();
    editor.dispatchCommand(DELETE_LINE_COMMAND, false);
  } else if (isBold(keyCode, metaKey, ctrlKey)) {
    event.preventDefault();
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  } else if (isUnderline(keyCode, metaKey, ctrlKey)) {
    event.preventDefault();
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
  } else if (isItalic(keyCode, metaKey, ctrlKey)) {
    event.preventDefault();
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
  } else if (isTab(keyCode, altKey, ctrlKey, metaKey)) {
    editor.dispatchCommand(KEY_TAB_COMMAND, event);
  } else if (isUndo(keyCode, shiftKey, metaKey, ctrlKey)) {
    event.preventDefault();
    editor.dispatchCommand(UNDO_COMMAND);
  } else if (isRedo(keyCode, shiftKey, metaKey, ctrlKey)) {
    event.preventDefault();
    editor.dispatchCommand(REDO_COMMAND);
  }
}

function getRootElementRemoveHandles(
  rootElement: HTMLElement,
): RootElementRemoveHandles {
  // $FlowFixMe: internal field
  let eventHandles = rootElement.__lexicalEventHandles;
  if (eventHandles === undefined) {
    eventHandles = [];
    // $FlowFixMe: internal field
    rootElement.__lexicalEventHandles = eventHandles;
  }
  return eventHandles;
}

// Mapping root editors to their active nested editors, contains nested editors
// mapping only, so if root editor is selected map will have no reference to free up memory
const activeNestedEditorsMap: Map<string, LexicalEditor> = new Map();

function onDocumentSelectionChange(event: Event): void {
  const selection = getDOMSelection();
  const nextActiveEditor = getNearestEditorFromDOMNode(selection.anchorNode);
  if (nextActiveEditor === null) {
    return;
  }

  // When editor receives selection change event, we're checking if
  // it has any sibling editors (within same parent editor) that were active
  // before, and trigger selection change on it to nullify selection.
  const editors = getEditorsToPropagate(nextActiveEditor);
  const rootEditor = editors[editors.length - 1];
  const rootEditorKey = rootEditor._key;
  const activeNestedEditor = activeNestedEditorsMap.get(rootEditorKey);
  const prevActiveEditor = activeNestedEditor || rootEditor;

  if (prevActiveEditor !== nextActiveEditor) {
    onSelectionChange(selection, prevActiveEditor, false);
  }

  onSelectionChange(selection, nextActiveEditor, true);

  // If newly selected editor is nested, then add it to the map, clean map otherwise
  if (nextActiveEditor !== rootEditor) {
    activeNestedEditorsMap.set(rootEditorKey, nextActiveEditor);
  } else if (activeNestedEditor) {
    activeNestedEditorsMap.delete(rootEditorKey);
  }
}

export function addRootElementEvents(
  rootElement: HTMLElement,
  editor: LexicalEditor,
): void {
  // We only want to have a single global selectionchange event handler, shared
  // between all editor instances.
  if (rootElementsRegistered === 0) {
    const doc = rootElement.ownerDocument;
    doc.addEventListener('selectionchange', onDocumentSelectionChange);
  }
  rootElementsRegistered++;
  // $FlowFixMe: internal field
  rootElement.__lexicalEditor = editor;
  const removeHandles = getRootElementRemoveHandles(rootElement);

  for (let i = 0; i < rootElementEvents.length; i++) {
    const [eventName, onEvent] = rootElementEvents[i];
    const eventHandler =
      typeof onEvent === 'function'
        ? (event: Event) => {
            if (!editor.isReadOnly()) {
              onEvent(event, editor);
            }
          }
        : (event: Event) => {
            if (!editor.isReadOnly()) {
              switch (eventName) {
                case 'cut':
                  return editor.dispatchCommand(CUT_COMMAND, event);
                case 'copy':
                  return editor.dispatchCommand(COPY_COMMAND, event);
                case 'paste':
                  return editor.dispatchCommand(PASTE_COMMAND, event);
                case 'dragstart':
                  return editor.dispatchCommand(DRAGSTART_COMMAND, event);
                case 'focus':
                  return editor.dispatchCommand(FOCUS_COMMAND, event);
                case 'blur':
                  return editor.dispatchCommand(BLUR_COMMAND, event);
                case 'drop':
                  return editor.dispatchCommand(DROP_COMMAND, event);
              }
            }
          };
    rootElement.addEventListener(eventName, eventHandler);
    removeHandles.push(() => {
      rootElement.removeEventListener(eventName, eventHandler);
    });
  }
}

export function removeRootElementEvents(rootElement: HTMLElement): void {
  if (rootElementsRegistered !== 0) {
    rootElementsRegistered--;
    // We only want to have a single global selectionchange event handler, shared
    // between all editor instances.
    if (rootElementsRegistered === 0) {
      const doc = rootElement.ownerDocument;
      doc.removeEventListener('selectionchange', onDocumentSelectionChange);
    }
  }
  // $FlowFixMe: internal field
  const editor: LexicalEditor | null | void = rootElement.__lexicalEditor;
  if (editor != null) {
    cleanActiveNestedEditorsMap(editor);
    // $FlowFixMe: internal field
    rootElement.__lexicalEditor = null;
  }
  const removeHandles = getRootElementRemoveHandles(rootElement);
  for (let i = 0; i < removeHandles.length; i++) {
    removeHandles[i]();
  }
  // $FlowFixMe: internal field
  rootElement.__lexicalEventHandles = [];
}

function cleanActiveNestedEditorsMap(editor: LexicalEditor) {
  if (editor._parentEditor !== null) {
    // For nested editor cleanup map if this editor was marked as active
    const editors = getEditorsToPropagate(editor);
    const rootEditor = editors[editors.length - 1];
    const rootEditorKey = rootEditor._key;
    if (activeNestedEditorsMap.get(rootEditorKey) === editor) {
      activeNestedEditorsMap.delete(rootEditorKey);
    }
  } else {
    // For top-level editors cleanup map
    activeNestedEditorsMap.delete(editor._key);
  }
}
