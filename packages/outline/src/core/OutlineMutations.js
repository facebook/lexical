/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from './OutlineEditor';
import type {Selection} from './OutlineSelection';
import type {TextNode} from './OutlineTextNode';

import {isTextNode, isDecoratorNode, $getSelection, $setSelection} from '.';
import {triggerListeners, updateEditor} from './OutlineUpdates';
import {
  $getNearestNodeFromDOMNode,
  getNodeFromDOMNode,
  pushLogEntry,
} from './OutlineUtils';

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

function isManagedLineBreak(dom: Node, target: Node): boolean {
  return (
    // $FlowFixMe: internal field
    target.__outlineLineBreak === dom || dom.__outlineInternalRef !== undefined
  );
}

function getLastSelection(editor: OutlineEditor): null | Selection {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    return selection !== null ? selection.clone() : null;
  });
}

function handleTextMutation(
  target: Text,
  node: TextNode,
  editor: OutlineEditor,
): void {
  const domSelection = window.getSelection();
  let anchorOffset = null;
  let focusOffset = null;
  if (domSelection !== null && domSelection.anchorNode === target) {
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
  }

  const text = target.nodeValue;
  const textMutation = {node, anchorOffset, focusOffset, text};
  triggerListeners('textmutation', editor, false, textMutation);
}

export function $flushMutations(
  editor: OutlineEditor,
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
        pushLogEntry('onMutation');
        let shouldRevertSelection = false;

        for (let i = 0; i < mutations.length; i++) {
          const mutation = mutations[i];
          const type = mutation.type;
          const target = mutation.target;
          const targetNode = $getNearestNodeFromDOMNode(target);

          if (isDecoratorNode(targetNode)) {
            continue;
          }
          if (type === 'characterData') {
            // Text mutations are deferred and passed to mutation listeners to be
            // processed outside of the Outline engine.
            if (
              shouldFlushTextMutations &&
              target.nodeType === 3 &&
              isTextNode(targetNode) &&
              targetNode.isAttached()
            ) {
              handleTextMutation(
                // $FlowFixMe: nodeType === 3 is a Text DOM node
                ((target: any): Text),
                targetNode,
                editor,
              );
            }
          } else if (type === 'childList') {
            shouldRevertSelection = true;
            // We attempt to "undo" any changes that have occured outside
            // of Outline. We want Outline's editor state to be source of truth.
            // To the user, these will look like no-ops.
            const addedDOMs = mutation.addedNodes;
            const removedDOMs = mutation.removedNodes;
            const siblingDOM = mutation.nextSibling;

            for (let s = 0; s < removedDOMs.length; s++) {
              const removedDOM = removedDOMs[s];
              const node = getNodeFromDOMNode(removedDOM);
              let placementDOM = siblingDOM;

              if (node !== null && node.isAttached()) {
                const nextSibling = node.getNextSibling();
                if (nextSibling !== null) {
                  const key = nextSibling.getKey();
                  const nextSiblingDOM = editor.getElementByKey(key);
                  if (
                    nextSiblingDOM !== null &&
                    nextSiblingDOM.parentNode !== null
                  ) {
                    placementDOM = nextSiblingDOM;
                  }
                }
              }
              if (placementDOM != null) {
                while (placementDOM != null) {
                  const parentDOM = placementDOM.parentNode;
                  if (parentDOM === target) {
                    target.insertBefore(removedDOM, placementDOM);
                    break;
                  }
                  placementDOM = parentDOM;
                }
              } else {
                target.appendChild(removedDOM);
              }
            }
            for (let s = 0; s < addedDOMs.length; s++) {
              const addedDOM = addedDOMs[s];
              const node = getNodeFromDOMNode(addedDOM);
              const parentDOM = addedDOM.parentNode;
              if (parentDOM != null && node === null) {
                parentDOM.removeChild(addedDOM);
              }
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
                !isManagedLineBreak(addedDOM, target)
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

export function flushRootMutations(editor: OutlineEditor): void {
  const observer = editor._observer;
  if (observer !== null) {
    const mutations = observer.takeRecords();
    $flushMutations(editor, mutations, observer);
  }
}

export function initMutationObserver(editor: OutlineEditor): void {
  initTextEntryListener();
  editor._observer = new MutationObserver(
    (mutations: Array<MutationRecord>, observer: MutationObserver) => {
      $flushMutations(editor, mutations, observer);
    },
  );
}
