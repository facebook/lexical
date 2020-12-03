// @flow strict-local

import type {OutlineNode, NodeKey, Selection} from 'outline';

import {useCallback, useEffect} from 'react';
import {BlockNode, createParagraph, createText} from 'outline';
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
export const FORMAT_LINK = 5;

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
  editor: OutlineEditor,
  stateRef?: RefObject<T>,
): (event: UnknownEvent) => void {
  return useCallback(
    (event) => {
      const state = stateRef && stateRef.current;
      editor.update((view) => handler(event, view, state, editor));
    },
    [stateRef, editor, handler],
  );
}

export function useEvent<T>(
  editor: OutlineEditor,
  eventName: string,
  handler: (event: UnknownEvent, view: ViewType) => void,
  stateRef?: RefObject<T>,
): void {
  const wrapper = useEventWrapper(handler, editor, stateRef);
  useEffect(() => {
    const target =
      eventName === 'selectionchange' ? document : editor.getEditorElement();

    if (target !== null) {
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
  const selection = view.getSelection();
  const clipboardData = event.clipboardData;
  if (clipboardData != null && selection !== null) {
    insertDataTransfer(clipboardData, selection, state, view, editor);
  }
}

function onDropPolyfill(
  event: ClipboardEvent,
  view: ViewType,
  state: UnknownState,
  editor: OutlineEditor,
) {
  // TODO
  event.preventDefault();
}

function onDragStartPolyfill(
  event: ClipboardEvent,
  view: ViewType,
  state: UnknownState,
  editor: OutlineEditor,
) {
  // TODO: seems to be only FF that supports dragging content
  event.preventDefault();
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

function onCut(
  event: ClipboardEvent,
  view: ViewType,
  state: UnknownState,
  editor: OutlineEditor,
): void {
  onCopy(event, view, state, editor);
  const selection = view.getSelection();
  if (selection !== null) {
    selection.removeText();
  }
}

function onCopy(
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
        JSON.stringify(selection.getNodesInRange()),
      );
    }
  }
}

function generateNode(
  key: NodeKey,
  parentKey: null | NodeKey,
  nodeMap: {[NodeKey]: OutlineNode},
  editor: OutlineEditor,
): OutlineNode {
  const nodeData = nodeMap[key];
  const type = nodeData._type;
  const nodeType = editor._registeredNodeTypes.get(type);
  if (nodeType === undefined) {
    throw new Error('generateNode: type "' + type + '" + not found');
  }
  const node = nodeType.parse(nodeData);
  node._parent = parentKey;
  const newKey = node._key;
  if (node instanceof BlockNode) {
    // $FlowFixMe: valid code
    const children = nodeData._children;
    for (let i = 0; i < children.length; i++) {
      const childKey = children[i];
      const child = generateNode(childKey, newKey, nodeMap, editor);
      const newChildKey = child._key;
      node._children.push(newChildKey);
    }
  }
  return node;
}

function generateNodes(
  nodeRange: {range: Array<NodeKey>, nodeMap: {[NodeKey]: OutlineNode}},
  editor: OutlineEditor,
): Array<OutlineNode> {
  const {range, nodeMap} = nodeRange;
  const nodes = [];
  for (let i = 0; i < range.length; i++) {
    const key = range[i];
    const node = generateNode(key, null, nodeMap, editor);
    nodes.push(node);
  }
  return nodes;
}

function insertDataTransfer(
  dataTransfer: DataTransfer,
  selection: Selection,
  state: UnknownState,
  view: ViewType,
  editor: OutlineEditor,
) {
  if (state.richText) {
    const outlineNodesString = dataTransfer.getData(
      'application/x-outline-nodes',
    );

    if (outlineNodesString) {
      const nodeRange = JSON.parse(outlineNodesString);
      const nodes = generateNodes(nodeRange, editor);
      selection.insertNodes(nodes);
      return;
    }
  }
  const text = dataTransfer.getData('text/plain');
  if (text != null) {
    selection.insertText(text);
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

  if (!inputType.startsWith('delete') || inputType.startsWith('deleteBy')) {
    // $FlowFixMe: Flow doens't know of getTargetRanges
    const targetRange = event.getTargetRanges()[0];

    if (targetRange) {
      selection.applyDOMRange(targetRange);
    }
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
    case 'insertText':
    case 'insertFromComposition': {
      const data = event.data;
      if (data) {
        selection.insertText(data);
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
    case 'deleteByComposition':
    case 'deleteByDrag':
    case 'deleteByCut': {
      selection.removeText();
      break;
    }
    case 'deleteContentBackward': {
      selection.deleteBackward();
      break;
    }
    case 'deleteContent':
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
  editor: OutlineEditor,
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
  const handleCut = useEventWrapper(onCut, editor, stateRef);
  const handleCopy = useEventWrapper(onCopy, editor, stateRef);
  const handleDrop = useEventWrapper(onDropPolyfill, editor, stateRef);
  const handleDragStart = useEventWrapper(
    onDragStartPolyfill,
    editor,
    stateRef,
  );
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
      const target: null | HTMLElement = editor.getEditorElement();

      if (target !== null) {
        target.addEventListener('keydown', handleKeyDown);
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
    handleNativeBeforeInput,
    handlePaste,
    handleSelectionChange,
    handleDrop,
    handleDragStart,
    handleCopy,
  ]);

  return CAN_USE_BEFORE_INPUT
    ? emptyObject
    : {onBeforeInput: handlePolyfilledBeforeInput};
}
