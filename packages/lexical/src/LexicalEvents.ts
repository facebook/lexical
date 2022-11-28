/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from './LexicalEditor';
import type {NodeKey} from './LexicalNode';
import type {ElementNode} from './nodes/LexicalElementNode';
import type {TextNode} from './nodes/LexicalTextNode';

import {
  CAN_USE_BEFORE_INPUT,
  IS_FIREFOX,
  IS_IOS,
  IS_SAFARI,
} from 'shared/environment';
import getDOMSelection from 'shared/getDOMSelection';

import {
  $getPreviousSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $setCompositionKey,
  BLUR_COMMAND,
  CLICK_COMMAND,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  COPY_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  DRAGEND_COMMAND,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  FOCUS_COMMAND,
  FORMAT_TEXT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_SPACE_COMMAND,
  KEY_TAB_COMMAND,
  MOVE_TO_END,
  MOVE_TO_START,
  PASTE_COMMAND,
  REDO_COMMAND,
  REMOVE_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from '.';
import {KEY_MODIFIER_COMMAND} from './LexicalCommands';
import {
  COMPOSITION_START_CHAR,
  DOM_ELEMENT_TYPE,
  DOM_TEXT_TYPE,
  DOUBLE_LINE_BREAK,
  IS_ALL_FORMATTING,
} from './LexicalConstants';
import {internalCreateRangeSelection, RangeSelection} from './LexicalSelection';
import {getActiveEditor, updateEditor} from './LexicalUpdates';
import {
  $flushMutations,
  $getNodeByKey,
  $isSelectionCapturedInDecorator,
  $isTokenOrSegmented,
  $setSelection,
  $shouldInsertTextAfterOrBeforeTextNode,
  $updateSelectedTextFromDOM,
  $updateTextNodeFromDOMContent,
  dispatchCommand,
  doesContainGrapheme,
  getAnchorTextFromDOM,
  getDOMTextNode,
  getEditorsToPropagate,
  getNearestEditorFromDOMNode,
  getWindow,
  isBackspace,
  isBold,
  isCopy,
  isCut,
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
  isModifier,
  isMoveBackward,
  isMoveDown,
  isMoveForward,
  isMoveToEnd,
  isMoveToStart,
  isMoveUp,
  isOpenLineBreak,
  isParagraph,
  isRedo,
  isSelectionWithinEditor,
  isSpace,
  isTab,
  isUnderline,
  isUndo,
} from './LexicalUtils';

type RootElementRemoveHandles = Array<() => void>;
type RootElementEvents = Array<
  [
    string,
    Record<string, unknown> | ((event: Event, editor: LexicalEditor) => void),
  ]
>;
const PASS_THROUGH_COMMAND = Object.freeze({});
const ANDROID_COMPOSITION_LATENCY = 30;
const rootElementEvents: RootElementEvents = [
  ['keydown', onKeyDown],
  ['mousedown', onMouseDown],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['input', onInput],
  ['click', onClick],
  ['cut', PASS_THROUGH_COMMAND],
  ['copy', PASS_THROUGH_COMMAND],
  ['dragstart', PASS_THROUGH_COMMAND],
  ['dragover', PASS_THROUGH_COMMAND],
  ['dragend', PASS_THROUGH_COMMAND],
  ['paste', PASS_THROUGH_COMMAND],
  ['focus', PASS_THROUGH_COMMAND],
  ['blur', PASS_THROUGH_COMMAND],
  ['drop', PASS_THROUGH_COMMAND],
];

if (CAN_USE_BEFORE_INPUT) {
  rootElementEvents.push([
    'beforeinput',
    (event, editor) => onBeforeInput(event as InputEvent, editor),
  ]);
}

let lastKeyDownTimeStamp = 0;
let lastKeyCode = 0;
let lastBeforeInputInsertTextTimeStamp = 0;
let rootElementsRegistered = 0;
let isSelectionChangeFromDOMUpdate = false;
let isSelectionChangeFromMouseDown = false;
let isInsertLineBreak = false;
let isFirefoxEndingComposition = false;
let collapsedSelectionFormat: [number, number, NodeKey, number] = [
  0,
  0,
  'root',
  0,
];

// This function is used to determine if Lexical should attempt to override
// the default browser behavior for insertion of text and use its own internal
// heuristics. This is an extremely important function, and makes much of Lexical
// work as intended between different browsers and across word, line and character
// boundary/formats. It also is important for text replacement, node schemas and
// composition mechanics.
function $shouldPreventDefaultAndInsertText(
  selection: RangeSelection,
  text: string,
  timeStamp: number,
  isBeforeInput: boolean,
): boolean {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const domSelection = getDOMSelection();
  const domAnchorNode = domSelection !== null ? domSelection.anchorNode : null;
  const anchorKey = anchor.key;
  const backingAnchorElement = getActiveEditor().getElementByKey(anchorKey);
  const textLength = text.length;

  return (
    anchorKey !== focus.key ||
    // If we're working with a non-text node.
    !$isTextNode(anchorNode) ||
    // If we are replacing a range with a single character or grapheme, and not composing.
    (((!isBeforeInput &&
      (!CAN_USE_BEFORE_INPUT ||
        // We check to see if there has been
        // a recent beforeinput event for "textInput". If there has been one in the last
        // 50ms then we proceed as normal. However, if there is not, then this is likely
        // a dangling `input` event caused by execCommand('insertText').
        lastBeforeInputInsertTextTimeStamp < timeStamp + 50)) ||
      textLength < 2 ||
      doesContainGrapheme(text)) &&
      anchor.offset !== focus.offset &&
      !anchorNode.isComposing()) ||
    // Any non standard text node.
    $isTokenOrSegmented(anchorNode) ||
    // If the text length is more than a single character and we're either
    // dealing with this in "beforeinput" or where the node has already recently
    // been changed (thus is dirty).
    (anchorNode.isDirty() && textLength > 1) ||
    // If the DOM selection element is not the same as the backing node during beforeinput.
    ((isBeforeInput || !CAN_USE_BEFORE_INPUT) &&
      backingAnchorElement !== null &&
      !anchorNode.isComposing() &&
      domAnchorNode !== getDOMTextNode(backingAnchorElement)) ||
    // Check if we're changing from bold to italics, or some other format.
    anchorNode.getFormat() !== selection.format ||
    // One last set of heuristics to check against.
    $shouldInsertTextAfterOrBeforeTextNode(selection, anchorNode)
  );
}

function shouldSkipSelectionChange(
  domNode: null | Node,
  offset: number,
): boolean {
  return (
    domNode !== null &&
    domNode.nodeValue !== null &&
    domNode.nodeType === DOM_TEXT_TYPE &&
    offset !== 0 &&
    offset !== domNode.nodeValue.length
  );
}

function onSelectionChange(
  domSelection: Selection,
  editor: LexicalEditor,
  isActive: boolean,
): void {
  const {
    anchorNode: anchorDOM,
    anchorOffset,
    focusNode: focusDOM,
    focusOffset,
  } = domSelection;
  if (isSelectionChangeFromDOMUpdate) {
    isSelectionChangeFromDOMUpdate = false;

    // If native DOM selection is on a DOM element, then
    // we should continue as usual, as Lexical's selection
    // may have normalized to a better child. If the DOM
    // element is a text node, we can safely apply this
    // optimization and skip the selection change entirely.
    // We also need to check if the offset is at the boundary,
    // because in this case, we might need to normalize to a
    // sibling instead.
    if (
      shouldSkipSelectionChange(anchorDOM, anchorOffset) &&
      shouldSkipSelectionChange(focusDOM, focusOffset)
    ) {
      return;
    }
  }

  updateEditor(editor, () => {
    // Non-active editor don't need any extra logic for selection, it only needs update
    // to reconcile selection (set it to null) to ensure that only one editor has non-null selection.
    if (!isActive) {
      $setSelection(null);
      return;
    }

    if (!isSelectionWithinEditor(editor, anchorDOM, focusDOM)) {
      return;
    }

    const selection = $getSelection();

    // Update the selection format
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();

      if (selection.isCollapsed()) {
        // Badly interpreted range selection when collapsed - #1482
        if (
          domSelection.type === 'Range' &&
          domSelection.anchorNode === domSelection.focusNode
        ) {
          selection.dirty = true;
        }

        // If we have marked a collapsed selection format, and we're
        // within the given time range – then attempt to use that format
        // instead of getting the format from the anchor node.
        const windowEvent = getWindow(editor).event;
        const currentTimeStamp = windowEvent
          ? windowEvent.timeStamp
          : performance.now();
        const [lastFormat, lastOffset, lastKey, timeStamp] =
          collapsedSelectionFormat;

        if (
          currentTimeStamp < timeStamp + 200 &&
          anchor.offset === lastOffset &&
          anchor.key === lastKey
        ) {
          selection.format = lastFormat;
        } else {
          if (anchor.type === 'text') {
            selection.format = anchorNode.getFormat();
          } else if (anchor.type === 'element') {
            selection.format = 0;
          }
        }
      } else {
        let combinedFormat = IS_ALL_FORMATTING;
        let hasTextNodes = false;

        const nodes = selection.getNodes();
        const nodesLength = nodes.length;
        for (let i = 0; i < nodesLength; i++) {
          const node = nodes[i];
          if ($isTextNode(node)) {
            hasTextNodes = true;
            combinedFormat &= node.getFormat();
            if (combinedFormat === 0) {
              break;
            }
          }
        }

        selection.format = hasTextNodes ? combinedFormat : 0;
      }
    }

    dispatchCommand(editor, SELECTION_CHANGE_COMMAND, undefined);
  });
}

// This is a work-around is mainly Chrome specific bug where if you select
// the contents of an empty block, you cannot easily unselect anything.
// This results in a tiny selection box that looks buggy/broken. This can
// also help other browsers when selection might "appear" lost, when it
// really isn't.
function onClick(event: MouseEvent, editor: LexicalEditor): void {
  updateEditor(editor, () => {
    const selection = $getSelection();
    const domSelection = getDOMSelection();
    const lastSelection = $getPreviousSelection();

    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();

      if (
        domSelection &&
        anchor.type === 'element' &&
        anchor.offset === 0 &&
        selection.isCollapsed() &&
        !$isRootNode(anchorNode) &&
        $getRoot().getChildrenSize() === 1 &&
        anchorNode.getTopLevelElementOrThrow().isEmpty() &&
        lastSelection !== null &&
        selection.is(lastSelection)
      ) {
        domSelection.removeAllRanges();
        selection.dirty = true;
      }
    }

    dispatchCommand(editor, CLICK_COMMAND, event);
  });
}

function onMouseDown(event: MouseEvent, editor: LexicalEditor) {
  // TODO implement text drag & drop
  const target = event.target;
  if (target instanceof Node) {
    updateEditor(editor, () => {
      // Drag & drop should not recompute selection until mouse up; otherwise the initially
      // selected content is lost.
      if (!$isSelectionCapturedInDecorator(target)) {
        isSelectionChangeFromMouseDown = true;
      }
    });
  }
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
    !anchorNode.isToken() ||
    !focusNode.isToken()
  );
}

function isPossiblyAndroidKeyPress(timeStamp: number): boolean {
  return (
    lastKeyCode === 229 &&
    timeStamp < lastKeyDownTimeStamp + ANDROID_COMPOSITION_LATENCY
  );
}

function onBeforeInput(event: InputEvent, editor: LexicalEditor): void {
  const inputType = event.inputType;

  // We let the browser do its own thing for composition.
  if (
    inputType === 'deleteCompositionText' ||
    // If we're pasting in FF, we shouldn't get this event
    // as the `paste` event should have triggered, unless the
    // user has dom.event.clipboardevents.enabled disabled in
    // about:config. In that case, we need to process the
    // pasted content in the DOM mutation phase.
    (IS_FIREFOX && isFirefoxClipboardEvents(editor))
  ) {
    return;
  } else if (inputType === 'insertCompositionText') {
    return;
  }

  updateEditor(editor, () => {
    const selection = $getSelection();

    if (inputType === 'deleteContentBackward') {
      if (selection === null) {
        // Use previous selection
        const prevSelection = $getPreviousSelection();

        if (!$isRangeSelection(prevSelection)) {
          return;
        }

        $setSelection(prevSelection.clone());
      }

      if ($isRangeSelection(selection)) {
        // Used for handling backspace in Android.
        if (
          isPossiblyAndroidKeyPress(event.timeStamp) &&
          editor.isComposing() &&
          selection.anchor.key === selection.focus.key
        ) {
          $setCompositionKey(null);
          lastKeyDownTimeStamp = 0;
          // Fixes an Android bug where selection flickers when backspacing
          setTimeout(() => {
            updateEditor(editor, () => {
              $setCompositionKey(null);
            });
          }, ANDROID_COMPOSITION_LATENCY);
          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            anchorNode.markDirty();
            selection.format = anchorNode.getFormat();
          }
        } else {
          event.preventDefault();
          dispatchCommand(editor, DELETE_CHARACTER_COMMAND, true);
        }
        return;
      }
    }

    if (!$isRangeSelection(selection)) {
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

    if (inputType === 'insertText' || inputType === 'insertTranspose') {
      if (data === '\n') {
        event.preventDefault();
        dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false);
      } else if (data === DOUBLE_LINE_BREAK) {
        event.preventDefault();
        dispatchCommand(editor, INSERT_PARAGRAPH_COMMAND, undefined);
      } else if (data == null && event.dataTransfer) {
        // Gets around a Safari text replacement bug.
        const text = event.dataTransfer.getData('text/plain');
        event.preventDefault();
        selection.insertRawText(text);
      } else if (
        data != null &&
        $shouldPreventDefaultAndInsertText(
          selection,
          data,
          event.timeStamp,
          true,
        )
      ) {
        event.preventDefault();
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, data);
      }
      lastBeforeInputInsertTextTimeStamp = event.timeStamp;
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
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, event);
        break;
      }

      case 'insertFromComposition': {
        // This is the end of composition
        $setCompositionKey(null);
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, event);
        break;
      }

      case 'insertLineBreak': {
        // Used for Android
        $setCompositionKey(null);
        dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false);
        break;
      }

      case 'insertParagraph': {
        // Used for Android
        $setCompositionKey(null);

        // Some browsers do not provide the type "insertLineBreak".
        // So instead, we need to infer it from the keyboard event.
        if (isInsertLineBreak) {
          isInsertLineBreak = false;
          dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false);
        } else {
          dispatchCommand(editor, INSERT_PARAGRAPH_COMMAND, undefined);
        }

        break;
      }

      case 'insertFromPaste':
      case 'insertFromPasteAsQuotation': {
        dispatchCommand(editor, PASTE_COMMAND, event);
        break;
      }

      case 'deleteByComposition': {
        if ($canRemoveText(anchorNode, focusNode)) {
          dispatchCommand(editor, REMOVE_TEXT_COMMAND, undefined);
        }

        break;
      }

      case 'deleteByDrag':
      case 'deleteByCut': {
        dispatchCommand(editor, REMOVE_TEXT_COMMAND, undefined);
        break;
      }

      case 'deleteContent': {
        dispatchCommand(editor, DELETE_CHARACTER_COMMAND, false);
        break;
      }

      case 'deleteWordBackward': {
        dispatchCommand(editor, DELETE_WORD_COMMAND, true);
        break;
      }

      case 'deleteWordForward': {
        dispatchCommand(editor, DELETE_WORD_COMMAND, false);
        break;
      }

      case 'deleteHardLineBackward':
      case 'deleteSoftLineBackward': {
        dispatchCommand(editor, DELETE_LINE_COMMAND, true);
        break;
      }

      case 'deleteContentForward':
      case 'deleteHardLineForward':
      case 'deleteSoftLineForward': {
        dispatchCommand(editor, DELETE_LINE_COMMAND, false);
        break;
      }

      case 'formatStrikeThrough': {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'strikethrough');
        break;
      }

      case 'formatBold': {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'bold');
        break;
      }

      case 'formatItalic': {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'italic');
        break;
      }

      case 'formatUnderline': {
        dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'underline');
        break;
      }

      case 'historyUndo': {
        dispatchCommand(editor, UNDO_COMMAND, undefined);
        break;
      }

      case 'historyRedo': {
        dispatchCommand(editor, REDO_COMMAND, undefined);
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
  updateEditor(editor, () => {
    const selection = $getSelection();
    const data = event.data;

    if (
      data != null &&
      $isRangeSelection(selection) &&
      $shouldPreventDefaultAndInsertText(
        selection,
        data,
        event.timeStamp,
        false,
      )
    ) {
      // Given we're over-riding the default behavior, we will need
      // to ensure to disable composition before dispatching the
      // insertText command for when changing the sequence for FF.
      if (isFirefoxEndingComposition) {
        onCompositionEndImpl(editor, data);
        isFirefoxEndingComposition = false;
      }
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();
      const domSelection = getDOMSelection();
      if (domSelection === null) {
        return;
      }
      const offset = anchor.offset;
      // If the content is the same as inserted, then don't dispatch an insertion.
      // Given onInput doesn't take the current selection (it uses the previous)
      // we can compare that against what the DOM currently says.
      if (
        !CAN_USE_BEFORE_INPUT ||
        selection.isCollapsed() ||
        !$isTextNode(anchorNode) ||
        domSelection.anchorNode === null ||
        anchorNode.getTextContent().slice(0, offset) +
          data +
          anchorNode.getTextContent().slice(offset + selection.focus.offset) !==
          getAnchorTextFromDOM(domSelection.anchorNode)
      ) {
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, data);
      }

      const textLength = data.length;

      // Another hack for FF, as it's possible that the IME is still
      // open, even though compositionend has already fired (sigh).
      if (
        IS_FIREFOX &&
        textLength > 1 &&
        event.inputType === 'insertCompositionText' &&
        !editor.isComposing()
      ) {
        selection.anchor.offset -= textLength;
      }

      // This ensures consistency on Android.
      if (!IS_SAFARI && !IS_IOS && editor.isComposing()) {
        lastKeyDownTimeStamp = 0;
        $setCompositionKey(null);
      }
    } else {
      $updateSelectedTextFromDOM(false);

      // onInput always fires after onCompositionEnd for FF.
      if (isFirefoxEndingComposition) {
        onCompositionEndImpl(editor, data || undefined);
        isFirefoxEndingComposition = false;
      }
    }

    // Also flush any other mutations that might have occurred
    // since the change.
    $flushMutations();
  });
}

function onCompositionStart(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {
  updateEditor(editor, () => {
    const selection = $getSelection();

    if ($isRangeSelection(selection) && !editor.isComposing()) {
      const anchor = selection.anchor;
      $setCompositionKey(anchor.key);

      if (
        // If it has been 30ms since the last keydown, then we should
        // apply the empty space heuristic. We can't do this for Safari,
        // as the keydown fires after composition start.
        event.timeStamp < lastKeyDownTimeStamp + ANDROID_COMPOSITION_LATENCY ||
        // FF has issues around composing multibyte characters, so we also
        // need to invoke the empty space heuristic below.
        anchor.type === 'element' ||
        !selection.isCollapsed() ||
        selection.anchor.getNode().getFormat() !== selection.format
      ) {
        // We insert a zero width character, ready for the composition
        // to get inserted into the new node we create. If
        // we don't do this, Safari will fail on us because
        // there is no text node matching the selection.
        dispatchCommand(
          editor,
          CONTROLLED_TEXT_INSERTION_COMMAND,
          COMPOSITION_START_CHAR,
        );
      }
    }
  });
}

function onCompositionEndImpl(editor: LexicalEditor, data?: string): void {
  const compositionKey = editor._compositionKey;
  $setCompositionKey(null);

  // Handle termination of composition.
  if (compositionKey !== null && data != null) {
    // Composition can sometimes move to an adjacent DOM node when backspacing.
    // So check for the empty case.
    if (data === '') {
      const node = $getNodeByKey(compositionKey);
      const textNode = getDOMTextNode(editor.getElementByKey(compositionKey));

      if (
        textNode !== null &&
        textNode.nodeValue !== null &&
        $isTextNode(node)
      ) {
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

    // Composition can sometimes be that of a new line. In which case, we need to
    // handle that accordingly.
    if (data[data.length - 1] === '\n') {
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        // If the last character is a line break, we also need to insert
        // a line break.
        const focus = selection.focus;
        selection.anchor.set(focus.key, focus.offset, focus.type);
        dispatchCommand(editor, KEY_ENTER_COMMAND, null);
        return;
      }
    }
  }

  $updateSelectedTextFromDOM(true, data);
}

function onCompositionEnd(
  event: CompositionEvent,
  editor: LexicalEditor,
): void {
  // Firefox fires onCompositionEnd before onInput, but Chrome/Webkit,
  // fire onInput before onCompositionEnd. To ensure the sequence works
  // like Chrome/Webkit we use the isFirefoxEndingComposition flag to
  // defer handling of onCompositionEnd in Firefox till we have processed
  // the logic in onInput.
  if (IS_FIREFOX) {
    isFirefoxEndingComposition = true;
  } else {
    updateEditor(editor, () => {
      onCompositionEndImpl(editor, event.data);
    });
  }
}

function onKeyDown(event: KeyboardEvent, editor: LexicalEditor): void {
  lastKeyDownTimeStamp = event.timeStamp;
  lastKeyCode = event.keyCode;
  if (editor.isComposing()) {
    return;
  }

  const {keyCode, shiftKey, ctrlKey, metaKey, altKey} = event;

  if (isMoveForward(keyCode, ctrlKey, altKey, metaKey)) {
    dispatchCommand(editor, KEY_ARROW_RIGHT_COMMAND, event);
  } else if (isMoveToEnd(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
    dispatchCommand(editor, MOVE_TO_END, event);
  } else if (isMoveBackward(keyCode, ctrlKey, altKey, metaKey)) {
    dispatchCommand(editor, KEY_ARROW_LEFT_COMMAND, event);
  } else if (isMoveToStart(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
    dispatchCommand(editor, MOVE_TO_START, event);
  } else if (isMoveUp(keyCode, ctrlKey, metaKey)) {
    dispatchCommand(editor, KEY_ARROW_UP_COMMAND, event);
  } else if (isMoveDown(keyCode, ctrlKey, metaKey)) {
    dispatchCommand(editor, KEY_ARROW_DOWN_COMMAND, event);
  } else if (isLineBreak(keyCode, shiftKey)) {
    isInsertLineBreak = true;
    dispatchCommand(editor, KEY_ENTER_COMMAND, event);
  } else if (isSpace(keyCode)) {
    dispatchCommand(editor, KEY_SPACE_COMMAND, event);
  } else if (isOpenLineBreak(keyCode, ctrlKey)) {
    event.preventDefault();
    isInsertLineBreak = true;
    dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, true);
  } else if (isParagraph(keyCode, shiftKey)) {
    isInsertLineBreak = false;
    dispatchCommand(editor, KEY_ENTER_COMMAND, event);
  } else if (isDeleteBackward(keyCode, altKey, metaKey, ctrlKey)) {
    if (isBackspace(keyCode)) {
      dispatchCommand(editor, KEY_BACKSPACE_COMMAND, event);
    } else {
      event.preventDefault();
      dispatchCommand(editor, DELETE_CHARACTER_COMMAND, true);
    }
  } else if (isEscape(keyCode)) {
    dispatchCommand(editor, KEY_ESCAPE_COMMAND, event);
  } else if (isDeleteForward(keyCode, ctrlKey, shiftKey, altKey, metaKey)) {
    if (isDelete(keyCode)) {
      dispatchCommand(editor, KEY_DELETE_COMMAND, event);
    } else {
      event.preventDefault();
      dispatchCommand(editor, DELETE_CHARACTER_COMMAND, false);
    }
  } else if (isDeleteWordBackward(keyCode, altKey, ctrlKey)) {
    event.preventDefault();
    dispatchCommand(editor, DELETE_WORD_COMMAND, true);
  } else if (isDeleteWordForward(keyCode, altKey, ctrlKey)) {
    event.preventDefault();
    dispatchCommand(editor, DELETE_WORD_COMMAND, false);
  } else if (isDeleteLineBackward(keyCode, metaKey)) {
    event.preventDefault();
    dispatchCommand(editor, DELETE_LINE_COMMAND, true);
  } else if (isDeleteLineForward(keyCode, metaKey)) {
    event.preventDefault();
    dispatchCommand(editor, DELETE_LINE_COMMAND, false);
  } else if (isBold(keyCode, altKey, metaKey, ctrlKey)) {
    event.preventDefault();
    dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'bold');
  } else if (isUnderline(keyCode, altKey, metaKey, ctrlKey)) {
    event.preventDefault();
    dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'underline');
  } else if (isItalic(keyCode, altKey, metaKey, ctrlKey)) {
    event.preventDefault();
    dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'italic');
  } else if (isTab(keyCode, altKey, ctrlKey, metaKey)) {
    dispatchCommand(editor, KEY_TAB_COMMAND, event);
  } else if (isUndo(keyCode, shiftKey, metaKey, ctrlKey)) {
    event.preventDefault();
    dispatchCommand(editor, UNDO_COMMAND, undefined);
  } else if (isRedo(keyCode, shiftKey, metaKey, ctrlKey)) {
    event.preventDefault();
    dispatchCommand(editor, REDO_COMMAND, undefined);
  } else {
    const prevSelection = editor._editorState._selection;
    if ($isNodeSelection(prevSelection)) {
      if (isCopy(keyCode, shiftKey, metaKey, ctrlKey)) {
        event.preventDefault();
        dispatchCommand(editor, COPY_COMMAND, event);
      } else if (isCut(keyCode, shiftKey, metaKey, ctrlKey)) {
        event.preventDefault();
        dispatchCommand(editor, CUT_COMMAND, event);
      }
    }
  }

  if (isModifier(ctrlKey, shiftKey, altKey, metaKey)) {
    dispatchCommand(editor, KEY_MODIFIER_COMMAND, event);
  }
}

function getRootElementRemoveHandles(
  rootElement: HTMLElement,
): RootElementRemoveHandles {
  // @ts-expect-error: internal field
  let eventHandles = rootElement.__lexicalEventHandles;

  if (eventHandles === undefined) {
    eventHandles = [];
    // @ts-expect-error: internal field
    rootElement.__lexicalEventHandles = eventHandles;
  }

  return eventHandles;
}

// Mapping root editors to their active nested editors, contains nested editors
// mapping only, so if root editor is selected map will have no reference to free up memory
const activeNestedEditorsMap: Map<string, LexicalEditor> = new Map();

function onDocumentSelectionChange(event: Event): void {
  const domSelection = getDOMSelection();
  if (domSelection === null) {
    return;
  }
  const nextActiveEditor = getNearestEditorFromDOMNode(domSelection.anchorNode);
  if (nextActiveEditor === null) {
    return;
  }

  if (isSelectionChangeFromMouseDown) {
    isSelectionChangeFromMouseDown = false;
    updateEditor(nextActiveEditor, () => {
      const lastSelection = $getPreviousSelection();
      const domAnchorNode = domSelection.anchorNode;
      if (domAnchorNode === null) {
        return;
      }
      const nodeType = domAnchorNode.nodeType;
      // If the user is attempting to click selection back onto text, then
      // we should attempt create a range selection.
      // When we click on an empty paragraph node or the end of a paragraph that ends
      // with an image/poll, the nodeType will be ELEMENT_NODE
      if (nodeType !== DOM_ELEMENT_TYPE && nodeType !== DOM_TEXT_TYPE) {
        return;
      }
      const newSelection = internalCreateRangeSelection(
        lastSelection,
        domSelection,
        nextActiveEditor,
      );
      $setSelection(newSelection);
    });
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
    onSelectionChange(domSelection, prevActiveEditor, false);
  }

  onSelectionChange(domSelection, nextActiveEditor, true);

  // If newly selected editor is nested, then add it to the map, clean map otherwise
  if (nextActiveEditor !== rootEditor) {
    activeNestedEditorsMap.set(rootEditorKey, nextActiveEditor);
  } else if (activeNestedEditor) {
    activeNestedEditorsMap.delete(rootEditorKey);
  }
}

function stopLexicalPropagation(event: Event): void {
  // We attach a special property to ensure the same event doesn't re-fire
  // for parent editors.
  // @ts-ignore
  event._lexicalHandled = true;
}

function hasStoppedLexicalPropagation(event: Event): boolean {
  // @ts-ignore
  const stopped = event._lexicalHandled === true;
  return stopped;
}

export type EventHandler = (event: Event, editor: LexicalEditor) => void;

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
  // @ts-expect-error: internal field
  rootElement.__lexicalEditor = editor;
  const removeHandles = getRootElementRemoveHandles(rootElement);

  for (let i = 0; i < rootElementEvents.length; i++) {
    const [eventName, onEvent] = rootElementEvents[i];
    const eventHandler =
      typeof onEvent === 'function'
        ? (event: Event) => {
            if (hasStoppedLexicalPropagation(event)) {
              return;
            }
            stopLexicalPropagation(event);
            if (editor.isEditable()) {
              onEvent(event, editor);
            }
          }
        : (event: Event) => {
            if (hasStoppedLexicalPropagation(event)) {
              return;
            }
            stopLexicalPropagation(event);
            if (editor.isEditable()) {
              switch (eventName) {
                case 'cut':
                  return dispatchCommand(
                    editor,
                    CUT_COMMAND,
                    event as ClipboardEvent,
                  );

                case 'copy':
                  return dispatchCommand(
                    editor,
                    COPY_COMMAND,
                    event as ClipboardEvent,
                  );

                case 'paste':
                  return dispatchCommand(
                    editor,
                    PASTE_COMMAND,
                    event as ClipboardEvent,
                  );

                case 'dragstart':
                  return dispatchCommand(
                    editor,
                    DRAGSTART_COMMAND,
                    event as DragEvent,
                  );

                case 'dragover':
                  return dispatchCommand(
                    editor,
                    DRAGOVER_COMMAND,
                    event as DragEvent,
                  );

                case 'dragend':
                  return dispatchCommand(
                    editor,
                    DRAGEND_COMMAND,
                    event as DragEvent,
                  );

                case 'focus':
                  return dispatchCommand(
                    editor,
                    FOCUS_COMMAND,
                    event as FocusEvent,
                  );

                case 'blur':
                  return dispatchCommand(
                    editor,
                    BLUR_COMMAND,
                    event as FocusEvent,
                  );

                case 'drop':
                  return dispatchCommand(
                    editor,
                    DROP_COMMAND,
                    event as DragEvent,
                  );
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

  // @ts-expect-error: internal field
  const editor: LexicalEditor | null | undefined = rootElement.__lexicalEditor;

  if (editor !== null && editor !== undefined) {
    cleanActiveNestedEditorsMap(editor);
    // @ts-expect-error: internal field
    rootElement.__lexicalEditor = null;
  }

  const removeHandles = getRootElementRemoveHandles(rootElement);

  for (let i = 0; i < removeHandles.length; i++) {
    removeHandles[i]();
  }

  // @ts-expect-error: internal field
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

export function markSelectionChangeFromDOMUpdate(): void {
  isSelectionChangeFromDOMUpdate = true;
}

export function markCollapsedSelectionFormat(
  format: number,
  offset: number,
  key: NodeKey,
  timeStamp: number,
): void {
  collapsedSelectionFormat = [format, offset, key, timeStamp];
}
