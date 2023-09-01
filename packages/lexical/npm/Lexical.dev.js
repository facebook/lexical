/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var utils = require('@lexical/utils');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function createCommand(type) {
  return {
    type
  } ;
}
const SELECTION_CHANGE_COMMAND = createCommand('SELECTION_CHANGE_COMMAND');
const CLICK_COMMAND = createCommand('CLICK_COMMAND');
const DELETE_CHARACTER_COMMAND = createCommand('DELETE_CHARACTER_COMMAND');
const INSERT_LINE_BREAK_COMMAND = createCommand('INSERT_LINE_BREAK_COMMAND');
const INSERT_PARAGRAPH_COMMAND = createCommand('INSERT_PARAGRAPH_COMMAND');
const CONTROLLED_TEXT_INSERTION_COMMAND = createCommand('CONTROLLED_TEXT_INSERTION_COMMAND');
const PASTE_COMMAND = createCommand('PASTE_COMMAND');
const REMOVE_TEXT_COMMAND = createCommand('REMOVE_TEXT_COMMAND');
const DELETE_WORD_COMMAND = createCommand('DELETE_WORD_COMMAND');
const DELETE_LINE_COMMAND = createCommand('DELETE_LINE_COMMAND');
const FORMAT_TEXT_COMMAND = createCommand('FORMAT_TEXT_COMMAND');
const UNDO_COMMAND = createCommand('UNDO_COMMAND');
const REDO_COMMAND = createCommand('REDO_COMMAND');
const KEY_DOWN_COMMAND = createCommand('KEYDOWN_COMMAND');
const KEY_ARROW_RIGHT_COMMAND = createCommand('KEY_ARROW_RIGHT_COMMAND');
const MOVE_TO_END = createCommand('MOVE_TO_END');
const KEY_ARROW_LEFT_COMMAND = createCommand('KEY_ARROW_LEFT_COMMAND');
const MOVE_TO_START = createCommand('MOVE_TO_START');
const KEY_ARROW_UP_COMMAND = createCommand('KEY_ARROW_UP_COMMAND');
const KEY_ARROW_DOWN_COMMAND = createCommand('KEY_ARROW_DOWN_COMMAND');
const KEY_ENTER_COMMAND = createCommand('KEY_ENTER_COMMAND');
const KEY_SPACE_COMMAND = createCommand('KEY_SPACE_COMMAND');
const KEY_BACKSPACE_COMMAND = createCommand('KEY_BACKSPACE_COMMAND');
const KEY_ESCAPE_COMMAND = createCommand('KEY_ESCAPE_COMMAND');
const KEY_DELETE_COMMAND = createCommand('KEY_DELETE_COMMAND');
const KEY_TAB_COMMAND = createCommand('KEY_TAB_COMMAND');
const INSERT_TAB_COMMAND = createCommand('INSERT_TAB_COMMAND');
const INDENT_CONTENT_COMMAND = createCommand('INDENT_CONTENT_COMMAND');
const OUTDENT_CONTENT_COMMAND = createCommand('OUTDENT_CONTENT_COMMAND');
const DROP_COMMAND = createCommand('DROP_COMMAND');
const FORMAT_ELEMENT_COMMAND = createCommand('FORMAT_ELEMENT_COMMAND');
const DRAGSTART_COMMAND = createCommand('DRAGSTART_COMMAND');
const DRAGOVER_COMMAND = createCommand('DRAGOVER_COMMAND');
const DRAGEND_COMMAND = createCommand('DRAGEND_COMMAND');
const COPY_COMMAND = createCommand('COPY_COMMAND');
const CUT_COMMAND = createCommand('CUT_COMMAND');
const SELECT_ALL_COMMAND = createCommand('SELECT_ALL_COMMAND');
const CLEAR_EDITOR_COMMAND = createCommand('CLEAR_EDITOR_COMMAND');
const CLEAR_HISTORY_COMMAND = createCommand('CLEAR_HISTORY_COMMAND');
const CAN_REDO_COMMAND = createCommand('CAN_REDO_COMMAND');
const CAN_UNDO_COMMAND = createCommand('CAN_UNDO_COMMAND');
const FOCUS_COMMAND = createCommand('FOCUS_COMMAND');
const BLUR_COMMAND = createCommand('BLUR_COMMAND');
const KEY_MODIFIER_COMMAND = createCommand('KEY_MODIFIER_COMMAND');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const CAN_USE_DOM = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const documentMode = CAN_USE_DOM && 'documentMode' in document ? document.documentMode : null;
const IS_APPLE = CAN_USE_DOM && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const IS_FIREFOX = CAN_USE_DOM && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);
const CAN_USE_BEFORE_INPUT = CAN_USE_DOM && 'InputEvent' in window && !documentMode ? 'getTargetRanges' in new window.InputEvent('input') : false;
const IS_SAFARI = CAN_USE_DOM && /Version\/[\d.]+.*Safari/.test(navigator.userAgent);
const IS_IOS = CAN_USE_DOM && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Keep these in case we need to use them in the future.
// export const IS_WINDOWS: boolean = CAN_USE_DOM && /Win/.test(navigator.platform);
const IS_CHROME = CAN_USE_DOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
// export const canUseTextInputEvent: boolean = CAN_USE_DOM && 'TextEvent' in window && !documentMode;

const IS_APPLE_WEBKIT = CAN_USE_DOM && /AppleWebKit\/[\d.]+/.test(navigator.userAgent) && !IS_CHROME;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// DOM
const DOM_ELEMENT_TYPE = 1;
const DOM_TEXT_TYPE = 3;

// Reconciling
const NO_DIRTY_NODES = 0;
const HAS_DIRTY_NODES = 1;
const FULL_RECONCILE = 2;

// Text node modes
const IS_NORMAL = 0;
const IS_TOKEN = 1;
const IS_SEGMENTED = 2;
// IS_INERT = 3

// Text node formatting
const IS_BOLD = 1;
const IS_ITALIC = 1 << 1;
const IS_STRIKETHROUGH = 1 << 2;
const IS_UNDERLINE = 1 << 3;
const IS_CODE = 1 << 4;
const IS_SUBSCRIPT = 1 << 5;
const IS_SUPERSCRIPT = 1 << 6;
const IS_HIGHLIGHT = 1 << 7;
const IS_ALL_FORMATTING = IS_BOLD | IS_ITALIC | IS_STRIKETHROUGH | IS_UNDERLINE | IS_CODE | IS_SUBSCRIPT | IS_SUPERSCRIPT | IS_HIGHLIGHT;

// Text node details
const IS_DIRECTIONLESS = 1;
const IS_UNMERGEABLE = 1 << 1;

// Element node formatting
const IS_ALIGN_LEFT = 1;
const IS_ALIGN_CENTER = 2;
const IS_ALIGN_RIGHT = 3;
const IS_ALIGN_JUSTIFY = 4;
const IS_ALIGN_START = 5;
const IS_ALIGN_END = 6;

// Reconciliation
const NON_BREAKING_SPACE = '\u00A0';
const ZERO_WIDTH_SPACE = '\u200b';

// For iOS/Safari we use a non breaking space, otherwise the cursor appears
// overlapping the composed text.
const COMPOSITION_SUFFIX = IS_SAFARI || IS_IOS || IS_APPLE_WEBKIT ? NON_BREAKING_SPACE : ZERO_WIDTH_SPACE;
const DOUBLE_LINE_BREAK = '\n\n';

// For FF, we need to use a non-breaking space, or it gets composition
// in a stuck state.
const COMPOSITION_START_CHAR = IS_FIREFOX ? NON_BREAKING_SPACE : COMPOSITION_SUFFIX;
const RTL = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
const LTR = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6' + '\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C' + '\uFE00-\uFE6F\uFEFD-\uFFFF';

// eslint-disable-next-line no-misleading-character-class
const RTL_REGEX = new RegExp('^[^' + LTR + ']*[' + RTL + ']');
// eslint-disable-next-line no-misleading-character-class
const LTR_REGEX = new RegExp('^[^' + RTL + ']*[' + LTR + ']');
const TEXT_TYPE_TO_FORMAT = {
  bold: IS_BOLD,
  code: IS_CODE,
  highlight: IS_HIGHLIGHT,
  italic: IS_ITALIC,
  strikethrough: IS_STRIKETHROUGH,
  subscript: IS_SUBSCRIPT,
  superscript: IS_SUPERSCRIPT,
  underline: IS_UNDERLINE
};
const DETAIL_TYPE_TO_DETAIL = {
  directionless: IS_DIRECTIONLESS,
  unmergeable: IS_UNMERGEABLE
};
const ELEMENT_TYPE_TO_FORMAT = {
  center: IS_ALIGN_CENTER,
  end: IS_ALIGN_END,
  justify: IS_ALIGN_JUSTIFY,
  left: IS_ALIGN_LEFT,
  right: IS_ALIGN_RIGHT,
  start: IS_ALIGN_START
};
const ELEMENT_FORMAT_TO_TYPE = {
  [IS_ALIGN_CENTER]: 'center',
  [IS_ALIGN_END]: 'end',
  [IS_ALIGN_JUSTIFY]: 'justify',
  [IS_ALIGN_LEFT]: 'left',
  [IS_ALIGN_RIGHT]: 'right',
  [IS_ALIGN_START]: 'start'
};
const TEXT_MODE_TO_TYPE = {
  normal: IS_NORMAL,
  segmented: IS_SEGMENTED,
  token: IS_TOKEN
};
const TEXT_TYPE_TO_MODE = {
  [IS_NORMAL]: 'normal',
  [IS_SEGMENTED]: 'segmented',
  [IS_TOKEN]: 'token'
};

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// The time between a text entry event and the mutation observer firing.
const TEXT_MUTATION_VARIANCE = 100;
let isProcessingMutations = false;
let lastTextEntryTimeStamp = 0;
function getIsProcesssingMutations() {
  return isProcessingMutations;
}
function updateTimeStamp(event) {
  lastTextEntryTimeStamp = event.timeStamp;
}
function initTextEntryListener(editor) {
  if (lastTextEntryTimeStamp === 0) {
    getWindow(editor).addEventListener('textInput', updateTimeStamp, true);
  }
}
function isManagedLineBreak(dom, target, editor) {
  return (
    // @ts-expect-error: internal field
    target.__lexicalLineBreak === dom ||
    // @ts-ignore We intentionally add this to the Node.
    dom[`__lexicalKey_${editor._key}`] !== undefined
  );
}
function getLastSelection(editor) {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    return selection !== null ? selection.clone() : null;
  });
}
function handleTextMutation(target, node, editor) {
  const domSelection = getDOMSelection(editor._window);
  let anchorOffset = null;
  let focusOffset = null;
  if (domSelection !== null && domSelection.anchorNode === target) {
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
  }
  const text = target.nodeValue;
  if (text !== null) {
    $updateTextNodeFromDOMContent(node, text, anchorOffset, focusOffset, false);
  }
}
function shouldUpdateTextNodeFromMutation(selection, targetDOM, targetNode) {
  if ($isRangeSelection(selection)) {
    const anchorNode = selection.anchor.getNode();
    if (anchorNode.is(targetNode) && selection.format !== anchorNode.getFormat()) {
      return false;
    }
  }
  return targetDOM.nodeType === DOM_TEXT_TYPE && targetNode.isAttached();
}
function $flushMutations$1(editor, mutations, observer) {
  isProcessingMutations = true;
  const shouldFlushTextMutations = performance.now() - lastTextEntryTimeStamp > TEXT_MUTATION_VARIANCE;
  try {
    updateEditor(editor, () => {
      const selection = $getSelection() || getLastSelection(editor);
      const badDOMTargets = new Map();
      const rootElement = editor.getRootElement();
      // We use the current editor state, as that reflects what is
      // actually "on screen".
      const currentEditorState = editor._editorState;
      const blockCursorElement = editor._blockCursorElement;
      let shouldRevertSelection = false;
      let possibleTextForFirefoxPaste = '';
      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        const type = mutation.type;
        const targetDOM = mutation.target;
        let targetNode = $getNearestNodeFromDOMNode(targetDOM, currentEditorState);
        if (targetNode === null && targetDOM !== rootElement || $isDecoratorNode(targetNode)) {
          continue;
        }
        if (type === 'characterData') {
          // Text mutations are deferred and passed to mutation listeners to be
          // processed outside of the Lexical engine.
          if (shouldFlushTextMutations && $isTextNode(targetNode) && shouldUpdateTextNodeFromMutation(selection, targetDOM, targetNode)) {
            handleTextMutation(
            // nodeType === DOM_TEXT_TYPE is a Text DOM node
            targetDOM, targetNode, editor);
          }
        } else if (type === 'childList') {
          shouldRevertSelection = true;
          // We attempt to "undo" any changes that have occurred outside
          // of Lexical. We want Lexical's editor state to be source of truth.
          // To the user, these will look like no-ops.
          const addedDOMs = mutation.addedNodes;
          for (let s = 0; s < addedDOMs.length; s++) {
            const addedDOM = addedDOMs[s];
            const node = getNodeFromDOMNode(addedDOM);
            const parentDOM = addedDOM.parentNode;
            if (parentDOM != null && addedDOM !== blockCursorElement && node === null && (addedDOM.nodeName !== 'BR' || !isManagedLineBreak(addedDOM, parentDOM, editor))) {
              if (IS_FIREFOX) {
                const possibleText = addedDOM.innerText || addedDOM.nodeValue;
                if (possibleText) {
                  possibleTextForFirefoxPaste += possibleText;
                }
              }
              parentDOM.removeChild(addedDOM);
            }
          }
          const removedDOMs = mutation.removedNodes;
          const removedDOMsLength = removedDOMs.length;
          if (removedDOMsLength > 0) {
            let unremovedBRs = 0;
            for (let s = 0; s < removedDOMsLength; s++) {
              const removedDOM = removedDOMs[s];
              if (removedDOM.nodeName === 'BR' && isManagedLineBreak(removedDOM, targetDOM, editor) || blockCursorElement === removedDOM) {
                targetDOM.appendChild(removedDOM);
                unremovedBRs++;
              }
            }
            if (removedDOMsLength !== unremovedBRs) {
              if (targetDOM === rootElement) {
                targetNode = internalGetRoot(currentEditorState);
              }
              badDOMTargets.set(targetDOM, targetNode);
            }
          }
        }
      }

      // Now we process each of the unique target nodes, attempting
      // to restore their contents back to the source of truth, which
      // is Lexical's "current" editor state. This is basically like
      // an internal revert on the DOM.
      if (badDOMTargets.size > 0) {
        for (const [targetDOM, targetNode] of badDOMTargets) {
          if ($isElementNode(targetNode)) {
            const childKeys = targetNode.getChildrenKeys();
            let currentDOM = targetDOM.firstChild;
            for (let s = 0; s < childKeys.length; s++) {
              const key = childKeys[s];
              const correctDOM = editor.getElementByKey(key);
              if (correctDOM === null) {
                continue;
              }
              if (currentDOM == null) {
                targetDOM.appendChild(correctDOM);
                currentDOM = correctDOM;
              } else if (currentDOM !== correctDOM) {
                targetDOM.replaceChild(correctDOM, currentDOM);
              }
              currentDOM = currentDOM.nextSibling;
            }
          } else if ($isTextNode(targetNode)) {
            targetNode.markDirty();
          }
        }
      }

      // Capture all the mutations made during this function. This
      // also prevents us having to process them on the next cycle
      // of onMutation, as these mutations were made by us.
      const records = observer.takeRecords();

      // Check for any random auto-added <br> elements, and remove them.
      // These get added by the browser when we undo the above mutations
      // and this can lead to a broken UI.
      if (records.length > 0) {
        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const addedNodes = record.addedNodes;
          const target = record.target;
          for (let s = 0; s < addedNodes.length; s++) {
            const addedDOM = addedNodes[s];
            const parentDOM = addedDOM.parentNode;
            if (parentDOM != null && addedDOM.nodeName === 'BR' && !isManagedLineBreak(addedDOM, target, editor)) {
              parentDOM.removeChild(addedDOM);
            }
          }
        }

        // Clear any of those removal mutations
        observer.takeRecords();
      }
      if (selection !== null) {
        if (shouldRevertSelection) {
          selection.dirty = true;
          $setSelection(selection);
        }
        if (IS_FIREFOX && isFirefoxClipboardEvents(editor)) {
          selection.insertRawText(possibleTextForFirefoxPaste);
        }
      }
    });
  } finally {
    isProcessingMutations = false;
  }
}
function flushRootMutations(editor) {
  const observer = editor._observer;
  if (observer !== null) {
    const mutations = observer.takeRecords();
    $flushMutations$1(editor, mutations, observer);
  }
}
function initMutationObserver(editor) {
  initTextEntryListener(editor);
  editor._observer = new MutationObserver((mutations, observer) => {
    $flushMutations$1(editor, mutations, observer);
  });
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function $canSimpleTextNodesBeMerged(node1, node2) {
  const node1Mode = node1.__mode;
  const node1Format = node1.__format;
  const node1Style = node1.__style;
  const node2Mode = node2.__mode;
  const node2Format = node2.__format;
  const node2Style = node2.__style;
  return (node1Mode === null || node1Mode === node2Mode) && (node1Format === null || node1Format === node2Format) && (node1Style === null || node1Style === node2Style);
}
function $mergeTextNodes(node1, node2) {
  const writableNode1 = node1.mergeWithSibling(node2);
  const normalizedNodes = getActiveEditor()._normalizedNodes;
  normalizedNodes.add(node1.__key);
  normalizedNodes.add(node2.__key);
  return writableNode1;
}
function $normalizeTextNode(textNode) {
  let node = textNode;
  if (node.__text === '' && node.isSimpleText() && !node.isUnmergeable()) {
    node.remove();
    return;
  }

  // Backward
  let previousNode;
  while ((previousNode = node.getPreviousSibling()) !== null && $isTextNode(previousNode) && previousNode.isSimpleText() && !previousNode.isUnmergeable()) {
    if (previousNode.__text === '') {
      previousNode.remove();
    } else if ($canSimpleTextNodesBeMerged(previousNode, node)) {
      node = $mergeTextNodes(previousNode, node);
      break;
    } else {
      break;
    }
  }

  // Forward
  let nextNode;
  while ((nextNode = node.getNextSibling()) !== null && $isTextNode(nextNode) && nextNode.isSimpleText() && !nextNode.isUnmergeable()) {
    if (nextNode.__text === '') {
      nextNode.remove();
    } else if ($canSimpleTextNodesBeMerged(node, nextNode)) {
      node = $mergeTextNodes(node, nextNode);
      break;
    } else {
      break;
    }
  }
}
function $normalizeSelection(selection) {
  $normalizePoint(selection.anchor);
  $normalizePoint(selection.focus);
  return selection;
}
function $normalizePoint(point) {
  while (point.type === 'element') {
    const node = point.getNode();
    const offset = point.offset;
    let nextNode;
    let nextOffsetAtEnd;
    if (offset === node.getChildrenSize()) {
      nextNode = node.getChildAtIndex(offset - 1);
      nextOffsetAtEnd = true;
    } else {
      nextNode = node.getChildAtIndex(offset);
      nextOffsetAtEnd = false;
    }
    if ($isTextNode(nextNode)) {
      point.set(nextNode.__key, nextOffsetAtEnd ? nextNode.getTextContentSize() : 0, 'text');
      break;
    } else if (!$isElementNode(nextNode)) {
      break;
    }
    point.set(nextNode.__key, nextOffsetAtEnd ? nextNode.getChildrenSize() : 0, 'element');
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
let keyCounter = 1;
function generateRandomKey() {
  return '' + keyCounter++;
}
function getRegisteredNodeOrThrow(editor, nodeType) {
  const registeredNode = editor._nodes.get(nodeType);
  if (registeredNode === undefined) {
    {
      throw Error(`registeredNode: Type ${nodeType} not found`);
    }
  }
  return registeredNode;
}
const scheduleMicroTask = typeof queueMicrotask === 'function' ? queueMicrotask : fn => {
  // No window prefix intended (#1400)
  Promise.resolve().then(fn);
};
function $isSelectionCapturedInDecorator(node) {
  return $isDecoratorNode($getNearestNodeFromDOMNode(node));
}
function isSelectionCapturedInDecoratorInput(anchorDOM) {
  const activeElement = document.activeElement;
  if (activeElement === null) {
    return false;
  }
  const nodeName = activeElement.nodeName;
  return $isDecoratorNode($getNearestNodeFromDOMNode(anchorDOM)) && (nodeName === 'INPUT' || nodeName === 'TEXTAREA' || activeElement.contentEditable === 'true' &&
  // @ts-ignore iternal field
  activeElement.__lexicalEditor == null);
}
function isSelectionWithinEditor(editor, anchorDOM, focusDOM) {
  const rootElement = editor.getRootElement();
  try {
    return rootElement !== null && rootElement.contains(anchorDOM) && rootElement.contains(focusDOM) &&
    // Ignore if selection is within nested editor
    anchorDOM !== null && !isSelectionCapturedInDecoratorInput(anchorDOM) && getNearestEditorFromDOMNode(anchorDOM) === editor;
  } catch (error) {
    return false;
  }
}
function getNearestEditorFromDOMNode(node) {
  let currentNode = node;
  while (currentNode != null) {
    // @ts-expect-error: internal field
    const editor = currentNode.__lexicalEditor;
    if (editor != null) {
      return editor;
    }
    currentNode = getParentElement(currentNode);
  }
  return null;
}
function getTextDirection(text) {
  if (RTL_REGEX.test(text)) {
    return 'rtl';
  }
  if (LTR_REGEX.test(text)) {
    return 'ltr';
  }
  return null;
}
function $isTokenOrSegmented(node) {
  return node.isToken() || node.isSegmented();
}
function isDOMNodeLexicalTextNode(node) {
  return node.nodeType === DOM_TEXT_TYPE;
}
function getDOMTextNode(element) {
  let node = element;
  while (node != null) {
    if (isDOMNodeLexicalTextNode(node)) {
      return node;
    }
    node = node.firstChild;
  }
  return null;
}
function toggleTextFormatType(format, type, alignWithFormat) {
  const activeFormat = TEXT_TYPE_TO_FORMAT[type];
  const isStateFlagPresent = format & activeFormat;
  if (isStateFlagPresent && (alignWithFormat === null || (alignWithFormat & activeFormat) === 0)) {
    // Remove the state flag.
    return format ^ activeFormat;
  }
  if (alignWithFormat === null || alignWithFormat & activeFormat) {
    // Add the state flag.
    return format | activeFormat;
  }
  return format;
}
function $isLeafNode(node) {
  return $isTextNode(node) || $isLineBreakNode(node) || $isDecoratorNode(node);
}
function $setNodeKey(node, existingKey) {
  if (existingKey != null) {
    node.__key = existingKey;
    return;
  }
  errorOnReadOnly();
  errorOnInfiniteTransforms();
  const editor = getActiveEditor();
  const editorState = getActiveEditorState();
  const key = generateRandomKey();
  editorState._nodeMap.set(key, node);
  // TODO Split this function into leaf/element
  if ($isElementNode(node)) {
    editor._dirtyElements.set(key, true);
  } else {
    editor._dirtyLeaves.add(key);
  }
  editor._cloneNotNeeded.add(key);
  editor._dirtyType = HAS_DIRTY_NODES;
  node.__key = key;
}
function internalMarkParentElementsAsDirty(parentKey, nodeMap, dirtyElements) {
  let nextParentKey = parentKey;
  while (nextParentKey !== null) {
    if (dirtyElements.has(nextParentKey)) {
      return;
    }
    const node = nodeMap.get(nextParentKey);
    if (node === undefined) {
      break;
    }
    dirtyElements.set(nextParentKey, false);
    nextParentKey = node.__parent;
  }
}
function removeFromParent(node) {
  const oldParent = node.getParent();
  if (oldParent !== null) {
    const writableNode = node.getWritable();
    const writableParent = oldParent.getWritable();
    const prevSibling = node.getPreviousSibling();
    const nextSibling = node.getNextSibling();
    // TODO: this function duplicates a bunch of operations, can be simplified.
    if (prevSibling === null) {
      if (nextSibling !== null) {
        const writableNextSibling = nextSibling.getWritable();
        writableParent.__first = nextSibling.__key;
        writableNextSibling.__prev = null;
      } else {
        writableParent.__first = null;
      }
    } else {
      const writablePrevSibling = prevSibling.getWritable();
      if (nextSibling !== null) {
        const writableNextSibling = nextSibling.getWritable();
        writableNextSibling.__prev = writablePrevSibling.__key;
        writablePrevSibling.__next = writableNextSibling.__key;
      } else {
        writablePrevSibling.__next = null;
      }
      writableNode.__prev = null;
    }
    if (nextSibling === null) {
      if (prevSibling !== null) {
        const writablePrevSibling = prevSibling.getWritable();
        writableParent.__last = prevSibling.__key;
        writablePrevSibling.__next = null;
      } else {
        writableParent.__last = null;
      }
    } else {
      const writableNextSibling = nextSibling.getWritable();
      if (prevSibling !== null) {
        const writablePrevSibling = prevSibling.getWritable();
        writablePrevSibling.__next = writableNextSibling.__key;
        writableNextSibling.__prev = writablePrevSibling.__key;
      } else {
        writableNextSibling.__prev = null;
      }
      writableNode.__next = null;
    }
    writableParent.__size--;
    writableNode.__parent = null;
  }
}

// Never use this function directly! It will break
// the cloning heuristic. Instead use node.getWritable().
function internalMarkNodeAsDirty(node) {
  errorOnInfiniteTransforms();
  const latest = node.getLatest();
  const parent = latest.__parent;
  const editorState = getActiveEditorState();
  const editor = getActiveEditor();
  const nodeMap = editorState._nodeMap;
  const dirtyElements = editor._dirtyElements;
  if (parent !== null) {
    internalMarkParentElementsAsDirty(parent, nodeMap, dirtyElements);
  }
  const key = latest.__key;
  editor._dirtyType = HAS_DIRTY_NODES;
  if ($isElementNode(node)) {
    dirtyElements.set(key, true);
  } else {
    // TODO split internally MarkNodeAsDirty into two dedicated Element/leave functions
    editor._dirtyLeaves.add(key);
  }
}
function internalMarkSiblingsAsDirty(node) {
  const previousNode = node.getPreviousSibling();
  const nextNode = node.getNextSibling();
  if (previousNode !== null) {
    internalMarkNodeAsDirty(previousNode);
  }
  if (nextNode !== null) {
    internalMarkNodeAsDirty(nextNode);
  }
}
function $setCompositionKey(compositionKey) {
  errorOnReadOnly();
  const editor = getActiveEditor();
  const previousCompositionKey = editor._compositionKey;
  if (compositionKey !== previousCompositionKey) {
    editor._compositionKey = compositionKey;
    if (previousCompositionKey !== null) {
      const node = $getNodeByKey(previousCompositionKey);
      if (node !== null) {
        node.getWritable();
      }
    }
    if (compositionKey !== null) {
      const node = $getNodeByKey(compositionKey);
      if (node !== null) {
        node.getWritable();
      }
    }
  }
}
function $getCompositionKey() {
  if (isCurrentlyReadOnlyMode()) {
    return null;
  }
  const editor = getActiveEditor();
  return editor._compositionKey;
}
function $getNodeByKey(key, _editorState) {
  const editorState = _editorState || getActiveEditorState();
  const node = editorState._nodeMap.get(key);
  if (node === undefined) {
    return null;
  }
  return node;
}
function getNodeFromDOMNode(dom, editorState) {
  const editor = getActiveEditor();
  // @ts-ignore We intentionally add this to the Node.
  const key = dom[`__lexicalKey_${editor._key}`];
  if (key !== undefined) {
    return $getNodeByKey(key, editorState);
  }
  return null;
}
function $getNearestNodeFromDOMNode(startingDOM, editorState) {
  let dom = startingDOM;
  while (dom != null) {
    const node = getNodeFromDOMNode(dom, editorState);
    if (node !== null) {
      return node;
    }
    dom = getParentElement(dom);
  }
  return null;
}
function cloneDecorators(editor) {
  const currentDecorators = editor._decorators;
  const pendingDecorators = Object.assign({}, currentDecorators);
  editor._pendingDecorators = pendingDecorators;
  return pendingDecorators;
}
function getEditorStateTextContent(editorState) {
  return editorState.read(() => $getRoot().getTextContent());
}
function markAllNodesAsDirty(editor, type) {
  // Mark all existing text nodes as dirty
  updateEditor(editor, () => {
    const editorState = getActiveEditorState();
    if (editorState.isEmpty()) {
      return;
    }
    if (type === 'root') {
      $getRoot().markDirty();
      return;
    }
    const nodeMap = editorState._nodeMap;
    for (const [, node] of nodeMap) {
      node.markDirty();
    }
  }, editor._pendingEditorState === null ? {
    tag: 'history-merge'
  } : undefined);
}
function $getRoot() {
  return internalGetRoot(getActiveEditorState());
}
function internalGetRoot(editorState) {
  return editorState._nodeMap.get('root');
}
function $setSelection(selection) {
  errorOnReadOnly();
  const editorState = getActiveEditorState();
  if (selection !== null) {
    {
      if (Object.isFrozen(selection)) {
        {
          throw Error(`$setSelection called on frozen selection object. Ensure selection is cloned before passing in.`);
        }
      }
    }
    selection.dirty = true;
    selection._cachedNodes = null;
  }
  editorState._selection = selection;
}
function $flushMutations() {
  errorOnReadOnly();
  const editor = getActiveEditor();
  flushRootMutations(editor);
}
function getNodeFromDOM(dom) {
  const editor = getActiveEditor();
  const nodeKey = getNodeKeyFromDOM(dom, editor);
  if (nodeKey === null) {
    const rootElement = editor.getRootElement();
    if (dom === rootElement) {
      return $getNodeByKey('root');
    }
    return null;
  }
  return $getNodeByKey(nodeKey);
}
function getTextNodeOffset(node, moveSelectionToEnd) {
  return moveSelectionToEnd ? node.getTextContentSize() : 0;
}
function getNodeKeyFromDOM(
// Note that node here refers to a DOM Node, not an Lexical Node
dom, editor) {
  let node = dom;
  while (node != null) {
    // @ts-ignore We intentionally add this to the Node.
    const key = node[`__lexicalKey_${editor._key}`];
    if (key !== undefined) {
      return key;
    }
    node = getParentElement(node);
  }
  return null;
}
function doesContainGrapheme(str) {
  return /[\uD800-\uDBFF][\uDC00-\uDFFF]/g.test(str);
}
function getEditorsToPropagate(editor) {
  const editorsToPropagate = [];
  let currentEditor = editor;
  while (currentEditor !== null) {
    editorsToPropagate.push(currentEditor);
    currentEditor = currentEditor._parentEditor;
  }
  return editorsToPropagate;
}
function createUID() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
}
function getAnchorTextFromDOM(anchorNode) {
  if (anchorNode.nodeType === DOM_TEXT_TYPE) {
    return anchorNode.nodeValue;
  }
  return null;
}
function $updateSelectedTextFromDOM(isCompositionEnd, editor, data) {
  // Update the text content with the latest composition text
  const domSelection = getDOMSelection(editor._window);
  if (domSelection === null) {
    return;
  }
  const anchorNode = domSelection.anchorNode;
  let {
    anchorOffset,
    focusOffset
  } = domSelection;
  if (anchorNode !== null) {
    let textContent = getAnchorTextFromDOM(anchorNode);
    const node = $getNearestNodeFromDOMNode(anchorNode);
    if (textContent !== null && $isTextNode(node)) {
      // Data is intentionally truthy, as we check for boolean, null and empty string.
      if (textContent === COMPOSITION_SUFFIX && data) {
        const offset = data.length;
        textContent = data;
        anchorOffset = offset;
        focusOffset = offset;
      }
      if (textContent !== null) {
        $updateTextNodeFromDOMContent(node, textContent, anchorOffset, focusOffset, isCompositionEnd);
      }
    }
  }
}
function $updateTextNodeFromDOMContent(textNode, textContent, anchorOffset, focusOffset, compositionEnd) {
  let node = textNode;
  if (node.isAttached() && (compositionEnd || !node.isDirty())) {
    const isComposing = node.isComposing();
    let normalizedTextContent = textContent;
    if ((isComposing || compositionEnd) && textContent[textContent.length - 1] === COMPOSITION_SUFFIX) {
      normalizedTextContent = textContent.slice(0, -1);
    }
    const prevTextContent = node.getTextContent();
    if (compositionEnd || normalizedTextContent !== prevTextContent) {
      if (normalizedTextContent === '') {
        $setCompositionKey(null);
        if (!IS_SAFARI && !IS_IOS && !IS_APPLE_WEBKIT) {
          // For composition (mainly Android), we have to remove the node on a later update
          const editor = getActiveEditor();
          setTimeout(() => {
            editor.update(() => {
              if (node.isAttached()) {
                node.remove();
              }
            });
          }, 20);
        } else {
          node.remove();
        }
        return;
      }
      const parent = node.getParent();
      const prevSelection = $getPreviousSelection();
      const prevTextContentSize = node.getTextContentSize();
      const compositionKey = $getCompositionKey();
      const nodeKey = node.getKey();
      if (node.isToken() || compositionKey !== null && nodeKey === compositionKey && !isComposing ||
      // Check if character was added at the start or boundaries when not insertable, and we need
      // to clear this input from occurring as that action wasn't permitted.
      $isRangeSelection(prevSelection) && (parent !== null && !parent.canInsertTextBefore() && prevSelection.anchor.offset === 0 || prevSelection.anchor.key === textNode.__key && prevSelection.anchor.offset === 0 && !node.canInsertTextBefore() || prevSelection.focus.key === textNode.__key && prevSelection.focus.offset === prevTextContentSize && !node.canInsertTextAfter())) {
        node.markDirty();
        return;
      }
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || anchorOffset === null || focusOffset === null) {
        node.setTextContent(normalizedTextContent);
        return;
      }
      selection.setTextNodeRange(node, anchorOffset, node, focusOffset);
      if (node.isSegmented()) {
        const originalTextContent = node.getTextContent();
        const replacement = $createTextNode(originalTextContent);
        node.replace(replacement);
        node = replacement;
      }
      node.setTextContent(normalizedTextContent);
    }
  }
}
function $previousSiblingDoesNotAcceptText(node) {
  const previousSibling = node.getPreviousSibling();
  return ($isTextNode(previousSibling) || $isElementNode(previousSibling) && previousSibling.isInline()) && !previousSibling.canInsertTextAfter();
}

// This function is connected to $shouldPreventDefaultAndInsertText and determines whether the
// TextNode boundaries are writable or we should use the previous/next sibling instead. For example,
// in the case of a LinkNode, boundaries are not writable.
function $shouldInsertTextAfterOrBeforeTextNode(selection, node) {
  if (node.isSegmented()) {
    return true;
  }
  if (!selection.isCollapsed()) {
    return false;
  }
  const offset = selection.anchor.offset;
  const parent = node.getParentOrThrow();
  const isToken = node.isToken();
  if (offset === 0) {
    return !node.canInsertTextBefore() || !parent.canInsertTextBefore() || isToken || $previousSiblingDoesNotAcceptText(node);
  } else if (offset === node.getTextContentSize()) {
    return !node.canInsertTextAfter() || !parent.canInsertTextAfter() || isToken;
  } else {
    return false;
  }
}
function isTab(keyCode, altKey, ctrlKey, metaKey) {
  return keyCode === 9 && !altKey && !ctrlKey && !metaKey;
}
function isBold(keyCode, altKey, metaKey, ctrlKey) {
  return keyCode === 66 && !altKey && controlOrMeta(metaKey, ctrlKey);
}
function isItalic(keyCode, altKey, metaKey, ctrlKey) {
  return keyCode === 73 && !altKey && controlOrMeta(metaKey, ctrlKey);
}
function isUnderline(keyCode, altKey, metaKey, ctrlKey) {
  return keyCode === 85 && !altKey && controlOrMeta(metaKey, ctrlKey);
}
function isParagraph(keyCode, shiftKey) {
  return isReturn(keyCode) && !shiftKey;
}
function isLineBreak(keyCode, shiftKey) {
  return isReturn(keyCode) && shiftKey;
}

// Inserts a new line after the selection

function isOpenLineBreak(keyCode, ctrlKey) {
  // 79 = KeyO
  return IS_APPLE && ctrlKey && keyCode === 79;
}
function isDeleteWordBackward(keyCode, altKey, ctrlKey) {
  return isBackspace(keyCode) && (IS_APPLE ? altKey : ctrlKey);
}
function isDeleteWordForward(keyCode, altKey, ctrlKey) {
  return isDelete(keyCode) && (IS_APPLE ? altKey : ctrlKey);
}
function isDeleteLineBackward(keyCode, metaKey) {
  return IS_APPLE && metaKey && isBackspace(keyCode);
}
function isDeleteLineForward(keyCode, metaKey) {
  return IS_APPLE && metaKey && isDelete(keyCode);
}
function isDeleteBackward(keyCode, altKey, metaKey, ctrlKey) {
  if (IS_APPLE) {
    if (altKey || metaKey) {
      return false;
    }
    return isBackspace(keyCode) || keyCode === 72 && ctrlKey;
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isBackspace(keyCode);
}
function isDeleteForward(keyCode, ctrlKey, shiftKey, altKey, metaKey) {
  if (IS_APPLE) {
    if (shiftKey || altKey || metaKey) {
      return false;
    }
    return isDelete(keyCode) || keyCode === 68 && ctrlKey;
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isDelete(keyCode);
}
function isUndo(keyCode, shiftKey, metaKey, ctrlKey) {
  return keyCode === 90 && !shiftKey && controlOrMeta(metaKey, ctrlKey);
}
function isRedo(keyCode, shiftKey, metaKey, ctrlKey) {
  if (IS_APPLE) {
    return keyCode === 90 && metaKey && shiftKey;
  }
  return keyCode === 89 && ctrlKey || keyCode === 90 && ctrlKey && shiftKey;
}
function isCopy(keyCode, shiftKey, metaKey, ctrlKey) {
  if (shiftKey) {
    return false;
  }
  if (keyCode === 67) {
    return IS_APPLE ? metaKey : ctrlKey;
  }
  return false;
}
function isCut(keyCode, shiftKey, metaKey, ctrlKey) {
  if (shiftKey) {
    return false;
  }
  if (keyCode === 88) {
    return IS_APPLE ? metaKey : ctrlKey;
  }
  return false;
}
function isArrowLeft(keyCode) {
  return keyCode === 37;
}
function isArrowRight(keyCode) {
  return keyCode === 39;
}
function isArrowUp(keyCode) {
  return keyCode === 38;
}
function isArrowDown(keyCode) {
  return keyCode === 40;
}
function isMoveBackward(keyCode, ctrlKey, altKey, metaKey) {
  return isArrowLeft(keyCode) && !ctrlKey && !metaKey && !altKey;
}
function isMoveToStart(keyCode, ctrlKey, shiftKey, altKey, metaKey) {
  return isArrowLeft(keyCode) && !altKey && !shiftKey && (ctrlKey || metaKey);
}
function isMoveForward(keyCode, ctrlKey, altKey, metaKey) {
  return isArrowRight(keyCode) && !ctrlKey && !metaKey && !altKey;
}
function isMoveToEnd(keyCode, ctrlKey, shiftKey, altKey, metaKey) {
  return isArrowRight(keyCode) && !altKey && !shiftKey && (ctrlKey || metaKey);
}
function isMoveUp(keyCode, ctrlKey, metaKey) {
  return isArrowUp(keyCode) && !ctrlKey && !metaKey;
}
function isMoveDown(keyCode, ctrlKey, metaKey) {
  return isArrowDown(keyCode) && !ctrlKey && !metaKey;
}
function isModifier(ctrlKey, shiftKey, altKey, metaKey) {
  return ctrlKey || shiftKey || altKey || metaKey;
}
function isSpace(keyCode) {
  return keyCode === 32;
}
function controlOrMeta(metaKey, ctrlKey) {
  if (IS_APPLE) {
    return metaKey;
  }
  return ctrlKey;
}
function isReturn(keyCode) {
  return keyCode === 13;
}
function isBackspace(keyCode) {
  return keyCode === 8;
}
function isEscape(keyCode) {
  return keyCode === 27;
}
function isDelete(keyCode) {
  return keyCode === 46;
}
function isSelectAll(keyCode, metaKey, ctrlKey) {
  return keyCode === 65 && controlOrMeta(metaKey, ctrlKey);
}
function $selectAll() {
  const root = $getRoot();
  const selection = root.select(0, root.getChildrenSize());
  $setSelection($normalizeSelection(selection));
}
function getCachedClassNameArray(classNamesTheme, classNameThemeType) {
  if (classNamesTheme.__lexicalClassNameCache === undefined) {
    classNamesTheme.__lexicalClassNameCache = {};
  }
  const classNamesCache = classNamesTheme.__lexicalClassNameCache;
  const cachedClassNames = classNamesCache[classNameThemeType];
  if (cachedClassNames !== undefined) {
    return cachedClassNames;
  }
  const classNames = classNamesTheme[classNameThemeType];
  // As we're using classList, we need
  // to handle className tokens that have spaces.
  // The easiest way to do this to convert the
  // className tokens to an array that can be
  // applied to classList.add()/remove().
  if (typeof classNames === 'string') {
    const classNamesArr = classNames.split(' ');
    classNamesCache[classNameThemeType] = classNamesArr;
    return classNamesArr;
  }
  return classNames;
}
function setMutatedNode(mutatedNodes, registeredNodes, mutationListeners, node, mutation) {
  if (mutationListeners.size === 0) {
    return;
  }
  const nodeType = node.__type;
  const nodeKey = node.__key;
  const registeredNode = registeredNodes.get(nodeType);
  if (registeredNode === undefined) {
    {
      throw Error(`Type ${nodeType} not in registeredNodes`);
    }
  }
  const klass = registeredNode.klass;
  let mutatedNodesByType = mutatedNodes.get(klass);
  if (mutatedNodesByType === undefined) {
    mutatedNodesByType = new Map();
    mutatedNodes.set(klass, mutatedNodesByType);
  }
  const prevMutation = mutatedNodesByType.get(nodeKey);
  // If the node has already been "destroyed", yet we are
  // re-making it, then this means a move likely happened.
  // We should change the mutation to be that of "updated"
  // instead.
  const isMove = prevMutation === 'destroyed' && mutation === 'created';
  if (prevMutation === undefined || isMove) {
    mutatedNodesByType.set(nodeKey, isMove ? 'updated' : mutation);
  }
}
function $nodesOfType(klass) {
  const editorState = getActiveEditorState();
  const readOnly = editorState._readOnly;
  const klassType = klass.getType();
  const nodes = editorState._nodeMap;
  const nodesOfType = [];
  for (const [, node] of nodes) {
    if (node instanceof klass && node.__type === klassType && (readOnly || node.isAttached())) {
      nodesOfType.push(node);
    }
  }
  return nodesOfType;
}
function resolveElement(element, isBackward, focusOffset) {
  const parent = element.getParent();
  let offset = focusOffset;
  let block = element;
  if (parent !== null) {
    if (isBackward && focusOffset === 0) {
      offset = block.getIndexWithinParent();
      block = parent;
    } else if (!isBackward && focusOffset === block.getChildrenSize()) {
      offset = block.getIndexWithinParent() + 1;
      block = parent;
    }
  }
  return block.getChildAtIndex(isBackward ? offset - 1 : offset);
}
function $getAdjacentNode(focus, isBackward) {
  const focusOffset = focus.offset;
  if (focus.type === 'element') {
    const block = focus.getNode();
    return resolveElement(block, isBackward, focusOffset);
  } else {
    const focusNode = focus.getNode();
    if (isBackward && focusOffset === 0 || !isBackward && focusOffset === focusNode.getTextContentSize()) {
      const possibleNode = isBackward ? focusNode.getPreviousSibling() : focusNode.getNextSibling();
      if (possibleNode === null) {
        return resolveElement(focusNode.getParentOrThrow(), isBackward, focusNode.getIndexWithinParent() + (isBackward ? 0 : 1));
      }
      return possibleNode;
    }
  }
  return null;
}
function isFirefoxClipboardEvents(editor) {
  const event = getWindow(editor).event;
  const inputType = event && event.inputType;
  return inputType === 'insertFromPaste' || inputType === 'insertFromPasteAsQuotation';
}
function dispatchCommand(editor, command, payload) {
  return triggerCommandListeners(editor, command, payload);
}
function $textContentRequiresDoubleLinebreakAtEnd(node) {
  return !$isRootNode(node) && !node.isLastChild() && !node.isInline();
}
function getElementByKeyOrThrow(editor, key) {
  const element = editor._keyToDOMMap.get(key);
  if (element === undefined) {
    {
      throw Error(`Reconciliation: could not find DOM element for node key ${key}`);
    }
  }
  return element;
}
function getParentElement(node) {
  const parentElement = node.assignedSlot || node.parentElement;
  return parentElement !== null && parentElement.nodeType === 11 ? parentElement.host : parentElement;
}
function scrollIntoViewIfNeeded(editor, selectionRect, rootElement) {
  const doc = rootElement.ownerDocument;
  const defaultView = doc.defaultView;
  if (defaultView === null) {
    return;
  }
  let {
    top: currentTop,
    bottom: currentBottom
  } = selectionRect;
  let targetTop = 0;
  let targetBottom = 0;
  let element = rootElement;
  while (element !== null) {
    const isBodyElement = element === doc.body;
    if (isBodyElement) {
      targetTop = 0;
      targetBottom = getWindow(editor).innerHeight;
    } else {
      const targetRect = element.getBoundingClientRect();
      targetTop = targetRect.top;
      targetBottom = targetRect.bottom;
    }
    let diff = 0;
    if (currentTop < targetTop) {
      diff = -(targetTop - currentTop);
    } else if (currentBottom > targetBottom) {
      diff = currentBottom - targetBottom;
    }
    if (diff !== 0) {
      if (isBodyElement) {
        // Only handles scrolling of Y axis
        defaultView.scrollBy(0, diff);
      } else {
        const scrollTop = element.scrollTop;
        element.scrollTop += diff;
        const yOffset = element.scrollTop - scrollTop;
        currentTop -= yOffset;
        currentBottom -= yOffset;
      }
    }
    if (isBodyElement) {
      break;
    }
    element = getParentElement(element);
  }
}
function $hasUpdateTag(tag) {
  const editor = getActiveEditor();
  return editor._updateTags.has(tag);
}
function $addUpdateTag(tag) {
  errorOnReadOnly();
  const editor = getActiveEditor();
  editor._updateTags.add(tag);
}
function $maybeMoveChildrenSelectionToParent(parentNode) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !$isElementNode(parentNode)) {
    return selection;
  }
  const {
    anchor,
    focus
  } = selection;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if ($hasAncestor(anchorNode, parentNode)) {
    anchor.set(parentNode.__key, 0, 'element');
  }
  if ($hasAncestor(focusNode, parentNode)) {
    focus.set(parentNode.__key, 0, 'element');
  }
  return selection;
}
function $hasAncestor(child, targetNode) {
  let parent = child.getParent();
  while (parent !== null) {
    if (parent.is(targetNode)) {
      return true;
    }
    parent = parent.getParent();
  }
  return false;
}
function getDefaultView(domElem) {
  const ownerDoc = domElem.ownerDocument;
  return ownerDoc && ownerDoc.defaultView || null;
}
function getWindow(editor) {
  const windowObj = editor._window;
  if (windowObj === null) {
    {
      throw Error(`window object not found`);
    }
  }
  return windowObj;
}
function $isInlineElementOrDecoratorNode(node) {
  return $isElementNode(node) && node.isInline() || $isDecoratorNode(node) && node.isInline();
}
function $getNearestRootOrShadowRoot(node) {
  let parent = node.getParentOrThrow();
  while (parent !== null) {
    if ($isRootOrShadowRoot(parent)) {
      return parent;
    }
    parent = parent.getParentOrThrow();
  }
  return parent;
}
function $isRootOrShadowRoot(node) {
  return $isRootNode(node) || $isElementNode(node) && node.isShadowRoot();
}
function $copyNode(node) {
  // @ts-ignore
  const copy = node.constructor.clone(node);
  $setNodeKey(copy, null);
  return copy;
}
function $applyNodeReplacement(node) {
  const editor = getActiveEditor();
  const nodeType = node.constructor.getType();
  const registeredNode = editor._nodes.get(nodeType);
  if (registeredNode === undefined) {
    {
      throw Error(`$initializeNode failed. Ensure node has been registered to the editor. You can do this by passing the node class via the "nodes" array in the editor config.`);
    }
  }
  const replaceFunc = registeredNode.replace;
  if (replaceFunc !== null) {
    const replacementNode = replaceFunc(node);
    if (!(replacementNode instanceof node.constructor)) {
      {
        throw Error(`$initializeNode failed. Ensure replacement node is a subclass of the original node.`);
      }
    }
    return replacementNode;
  }
  return node;
}
function errorOnInsertTextNodeOnRoot(node, insertNode) {
  const parentNode = node.getParent();
  if ($isRootNode(parentNode) && !$isElementNode(insertNode) && !$isDecoratorNode(insertNode)) {
    {
      throw Error(`Only element or decorator nodes can be inserted in to the root node`);
    }
  }
}
function createBlockCursorElement(editorConfig) {
  const theme = editorConfig.theme;
  const element = document.createElement('div');
  element.contentEditable = 'false';
  element.setAttribute('data-lexical-cursor', 'true');
  let blockCursorTheme = theme.blockCursor;
  if (blockCursorTheme !== undefined) {
    if (typeof blockCursorTheme === 'string') {
      const classNamesArr = blockCursorTheme.split(' ');
      // @ts-expect-error: intentional
      blockCursorTheme = theme.blockCursor = classNamesArr;
    }
    if (blockCursorTheme !== undefined) {
      element.classList.add(...blockCursorTheme);
    }
  }
  return element;
}
function needsBlockCursor(node) {
  return ($isDecoratorNode(node) || $isElementNode(node) && !node.canBeEmpty()) && !node.isInline();
}
function removeDOMBlockCursorElement(blockCursorElement, editor, rootElement) {
  rootElement.style.removeProperty('caret-color');
  editor._blockCursorElement = null;
  const parentElement = blockCursorElement.parentElement;
  if (parentElement !== null) {
    parentElement.removeChild(blockCursorElement);
  }
}
function updateDOMBlockCursorElement(editor, rootElement, nextSelection) {
  let blockCursorElement = editor._blockCursorElement;
  if ($isRangeSelection(nextSelection) && nextSelection.isCollapsed() && nextSelection.anchor.type === 'element' && rootElement.contains(document.activeElement)) {
    const anchor = nextSelection.anchor;
    const elementNode = anchor.getNode();
    const offset = anchor.offset;
    const elementNodeSize = elementNode.getChildrenSize();
    let isBlockCursor = false;
    let insertBeforeElement = null;
    if (offset === elementNodeSize) {
      const child = elementNode.getChildAtIndex(offset - 1);
      if (needsBlockCursor(child)) {
        isBlockCursor = true;
      }
    } else {
      const child = elementNode.getChildAtIndex(offset);
      if (needsBlockCursor(child)) {
        const sibling = child.getPreviousSibling();
        if (sibling === null || needsBlockCursor(sibling)) {
          isBlockCursor = true;
          insertBeforeElement = editor.getElementByKey(child.__key);
        }
      }
    }
    if (isBlockCursor) {
      const elementDOM = editor.getElementByKey(elementNode.__key);
      if (blockCursorElement === null) {
        editor._blockCursorElement = blockCursorElement = createBlockCursorElement(editor._config);
      }
      rootElement.style.caretColor = 'transparent';
      if (insertBeforeElement === null) {
        elementDOM.appendChild(blockCursorElement);
      } else {
        elementDOM.insertBefore(blockCursorElement, insertBeforeElement);
      }
      return;
    }
  }
  // Remove cursor
  if (blockCursorElement !== null) {
    removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
  }
}
function getDOMSelection(targetWindow) {
  return !CAN_USE_DOM ? null : (targetWindow || window).getSelection();
}
function $splitNode(node, offset) {
  let startNode = node.getChildAtIndex(offset);
  if (startNode == null) {
    startNode = node;
  }
  if (!!$isRootOrShadowRoot(node)) {
    throw Error(`Can not call $splitNode() on root element`);
  }
  const recurse = currentNode => {
    const parent = currentNode.getParentOrThrow();
    const isParentRoot = $isRootOrShadowRoot(parent);
    // The node we start split from (leaf) is moved, but its recursive
    // parents are copied to create separate tree
    const nodeToMove = currentNode === startNode && !isParentRoot ? currentNode : $copyNode(currentNode);
    if (isParentRoot) {
      currentNode.insertAfter(nodeToMove);
      return [currentNode, nodeToMove, nodeToMove];
    } else {
      const [leftTree, rightTree, newParent] = recurse(parent);
      const nextSiblings = currentNode.getNextSiblings();
      newParent.append(nodeToMove, ...nextSiblings);
      return [leftTree, rightTree, nodeToMove];
    }
  };
  const [leftTree, rightTree] = recurse(startNode);
  return [leftTree, rightTree];
}
function $findMatchingParent(startingNode, findFn) {
  let curr = startingNode;
  while (curr !== $getRoot() && curr != null) {
    if (findFn(curr)) {
      return curr;
    }
    curr = curr.getParent();
  }
  return null;
}
function $getChildrenRecursively(node) {
  const nodes = [];
  const stack = [node];
  while (stack.length > 0) {
    const currentNode = stack.pop();
    if (!(currentNode !== undefined)) {
      throw Error(`Stack.length > 0; can't be undefined`);
    }
    if ($isElementNode(currentNode)) {
      stack.unshift(...currentNode.getChildren());
    }
    if (currentNode !== node) {
      nodes.push(currentNode);
    }
  }
  return nodes;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function $garbageCollectDetachedDecorators(editor, pendingEditorState) {
  const currentDecorators = editor._decorators;
  const pendingDecorators = editor._pendingDecorators;
  let decorators = pendingDecorators || currentDecorators;
  const nodeMap = pendingEditorState._nodeMap;
  let key;
  for (key in decorators) {
    if (!nodeMap.has(key)) {
      if (decorators === currentDecorators) {
        decorators = cloneDecorators(editor);
      }
      delete decorators[key];
    }
  }
}
function $garbageCollectDetachedDeepChildNodes(node, parentKey, prevNodeMap, nodeMap, nodeMapDelete, dirtyNodes) {
  let child = node.getFirstChild();
  while (child !== null) {
    const childKey = child.__key;
    // TODO Revise condition below, redundant? LexicalNode already cleans up children when moving Nodes
    if (child.__parent === parentKey) {
      if ($isElementNode(child)) {
        $garbageCollectDetachedDeepChildNodes(child, childKey, prevNodeMap, nodeMap, nodeMapDelete, dirtyNodes);
      }

      // If we have created a node and it was dereferenced, then also
      // remove it from out dirty nodes Set.
      if (!prevNodeMap.has(childKey)) {
        dirtyNodes.delete(childKey);
      }
      nodeMapDelete.push(childKey);
    }
    child = child.getNextSibling();
  }
}
function $garbageCollectDetachedNodes(prevEditorState, editorState, dirtyLeaves, dirtyElements) {
  const prevNodeMap = prevEditorState._nodeMap;
  const nodeMap = editorState._nodeMap;
  // Store dirtyElements in a queue for later deletion; deleting dirty subtrees too early will
  // hinder accessing .__next on child nodes
  const nodeMapDelete = [];
  for (const [nodeKey] of dirtyElements) {
    const node = nodeMap.get(nodeKey);
    if (node !== undefined) {
      // Garbage collect node and its children if they exist
      if (!node.isAttached()) {
        if ($isElementNode(node)) {
          $garbageCollectDetachedDeepChildNodes(node, nodeKey, prevNodeMap, nodeMap, nodeMapDelete, dirtyElements);
        }
        // If we have created a node and it was dereferenced, then also
        // remove it from out dirty nodes Set.
        if (!prevNodeMap.has(nodeKey)) {
          dirtyElements.delete(nodeKey);
        }
        nodeMapDelete.push(nodeKey);
      }
    }
  }
  for (const nodeKey of nodeMapDelete) {
    nodeMap.delete(nodeKey);
  }
  for (const nodeKey of dirtyLeaves) {
    const node = nodeMap.get(nodeKey);
    if (node !== undefined && !node.isAttached()) {
      if (!prevNodeMap.has(nodeKey)) {
        dirtyLeaves.delete(nodeKey);
      }
      nodeMap.delete(nodeKey);
    }
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
let subTreeTextContent = '';
let subTreeDirectionedTextContent = '';
let editorTextContent = '';
let activeEditorConfig;
let activeEditor$1;
let activeEditorNodes;
let treatAllNodesAsDirty = false;
let activeEditorStateReadOnly = false;
let activeMutationListeners;
let activeTextDirection = null;
let activeDirtyElements;
let activeDirtyLeaves;
let activePrevNodeMap;
let activeNextNodeMap;
let activePrevKeyToDOMMap;
let mutatedNodes;
function destroyNode(key, parentDOM) {
  const node = activePrevNodeMap.get(key);
  if (parentDOM !== null) {
    const dom = getPrevElementByKeyOrThrow(key);
    if (dom.parentNode === parentDOM) {
      parentDOM.removeChild(dom);
    }
  }

  // This logic is really important, otherwise we will leak DOM nodes
  // when their corresponding LexicalNodes are removed from the editor state.
  if (!activeNextNodeMap.has(key)) {
    activeEditor$1._keyToDOMMap.delete(key);
  }
  if ($isElementNode(node)) {
    const children = createChildrenArray(node, activePrevNodeMap);
    destroyChildren(children, 0, children.length - 1, null);
  }
  if (node !== undefined) {
    setMutatedNode(mutatedNodes, activeEditorNodes, activeMutationListeners, node, 'destroyed');
  }
}
function destroyChildren(children, _startIndex, endIndex, dom) {
  let startIndex = _startIndex;
  for (; startIndex <= endIndex; ++startIndex) {
    const child = children[startIndex];
    if (child !== undefined) {
      destroyNode(child, dom);
    }
  }
}
function setTextAlign(domStyle, value) {
  domStyle.setProperty('text-align', value);
}
const DEFAULT_INDENT_VALUE = '40px';
function setElementIndent(dom, indent) {
  const indentClassName = activeEditorConfig.theme.indent;
  if (typeof indentClassName === 'string') {
    const elementHasClassName = dom.classList.contains(indentClassName);
    if (indent > 0 && !elementHasClassName) {
      dom.classList.add(indentClassName);
    } else if (indent < 1 && elementHasClassName) {
      dom.classList.remove(indentClassName);
    }
  }
  const indentationBaseValue = getComputedStyle(dom).getPropertyValue('--lexical-indent-base-value') || DEFAULT_INDENT_VALUE;
  dom.style.setProperty('padding-inline-start', indent === 0 ? '' : `calc(${indent} * ${indentationBaseValue})`);
}
function setElementFormat(dom, format) {
  const domStyle = dom.style;
  if (format === 0) {
    setTextAlign(domStyle, '');
  } else if (format === IS_ALIGN_LEFT) {
    setTextAlign(domStyle, 'left');
  } else if (format === IS_ALIGN_CENTER) {
    setTextAlign(domStyle, 'center');
  } else if (format === IS_ALIGN_RIGHT) {
    setTextAlign(domStyle, 'right');
  } else if (format === IS_ALIGN_JUSTIFY) {
    setTextAlign(domStyle, 'justify');
  } else if (format === IS_ALIGN_START) {
    setTextAlign(domStyle, 'start');
  } else if (format === IS_ALIGN_END) {
    setTextAlign(domStyle, 'end');
  }
}
function createNode(key, parentDOM, insertDOM) {
  const node = activeNextNodeMap.get(key);
  if (node === undefined) {
    {
      throw Error(`createNode: node does not exist in nodeMap`);
    }
  }
  const dom = node.createDOM(activeEditorConfig, activeEditor$1);
  storeDOMWithKey(key, dom, activeEditor$1);

  // This helps preserve the text, and stops spell check tools from
  // merging or break the spans (which happens if they are missing
  // this attribute).
  if ($isTextNode(node)) {
    dom.setAttribute('data-lexical-text', 'true');
  } else if ($isDecoratorNode(node)) {
    dom.setAttribute('data-lexical-decorator', 'true');
  }
  if ($isElementNode(node)) {
    const indent = node.__indent;
    const childrenSize = node.__size;
    if (indent !== 0) {
      setElementIndent(dom, indent);
    }
    if (childrenSize !== 0) {
      const endIndex = childrenSize - 1;
      const children = createChildrenArray(node, activeNextNodeMap);
      createChildrenWithDirection(children, endIndex, node, dom);
    }
    const format = node.__format;
    if (format !== 0) {
      setElementFormat(dom, format);
    }
    if (!node.isInline()) {
      reconcileElementTerminatingLineBreak(null, node, dom);
    }
    if ($textContentRequiresDoubleLinebreakAtEnd(node)) {
      subTreeTextContent += DOUBLE_LINE_BREAK;
      editorTextContent += DOUBLE_LINE_BREAK;
    }
  } else {
    const text = node.getTextContent();
    if ($isDecoratorNode(node)) {
      const decorator = node.decorate(activeEditor$1, activeEditorConfig);
      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
      // Decorators are always non editable
      dom.contentEditable = 'false';
    } else if ($isTextNode(node)) {
      if (!node.isDirectionless()) {
        subTreeDirectionedTextContent += text;
      }
    }
    subTreeTextContent += text;
    editorTextContent += text;
  }
  if (parentDOM !== null) {
    if (insertDOM != null) {
      parentDOM.insertBefore(dom, insertDOM);
    } else {
      // @ts-expect-error: internal field
      const possibleLineBreak = parentDOM.__lexicalLineBreak;
      if (possibleLineBreak != null) {
        parentDOM.insertBefore(dom, possibleLineBreak);
      } else {
        parentDOM.appendChild(dom);
      }
    }
  }
  {
    // Freeze the node in DEV to prevent accidental mutations
    Object.freeze(node);
  }
  setMutatedNode(mutatedNodes, activeEditorNodes, activeMutationListeners, node, 'created');
  return dom;
}
function createChildrenWithDirection(children, endIndex, element, dom) {
  const previousSubTreeDirectionedTextContent = subTreeDirectionedTextContent;
  subTreeDirectionedTextContent = '';
  createChildren(children, element, 0, endIndex, dom, null);
  reconcileBlockDirection(element, dom);
  subTreeDirectionedTextContent = previousSubTreeDirectionedTextContent;
}
function createChildren(children, element, _startIndex, endIndex, dom, insertDOM) {
  const previousSubTreeTextContent = subTreeTextContent;
  subTreeTextContent = '';
  let startIndex = _startIndex;
  for (; startIndex <= endIndex; ++startIndex) {
    createNode(children[startIndex], dom, insertDOM);
  }
  if ($textContentRequiresDoubleLinebreakAtEnd(element)) {
    subTreeTextContent += DOUBLE_LINE_BREAK;
  }
  // @ts-expect-error: internal field
  dom.__lexicalTextContent = subTreeTextContent;
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
}
function isLastChildLineBreakOrDecorator(childKey, nodeMap) {
  const node = nodeMap.get(childKey);
  return $isLineBreakNode(node) || $isDecoratorNode(node) && node.isInline();
}

// If we end an element with a LineBreakNode, then we need to add an additional <br>
function reconcileElementTerminatingLineBreak(prevElement, nextElement, dom) {
  const prevLineBreak = prevElement !== null && (prevElement.__size === 0 || isLastChildLineBreakOrDecorator(prevElement.__last, activePrevNodeMap));
  const nextLineBreak = nextElement.__size === 0 || isLastChildLineBreakOrDecorator(nextElement.__last, activeNextNodeMap);
  if (prevLineBreak) {
    if (!nextLineBreak) {
      // @ts-expect-error: internal field
      const element = dom.__lexicalLineBreak;
      if (element != null) {
        dom.removeChild(element);
      }

      // @ts-expect-error: internal field
      dom.__lexicalLineBreak = null;
    }
  } else if (nextLineBreak) {
    const element = document.createElement('br');
    // @ts-expect-error: internal field
    dom.__lexicalLineBreak = element;
    dom.appendChild(element);
  }
}
function reconcileBlockDirection(element, dom) {
  const previousSubTreeDirectionTextContent =
  // @ts-expect-error: internal field
  dom.__lexicalDirTextContent;
  // @ts-expect-error: internal field
  const previousDirection = dom.__lexicalDir;
  if (previousSubTreeDirectionTextContent !== subTreeDirectionedTextContent || previousDirection !== activeTextDirection) {
    const hasEmptyDirectionedTextContent = subTreeDirectionedTextContent === '';
    const direction = hasEmptyDirectionedTextContent ? activeTextDirection : getTextDirection(subTreeDirectionedTextContent);
    if (direction !== previousDirection) {
      const classList = dom.classList;
      const theme = activeEditorConfig.theme;
      let previousDirectionTheme = previousDirection !== null ? theme[previousDirection] : undefined;
      let nextDirectionTheme = direction !== null ? theme[direction] : undefined;

      // Remove the old theme classes if they exist
      if (previousDirectionTheme !== undefined) {
        if (typeof previousDirectionTheme === 'string') {
          const classNamesArr = previousDirectionTheme.split(' ');
          previousDirectionTheme = theme[previousDirection] = classNamesArr;
        }

        // @ts-ignore: intentional
        classList.remove(...previousDirectionTheme);
      }
      if (direction === null || hasEmptyDirectionedTextContent && direction === 'ltr') {
        // Remove direction
        dom.removeAttribute('dir');
      } else {
        // Apply the new theme classes if they exist
        if (nextDirectionTheme !== undefined) {
          if (typeof nextDirectionTheme === 'string') {
            const classNamesArr = nextDirectionTheme.split(' ');
            // @ts-expect-error: intentional
            nextDirectionTheme = theme[direction] = classNamesArr;
          }
          if (nextDirectionTheme !== undefined) {
            classList.add(...nextDirectionTheme);
          }
        }

        // Update direction
        dom.dir = direction;
      }
      if (!activeEditorStateReadOnly) {
        const writableNode = element.getWritable();
        writableNode.__dir = direction;
      }
    }
    activeTextDirection = direction;
    // @ts-expect-error: internal field
    dom.__lexicalDirTextContent = subTreeDirectionedTextContent;
    // @ts-expect-error: internal field
    dom.__lexicalDir = direction;
  }
}
function reconcileChildrenWithDirection(prevElement, nextElement, dom) {
  const previousSubTreeDirectionTextContent = subTreeDirectionedTextContent;
  subTreeDirectionedTextContent = '';
  reconcileChildren(prevElement, nextElement, dom);
  reconcileBlockDirection(nextElement, dom);
  subTreeDirectionedTextContent = previousSubTreeDirectionTextContent;
}
function createChildrenArray(element, nodeMap) {
  const children = [];
  let nodeKey = element.__first;
  while (nodeKey !== null) {
    const node = nodeMap.get(nodeKey);
    if (node === undefined) {
      {
        throw Error(`createChildrenArray: node does not exist in nodeMap`);
      }
    }
    children.push(nodeKey);
    nodeKey = node.__next;
  }
  return children;
}
function reconcileChildren(prevElement, nextElement, dom) {
  const previousSubTreeTextContent = subTreeTextContent;
  const prevChildrenSize = prevElement.__size;
  const nextChildrenSize = nextElement.__size;
  subTreeTextContent = '';
  if (prevChildrenSize === 1 && nextChildrenSize === 1) {
    const prevFirstChildKey = prevElement.__first;
    const nextFrstChildKey = nextElement.__first;
    if (prevFirstChildKey === nextFrstChildKey) {
      reconcileNode(prevFirstChildKey, dom);
    } else {
      const lastDOM = getPrevElementByKeyOrThrow(prevFirstChildKey);
      const replacementDOM = createNode(nextFrstChildKey, null, null);
      dom.replaceChild(replacementDOM, lastDOM);
      destroyNode(prevFirstChildKey, null);
    }
  } else {
    const prevChildren = createChildrenArray(prevElement, activePrevNodeMap);
    const nextChildren = createChildrenArray(nextElement, activeNextNodeMap);
    if (prevChildrenSize === 0) {
      if (nextChildrenSize !== 0) {
        createChildren(nextChildren, nextElement, 0, nextChildrenSize - 1, dom, null);
      }
    } else if (nextChildrenSize === 0) {
      if (prevChildrenSize !== 0) {
        // @ts-expect-error: internal field
        const lexicalLineBreak = dom.__lexicalLineBreak;
        const canUseFastPath = lexicalLineBreak == null;
        destroyChildren(prevChildren, 0, prevChildrenSize - 1, canUseFastPath ? null : dom);
        if (canUseFastPath) {
          // Fast path for removing DOM nodes
          dom.textContent = '';
        }
      }
    } else {
      reconcileNodeChildren(nextElement, prevChildren, nextChildren, prevChildrenSize, nextChildrenSize, dom);
    }
  }
  if ($textContentRequiresDoubleLinebreakAtEnd(nextElement)) {
    subTreeTextContent += DOUBLE_LINE_BREAK;
  }

  // @ts-expect-error: internal field
  dom.__lexicalTextContent = subTreeTextContent;
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
}
function reconcileNode(key, parentDOM) {
  const prevNode = activePrevNodeMap.get(key);
  let nextNode = activeNextNodeMap.get(key);
  if (prevNode === undefined || nextNode === undefined) {
    {
      throw Error(`reconcileNode: prevNode or nextNode does not exist in nodeMap`);
    }
  }
  const isDirty = treatAllNodesAsDirty || activeDirtyLeaves.has(key) || activeDirtyElements.has(key);
  const dom = getElementByKeyOrThrow(activeEditor$1, key);

  // If the node key points to the same instance in both states
  // and isn't dirty, we just update the text content cache
  // and return the existing DOM Node.
  if (prevNode === nextNode && !isDirty) {
    if ($isElementNode(prevNode)) {
      // @ts-expect-error: internal field
      const previousSubTreeTextContent = dom.__lexicalTextContent;
      if (previousSubTreeTextContent !== undefined) {
        subTreeTextContent += previousSubTreeTextContent;
        editorTextContent += previousSubTreeTextContent;
      }

      // @ts-expect-error: internal field
      const previousSubTreeDirectionTextContent = dom.__lexicalDirTextContent;
      if (previousSubTreeDirectionTextContent !== undefined) {
        subTreeDirectionedTextContent += previousSubTreeDirectionTextContent;
      }
    } else {
      const text = prevNode.getTextContent();
      if ($isTextNode(prevNode) && !prevNode.isDirectionless()) {
        subTreeDirectionedTextContent += text;
      }
      editorTextContent += text;
      subTreeTextContent += text;
    }
    return dom;
  }
  // If the node key doesn't point to the same instance in both maps,
  // it means it were cloned. If they're also dirty, we mark them as mutated.
  if (prevNode !== nextNode && isDirty) {
    setMutatedNode(mutatedNodes, activeEditorNodes, activeMutationListeners, nextNode, 'updated');
  }

  // Update node. If it returns true, we need to unmount and re-create the node
  if (nextNode.updateDOM(prevNode, dom, activeEditorConfig)) {
    const replacementDOM = createNode(key, null, null);
    if (parentDOM === null) {
      {
        throw Error(`reconcileNode: parentDOM is null`);
      }
    }
    parentDOM.replaceChild(replacementDOM, dom);
    destroyNode(key, null);
    return replacementDOM;
  }
  if ($isElementNode(prevNode) && $isElementNode(nextNode)) {
    // Reconcile element children
    const nextIndent = nextNode.__indent;
    if (nextIndent !== prevNode.__indent) {
      setElementIndent(dom, nextIndent);
    }
    const nextFormat = nextNode.__format;
    if (nextFormat !== prevNode.__format) {
      setElementFormat(dom, nextFormat);
    }
    if (isDirty) {
      reconcileChildrenWithDirection(prevNode, nextNode, dom);
      if (!$isRootNode(nextNode) && !nextNode.isInline()) {
        reconcileElementTerminatingLineBreak(prevNode, nextNode, dom);
      }
    }
    if ($textContentRequiresDoubleLinebreakAtEnd(nextNode)) {
      subTreeTextContent += DOUBLE_LINE_BREAK;
      editorTextContent += DOUBLE_LINE_BREAK;
    }
  } else {
    const text = nextNode.getTextContent();
    if ($isDecoratorNode(nextNode)) {
      const decorator = nextNode.decorate(activeEditor$1, activeEditorConfig);
      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
    } else if ($isTextNode(nextNode) && !nextNode.isDirectionless()) {
      // Handle text content, for LTR, LTR cases.
      subTreeDirectionedTextContent += text;
    }
    subTreeTextContent += text;
    editorTextContent += text;
  }
  if (!activeEditorStateReadOnly && $isRootNode(nextNode) && nextNode.__cachedText !== editorTextContent) {
    // Cache the latest text content.
    nextNode = nextNode.getWritable();
    nextNode.__cachedText = editorTextContent;
  }
  {
    // Freeze the node in DEV to prevent accidental mutations
    Object.freeze(nextNode);
  }
  return dom;
}
function reconcileDecorator(key, decorator) {
  let pendingDecorators = activeEditor$1._pendingDecorators;
  const currentDecorators = activeEditor$1._decorators;
  if (pendingDecorators === null) {
    if (currentDecorators[key] === decorator) {
      return;
    }
    pendingDecorators = cloneDecorators(activeEditor$1);
  }
  pendingDecorators[key] = decorator;
}
function getFirstChild(element) {
  return element.firstChild;
}
function getNextSibling(element) {
  let nextSibling = element.nextSibling;
  if (nextSibling !== null && nextSibling === activeEditor$1._blockCursorElement) {
    nextSibling = nextSibling.nextSibling;
  }
  return nextSibling;
}
function reconcileNodeChildren(nextElement, prevChildren, nextChildren, prevChildrenLength, nextChildrenLength, dom) {
  const prevEndIndex = prevChildrenLength - 1;
  const nextEndIndex = nextChildrenLength - 1;
  let prevChildrenSet;
  let nextChildrenSet;
  let siblingDOM = getFirstChild(dom);
  let prevIndex = 0;
  let nextIndex = 0;
  while (prevIndex <= prevEndIndex && nextIndex <= nextEndIndex) {
    const prevKey = prevChildren[prevIndex];
    const nextKey = nextChildren[nextIndex];
    if (prevKey === nextKey) {
      siblingDOM = getNextSibling(reconcileNode(nextKey, dom));
      prevIndex++;
      nextIndex++;
    } else {
      if (prevChildrenSet === undefined) {
        prevChildrenSet = new Set(prevChildren);
      }
      if (nextChildrenSet === undefined) {
        nextChildrenSet = new Set(nextChildren);
      }
      const nextHasPrevKey = nextChildrenSet.has(prevKey);
      const prevHasNextKey = prevChildrenSet.has(nextKey);
      if (!nextHasPrevKey) {
        // Remove prev
        siblingDOM = getNextSibling(getPrevElementByKeyOrThrow(prevKey));
        destroyNode(prevKey, dom);
        prevIndex++;
      } else if (!prevHasNextKey) {
        // Create next
        createNode(nextKey, dom, siblingDOM);
        nextIndex++;
      } else {
        // Move next
        const childDOM = getElementByKeyOrThrow(activeEditor$1, nextKey);
        if (childDOM === siblingDOM) {
          siblingDOM = getNextSibling(reconcileNode(nextKey, dom));
        } else {
          if (siblingDOM != null) {
            dom.insertBefore(childDOM, siblingDOM);
          } else {
            dom.appendChild(childDOM);
          }
          reconcileNode(nextKey, dom);
        }
        prevIndex++;
        nextIndex++;
      }
    }
  }
  const appendNewChildren = prevIndex > prevEndIndex;
  const removeOldChildren = nextIndex > nextEndIndex;
  if (appendNewChildren && !removeOldChildren) {
    const previousNode = nextChildren[nextEndIndex + 1];
    const insertDOM = previousNode === undefined ? null : activeEditor$1.getElementByKey(previousNode);
    createChildren(nextChildren, nextElement, nextIndex, nextEndIndex, dom, insertDOM);
  } else if (removeOldChildren && !appendNewChildren) {
    destroyChildren(prevChildren, prevIndex, prevEndIndex, dom);
  }
}
function reconcileRoot(prevEditorState, nextEditorState, editor, dirtyType, dirtyElements, dirtyLeaves) {
  // We cache text content to make retrieval more efficient.
  // The cache must be rebuilt during reconciliation to account for any changes.
  subTreeTextContent = '';
  editorTextContent = '';
  subTreeDirectionedTextContent = '';
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  treatAllNodesAsDirty = dirtyType === FULL_RECONCILE;
  activeTextDirection = null;
  activeEditor$1 = editor;
  activeEditorConfig = editor._config;
  activeEditorNodes = editor._nodes;
  activeMutationListeners = activeEditor$1._listeners.mutation;
  activeDirtyElements = dirtyElements;
  activeDirtyLeaves = dirtyLeaves;
  activePrevNodeMap = prevEditorState._nodeMap;
  activeNextNodeMap = nextEditorState._nodeMap;
  activeEditorStateReadOnly = nextEditorState._readOnly;
  activePrevKeyToDOMMap = new Map(editor._keyToDOMMap);
  // We keep track of mutated nodes so we can trigger mutation
  // listeners later in the update cycle.
  const currentMutatedNodes = new Map();
  mutatedNodes = currentMutatedNodes;
  reconcileNode('root', null);
  // We don't want a bunch of void checks throughout the scope
  // so instead we make it seem that these values are always set.
  // We also want to make sure we clear them down, otherwise we
  // can leak memory.
  // @ts-ignore
  activeEditor$1 = undefined;
  // @ts-ignore
  activeEditorNodes = undefined;
  // @ts-ignore
  activeDirtyElements = undefined;
  // @ts-ignore
  activeDirtyLeaves = undefined;
  // @ts-ignore
  activePrevNodeMap = undefined;
  // @ts-ignore
  activeNextNodeMap = undefined;
  // @ts-ignore
  activeEditorConfig = undefined;
  // @ts-ignore
  activePrevKeyToDOMMap = undefined;
  // @ts-ignore
  mutatedNodes = undefined;
  return currentMutatedNodes;
}
function storeDOMWithKey(key, dom, editor) {
  const keyToDOMMap = editor._keyToDOMMap;
  // @ts-ignore We intentionally add this to the Node.
  dom['__lexicalKey_' + editor._key] = key;
  keyToDOMMap.set(key, dom);
}
function getPrevElementByKeyOrThrow(key) {
  const element = activePrevKeyToDOMMap.get(key);
  if (element === undefined) {
    {
      throw Error(`Reconciliation: could not find DOM element for node key ${key}`);
    }
  }
  return element;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const PASS_THROUGH_COMMAND = Object.freeze({});
const ANDROID_COMPOSITION_LATENCY = 30;
const rootElementEvents = [['keydown', onKeyDown], ['pointerdown', onPointerDown], ['compositionstart', onCompositionStart], ['compositionend', onCompositionEnd], ['input', onInput], ['click', onClick], ['cut', PASS_THROUGH_COMMAND], ['copy', PASS_THROUGH_COMMAND], ['dragstart', PASS_THROUGH_COMMAND], ['dragover', PASS_THROUGH_COMMAND], ['dragend', PASS_THROUGH_COMMAND], ['paste', PASS_THROUGH_COMMAND], ['focus', PASS_THROUGH_COMMAND], ['blur', PASS_THROUGH_COMMAND], ['drop', PASS_THROUGH_COMMAND]];
if (CAN_USE_BEFORE_INPUT) {
  rootElementEvents.push(['beforeinput', (event, editor) => onBeforeInput(event, editor)]);
}
let lastKeyDownTimeStamp = 0;
let lastKeyCode = 0;
let lastBeforeInputInsertTextTimeStamp = 0;
let unprocessedBeforeInputData = null;
let rootElementsRegistered = 0;
let isSelectionChangeFromDOMUpdate = false;
let isSelectionChangeFromMouseDown = false;
let isInsertLineBreak = false;
let isFirefoxEndingComposition = false;
let collapsedSelectionFormat = [0, '', 0, 'root', 0];

// This function is used to determine if Lexical should attempt to override
// the default browser behavior for insertion of text and use its own internal
// heuristics. This is an extremely important function, and makes much of Lexical
// work as intended between different browsers and across word, line and character
// boundary/formats. It also is important for text replacement, node schemas and
// composition mechanics.

function $shouldPreventDefaultAndInsertText(selection, domTargetRange, text, timeStamp, isBeforeInput) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const editor = getActiveEditor();
  const domSelection = getDOMSelection(editor._window);
  const domAnchorNode = domSelection !== null ? domSelection.anchorNode : null;
  const anchorKey = anchor.key;
  const backingAnchorElement = editor.getElementByKey(anchorKey);
  const textLength = text.length;
  return anchorKey !== focus.key ||
  // If we're working with a non-text node.
  !$isTextNode(anchorNode) ||
  // If we are replacing a range with a single character or grapheme, and not composing.
  (!isBeforeInput && (!CAN_USE_BEFORE_INPUT ||
  // We check to see if there has been
  // a recent beforeinput event for "textInput". If there has been one in the last
  // 50ms then we proceed as normal. However, if there is not, then this is likely
  // a dangling `input` event caused by execCommand('insertText').
  lastBeforeInputInsertTextTimeStamp < timeStamp + 50) || anchorNode.isDirty() && textLength < 2 || doesContainGrapheme(text)) && anchor.offset !== focus.offset && !anchorNode.isComposing() ||
  // Any non standard text node.
  $isTokenOrSegmented(anchorNode) ||
  // If the text length is more than a single character and we're either
  // dealing with this in "beforeinput" or where the node has already recently
  // been changed (thus is dirty).
  anchorNode.isDirty() && textLength > 1 ||
  // If the DOM selection element is not the same as the backing node during beforeinput.
  (isBeforeInput || !CAN_USE_BEFORE_INPUT) && backingAnchorElement !== null && !anchorNode.isComposing() && domAnchorNode !== getDOMTextNode(backingAnchorElement) ||
  // If TargetRange is not the same as the DOM selection; browser trying to edit random parts
  // of the editor.
  domSelection !== null && domTargetRange !== null && (!domTargetRange.collapsed || domTargetRange.startContainer !== domSelection.anchorNode || domTargetRange.startOffset !== domSelection.anchorOffset) ||
  // Check if we're changing from bold to italics, or some other format.
  anchorNode.getFormat() !== selection.format || anchorNode.getStyle() !== selection.style ||
  // One last set of heuristics to check against.
  $shouldInsertTextAfterOrBeforeTextNode(selection, anchorNode);
}
function shouldSkipSelectionChange(domNode, offset) {
  return domNode !== null && domNode.nodeValue !== null && domNode.nodeType === DOM_TEXT_TYPE && offset !== 0 && offset !== domNode.nodeValue.length;
}
function onSelectionChange(domSelection, editor, isActive) {
  const {
    anchorNode: anchorDOM,
    anchorOffset,
    focusNode: focusDOM,
    focusOffset
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
    if (shouldSkipSelectionChange(anchorDOM, anchorOffset) && shouldSkipSelectionChange(focusDOM, focusOffset)) {
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
        if (domSelection.type === 'Range' && domSelection.anchorNode === domSelection.focusNode) {
          selection.dirty = true;
        }

        // If we have marked a collapsed selection format, and we're
        // within the given time range – then attempt to use that format
        // instead of getting the format from the anchor node.
        const windowEvent = getWindow(editor).event;
        const currentTimeStamp = windowEvent ? windowEvent.timeStamp : performance.now();
        const [lastFormat, lastStyle, lastOffset, lastKey, timeStamp] = collapsedSelectionFormat;
        if (currentTimeStamp < timeStamp + 200 && anchor.offset === lastOffset && anchor.key === lastKey) {
          selection.format = lastFormat;
          selection.style = lastStyle;
        } else {
          if (anchor.type === 'text') {
            selection.format = anchorNode.getFormat();
            selection.style = anchorNode.getStyle();
          } else if (anchor.type === 'element') {
            selection.format = 0;
            selection.style = '';
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
            // TODO: what about style?
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
function onClick(event, editor) {
  updateEditor(editor, () => {
    const selection = $getSelection();
    const domSelection = getDOMSelection(editor._window);
    const lastSelection = $getPreviousSelection();
    if (domSelection) {
      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor;
        const anchorNode = anchor.getNode();
        if (anchor.type === 'element' && anchor.offset === 0 && selection.isCollapsed() && !$isRootNode(anchorNode) && $getRoot().getChildrenSize() === 1 && anchorNode.getTopLevelElementOrThrow().isEmpty() && lastSelection !== null && selection.is(lastSelection)) {
          domSelection.removeAllRanges();
          selection.dirty = true;
        } else if (event.detail === 3 && !selection.isCollapsed()) {
          // Tripple click causing selection to overflow into the nearest element. In that
          // case visually it looks like a single element content is selected, focus node
          // is actually at the beginning of the next element (if present) and any manipulations
          // with selection (formatting) are affecting second element as well
          const focus = selection.focus;
          const focusNode = focus.getNode();
          if (anchorNode !== focusNode) {
            if ($isElementNode(anchorNode)) {
              anchorNode.select(0);
            } else {
              anchorNode.getParentOrThrow().select(0);
            }
          }
        }
      } else if (event.pointerType === 'touch') {
        // This is used to update the selection on touch devices when the user clicks on text after a
        // node selection. See isSelectionChangeFromMouseDown for the inverse
        const domAnchorNode = domSelection.anchorNode;
        if (domAnchorNode !== null) {
          const nodeType = domAnchorNode.nodeType;
          // If the user is attempting to click selection back onto text, then
          // we should attempt create a range selection.
          // When we click on an empty paragraph node or the end of a paragraph that ends
          // with an image/poll, the nodeType will be ELEMENT_NODE
          if (nodeType === DOM_ELEMENT_TYPE || nodeType === DOM_TEXT_TYPE) {
            const newSelection = internalCreateRangeSelection(lastSelection, domSelection, editor);
            $setSelection(newSelection);
          }
        }
      }
    }
    dispatchCommand(editor, CLICK_COMMAND, event);
  });
}
function onPointerDown(event, editor) {
  // TODO implement text drag & drop
  const target = event.target;
  const pointerType = event.pointerType;
  if (target instanceof Node && pointerType !== 'touch') {
    updateEditor(editor, () => {
      // Drag & drop should not recompute selection until mouse up; otherwise the initially
      // selected content is lost.
      if (!$isSelectionCapturedInDecorator(target)) {
        isSelectionChangeFromMouseDown = true;
      }
    });
  }
}
function getTargetRange(event) {
  if (!event.getTargetRanges) {
    return null;
  }
  const targetRanges = event.getTargetRanges();
  if (targetRanges.length === 0) {
    return null;
  }
  return targetRanges[0];
}
function $canRemoveText(anchorNode, focusNode) {
  return anchorNode !== focusNode || $isElementNode(anchorNode) || $isElementNode(focusNode) || !anchorNode.isToken() || !focusNode.isToken();
}
function isPossiblyAndroidKeyPress(timeStamp) {
  return lastKeyCode === 229 && timeStamp < lastKeyDownTimeStamp + ANDROID_COMPOSITION_LATENCY;
}
function onBeforeInput(event, editor) {
  const inputType = event.inputType;
  const targetRange = getTargetRange(event);

  // We let the browser do its own thing for composition.
  if (inputType === 'deleteCompositionText' ||
  // If we're pasting in FF, we shouldn't get this event
  // as the `paste` event should have triggered, unless the
  // user has dom.event.clipboardevents.enabled disabled in
  // about:config. In that case, we need to process the
  // pasted content in the DOM mutation phase.
  IS_FIREFOX && isFirefoxClipboardEvents(editor)) {
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
        if (isPossiblyAndroidKeyPress(event.timeStamp) && editor.isComposing() && selection.anchor.key === selection.focus.key) {
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
            selection.style = anchorNode.getStyle();
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

    // This represents the case when two beforeinput events are triggered at the same time (without a
    // full event loop ending at input). This happens with MacOS with the default keyboard settings,
    // a combination of autocorrection + autocapitalization.
    // Having Lexical run everything in controlled mode would fix the issue without additional code
    // but this would kill the massive performance win from the most common typing event.
    // Alternatively, when this happens we can prematurely update our EditorState based on the DOM
    // content, a job that would usually be the input event's responsibility.
    if (unprocessedBeforeInputData !== null) {
      $updateSelectedTextFromDOM(false, editor, unprocessedBeforeInputData);
    }
    if ((!selection.dirty || unprocessedBeforeInputData !== null) && selection.isCollapsed() && !$isRootNode(selection.anchor.getNode()) && targetRange !== null) {
      selection.applyDOMRange(targetRange);
    }
    unprocessedBeforeInputData = null;
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
      } else if (data != null && $shouldPreventDefaultAndInsertText(selection, targetRange, data, event.timeStamp, true)) {
        event.preventDefault();
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, data);
      } else {
        unprocessedBeforeInputData = data;
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
      case 'insertReplacementText':
        {
          dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, event);
          break;
        }
      case 'insertFromComposition':
        {
          // This is the end of composition
          $setCompositionKey(null);
          dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, event);
          break;
        }
      case 'insertLineBreak':
        {
          // Used for Android
          $setCompositionKey(null);
          dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false);
          break;
        }
      case 'insertParagraph':
        {
          // Used for Android
          $setCompositionKey(null);

          // Safari does not provide the type "insertLineBreak".
          // So instead, we need to infer it from the keyboard event.
          // We do not apply this logic to iOS to allow newline auto-capitalization
          // work without creating linebreaks when pressing Enter
          if (isInsertLineBreak && !IS_IOS) {
            isInsertLineBreak = false;
            dispatchCommand(editor, INSERT_LINE_BREAK_COMMAND, false);
          } else {
            dispatchCommand(editor, INSERT_PARAGRAPH_COMMAND, undefined);
          }
          break;
        }
      case 'insertFromPaste':
      case 'insertFromPasteAsQuotation':
        {
          dispatchCommand(editor, PASTE_COMMAND, event);
          break;
        }
      case 'deleteByComposition':
        {
          if ($canRemoveText(anchorNode, focusNode)) {
            dispatchCommand(editor, REMOVE_TEXT_COMMAND, event);
          }
          break;
        }
      case 'deleteByDrag':
      case 'deleteByCut':
        {
          dispatchCommand(editor, REMOVE_TEXT_COMMAND, event);
          break;
        }
      case 'deleteContent':
        {
          dispatchCommand(editor, DELETE_CHARACTER_COMMAND, false);
          break;
        }
      case 'deleteWordBackward':
        {
          dispatchCommand(editor, DELETE_WORD_COMMAND, true);
          break;
        }
      case 'deleteWordForward':
        {
          dispatchCommand(editor, DELETE_WORD_COMMAND, false);
          break;
        }
      case 'deleteHardLineBackward':
      case 'deleteSoftLineBackward':
        {
          dispatchCommand(editor, DELETE_LINE_COMMAND, true);
          break;
        }
      case 'deleteContentForward':
      case 'deleteHardLineForward':
      case 'deleteSoftLineForward':
        {
          dispatchCommand(editor, DELETE_LINE_COMMAND, false);
          break;
        }
      case 'formatStrikeThrough':
        {
          dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'strikethrough');
          break;
        }
      case 'formatBold':
        {
          dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'bold');
          break;
        }
      case 'formatItalic':
        {
          dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'italic');
          break;
        }
      case 'formatUnderline':
        {
          dispatchCommand(editor, FORMAT_TEXT_COMMAND, 'underline');
          break;
        }
      case 'historyUndo':
        {
          dispatchCommand(editor, UNDO_COMMAND, undefined);
          break;
        }
      case 'historyRedo':
        {
          dispatchCommand(editor, REDO_COMMAND, undefined);
          break;
        }
      // NO-OP
    }
  });
}

function onInput(event, editor) {
  // We don't want the onInput to bubble, in the case of nested editors.
  event.stopPropagation();
  updateEditor(editor, () => {
    const selection = $getSelection();
    const data = event.data;
    const targetRange = getTargetRange(event);
    if (data != null && $isRangeSelection(selection) && $shouldPreventDefaultAndInsertText(selection, targetRange, data, event.timeStamp, false)) {
      // Given we're over-riding the default behavior, we will need
      // to ensure to disable composition before dispatching the
      // insertText command for when changing the sequence for FF.
      if (isFirefoxEndingComposition) {
        onCompositionEndImpl(editor, data);
        isFirefoxEndingComposition = false;
      }
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();
      const domSelection = getDOMSelection(editor._window);
      if (domSelection === null) {
        return;
      }
      const offset = anchor.offset;
      // If the content is the same as inserted, then don't dispatch an insertion.
      // Given onInput doesn't take the current selection (it uses the previous)
      // we can compare that against what the DOM currently says.
      if (!CAN_USE_BEFORE_INPUT || selection.isCollapsed() || !$isTextNode(anchorNode) || domSelection.anchorNode === null || anchorNode.getTextContent().slice(0, offset) + data + anchorNode.getTextContent().slice(offset + selection.focus.offset) !== getAnchorTextFromDOM(domSelection.anchorNode)) {
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, data);
      }
      const textLength = data.length;

      // Another hack for FF, as it's possible that the IME is still
      // open, even though compositionend has already fired (sigh).
      if (IS_FIREFOX && textLength > 1 && event.inputType === 'insertCompositionText' && !editor.isComposing()) {
        selection.anchor.offset -= textLength;
      }

      // This ensures consistency on Android.
      if (!IS_SAFARI && !IS_IOS && !IS_APPLE_WEBKIT && editor.isComposing()) {
        lastKeyDownTimeStamp = 0;
        $setCompositionKey(null);
      }
    } else {
      const characterData = data !== null ? data : undefined;
      $updateSelectedTextFromDOM(false, editor, characterData);

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
  unprocessedBeforeInputData = null;
}
function onCompositionStart(event, editor) {
  updateEditor(editor, () => {
    const selection = $getSelection();
    if ($isRangeSelection(selection) && !editor.isComposing()) {
      const anchor = selection.anchor;
      const node = selection.anchor.getNode();
      $setCompositionKey(anchor.key);
      if (
      // If it has been 30ms since the last keydown, then we should
      // apply the empty space heuristic. We can't do this for Safari,
      // as the keydown fires after composition start.
      event.timeStamp < lastKeyDownTimeStamp + ANDROID_COMPOSITION_LATENCY ||
      // FF has issues around composing multibyte characters, so we also
      // need to invoke the empty space heuristic below.
      anchor.type === 'element' || !selection.isCollapsed() || node.getFormat() !== selection.format || node.getStyle() !== selection.style) {
        // We insert a zero width character, ready for the composition
        // to get inserted into the new node we create. If
        // we don't do this, Safari will fail on us because
        // there is no text node matching the selection.
        dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, COMPOSITION_START_CHAR);
      }
    }
  });
}
function onCompositionEndImpl(editor, data) {
  const compositionKey = editor._compositionKey;
  $setCompositionKey(null);

  // Handle termination of composition.
  if (compositionKey !== null && data != null) {
    // Composition can sometimes move to an adjacent DOM node when backspacing.
    // So check for the empty case.
    if (data === '') {
      const node = $getNodeByKey(compositionKey);
      const textNode = getDOMTextNode(editor.getElementByKey(compositionKey));
      if (textNode !== null && textNode.nodeValue !== null && $isTextNode(node)) {
        $updateTextNodeFromDOMContent(node, textNode.nodeValue, null, null, true);
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
  $updateSelectedTextFromDOM(true, editor, data);
}
function onCompositionEnd(event, editor) {
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
function onKeyDown(event, editor) {
  lastKeyDownTimeStamp = event.timeStamp;
  lastKeyCode = event.keyCode;
  if (editor.isComposing()) {
    return;
  }
  const {
    keyCode,
    shiftKey,
    ctrlKey,
    metaKey,
    altKey
  } = event;
  if (dispatchCommand(editor, KEY_DOWN_COMMAND, event)) {
    return;
  }
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
      } else if (isSelectAll(keyCode, metaKey, ctrlKey)) {
        event.preventDefault();
        dispatchCommand(editor, SELECT_ALL_COMMAND, event);
      }
      // FF does it well (no need to override behavior)
    } else if (!IS_FIREFOX && isSelectAll(keyCode, metaKey, ctrlKey)) {
      event.preventDefault();
      dispatchCommand(editor, SELECT_ALL_COMMAND, event);
    }
  }
  if (isModifier(ctrlKey, shiftKey, altKey, metaKey)) {
    dispatchCommand(editor, KEY_MODIFIER_COMMAND, event);
  }
}
function getRootElementRemoveHandles(rootElement) {
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
const activeNestedEditorsMap = new Map();
function onDocumentSelectionChange(event) {
  const target = event.target;
  const targetWindow = target == null ? null : target.nodeType === 9 ? target.defaultView : target.ownerDocument.defaultView;
  const domSelection = getDOMSelection(targetWindow);
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
      const newSelection = internalCreateRangeSelection(lastSelection, domSelection, nextActiveEditor);
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
function stopLexicalPropagation(event) {
  // We attach a special property to ensure the same event doesn't re-fire
  // for parent editors.
  // @ts-ignore
  event._lexicalHandled = true;
}
function hasStoppedLexicalPropagation(event) {
  // @ts-ignore
  const stopped = event._lexicalHandled === true;
  return stopped;
}
function addRootElementEvents(rootElement, editor) {
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
    const eventHandler = typeof onEvent === 'function' ? event => {
      if (hasStoppedLexicalPropagation(event)) {
        return;
      }
      stopLexicalPropagation(event);
      if (editor.isEditable()) {
        onEvent(event, editor);
      }
    } : event => {
      if (hasStoppedLexicalPropagation(event)) {
        return;
      }
      stopLexicalPropagation(event);
      if (editor.isEditable()) {
        switch (eventName) {
          case 'cut':
            return dispatchCommand(editor, CUT_COMMAND, event);
          case 'copy':
            return dispatchCommand(editor, COPY_COMMAND, event);
          case 'paste':
            return dispatchCommand(editor, PASTE_COMMAND, event);
          case 'dragstart':
            return dispatchCommand(editor, DRAGSTART_COMMAND, event);
          case 'dragover':
            return dispatchCommand(editor, DRAGOVER_COMMAND, event);
          case 'dragend':
            return dispatchCommand(editor, DRAGEND_COMMAND, event);
          case 'focus':
            return dispatchCommand(editor, FOCUS_COMMAND, event);
          case 'blur':
            {
              return dispatchCommand(editor, BLUR_COMMAND, event);
            }
          case 'drop':
            return dispatchCommand(editor, DROP_COMMAND, event);
        }
      }
    };
    rootElement.addEventListener(eventName, eventHandler);
    removeHandles.push(() => {
      rootElement.removeEventListener(eventName, eventHandler);
    });
  }
}
function removeRootElementEvents(rootElement) {
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
  const editor = rootElement.__lexicalEditor;
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
function cleanActiveNestedEditorsMap(editor) {
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
function markSelectionChangeFromDOMUpdate() {
  isSelectionChangeFromDOMUpdate = true;
}
function markCollapsedSelectionFormat(format, style, offset, key, timeStamp) {
  collapsedSelectionFormat = [format, style, offset, key, timeStamp];
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function removeNode(nodeToRemove, restoreSelection, preserveEmptyParent) {
  errorOnReadOnly();
  const key = nodeToRemove.__key;
  const parent = nodeToRemove.getParent();
  if (parent === null) {
    return;
  }
  const selection = $maybeMoveChildrenSelectionToParent(nodeToRemove);
  let selectionMoved = false;
  if ($isRangeSelection(selection) && restoreSelection) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    if (anchor.key === key) {
      moveSelectionPointToSibling(anchor, nodeToRemove, parent, nodeToRemove.getPreviousSibling(), nodeToRemove.getNextSibling());
      selectionMoved = true;
    }
    if (focus.key === key) {
      moveSelectionPointToSibling(focus, nodeToRemove, parent, nodeToRemove.getPreviousSibling(), nodeToRemove.getNextSibling());
      selectionMoved = true;
    }
  } else if ($isNodeSelection(selection) && restoreSelection && nodeToRemove.isSelected()) {
    nodeToRemove.selectPrevious();
  }
  if ($isRangeSelection(selection) && restoreSelection && !selectionMoved) {
    // Doing this is O(n) so lets avoid it unless we need to do it
    const index = nodeToRemove.getIndexWithinParent();
    removeFromParent(nodeToRemove);
    $updateElementSelectionOnCreateDeleteNode(selection, parent, index, -1);
  } else {
    removeFromParent(nodeToRemove);
  }
  if (!preserveEmptyParent && !$isRootOrShadowRoot(parent) && !parent.canBeEmpty() && parent.isEmpty()) {
    removeNode(parent, restoreSelection);
  }
  if (restoreSelection && $isRootNode(parent) && parent.isEmpty()) {
    parent.selectEnd();
  }
}
class LexicalNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  /** @internal */

  /** @internal */ //@ts-ignore We set the key in the constructor.
  /** @internal */
  /** @internal */
  /** @internal */
  // Flow doesn't support abstract classes unfortunately, so we can't _force_
  // subclasses of Node to implement statics. All subclasses of Node should have
  // a static getType and clone method though. We define getType and clone here so we can call it
  // on any  Node, and we throw this error by default since the subclass should provide
  // their own implementation.
  /**
   * Returns the string type of this node. Every node must
   * implement this and it MUST BE UNIQUE amongst nodes registered
   * on the editor.
   *
   */
  static getType() {
    {
      throw Error(`LexicalNode: Node ${this.name} does not implement .getType().`);
    }
  }

  /**
   * Clones this node, creating a new node with a different key
   * and adding it to the EditorState (but not attaching it anywhere!). All nodes must
   * implement this method.
   *
   */
  static clone(_data) {
    {
      throw Error(`LexicalNode: Node ${this.name} does not implement .clone().`);
    }
  }
  constructor(key) {
    // @ts-expect-error
    this.__type = this.constructor.getType();
    this.__parent = null;
    this.__prev = null;
    this.__next = null;
    $setNodeKey(this, key);
    {
      if (this.__type !== 'root') {
        errorOnReadOnly();
        errorOnTypeKlassMismatch(this.__type,
        // @ts-expect-error
        this.constructor);
      }
    }
  }
  // Getters and Traversers

  /**
   * Returns the string type of this node.
   */
  getType() {
    return this.__type;
  }

  /**
   * Returns true if there is a path between this node and the RootNode, false otherwise.
   * This is a way of determining if the node is "attached" EditorState. Unattached nodes
   * won't be reconciled and will ultimatelt be cleaned up by the Lexical GC.
   */
  isAttached() {
    let nodeKey = this.__key;
    while (nodeKey !== null) {
      if (nodeKey === 'root') {
        return true;
      }
      const node = $getNodeByKey(nodeKey);
      if (node === null) {
        break;
      }
      nodeKey = node.__parent;
    }
    return false;
  }

  /**
   * Returns true if this node is contained within the provided Selection., false otherwise.
   * Relies on the algorithms implemented in {@link BaseSelection.getNodes} to determine
   * what's included.
   *
   * @param selection - The selection that we want to determine if the node is in.
   */
  isSelected(selection) {
    const targetSelection = selection || $getSelection();
    if (targetSelection == null) {
      return false;
    }
    const isSelected = targetSelection.getNodes().some(n => n.__key === this.__key);
    if ($isTextNode(this)) {
      return isSelected;
    }
    // For inline images inside of element nodes.
    // Without this change the image will be selected if the cursor is before or after it.
    if ($isRangeSelection(targetSelection) && targetSelection.anchor.type === 'element' && targetSelection.focus.type === 'element' && targetSelection.anchor.key === targetSelection.focus.key && targetSelection.anchor.offset === targetSelection.focus.offset) {
      return false;
    }
    return isSelected;
  }

  /**
   * Returns this nodes key.
   */
  getKey() {
    // Key is stable between copies
    return this.__key;
  }

  /**
   * Returns the zero-based index of this node within the parent.
   */
  getIndexWithinParent() {
    const parent = this.getParent();
    if (parent === null) {
      return -1;
    }
    let node = parent.getFirstChild();
    let index = 0;
    while (node !== null) {
      if (this.is(node)) {
        return index;
      }
      index++;
      node = node.getNextSibling();
    }
    return -1;
  }

  /**
   * Returns the parent of this node, or null if none is found.
   */
  getParent() {
    const parent = this.getLatest().__parent;
    if (parent === null) {
      return null;
    }
    return $getNodeByKey(parent);
  }

  /**
   * Returns the parent of this node, or throws if none is found.
   */
  getParentOrThrow() {
    const parent = this.getParent();
    if (parent === null) {
      {
        throw Error(`Expected node ${this.__key} to have a parent.`);
      }
    }
    return parent;
  }

  /**
   * Returns the highest (in the EditorState tree)
   * non-root ancestor of this node, or null if none is found. See {@link lexical!$isRootOrShadowRoot}
   * for more information on which Elements comprise "roots".
   */
  getTopLevelElement() {
    let node = this;
    while (node !== null) {
      const parent = node.getParent();
      if ($isRootOrShadowRoot(parent)) {
        return node;
      }
      node = parent;
    }
    return null;
  }

  /**
   * Returns the highest (in the EditorState tree)
   * non-root ancestor of this node, or throws if none is found. See {@link lexical!$isRootOrShadowRoot}
   * for more information on which Elements comprise "roots".
   */
  getTopLevelElementOrThrow() {
    const parent = this.getTopLevelElement();
    if (parent === null) {
      {
        throw Error(`Expected node ${this.__key} to have a top parent element.`);
      }
    }
    return parent;
  }

  /**
   * Returns a list of the every ancestor of this node,
   * all the way up to the RootNode.
   *
   */
  getParents() {
    const parents = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node);
      node = node.getParent();
    }
    return parents;
  }

  /**
   * Returns a list of the keys of every ancestor of this node,
   * all the way up to the RootNode.
   *
   */
  getParentKeys() {
    const parents = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node.__key);
      node = node.getParent();
    }
    return parents;
  }

  /**
   * Returns the "previous" siblings - that is, the node that comes
   * before this one in the same parent.
   *
   */
  getPreviousSibling() {
    const self = this.getLatest();
    const prevKey = self.__prev;
    return prevKey === null ? null : $getNodeByKey(prevKey);
  }

  /**
   * Returns the "previous" siblings - that is, the nodes that come between
   * this one and the first child of it's parent, inclusive.
   *
   */
  getPreviousSiblings() {
    const siblings = [];
    const parent = this.getParent();
    if (parent === null) {
      return siblings;
    }
    let node = parent.getFirstChild();
    while (node !== null) {
      if (node.is(this)) {
        break;
      }
      siblings.push(node);
      node = node.getNextSibling();
    }
    return siblings;
  }

  /**
   * Returns the "next" siblings - that is, the node that comes
   * after this one in the same parent
   *
   */
  getNextSibling() {
    const self = this.getLatest();
    const nextKey = self.__next;
    return nextKey === null ? null : $getNodeByKey(nextKey);
  }

  /**
   * Returns all "next" siblings - that is, the nodes that come between this
   * one and the last child of it's parent, inclusive.
   *
   */
  getNextSiblings() {
    const siblings = [];
    let node = this.getNextSibling();
    while (node !== null) {
      siblings.push(node);
      node = node.getNextSibling();
    }
    return siblings;
  }

  /**
   * Returns the closest common ancestor of this node and the provided one or null
   * if one cannot be found.
   *
   * @param node - the other node to find the common ancestor of.
   */
  getCommonAncestor(node) {
    const a = this.getParents();
    const b = node.getParents();
    if ($isElementNode(this)) {
      a.unshift(this);
    }
    if ($isElementNode(node)) {
      b.unshift(node);
    }
    const aLength = a.length;
    const bLength = b.length;
    if (aLength === 0 || bLength === 0 || a[aLength - 1] !== b[bLength - 1]) {
      return null;
    }
    const bSet = new Set(b);
    for (let i = 0; i < aLength; i++) {
      const ancestor = a[i];
      if (bSet.has(ancestor)) {
        return ancestor;
      }
    }
    return null;
  }

  /**
   * Returns true if the provided node is the exact same one as this node, from Lexical's perspective.
   * Always use this instead of referential equality.
   *
   * @param object - the node to perform the equality comparison on.
   */
  is(object) {
    if (object == null) {
      return false;
    }
    return this.__key === object.__key;
  }

  /**
   * Returns true if this node logical precedes the target node in the editor state.
   *
   * @param targetNode - the node we're testing to see if it's after this one.
   */
  isBefore(targetNode) {
    if (this === targetNode) {
      return false;
    }
    if (targetNode.isParentOf(this)) {
      return true;
    }
    if (this.isParentOf(targetNode)) {
      return false;
    }
    const commonAncestor = this.getCommonAncestor(targetNode);
    let indexA = 0;
    let indexB = 0;
    let node = this;
    while (true) {
      const parent = node.getParentOrThrow();
      if (parent === commonAncestor) {
        indexA = node.getIndexWithinParent();
        break;
      }
      node = parent;
    }
    node = targetNode;
    while (true) {
      const parent = node.getParentOrThrow();
      if (parent === commonAncestor) {
        indexB = node.getIndexWithinParent();
        break;
      }
      node = parent;
    }
    return indexA < indexB;
  }

  /**
   * Returns true if this node is the parent of the target node, false otherwise.
   *
   * @param targetNode - the would-be child node.
   */
  isParentOf(targetNode) {
    const key = this.__key;
    if (key === targetNode.__key) {
      return false;
    }
    let node = targetNode;
    while (node !== null) {
      if (node.__key === key) {
        return true;
      }
      node = node.getParent();
    }
    return false;
  }

  // TO-DO: this function can be simplified a lot
  /**
   * Returns a list of nodes that are between this node and
   * the target node in the EditorState.
   *
   * @param targetNode - the node that marks the other end of the range of nodes to be returned.
   */
  getNodesBetween(targetNode) {
    const isBefore = this.isBefore(targetNode);
    const nodes = [];
    const visited = new Set();
    let node = this;
    while (true) {
      const key = node.__key;
      if (!visited.has(key)) {
        visited.add(key);
        nodes.push(node);
      }
      if (node === targetNode) {
        break;
      }
      const child = $isElementNode(node) ? isBefore ? node.getFirstChild() : node.getLastChild() : null;
      if (child !== null) {
        node = child;
        continue;
      }
      const nextSibling = isBefore ? node.getNextSibling() : node.getPreviousSibling();
      if (nextSibling !== null) {
        node = nextSibling;
        continue;
      }
      const parent = node.getParentOrThrow();
      if (!visited.has(parent.__key)) {
        nodes.push(parent);
      }
      if (parent === targetNode) {
        break;
      }
      let parentSibling = null;
      let ancestor = parent;
      do {
        if (ancestor === null) {
          {
            throw Error(`getNodesBetween: ancestor is null`);
          }
        }
        parentSibling = isBefore ? ancestor.getNextSibling() : ancestor.getPreviousSibling();
        ancestor = ancestor.getParent();
        if (ancestor !== null) {
          if (parentSibling === null && !visited.has(ancestor.__key)) {
            nodes.push(ancestor);
          }
        }
      } while (parentSibling === null);
      node = parentSibling;
    }
    if (!isBefore) {
      nodes.reverse();
    }
    return nodes;
  }

  /**
   * Returns true if this node has been marked dirty during this update cycle.
   *
   */
  isDirty() {
    const editor = getActiveEditor();
    const dirtyLeaves = editor._dirtyLeaves;
    return dirtyLeaves !== null && dirtyLeaves.has(this.__key);
  }

  /**
   * Returns the latest version of the node from the active EditorState.
   * This is used to avoid getting values from stale node references.
   *
   */
  getLatest() {
    const latest = $getNodeByKey(this.__key);
    if (latest === null) {
      {
        throw Error(`Lexical node does not exist in active editor state. Avoid using the same node references between nested closures from editorState.read/editor.update.`);
      }
    }
    return latest;
  }

  /**
   * Returns a mutable version of the node. Will throw an error if
   * called outside of a Lexical Editor {@link LexicalEditor.update} callback.
   *
   */
  getWritable() {
    errorOnReadOnly();
    const editorState = getActiveEditorState();
    const editor = getActiveEditor();
    const nodeMap = editorState._nodeMap;
    const key = this.__key;
    // Ensure we get the latest node from pending state
    const latestNode = this.getLatest();
    const parent = latestNode.__parent;
    const cloneNotNeeded = editor._cloneNotNeeded;
    const selection = $getSelection();
    if (selection !== null) {
      selection._cachedNodes = null;
    }
    if (cloneNotNeeded.has(key)) {
      // Transforms clear the dirty node set on each iteration to keep track on newly dirty nodes
      internalMarkNodeAsDirty(latestNode);
      return latestNode;
    }
    const constructor = latestNode.constructor;
    // @ts-expect-error
    const mutableNode = constructor.clone(latestNode);
    mutableNode.__parent = parent;
    mutableNode.__next = latestNode.__next;
    mutableNode.__prev = latestNode.__prev;
    if ($isElementNode(latestNode) && $isElementNode(mutableNode)) {
      mutableNode.__first = latestNode.__first;
      mutableNode.__last = latestNode.__last;
      mutableNode.__size = latestNode.__size;
      mutableNode.__indent = latestNode.__indent;
      mutableNode.__format = latestNode.__format;
      mutableNode.__dir = latestNode.__dir;
    } else if ($isTextNode(latestNode) && $isTextNode(mutableNode)) {
      mutableNode.__format = latestNode.__format;
      mutableNode.__style = latestNode.__style;
      mutableNode.__mode = latestNode.__mode;
      mutableNode.__detail = latestNode.__detail;
    }
    cloneNotNeeded.add(key);
    mutableNode.__key = key;
    internalMarkNodeAsDirty(mutableNode);
    // Update reference in node map
    nodeMap.set(key, mutableNode);
    return mutableNode;
  }

  /**
   * Returns the text content of the node. Override this for
   * custom nodes that should have a representation in plain text
   * format (for copy + paste, for example)
   *
   */
  getTextContent() {
    return '';
  }

  /**
   * Returns the length of the string produced by calling getTextContent on this node.
   *
   */
  getTextContentSize() {
    return this.getTextContent().length;
  }

  // View

  /**
   * Called during the reconciliation process to determine which nodes
   * to insert into the DOM for this Lexical Node.
   *
   * This method must return exactly one HTMLElement. Nested elements are not supported.
   *
   * Do not attempt to update the Lexical EditorState during this phase of the update lifecyle.
   *
   * @param _config - allows access to things like the EditorTheme (to apply classes) during reconciliation.
   * @param _editor - allows access to the editor for context during reconciliation.
   *
   * */
  createDOM(_config, _editor) {
    {
      throw Error(`createDOM: base method not extended`);
    }
  }

  /**
   * Called when a node changes and should update the DOM
   * in whatever way is necessary to make it align with any changes that might
   * have happened during the update.
   *
   * Returning "true" here will cause lexical to unmount and recreate the DOM node
   * (by calling createDOM). You would need to do this if the element tag changes,
   * for instance.
   *
   * */
  updateDOM(_prevNode, _dom, _config) {
    {
      throw Error(`updateDOM: base method not extended`);
    }
  }

  /**
   * Controls how the this node is serialized to HTML. This is important for
   * copy and paste between Lexical and non-Lexical editors, or Lexical editors with different namespaces,
   * in which case the primary transfer format is HTML. It's also important if you're serializing
   * to HTML for any other reason via {@link @lexical/html!$generateHtmlFromNodes}. You could
   * also use this method to build your own HTML renderer.
   *
   * */
  exportDOM(editor) {
    const element = this.createDOM(editor._config, editor);
    return {
      element
    };
  }

  /**
   * Controls how the this node is serialized to JSON. This is important for
   * copy and paste between Lexical editors sharing the same namespace. It's also important
   * if you're serializing to JSON for persistent storage somewhere.
   * See [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html).
   *
   * */
  exportJSON() {
    {
      throw Error(`exportJSON: base method not extended`);
    }
  }

  /**
   * Controls how the this node is deserialized from JSON. This is usually boilerplate,
   * but provides an abstraction between the node implementation and serialized interface that can
   * be important if you ever make breaking changes to a node schema (by adding or removing properties).
   * See [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html).
   *
   * */
  static importJSON(_serializedNode) {
    {
      throw Error(`LexicalNode: Node ${this.name} does not implement .importJSON().`);
    }
  }
  /**
   * @experimental
   *
   * Registers the returned function as a transform on the node during
   * Editor initialization. Most such use cases should be addressed via
   * the {@link LexicalEditor.registerNodeTransform} API.
   *
   * Experimental - use at your own risk.
   */
  static transform() {
    return null;
  }

  // Setters and mutators

  /**
   * Removes this LexicalNode from the EditorState. If the node isn't re-inserted
   * somewhere, the Lexical garbage collector will eventually clean it up.
   *
   * @param preserveEmptyParent - If falsy, the node's parent will be removed if
   * it's empty after the removal operation. This is the default behavior, subject to
   * other node heuristics such as {@link ElementNode#canBeEmpty}
   * */
  remove(preserveEmptyParent) {
    removeNode(this, true, preserveEmptyParent);
  }

  /**
   * Replaces this LexicalNode with the provided node, optionally transferring the children
   * of the replaced node to the replacing node.
   *
   * @param replaceWith - The node to replace this one with.
   * @param includeChildren - Whether or not to transfer the children of this node to the replacing node.
   * */
  replace(replaceWith, includeChildren) {
    errorOnReadOnly();
    let selection = $getSelection();
    if (selection !== null) selection = selection.clone();
    errorOnInsertTextNodeOnRoot(this, replaceWith);
    const self = this.getLatest();
    const toReplaceKey = this.__key;
    const key = replaceWith.__key;
    const writableReplaceWith = replaceWith.getWritable();
    const writableParent = this.getParentOrThrow().getWritable();
    const size = writableParent.__size;
    removeFromParent(writableReplaceWith);
    const prevSibling = self.getPreviousSibling();
    const nextSibling = self.getNextSibling();
    const prevKey = self.__prev;
    const nextKey = self.__next;
    const parentKey = self.__parent;
    removeNode(self, false, true);
    if (prevSibling === null) {
      writableParent.__first = key;
    } else {
      const writablePrevSibling = prevSibling.getWritable();
      writablePrevSibling.__next = key;
    }
    writableReplaceWith.__prev = prevKey;
    if (nextSibling === null) {
      writableParent.__last = key;
    } else {
      const writableNextSibling = nextSibling.getWritable();
      writableNextSibling.__prev = key;
    }
    writableReplaceWith.__next = nextKey;
    writableReplaceWith.__parent = parentKey;
    writableParent.__size = size;
    if (includeChildren) {
      this.getChildren().forEach(child => {
        writableReplaceWith.append(child);
      });
    }
    if ($isRangeSelection(selection)) {
      $setSelection(selection);
      const anchor = selection.anchor;
      const focus = selection.focus;
      if (anchor.key === toReplaceKey) {
        $moveSelectionPointToEnd(anchor, writableReplaceWith);
      }
      if (focus.key === toReplaceKey) {
        $moveSelectionPointToEnd(focus, writableReplaceWith);
      }
    }
    if ($getCompositionKey() === toReplaceKey) {
      $setCompositionKey(key);
    }
    return writableReplaceWith;
  }

  /**
   * Inserts a node after this LexicalNode (as the next sibling).
   *
   * @param nodeToInsert - The node to insert after this one.
   * @param restoreSelection - Whether or not to attempt to resolve the
   * selection to the appropriate place after the operation is complete.
   * */
  insertAfter(nodeToInsert, restoreSelection = true) {
    errorOnReadOnly();
    errorOnInsertTextNodeOnRoot(this, nodeToInsert);
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    const oldParent = writableNodeToInsert.getParent();
    const selection = $getSelection();
    let elementAnchorSelectionOnNode = false;
    let elementFocusSelectionOnNode = false;
    if (oldParent !== null) {
      // TODO: this is O(n), can we improve?
      const oldIndex = nodeToInsert.getIndexWithinParent();
      removeFromParent(writableNodeToInsert);
      if ($isRangeSelection(selection)) {
        const oldParentKey = oldParent.__key;
        const anchor = selection.anchor;
        const focus = selection.focus;
        elementAnchorSelectionOnNode = anchor.type === 'element' && anchor.key === oldParentKey && anchor.offset === oldIndex + 1;
        elementFocusSelectionOnNode = focus.type === 'element' && focus.key === oldParentKey && focus.offset === oldIndex + 1;
      }
    }
    const nextSibling = this.getNextSibling();
    const writableParent = this.getParentOrThrow().getWritable();
    const insertKey = writableNodeToInsert.__key;
    const nextKey = writableSelf.__next;
    if (nextSibling === null) {
      writableParent.__last = insertKey;
    } else {
      const writableNextSibling = nextSibling.getWritable();
      writableNextSibling.__prev = insertKey;
    }
    writableParent.__size++;
    writableSelf.__next = insertKey;
    writableNodeToInsert.__next = nextKey;
    writableNodeToInsert.__prev = writableSelf.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    if (restoreSelection && $isRangeSelection(selection)) {
      const index = this.getIndexWithinParent();
      $updateElementSelectionOnCreateDeleteNode(selection, writableParent, index + 1);
      const writableParentKey = writableParent.__key;
      if (elementAnchorSelectionOnNode) {
        selection.anchor.set(writableParentKey, index + 2, 'element');
      }
      if (elementFocusSelectionOnNode) {
        selection.focus.set(writableParentKey, index + 2, 'element');
      }
    }
    return nodeToInsert;
  }

  /**
   * Inserts a node before this LexicalNode (as the previous sibling).
   *
   * @param nodeToInsert - The node to insert after this one.
   * @param restoreSelection - Whether or not to attempt to resolve the
   * selection to the appropriate place after the operation is complete.
   * */
  insertBefore(nodeToInsert, restoreSelection = true) {
    errorOnReadOnly();
    errorOnInsertTextNodeOnRoot(this, nodeToInsert);
    const writableSelf = this.getWritable();
    const writableNodeToInsert = nodeToInsert.getWritable();
    const insertKey = writableNodeToInsert.__key;
    removeFromParent(writableNodeToInsert);
    const prevSibling = this.getPreviousSibling();
    const writableParent = this.getParentOrThrow().getWritable();
    const prevKey = writableSelf.__prev;
    // TODO: this is O(n), can we improve?
    const index = this.getIndexWithinParent();
    if (prevSibling === null) {
      writableParent.__first = insertKey;
    } else {
      const writablePrevSibling = prevSibling.getWritable();
      writablePrevSibling.__next = insertKey;
    }
    writableParent.__size++;
    writableSelf.__prev = insertKey;
    writableNodeToInsert.__prev = prevKey;
    writableNodeToInsert.__next = writableSelf.__key;
    writableNodeToInsert.__parent = writableSelf.__parent;
    const selection = $getSelection();
    if (restoreSelection && $isRangeSelection(selection)) {
      const parent = this.getParentOrThrow();
      $updateElementSelectionOnCreateDeleteNode(selection, parent, index);
    }
    return nodeToInsert;
  }

  /**
   * Whether or not this node has a required parent. Used during copy + paste operations
   * to normalize nodes that would otherwise be orphaned. For example, ListItemNodes without
   * a ListNode parent or TextNodes with a ParagraphNode parent.
   *
   * */
  isParentRequired() {
    return false;
  }

  /**
   * The creation logic for any required parent. Should be implemented if {@link isParentRequired} returns true.
   *
   * */
  createParentElementNode() {
    return $createParagraphNode();
  }

  /**
   * Moves selection to the previous sibling of this node, at the specified offsets.
   *
   * @param anchorOffset - The anchor offset for selection.
   * @param focusOffset -  The focus offset for selection
   * */
  selectPrevious(anchorOffset, focusOffset) {
    errorOnReadOnly();
    const prevSibling = this.getPreviousSibling();
    const parent = this.getParentOrThrow();
    if (prevSibling === null) {
      return parent.select(0, 0);
    }
    if ($isElementNode(prevSibling)) {
      return prevSibling.select();
    } else if (!$isTextNode(prevSibling)) {
      const index = prevSibling.getIndexWithinParent() + 1;
      return parent.select(index, index);
    }
    return prevSibling.select(anchorOffset, focusOffset);
  }

  /**
   * Moves selection to the next sibling of this node, at the specified offsets.
   *
   * @param anchorOffset - The anchor offset for selection.
   * @param focusOffset -  The focus offset for selection
   * */
  selectNext(anchorOffset, focusOffset) {
    errorOnReadOnly();
    const nextSibling = this.getNextSibling();
    const parent = this.getParentOrThrow();
    if (nextSibling === null) {
      return parent.select();
    }
    if ($isElementNode(nextSibling)) {
      return nextSibling.select(0, 0);
    } else if (!$isTextNode(nextSibling)) {
      const index = nextSibling.getIndexWithinParent();
      return parent.select(index, index);
    }
    return nextSibling.select(anchorOffset, focusOffset);
  }

  /**
   * Marks a node dirty, triggering transforms and
   * forcing it to be reconciled during the update cycle.
   *
   * */
  markDirty() {
    this.getWritable();
  }
}
function errorOnTypeKlassMismatch(type, klass) {
  const registeredNode = getActiveEditor()._nodes.get(type);
  // Common error - split in its own invariant
  if (registeredNode === undefined) {
    {
      throw Error(`Create node: Attempted to create node ${klass.name} that was not configured to be used on the editor.`);
    }
  }
  const editorKlass = registeredNode.klass;
  if (editorKlass !== klass) {
    {
      throw Error(`Create node: Type ${type} in node ${klass.name} does not match registered node ${editorKlass.name} with the same type`);
    }
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class LineBreakNode extends LexicalNode {
  static getType() {
    return 'linebreak';
  }
  static clone(node) {
    return new LineBreakNode(node.__key);
  }
  constructor(key) {
    super(key);
  }
  getTextContent() {
    return '\n';
  }
  createDOM() {
    return document.createElement('br');
  }
  updateDOM() {
    return false;
  }
  static importDOM() {
    return {
      br: node => {
        const parentElement = node.parentElement;
        // If the <br> is the only child, then skip including it
        let firstChild;
        let lastChild;
        if (parentElement !== null && ((firstChild = parentElement.firstChild) === node || firstChild.nextSibling === node && firstChild.nodeType === DOM_TEXT_TYPE && (firstChild.textContent || '').match(/^( |\t|\r?\n)+$/) !== null) && ((lastChild = parentElement.lastChild) === node || lastChild.previousSibling === node && lastChild.nodeType === DOM_TEXT_TYPE && (lastChild.textContent || '').match(/^( |\t|\r?\n)+$/) !== null)) {
          return null;
        }
        return {
          conversion: convertLineBreakElement,
          priority: 0
        };
      }
    };
  }
  static importJSON(serializedLineBreakNode) {
    return $createLineBreakNode();
  }
  exportJSON() {
    return {
      type: 'linebreak',
      version: 1
    };
  }
}
function convertLineBreakElement(node) {
  return {
    node: $createLineBreakNode()
  };
}
function $createLineBreakNode() {
  return $applyNodeReplacement(new LineBreakNode());
}
function $isLineBreakNode(node) {
  return node instanceof LineBreakNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function getElementOuterTag(node, format) {
  if (format & IS_CODE) {
    return 'code';
  }
  if (format & IS_HIGHLIGHT) {
    return 'mark';
  }
  if (format & IS_SUBSCRIPT) {
    return 'sub';
  }
  if (format & IS_SUPERSCRIPT) {
    return 'sup';
  }
  return null;
}
function getElementInnerTag(node, format) {
  if (format & IS_BOLD) {
    return 'strong';
  }
  if (format & IS_ITALIC) {
    return 'em';
  }
  return 'span';
}
function setTextThemeClassNames(tag, prevFormat, nextFormat, dom, textClassNames) {
  const domClassList = dom.classList;
  // Firstly we handle the base theme.
  let classNames = getCachedClassNameArray(textClassNames, 'base');
  if (classNames !== undefined) {
    domClassList.add(...classNames);
  }
  // Secondly we handle the special case: underline + strikethrough.
  // We have to do this as we need a way to compose the fact that
  // the same CSS property will need to be used: text-decoration.
  // In an ideal world we shouldn't have to do this, but there's no
  // easy workaround for many atomic CSS systems today.
  classNames = getCachedClassNameArray(textClassNames, 'underlineStrikethrough');
  let hasUnderlineStrikethrough = false;
  const prevUnderlineStrikethrough = prevFormat & IS_UNDERLINE && prevFormat & IS_STRIKETHROUGH;
  const nextUnderlineStrikethrough = nextFormat & IS_UNDERLINE && nextFormat & IS_STRIKETHROUGH;
  if (classNames !== undefined) {
    if (nextUnderlineStrikethrough) {
      hasUnderlineStrikethrough = true;
      if (!prevUnderlineStrikethrough) {
        domClassList.add(...classNames);
      }
    } else if (prevUnderlineStrikethrough) {
      domClassList.remove(...classNames);
    }
  }
  for (const key in TEXT_TYPE_TO_FORMAT) {
    const format = key;
    const flag = TEXT_TYPE_TO_FORMAT[format];
    classNames = getCachedClassNameArray(textClassNames, key);
    if (classNames !== undefined) {
      if (nextFormat & flag) {
        if (hasUnderlineStrikethrough && (key === 'underline' || key === 'strikethrough')) {
          if (prevFormat & flag) {
            domClassList.remove(...classNames);
          }
          continue;
        }
        if ((prevFormat & flag) === 0 || prevUnderlineStrikethrough && key === 'underline' || key === 'strikethrough') {
          domClassList.add(...classNames);
        }
      } else if (prevFormat & flag) {
        domClassList.remove(...classNames);
      }
    }
  }
}
function diffComposedText(a, b) {
  const aLength = a.length;
  const bLength = b.length;
  let left = 0;
  let right = 0;
  while (left < aLength && left < bLength && a[left] === b[left]) {
    left++;
  }
  while (right + left < aLength && right + left < bLength && a[aLength - right - 1] === b[bLength - right - 1]) {
    right++;
  }
  return [left, aLength - left - right, b.slice(left, bLength - right)];
}
function setTextContent(nextText, dom, node) {
  const firstChild = dom.firstChild;
  const isComposing = node.isComposing();
  // Always add a suffix if we're composing a node
  const suffix = isComposing ? COMPOSITION_SUFFIX : '';
  const text = nextText + suffix;
  if (firstChild == null) {
    dom.textContent = text;
  } else {
    const nodeValue = firstChild.nodeValue;
    if (nodeValue !== text) {
      if (isComposing || IS_FIREFOX) {
        // We also use the diff composed text for general text in FF to avoid
        // the spellcheck red line from flickering.
        const [index, remove, insert] = diffComposedText(nodeValue, text);
        if (remove !== 0) {
          // @ts-expect-error
          firstChild.deleteData(index, remove);
        }
        // @ts-expect-error
        firstChild.insertData(index, insert);
      } else {
        firstChild.nodeValue = text;
      }
    }
  }
}
function createTextInnerDOM(innerDOM, node, innerTag, format, text, config) {
  setTextContent(text, innerDOM, node);
  const theme = config.theme;
  // Apply theme class names
  const textClassNames = theme.text;
  if (textClassNames !== undefined) {
    setTextThemeClassNames(innerTag, 0, format, innerDOM, textClassNames);
  }
}
function wrapElementWith(element, tag) {
  const el = document.createElement(tag);
  el.appendChild(element);
  return el;
}

/** @noInheritDoc */
class TextNode extends LexicalNode {
  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  static getType() {
    return 'text';
  }
  static clone(node) {
    return new TextNode(node.__text, node.__key);
  }
  constructor(text, key) {
    super(key);
    this.__text = text;
    this.__format = 0;
    this.__style = '';
    this.__mode = 0;
    this.__detail = 0;
  }

  /**
   * Returns a 32-bit integer that represents the TextFormatTypes currently applied to the
   * TextNode. You probably don't want to use this method directly - consider using TextNode.hasFormat instead.
   *
   * @returns a number representing the format of the text node.
   */
  getFormat() {
    const self = this.getLatest();
    return self.__format;
  }

  /**
   * Returns a 32-bit integer that represents the TextDetailTypes currently applied to the
   * TextNode. You probably don't want to use this method directly - consider using TextNode.isDirectionless
   * or TextNode.isUnmergeable instead.
   *
   * @returns a number representing the detail of the text node.
   */
  getDetail() {
    const self = this.getLatest();
    return self.__detail;
  }

  /**
   * Returns the mode (TextModeType) of the TextNode, which may be "normal", "token", or "segmented"
   *
   * @returns TextModeType.
   */
  getMode() {
    const self = this.getLatest();
    return TEXT_TYPE_TO_MODE[self.__mode];
  }

  /**
   * Returns the styles currently applied to the node. This is analogous to CSSText in the DOM.
   *
   * @returns CSSText-like string of styles applied to the underlying DOM node.
   */
  getStyle() {
    const self = this.getLatest();
    return self.__style;
  }

  /**
   * Returns whether or not the node is in "token" mode. TextNodes in token mode can be navigated through character-by-character
   * with a RangeSelection, but are deleted as a single entity (not invdividually by character).
   *
   * @returns true if the node is in token mode, false otherwise.
   */
  isToken() {
    const self = this.getLatest();
    return self.__mode === IS_TOKEN;
  }

  /**
   *
   * @returns true if Lexical detects that an IME or other 3rd-party script is attempting to
   * mutate the TextNode, false otherwise.
   */
  isComposing() {
    return this.__key === $getCompositionKey();
  }

  /**
   * Returns whether or not the node is in "segemented" mode. TextNodes in segemented mode can be navigated through character-by-character
   * with a RangeSelection, but are deleted in space-delimited "segments".
   *
   * @returns true if the node is in segmented mode, false otherwise.
   */
  isSegmented() {
    const self = this.getLatest();
    return self.__mode === IS_SEGMENTED;
  }
  /**
   * Returns whether or not the node is "directionless". Directionless nodes don't respect changes between RTL and LTR modes.
   *
   * @returns true if the node is directionless, false otherwise.
   */
  isDirectionless() {
    const self = this.getLatest();
    return (self.__detail & IS_DIRECTIONLESS) !== 0;
  }
  /**
   * Returns whether or not the node is unmergeable. In some scenarios, Lexical tries to merge
   * adjacent TextNodes into a single TextNode. If a TextNode is unmergeable, this won't happen.
   *
   * @returns true if the node is unmergeable, false otherwise.
   */
  isUnmergeable() {
    const self = this.getLatest();
    return (self.__detail & IS_UNMERGEABLE) !== 0;
  }

  /**
   * Returns whether or not the node has the provided format applied. Use this with the human-readable TextFormatType
   * string values to get the format of a TextNode.
   *
   * @param type - the TextFormatType to check for.
   *
   * @returns true if the node has the provided format, false otherwise.
   */
  hasFormat(type) {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getFormat() & formatFlag) !== 0;
  }

  /**
   * Returns whether or not the node is simple text. Simple text is defined as a TextNode that has the string type "text"
   * (i.e., not a subclass) and has no mode applied to it (i.e., not segmented or token).
   *
   * @returns true if the node is simple text, false otherwise.
   */
  isSimpleText() {
    return this.__type === 'text' && this.__mode === 0;
  }

  /**
   * Returns the text content of the node as a string.
   *
   * @returns a string representing the text content of the node.
   */
  getTextContent() {
    const self = this.getLatest();
    return self.__text;
  }

  /**
   * Returns the format flags applied to the node as a 32-bit integer.
   *
   * @returns a number representing the TextFormatTypes applied to the node.
   */
  getFormatFlags(type, alignWithFormat) {
    const self = this.getLatest();
    const format = self.__format;
    return toggleTextFormatType(format, type, alignWithFormat);
  }

  // View

  createDOM(config) {
    const format = this.__format;
    const outerTag = getElementOuterTag(this, format);
    const innerTag = getElementInnerTag(this, format);
    const tag = outerTag === null ? innerTag : outerTag;
    const dom = document.createElement(tag);
    let innerDOM = dom;
    if (this.hasFormat('code')) {
      dom.setAttribute('spellcheck', 'false');
    }
    if (outerTag !== null) {
      innerDOM = document.createElement(innerTag);
      dom.appendChild(innerDOM);
    }
    const text = this.__text;
    createTextInnerDOM(innerDOM, this, innerTag, format, text, config);
    const style = this.__style;
    if (style !== '') {
      dom.style.cssText = style;
    }
    return dom;
  }
  updateDOM(prevNode, dom, config) {
    const nextText = this.__text;
    const prevFormat = prevNode.__format;
    const nextFormat = this.__format;
    const prevOuterTag = getElementOuterTag(this, prevFormat);
    const nextOuterTag = getElementOuterTag(this, nextFormat);
    const prevInnerTag = getElementInnerTag(this, prevFormat);
    const nextInnerTag = getElementInnerTag(this, nextFormat);
    const prevTag = prevOuterTag === null ? prevInnerTag : prevOuterTag;
    const nextTag = nextOuterTag === null ? nextInnerTag : nextOuterTag;
    if (prevTag !== nextTag) {
      return true;
    }
    if (prevOuterTag === nextOuterTag && prevInnerTag !== nextInnerTag) {
      // should always be an element
      const prevInnerDOM = dom.firstChild;
      if (prevInnerDOM == null) {
        {
          throw Error(`updateDOM: prevInnerDOM is null or undefined`);
        }
      }
      const nextInnerDOM = document.createElement(nextInnerTag);
      createTextInnerDOM(nextInnerDOM, this, nextInnerTag, nextFormat, nextText, config);
      dom.replaceChild(nextInnerDOM, prevInnerDOM);
      return false;
    }
    let innerDOM = dom;
    if (nextOuterTag !== null) {
      if (prevOuterTag !== null) {
        innerDOM = dom.firstChild;
        if (innerDOM == null) {
          {
            throw Error(`updateDOM: innerDOM is null or undefined`);
          }
        }
      }
    }
    setTextContent(nextText, innerDOM, this);
    const theme = config.theme;
    // Apply theme class names
    const textClassNames = theme.text;
    if (textClassNames !== undefined && prevFormat !== nextFormat) {
      setTextThemeClassNames(nextInnerTag, prevFormat, nextFormat, innerDOM, textClassNames);
    }
    const prevStyle = prevNode.__style;
    const nextStyle = this.__style;
    if (prevStyle !== nextStyle) {
      dom.style.cssText = nextStyle;
    }
    return false;
  }
  static importDOM() {
    return {
      '#text': () => ({
        conversion: convertTextDOMNode,
        priority: 0
      }),
      b: () => ({
        conversion: convertBringAttentionToElement,
        priority: 0
      }),
      code: () => ({
        conversion: convertTextFormatElement,
        priority: 0
      }),
      em: () => ({
        conversion: convertTextFormatElement,
        priority: 0
      }),
      i: () => ({
        conversion: convertTextFormatElement,
        priority: 0
      }),
      s: () => ({
        conversion: convertTextFormatElement,
        priority: 0
      }),
      span: () => ({
        conversion: convertSpanElement,
        priority: 0
      }),
      strong: () => ({
        conversion: convertTextFormatElement,
        priority: 0
      }),
      sub: () => ({
        conversion: convertTextFormatElement,
        priority: 0
      }),
      sup: () => ({
        conversion: convertTextFormatElement,
        priority: 0
      }),
      u: () => ({
        conversion: convertTextFormatElement,
        priority: 0
      })
    };
  }
  static importJSON(serializedNode) {
    const node = $createTextNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  // This improves Lexical's basic text output in copy+paste plus
  // for headless mode where people might use Lexical to generate
  // HTML content and not have the ability to use CSS classes.
  exportDOM(editor) {
    let {
      element
    } = super.exportDOM(editor);

    // This is the only way to properly add support for most clients,
    // even if it's semantically incorrect to have to resort to using
    // <b>, <u>, <s>, <i> elements.
    if (element !== null) {
      if (this.hasFormat('bold')) {
        element = wrapElementWith(element, 'b');
      }
      if (this.hasFormat('italic')) {
        element = wrapElementWith(element, 'i');
      }
      if (this.hasFormat('strikethrough')) {
        element = wrapElementWith(element, 's');
      }
      if (this.hasFormat('underline')) {
        element = wrapElementWith(element, 'u');
      }
    }
    return {
      element
    };
  }
  exportJSON() {
    return {
      detail: this.getDetail(),
      format: this.getFormat(),
      mode: this.getMode(),
      style: this.getStyle(),
      text: this.getTextContent(),
      type: 'text',
      version: 1
    };
  }

  // Mutators
  selectionTransform(prevSelection, nextSelection) {
    return;
  }

  /**
   * Sets the node format to the provided TextFormatType or 32-bit integer. Note that the TextFormatType
   * version of the argument can only specify one format and doing so will remove all other formats that
   * may be applied to the node. For toggling behavior, consider using {@link TextNode.toggleFormat}
   *
   * @param format - TextFormatType or 32-bit integer representing the node format.
   *
   * @returns this TextNode.
   * // TODO 0.12 This should just be a `string`.
   */
  setFormat(format) {
    const self = this.getWritable();
    self.__format = typeof format === 'string' ? TEXT_TYPE_TO_FORMAT[format] : format;
    return self;
  }

  /**
   * Sets the node detail to the provided TextDetailType or 32-bit integer. Note that the TextDetailType
   * version of the argument can only specify one detail value and doing so will remove all other detail values that
   * may be applied to the node. For toggling behavior, consider using {@link TextNode.toggleDirectionless}
   * or {@link TextNode.togglerUnmergeable}
   *
   * @param detail - TextDetailType or 32-bit integer representing the node detail.
   *
   * @returns this TextNode.
   * // TODO 0.12 This should just be a `string`.
   */
  setDetail(detail) {
    const self = this.getWritable();
    self.__detail = typeof detail === 'string' ? DETAIL_TYPE_TO_DETAIL[detail] : detail;
    return self;
  }

  /**
   * Sets the node style to the provided CSSText-like string. Set this property as you
   * would an HTMLElement style attribute to apply inline styles to the underlying DOM Element.
   *
   * @param style - CSSText to be applied to the underlying HTMLElement.
   *
   * @returns this TextNode.
   */
  setStyle(style) {
    const self = this.getWritable();
    self.__style = style;
    return self;
  }

  /**
   * Applies the provided format to this TextNode if it's not present. Removes it if it is present.
   * Prefer using this method to turn specific formats on and off.
   *
   * @param type - TextFormatType to toggle.
   *
   * @returns this TextNode.
   */
  toggleFormat(type) {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return this.setFormat(this.getFormat() ^ formatFlag);
  }

  /**
   * Toggles the directionless detail value of the node. Prefer using this method over setDetail.
   *
   * @returns this TextNode.
   */
  toggleDirectionless() {
    const self = this.getWritable();
    self.__detail ^= IS_DIRECTIONLESS;
    return self;
  }

  /**
   * Toggles the unmergeable detail value of the node. Prefer using this method over setDetail.
   *
   * @returns this TextNode.
   */
  toggleUnmergeable() {
    const self = this.getWritable();
    self.__detail ^= IS_UNMERGEABLE;
    return self;
  }

  /**
   * Sets the mode of the node.
   *
   * @returns this TextNode.
   */
  setMode(type) {
    const mode = TEXT_MODE_TO_TYPE[type];
    if (this.__mode === mode) {
      return this;
    }
    const self = this.getWritable();
    self.__mode = mode;
    return self;
  }

  /**
   * Sets the text content of the node.
   *
   * @param text - the string to set as the text value of the node.
   *
   * @returns this TextNode.
   */
  setTextContent(text) {
    if (this.__text === text) {
      return this;
    }
    const self = this.getWritable();
    self.__text = text;
    return self;
  }

  /**
   * Sets the current Lexical selection to be a RangeSelection with anchor and focus on this TextNode at the provided offsets.
   *
   * @param _anchorOffset - the offset at which the Selection anchor will be placed.
   * @param _focusOffset - the offset at which the Selection focus will be placed.
   *
   * @returns the new RangeSelection.
   */
  select(_anchorOffset, _focusOffset) {
    errorOnReadOnly();
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const selection = $getSelection();
    const text = this.getTextContent();
    const key = this.__key;
    if (typeof text === 'string') {
      const lastOffset = text.length;
      if (anchorOffset === undefined) {
        anchorOffset = lastOffset;
      }
      if (focusOffset === undefined) {
        focusOffset = lastOffset;
      }
    } else {
      anchorOffset = 0;
      focusOffset = 0;
    }
    if (!$isRangeSelection(selection)) {
      return internalMakeRangeSelection(key, anchorOffset, key, focusOffset, 'text', 'text');
    } else {
      const compositionKey = $getCompositionKey();
      if (compositionKey === selection.anchor.key || compositionKey === selection.focus.key) {
        $setCompositionKey(key);
      }
      selection.setTextNodeRange(this, anchorOffset, this, focusOffset);
    }
    return selection;
  }

  /**
   * Inserts the provided text into this TextNode at the provided offset, deleting the number of characters
   * specified. Can optionally calculate a new selection after the operation is complete.
   *
   * @param offset - the offset at which the splice operation should begin.
   * @param delCount - the number of characters to delete, starting from the offset.
   * @param newText - the text to insert into the TextNode at the offset.
   * @param moveSelection - optional, whether or not to move selection to the end of the inserted substring.
   *
   * @returns this TextNode.
   */
  spliceText(offset, delCount, newText, moveSelection) {
    const writableSelf = this.getWritable();
    const text = writableSelf.__text;
    const handledTextLength = newText.length;
    let index = offset;
    if (index < 0) {
      index = handledTextLength + index;
      if (index < 0) {
        index = 0;
      }
    }
    const selection = $getSelection();
    if (moveSelection && $isRangeSelection(selection)) {
      const newOffset = offset + handledTextLength;
      selection.setTextNodeRange(writableSelf, newOffset, writableSelf, newOffset);
    }
    const updatedText = text.slice(0, index) + newText + text.slice(index + delCount);
    writableSelf.__text = updatedText;
    return writableSelf;
  }

  /**
   * This method is meant to be overriden by TextNode subclasses to control the behavior of those nodes
   * when a user event would cause text to be inserted before them in the editor. If true, Lexical will attempt
   * to insert text into this node. If false, it will insert the text in a new sibling node.
   *
   * @returns true if text can be inserted before the node, false otherwise.
   */
  canInsertTextBefore() {
    return true;
  }

  /**
   * This method is meant to be overriden by TextNode subclasses to control the behavior of those nodes
   * when a user event would cause text to be inserted after them in the editor. If true, Lexical will attempt
   * to insert text into this node. If false, it will insert the text in a new sibling node.
   *
   * @returns true if text can be inserted after the node, false otherwise.
   */
  canInsertTextAfter() {
    return true;
  }

  /**
   * Splits this TextNode at the provided character offsets, forming new TextNodes from the substrings
   * formed by the split, and inserting those new TextNodes into the editor, replacing the one that was split.
   *
   * @param splitOffsets - rest param of the text content character offsets at which this node should be split.
   *
   * @returns an Array containing the newly-created TextNodes.
   */
  splitText(...splitOffsets) {
    errorOnReadOnly();
    const self = this.getLatest();
    const textContent = self.getTextContent();
    const key = self.__key;
    const compositionKey = $getCompositionKey();
    const offsetsSet = new Set(splitOffsets);
    const parts = [];
    const textLength = textContent.length;
    let string = '';
    for (let i = 0; i < textLength; i++) {
      if (string !== '' && offsetsSet.has(i)) {
        parts.push(string);
        string = '';
      }
      string += textContent[i];
    }
    if (string !== '') {
      parts.push(string);
    }
    const partsLength = parts.length;
    if (partsLength === 0) {
      return [];
    } else if (parts[0] === textContent) {
      return [self];
    }
    const firstPart = parts[0];
    const parent = self.getParentOrThrow();
    let writableNode;
    const format = self.getFormat();
    const style = self.getStyle();
    const detail = self.__detail;
    let hasReplacedSelf = false;
    if (self.isSegmented()) {
      // Create a new TextNode
      writableNode = $createTextNode(firstPart);
      writableNode.__format = format;
      writableNode.__style = style;
      writableNode.__detail = detail;
      hasReplacedSelf = true;
    } else {
      // For the first part, update the existing node
      writableNode = self.getWritable();
      writableNode.__text = firstPart;
    }

    // Handle selection
    const selection = $getSelection();

    // Then handle all other parts
    const splitNodes = [writableNode];
    let textSize = firstPart.length;
    for (let i = 1; i < partsLength; i++) {
      const part = parts[i];
      const partSize = part.length;
      const sibling = $createTextNode(part).getWritable();
      sibling.__format = format;
      sibling.__style = style;
      sibling.__detail = detail;
      const siblingKey = sibling.__key;
      const nextTextSize = textSize + partSize;
      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        if (anchor.key === key && anchor.type === 'text' && anchor.offset > textSize && anchor.offset <= nextTextSize) {
          anchor.key = siblingKey;
          anchor.offset -= textSize;
          selection.dirty = true;
        }
        if (focus.key === key && focus.type === 'text' && focus.offset > textSize && focus.offset <= nextTextSize) {
          focus.key = siblingKey;
          focus.offset -= textSize;
          selection.dirty = true;
        }
      }
      if (compositionKey === key) {
        $setCompositionKey(siblingKey);
      }
      textSize = nextTextSize;
      splitNodes.push(sibling);
    }

    // Insert the nodes into the parent's children
    internalMarkSiblingsAsDirty(this);
    const writableParent = parent.getWritable();
    const insertionIndex = this.getIndexWithinParent();
    if (hasReplacedSelf) {
      writableParent.splice(insertionIndex, 0, splitNodes);
      this.remove();
    } else {
      writableParent.splice(insertionIndex, 1, splitNodes);
    }
    if ($isRangeSelection(selection)) {
      $updateElementSelectionOnCreateDeleteNode(selection, parent, insertionIndex, partsLength - 1);
    }
    return splitNodes;
  }

  /**
   * Merges the target TextNode into this TextNode, removing the target node.
   *
   * @param target - the TextNode to merge into this one.
   *
   * @returns this TextNode.
   */
  mergeWithSibling(target) {
    const isBefore = target === this.getPreviousSibling();
    if (!isBefore && target !== this.getNextSibling()) {
      {
        throw Error(`mergeWithSibling: sibling must be a previous or next sibling`);
      }
    }
    const key = this.__key;
    const targetKey = target.__key;
    const text = this.__text;
    const textLength = text.length;
    const compositionKey = $getCompositionKey();
    if (compositionKey === targetKey) {
      $setCompositionKey(key);
    }
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const focus = selection.focus;
      if (anchor !== null && anchor.key === targetKey) {
        adjustPointOffsetForMergedSibling(anchor, isBefore, key, target, textLength);
        selection.dirty = true;
      }
      if (focus !== null && focus.key === targetKey) {
        adjustPointOffsetForMergedSibling(focus, isBefore, key, target, textLength);
        selection.dirty = true;
      }
    }
    const targetText = target.__text;
    const newText = isBefore ? targetText + text : text + targetText;
    this.setTextContent(newText);
    const writableSelf = this.getWritable();
    target.remove();
    return writableSelf;
  }

  /**
   * This method is meant to be overriden by TextNode subclasses to control the behavior of those nodes
   * when used with the registerLexicalTextEntity function. If you're using registerLexicalTextEntity, the
   * node class that you create and replace matched text with should return true from this method.
   *
   * @returns true if the node is to be treated as a "text entity", false otherwise.
   */
  isTextEntity() {
    return false;
  }
}
function convertSpanElement(domNode) {
  // domNode is a <span> since we matched it by nodeName
  const span = domNode;
  // Google Docs uses span tags + font-weight for bold text
  const hasBoldFontWeight = span.style.fontWeight === '700';
  // Google Docs uses span tags + text-decoration: line-through for strikethrough text
  const hasLinethroughTextDecoration = span.style.textDecoration === 'line-through';
  // Google Docs uses span tags + font-style for italic text
  const hasItalicFontStyle = span.style.fontStyle === 'italic';
  // Google Docs uses span tags + text-decoration: underline for underline text
  const hasUnderlineTextDecoration = span.style.textDecoration === 'underline';
  // Google Docs uses span tags + vertical-align to specify subscript and superscript
  const verticalAlign = span.style.verticalAlign;
  return {
    forChild: lexicalNode => {
      if (!$isTextNode(lexicalNode)) {
        return lexicalNode;
      }
      if (hasBoldFontWeight) {
        lexicalNode.toggleFormat('bold');
      }
      if (hasLinethroughTextDecoration) {
        lexicalNode.toggleFormat('strikethrough');
      }
      if (hasItalicFontStyle) {
        lexicalNode.toggleFormat('italic');
      }
      if (hasUnderlineTextDecoration) {
        lexicalNode.toggleFormat('underline');
      }
      if (verticalAlign === 'sub') {
        lexicalNode.toggleFormat('subscript');
      }
      if (verticalAlign === 'super') {
        lexicalNode.toggleFormat('superscript');
      }
      return lexicalNode;
    },
    node: null
  };
}
function convertBringAttentionToElement(domNode) {
  // domNode is a <b> since we matched it by nodeName
  const b = domNode;
  // Google Docs wraps all copied HTML in a <b> with font-weight normal
  const hasNormalFontWeight = b.style.fontWeight === 'normal';
  return {
    forChild: lexicalNode => {
      if ($isTextNode(lexicalNode) && !hasNormalFontWeight) {
        lexicalNode.toggleFormat('bold');
      }
      return lexicalNode;
    },
    node: null
  };
}
const preParentCache = new WeakMap();
function isNodePre(node) {
  return node.nodeName === 'PRE' || node.nodeType === DOM_ELEMENT_TYPE && node.style.whiteSpace.startsWith('pre');
}
function findParentPreDOMNode(node) {
  let cached;
  let parent = node.parentNode;
  const visited = [node];
  while (parent !== null && (cached = preParentCache.get(parent)) === undefined && !isNodePre(parent)) {
    visited.push(parent);
    parent = parent.parentNode;
  }
  const resultNode = cached === undefined ? parent : cached;
  for (let i = 0; i < visited.length; i++) {
    preParentCache.set(visited[i], resultNode);
  }
  return resultNode;
}
function convertTextDOMNode(domNode) {
  const domNode_ = domNode;
  const parentDom = domNode.parentElement;
  if (!(parentDom !== null)) {
    throw Error(`Expected parentElement of Text not to be null`);
  }
  let textContent = domNode_.textContent || '';
  // No collapse and preserve segment break for pre, pre-wrap and pre-line
  if (findParentPreDOMNode(domNode_) !== null) {
    const parts = textContent.split(/(\r?\n|\t)/);
    const nodes = [];
    const length = parts.length;
    for (let i = 0; i < length; i++) {
      const part = parts[i];
      if (part === '\n' || part === '\r\n') {
        nodes.push($createLineBreakNode());
      } else if (part === '\t') {
        nodes.push($createTabNode());
      } else if (part !== '') {
        nodes.push($createTextNode(part));
      }
    }
    return {
      node: nodes
    };
  }
  textContent = textContent.replace(/\r/g, '').replace(/[ \t\n]+/g, ' ');
  if (textContent === '') {
    return {
      node: null
    };
  }
  if (textContent[0] === ' ') {
    // Traverse backward while in the same line. If content contains new line or tab -> pontential
    // delete, other elements can borrow from this one. Deletion depends on whether it's also the
    // last space (see next condition: textContent[textContent.length - 1] === ' '))
    let previousText = domNode_;
    let isStartOfLine = true;
    while (previousText !== null && (previousText = findTextInLine(previousText, false)) !== null) {
      const previousTextContent = previousText.textContent || '';
      if (previousTextContent.length > 0) {
        if (/[ \t\n]$/.test(previousTextContent)) {
          textContent = textContent.slice(1);
        }
        isStartOfLine = false;
        break;
      }
    }
    if (isStartOfLine) {
      textContent = textContent.slice(1);
    }
  }
  if (textContent[textContent.length - 1] === ' ') {
    // Traverse forward while in the same line, preserve if next inline will require a space
    let nextText = domNode_;
    let isEndOfLine = true;
    while (nextText !== null && (nextText = findTextInLine(nextText, true)) !== null) {
      const nextTextContent = (nextText.textContent || '').replace(/^( |\t|\r?\n)+/, '');
      if (nextTextContent.length > 0) {
        isEndOfLine = false;
        break;
      }
    }
    if (isEndOfLine) {
      textContent = textContent.slice(0, textContent.length - 1);
    }
  }
  if (textContent === '') {
    return {
      node: null
    };
  }
  return {
    node: $createTextNode(textContent)
  };
}
const inlineParents = new RegExp(/^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/, 'i');
function findTextInLine(text, forward) {
  let node = text;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let sibling;
    while ((sibling = forward ? node.nextSibling : node.previousSibling) === null) {
      const parentElement = node.parentElement;
      if (parentElement === null) {
        return null;
      }
      node = parentElement;
    }
    node = sibling;
    if (node.nodeType === DOM_ELEMENT_TYPE) {
      const display = node.style.display;
      if (display === '' && node.nodeName.match(inlineParents) === null || display !== '' && !display.startsWith('inline')) {
        return null;
      }
    }
    let descendant = node;
    while ((descendant = forward ? node.firstChild : node.lastChild) !== null) {
      node = descendant;
    }
    if (node.nodeType === DOM_TEXT_TYPE) {
      return node;
    } else if (node.nodeName === 'BR') {
      return null;
    }
  }
}
const nodeNameToTextFormat = {
  code: 'code',
  em: 'italic',
  i: 'italic',
  s: 'strikethrough',
  strong: 'bold',
  sub: 'subscript',
  sup: 'superscript',
  u: 'underline'
};
function convertTextFormatElement(domNode) {
  const format = nodeNameToTextFormat[domNode.nodeName.toLowerCase()];
  if (format === undefined) {
    return {
      node: null
    };
  }
  return {
    forChild: lexicalNode => {
      if ($isTextNode(lexicalNode) && !lexicalNode.hasFormat(format)) {
        lexicalNode.toggleFormat(format);
      }
      return lexicalNode;
    },
    node: null
  };
}
function $createTextNode(text = '') {
  return $applyNodeReplacement(new TextNode(text));
}
function $isTextNode(node) {
  return node instanceof TextNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class TabNode extends TextNode {
  static getType() {
    return 'tab';
  }
  static clone(node) {
    const newNode = new TabNode(node.__key);
    // TabNode __text can be either '\t' or ''. insertText will remove the empty Node
    newNode.__text = node.__text;
    newNode.__format = node.__format;
    newNode.__style = node.__style;
    return newNode;
  }
  constructor(key) {
    super('\t', key);
    this.__detail = IS_UNMERGEABLE;
  }
  static importDOM() {
    return null;
  }
  static importJSON(serializedTabNode) {
    const node = $createTabNode();
    node.setFormat(serializedTabNode.format);
    node.setStyle(serializedTabNode.style);
    return node;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'tab',
      version: 1
    };
  }
  setTextContent(_text) {
    {
      throw Error(`TabNode does not support setTextContent`);
    }
  }
  setDetail(_detail) {
    {
      throw Error(`TabNode does not support setDetail`);
    }
  }
  setMode(_type) {
    {
      throw Error(`TabNode does not support setMode`);
    }
  }
  canInsertTextBefore() {
    return false;
  }
  canInsertTextAfter() {
    return false;
  }
}
function $createTabNode() {
  return $applyNodeReplacement(new TabNode());
}
function $isTabNode(node) {
  return node instanceof TabNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
class Point {
  constructor(key, offset, type) {
    this._selection = null;
    this.key = key;
    this.offset = offset;
    this.type = type;
  }
  is(point) {
    return this.key === point.key && this.offset === point.offset && this.type === point.type;
  }
  isBefore(b) {
    let aNode = this.getNode();
    let bNode = b.getNode();
    const aOffset = this.offset;
    const bOffset = b.offset;
    if ($isElementNode(aNode)) {
      const aNodeDescendant = aNode.getDescendantByIndex(aOffset);
      aNode = aNodeDescendant != null ? aNodeDescendant : aNode;
    }
    if ($isElementNode(bNode)) {
      const bNodeDescendant = bNode.getDescendantByIndex(bOffset);
      bNode = bNodeDescendant != null ? bNodeDescendant : bNode;
    }
    if (aNode === bNode) {
      return aOffset < bOffset;
    }
    return aNode.isBefore(bNode);
  }
  getNode() {
    const key = this.key;
    const node = $getNodeByKey(key);
    if (node === null) {
      {
        throw Error(`Point.getNode: node not found`);
      }
    }
    return node;
  }
  set(key, offset, type) {
    const selection = this._selection;
    const oldKey = this.key;
    this.key = key;
    this.offset = offset;
    this.type = type;
    if (!isCurrentlyReadOnlyMode()) {
      if ($getCompositionKey() === oldKey) {
        $setCompositionKey(key);
      }
      if (selection !== null) {
        selection._cachedNodes = null;
        selection.dirty = true;
      }
    }
  }
}
function $createPoint(key, offset, type) {
  // @ts-expect-error: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type);
}
function selectPointOnNode(point, node) {
  let key = node.__key;
  let offset = point.offset;
  let type = 'element';
  if ($isTextNode(node)) {
    type = 'text';
    const textContentLength = node.getTextContentSize();
    if (offset > textContentLength) {
      offset = textContentLength;
    }
  } else if (!$isElementNode(node)) {
    const nextSibling = node.getNextSibling();
    if ($isTextNode(nextSibling)) {
      key = nextSibling.__key;
      offset = 0;
      type = 'text';
    } else {
      const parentNode = node.getParent();
      if (parentNode) {
        key = parentNode.__key;
        offset = node.getIndexWithinParent() + 1;
      }
    }
  }
  point.set(key, offset, type);
}
function $moveSelectionPointToEnd(point, node) {
  if ($isElementNode(node)) {
    const lastNode = node.getLastDescendant();
    if ($isElementNode(lastNode) || $isTextNode(lastNode)) {
      selectPointOnNode(point, lastNode);
    } else {
      selectPointOnNode(point, node);
    }
  } else {
    selectPointOnNode(point, node);
  }
}
function $transferStartingElementPointToTextPoint(start, end, format, style) {
  const element = start.getNode();
  const placementNode = element.getChildAtIndex(start.offset);
  const textNode = $createTextNode();
  const target = $isRootNode(element) ? $createParagraphNode().append(textNode) : textNode;
  textNode.setFormat(format);
  textNode.setStyle(style);
  if (placementNode === null) {
    element.append(target);
  } else {
    placementNode.insertBefore(target);
    // Fix the end point offset if it refers to the same element as start,
    // as we've now inserted another element before it. Note that we only
    // do it if selection is not collapsed as otherwise it'll transfer
    // both focus and anchor to the text node below
    if (end.type === 'element' && end.key === start.key && end.offset !== start.offset) {
      end.set(end.key, end.offset + 1, 'element');
    }
  }
  // Transfer the element point to a text point.
  if (start.is(end)) {
    end.set(textNode.__key, 0, 'text');
  }
  start.set(textNode.__key, 0, 'text');
}
function $setPointValues(point, key, offset, type) {
  point.key = key;
  point.offset = offset;
  point.type = type;
}
class NodeSelection {
  constructor(objects) {
    this.dirty = false;
    this._nodes = objects;
    this._cachedNodes = null;
  }
  is(selection) {
    if (!$isNodeSelection(selection)) {
      return false;
    }
    const a = this._nodes;
    const b = selection._nodes;
    return a.size === b.size && Array.from(a).every(key => b.has(key));
  }
  add(key) {
    this.dirty = true;
    this._nodes.add(key);
    this._cachedNodes = null;
  }
  delete(key) {
    this.dirty = true;
    this._nodes.delete(key);
    this._cachedNodes = null;
  }
  clear() {
    this.dirty = true;
    this._nodes.clear();
    this._cachedNodes = null;
  }
  has(key) {
    return this._nodes.has(key);
  }
  clone() {
    return new NodeSelection(new Set(this._nodes));
  }
  extract() {
    return this.getNodes();
  }
  insertRawText(text) {
    // Do nothing?
  }
  insertText() {
    // Do nothing?
  }
  insertNodes(nodes, selectStart) {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastSelectedNode = selectedNodes[selectedNodesLength - 1];
    let selectionAtEnd;
    // Insert nodes
    if ($isTextNode(lastSelectedNode)) {
      selectionAtEnd = lastSelectedNode.select();
    } else {
      const index = lastSelectedNode.getIndexWithinParent() + 1;
      selectionAtEnd = lastSelectedNode.getParentOrThrow().select(index, index);
    }
    selectionAtEnd.insertNodes(nodes, selectStart);
    // Remove selected nodes
    for (let i = 0; i < selectedNodesLength; i++) {
      selectedNodes[i].remove();
    }
    return true;
  }
  getNodes() {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const objects = this._nodes;
    const nodes = [];
    for (const object of objects) {
      const node = $getNodeByKey(object);
      if (node !== null) {
        nodes.push(node);
      }
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }
  getTextContent() {
    const nodes = this.getNodes();
    let textContent = '';
    for (let i = 0; i < nodes.length; i++) {
      textContent += nodes[i].getTextContent();
    }
    return textContent;
  }
}
function $isRangeSelection(x) {
  return x instanceof RangeSelection;
}
class GridSelection {
  constructor(gridKey, anchor, focus) {
    this.gridKey = gridKey;
    this.anchor = anchor;
    this.focus = focus;
    this.dirty = false;
    this._cachedNodes = null;
    anchor._selection = this;
    focus._selection = this;
  }
  is(selection) {
    if (!DEPRECATED_$isGridSelection(selection)) {
      return false;
    }
    return this.gridKey === selection.gridKey && this.anchor.is(selection.anchor) && this.focus.is(selection.focus);
  }
  set(gridKey, anchorCellKey, focusCellKey) {
    this.dirty = true;
    this.gridKey = gridKey;
    this.anchor.key = anchorCellKey;
    this.focus.key = focusCellKey;
    this._cachedNodes = null;
  }
  clone() {
    return new GridSelection(this.gridKey, this.anchor, this.focus);
  }
  isCollapsed() {
    return false;
  }
  isBackward() {
    return this.focus.isBefore(this.anchor);
  }
  getCharacterOffsets() {
    return getCharacterOffsets(this);
  }
  extract() {
    return this.getNodes();
  }
  insertRawText(text) {
    // Do nothing?
  }
  insertText() {
    // Do nothing?
  }
  insertNodes(nodes, selectStart) {
    const focusNode = this.focus.getNode();
    const selection = $normalizeSelection(focusNode.select(0, focusNode.getChildrenSize()));
    return selection.insertNodes(nodes, selectStart);
  }

  // TODO Deprecate this method. It's confusing when used with colspan|rowspan
  getShape() {
    const anchorCellNode = $getNodeByKey(this.anchor.key);
    if (!(anchorCellNode !== null)) {
      throw Error(`getNodes: expected to find AnchorNode`);
    }
    const anchorCellNodeIndex = anchorCellNode.getIndexWithinParent();
    const anchorCelRoweIndex = anchorCellNode.getParentOrThrow().getIndexWithinParent();
    const focusCellNode = $getNodeByKey(this.focus.key);
    if (!(focusCellNode !== null)) {
      throw Error(`getNodes: expected to find FocusNode`);
    }
    const focusCellNodeIndex = focusCellNode.getIndexWithinParent();
    const focusCellRowIndex = focusCellNode.getParentOrThrow().getIndexWithinParent();
    const startX = Math.min(anchorCellNodeIndex, focusCellNodeIndex);
    const stopX = Math.max(anchorCellNodeIndex, focusCellNodeIndex);
    const startY = Math.min(anchorCelRoweIndex, focusCellRowIndex);
    const stopY = Math.max(anchorCelRoweIndex, focusCellRowIndex);
    return {
      fromX: Math.min(startX, stopX),
      fromY: Math.min(startY, stopY),
      toX: Math.max(startX, stopX),
      toY: Math.max(startY, stopY)
    };
  }
  getNodes() {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const anchorNode = this.anchor.getNode();
    const focusNode = this.focus.getNode();
    const anchorCell = $findMatchingParent(anchorNode, DEPRECATED_$isGridCellNode);
    // todo replace with triplet
    const focusCell = $findMatchingParent(focusNode, DEPRECATED_$isGridCellNode);
    if (!DEPRECATED_$isGridCellNode(anchorCell)) {
      throw Error(`Expected GridSelection anchor to be (or a child of) GridCellNode`);
    }
    if (!DEPRECATED_$isGridCellNode(focusCell)) {
      throw Error(`Expected GridSelection focus to be (or a child of) GridCellNode`);
    }
    const anchorRow = anchorCell.getParent();
    if (!DEPRECATED_$isGridRowNode(anchorRow)) {
      throw Error(`Expected anchorCell to have a parent GridRowNode`);
    }
    const gridNode = anchorRow.getParent();
    if (!DEPRECATED_$isGridNode(gridNode)) {
      throw Error(`Expected tableNode to have a parent GridNode`);
    } // TODO Mapping the whole Grid every time not efficient. We need to compute the entire state only
    // once (on load) and iterate on it as updates occur. However, to do this we need to have the
    // ability to store a state. Killing GridSelection and moving the logic to the plugin would make
    // this possible.
    const [map, cellAMap, cellBMap] = DEPRECATED_$computeGridMap(gridNode, anchorCell, focusCell);
    let minColumn = Math.min(cellAMap.startColumn, cellBMap.startColumn);
    let minRow = Math.min(cellAMap.startRow, cellBMap.startRow);
    let maxColumn = Math.max(cellAMap.startColumn + cellAMap.cell.__colSpan - 1, cellBMap.startColumn + cellBMap.cell.__colSpan - 1);
    let maxRow = Math.max(cellAMap.startRow + cellAMap.cell.__rowSpan - 1, cellBMap.startRow + cellBMap.cell.__rowSpan - 1);
    let exploredMinColumn = minColumn;
    let exploredMinRow = minRow;
    let exploredMaxColumn = minColumn;
    let exploredMaxRow = minRow;
    function expandBoundary(mapValue) {
      const {
        cell,
        startColumn: cellStartColumn,
        startRow: cellStartRow
      } = mapValue;
      minColumn = Math.min(minColumn, cellStartColumn);
      minRow = Math.min(minRow, cellStartRow);
      maxColumn = Math.max(maxColumn, cellStartColumn + cell.__colSpan - 1);
      maxRow = Math.max(maxRow, cellStartRow + cell.__rowSpan - 1);
    }
    while (minColumn < exploredMinColumn || minRow < exploredMinRow || maxColumn > exploredMaxColumn || maxRow > exploredMaxRow) {
      if (minColumn < exploredMinColumn) {
        // Expand on the left
        const rowDiff = exploredMaxRow - exploredMinRow;
        const previousColumn = exploredMinColumn - 1;
        for (let i = 0; i <= rowDiff; i++) {
          expandBoundary(map[exploredMinRow + i][previousColumn]);
        }
        exploredMinColumn = previousColumn;
      }
      if (minRow < exploredMinRow) {
        // Expand on top
        const columnDiff = exploredMaxColumn - exploredMinColumn;
        const previousRow = exploredMinRow - 1;
        for (let i = 0; i <= columnDiff; i++) {
          expandBoundary(map[previousRow][exploredMinColumn + i]);
        }
        exploredMinRow = previousRow;
      }
      if (maxColumn > exploredMaxColumn) {
        // Expand on the right
        const rowDiff = exploredMaxRow - exploredMinRow;
        const nextColumn = exploredMaxColumn + 1;
        for (let i = 0; i <= rowDiff; i++) {
          expandBoundary(map[exploredMinRow + i][nextColumn]);
        }
        exploredMaxColumn = nextColumn;
      }
      if (maxRow > exploredMaxRow) {
        // Expand on the bottom
        const columnDiff = exploredMaxColumn - exploredMinColumn;
        const nextRow = exploredMaxRow + 1;
        for (let i = 0; i <= columnDiff; i++) {
          expandBoundary(map[nextRow][exploredMinColumn + i]);
        }
        exploredMaxRow = nextRow;
      }
    }
    const nodes = [gridNode];
    let lastRow = null;
    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minColumn; j <= maxColumn; j++) {
        const {
          cell
        } = map[i][j];
        const currentRow = cell.getParent();
        if (!DEPRECATED_$isGridRowNode(currentRow)) {
          throw Error(`Expected GridCellNode parent to be a GridRowNode`);
        }
        if (currentRow !== lastRow) {
          nodes.push(currentRow);
        }
        nodes.push(cell, ...$getChildrenRecursively(cell));
        lastRow = currentRow;
      }
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }
  getTextContent() {
    const nodes = this.getNodes();
    let textContent = '';
    for (let i = 0; i < nodes.length; i++) {
      textContent += nodes[i].getTextContent();
    }
    return textContent;
  }
}
function DEPRECATED_$isGridSelection(x) {
  return x instanceof GridSelection;
}
class RangeSelection {
  constructor(anchor, focus, format, style) {
    this.anchor = anchor;
    this.focus = focus;
    this.dirty = false;
    this.format = format;
    this.style = style;
    this._cachedNodes = null;
    anchor._selection = this;
    focus._selection = this;
  }

  /**
   * Used to check if the provided selections is equal to this one by value,
   * inluding anchor, focus, format, and style properties.
   * @param selection - the Selection to compare this one to.
   * @returns true if the Selections are equal, false otherwise.
   */
  is(selection) {
    if (!$isRangeSelection(selection)) {
      return false;
    }
    return this.anchor.is(selection.anchor) && this.focus.is(selection.focus) && this.format === selection.format && this.style === selection.style;
  }

  /**
   * Returns whether the Selection is "backwards", meaning the focus
   * logically precedes the anchor in the EditorState.
   * @returns true if the Selection is backwards, false otherwise.
   */
  isBackward() {
    return this.focus.isBefore(this.anchor);
  }

  /**
   * Returns whether the Selection is "collapsed", meaning the anchor and focus are
   * the same node and have the same offset.
   *
   * @returns true if the Selection is collapsed, false otherwise.
   */
  isCollapsed() {
    return this.anchor.is(this.focus);
  }

  /**
   * Gets all the nodes in the Selection. Uses caching to make it generally suitable
   * for use in hot paths.
   *
   * @returns an Array containing all the nodes in the Selection
   */
  getNodes() {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = anchor.isBefore(focus);
    const firstPoint = isBefore ? anchor : focus;
    const lastPoint = isBefore ? focus : anchor;
    let firstNode = firstPoint.getNode();
    let lastNode = lastPoint.getNode();
    const startOffset = firstPoint.offset;
    const endOffset = lastPoint.offset;
    if ($isElementNode(firstNode)) {
      const firstNodeDescendant = firstNode.getDescendantByIndex(startOffset);
      firstNode = firstNodeDescendant != null ? firstNodeDescendant : firstNode;
    }
    if ($isElementNode(lastNode)) {
      let lastNodeDescendant = lastNode.getDescendantByIndex(endOffset);
      // We don't want to over-select, as node selection infers the child before
      // the last descendant, not including that descendant.
      if (lastNodeDescendant !== null && lastNodeDescendant !== firstNode && lastNode.getChildAtIndex(endOffset) === lastNodeDescendant) {
        lastNodeDescendant = lastNodeDescendant.getPreviousSibling();
      }
      lastNode = lastNodeDescendant != null ? lastNodeDescendant : lastNode;
    }
    let nodes;
    if (firstNode.is(lastNode)) {
      if ($isElementNode(firstNode) && firstNode.getChildrenSize() > 0) {
        nodes = [];
      } else {
        nodes = [firstNode];
      }
    } else {
      nodes = firstNode.getNodesBetween(lastNode);
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }

  /**
   * Sets this Selection to be of type "text" at the provided anchor and focus values.
   *
   * @param anchorNode - the anchor node to set on the Selection
   * @param anchorOffset - the offset to set on the Selection
   * @param focusNode - the focus node to set on the Selection
   * @param focusOffset - the focus offset to set on the Selection
   */
  setTextNodeRange(anchorNode, anchorOffset, focusNode, focusOffset) {
    $setPointValues(this.anchor, anchorNode.__key, anchorOffset, 'text');
    $setPointValues(this.focus, focusNode.__key, focusOffset, 'text');
    this._cachedNodes = null;
    this.dirty = true;
  }

  /**
   * Gets the (plain) text content of all the nodes in the selection.
   *
   * @returns a string representing the text content of all the nodes in the Selection
   */
  getTextContent() {
    const nodes = this.getNodes();
    if (nodes.length === 0) {
      return '';
    }
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = anchor.isBefore(focus);
    const [anchorOffset, focusOffset] = getCharacterOffsets(this);
    let textContent = '';
    let prevWasElement = true;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if ($isElementNode(node) && !node.isInline()) {
        if (!prevWasElement) {
          textContent += '\n';
        }
        if (node.isEmpty()) {
          prevWasElement = false;
        } else {
          prevWasElement = true;
        }
      } else {
        prevWasElement = false;
        if ($isTextNode(node)) {
          let text = node.getTextContent();
          if (node === firstNode) {
            if (node === lastNode) {
              if (anchor.type !== 'element' || focus.type !== 'element' || focus.offset === anchor.offset) {
                text = anchorOffset < focusOffset ? text.slice(anchorOffset, focusOffset) : text.slice(focusOffset, anchorOffset);
              }
            } else {
              text = isBefore ? text.slice(anchorOffset) : text.slice(focusOffset);
            }
          } else if (node === lastNode) {
            text = isBefore ? text.slice(0, focusOffset) : text.slice(0, anchorOffset);
          }
          textContent += text;
        } else if (($isDecoratorNode(node) || $isLineBreakNode(node)) && (node !== lastNode || !this.isCollapsed())) {
          textContent += node.getTextContent();
        }
      }
    }
    return textContent;
  }

  /**
   * Attempts to map a DOM selection range onto this Lexical Selection,
   * setting the anchor, focus, and type accordingly
   *
   * @param range a DOM Selection range conforming to the StaticRange interface.
   */
  applyDOMRange(range) {
    const editor = getActiveEditor();
    const currentEditorState = editor.getEditorState();
    const lastSelection = currentEditorState._selection;
    const resolvedSelectionPoints = internalResolveSelectionPoints(range.startContainer, range.startOffset, range.endContainer, range.endOffset, editor, lastSelection);
    if (resolvedSelectionPoints === null) {
      return;
    }
    const [anchorPoint, focusPoint] = resolvedSelectionPoints;
    $setPointValues(this.anchor, anchorPoint.key, anchorPoint.offset, anchorPoint.type);
    $setPointValues(this.focus, focusPoint.key, focusPoint.offset, focusPoint.type);
    this._cachedNodes = null;
  }

  /**
   * Creates a new RangeSelection, copying over all the property values from this one.
   *
   * @returns a new RangeSelection with the same property values as this one.
   */
  clone() {
    const anchor = this.anchor;
    const focus = this.focus;
    const selection = new RangeSelection($createPoint(anchor.key, anchor.offset, anchor.type), $createPoint(focus.key, focus.offset, focus.type), this.format, this.style);
    return selection;
  }

  /**
   * Toggles the provided format on all the TextNodes in the Selection.
   *
   * @param format a string TextFormatType to toggle on the TextNodes in the selection
   */
  toggleFormat(format) {
    this.format = toggleTextFormatType(this.format, format, null);
    this.dirty = true;
  }

  /**
   * Sets the value of the style property on the Selection
   *
   * @param style - the style to set at the value of the style property.
   */
  setStyle(style) {
    this.style = style;
    this.dirty = true;
  }

  /**
   * Returns whether the provided TextFormatType is present on the Selection. This will be true if any node in the Selection
   * has the specified format.
   *
   * @param type the TextFormatType to check for.
   * @returns true if the provided format is currently toggled on on the Selection, false otherwise.
   */
  hasFormat(type) {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.format & formatFlag) !== 0;
  }

  /**
   * Attempts to insert the provided text into the EditorState at the current Selection.
   * converts tabs, newlines, and carriage returns into LexicalNodes.
   *
   * @param text the text to insert into the Selection
   */
  insertRawText(text) {
    const parts = text.split(/(\r?\n|\t)/);
    const nodes = [];
    const length = parts.length;
    for (let i = 0; i < length; i++) {
      const part = parts[i];
      if (part === '\n' || part === '\r\n') {
        nodes.push($createLineBreakNode());
      } else if (part === '\t') {
        nodes.push($createTabNode());
      } else {
        nodes.push($createTextNode(part));
      }
    }
    this.insertNodes(nodes);
  }

  /**
   * Attempts to insert the provided text into the EditorState at the current Selection as a new
   * Lexical TextNode, according to a series of insertion heuristics based on the selection type and position.
   *
   * @param text the text to insert into the Selection
   */
  insertText(text) {
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = this.isCollapsed() || anchor.isBefore(focus);
    const format = this.format;
    const style = this.style;
    if (isBefore && anchor.type === 'element') {
      $transferStartingElementPointToTextPoint(anchor, focus, format, style);
    } else if (!isBefore && focus.type === 'element') {
      $transferStartingElementPointToTextPoint(focus, anchor, format, style);
    }
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const firstPoint = isBefore ? anchor : focus;
    const endPoint = isBefore ? focus : anchor;
    const startOffset = firstPoint.offset;
    const endOffset = endPoint.offset;
    let firstNode = selectedNodes[0];
    if (!$isTextNode(firstNode)) {
      {
        throw Error(`insertText: first node is not a text node`);
      }
    }
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const firstNodeParent = firstNode.getParentOrThrow();
    const lastIndex = selectedNodesLength - 1;
    let lastNode = selectedNodes[lastIndex];
    if (this.isCollapsed() && startOffset === firstNodeTextLength && (firstNode.isSegmented() || firstNode.isToken() || !firstNode.canInsertTextAfter() || !firstNodeParent.canInsertTextAfter() && firstNode.getNextSibling() === null)) {
      let nextSibling = firstNode.getNextSibling();
      if (!$isTextNode(nextSibling) || !nextSibling.canInsertTextBefore() || $isTokenOrSegmented(nextSibling)) {
        nextSibling = $createTextNode();
        nextSibling.setFormat(format);
        if (!firstNodeParent.canInsertTextAfter()) {
          firstNodeParent.insertAfter(nextSibling);
        } else {
          firstNode.insertAfter(nextSibling);
        }
      }
      nextSibling.select(0, 0);
      firstNode = nextSibling;
      if (text !== '') {
        this.insertText(text);
        return;
      }
    } else if (this.isCollapsed() && startOffset === 0 && (firstNode.isSegmented() || firstNode.isToken() || !firstNode.canInsertTextBefore() || !firstNodeParent.canInsertTextBefore() && firstNode.getPreviousSibling() === null)) {
      let prevSibling = firstNode.getPreviousSibling();
      if (!$isTextNode(prevSibling) || $isTokenOrSegmented(prevSibling)) {
        prevSibling = $createTextNode();
        prevSibling.setFormat(format);
        if (!firstNodeParent.canInsertTextBefore()) {
          firstNodeParent.insertBefore(prevSibling);
        } else {
          firstNode.insertBefore(prevSibling);
        }
      }
      prevSibling.select();
      firstNode = prevSibling;
      if (text !== '') {
        this.insertText(text);
        return;
      }
    } else if (firstNode.isSegmented() && startOffset !== firstNodeTextLength) {
      const textNode = $createTextNode(firstNode.getTextContent());
      textNode.setFormat(format);
      firstNode.replace(textNode);
      firstNode = textNode;
    } else if (!this.isCollapsed() && text !== '') {
      // When the firstNode or lastNode parents are elements that
      // do not allow text to be inserted before or after, we first
      // clear the content. Then we normalize selection, then insert
      // the new content.
      const lastNodeParent = lastNode.getParent();
      if (!firstNodeParent.canInsertTextBefore() || !firstNodeParent.canInsertTextAfter() || $isElementNode(lastNodeParent) && (!lastNodeParent.canInsertTextBefore() || !lastNodeParent.canInsertTextAfter())) {
        this.insertText('');
        normalizeSelectionPointsForBoundaries(this.anchor, this.focus, null);
        this.insertText(text);
        return;
      }
    }
    if (selectedNodesLength === 1) {
      if (firstNode.isToken()) {
        const textNode = $createTextNode(text);
        textNode.select();
        firstNode.replace(textNode);
        return;
      }
      const firstNodeFormat = firstNode.getFormat();
      const firstNodeStyle = firstNode.getStyle();
      if (startOffset === endOffset && (firstNodeFormat !== format || firstNodeStyle !== style)) {
        if (firstNode.getTextContent() === '') {
          firstNode.setFormat(format);
          firstNode.setStyle(style);
        } else {
          const textNode = $createTextNode(text);
          textNode.setFormat(format);
          textNode.setStyle(style);
          textNode.select();
          if (startOffset === 0) {
            firstNode.insertBefore(textNode, false);
          } else {
            const [targetNode] = firstNode.splitText(startOffset);
            targetNode.insertAfter(textNode, false);
          }
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          if (textNode.isComposing() && this.anchor.type === 'text') {
            this.anchor.offset -= text.length;
          }
          return;
        }
      }
      const delCount = endOffset - startOffset;
      firstNode = firstNode.spliceText(startOffset, delCount, text, true);
      if (firstNode.getTextContent() === '') {
        firstNode.remove();
      } else if (this.anchor.type === 'text') {
        if (firstNode.isComposing()) {
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          this.anchor.offset -= text.length;
        } else {
          this.format = firstNodeFormat;
          this.style = firstNodeStyle;
        }
      }
    } else {
      const markedNodeKeysForKeep = new Set([...firstNode.getParentKeys(), ...lastNode.getParentKeys()]);

      // We have to get the parent elements before the next section,
      // as in that section we might mutate the lastNode.
      const firstElement = $isElementNode(firstNode) ? firstNode : firstNode.getParentOrThrow();
      let lastElement = $isElementNode(lastNode) ? lastNode : lastNode.getParentOrThrow();
      let lastElementChild = lastNode;

      // If the last element is inline, we should instead look at getting
      // the nodes of its parent, rather than itself. This behavior will
      // then better match how text node insertions work. We will need to
      // also update the last element's child accordingly as we do this.
      if (!firstElement.is(lastElement) && lastElement.isInline()) {
        // Keep traversing till we have a non-inline element parent.
        do {
          lastElementChild = lastElement;
          lastElement = lastElement.getParentOrThrow();
        } while (lastElement.isInline());
      }

      // Handle mutations to the last node.
      if (endPoint.type === 'text' && (endOffset !== 0 || lastNode.getTextContent() === '') || endPoint.type === 'element' && lastNode.getIndexWithinParent() < endOffset) {
        if ($isTextNode(lastNode) && !lastNode.isToken() && endOffset !== lastNode.getTextContentSize()) {
          if (lastNode.isSegmented()) {
            const textNode = $createTextNode(lastNode.getTextContent());
            lastNode.replace(textNode);
            lastNode = textNode;
          }
          // root node selections only select whole nodes, so no text splice is necessary
          if (!$isRootNode(endPoint.getNode())) {
            lastNode = lastNode.spliceText(0, endOffset, '');
          }
          markedNodeKeysForKeep.add(lastNode.__key);
        } else {
          const lastNodeParent = lastNode.getParentOrThrow();
          if (!lastNodeParent.canBeEmpty() && lastNodeParent.getChildrenSize() === 1) {
            lastNodeParent.remove();
          } else {
            lastNode.remove();
          }
        }
      } else {
        markedNodeKeysForKeep.add(lastNode.__key);
      }

      // Either move the remaining nodes of the last parent to after
      // the first child, or remove them entirely. If the last parent
      // is the same as the first parent, this logic also works.
      const lastNodeChildren = lastElement.getChildren();
      const selectedNodesSet = new Set(selectedNodes);
      const firstAndLastElementsAreEqual = firstElement.is(lastElement);

      // We choose a target to insert all nodes after. In the case of having
      // and inline starting parent element with a starting node that has no
      // siblings, we should insert after the starting parent element, otherwise
      // we will incorrectly merge into the starting parent element.
      // TODO: should we keep on traversing parents if we're inside another
      // nested inline element?
      const insertionTarget = firstElement.isInline() && firstNode.getNextSibling() === null ? firstElement : firstNode;
      for (let i = lastNodeChildren.length - 1; i >= 0; i--) {
        const lastNodeChild = lastNodeChildren[i];
        if (lastNodeChild.is(firstNode) || $isElementNode(lastNodeChild) && lastNodeChild.isParentOf(firstNode)) {
          break;
        }
        if (lastNodeChild.isAttached()) {
          if (!selectedNodesSet.has(lastNodeChild) || lastNodeChild.is(lastElementChild)) {
            if (!firstAndLastElementsAreEqual) {
              insertionTarget.insertAfter(lastNodeChild, false);
            }
          } else {
            lastNodeChild.remove();
          }
        }
      }
      if (!firstAndLastElementsAreEqual) {
        // Check if we have already moved out all the nodes of the
        // last parent, and if so, traverse the parent tree and mark
        // them all as being able to deleted too.
        let parent = lastElement;
        let lastRemovedParent = null;
        while (parent !== null) {
          const children = parent.getChildren();
          const childrenLength = children.length;
          if (childrenLength === 0 || children[childrenLength - 1].is(lastRemovedParent)) {
            markedNodeKeysForKeep.delete(parent.__key);
            lastRemovedParent = parent;
          }
          parent = parent.getParent();
        }
      }

      // Ensure we do splicing after moving of nodes, as splicing
      // can have side-effects (in the case of hashtags).
      if (!firstNode.isToken()) {
        firstNode = firstNode.spliceText(startOffset, firstNodeTextLength - startOffset, text, true);
        if (firstNode.getTextContent() === '') {
          firstNode.remove();
        } else if (firstNode.isComposing() && this.anchor.type === 'text') {
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          this.anchor.offset -= text.length;
        }
      } else if (startOffset === firstNodeTextLength) {
        firstNode.select();
      } else {
        const textNode = $createTextNode(text);
        textNode.select();
        firstNode.replace(textNode);
      }

      // Remove all selected nodes that haven't already been removed.
      for (let i = 1; i < selectedNodesLength; i++) {
        const selectedNode = selectedNodes[i];
        const key = selectedNode.__key;
        if (!markedNodeKeysForKeep.has(key)) {
          selectedNode.remove();
        }
      }
    }
  }

  /**
   * Removes the text in the Selection, adjusting the EditorState accordingly.
   */
  removeText() {
    this.insertText('');
  }

  /**
   * Applies the provided format to the TextNodes in the Selection, splitting or
   * merging nodes as necessary.
   *
   * @param formatType the format type to apply to the nodes in the Selection.
   */
  formatText(formatType) {
    if (this.isCollapsed()) {
      this.toggleFormat(formatType);
      // When changing format, we should stop composition
      $setCompositionKey(null);
      return;
    }
    const selectedNodes = this.getNodes();
    const selectedTextNodes = [];
    for (const selectedNode of selectedNodes) {
      if ($isTextNode(selectedNode)) {
        selectedTextNodes.push(selectedNode);
      }
    }
    const selectedTextNodesLength = selectedTextNodes.length;
    if (selectedTextNodesLength === 0) {
      this.toggleFormat(formatType);
      // When changing format, we should stop composition
      $setCompositionKey(null);
      return;
    }
    const anchor = this.anchor;
    const focus = this.focus;
    const isBackward = this.isBackward();
    const startPoint = isBackward ? focus : anchor;
    const endPoint = isBackward ? anchor : focus;
    let firstIndex = 0;
    let firstNode = selectedTextNodes[0];
    let startOffset = startPoint.type === 'element' ? 0 : startPoint.offset;

    // In case selection started at the end of text node use next text node
    if (startPoint.type === 'text' && startOffset === firstNode.getTextContentSize()) {
      firstIndex = 1;
      firstNode = selectedTextNodes[1];
      startOffset = 0;
    }
    if (firstNode == null) {
      return;
    }
    const firstNextFormat = firstNode.getFormatFlags(formatType, null);
    const lastIndex = selectedTextNodesLength - 1;
    let lastNode = selectedTextNodes[lastIndex];
    const endOffset = endPoint.type === 'text' ? endPoint.offset : lastNode.getTextContentSize();

    // Single node selected
    if (firstNode.is(lastNode)) {
      // No actual text is selected, so do nothing.
      if (startOffset === endOffset) {
        return;
      }
      // The entire node is selected, so just format it
      if (startOffset === 0 && endOffset === firstNode.getTextContentSize()) {
        firstNode.setFormat(firstNextFormat);
      } else {
        // Node is partially selected, so split it into two nodes
        // add style the selected one.
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        replacement.setFormat(firstNextFormat);

        // Update selection only if starts/ends on text node
        if (startPoint.type === 'text') {
          startPoint.set(replacement.__key, 0, 'text');
        }
        if (endPoint.type === 'text') {
          endPoint.set(replacement.__key, endOffset - startOffset, 'text');
        }
      }
      this.format = firstNextFormat;
      return;
    }
    // Multiple nodes selected
    // The entire first node isn't selected, so split it
    if (startOffset !== 0) {
      [, firstNode] = firstNode.splitText(startOffset);
      startOffset = 0;
    }
    firstNode.setFormat(firstNextFormat);
    const lastNextFormat = lastNode.getFormatFlags(formatType, firstNextFormat);
    // If the offset is 0, it means no actual characters are selected,
    // so we skip formatting the last node altogether.
    if (endOffset > 0) {
      if (endOffset !== lastNode.getTextContentSize()) {
        [lastNode] = lastNode.splitText(endOffset);
      }
      lastNode.setFormat(lastNextFormat);
    }

    // Process all text nodes in between
    for (let i = firstIndex + 1; i < lastIndex; i++) {
      const textNode = selectedTextNodes[i];
      if (!textNode.isToken()) {
        const nextFormat = textNode.getFormatFlags(formatType, lastNextFormat);
        textNode.setFormat(nextFormat);
      }
    }

    // Update selection only if starts/ends on text node
    if (startPoint.type === 'text') {
      startPoint.set(firstNode.__key, startOffset, 'text');
    }
    if (endPoint.type === 'text') {
      endPoint.set(lastNode.__key, endOffset, 'text');
    }
    this.format = firstNextFormat | lastNextFormat;
  }

  /**
   * Attempts to "intelligently" insert an arbitrary list of Lexical nodes into the EditorState at the
   * current Selection according to a set of heuristics that determine how surrounding nodes
   * should be changed, replaced, or moved to accomodate the incoming ones.
   *
   * @param nodes - the nodes to insert
   * @param selectStart - whether or not to select the start after the insertion.
   * @returns true if the nodes were inserted successfully, false otherwise.
   */
  insertNodes(nodes, selectStart) {
    // If there is a range selected remove the text in it
    if (!this.isCollapsed()) {
      const selectionEnd = this.isBackward() ? this.anchor : this.focus;
      const nextSibling = selectionEnd.getNode().getNextSibling();
      const nextSiblingKey = nextSibling ? nextSibling.getKey() : null;
      const prevSibling = selectionEnd.getNode().getPreviousSibling();
      const prevSiblingKey = prevSibling ? prevSibling.getKey() : null;
      this.removeText();

      // If the selection has been moved to an adjacent inline element, create
      // a temporary text node that we can insert the nodes after.
      if (this.isCollapsed() && this.focus.type === 'element') {
        let textNode;
        if (this.focus.key === nextSiblingKey && this.focus.offset === 0) {
          textNode = $createTextNode();
          this.focus.getNode().insertBefore(textNode);
        } else if (this.focus.key === prevSiblingKey && this.focus.offset === this.focus.getNode().getChildrenSize()) {
          textNode = $createTextNode();
          this.focus.getNode().insertAfter(textNode);
        }
        if (textNode) {
          this.focus.set(textNode.__key, 0, 'text');
          this.anchor.set(textNode.__key, 0, 'text');
        }
      }
    }
    const anchor = this.anchor;
    const anchorOffset = anchor.offset;
    const anchorNode = anchor.getNode();
    let target = anchorNode;
    if (anchor.type === 'element') {
      const element = anchor.getNode();
      const placementNode = element.getChildAtIndex(anchorOffset - 1);
      if (placementNode === null) {
        target = element;
      } else {
        target = placementNode;
      }
    }
    const siblings = [];

    // Get all remaining text node siblings in this element so we can
    // append them after the last node we're inserting.
    const nextSiblings = anchorNode.getNextSiblings();
    const topLevelElement = $isRootOrShadowRoot(anchorNode) ? null : anchorNode.getTopLevelElementOrThrow();
    if ($isTextNode(anchorNode)) {
      const textContent = anchorNode.getTextContent();
      const textContentLength = textContent.length;
      if (anchorOffset === 0 && textContentLength !== 0) {
        const prevSibling = anchorNode.getPreviousSibling();
        if (prevSibling !== null) {
          target = prevSibling;
        } else {
          target = anchorNode.getParentOrThrow();
        }
        siblings.push(anchorNode);
      } else if (anchorOffset === textContentLength) {
        target = anchorNode;
      } else if (anchorNode.isToken()) {
        // Do nothing if we're inside a token node
        return false;
      } else {
        // If we started with a range selected grab the danglingText after the
        // end of the selection and put it on our siblings array so we can
        // append it after the last node we're inserting
        let danglingText;
        [target, danglingText] = anchorNode.splitText(anchorOffset);
        siblings.push(danglingText);
      }
    }
    const startingNode = target;
    siblings.push(...nextSiblings);
    const firstNode = nodes[0];
    let didReplaceOrMerge = false;
    let lastNode = null;

    // Time to insert the nodes!
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!$isRootOrShadowRoot(target) && !$isDecoratorNode(target) && $isElementNode(node) && !node.isInline()) {
        // -----
        // Heuristics for the replacement or merging of elements
        // -----

        // If we have an incoming element node as the first node, then we'll need
        // see if we can merge any descendant leaf nodes into our existing target.
        // We can do this by finding the first descendant in our node and then we can
        // pluck it and its parent (siblings included) out and insert them directly
        // into our target. We only do this for the first node, as we are only
        // interested in merging with the anchor, which is our target.
        //
        // If we apply either the replacement or merging heuristics, we need to be
        // careful that we're not trying to insert a non-element node into a root node,
        // so we check if the target's parent after this logic is the root node and if
        // so we trigger an invariant to ensure this problem is caught in development
        // and fixed accordingly.

        if (node.is(firstNode)) {
          if ($isElementNode(target) && target.isEmpty() && target.canReplaceWith(node)) {
            target.replace(node);
            target = node;
            didReplaceOrMerge = true;
            continue;
          }
          // We may have a node tree where there are many levels, for example with
          // lists and tables. So let's find the first descendant to try and merge
          // with. So if we have the target:
          //
          // Paragraph (1)
          //   Text (2)
          //
          // and we are trying to insert:
          //
          // ListNode (3)
          //   ListItemNode (4)
          //     Text (5)
          //   ListItemNode (6)
          //
          // The result would be:
          //
          // Paragraph (1)
          //   Text (2)
          //   Text (5)
          //

          const firstDescendant = node.getFirstDescendant();
          if ($isLeafNode(firstDescendant)) {
            let element = firstDescendant.getParentOrThrow();
            while (element.isInline()) {
              element = element.getParentOrThrow();
            }
            const children = element.getChildren();
            const childrenLength = children.length;
            if ($isElementNode(target)) {
              let firstChild = target.getFirstChild();
              for (let s = 0; s < childrenLength; s++) {
                const child = children[s];
                if (firstChild === null) {
                  target.append(child);
                } else {
                  firstChild.insertAfter(child);
                }
                firstChild = child;
              }
            } else {
              for (let s = childrenLength - 1; s >= 0; s--) {
                target.insertAfter(children[s]);
              }
              target = target.getParentOrThrow();
            }
            lastNode = children[childrenLength - 1];
            element.remove();
            didReplaceOrMerge = true;
            if (element.is(node)) {
              continue;
            }
          }
        }
        if ($isTextNode(target)) {
          if (topLevelElement === null) {
            {
              throw Error(`insertNode: topLevelElement is root node`);
            }
          }
          target = topLevelElement;
        }
      } else if (didReplaceOrMerge && !$isElementNode(node) && !$isDecoratorNode(node) && $isRootOrShadowRoot(target.getParent())) {
        {
          throw Error(`insertNodes: cannot insert a non-element into a root node`);
        }
      }
      didReplaceOrMerge = false;
      if ($isElementNode(target) && !target.isInline()) {
        lastNode = node;
        if ($isDecoratorNode(node) && !node.isInline()) {
          if (nodes.length === 1 && target.canBeEmpty() && target.isEmpty()) {
            target = target.insertBefore(node, false);
          } else {
            target = target.insertAfter(node, false);
          }
        } else if (!$isElementNode(node)) {
          const firstChild = target.getFirstChild();
          if (firstChild !== null) {
            firstChild.insertBefore(node);
          } else {
            target.append(node);
          }
          target = node;
        } else {
          if (!node.canBeEmpty() && node.isEmpty()) {
            continue;
          }
          if ($isRootNode(target)) {
            const placementNode = target.getChildAtIndex(anchorOffset);
            if (placementNode !== null) {
              placementNode.insertBefore(node);
            } else {
              target.append(node);
            }
            target = node;
          } else if (node.isInline()) {
            target.append(node);
            target = node;
          } else {
            target = target.insertAfter(node, false);
          }
        }
      } else if (!$isElementNode(node) || $isElementNode(node) && node.isInline() || $isDecoratorNode(target) && !target.isInline()) {
        lastNode = node;
        // when pasting top level node in the middle of paragraph
        // we need to split paragraph instead of placing it inline
        if ($isRangeSelection(this) && $isDecoratorNode(node) && ($isElementNode(target) || $isTextNode(target)) && !node.isInline()) {
          let splitNode;
          let splitOffset;
          if ($isTextNode(target)) {
            splitNode = target.getParentOrThrow();
            const [textNode] = target.splitText(anchorOffset);
            splitOffset = textNode.getIndexWithinParent() + 1;
          } else {
            splitNode = target;
            splitOffset = anchorOffset;
          }
          const [, rightTree] = $splitNode(splitNode, splitOffset);
          target = rightTree.insertBefore(node);
        } else {
          target = target.insertAfter(node, false);
        }
      } else {
        const nextTarget = target.getParentOrThrow();
        // if we're inserting an Element after a LineBreak, we want to move the target to the parent
        // and remove the LineBreak so we don't have empty space.
        if ($isLineBreakNode(target)) {
          target.remove();
        }
        target = nextTarget;
        // Re-try again with the target being the parent
        i--;
        continue;
      }
    }
    if (selectStart) {
      // Handle moving selection to start for all nodes
      if ($isTextNode(startingNode)) {
        startingNode.select();
      } else {
        const prevSibling = target.getPreviousSibling();
        if ($isTextNode(prevSibling)) {
          prevSibling.select();
        } else {
          const index = target.getIndexWithinParent();
          target.getParentOrThrow().select(index, index);
        }
      }
    }
    if ($isElementNode(target)) {
      // If the last node to be inserted was a text node,
      // then we should attempt to move selection to that.
      const lastChild = $isTextNode(lastNode) ? lastNode : $isElementNode(lastNode) && lastNode.isInline() ? lastNode.getLastDescendant() : target.getLastDescendant();
      if (!selectStart) {
        // Handle moving selection to end for elements
        if (lastChild === null) {
          target.select();
        } else if ($isTextNode(lastChild)) {
          if (lastChild.getTextContent() === '') {
            lastChild.selectPrevious();
          } else {
            lastChild.select();
          }
        } else {
          lastChild.selectNext();
        }
      }
      if (siblings.length !== 0) {
        const originalTarget = target;
        for (let i = siblings.length - 1; i >= 0; i--) {
          const sibling = siblings[i];
          const prevParent = sibling.getParentOrThrow();
          if ($isElementNode(target) && !$isBlockElementNode(sibling) && !($isDecoratorNode(sibling) && (
          // Note: We are only looking for decorators that are inline and not isolated.
          !sibling.isInline() || sibling.isIsolated()))) {
            if (originalTarget === target) {
              target.append(sibling);
            } else {
              target.insertBefore(sibling);
            }
            target = sibling;
          } else if (!$isElementNode(target) && !$isBlockElementNode(sibling)) {
            target.insertBefore(sibling);
            target = sibling;
          } else {
            if ($isElementNode(sibling) && !sibling.canInsertAfter(target)) {
              // @ts-ignore The clone method does exist on the constructor.
              const prevParentClone = prevParent.constructor.clone(prevParent);
              if (!$isElementNode(prevParentClone)) {
                {
                  throw Error(`insertNodes: cloned parent clone is not an element`);
                }
              }
              prevParentClone.append(sibling);
              target.insertAfter(prevParentClone);
            } else {
              target.insertAfter(sibling);
            }
          }
          // Check if the prev parent is empty, as it might need
          // removing.
          if (prevParent.isEmpty() && !prevParent.canBeEmpty()) {
            prevParent.remove();
          }
        }
      }
    } else if (!selectStart) {
      // Handle moving selection to end for other nodes
      if ($isTextNode(target)) {
        target.select();
      } else {
        const element = target.getParentOrThrow();
        const index = target.getIndexWithinParent() + 1;
        element.select(index, index);
      }
    }
    return true;
  }

  /**
   * Inserts a new ParagraphNode into the EditorState at the current Selection
   */
  insertParagraph() {
    if (!this.isCollapsed()) {
      this.removeText();
    }
    const anchor = this.anchor;
    const anchorOffset = anchor.offset;
    let currentElement;
    let nodesToMove = [];
    let siblingsToMove = [];
    if (anchor.type === 'text') {
      const anchorNode = anchor.getNode();
      nodesToMove = anchorNode.getNextSiblings().reverse();
      currentElement = anchorNode.getParentOrThrow();
      const isInline = currentElement.isInline();
      const textContentLength = isInline ? currentElement.getTextContentSize() : anchorNode.getTextContentSize();
      if (anchorOffset === 0) {
        nodesToMove.push(anchorNode);
      } else {
        if (isInline) {
          // For inline nodes, we want to move all the siblings to the new paragraph
          // if selection is at the end, we just move the siblings. Otherwise, we also
          // split the text node and add that and it's siblings below.
          siblingsToMove = currentElement.getNextSiblings();
        }
        if (anchorOffset !== textContentLength) {
          if (!isInline || anchorOffset !== anchorNode.getTextContentSize()) {
            const [, splitNode] = anchorNode.splitText(anchorOffset);
            nodesToMove.push(splitNode);
          }
        }
      }
    } else {
      currentElement = anchor.getNode();
      if ($isRootOrShadowRoot(currentElement)) {
        const paragraph = $createParagraphNode();
        const child = currentElement.getChildAtIndex(anchorOffset);
        paragraph.select();
        if (child !== null) {
          child.insertBefore(paragraph, false);
        } else {
          currentElement.append(paragraph);
        }
        return;
      }
      nodesToMove = currentElement.getChildren().slice(anchorOffset).reverse();
    }
    const nodesToMoveLength = nodesToMove.length;
    if (anchorOffset === 0 && nodesToMoveLength > 0 && currentElement.isInline()) {
      const parent = currentElement.getParentOrThrow();
      const newElement = parent.insertNewAfter(this, false);
      if ($isElementNode(newElement)) {
        const children = parent.getChildren();
        for (let i = 0; i < children.length; i++) {
          newElement.append(children[i]);
        }
      }
      return;
    }
    const newElement = currentElement.insertNewAfter(this, false);
    if (newElement === null) {
      // Handle as a line break insertion
      this.insertLineBreak();
    } else if ($isElementNode(newElement)) {
      // If we're at the beginning of the current element, move the new element to be before the current element
      const currentElementFirstChild = currentElement.getFirstChild();
      const isBeginning = anchorOffset === 0 && (currentElement.is(anchor.getNode()) || currentElementFirstChild && currentElementFirstChild.is(anchor.getNode()));
      if (isBeginning && nodesToMoveLength > 0) {
        currentElement.insertBefore(newElement);
        return;
      }
      let firstChild = null;
      const siblingsToMoveLength = siblingsToMove.length;
      const parent = newElement.getParentOrThrow();
      // For inline elements, we append the siblings to the parent.
      if (siblingsToMoveLength > 0) {
        for (let i = 0; i < siblingsToMoveLength; i++) {
          const siblingToMove = siblingsToMove[i];
          parent.append(siblingToMove);
        }
      }
      if (nodesToMoveLength !== 0) {
        for (let i = 0; i < nodesToMoveLength; i++) {
          const nodeToMove = nodesToMove[i];
          if (firstChild === null) {
            newElement.append(nodeToMove);
          } else {
            firstChild.insertBefore(nodeToMove);
          }
          firstChild = nodeToMove;
        }
      }
      if (!newElement.canBeEmpty() && newElement.getChildrenSize() === 0) {
        newElement.selectPrevious();
        newElement.remove();
      } else {
        newElement.selectStart();
      }
    }
  }

  /**
   * Inserts a logical linebreak, which may be a new LineBreakNode or a new ParagraphNode, into the EditorState at the
   * current Selection.
   *
   * @param selectStart whether or not to select the start of the insertion range after the operation completes.
   */
  insertLineBreak(selectStart) {
    const lineBreakNode = $createLineBreakNode();
    const anchor = this.anchor;
    if (anchor.type === 'element') {
      const element = anchor.getNode();
      if ($isRootNode(element)) {
        this.insertParagraph();
      }
    }
    if (selectStart) {
      this.insertNodes([lineBreakNode], true);
    } else {
      if (this.insertNodes([lineBreakNode])) {
        lineBreakNode.selectNext(0, 0);
      }
    }
  }

  /**
   * Returns the character-based offsets of the Selection, accounting for non-text Points
   * by using the children size or text content.
   *
   * @returns the character offsets for the Selection
   */
  getCharacterOffsets() {
    return getCharacterOffsets(this);
  }

  /**
   * Extracts the nodes in the Selection, splitting nodes where necessary
   * to get offset-level precision.
   *
   * @returns The nodes in the Selection
   */
  extract() {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastIndex = selectedNodesLength - 1;
    const anchor = this.anchor;
    const focus = this.focus;
    let firstNode = selectedNodes[0];
    let lastNode = selectedNodes[lastIndex];
    const [anchorOffset, focusOffset] = getCharacterOffsets(this);
    if (selectedNodesLength === 0) {
      return [];
    } else if (selectedNodesLength === 1) {
      if ($isTextNode(firstNode) && !this.isCollapsed()) {
        const startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
        const endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const node = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        return node != null ? [node] : [];
      }
      return [firstNode];
    }
    const isBefore = anchor.isBefore(focus);
    if ($isTextNode(firstNode)) {
      const startOffset = isBefore ? anchorOffset : focusOffset;
      if (startOffset === firstNode.getTextContentSize()) {
        selectedNodes.shift();
      } else if (startOffset !== 0) {
        [, firstNode] = firstNode.splitText(startOffset);
        selectedNodes[0] = firstNode;
      }
    }
    if ($isTextNode(lastNode)) {
      const lastNodeText = lastNode.getTextContent();
      const lastNodeTextLength = lastNodeText.length;
      const endOffset = isBefore ? focusOffset : anchorOffset;
      if (endOffset === 0) {
        selectedNodes.pop();
      } else if (endOffset !== lastNodeTextLength) {
        [lastNode] = lastNode.splitText(endOffset);
        selectedNodes[lastIndex] = lastNode;
      }
    }
    return selectedNodes;
  }

  /**
   * Modifies the Selection according to the parameters and a set of heuristics that account for
   * various node types. Can be used to safely move or extend selection by one logical "unit" without
   * dealing explicitly with all the possible node types.
   *
   * @param alter the type of modification to perform
   * @param isBackward whether or not selection is backwards
   * @param granularity the granularity at which to apply the modification
   */
  modify(alter, isBackward, granularity) {
    const focus = this.focus;
    const anchor = this.anchor;
    const collapse = alter === 'move';

    // Handle the selection movement around decorators.
    const possibleNode = $getAdjacentNode(focus, isBackward);
    if ($isDecoratorNode(possibleNode) && !possibleNode.isIsolated()) {
      // Make it possible to move selection from range selection to
      // node selection on the node.
      if (collapse && possibleNode.isKeyboardSelectable()) {
        const nodeSelection = $createNodeSelection();
        nodeSelection.add(possibleNode.__key);
        $setSelection(nodeSelection);
        return;
      }
      const sibling = isBackward ? possibleNode.getPreviousSibling() : possibleNode.getNextSibling();
      if (!$isTextNode(sibling)) {
        const parent = possibleNode.getParentOrThrow();
        let offset;
        let elementKey;
        if ($isElementNode(sibling)) {
          elementKey = sibling.__key;
          offset = isBackward ? sibling.getChildrenSize() : 0;
        } else {
          offset = possibleNode.getIndexWithinParent();
          elementKey = parent.__key;
          if (!isBackward) {
            offset++;
          }
        }
        focus.set(elementKey, offset, 'element');
        if (collapse) {
          anchor.set(elementKey, offset, 'element');
        }
        return;
      } else {
        const siblingKey = sibling.__key;
        const offset = isBackward ? sibling.getTextContent().length : 0;
        focus.set(siblingKey, offset, 'text');
        if (collapse) {
          anchor.set(siblingKey, offset, 'text');
        }
        return;
      }
    }
    const editor = getActiveEditor();
    const domSelection = getDOMSelection(editor._window);
    if (!domSelection) {
      return;
    }
    const blockCursorElement = editor._blockCursorElement;
    const rootElement = editor._rootElement;
    // Remove the block cursor element if it exists. This will ensure selection
    // works as intended. If we leave it in the DOM all sorts of strange bugs
    // occur. :/
    if (rootElement !== null && blockCursorElement !== null && $isElementNode(possibleNode) && !possibleNode.isInline() && !possibleNode.canBeEmpty()) {
      removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
    }
    // We use the DOM selection.modify API here to "tell" us what the selection
    // will be. We then use it to update the Lexical selection accordingly. This
    // is much more reliable than waiting for a beforeinput and using the ranges
    // from getTargetRanges(), and is also better than trying to do it ourselves
    // using Intl.Segmenter or other workarounds that struggle with word segments
    // and line segments (especially with word wrapping and non-Roman languages).
    moveNativeSelection(domSelection, alter, isBackward ? 'backward' : 'forward', granularity);
    // Guard against no ranges
    if (domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0);
      // Apply the DOM selection to our Lexical selection.
      const anchorNode = this.anchor.getNode();
      const root = $isRootNode(anchorNode) ? anchorNode : $getNearestRootOrShadowRoot(anchorNode);
      this.applyDOMRange(range);
      this.dirty = true;
      if (!collapse) {
        // Validate selection; make sure that the new extended selection respects shadow roots
        const nodes = this.getNodes();
        const validNodes = [];
        let shrinkSelection = false;
        for (let i = 0; i < nodes.length; i++) {
          const nextNode = nodes[i];
          if ($hasAncestor(nextNode, root)) {
            validNodes.push(nextNode);
          } else {
            shrinkSelection = true;
          }
        }
        if (shrinkSelection && validNodes.length > 0) {
          // validNodes length check is a safeguard against an invalid selection; as getNodes()
          // will return an empty array in this case
          if (isBackward) {
            const firstValidNode = validNodes[0];
            if ($isElementNode(firstValidNode)) {
              firstValidNode.selectStart();
            } else {
              firstValidNode.getParentOrThrow().selectStart();
            }
          } else {
            const lastValidNode = validNodes[validNodes.length - 1];
            if ($isElementNode(lastValidNode)) {
              lastValidNode.selectEnd();
            } else {
              lastValidNode.getParentOrThrow().selectEnd();
            }
          }
        }

        // Because a range works on start and end, we might need to flip
        // the anchor and focus points to match what the DOM has, not what
        // the range has specifically.
        if (domSelection.anchorNode !== range.startContainer || domSelection.anchorOffset !== range.startOffset) {
          $swapPoints(this);
        }
      }
    }
  }

  /**
   * Performs one logical character deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteCharacter(isBackward) {
    const wasCollapsed = this.isCollapsed();
    if (this.isCollapsed()) {
      const anchor = this.anchor;
      const focus = this.focus;
      let anchorNode = anchor.getNode();
      if (!isBackward && (
      // Delete forward handle case
      anchor.type === 'element' && $isElementNode(anchorNode) && anchor.offset === anchorNode.getChildrenSize() || anchor.type === 'text' && anchor.offset === anchorNode.getTextContentSize())) {
        const parent = anchorNode.getParent();
        const nextSibling = anchorNode.getNextSibling() || (parent === null ? null : parent.getNextSibling());
        if ($isElementNode(nextSibling) && nextSibling.isShadowRoot()) {
          return;
        }
      }
      // Handle the deletion around decorators.
      const possibleNode = $getAdjacentNode(focus, isBackward);
      if ($isDecoratorNode(possibleNode) && !possibleNode.isIsolated()) {
        // Make it possible to move selection from range selection to
        // node selection on the node.
        if (possibleNode.isKeyboardSelectable() && $isElementNode(anchorNode) && anchorNode.getChildrenSize() === 0) {
          anchorNode.remove();
          const nodeSelection = $createNodeSelection();
          nodeSelection.add(possibleNode.__key);
          $setSelection(nodeSelection);
        } else {
          possibleNode.remove();
          const editor = getActiveEditor();
          editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
        }
        return;
      } else if (!isBackward && $isElementNode(possibleNode) && $isElementNode(anchorNode) && anchorNode.isEmpty()) {
        anchorNode.remove();
        possibleNode.selectStart();
        return;
      }
      this.modify('extend', isBackward, 'character');
      if (!this.isCollapsed()) {
        const focusNode = focus.type === 'text' ? focus.getNode() : null;
        anchorNode = anchor.type === 'text' ? anchor.getNode() : null;
        if (focusNode !== null && focusNode.isSegmented()) {
          const offset = focus.offset;
          const textContentSize = focusNode.getTextContentSize();
          if (focusNode.is(anchorNode) || isBackward && offset !== textContentSize || !isBackward && offset !== 0) {
            $removeSegment(focusNode, isBackward, offset);
            return;
          }
        } else if (anchorNode !== null && anchorNode.isSegmented()) {
          const offset = anchor.offset;
          const textContentSize = anchorNode.getTextContentSize();
          if (anchorNode.is(focusNode) || isBackward && offset !== 0 || !isBackward && offset !== textContentSize) {
            $removeSegment(anchorNode, isBackward, offset);
            return;
          }
        }
        $updateCaretSelectionForUnicodeCharacter(this, isBackward);
      } else if (isBackward && anchor.offset === 0) {
        // Special handling around rich text nodes
        const element = anchor.type === 'element' ? anchor.getNode() : anchor.getNode().getParentOrThrow();
        if (element.collapseAtStart(this)) {
          return;
        }
      }
    }
    this.removeText();
    if (isBackward && !wasCollapsed && this.isCollapsed() && this.anchor.type === 'element' && this.anchor.offset === 0) {
      const anchorNode = this.anchor.getNode();
      if (anchorNode.isEmpty() && $isRootNode(anchorNode.getParent()) && anchorNode.getIndexWithinParent() === 0) {
        anchorNode.collapseAtStart(this);
      }
    }
  }

  /**
   * Performs one logical line deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteLine(isBackward) {
    if (this.isCollapsed()) {
      if (this.anchor.type === 'text') {
        this.modify('extend', isBackward, 'lineboundary');
      }

      // If selection is extended to cover text edge then extend it one character more
      // to delete its parent element. Otherwise text content will be deleted but empty
      // parent node will remain
      const endPoint = isBackward ? this.focus : this.anchor;
      if (endPoint.offset === 0) {
        this.modify('extend', isBackward, 'character');
      }
    }
    this.removeText();
  }

  /**
   * Performs one logical word deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteWord(isBackward) {
    if (this.isCollapsed()) {
      this.modify('extend', isBackward, 'word');
    }
    this.removeText();
  }
}
function $isNodeSelection(x) {
  return x instanceof NodeSelection;
}
function getCharacterOffset(point) {
  const offset = point.offset;
  if (point.type === 'text') {
    return offset;
  }
  const parent = point.getNode();
  return offset === parent.getChildrenSize() ? parent.getTextContent().length : 0;
}
function getCharacterOffsets(selection) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  if (anchor.type === 'element' && focus.type === 'element' && anchor.key === focus.key && anchor.offset === focus.offset) {
    return [0, 0];
  }
  return [getCharacterOffset(anchor), getCharacterOffset(focus)];
}
function $swapPoints(selection) {
  const focus = selection.focus;
  const anchor = selection.anchor;
  const anchorKey = anchor.key;
  const anchorOffset = anchor.offset;
  const anchorType = anchor.type;
  $setPointValues(anchor, focus.key, focus.offset, focus.type);
  $setPointValues(focus, anchorKey, anchorOffset, anchorType);
  selection._cachedNodes = null;
}
function moveNativeSelection(domSelection, alter, direction, granularity) {
  // Selection.modify() method applies a change to the current selection or cursor position,
  // but is still non-standard in some browsers.
  domSelection.modify(alter, direction, granularity);
}
function $updateCaretSelectionForUnicodeCharacter(selection, isBackward) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (anchorNode === focusNode && anchor.type === 'text' && focus.type === 'text') {
    // Handling of multibyte characters
    const anchorOffset = anchor.offset;
    const focusOffset = focus.offset;
    const isBefore = anchorOffset < focusOffset;
    const startOffset = isBefore ? anchorOffset : focusOffset;
    const endOffset = isBefore ? focusOffset : anchorOffset;
    const characterOffset = endOffset - 1;
    if (startOffset !== characterOffset) {
      const text = anchorNode.getTextContent().slice(startOffset, endOffset);
      if (!doesContainGrapheme(text)) {
        if (isBackward) {
          focus.offset = characterOffset;
        } else {
          anchor.offset = characterOffset;
        }
      }
    }
  }
}
function $removeSegment(node, isBackward, offset) {
  const textNode = node;
  const textContent = textNode.getTextContent();
  const split = textContent.split(/(?=\s)/g);
  const splitLength = split.length;
  let segmentOffset = 0;
  let restoreOffset = 0;
  for (let i = 0; i < splitLength; i++) {
    const text = split[i];
    const isLast = i === splitLength - 1;
    restoreOffset = segmentOffset;
    segmentOffset += text.length;
    if (isBackward && segmentOffset === offset || segmentOffset > offset || isLast) {
      split.splice(i, 1);
      if (isLast) {
        restoreOffset = undefined;
      }
      break;
    }
  }
  const nextTextContent = split.join('').trim();
  if (nextTextContent === '') {
    textNode.remove();
  } else {
    textNode.setTextContent(nextTextContent);
    textNode.select(restoreOffset, restoreOffset);
  }
}
function shouldResolveAncestor(resolvedElement, resolvedOffset, lastPoint) {
  const parent = resolvedElement.getParent();
  return lastPoint === null || parent === null || !parent.canBeEmpty() || parent !== lastPoint.getNode();
}
function internalResolveSelectionPoint(dom, offset, lastPoint, editor) {
  let resolvedOffset = offset;
  let resolvedNode;
  // If we have selection on an element, we will
  // need to figure out (using the offset) what text
  // node should be selected.

  if (dom.nodeType === DOM_ELEMENT_TYPE) {
    // Resolve element to a ElementNode, or TextNode, or null
    let moveSelectionToEnd = false;
    // Given we're moving selection to another node, selection is
    // definitely dirty.
    // We use the anchor to find which child node to select
    const childNodes = dom.childNodes;
    const childNodesLength = childNodes.length;
    // If the anchor is the same as length, then this means we
    // need to select the very last text node.
    if (resolvedOffset === childNodesLength) {
      moveSelectionToEnd = true;
      resolvedOffset = childNodesLength - 1;
    }
    let childDOM = childNodes[resolvedOffset];
    let hasBlockCursor = false;
    if (childDOM === editor._blockCursorElement) {
      childDOM = childNodes[resolvedOffset + 1];
      hasBlockCursor = true;
    } else if (editor._blockCursorElement !== null) {
      resolvedOffset--;
    }
    resolvedNode = getNodeFromDOM(childDOM);
    if ($isTextNode(resolvedNode)) {
      resolvedOffset = getTextNodeOffset(resolvedNode, moveSelectionToEnd);
    } else {
      let resolvedElement = getNodeFromDOM(dom);
      // Ensure resolvedElement is actually a element.
      if (resolvedElement === null) {
        return null;
      }
      if ($isElementNode(resolvedElement)) {
        let child = resolvedElement.getChildAtIndex(resolvedOffset);
        if ($isElementNode(child) && shouldResolveAncestor(child, resolvedOffset, lastPoint)) {
          const descendant = moveSelectionToEnd ? child.getLastDescendant() : child.getFirstDescendant();
          if (descendant === null) {
            resolvedElement = child;
            resolvedOffset = 0;
          } else {
            child = descendant;
            resolvedElement = $isElementNode(child) ? child : child.getParentOrThrow();
          }
        }
        if ($isTextNode(child)) {
          resolvedNode = child;
          resolvedElement = null;
          resolvedOffset = getTextNodeOffset(child, moveSelectionToEnd);
        } else if (child !== resolvedElement && moveSelectionToEnd && !hasBlockCursor) {
          resolvedOffset++;
        }
      } else {
        const index = resolvedElement.getIndexWithinParent();
        // When selecting decorators, there can be some selection issues when using resolvedOffset,
        // and instead we should be checking if we're using the offset
        if (offset === 0 && $isDecoratorNode(resolvedElement) && getNodeFromDOM(dom) === resolvedElement) {
          resolvedOffset = index;
        } else {
          resolvedOffset = index + 1;
        }
        resolvedElement = resolvedElement.getParentOrThrow();
      }
      if ($isElementNode(resolvedElement)) {
        return $createPoint(resolvedElement.__key, resolvedOffset, 'element');
      }
    }
  } else {
    // TextNode or null
    resolvedNode = getNodeFromDOM(dom);
  }
  if (!$isTextNode(resolvedNode)) {
    return null;
  }
  return $createPoint(resolvedNode.__key, resolvedOffset, 'text');
}
function resolveSelectionPointOnBoundary(point, isBackward, isCollapsed) {
  const offset = point.offset;
  const node = point.getNode();
  if (offset === 0) {
    const prevSibling = node.getPreviousSibling();
    const parent = node.getParent();
    if (!isBackward) {
      if ($isElementNode(prevSibling) && !isCollapsed && prevSibling.isInline()) {
        point.key = prevSibling.__key;
        point.offset = prevSibling.getChildrenSize();
        // @ts-expect-error: intentional
        point.type = 'element';
      } else if ($isTextNode(prevSibling)) {
        point.key = prevSibling.__key;
        point.offset = prevSibling.getTextContent().length;
      }
    } else if ((isCollapsed || !isBackward) && prevSibling === null && $isElementNode(parent) && parent.isInline()) {
      const parentSibling = parent.getPreviousSibling();
      if ($isTextNode(parentSibling)) {
        point.key = parentSibling.__key;
        point.offset = parentSibling.getTextContent().length;
      }
    }
  } else if (offset === node.getTextContent().length) {
    const nextSibling = node.getNextSibling();
    const parent = node.getParent();
    if (isBackward && $isElementNode(nextSibling) && nextSibling.isInline()) {
      point.key = nextSibling.__key;
      point.offset = 0;
      // @ts-expect-error: intentional
      point.type = 'element';
    } else if ((isCollapsed || isBackward) && nextSibling === null && $isElementNode(parent) && parent.isInline() && !parent.canInsertTextAfter()) {
      const parentSibling = parent.getNextSibling();
      if ($isTextNode(parentSibling)) {
        point.key = parentSibling.__key;
        point.offset = 0;
      }
    }
  }
}
function normalizeSelectionPointsForBoundaries(anchor, focus, lastSelection) {
  if (anchor.type === 'text' && focus.type === 'text') {
    const isBackward = anchor.isBefore(focus);
    const isCollapsed = anchor.is(focus);

    // Attempt to normalize the offset to the previous sibling if we're at the
    // start of a text node and the sibling is a text node or inline element.
    resolveSelectionPointOnBoundary(anchor, isBackward, isCollapsed);
    resolveSelectionPointOnBoundary(focus, !isBackward, isCollapsed);
    if (isCollapsed) {
      focus.key = anchor.key;
      focus.offset = anchor.offset;
      focus.type = anchor.type;
    }
    const editor = getActiveEditor();
    if (editor.isComposing() && editor._compositionKey !== anchor.key && $isRangeSelection(lastSelection)) {
      const lastAnchor = lastSelection.anchor;
      const lastFocus = lastSelection.focus;
      $setPointValues(anchor, lastAnchor.key, lastAnchor.offset, lastAnchor.type);
      $setPointValues(focus, lastFocus.key, lastFocus.offset, lastFocus.type);
    }
  }
}
function internalResolveSelectionPoints(anchorDOM, anchorOffset, focusDOM, focusOffset, editor, lastSelection) {
  if (anchorDOM === null || focusDOM === null || !isSelectionWithinEditor(editor, anchorDOM, focusDOM)) {
    return null;
  }
  const resolvedAnchorPoint = internalResolveSelectionPoint(anchorDOM, anchorOffset, $isRangeSelection(lastSelection) ? lastSelection.anchor : null, editor);
  if (resolvedAnchorPoint === null) {
    return null;
  }
  const resolvedFocusPoint = internalResolveSelectionPoint(focusDOM, focusOffset, $isRangeSelection(lastSelection) ? lastSelection.focus : null, editor);
  if (resolvedFocusPoint === null) {
    return null;
  }
  if (resolvedAnchorPoint.type === 'element' && resolvedFocusPoint.type === 'element') {
    const anchorNode = getNodeFromDOM(anchorDOM);
    const focusNode = getNodeFromDOM(focusDOM);
    // Ensure if we're selecting the content of a decorator that we
    // return null for this point, as it's not in the controlled scope
    // of Lexical.
    if ($isDecoratorNode(anchorNode) && $isDecoratorNode(focusNode)) {
      return null;
    }
  }

  // Handle normalization of selection when it is at the boundaries.
  normalizeSelectionPointsForBoundaries(resolvedAnchorPoint, resolvedFocusPoint, lastSelection);
  return [resolvedAnchorPoint, resolvedFocusPoint];
}
function $isBlockElementNode(node) {
  return $isElementNode(node) && !node.isInline();
}

// This is used to make a selection when the existing
// selection is null, i.e. forcing selection on the editor
// when it current exists outside the editor.

function internalMakeRangeSelection(anchorKey, anchorOffset, focusKey, focusOffset, anchorType, focusType) {
  const editorState = getActiveEditorState();
  const selection = new RangeSelection($createPoint(anchorKey, anchorOffset, anchorType), $createPoint(focusKey, focusOffset, focusType), 0, '');
  selection.dirty = true;
  editorState._selection = selection;
  return selection;
}
function $createRangeSelection() {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new RangeSelection(anchor, focus, 0, '');
}
function $createNodeSelection() {
  return new NodeSelection(new Set());
}
function DEPRECATED_$createGridSelection() {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new GridSelection('root', anchor, focus);
}
function internalCreateSelection(editor) {
  const currentEditorState = editor.getEditorState();
  const lastSelection = currentEditorState._selection;
  const domSelection = getDOMSelection(editor._window);
  if ($isNodeSelection(lastSelection) || DEPRECATED_$isGridSelection(lastSelection)) {
    return lastSelection.clone();
  }
  return internalCreateRangeSelection(lastSelection, domSelection, editor);
}
function internalCreateRangeSelection(lastSelection, domSelection, editor) {
  const windowObj = editor._window;
  if (windowObj === null) {
    return null;
  }
  // When we create a selection, we try to use the previous
  // selection where possible, unless an actual user selection
  // change has occurred. When we do need to create a new selection
  // we validate we can have text nodes for both anchor and focus
  // nodes. If that holds true, we then return that selection
  // as a mutable object that we use for the editor state for this
  // update cycle. If a selection gets changed, and requires a
  // update to native DOM selection, it gets marked as "dirty".
  // If the selection changes, but matches with the existing
  // DOM selection, then we only need to sync it. Otherwise,
  // we generally bail out of doing an update to selection during
  // reconciliation unless there are dirty nodes that need
  // reconciling.

  const windowEvent = windowObj.event;
  const eventType = windowEvent ? windowEvent.type : undefined;
  const isSelectionChange = eventType === 'selectionchange';
  const useDOMSelection = !getIsProcesssingMutations() && (isSelectionChange || eventType === 'beforeinput' || eventType === 'compositionstart' || eventType === 'compositionend' || eventType === 'click' && windowEvent && windowEvent.detail === 3 || eventType === 'drop' || eventType === undefined);
  let anchorDOM, focusDOM, anchorOffset, focusOffset;
  if (!$isRangeSelection(lastSelection) || useDOMSelection) {
    if (domSelection === null) {
      return null;
    }
    anchorDOM = domSelection.anchorNode;
    focusDOM = domSelection.focusNode;
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
    if (isSelectionChange && $isRangeSelection(lastSelection) && !isSelectionWithinEditor(editor, anchorDOM, focusDOM)) {
      return lastSelection.clone();
    }
  } else {
    return lastSelection.clone();
  }
  // Let's resolve the text nodes from the offsets and DOM nodes we have from
  // native selection.
  const resolvedSelectionPoints = internalResolveSelectionPoints(anchorDOM, anchorOffset, focusDOM, focusOffset, editor, lastSelection);
  if (resolvedSelectionPoints === null) {
    return null;
  }
  const [resolvedAnchorPoint, resolvedFocusPoint] = resolvedSelectionPoints;
  return new RangeSelection(resolvedAnchorPoint, resolvedFocusPoint, !$isRangeSelection(lastSelection) ? 0 : lastSelection.format, !$isRangeSelection(lastSelection) ? '' : lastSelection.style);
}
function $getSelection() {
  const editorState = getActiveEditorState();
  return editorState._selection;
}
function $getPreviousSelection() {
  const editor = getActiveEditor();
  return editor._editorState._selection;
}
function $updateElementSelectionOnCreateDeleteNode(selection, parentNode, nodeOffset, times = 1) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (!parentNode.is(anchorNode) && !parentNode.is(focusNode)) {
    return;
  }
  const parentKey = parentNode.__key;
  // Single node. We shift selection but never redimension it
  if (selection.isCollapsed()) {
    const selectionOffset = anchor.offset;
    if (nodeOffset <= selectionOffset && times > 0 || nodeOffset < selectionOffset && times < 0) {
      const newSelectionOffset = Math.max(0, selectionOffset + times);
      anchor.set(parentKey, newSelectionOffset, 'element');
      focus.set(parentKey, newSelectionOffset, 'element');
      // The new selection might point to text nodes, try to resolve them
      $updateSelectionResolveTextNodes(selection);
    }
  } else {
    // Multiple nodes selected. We shift or redimension selection
    const isBackward = selection.isBackward();
    const firstPoint = isBackward ? focus : anchor;
    const firstPointNode = firstPoint.getNode();
    const lastPoint = isBackward ? anchor : focus;
    const lastPointNode = lastPoint.getNode();
    if (parentNode.is(firstPointNode)) {
      const firstPointOffset = firstPoint.offset;
      if (nodeOffset <= firstPointOffset && times > 0 || nodeOffset < firstPointOffset && times < 0) {
        firstPoint.set(parentKey, Math.max(0, firstPointOffset + times), 'element');
      }
    }
    if (parentNode.is(lastPointNode)) {
      const lastPointOffset = lastPoint.offset;
      if (nodeOffset <= lastPointOffset && times > 0 || nodeOffset < lastPointOffset && times < 0) {
        lastPoint.set(parentKey, Math.max(0, lastPointOffset + times), 'element');
      }
    }
  }
  // The new selection might point to text nodes, try to resolve them
  $updateSelectionResolveTextNodes(selection);
}
function $updateSelectionResolveTextNodes(selection) {
  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const focus = selection.focus;
  const focusOffset = focus.offset;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (selection.isCollapsed()) {
    if (!$isElementNode(anchorNode)) {
      return;
    }
    const childSize = anchorNode.getChildrenSize();
    const anchorOffsetAtEnd = anchorOffset >= childSize;
    const child = anchorOffsetAtEnd ? anchorNode.getChildAtIndex(childSize - 1) : anchorNode.getChildAtIndex(anchorOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      anchor.set(child.__key, newOffset, 'text');
      focus.set(child.__key, newOffset, 'text');
    }
    return;
  }
  if ($isElementNode(anchorNode)) {
    const childSize = anchorNode.getChildrenSize();
    const anchorOffsetAtEnd = anchorOffset >= childSize;
    const child = anchorOffsetAtEnd ? anchorNode.getChildAtIndex(childSize - 1) : anchorNode.getChildAtIndex(anchorOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      anchor.set(child.__key, newOffset, 'text');
    }
  }
  if ($isElementNode(focusNode)) {
    const childSize = focusNode.getChildrenSize();
    const focusOffsetAtEnd = focusOffset >= childSize;
    const child = focusOffsetAtEnd ? focusNode.getChildAtIndex(childSize - 1) : focusNode.getChildAtIndex(focusOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (focusOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      focus.set(child.__key, newOffset, 'text');
    }
  }
}
function applySelectionTransforms(nextEditorState, editor) {
  const prevEditorState = editor.getEditorState();
  const prevSelection = prevEditorState._selection;
  const nextSelection = nextEditorState._selection;
  if ($isRangeSelection(nextSelection)) {
    const anchor = nextSelection.anchor;
    const focus = nextSelection.focus;
    let anchorNode;
    if (anchor.type === 'text') {
      anchorNode = anchor.getNode();
      anchorNode.selectionTransform(prevSelection, nextSelection);
    }
    if (focus.type === 'text') {
      const focusNode = focus.getNode();
      if (anchorNode !== focusNode) {
        focusNode.selectionTransform(prevSelection, nextSelection);
      }
    }
  }
}
function moveSelectionPointToSibling(point, node, parent, prevSibling, nextSibling) {
  let siblingKey = null;
  let offset = 0;
  let type = null;
  if (prevSibling !== null) {
    siblingKey = prevSibling.__key;
    if ($isTextNode(prevSibling)) {
      offset = prevSibling.getTextContentSize();
      type = 'text';
    } else if ($isElementNode(prevSibling)) {
      offset = prevSibling.getChildrenSize();
      type = 'element';
    }
  } else {
    if (nextSibling !== null) {
      siblingKey = nextSibling.__key;
      if ($isTextNode(nextSibling)) {
        type = 'text';
      } else if ($isElementNode(nextSibling)) {
        type = 'element';
      }
    }
  }
  if (siblingKey !== null && type !== null) {
    point.set(siblingKey, offset, type);
  } else {
    offset = node.getIndexWithinParent();
    if (offset === -1) {
      // Move selection to end of parent
      offset = parent.getChildrenSize();
    }
    point.set(parent.__key, offset, 'element');
  }
}
function adjustPointOffsetForMergedSibling(point, isBefore, key, target, textLength) {
  if (point.type === 'text') {
    point.key = key;
    if (!isBefore) {
      point.offset += textLength;
    }
  } else if (point.offset > target.getIndexWithinParent()) {
    point.offset -= 1;
  }
}
function updateDOMSelection(prevSelection, nextSelection, editor, domSelection, tags, rootElement, nodeCount) {
  const anchorDOMNode = domSelection.anchorNode;
  const focusDOMNode = domSelection.focusNode;
  const anchorOffset = domSelection.anchorOffset;
  const focusOffset = domSelection.focusOffset;
  const activeElement = document.activeElement;

  // TODO: make this not hard-coded, and add another config option
  // that makes this configurable.
  if (tags.has('collaboration') && activeElement !== rootElement || activeElement !== null && isSelectionCapturedInDecoratorInput(activeElement)) {
    return;
  }
  if (!$isRangeSelection(nextSelection)) {
    // We don't remove selection if the prevSelection is null because
    // of editor.setRootElement(). If this occurs on init when the
    // editor is already focused, then this can cause the editor to
    // lose focus.
    if (prevSelection !== null && isSelectionWithinEditor(editor, anchorDOMNode, focusDOMNode)) {
      domSelection.removeAllRanges();
    }
    return;
  }
  const anchor = nextSelection.anchor;
  const focus = nextSelection.focus;
  const anchorKey = anchor.key;
  const focusKey = focus.key;
  const anchorDOM = getElementByKeyOrThrow(editor, anchorKey);
  const focusDOM = getElementByKeyOrThrow(editor, focusKey);
  const nextAnchorOffset = anchor.offset;
  const nextFocusOffset = focus.offset;
  const nextFormat = nextSelection.format;
  const nextStyle = nextSelection.style;
  const isCollapsed = nextSelection.isCollapsed();
  let nextAnchorNode = anchorDOM;
  let nextFocusNode = focusDOM;
  let anchorFormatOrStyleChanged = false;
  if (anchor.type === 'text') {
    nextAnchorNode = getDOMTextNode(anchorDOM);
    const anchorNode = anchor.getNode();
    anchorFormatOrStyleChanged = anchorNode.getFormat() !== nextFormat || anchorNode.getStyle() !== nextStyle;
  } else if ($isRangeSelection(prevSelection) && prevSelection.anchor.type === 'text') {
    anchorFormatOrStyleChanged = true;
  }
  if (focus.type === 'text') {
    nextFocusNode = getDOMTextNode(focusDOM);
  }

  // If we can't get an underlying text node for selection, then
  // we should avoid setting selection to something incorrect.
  if (nextAnchorNode === null || nextFocusNode === null) {
    return;
  }
  if (isCollapsed && (prevSelection === null || anchorFormatOrStyleChanged || $isRangeSelection(prevSelection) && (prevSelection.format !== nextFormat || prevSelection.style !== nextStyle))) {
    markCollapsedSelectionFormat(nextFormat, nextStyle, nextAnchorOffset, anchorKey, performance.now());
  }

  // Diff against the native DOM selection to ensure we don't do
  // an unnecessary selection update. We also skip this check if
  // we're moving selection to within an element, as this can
  // sometimes be problematic around scrolling.
  if (anchorOffset === nextAnchorOffset && focusOffset === nextFocusOffset && anchorDOMNode === nextAnchorNode && focusDOMNode === nextFocusNode &&
  // Badly interpreted range selection when collapsed - #1482
  !(domSelection.type === 'Range' && isCollapsed)) {
    // If the root element does not have focus, ensure it has focus
    if (activeElement === null || !rootElement.contains(activeElement)) {
      rootElement.focus({
        preventScroll: true
      });
    }
    if (anchor.type !== 'element') {
      return;
    }
  }

  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  try {
    domSelection.setBaseAndExtent(nextAnchorNode, nextAnchorOffset, nextFocusNode, nextFocusOffset);
  } catch (error) {
    // If we encounter an error, continue. This can sometimes
    // occur with FF and there's no good reason as to why it
    // should happen.
  }
  if (!tags.has('skip-scroll-into-view') && nextSelection.isCollapsed() && rootElement !== null && rootElement === document.activeElement) {
    const selectionTarget = nextSelection instanceof RangeSelection && nextSelection.anchor.type === 'element' ? nextAnchorNode.childNodes[nextAnchorOffset] || null : domSelection.rangeCount > 0 ? domSelection.getRangeAt(0) : null;
    if (selectionTarget !== null) {
      let selectionRect;
      if (selectionTarget instanceof Text) {
        const range = document.createRange();
        range.selectNode(selectionTarget);
        selectionRect = range.getBoundingClientRect();
      } else {
        selectionRect = selectionTarget.getBoundingClientRect();
      }
      scrollIntoViewIfNeeded(editor, selectionRect, rootElement);
    }
  }
  markSelectionChangeFromDOMUpdate();
}
function $insertNodes(nodes, selectStart) {
  let selection = $getSelection() || $getPreviousSelection();
  if (selection === null) {
    selection = $getRoot().selectEnd();
  }
  return selection.insertNodes(nodes, selectStart);
}
function $getTextContent() {
  const selection = $getSelection();
  if (selection === null) {
    return '';
  }
  return selection.getTextContent();
}
function DEPRECATED_$computeGridMap(grid, cellA, cellB) {
  const tableMap = [];
  let cellAValue = null;
  let cellBValue = null;
  function write(startRow, startColumn, cell) {
    const value = {
      cell,
      startColumn,
      startRow
    };
    const rowSpan = cell.__rowSpan;
    const colSpan = cell.__colSpan;
    for (let i = 0; i < rowSpan; i++) {
      if (tableMap[startRow + i] === undefined) {
        tableMap[startRow + i] = [];
      }
      for (let j = 0; j < colSpan; j++) {
        tableMap[startRow + i][startColumn + j] = value;
      }
    }
    if (cellA.is(cell)) {
      cellAValue = value;
    }
    if (cellB.is(cell)) {
      cellBValue = value;
    }
  }
  function isEmpty(row, column) {
    return tableMap[row] === undefined || tableMap[row][column] === undefined;
  }
  const gridChildren = grid.getChildren();
  for (let i = 0; i < gridChildren.length; i++) {
    const row = gridChildren[i];
    if (!DEPRECATED_$isGridRowNode(row)) {
      throw Error(`Expected GridNode children to be GridRowNode`);
    }
    const rowChildren = row.getChildren();
    let j = 0;
    for (const cell of rowChildren) {
      if (!DEPRECATED_$isGridCellNode(cell)) {
        throw Error(`Expected GridRowNode children to be GridCellNode`);
      }
      while (!isEmpty(i, j)) {
        j++;
      }
      write(i, j, cell);
      j += cell.__colSpan;
    }
  }
  if (!(cellAValue !== null)) {
    throw Error(`Anchor not found in Grid`);
  }
  if (!(cellBValue !== null)) {
    throw Error(`Focus not found in Grid`);
  }
  return [tableMap, cellAValue, cellBValue];
}
function DEPRECATED_$getNodeTriplet(source) {
  let cell;
  if (source instanceof DEPRECATED_GridCellNode) {
    cell = source;
  } else if (source instanceof LexicalNode) {
    const cell_ = $findMatchingParent(source, DEPRECATED_$isGridCellNode);
    if (!DEPRECATED_$isGridCellNode(cell_)) {
      throw Error(`Expected to find a parent GridCellNode`);
    }
    cell = cell_;
  } else {
    const cell_ = $findMatchingParent(source.getNode(), DEPRECATED_$isGridCellNode);
    if (!DEPRECATED_$isGridCellNode(cell_)) {
      throw Error(`Expected to find a parent GridCellNode`);
    }
    cell = cell_;
  }
  const row = cell.getParent();
  if (!DEPRECATED_$isGridRowNode(row)) {
    throw Error(`Expected GridCellNode to have a parent GridRowNode`);
  }
  const grid = row.getParent();
  if (!DEPRECATED_$isGridNode(grid)) {
    throw Error(`Expected GridRowNode to have a parent GridNode`);
  }
  return [cell, row, grid];
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
let activeEditorState = null;
let activeEditor = null;
let isReadOnlyMode = false;
let isAttemptingToRecoverFromReconcilerError = false;
let infiniteTransformCount = 0;
const observerOptions = {
  characterData: true,
  childList: true,
  subtree: true
};
function isCurrentlyReadOnlyMode() {
  return isReadOnlyMode || activeEditorState !== null && activeEditorState._readOnly;
}
function errorOnReadOnly() {
  if (isReadOnlyMode) {
    {
      throw Error(`Cannot use method in read-only mode.`);
    }
  }
}
function errorOnInfiniteTransforms() {
  if (infiniteTransformCount > 99) {
    {
      throw Error(`One or more transforms are endlessly triggering additional transforms. May have encountered infinite recursion caused by transforms that have their preconditions too lose and/or conflict with each other.`);
    }
  }
}
function getActiveEditorState() {
  if (activeEditorState === null) {
    {
      throw Error(`Unable to find an active editor state. State helpers or node methods can only be used synchronously during the callback of editor.update() or editorState.read().`);
    }
  }
  return activeEditorState;
}
function getActiveEditor() {
  if (activeEditor === null) {
    {
      throw Error(`Unable to find an active editor. This method can only be used synchronously during the callback of editor.update().`);
    }
  }
  return activeEditor;
}
function internalGetActiveEditor() {
  return activeEditor;
}
function $applyTransforms(editor, node, transformsCache) {
  const type = node.__type;
  const registeredNode = getRegisteredNodeOrThrow(editor, type);
  let transformsArr = transformsCache.get(type);
  if (transformsArr === undefined) {
    transformsArr = Array.from(registeredNode.transforms);
    transformsCache.set(type, transformsArr);
  }
  const transformsArrLength = transformsArr.length;
  for (let i = 0; i < transformsArrLength; i++) {
    transformsArr[i](node);
    if (!node.isAttached()) {
      break;
    }
  }
}
function $isNodeValidForTransform(node, compositionKey) {
  return node !== undefined &&
  // We don't want to transform nodes being composed
  node.__key !== compositionKey && node.isAttached();
}
function $normalizeAllDirtyTextNodes(editorState, editor) {
  const dirtyLeaves = editor._dirtyLeaves;
  const nodeMap = editorState._nodeMap;
  for (const nodeKey of dirtyLeaves) {
    const node = nodeMap.get(nodeKey);
    if ($isTextNode(node) && node.isAttached() && node.isSimpleText() && !node.isUnmergeable()) {
      $normalizeTextNode(node);
    }
  }
}

/**
 * Transform heuristic:
 * 1. We transform leaves first. If transforms generate additional dirty nodes we repeat step 1.
 * The reasoning behind this is that marking a leaf as dirty marks all its parent elements as dirty too.
 * 2. We transform elements. If element transforms generate additional dirty nodes we repeat step 1.
 * If element transforms only generate additional dirty elements we only repeat step 2.
 *
 * Note that to keep track of newly dirty nodes and subtrees we leverage the editor._dirtyNodes and
 * editor._subtrees which we reset in every loop.
 */
function $applyAllTransforms(editorState, editor) {
  const dirtyLeaves = editor._dirtyLeaves;
  const dirtyElements = editor._dirtyElements;
  const nodeMap = editorState._nodeMap;
  const compositionKey = $getCompositionKey();
  const transformsCache = new Map();
  let untransformedDirtyLeaves = dirtyLeaves;
  let untransformedDirtyLeavesLength = untransformedDirtyLeaves.size;
  let untransformedDirtyElements = dirtyElements;
  let untransformedDirtyElementsLength = untransformedDirtyElements.size;
  while (untransformedDirtyLeavesLength > 0 || untransformedDirtyElementsLength > 0) {
    if (untransformedDirtyLeavesLength > 0) {
      // We leverage editor._dirtyLeaves to track the new dirty leaves after the transforms
      editor._dirtyLeaves = new Set();
      for (const nodeKey of untransformedDirtyLeaves) {
        const node = nodeMap.get(nodeKey);
        if ($isTextNode(node) && node.isAttached() && node.isSimpleText() && !node.isUnmergeable()) {
          $normalizeTextNode(node);
        }
        if (node !== undefined && $isNodeValidForTransform(node, compositionKey)) {
          $applyTransforms(editor, node, transformsCache);
        }
        dirtyLeaves.add(nodeKey);
      }
      untransformedDirtyLeaves = editor._dirtyLeaves;
      untransformedDirtyLeavesLength = untransformedDirtyLeaves.size;

      // We want to prioritize node transforms over element transforms
      if (untransformedDirtyLeavesLength > 0) {
        infiniteTransformCount++;
        continue;
      }
    }

    // All dirty leaves have been processed. Let's do elements!
    // We have previously processed dirty leaves, so let's restart the editor leaves Set to track
    // new ones caused by element transforms
    editor._dirtyLeaves = new Set();
    editor._dirtyElements = new Map();
    for (const currentUntransformedDirtyElement of untransformedDirtyElements) {
      const nodeKey = currentUntransformedDirtyElement[0];
      const intentionallyMarkedAsDirty = currentUntransformedDirtyElement[1];
      if (nodeKey !== 'root' && !intentionallyMarkedAsDirty) {
        continue;
      }
      const node = nodeMap.get(nodeKey);
      if (node !== undefined && $isNodeValidForTransform(node, compositionKey)) {
        $applyTransforms(editor, node, transformsCache);
      }
      dirtyElements.set(nodeKey, intentionallyMarkedAsDirty);
    }
    untransformedDirtyLeaves = editor._dirtyLeaves;
    untransformedDirtyLeavesLength = untransformedDirtyLeaves.size;
    untransformedDirtyElements = editor._dirtyElements;
    untransformedDirtyElementsLength = untransformedDirtyElements.size;
    infiniteTransformCount++;
  }
  editor._dirtyLeaves = dirtyLeaves;
  editor._dirtyElements = dirtyElements;
}
function $parseSerializedNode(serializedNode) {
  const internalSerializedNode = serializedNode;
  return $parseSerializedNodeImpl(internalSerializedNode, getActiveEditor()._nodes);
}
function $parseSerializedNodeImpl(serializedNode, registeredNodes) {
  const type = serializedNode.type;
  const registeredNode = registeredNodes.get(type);
  if (registeredNode === undefined) {
    {
      throw Error(`parseEditorState: type "${type}" + not found`);
    }
  }
  const nodeClass = registeredNode.klass;
  if (serializedNode.type !== nodeClass.getType()) {
    {
      throw Error(`LexicalNode: Node ${nodeClass.name} does not implement .importJSON().`);
    }
  }
  const node = nodeClass.importJSON(serializedNode);
  const children = serializedNode.children;
  if ($isElementNode(node) && Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const serializedJSONChildNode = children[i];
      const childNode = $parseSerializedNodeImpl(serializedJSONChildNode, registeredNodes);
      node.append(childNode);
    }
  }
  return node;
}
function parseEditorState(serializedEditorState, editor, updateFn) {
  const editorState = createEmptyEditorState();
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  const previousDirtyElements = editor._dirtyElements;
  const previousDirtyLeaves = editor._dirtyLeaves;
  const previousCloneNotNeeded = editor._cloneNotNeeded;
  const previousDirtyType = editor._dirtyType;
  editor._dirtyElements = new Map();
  editor._dirtyLeaves = new Set();
  editor._cloneNotNeeded = new Set();
  editor._dirtyType = 0;
  activeEditorState = editorState;
  isReadOnlyMode = false;
  activeEditor = editor;
  try {
    const registeredNodes = editor._nodes;
    const serializedNode = serializedEditorState.root;
    $parseSerializedNodeImpl(serializedNode, registeredNodes);
    if (updateFn) {
      updateFn();
    }

    // Make the editorState immutable
    editorState._readOnly = true;
    {
      handleDEVOnlyPendingUpdateGuarantees(editorState);
    }
  } catch (error) {
    if (error instanceof Error) {
      editor._onError(error);
    }
  } finally {
    editor._dirtyElements = previousDirtyElements;
    editor._dirtyLeaves = previousDirtyLeaves;
    editor._cloneNotNeeded = previousCloneNotNeeded;
    editor._dirtyType = previousDirtyType;
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
  return editorState;
}

// This technically isn't an update but given we need
// exposure to the module's active bindings, we have this
// function here

function readEditorState(editorState, callbackFn) {
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  activeEditorState = editorState;
  isReadOnlyMode = true;
  activeEditor = null;
  try {
    return callbackFn();
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
}
function handleDEVOnlyPendingUpdateGuarantees(pendingEditorState) {
  // Given we can't Object.freeze the nodeMap as it's a Map,
  // we instead replace its set, clear and delete methods.
  const nodeMap = pendingEditorState._nodeMap;
  nodeMap.set = () => {
    throw new Error('Cannot call set() on a frozen Lexical node map');
  };
  nodeMap.clear = () => {
    throw new Error('Cannot call clear() on a frozen Lexical node map');
  };
  nodeMap.delete = () => {
    throw new Error('Cannot call delete() on a frozen Lexical node map');
  };
}
function commitPendingUpdates(editor, recoveryEditorState) {
  const pendingEditorState = editor._pendingEditorState;
  const rootElement = editor._rootElement;
  const shouldSkipDOM = editor._headless || rootElement === null;
  if (pendingEditorState === null) {
    return;
  }

  // ======
  // Reconciliation has started.
  // ======

  const currentEditorState = editor._editorState;
  const currentSelection = currentEditorState._selection;
  const pendingSelection = pendingEditorState._selection;
  const needsUpdate = editor._dirtyType !== NO_DIRTY_NODES;
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  const previouslyUpdating = editor._updating;
  const observer = editor._observer;
  let mutatedNodes = null;
  editor._pendingEditorState = null;
  editor._editorState = pendingEditorState;
  if (!shouldSkipDOM && needsUpdate && observer !== null) {
    activeEditor = editor;
    activeEditorState = pendingEditorState;
    isReadOnlyMode = false;
    // We don't want updates to sync block the reconciliation.
    editor._updating = true;
    try {
      const dirtyType = editor._dirtyType;
      const dirtyElements = editor._dirtyElements;
      const dirtyLeaves = editor._dirtyLeaves;
      observer.disconnect();
      mutatedNodes = reconcileRoot(currentEditorState, pendingEditorState, editor, dirtyType, dirtyElements, dirtyLeaves);
    } catch (error) {
      // Report errors
      if (error instanceof Error) {
        editor._onError(error);
      }

      // Reset editor and restore incoming editor state to the DOM
      if (!isAttemptingToRecoverFromReconcilerError) {
        resetEditor(editor, null, rootElement, pendingEditorState);
        initMutationObserver(editor);
        editor._dirtyType = FULL_RECONCILE;
        isAttemptingToRecoverFromReconcilerError = true;
        commitPendingUpdates(editor, currentEditorState);
        isAttemptingToRecoverFromReconcilerError = false;
      } else {
        // To avoid a possible situation of infinite loops, lets throw
        throw error;
      }
      return;
    } finally {
      observer.observe(rootElement, observerOptions);
      editor._updating = previouslyUpdating;
      activeEditorState = previousActiveEditorState;
      isReadOnlyMode = previousReadOnlyMode;
      activeEditor = previousActiveEditor;
    }
  }
  if (!pendingEditorState._readOnly) {
    pendingEditorState._readOnly = true;
    {
      handleDEVOnlyPendingUpdateGuarantees(pendingEditorState);
      if ($isRangeSelection(pendingSelection)) {
        Object.freeze(pendingSelection.anchor);
        Object.freeze(pendingSelection.focus);
      }
      Object.freeze(pendingSelection);
    }
  }
  const dirtyLeaves = editor._dirtyLeaves;
  const dirtyElements = editor._dirtyElements;
  const normalizedNodes = editor._normalizedNodes;
  const tags = editor._updateTags;
  const deferred = editor._deferred;
  if (needsUpdate) {
    editor._dirtyType = NO_DIRTY_NODES;
    editor._cloneNotNeeded.clear();
    editor._dirtyLeaves = new Set();
    editor._dirtyElements = new Map();
    editor._normalizedNodes = new Set();
    editor._updateTags = new Set();
  }
  $garbageCollectDetachedDecorators(editor, pendingEditorState);

  // ======
  // Reconciliation has finished. Now update selection and trigger listeners.
  // ======

  const domSelection = shouldSkipDOM ? null : getDOMSelection(editor._window);

  // Attempt to update the DOM selection, including focusing of the root element,
  // and scroll into view if needed.
  if (editor._editable &&
  // domSelection will be null in headless
  domSelection !== null && (needsUpdate || pendingSelection === null || pendingSelection.dirty)) {
    activeEditor = editor;
    activeEditorState = pendingEditorState;
    try {
      if (observer !== null) {
        observer.disconnect();
      }
      if (needsUpdate || pendingSelection === null || pendingSelection.dirty) {
        const blockCursorElement = editor._blockCursorElement;
        if (blockCursorElement !== null) {
          removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
        }
        updateDOMSelection(currentSelection, pendingSelection, editor, domSelection, tags, rootElement);
      }
      updateDOMBlockCursorElement(editor, rootElement, pendingSelection);
      if (observer !== null) {
        observer.observe(rootElement, observerOptions);
      }
    } finally {
      activeEditor = previousActiveEditor;
      activeEditorState = previousActiveEditorState;
    }
  }
  if (mutatedNodes !== null) {
    triggerMutationListeners(editor, mutatedNodes, tags, dirtyLeaves, currentEditorState);
  }
  if (!$isRangeSelection(pendingSelection) && pendingSelection !== null && (currentSelection === null || !currentSelection.is(pendingSelection))) {
    editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
  }
  /**
   * Capture pendingDecorators after garbage collecting detached decorators
   */
  const pendingDecorators = editor._pendingDecorators;
  if (pendingDecorators !== null) {
    editor._decorators = pendingDecorators;
    editor._pendingDecorators = null;
    triggerListeners('decorator', editor, true, pendingDecorators);
  }

  // If reconciler fails, we reset whole editor (so current editor state becomes empty)
  // and attempt to re-render pendingEditorState. If that goes through we trigger
  // listeners, but instead use recoverEditorState which is current editor state before reset
  // This specifically important for collab that relies on prevEditorState from update
  // listener to calculate delta of changed nodes/properties
  triggerTextContentListeners(editor, recoveryEditorState || currentEditorState, pendingEditorState);
  triggerListeners('update', editor, true, {
    dirtyElements,
    dirtyLeaves,
    editorState: pendingEditorState,
    normalizedNodes,
    prevEditorState: recoveryEditorState || currentEditorState,
    tags
  });
  triggerDeferredUpdateCallbacks(editor, deferred);
  triggerEnqueuedUpdates(editor);
}
function triggerTextContentListeners(editor, currentEditorState, pendingEditorState) {
  const currentTextContent = getEditorStateTextContent(currentEditorState);
  const latestTextContent = getEditorStateTextContent(pendingEditorState);
  if (currentTextContent !== latestTextContent) {
    triggerListeners('textcontent', editor, true, latestTextContent);
  }
}
function triggerMutationListeners(editor, mutatedNodes, updateTags, dirtyLeaves, prevEditorState) {
  const listeners = Array.from(editor._listeners.mutation);
  const listenersLength = listeners.length;
  for (let i = 0; i < listenersLength; i++) {
    const [listener, klass] = listeners[i];
    const mutatedNodesByType = mutatedNodes.get(klass);
    if (mutatedNodesByType !== undefined) {
      listener(mutatedNodesByType, {
        dirtyLeaves,
        prevEditorState,
        updateTags
      });
    }
  }
}
function triggerListeners(type, editor, isCurrentlyEnqueuingUpdates, ...payload) {
  const previouslyUpdating = editor._updating;
  editor._updating = isCurrentlyEnqueuingUpdates;
  try {
    const listeners = Array.from(editor._listeners[type]);
    for (let i = 0; i < listeners.length; i++) {
      // @ts-ignore
      listeners[i].apply(null, payload);
    }
  } finally {
    editor._updating = previouslyUpdating;
  }
}
function triggerCommandListeners(editor, type, payload) {
  if (editor._updating === false || activeEditor !== editor) {
    let returnVal = false;
    editor.update(() => {
      returnVal = triggerCommandListeners(editor, type, payload);
    });
    return returnVal;
  }
  const editors = getEditorsToPropagate(editor);
  for (let i = 4; i >= 0; i--) {
    for (let e = 0; e < editors.length; e++) {
      const currentEditor = editors[e];
      const commandListeners = currentEditor._commands;
      const listenerInPriorityOrder = commandListeners.get(type);
      if (listenerInPriorityOrder !== undefined) {
        const listenersSet = listenerInPriorityOrder[i];
        if (listenersSet !== undefined) {
          const listeners = Array.from(listenersSet);
          const listenersLength = listeners.length;
          for (let j = 0; j < listenersLength; j++) {
            if (listeners[j](payload, editor) === true) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}
function triggerEnqueuedUpdates(editor) {
  const queuedUpdates = editor._updates;
  if (queuedUpdates.length !== 0) {
    const queuedUpdate = queuedUpdates.shift();
    if (queuedUpdate) {
      const [updateFn, options] = queuedUpdate;
      beginUpdate(editor, updateFn, options);
    }
  }
}
function triggerDeferredUpdateCallbacks(editor, deferred) {
  editor._deferred = [];
  if (deferred.length !== 0) {
    const previouslyUpdating = editor._updating;
    editor._updating = true;
    try {
      for (let i = 0; i < deferred.length; i++) {
        deferred[i]();
      }
    } finally {
      editor._updating = previouslyUpdating;
    }
  }
}
function processNestedUpdates(editor, initialSkipTransforms) {
  const queuedUpdates = editor._updates;
  let skipTransforms = initialSkipTransforms || false;

  // Updates might grow as we process them, we so we'll need
  // to handle each update as we go until the updates array is
  // empty.
  while (queuedUpdates.length !== 0) {
    const queuedUpdate = queuedUpdates.shift();
    if (queuedUpdate) {
      const [nextUpdateFn, options] = queuedUpdate;
      let onUpdate;
      let tag;
      if (options !== undefined) {
        onUpdate = options.onUpdate;
        tag = options.tag;
        if (options.skipTransforms) {
          skipTransforms = true;
        }
        if (onUpdate) {
          editor._deferred.push(onUpdate);
        }
        if (tag) {
          editor._updateTags.add(tag);
        }
      }
      nextUpdateFn();
    }
  }
  return skipTransforms;
}
function beginUpdate(editor, updateFn, options) {
  const updateTags = editor._updateTags;
  let onUpdate;
  let tag;
  let skipTransforms = false;
  let discrete = false;
  if (options !== undefined) {
    onUpdate = options.onUpdate;
    tag = options.tag;
    if (tag != null) {
      updateTags.add(tag);
    }
    skipTransforms = options.skipTransforms || false;
    discrete = options.discrete || false;
  }
  if (onUpdate) {
    editor._deferred.push(onUpdate);
  }
  const currentEditorState = editor._editorState;
  let pendingEditorState = editor._pendingEditorState;
  let editorStateWasCloned = false;
  if (pendingEditorState === null || pendingEditorState._readOnly) {
    pendingEditorState = editor._pendingEditorState = cloneEditorState(pendingEditorState || currentEditorState);
    editorStateWasCloned = true;
  }
  pendingEditorState._flushSync = discrete;
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  const previouslyUpdating = editor._updating;
  activeEditorState = pendingEditorState;
  isReadOnlyMode = false;
  editor._updating = true;
  activeEditor = editor;
  try {
    if (editorStateWasCloned) {
      if (editor._headless) {
        if (currentEditorState._selection != null) {
          pendingEditorState._selection = currentEditorState._selection.clone();
        }
      } else {
        pendingEditorState._selection = internalCreateSelection(editor);
      }
    }
    const startingCompositionKey = editor._compositionKey;
    updateFn();
    skipTransforms = processNestedUpdates(editor, skipTransforms);
    applySelectionTransforms(pendingEditorState, editor);
    if (editor._dirtyType !== NO_DIRTY_NODES) {
      if (skipTransforms) {
        $normalizeAllDirtyTextNodes(pendingEditorState, editor);
      } else {
        $applyAllTransforms(pendingEditorState, editor);
      }
      processNestedUpdates(editor);
      $garbageCollectDetachedNodes(currentEditorState, pendingEditorState, editor._dirtyLeaves, editor._dirtyElements);
    }
    const endingCompositionKey = editor._compositionKey;
    if (startingCompositionKey !== endingCompositionKey) {
      pendingEditorState._flushSync = true;
    }
    const pendingSelection = pendingEditorState._selection;
    if ($isRangeSelection(pendingSelection)) {
      const pendingNodeMap = pendingEditorState._nodeMap;
      const anchorKey = pendingSelection.anchor.key;
      const focusKey = pendingSelection.focus.key;
      if (pendingNodeMap.get(anchorKey) === undefined || pendingNodeMap.get(focusKey) === undefined) {
        {
          throw Error(`updateEditor: selection has been lost because the previously selected nodes have been removed and selection wasn't moved to another node. Ensure selection changes after removing/replacing a selected node.`);
        }
      }
    } else if ($isNodeSelection(pendingSelection)) {
      // TODO: we should also validate node selection?
      if (pendingSelection._nodes.size === 0) {
        pendingEditorState._selection = null;
      }
    }
  } catch (error) {
    // Report errors
    if (error instanceof Error) {
      editor._onError(error);
    }

    // Restore existing editor state to the DOM
    editor._pendingEditorState = currentEditorState;
    editor._dirtyType = FULL_RECONCILE;
    editor._cloneNotNeeded.clear();
    editor._dirtyLeaves = new Set();
    editor._dirtyElements.clear();
    commitPendingUpdates(editor);
    return;
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
    editor._updating = previouslyUpdating;
    infiniteTransformCount = 0;
  }
  const shouldUpdate = editor._dirtyType !== NO_DIRTY_NODES || editorStateHasDirtySelection(pendingEditorState, editor);
  if (shouldUpdate) {
    if (pendingEditorState._flushSync) {
      pendingEditorState._flushSync = false;
      commitPendingUpdates(editor);
    } else if (editorStateWasCloned) {
      scheduleMicroTask(() => {
        commitPendingUpdates(editor);
      });
    }
  } else {
    pendingEditorState._flushSync = false;
    if (editorStateWasCloned) {
      updateTags.clear();
      editor._deferred = [];
      editor._pendingEditorState = null;
    }
  }
}
function updateEditor(editor, updateFn, options) {
  if (editor._updating) {
    editor._updates.push([updateFn, options]);
  } else {
    beginUpdate(editor, updateFn, options);
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/** @noInheritDoc */
class DecoratorNode extends LexicalNode {
  constructor(key) {
    super(key);
  }
  decorate(editor, config) {
    {
      throw Error(`decorate: base method not extended`);
    }
  }
  isIsolated() {
    return false;
  }
  isInline() {
    return true;
  }
  isKeyboardSelectable() {
    return true;
  }
}
function $isDecoratorNode(node) {
  return node instanceof DecoratorNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class ElementNode extends LexicalNode {
  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  constructor(key) {
    super(key);
    this.__first = null;
    this.__last = null;
    this.__size = 0;
    this.__format = 0;
    this.__indent = 0;
    this.__dir = null;
  }
  getFormat() {
    const self = this.getLatest();
    return self.__format;
  }
  getFormatType() {
    const format = this.getFormat();
    return ELEMENT_FORMAT_TO_TYPE[format] || '';
  }
  getIndent() {
    const self = this.getLatest();
    return self.__indent;
  }
  getChildren() {
    const children = [];
    let child = this.getFirstChild();
    while (child !== null) {
      children.push(child);
      child = child.getNextSibling();
    }
    return children;
  }
  getChildrenKeys() {
    const children = [];
    let child = this.getFirstChild();
    while (child !== null) {
      children.push(child.__key);
      child = child.getNextSibling();
    }
    return children;
  }
  getChildrenSize() {
    const self = this.getLatest();
    return self.__size;
  }
  isEmpty() {
    return this.getChildrenSize() === 0;
  }
  isDirty() {
    const editor = getActiveEditor();
    const dirtyElements = editor._dirtyElements;
    return dirtyElements !== null && dirtyElements.has(this.__key);
  }
  isLastChild() {
    const self = this.getLatest();
    const parentLastChild = this.getParentOrThrow().getLastChild();
    return parentLastChild !== null && parentLastChild.is(self);
  }
  getAllTextNodes() {
    const textNodes = [];
    let child = this.getFirstChild();
    while (child !== null) {
      if ($isTextNode(child)) {
        textNodes.push(child);
      }
      if ($isElementNode(child)) {
        const subChildrenNodes = child.getAllTextNodes();
        textNodes.push(...subChildrenNodes);
      }
      child = child.getNextSibling();
    }
    return textNodes;
  }
  getFirstDescendant() {
    let node = this.getFirstChild();
    while (node !== null) {
      if ($isElementNode(node)) {
        const child = node.getFirstChild();
        if (child !== null) {
          node = child;
          continue;
        }
      }
      break;
    }
    return node;
  }
  getLastDescendant() {
    let node = this.getLastChild();
    while (node !== null) {
      if ($isElementNode(node)) {
        const child = node.getLastChild();
        if (child !== null) {
          node = child;
          continue;
        }
      }
      break;
    }
    return node;
  }
  getDescendantByIndex(index) {
    const children = this.getChildren();
    const childrenLength = children.length;
    // For non-empty element nodes, we resolve its descendant
    // (either a leaf node or the bottom-most element)
    if (index >= childrenLength) {
      const resolvedNode = children[childrenLength - 1];
      return $isElementNode(resolvedNode) && resolvedNode.getLastDescendant() || resolvedNode || null;
    }
    const resolvedNode = children[index];
    return $isElementNode(resolvedNode) && resolvedNode.getFirstDescendant() || resolvedNode || null;
  }
  getFirstChild() {
    const self = this.getLatest();
    const firstKey = self.__first;
    return firstKey === null ? null : $getNodeByKey(firstKey);
  }
  getFirstChildOrThrow() {
    const firstChild = this.getFirstChild();
    if (firstChild === null) {
      {
        throw Error(`Expected node ${this.__key} to have a first child.`);
      }
    }
    return firstChild;
  }
  getLastChild() {
    const self = this.getLatest();
    const lastKey = self.__last;
    return lastKey === null ? null : $getNodeByKey(lastKey);
  }
  getLastChildOrThrow() {
    const lastChild = this.getLastChild();
    if (lastChild === null) {
      {
        throw Error(`Expected node ${this.__key} to have a last child.`);
      }
    }
    return lastChild;
  }
  getChildAtIndex(index) {
    const size = this.getChildrenSize();
    let node;
    let i;
    if (index < size / 2) {
      node = this.getFirstChild();
      i = 0;
      while (node !== null && i <= index) {
        if (i === index) {
          return node;
        }
        node = node.getNextSibling();
        i++;
      }
      return null;
    }
    node = this.getLastChild();
    i = size - 1;
    while (node !== null && i >= index) {
      if (i === index) {
        return node;
      }
      node = node.getPreviousSibling();
      i--;
    }
    return null;
  }
  getTextContent() {
    let textContent = '';
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContent += child.getTextContent();
      if ($isElementNode(child) && i !== childrenLength - 1 && !child.isInline()) {
        textContent += DOUBLE_LINE_BREAK;
      }
    }
    return textContent;
  }
  getTextContentSize() {
    let textContentSize = 0;
    const children = this.getChildren();
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      textContentSize += child.getTextContentSize();
      if ($isElementNode(child) && i !== childrenLength - 1 && !child.isInline()) {
        textContentSize += DOUBLE_LINE_BREAK.length;
      }
    }
    return textContentSize;
  }
  getDirection() {
    const self = this.getLatest();
    return self.__dir;
  }
  hasFormat(type) {
    if (type !== '') {
      const formatFlag = ELEMENT_TYPE_TO_FORMAT[type];
      return (this.getFormat() & formatFlag) !== 0;
    }
    return false;
  }

  // Mutators

  select(_anchorOffset, _focusOffset) {
    errorOnReadOnly();
    const selection = $getSelection();
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const childrenCount = this.getChildrenSize();
    if (!this.canBeEmpty()) {
      if (_anchorOffset === 0 && _focusOffset === 0) {
        const firstChild = this.getFirstChild();
        if ($isTextNode(firstChild) || $isElementNode(firstChild)) {
          return firstChild.select(0, 0);
        }
      } else if ((_anchorOffset === undefined || _anchorOffset === childrenCount) && (_focusOffset === undefined || _focusOffset === childrenCount)) {
        const lastChild = this.getLastChild();
        if ($isTextNode(lastChild) || $isElementNode(lastChild)) {
          return lastChild.select();
        }
      }
    }
    if (anchorOffset === undefined) {
      anchorOffset = childrenCount;
    }
    if (focusOffset === undefined) {
      focusOffset = childrenCount;
    }
    const key = this.__key;
    if (!$isRangeSelection(selection)) {
      return internalMakeRangeSelection(key, anchorOffset, key, focusOffset, 'element', 'element');
    } else {
      selection.anchor.set(key, anchorOffset, 'element');
      selection.focus.set(key, focusOffset, 'element');
      selection.dirty = true;
    }
    return selection;
  }
  selectStart() {
    const firstNode = this.getFirstDescendant();
    if ($isElementNode(firstNode) || $isTextNode(firstNode)) {
      return firstNode.select(0, 0);
    }
    // Decorator or LineBreak
    if (firstNode !== null) {
      return firstNode.selectPrevious();
    }
    return this.select(0, 0);
  }
  selectEnd() {
    const lastNode = this.getLastDescendant();
    if ($isElementNode(lastNode) || $isTextNode(lastNode)) {
      return lastNode.select();
    }
    // Decorator or LineBreak
    if (lastNode !== null) {
      return lastNode.selectNext();
    }
    return this.select();
  }
  clear() {
    const writableSelf = this.getWritable();
    const children = this.getChildren();
    children.forEach(child => child.remove());
    return writableSelf;
  }
  append(...nodesToAppend) {
    return this.splice(this.getChildrenSize(), 0, nodesToAppend);
  }
  setDirection(direction) {
    const self = this.getWritable();
    self.__dir = direction;
    return self;
  }
  setFormat(type) {
    const self = this.getWritable();
    self.__format = type !== '' ? ELEMENT_TYPE_TO_FORMAT[type] : 0;
    return this;
  }
  setIndent(indentLevel) {
    const self = this.getWritable();
    self.__indent = indentLevel;
    return this;
  }
  splice(start, deleteCount, nodesToInsert) {
    const nodesToInsertLength = nodesToInsert.length;
    const oldSize = this.getChildrenSize();
    const writableSelf = this.getWritable();
    const writableSelfKey = writableSelf.__key;
    const nodesToInsertKeys = [];
    const nodesToRemoveKeys = [];
    const nodeAfterRange = this.getChildAtIndex(start + deleteCount);
    let nodeBeforeRange = null;
    let newSize = oldSize - deleteCount + nodesToInsertLength;
    if (start !== 0) {
      if (start === oldSize) {
        nodeBeforeRange = this.getLastChild();
      } else {
        const node = this.getChildAtIndex(start);
        if (node !== null) {
          nodeBeforeRange = node.getPreviousSibling();
        }
      }
    }
    if (deleteCount > 0) {
      let nodeToDelete = nodeBeforeRange === null ? this.getFirstChild() : nodeBeforeRange.getNextSibling();
      for (let i = 0; i < deleteCount; i++) {
        if (nodeToDelete === null) {
          {
            throw Error(`splice: sibling not found`);
          }
        }
        const nextSibling = nodeToDelete.getNextSibling();
        const nodeKeyToDelete = nodeToDelete.__key;
        const writableNodeToDelete = nodeToDelete.getWritable();
        removeFromParent(writableNodeToDelete);
        nodesToRemoveKeys.push(nodeKeyToDelete);
        nodeToDelete = nextSibling;
      }
    }
    let prevNode = nodeBeforeRange;
    for (let i = 0; i < nodesToInsertLength; i++) {
      const nodeToInsert = nodesToInsert[i];
      if (prevNode !== null && nodeToInsert.is(prevNode)) {
        nodeBeforeRange = prevNode = prevNode.getPreviousSibling();
      }
      const writableNodeToInsert = nodeToInsert.getWritable();
      if (writableNodeToInsert.__parent === writableSelfKey) {
        newSize--;
      }
      removeFromParent(writableNodeToInsert);
      const nodeKeyToInsert = nodeToInsert.__key;
      if (prevNode === null) {
        writableSelf.__first = nodeKeyToInsert;
        writableNodeToInsert.__prev = null;
      } else {
        const writablePrevNode = prevNode.getWritable();
        writablePrevNode.__next = nodeKeyToInsert;
        writableNodeToInsert.__prev = writablePrevNode.__key;
      }
      if (nodeToInsert.__key === writableSelfKey) {
        {
          throw Error(`append: attempting to append self`);
        }
      }
      // Set child parent to self
      writableNodeToInsert.__parent = writableSelfKey;
      nodesToInsertKeys.push(nodeKeyToInsert);
      prevNode = nodeToInsert;
    }
    if (start + deleteCount === oldSize) {
      if (prevNode !== null) {
        const writablePrevNode = prevNode.getWritable();
        writablePrevNode.__next = null;
        writableSelf.__last = prevNode.__key;
      }
    } else if (nodeAfterRange !== null) {
      const writableNodeAfterRange = nodeAfterRange.getWritable();
      if (prevNode !== null) {
        const writablePrevNode = prevNode.getWritable();
        writableNodeAfterRange.__prev = prevNode.__key;
        writablePrevNode.__next = nodeAfterRange.__key;
      } else {
        writableNodeAfterRange.__prev = null;
      }
    }
    writableSelf.__size = newSize;

    // In case of deletion we need to adjust selection, unlink removed nodes
    // and clean up node itself if it becomes empty. None of these needed
    // for insertion-only cases
    if (nodesToRemoveKeys.length) {
      // Adjusting selection, in case node that was anchor/focus will be deleted
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodesToRemoveKeySet = new Set(nodesToRemoveKeys);
        const nodesToInsertKeySet = new Set(nodesToInsertKeys);
        const {
          anchor,
          focus
        } = selection;
        if (isPointRemoved(anchor, nodesToRemoveKeySet, nodesToInsertKeySet)) {
          moveSelectionPointToSibling(anchor, anchor.getNode(), this, nodeBeforeRange, nodeAfterRange);
        }
        if (isPointRemoved(focus, nodesToRemoveKeySet, nodesToInsertKeySet)) {
          moveSelectionPointToSibling(focus, focus.getNode(), this, nodeBeforeRange, nodeAfterRange);
        }
        // Cleanup if node can't be empty
        if (newSize === 0 && !this.canBeEmpty() && !$isRootOrShadowRoot(this)) {
          this.remove();
        }
      }
    }
    return writableSelf;
  }
  // JSON serialization
  exportJSON() {
    return {
      children: [],
      direction: this.getDirection(),
      format: this.getFormatType(),
      indent: this.getIndent(),
      type: 'element',
      version: 1
    };
  }
  // These are intended to be extends for specific element heuristics.
  insertNewAfter(selection, restoreSelection) {
    return null;
  }
  canIndent() {
    return true;
  }
  /*
   * This method controls the behavior of a the node during backwards
   * deletion (i.e., backspace) when selection is at the beginning of
   * the node (offset 0)
   */
  collapseAtStart(selection) {
    return false;
  }
  excludeFromCopy(destination) {
    return false;
  }
  // TODO 0.10 deprecate
  canExtractContents() {
    return true;
  }
  canReplaceWith(replacement) {
    return true;
  }
  canInsertAfter(node) {
    return true;
  }
  canBeEmpty() {
    return true;
  }
  canInsertTextBefore() {
    return true;
  }
  canInsertTextAfter() {
    return true;
  }
  isInline() {
    return false;
  }
  // A shadow root is a Node that behaves like RootNode. The shadow root (and RootNode) mark the
  // end of the hiercharchy, most implementations should treat it as there's nothing (upwards)
  // beyond this point. For example, node.getTopLevelElement(), when performed inside a TableCellNode
  // will return the immediate first child underneath TableCellNode instead of RootNode.
  isShadowRoot() {
    return false;
  }
  canMergeWith(node) {
    return false;
  }
  extractWithChild(child, selection, destination) {
    return false;
  }
}
function $isElementNode(node) {
  return node instanceof ElementNode;
}
function isPointRemoved(point, nodesToRemoveKeySet, nodesToInsertKeySet) {
  let node = point.getNode();
  while (node) {
    const nodeKey = node.__key;
    if (nodesToRemoveKeySet.has(nodeKey) && !nodesToInsertKeySet.has(nodeKey)) {
      return true;
    }
    node = node.getParent();
  }
  return false;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class RootNode extends ElementNode {
  /** @internal */

  static getType() {
    return 'root';
  }
  static clone() {
    return new RootNode();
  }
  constructor() {
    super('root');
    this.__cachedText = null;
  }
  getTopLevelElementOrThrow() {
    {
      throw Error(`getTopLevelElementOrThrow: root nodes are not top level elements`);
    }
  }
  getTextContent() {
    const cachedText = this.__cachedText;
    if (isCurrentlyReadOnlyMode() || getActiveEditor()._dirtyType === NO_DIRTY_NODES) {
      if (cachedText !== null) {
        return cachedText;
      }
    }
    return super.getTextContent();
  }
  remove() {
    {
      throw Error(`remove: cannot be called on root nodes`);
    }
  }
  replace(node) {
    {
      throw Error(`replace: cannot be called on root nodes`);
    }
  }
  insertBefore(nodeToInsert) {
    {
      throw Error(`insertBefore: cannot be called on root nodes`);
    }
  }
  insertAfter(nodeToInsert) {
    {
      throw Error(`insertAfter: cannot be called on root nodes`);
    }
  }

  // View

  updateDOM(prevNode, dom) {
    return false;
  }

  // Mutate

  append(...nodesToAppend) {
    for (let i = 0; i < nodesToAppend.length; i++) {
      const node = nodesToAppend[i];
      if (!$isElementNode(node) && !$isDecoratorNode(node)) {
        {
          throw Error(`rootNode.append: Only element or decorator nodes can be appended to the root node`);
        }
      }
    }
    return super.append(...nodesToAppend);
  }
  static importJSON(serializedNode) {
    // We don't create a root, and instead use the existing root.
    const node = $getRoot();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }
  exportJSON() {
    return {
      children: [],
      direction: this.getDirection(),
      format: this.getFormatType(),
      indent: this.getIndent(),
      type: 'root',
      version: 1
    };
  }
  collapseAtStart() {
    return true;
  }
}
function $createRootNode() {
  return new RootNode();
}
function $isRootNode(node) {
  return node instanceof RootNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function editorStateHasDirtySelection(editorState, editor) {
  const currentSelection = editor.getEditorState()._selection;
  const pendingSelection = editorState._selection;

  // Check if we need to update because of changes in selection
  if (pendingSelection !== null) {
    if (pendingSelection.dirty || !pendingSelection.is(currentSelection)) {
      return true;
    }
  } else if (currentSelection !== null) {
    return true;
  }
  return false;
}
function cloneEditorState(current) {
  return new EditorState(new Map(current._nodeMap));
}
function createEmptyEditorState() {
  return new EditorState(new Map([['root', $createRootNode()]]));
}
function exportNodeToJSON(node, keys) {
  const serializedNode = node.exportJSON();
  if (keys) {
    // 遍历serializedNode的key，然后不存在keys中的就删除
    for (const key in serializedNode) {
      if (!keys.includes(key)) {
        // @ts-ignore
        delete serializedNode[key];
      }
    }
  }
  const nodeClass = node.constructor;

  // @ts-expect-error TODO Replace Class utility type with InstanceType
  if (serializedNode.type !== nodeClass.getType()) {
    {
      throw Error(`LexicalNode: Node ${nodeClass.name} does not match the serialized type. Check if .exportJSON() is implemented and it is returning the correct type.`);
    }
  }

  // @ts-expect-error TODO Replace Class utility type with InstanceType
  const serializedChildren = serializedNode.children;
  if ($isElementNode(node)) {
    if (!Array.isArray(serializedChildren)) {
      {
        throw Error(`LexicalNode: Node ${nodeClass.name} is an element but .exportJSON() does not have a children array.`);
      }
    }
    const children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const serializedChildNode = exportNodeToJSON(child, keys);
      serializedChildren.push(serializedChildNode);
    }
  }

  // @ts-expect-error
  return serializedNode;
}
class EditorState {
  constructor(nodeMap, selection) {
    this._nodeMap = nodeMap;
    this._selection = selection || null;
    this._flushSync = false;
    this._readOnly = false;
  }
  isEmpty() {
    return this._nodeMap.size === 1 && this._selection === null;
  }
  read(callbackFn) {
    return readEditorState(this, callbackFn);
  }
  clone(selection) {
    const editorState = new EditorState(this._nodeMap, selection === undefined ? this._selection : selection);
    editorState._readOnly = true;
    return editorState;
  }
  toJSON() {
    return readEditorState(this, () => ({
      root: exportNodeToJSON($getRoot())
    }));
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class ParagraphNode extends ElementNode {
  static getType() {
    return 'paragraph';
  }
  static clone(node) {
    return new ParagraphNode(node.__key);
  }

  // View

  createDOM(config) {
    const dom = document.createElement('p');
    const classNames = getCachedClassNameArray(config.theme, 'paragraph');
    if (classNames !== undefined) {
      const domClassList = dom.classList;
      domClassList.add(...classNames);
    }
    return dom;
  }
  updateDOM(prevNode, dom, config) {
    return false;
  }
  static importDOM() {
    return {
      p: node => ({
        conversion: convertParagraphElement,
        priority: 0
      })
    };
  }
  exportDOM(editor) {
    const {
      element
    } = super.exportDOM(editor);
    if (element && utils.isHTMLElement(element)) {
      if (this.isEmpty()) element.append(document.createElement('br'));
      const formatType = this.getFormatType();
      element.style.textAlign = formatType;
      const direction = this.getDirection();
      if (direction) {
        element.dir = direction;
      }
      const indent = this.getIndent();
      if (indent > 0) {
        // padding-inline-start is not widely supported in email HTML, but
        // Lexical Reconciler uses padding-inline-start. Using text-indent instead.
        element.style.textIndent = `${indent * 20}px`;
      }
    }
    return {
      element
    };
  }
  static importJSON(serializedNode) {
    const node = $createParagraphNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'paragraph',
      version: 1
    };
  }

  // Mutation

  insertNewAfter(_, restoreSelection) {
    const newElement = $createParagraphNode();
    const direction = this.getDirection();
    newElement.setDirection(direction);
    this.insertAfter(newElement, restoreSelection);
    return newElement;
  }
  collapseAtStart() {
    const children = this.getChildren();
    // If we have an empty (trimmed) first paragraph and try and remove it,
    // delete the paragraph as long as we have another sibling to go to
    if (children.length === 0 || $isTextNode(children[0]) && children[0].getTextContent().trim() === '') {
      const nextSibling = this.getNextSibling();
      if (nextSibling !== null) {
        this.selectNext();
        this.remove();
        return true;
      }
      const prevSibling = this.getPreviousSibling();
      if (prevSibling !== null) {
        this.selectPrevious();
        this.remove();
        return true;
      }
    }
    return false;
  }
}
function convertParagraphElement(element) {
  const node = $createParagraphNode();
  if (element.style) {
    node.setFormat(element.style.textAlign);
    const indent = parseInt(element.style.textIndent, 10) / 20;
    if (indent > 0) {
      node.setIndent(indent);
    }
  }
  return {
    node
  };
}
function $createParagraphNode() {
  return $applyNodeReplacement(new ParagraphNode());
}
function $isParagraphNode(node) {
  return node instanceof ParagraphNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const COMMAND_PRIORITY_EDITOR = 0;
const COMMAND_PRIORITY_LOW = 1;
const COMMAND_PRIORITY_NORMAL = 2;
const COMMAND_PRIORITY_HIGH = 3;
const COMMAND_PRIORITY_CRITICAL = 4;

// eslint-disable-next-line @typescript-eslint/no-unused-vars

/**
 * Type helper for extracting the payload type from a command.
 *
 * @example
 * ```ts
 * const MY_COMMAND = createCommand<SomeType>();
 *
 * // ...
 *
 * editor.registerCommand(MY_COMMAND, payload => {
 *   // Type of `payload` is inferred here. But lets say we want to extract a function to delegate to
 *   handleMyCommand(editor, payload);
 *   return true;
 * });
 *
 * function handleMyCommand(editor: LexicalEditor, payload: CommandPayloadType<typeof MY_COMMAND>) {
 *   // `payload` is of type `SomeType`, extracted from the command.
 * }
 * ```
 */

function resetEditor(editor, prevRootElement, nextRootElement, pendingEditorState) {
  const keyNodeMap = editor._keyToDOMMap;
  keyNodeMap.clear();
  editor._editorState = createEmptyEditorState();
  editor._pendingEditorState = pendingEditorState;
  editor._compositionKey = null;
  editor._dirtyType = NO_DIRTY_NODES;
  editor._cloneNotNeeded.clear();
  editor._dirtyLeaves = new Set();
  editor._dirtyElements.clear();
  editor._normalizedNodes = new Set();
  editor._updateTags = new Set();
  editor._updates = [];
  editor._blockCursorElement = null;
  const observer = editor._observer;
  if (observer !== null) {
    observer.disconnect();
    editor._observer = null;
  }

  // Remove all the DOM nodes from the root element
  if (prevRootElement !== null) {
    prevRootElement.textContent = '';
  }
  if (nextRootElement !== null) {
    nextRootElement.textContent = '';
    keyNodeMap.set('root', nextRootElement);
  }
}
function initializeConversionCache(nodes) {
  const conversionCache = new Map();
  const handledConversions = new Set();
  nodes.forEach(node => {
    const importDOM = node.klass.importDOM != null ? node.klass.importDOM.bind(node.klass) : null;
    if (importDOM == null || handledConversions.has(importDOM)) {
      return;
    }
    handledConversions.add(importDOM);
    const map = importDOM();
    if (map !== null) {
      Object.keys(map).forEach(key => {
        let currentCache = conversionCache.get(key);
        if (currentCache === undefined) {
          currentCache = [];
          conversionCache.set(key, currentCache);
        }
        currentCache.push(map[key]);
      });
    }
  });
  return conversionCache;
}

/**
 * Creates a new LexicalEditor attached to a single contentEditable (provided in the config). This is
 * the lowest-level initialization API for a LexicalEditor. If you're using React or another framework,
 * consider using the appropriate abstractions, such as LexicalComposer
 * @param editorConfig - the editor configuration.
 * @returns a LexicalEditor instance
 */
function createEditor(editorConfig) {
  const config = editorConfig || {};
  const activeEditor = internalGetActiveEditor();
  const theme = config.theme || {};
  const parentEditor = editorConfig === undefined ? activeEditor : config.parentEditor || null;
  const disableEvents = config.disableEvents || false;
  const editorState = createEmptyEditorState();
  const namespace = config.namespace || (parentEditor !== null ? parentEditor._config.namespace : createUID());
  const initialEditorState = config.editorState;
  const nodes = [RootNode, TextNode, LineBreakNode, TabNode, ParagraphNode, ...(config.nodes || [])];
  const onError = config.onError;
  const isEditable = config.editable !== undefined ? config.editable : true;
  let registeredNodes;
  if (editorConfig === undefined && activeEditor !== null) {
    registeredNodes = activeEditor._nodes;
  } else {
    registeredNodes = new Map();
    for (let i = 0; i < nodes.length; i++) {
      let klass = nodes[i];
      let replacementClass = null;
      let replacementKlass = null;
      if (typeof klass !== 'function') {
        const options = klass;
        klass = options.replace;
        replacementClass = options.with;
        replacementKlass = options.withKlass ? options.withKlass : null;
      }
      // Ensure custom nodes implement required methods.
      {
        const name = klass.name;
        if (name !== 'RootNode') {
          const proto = klass.prototype;
          ['getType', 'clone'].forEach(method => {
            // eslint-disable-next-line no-prototype-builtins
            if (!klass.hasOwnProperty(method)) {
              console.warn(`${name} must implement static "${method}" method`);
            }
          });
          if (
          // eslint-disable-next-line no-prototype-builtins
          !klass.hasOwnProperty('importDOM') &&
          // eslint-disable-next-line no-prototype-builtins
          klass.hasOwnProperty('exportDOM')) {
            console.warn(`${name} should implement "importDOM" if using a custom "exportDOM" method to ensure HTML serialization (important for copy & paste) works as expected`);
          }
          if (proto instanceof DecoratorNode) {
            // eslint-disable-next-line no-prototype-builtins
            if (!proto.hasOwnProperty('decorate')) {
              console.warn(`${proto.constructor.name} must implement "decorate" method`);
            }
          }
          if (
          // eslint-disable-next-line no-prototype-builtins
          !klass.hasOwnProperty('importJSON')) {
            console.warn(`${name} should implement "importJSON" method to ensure JSON and default HTML serialization works as expected`);
          }
          if (
          // eslint-disable-next-line no-prototype-builtins
          !proto.hasOwnProperty('exportJSON')) {
            console.warn(`${name} should implement "exportJSON" method to ensure JSON and default HTML serialization works as expected`);
          }
        }
      }
      const type = klass.getType();
      const transform = klass.transform();
      const transforms = new Set();
      if (transform !== null) {
        transforms.add(transform);
      }
      registeredNodes.set(type, {
        klass,
        replace: replacementClass,
        replaceWithKlass: replacementKlass,
        transforms
      });
    }
  }
  const editor = new LexicalEditor(editorState, parentEditor, registeredNodes, {
    disableEvents,
    namespace,
    theme
  }, onError ? onError : console.error, initializeConversionCache(registeredNodes), isEditable);
  if (initialEditorState !== undefined) {
    editor._pendingEditorState = initialEditorState;
    editor._dirtyType = FULL_RECONCILE;
  }
  return editor;
}
class LexicalEditor {
  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */
  constructor(editorState, parentEditor, nodes, config, onError, htmlConversions, editable) {
    this._parentEditor = parentEditor;
    // The root element associated with this editor
    this._rootElement = null;
    // The current editor state
    this._editorState = editorState;
    // Handling of drafts and updates
    this._pendingEditorState = null;
    // Used to help co-ordinate selection and events
    this._compositionKey = null;
    this._deferred = [];
    // Used during reconciliation
    this._keyToDOMMap = new Map();
    this._updates = [];
    this._updating = false;
    // Listeners
    this._listeners = {
      decorator: new Set(),
      editable: new Set(),
      mutation: new Map(),
      root: new Set(),
      textcontent: new Set(),
      update: new Set()
    };
    // Commands
    this._commands = new Map();
    // Editor configuration for theme/context.
    this._config = config;
    // Mapping of types to their nodes
    this._nodes = nodes;
    // React node decorators for portals
    this._decorators = {};
    this._pendingDecorators = null;
    // Used to optimize reconciliation
    this._dirtyType = NO_DIRTY_NODES;
    this._cloneNotNeeded = new Set();
    this._dirtyLeaves = new Set();
    this._dirtyElements = new Map();
    this._normalizedNodes = new Set();
    this._updateTags = new Set();
    // Handling of DOM mutations
    this._observer = null;
    // Used for identifying owning editors
    this._key = createUID();
    this._onError = onError;
    this._htmlConversions = htmlConversions;
    this._editable = editable;
    this._headless = parentEditor !== null && parentEditor._headless;
    this._window = null;
    this._blockCursorElement = null;
  }

  /**
   *
   * @returns true if the editor is currently in "composition" mode due to receiving input
   * through an IME, or 3P extension, for example. Returns false otherwise.
   */
  isComposing() {
    return this._compositionKey != null;
  }
  /**
   * Registers a listener for Editor update event. Will trigger the provided callback
   * each time the editor goes through an update (via {@link LexicalEditor.update}) until the
   * teardown function is called.
   *
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerUpdateListener(listener) {
    const listenerSetOrMap = this._listeners.update;
    listenerSetOrMap.add(listener);
    return () => {
      listenerSetOrMap.delete(listener);
    };
  }
  /**
   * Registers a listener for for when the editor changes between editable and non-editable states.
   * Will trigger the provided callback each time the editor transitions between these states until the
   * teardown function is called.
   *
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerEditableListener(listener) {
    const listenerSetOrMap = this._listeners.editable;
    listenerSetOrMap.add(listener);
    return () => {
      listenerSetOrMap.delete(listener);
    };
  }
  /**
   * Registers a listener for when the editor's decorator object changes. The decorator object contains
   * all DecoratorNode keys -> their decorated value. This is primarily used with external UI frameworks.
   *
   * Will trigger the provided callback each time the editor transitions between these states until the
   * teardown function is called.
   *
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerDecoratorListener(listener) {
    const listenerSetOrMap = this._listeners.decorator;
    listenerSetOrMap.add(listener);
    return () => {
      listenerSetOrMap.delete(listener);
    };
  }
  /**
   * Registers a listener for when Lexical commits an update to the DOM and the text content of
   * the editor changes from the previous state of the editor. If the text content is the
   * same between updates, no notifications to the listeners will happen.
   *
   * Will trigger the provided callback each time the editor transitions between these states until the
   * teardown function is called.
   *
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerTextContentListener(listener) {
    const listenerSetOrMap = this._listeners.textcontent;
    listenerSetOrMap.add(listener);
    return () => {
      listenerSetOrMap.delete(listener);
    };
  }
  /**
   * Registers a listener for when the editor's root DOM element (the content editable
   * Lexical attaches to) changes. This is primarily used to attach event listeners to the root
   *  element. The root listener function is executed directly upon registration and then on
   * any subsequent update.
   *
   * Will trigger the provided callback each time the editor transitions between these states until the
   * teardown function is called.
   *
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerRootListener(listener) {
    const listenerSetOrMap = this._listeners.root;
    listener(this._rootElement, null);
    listenerSetOrMap.add(listener);
    return () => {
      listener(null, this._rootElement);
      listenerSetOrMap.delete(listener);
    };
  }
  /**
   * Registers a listener that will trigger anytime the provided command
   * is dispatched, subject to priority. Listeners that run at a higher priority can "intercept"
   * commands and prevent them from propagating to other handlers by returning true.
   *
   * Listeners registered at the same priority level will run deterministically in the order of registration.
   *
   * @param command - the command that will trigger the callback.
   * @param listener - the function that will execute when the command is dispatched.
   * @param priority - the relative priority of the listener. 0 | 1 | 2 | 3 | 4
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerCommand(command, listener, priority) {
    if (priority === undefined) {
      {
        throw Error(`Listener for type "command" requires a "priority".`);
      }
    }
    const commandsMap = this._commands;
    if (!commandsMap.has(command)) {
      commandsMap.set(command, [new Set(), new Set(), new Set(), new Set(), new Set()]);
    }
    const listenersInPriorityOrder = commandsMap.get(command);
    if (listenersInPriorityOrder === undefined) {
      {
        throw Error(`registerCommand: Command ${String(command)} not found in command map`);
      }
    }
    const listeners = listenersInPriorityOrder[priority];
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listenersInPriorityOrder.every(listenersSet => listenersSet.size === 0)) {
        commandsMap.delete(command);
      }
    };
  }

  /**
   * Registers a listener that will run when a Lexical node of the provided class is
   * mutated. The listener will receive a list of nodes along with the type of mutation
   * that was performed on each: created, destroyed, or updated.
   *
   * One common use case for this is to attach DOM event listeners to the underlying DOM nodes as Lexical nodes are created.
   * {@link LexicalEditor.getElementByKey} can be used for this.
   *
   * @param klass - The class of the node that you want to listen to mutations on.
   * @param listener - The logic you want to run when the node is mutated.
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerMutationListener(klass, listener) {
    const registeredNode = this._nodes.get(klass.getType());
    if (registeredNode === undefined) {
      {
        throw Error(`Node ${klass.name} has not been registered. Ensure node has been passed to createEditor.`);
      }
    }
    const mutations = this._listeners.mutation;
    mutations.set(listener, klass);
    return () => {
      mutations.delete(listener);
    };
  }

  /** @internal */
  registerNodeTransformToKlass(klass, listener) {
    const type = klass.getType();
    const registeredNode = this._nodes.get(type);
    if (registeredNode === undefined) {
      {
        throw Error(`Node ${klass.name} has not been registered. Ensure node has been passed to createEditor.`);
      }
    }
    const transforms = registeredNode.transforms;
    transforms.add(listener);
    return registeredNode;
  }

  /**
   * Registers a listener that will run when a Lexical node of the provided class is
   * marked dirty during an update. The listener will continue to run as long as the node
   * is marked dirty. There are no guarantees around the order of transform execution!
   *
   * Watch out for infinite loops. See [Node Transforms](https://lexical.dev/docs/concepts/transforms)
   * @param klass - The class of the node that you want to run transforms on.
   * @param listener - The logic you want to run when the node is updated.
   * @returns a teardown function that can be used to cleanup the listener.
   */
  registerNodeTransform(klass, listener) {
    const registeredNode = this.registerNodeTransformToKlass(klass, listener);
    const registeredNodes = [registeredNode];
    const replaceWithKlass = registeredNode.replaceWithKlass;
    if (replaceWithKlass != null) {
      const registeredReplaceWithNode = this.registerNodeTransformToKlass(replaceWithKlass, listener);
      registeredNodes.push(registeredReplaceWithNode);
    }
    markAllNodesAsDirty(this, klass.getType());
    return () => {
      registeredNodes.forEach(node => node.transforms.delete(listener));
    };
  }

  /**
   * Used to assert that a certain node is registered, usually by plugins to ensure nodes that they
   * depend on have been registered.
   * @returns True if the editor has registered the provided node type, false otherwise.
   */
  hasNode(node) {
    return this._nodes.has(node.getType());
  }

  /**
   * Used to assert that certain nodes are registered, usually by plugins to ensure nodes that they
   * depend on have been registered.
   * @returns True if the editor has registered all of the provided node types, false otherwise.
   */
  hasNodes(nodes) {
    return nodes.every(this.hasNode.bind(this));
  }

  /**
   * Dispatches a command of the specified type with the specified payload.
   * This triggers all command listeners (set by {@link LexicalEditor.registerCommand})
   * for this type, passing them the provided payload.
   * @param type - the type of command listeners to trigger.
   * @param payload - the data to pass as an argument to the command listeners.
   */
  dispatchCommand(type, payload) {
    return dispatchCommand(this, type, payload);
  }

  /**
   * Gets a map of all decorators in the editor.
   * @returns A mapping of call decorator keys to their decorated content
   */
  getDecorators() {
    return this._decorators;
  }

  /**
   *
   * @returns the current root element of the editor. If you want to register
   * an event listener, do it via {@link LexicalEditor.registerRootListener}, since
   * this reference may not be stable.
   */
  getRootElement() {
    return this._rootElement;
  }

  /**
   * Gets the key of the editor
   * @returns The editor key
   */
  getKey() {
    return this._key;
  }

  /**
   * Imperatively set the root contenteditable element that Lexical listens
   * for events on.
   */
  setRootElement(nextRootElement) {
    const prevRootElement = this._rootElement;
    if (nextRootElement !== prevRootElement) {
      const classNames = getCachedClassNameArray(this._config.theme, 'root');
      const pendingEditorState = this._pendingEditorState || this._editorState;
      this._rootElement = nextRootElement;
      resetEditor(this, prevRootElement, nextRootElement, pendingEditorState);
      if (prevRootElement !== null) {
        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          removeRootElementEvents(prevRootElement);
        }
        if (classNames != null) {
          prevRootElement.classList.remove(...classNames);
        }
      }
      if (nextRootElement !== null) {
        const windowObj = getDefaultView(nextRootElement);
        const style = nextRootElement.style;
        style.userSelect = 'text';
        style.whiteSpace = 'pre-wrap';
        style.wordBreak = 'break-word';
        nextRootElement.setAttribute('data-lexical-editor', 'true');
        this._window = windowObj;
        this._dirtyType = FULL_RECONCILE;
        initMutationObserver(this);
        this._updateTags.add('history-merge');
        commitPendingUpdates(this);

        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          addRootElementEvents(nextRootElement, this);
        }
        if (classNames != null) {
          nextRootElement.classList.add(...classNames);
        }
      } else {
        // If content editable is unmounted we'll reset editor state back to original
        // (or pending) editor state since there will be no reconciliation
        this._editorState = pendingEditorState;
        this._pendingEditorState = null;
        this._window = null;
      }
      triggerListeners('root', this, false, nextRootElement, prevRootElement);
    }
  }

  /**
   * Gets the underlying HTMLElement associated with the LexicalNode for the given key.
   * @returns the HTMLElement rendered by the LexicalNode associated with the key.
   * @param key - the key of the LexicalNode.
   */
  getElementByKey(key) {
    return this._keyToDOMMap.get(key) || null;
  }

  /**
   * Gets the active editor state.
   * @returns The editor state
   */
  getEditorState() {
    return this._editorState;
  }

  /**
   * Imperatively set the EditorState. Triggers reconciliation like an update.
   * @param editorState - the state to set the editor
   * @param options - options for the update.
   */
  setEditorState(editorState, options) {
    if (editorState.isEmpty()) {
      {
        throw Error(`setEditorState: the editor state is empty. Ensure the editor state's root node never becomes empty.`);
      }
    }
    flushRootMutations(this);
    const pendingEditorState = this._pendingEditorState;
    const tags = this._updateTags;
    const tag = options !== undefined ? options.tag : null;
    if (pendingEditorState !== null && !pendingEditorState.isEmpty()) {
      if (tag != null) {
        tags.add(tag);
      }
      commitPendingUpdates(this);
    }
    this._pendingEditorState = editorState;
    this._dirtyType = FULL_RECONCILE;
    this._dirtyElements.set('root', false);
    this._compositionKey = null;
    if (tag != null) {
      tags.add(tag);
    }
    commitPendingUpdates(this);
  }

  /**
   * Parses a SerializedEditorState (usually produced by {@link EditorState.toJSON}) and returns
   * and EditorState object that can be, for example, passed to {@link LexicalEditor.setEditorState}. Typically,
   * deserliazation from JSON stored in a database uses this method.
   * @param maybeStringifiedEditorState
   * @param updateFn
   * @returns
   */
  parseEditorState(maybeStringifiedEditorState, updateFn) {
    const serializedEditorState = typeof maybeStringifiedEditorState === 'string' ? JSON.parse(maybeStringifiedEditorState) : maybeStringifiedEditorState;
    return parseEditorState(serializedEditorState, this, updateFn);
  }

  /**
   * Executes an update to the editor state. The updateFn callback is the ONLY place
   * where Lexical editor state can be safely mutated.
   * @param updateFn - A function that has access to writable editor state.
   * @param options - A bag of options to control the behavior of the update.
   * @param options.onUpdate - A function to run once the update is complete.
   * Useful for synchronizing updates in some cases.
   * @param options.skipTransforms - Setting this to true will suppress all node
   * transforms for this update cycle.
   * @param options.tag - A tag to identify this update, in an update listener, for instance.
   * Some tags are reserved by the core and control update behavior in different ways.
   * @param options.discrete - If true, prevents this update from being batched, forcing it to
   * run synchronously.
   */
  update(updateFn, options) {
    updateEditor(this, updateFn, options);
  }

  /**
   * Focuses the editor
   * @param callbackFn - A function to run after the editor is focused.
   * @param options - A bag of options
   * @param options.defaultSelection - Where to move selection when the editor is
   * focused. Can be rootStart, rootEnd, or undefined. Defaults to rootEnd.
   */
  focus(callbackFn, options = {}) {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      // This ensures that iOS does not trigger caps lock upon focus
      rootElement.setAttribute('autocapitalize', 'off');
      updateEditor(this, () => {
        const selection = $getSelection();
        const root = $getRoot();
        if (selection !== null) {
          // Marking the selection dirty will force the selection back to it
          selection.dirty = true;
        } else if (root.getChildrenSize() !== 0) {
          if (options.defaultSelection === 'rootStart') {
            root.selectStart();
          } else {
            root.selectEnd();
          }
        }
      }, {
        onUpdate: () => {
          rootElement.removeAttribute('autocapitalize');
          if (callbackFn) {
            callbackFn();
          }
        },
        tag: 'focus'
      });
      // In the case where onUpdate doesn't fire (due to the focus update not
      // occuring).
      if (this._pendingEditorState === null) {
        rootElement.removeAttribute('autocapitalize');
      }
    }
  }

  /**
   * Removes focus from the editor.
   */
  blur() {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      rootElement.blur();
    }
    const domSelection = getDOMSelection(this._window);
    if (domSelection !== null) {
      domSelection.removeAllRanges();
    }
  }
  /**
   * Returns true if the editor is editable, false otherwise.
   * @returns True if the editor is editable, false otherwise.
   */
  isEditable() {
    return this._editable;
  }
  /**
   * Sets the editable property of the editor. When false, the
   * editor will not listen for user events on the underling contenteditable.
   * @param editable - the value to set the editable mode to.
   */
  setEditable(editable) {
    if (this._editable !== editable) {
      this._editable = editable;
      triggerListeners('editable', this, true, editable);
    }
  }
  /**
   * Returns a JSON-serializable javascript object NOT a JSON string.
   * You still must call JSON.stringify (or something else) to turn the
   * state into a string you can transfer over the wire and store in a database.
   *
   * See {@link LexicalNode.exportJSON}
   *
   * @returns A JSON-serializable javascript object
   */
  toJSON() {
    return {
      editorState: this._editorState.toJSON()
    };
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class DEPRECATED_GridCellNode extends ElementNode {
  /** @internal */

  constructor(colSpan, key) {
    super(key);
    this.__colSpan = colSpan;
    this.__rowSpan = 1;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      colSpan: this.__colSpan,
      rowSpan: this.__rowSpan
    };
  }
  getColSpan() {
    return this.__colSpan;
  }
  setColSpan(colSpan) {
    this.getWritable().__colSpan = colSpan;
    return this;
  }
  getRowSpan() {
    return this.__rowSpan;
  }
  setRowSpan(rowSpan) {
    this.getWritable().__rowSpan = rowSpan;
    return this;
  }
}
function DEPRECATED_$isGridCellNode(node) {
  return node instanceof DEPRECATED_GridCellNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
class DEPRECATED_GridNode extends ElementNode {}
function DEPRECATED_$isGridNode(node) {
  return node instanceof DEPRECATED_GridNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
class DEPRECATED_GridRowNode extends ElementNode {}
function DEPRECATED_$isGridRowNode(node) {
  return node instanceof DEPRECATED_GridRowNode;
}

exports.$addUpdateTag = $addUpdateTag;
exports.$applyNodeReplacement = $applyNodeReplacement;
exports.$copyNode = $copyNode;
exports.$createLineBreakNode = $createLineBreakNode;
exports.$createNodeSelection = $createNodeSelection;
exports.$createParagraphNode = $createParagraphNode;
exports.$createRangeSelection = $createRangeSelection;
exports.$createTabNode = $createTabNode;
exports.$createTextNode = $createTextNode;
exports.$getAdjacentNode = $getAdjacentNode;
exports.$getNearestNodeFromDOMNode = $getNearestNodeFromDOMNode;
exports.$getNearestRootOrShadowRoot = $getNearestRootOrShadowRoot;
exports.$getNodeByKey = $getNodeByKey;
exports.$getPreviousSelection = $getPreviousSelection;
exports.$getRoot = $getRoot;
exports.$getSelection = $getSelection;
exports.$getTextContent = $getTextContent;
exports.$hasAncestor = $hasAncestor;
exports.$hasUpdateTag = $hasUpdateTag;
exports.$insertNodes = $insertNodes;
exports.$isBlockElementNode = $isBlockElementNode;
exports.$isDecoratorNode = $isDecoratorNode;
exports.$isElementNode = $isElementNode;
exports.$isInlineElementOrDecoratorNode = $isInlineElementOrDecoratorNode;
exports.$isLeafNode = $isLeafNode;
exports.$isLineBreakNode = $isLineBreakNode;
exports.$isNodeSelection = $isNodeSelection;
exports.$isParagraphNode = $isParagraphNode;
exports.$isRangeSelection = $isRangeSelection;
exports.$isRootNode = $isRootNode;
exports.$isRootOrShadowRoot = $isRootOrShadowRoot;
exports.$isTabNode = $isTabNode;
exports.$isTextNode = $isTextNode;
exports.$nodesOfType = $nodesOfType;
exports.$normalizeSelection__EXPERIMENTAL = $normalizeSelection;
exports.$parseSerializedNode = $parseSerializedNode;
exports.$selectAll = $selectAll;
exports.$setCompositionKey = $setCompositionKey;
exports.$setSelection = $setSelection;
exports.$splitNode = $splitNode;
exports.BLUR_COMMAND = BLUR_COMMAND;
exports.CAN_REDO_COMMAND = CAN_REDO_COMMAND;
exports.CAN_UNDO_COMMAND = CAN_UNDO_COMMAND;
exports.CLEAR_EDITOR_COMMAND = CLEAR_EDITOR_COMMAND;
exports.CLEAR_HISTORY_COMMAND = CLEAR_HISTORY_COMMAND;
exports.CLICK_COMMAND = CLICK_COMMAND;
exports.COMMAND_PRIORITY_CRITICAL = COMMAND_PRIORITY_CRITICAL;
exports.COMMAND_PRIORITY_EDITOR = COMMAND_PRIORITY_EDITOR;
exports.COMMAND_PRIORITY_HIGH = COMMAND_PRIORITY_HIGH;
exports.COMMAND_PRIORITY_LOW = COMMAND_PRIORITY_LOW;
exports.COMMAND_PRIORITY_NORMAL = COMMAND_PRIORITY_NORMAL;
exports.CONTROLLED_TEXT_INSERTION_COMMAND = CONTROLLED_TEXT_INSERTION_COMMAND;
exports.COPY_COMMAND = COPY_COMMAND;
exports.CUT_COMMAND = CUT_COMMAND;
exports.DELETE_CHARACTER_COMMAND = DELETE_CHARACTER_COMMAND;
exports.DELETE_LINE_COMMAND = DELETE_LINE_COMMAND;
exports.DELETE_WORD_COMMAND = DELETE_WORD_COMMAND;
exports.DEPRECATED_$computeGridMap = DEPRECATED_$computeGridMap;
exports.DEPRECATED_$createGridSelection = DEPRECATED_$createGridSelection;
exports.DEPRECATED_$getNodeTriplet = DEPRECATED_$getNodeTriplet;
exports.DEPRECATED_$isGridCellNode = DEPRECATED_$isGridCellNode;
exports.DEPRECATED_$isGridNode = DEPRECATED_$isGridNode;
exports.DEPRECATED_$isGridRowNode = DEPRECATED_$isGridRowNode;
exports.DEPRECATED_$isGridSelection = DEPRECATED_$isGridSelection;
exports.DEPRECATED_GridCellNode = DEPRECATED_GridCellNode;
exports.DEPRECATED_GridNode = DEPRECATED_GridNode;
exports.DEPRECATED_GridRowNode = DEPRECATED_GridRowNode;
exports.DRAGEND_COMMAND = DRAGEND_COMMAND;
exports.DRAGOVER_COMMAND = DRAGOVER_COMMAND;
exports.DRAGSTART_COMMAND = DRAGSTART_COMMAND;
exports.DROP_COMMAND = DROP_COMMAND;
exports.DecoratorNode = DecoratorNode;
exports.ElementNode = ElementNode;
exports.FOCUS_COMMAND = FOCUS_COMMAND;
exports.FORMAT_ELEMENT_COMMAND = FORMAT_ELEMENT_COMMAND;
exports.FORMAT_TEXT_COMMAND = FORMAT_TEXT_COMMAND;
exports.INDENT_CONTENT_COMMAND = INDENT_CONTENT_COMMAND;
exports.INSERT_LINE_BREAK_COMMAND = INSERT_LINE_BREAK_COMMAND;
exports.INSERT_PARAGRAPH_COMMAND = INSERT_PARAGRAPH_COMMAND;
exports.INSERT_TAB_COMMAND = INSERT_TAB_COMMAND;
exports.KEY_ARROW_DOWN_COMMAND = KEY_ARROW_DOWN_COMMAND;
exports.KEY_ARROW_LEFT_COMMAND = KEY_ARROW_LEFT_COMMAND;
exports.KEY_ARROW_RIGHT_COMMAND = KEY_ARROW_RIGHT_COMMAND;
exports.KEY_ARROW_UP_COMMAND = KEY_ARROW_UP_COMMAND;
exports.KEY_BACKSPACE_COMMAND = KEY_BACKSPACE_COMMAND;
exports.KEY_DELETE_COMMAND = KEY_DELETE_COMMAND;
exports.KEY_DOWN_COMMAND = KEY_DOWN_COMMAND;
exports.KEY_ENTER_COMMAND = KEY_ENTER_COMMAND;
exports.KEY_ESCAPE_COMMAND = KEY_ESCAPE_COMMAND;
exports.KEY_MODIFIER_COMMAND = KEY_MODIFIER_COMMAND;
exports.KEY_SPACE_COMMAND = KEY_SPACE_COMMAND;
exports.KEY_TAB_COMMAND = KEY_TAB_COMMAND;
exports.LineBreakNode = LineBreakNode;
exports.MOVE_TO_END = MOVE_TO_END;
exports.MOVE_TO_START = MOVE_TO_START;
exports.OUTDENT_CONTENT_COMMAND = OUTDENT_CONTENT_COMMAND;
exports.PASTE_COMMAND = PASTE_COMMAND;
exports.ParagraphNode = ParagraphNode;
exports.REDO_COMMAND = REDO_COMMAND;
exports.REMOVE_TEXT_COMMAND = REMOVE_TEXT_COMMAND;
exports.RootNode = RootNode;
exports.SELECTION_CHANGE_COMMAND = SELECTION_CHANGE_COMMAND;
exports.SELECT_ALL_COMMAND = SELECT_ALL_COMMAND;
exports.TabNode = TabNode;
exports.TextNode = TextNode;
exports.UNDO_COMMAND = UNDO_COMMAND;
exports.createCommand = createCommand;
exports.createEditor = createEditor;
exports.getNearestEditorFromDOMNode = getNearestEditorFromDOMNode;
exports.isSelectionCapturedInDecoratorInput = isSelectionCapturedInDecoratorInput;
exports.isSelectionWithinEditor = isSelectionWithinEditor;
