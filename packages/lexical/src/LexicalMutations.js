/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from './LexicalEditor';
import type {Selection} from './LexicalSelection';
import type {TextNode} from '.';

import {
  $isTextNode,
  $isDecoratorNode,
  $getSelection,
  $setSelection,
  $isElementNode,
  $getRoot,
} from '.';
import {updateEditor} from './LexicalUpdates';
import {
  $getNearestNodeFromDOMNode,
  getNodeFromDOMNode,
  $pushLogEntry,
  $updateTextNodeFromDOMContent,
} from './LexicalUtils';
import {DOM_TEXT_TYPE} from './LexicalConstants';

// The time between a text entry event and the mutation observer firing.
const TEXT_MUTATION_VARIANCE = 100;

let isProcessingMutations: boolean = false;
let lastTextEntryTimeStamp = 0;

export function getIsProcesssingMutations(): boolean {
  return isProcessingMutations;
}

function updateTimeStamp(event) {
  lastTextEntryTimeStamp = event.timeStamp;
}

function initTextEntryListener(): void {
  if (lastTextEntryTimeStamp === 0) {
    window.addEventListener('textInput', updateTimeStamp, true);
  }
}

function isManagedLineBreak(
  dom: Node,
  target: Node,
  editor: LexicalEditor,
): boolean {
  return (
    // $FlowFixMe: internal field
    target.__lexicalLineBreak === dom ||
    // $FlowFixMe: internal field
    dom['__lexicalKey_' + editor._key] !== undefined
  );
}

function getLastSelection(editor: LexicalEditor): null | Selection {
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
  const domSelection = window.getSelection();
  let anchorOffset = null;
  let focusOffset = null;
  if (domSelection !== null && domSelection.anchorNode === target) {
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
  }
  const text = target.nodeValue;
  $updateTextNodeFromDOMContent(node, text, anchorOffset, focusOffset, false);
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
    updateEditor(
      editor,
      () => {
        $pushLogEntry('onMutation');
        const badDOMTargets = new Map();
        const rootElement = editor.getRootElement();
        // We use the current edtior state, as that reflects what is
        // actually "on screen".
        const currentEditorState = editor._editorState;
        let shouldRevertSelection = false;

        for (let i = 0; i < mutations.length; i++) {
          const mutation = mutations[i];
          const type = mutation.type;
          const targetDOM = mutation.target;
          let targetNode = $getNearestNodeFromDOMNode(
            targetDOM,
            currentEditorState,
          );

          if ($isDecoratorNode(targetNode)) {
            continue;
          }
          if (type === 'characterData') {
            // Text mutations are deferred and passed to mutation listeners to be
            // processed outside of the Lexical engine.
            if (
              shouldFlushTextMutations &&
              targetDOM.nodeType === DOM_TEXT_TYPE &&
              $isTextNode(targetNode) &&
              targetNode.isAttached()
            ) {
              handleTextMutation(
                // $FlowFixMe: nodeType === DOM_TEXT_TYPE is a Text DOM node
                ((targetDOM: any): Text),
                targetNode,
                editor,
              );
            }
          } else if (type === 'childList') {
            shouldRevertSelection = true;
            // We attempt to "undo" any changes that have occured outside
            // of Lexical. We want Lexical's editor state to be source of truth.
            // To the user, these will look like no-ops.
            const addedDOMs = mutation.addedNodes;

            for (let s = 0; s < addedDOMs.length; s++) {
              const addedDOM = addedDOMs[s];
              const node = getNodeFromDOMNode(addedDOM);
              const parentDOM = addedDOM.parentNode;
              if (parentDOM != null && node === null) {
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
                  removedDOM.nodeName === 'BR' &&
                  isManagedLineBreak(removedDOM, targetDOM, editor)
                ) {
                  targetDOM.appendChild(removedDOM);
                  unremovedBRs++;
                }
              }
              if (removedDOMsLength !== unremovedBRs) {
                if (targetDOM === rootElement) {
                  targetNode = $getRoot(currentEditorState);
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
          const entries = Array.from(badDOMTargets.entries());
          for (let i = 0; i < entries.length; i++) {
            const [targetDOM, targetNode] = entries[i];

            if ($isElementNode(targetNode)) {
              const childKeys = targetNode.__children;
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
        if (shouldRevertSelection) {
          const selection = $getSelection() || getLastSelection(editor);
          if (selection !== null) {
            selection.dirty = true;
            $setSelection(selection);
          }
        }
      },
      true,
    );
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
  initTextEntryListener();
  editor._observer = new MutationObserver(
    (mutations: Array<MutationRecord>, observer: MutationObserver) => {
      $flushMutations(editor, mutations, observer);
    },
  );
}
