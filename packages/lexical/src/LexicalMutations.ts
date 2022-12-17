/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {TextNode} from '.';
import type {LexicalEditor} from './LexicalEditor';
import type {
  GridSelection,
  NodeSelection,
  RangeSelection,
} from './LexicalSelection';

import {IS_FIREFOX} from 'shared/environment';

import {
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
} from '.';
import {DOM_TEXT_TYPE} from './LexicalConstants';
import {updateEditor} from './LexicalUpdates';
import {
  $getNearestNodeFromDOMNode,
  $updateTextNodeFromDOMContent,
  getDOMSelection,
  getNodeFromDOMNode,
  getWindow,
  internalGetRoot,
  isFirefoxClipboardEvents,
} from './LexicalUtils';
// The time between a text entry event and the mutation observer firing.
const TEXT_MUTATION_VARIANCE = 100;

let isProcessingMutations = false;
let lastTextEntryTimeStamp = 0;

export function getIsProcesssingMutations(): boolean {
  return isProcessingMutations;
}

function updateTimeStamp(event: Event) {
  lastTextEntryTimeStamp = event.timeStamp;
}

function initTextEntryListener(editor: LexicalEditor): void {
  if (lastTextEntryTimeStamp === 0) {
    getWindow(editor).addEventListener('textInput', updateTimeStamp, true);
  }
}

function isManagedLineBreak(
  dom: Node,
  target: Node,
  editor: LexicalEditor,
): boolean {
  return (
    // @ts-expect-error: internal field
    target.__lexicalLineBreak === dom ||
    // @ts-ignore We intentionally add this to the Node.
    dom[`__lexicalKey_${editor._key}`] !== undefined
  );
}

function getLastSelection(
  editor: LexicalEditor,
): null | RangeSelection | NodeSelection | GridSelection {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    return selection !== null ? selection.clone() : null;
  });
}

function handleTextMutation(
  target: Text,
  node: TextNode,
  editor: LexicalEditor,
): void {
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

function shouldUpdateTextNodeFromMutation(
  selection: null | RangeSelection | GridSelection | NodeSelection,
  targetDOM: Node,
  targetNode: TextNode,
): boolean {
  if ($isRangeSelection(selection)) {
    const anchorNode = selection.anchor.getNode();
    if (
      anchorNode.is(targetNode) &&
      selection.format !== anchorNode.getFormat()
    ) {
      return false;
    }
  }
  return targetDOM.nodeType === DOM_TEXT_TYPE && targetNode.isAttached();
}

export function $flushMutations(
  editor: LexicalEditor,
  mutations: Array<MutationRecord>,
  observer: MutationObserver,
): void {
  isProcessingMutations = true;
  const shouldFlushTextMutations =
    performance.now() - lastTextEntryTimeStamp > TEXT_MUTATION_VARIANCE;

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
        let targetNode = $getNearestNodeFromDOMNode(
          targetDOM,
          currentEditorState,
        );

        if (
          (targetNode === null && targetDOM !== rootElement) ||
          $isDecoratorNode(targetNode)
        ) {
          continue;
        }

        if (type === 'characterData') {
          // Text mutations are deferred and passed to mutation listeners to be
          // processed outside of the Lexical engine.
          if (
            shouldFlushTextMutations &&
            $isTextNode(targetNode) &&
            shouldUpdateTextNodeFromMutation(selection, targetDOM, targetNode)
          ) {
            handleTextMutation(
              // nodeType === DOM_TEXT_TYPE is a Text DOM node
              targetDOM as Text,
              targetNode,
              editor,
            );
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

            if (
              parentDOM != null &&
              addedDOM !== blockCursorElement &&
              node === null &&
              (addedDOM.nodeName !== 'BR' ||
                !isManagedLineBreak(addedDOM, parentDOM, editor))
            ) {
              if (IS_FIREFOX) {
                const possibleText =
                  (addedDOM as HTMLElement).innerText || addedDOM.nodeValue;

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

              if (
                (removedDOM.nodeName === 'BR' &&
                  isManagedLineBreak(removedDOM, targetDOM, editor)) ||
                blockCursorElement === removedDOM
              ) {
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

            if (
              parentDOM != null &&
              addedDOM.nodeName === 'BR' &&
              !isManagedLineBreak(addedDOM, target, editor)
            ) {
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

export function flushRootMutations(editor: LexicalEditor): void {
  const observer = editor._observer;

  if (observer !== null) {
    const mutations = observer.takeRecords();
    $flushMutations(editor, mutations, observer);
  }
}

export function initMutationObserver(editor: LexicalEditor): void {
  initTextEntryListener(editor);
  editor._observer = new MutationObserver(
    (mutations: Array<MutationRecord>, observer: MutationObserver) => {
      $flushMutations(editor, mutations, observer);
    },
  );
}
