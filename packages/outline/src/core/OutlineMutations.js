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

import {isTextNode, isDecoratorNode} from '.';
import {view} from './OutlineUpdates';
import {triggerListeners} from './OutlineListeners';
import {getNearestNodeFromDOMNode, getNodeFromDOMNode} from './OutlineUtils';

let isProcessingMutations: boolean = false;

export function getIsProcesssingMutations(): boolean {
  return isProcessingMutations;
}

function isManagedLineBreak(dom: Node, target: Node): boolean {
  return (
    // $FlowFixMe: internal field
    target.__outlineLineBreak === dom || dom.__outlineInternalRef !== undefined
  );
}

function getLastSelection(editor: OutlineEditor): null | Selection {
  return editor.getViewModel().read((lastView) => {
    const selection = lastView.getSelection();
    return selection !== null ? selection.clone() : null;
  });
}

function flushTextMutation(
  target: Text,
  node: TextNode,
  editor: OutlineEditor,
) {
  const domSelection = window.getSelection();
  let anchorOffset = null;
  let focusOffset = null;
  if (domSelection !== null && domSelection.anchorNode === target) {
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
  }

  const text = target.nodeValue;
  const textMutation = {node, anchorOffset, focusOffset, text};
  triggerListeners('textmutation', editor, editor, view, textMutation);
}

export function flushMutations(
  editor: OutlineEditor,
  mutations: Array<MutationRecord>,
  observer: MutationObserver,
): void {
  let shouldRevertSelection = false;
  for (let i = 0; i < mutations.length; i++) {
    const mutation = mutations[i];
    const type = mutation.type;
    const target = mutation.target;
    const targetNode = getNearestNodeFromDOMNode(target);

    if (isDecoratorNode(targetNode)) {
      continue;
    }
    if (type === 'characterData') {
      // Text mutations are deferred and passed to mutation listeners to be
      // processed outside of the Outline engine.
      if (
        target.nodeType === 3 &&
        isTextNode(targetNode) &&
        targetNode.isAttached()
      ) {
        // $FlowFixMe: nodeType === 3 is a Text DOM node
        flushTextMutation(((target: any): Text), targetNode, editor);
      }
    } else if (type === 'childList') {
      shouldRevertSelection = true;
      // We attempt to "undo" any changes that have occured outside
      // of Outline. We want Outline's view model to be source of truth.
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
            if (nextSiblingDOM !== null && nextSiblingDOM.parentNode !== null) {
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
    const selection = view.getSelection() || getLastSelection(editor);
    if (selection !== null) {
      selection.dirty = true;
      view.setSelection(selection);
    }
  }
}

export function flushRootMutations(
  editor: OutlineEditor,
  mutations: Array<MutationRecord>,
  observer: MutationObserver,
): void {
  isProcessingMutations = true;
  try {
    editor.update(() => {
      view.log('onMutation');
      flushMutations(editor, mutations, observer);
    });
  } finally {
    isProcessingMutations = false;
  }
}

export function initMutationObserver(editor: OutlineEditor): void {
  editor._observer = new MutationObserver(
    (mutations: Array<MutationRecord>, observer: MutationObserver) => {
      flushRootMutations(editor, mutations, observer);
    },
  );
}
