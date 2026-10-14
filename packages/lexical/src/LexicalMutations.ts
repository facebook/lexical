/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from './LexicalEditor';
import type {EditorState} from './LexicalEditorState';
import type {BaseSelection} from './LexicalSelection';

import {
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type LexicalNode,
  type TextNode,
} from '.';
import {IS_FIREFOX} from './environment';
import {isDecoratorBoundaryAnchorDOM} from './LexicalDOMSlot';
import {updateEditorSync} from './LexicalUpdates';
import {
  $getNodeByKey,
  $updateTextNodeFromDOMContent,
  getDOMSelection,
  getDOMSelectionPoints,
  getNodeKeyFromDOMNode,
  getParentElement,
  getWindow,
  isDOMTextNode,
  isDOMUnmanaged,
  isFirefoxClipboardEvents,
  isHTMLElement,
} from './LexicalUtils';
// The time between a text entry event and the mutation observer firing.
const TEXT_MUTATION_VARIANCE = 100;

let isProcessingMutations = false;
let lastTextEntryTimeStamp = 0;

export function getIsProcessingMutations(): boolean {
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

function getLastSelection(editor: LexicalEditor): null | BaseSelection {
  return editor.read('latest', () => {
    const selection = $getSelection();
    return selection !== null ? selection.clone() : null;
  });
}

function $handleTextMutation(
  target: Text,
  node: TextNode,
  editor: LexicalEditor,
): void {
  const domSelection = getDOMSelection(getWindow(editor));
  const domSelectionPoints =
    domSelection && getDOMSelectionPoints(domSelection, editor._rootElement);
  let anchorOffset = null;
  let focusOffset = null;

  if (domSelectionPoints !== null && domSelectionPoints.anchorNode === target) {
    anchorOffset = domSelectionPoints.anchorOffset;
    focusOffset = domSelectionPoints.focusOffset;
  }

  const text = target.nodeValue;
  if (text !== null) {
    $updateTextNodeFromDOMContent(node, text, anchorOffset, focusOffset, false);
  }
}

function shouldUpdateTextNodeFromMutation(
  selection: null | BaseSelection,
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
  return isDOMTextNode(targetDOM) && targetNode.isAttached();
}

function $getNearestManagedNodePairFromDOMNode(
  startingDOM: Node,
  editor: LexicalEditor,
  editorState: EditorState,
): [HTMLElement, LexicalNode] | undefined {
  for (
    let dom: Node | null = startingDOM;
    dom && !isDOMUnmanaged(dom);
    dom = getParentElement(dom)
  ) {
    const key = getNodeKeyFromDOMNode(dom, editor);
    if (key !== undefined) {
      const node = $getNodeByKey(key, editorState);
      if (node) {
        // All decorator nodes are unmanaged
        return $isDecoratorNode(node) || !isHTMLElement(dom)
          ? undefined
          : [dom, node];
      }
    }
  }
}

function flushMutations(
  editor: LexicalEditor,
  mutations: MutationRecord[],
  observer: MutationObserver,
): void {
  isProcessingMutations = true;
  const shouldFlushTextMutations =
    performance.now() - lastTextEntryTimeStamp > TEXT_MUTATION_VARIANCE;
  try {
    updateEditorSync(editor, () => {
      const selection = $getSelection() || getLastSelection(editor);
      const badDOMTargets = new Map<HTMLElement, LexicalNode>();
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
        const pair = $getNearestManagedNodePairFromDOMNode(
          targetDOM,
          editor,
          currentEditorState,
        );
        if (!pair) {
          continue;
        }
        const [nodeDOM, targetNode] = pair;

        if (type === 'characterData') {
          // Text mutations are deferred and passed to mutation listeners to be
          // processed outside of the Lexical engine.
          if (
            // TODO there is an edge case here if a mutation happens too quickly
            //      after text input, it may never be handled since we do not
            //      track the ignored mutations in any way
            shouldFlushTextMutations &&
            $isTextNode(targetNode) &&
            isDOMTextNode(targetDOM) &&
            shouldUpdateTextNodeFromMutation(selection, targetDOM, targetNode)
          ) {
            $handleTextMutation(targetDOM, targetNode, editor);
          }
        } else if (type === 'childList') {
          shouldRevertSelection = true;
          // We attempt to "undo" any changes that have occurred outside
          // of Lexical. We want Lexical's editor state to be source of truth.
          // To the user, these will look like no-ops.
          const addedDOMs = mutation.addedNodes;

          for (let s = 0; s < addedDOMs.length; s++) {
            const addedDOM = addedDOMs[s];
            const key = getNodeKeyFromDOMNode(addedDOM, editor);
            const parentDOM = addedDOM.parentNode;

            if (
              parentDOM != null &&
              addedDOM !== blockCursorElement &&
              // Not when it has moved on: scaffolding is put back below.
              parentDOM === targetDOM &&
              // Keyed DOM stays only when it is the DOM its node renders
              // to: a stale copy (of a removed node, or from before a node
              // was rendered anew) is evicted like foreign DOM. So is a node
              // of a managed line break: an edit that moved one took it from
              // an element that reconcileObservedMutation puts back together.
              // The reconciler adds a decorator boundary anchor (#8922) only
              // while nothing observes, so one added here was moved or copied
              // by something else and is evicted too.
              (key
                ? editor.getElementByKey(key) !== addedDOM
                : // @experimental named-slots. Slot containers are keyless
                  // reconciler scaffolding: a flush that observes one being
                  // parked in its host or relocated by an explicit mount must
                  // not evict it as foreign DOM. Gated on the editor slot
                  // latch so a non-slot editor still evicts foreign DOM that
                  // happens to carry a `data-lexical-slot` attribute.
                  !(
                    editor._slotsUsed &&
                    isHTMLElement(addedDOM) &&
                    addedDOM.hasAttribute('data-lexical-slot')
                  ) &&
                  // Skip externally-added DOM that's explicitly opted out of
                  // mutation tracking (e.g. an extension-rendered decoration
                  // inside a TextNode's span, like the autocomplete ghost).
                  !isDOMUnmanaged(addedDOM))
            ) {
              if (IS_FIREFOX) {
                const possibleText =
                  (isHTMLElement(addedDOM) ? addedDOM.innerText : null) ||
                  addedDOM.nodeValue;

                if (possibleText) {
                  possibleTextForFirefoxPaste += possibleText;
                }
              }

              parentDOM.removeChild(addedDOM);
            }
          }

          for (const removedDOM of mutation.removedNodes) {
            if (
              blockCursorElement === removedDOM ||
              isDecoratorBoundaryAnchorDOM(removedDOM)
            ) {
              // Back in its place, which matters for the scaffolding:
              // after its previous sibling when a later record took the
              // next one.
              const next = mutation.nextSibling;
              const prev = mutation.previousSibling;
              targetDOM.insertBefore(
                removedDOM,
                !next || next.parentNode === targetDOM
                  ? next
                  : !prev
                    ? targetDOM.firstChild
                    : prev.parentNode === targetDOM
                      ? prev.nextSibling
                      : null,
              );
            } else {
              // A removed child or managed line break is put back by
              // reconcileObservedMutation once every record has been seen,
              // since a later record can still move what it would sit next
              // to.
              badDOMTargets.set(nodeDOM, targetNode);
            }
          }
        }
      }

      // Now we process each of the unique target nodes, attempting
      // to restore their contents back to the source of truth, which
      // is Lexical's "current" editor state. This is basically like
      // an internal revert on the DOM.
      if (badDOMTargets.size > 0) {
        for (const [nodeDOM, targetNode] of badDOMTargets) {
          if ($isElementNode(targetNode)) {
            // Put back the children of the committed state: they are what
            // is on screen, and what this update's reconciler diffs the DOM
            // against when the flush runs inside an update (onInput) that
            // has already changed them.
            editor.read('latest', () =>
              targetNode.reconcileObservedMutation(nodeDOM, editor),
            );
          } else {
            targetNode.reconcileObservedMutation(nodeDOM, editor);
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

          for (let s = 0; s < addedNodes.length; s++) {
            const addedDOM = addedNodes[s];
            const parentDOM = addedDOM.parentNode;

            // Keep the line breaks the revert put back: a LineBreakNode's
            // and the managed one.
            if (
              parentDOM != null &&
              addedDOM.nodeName === 'BR' &&
              !getNodeKeyFromDOMNode(addedDOM, editor) &&
              !(addedDOM as Element).hasAttribute(
                'data-lexical-managed-linebreak',
              )
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
    flushMutations(editor, mutations, observer);
  }
}

export function initMutationObserver(editor: LexicalEditor): void {
  initTextEntryListener(editor);
  editor._observer = new MutationObserver(
    (mutations: MutationRecord[], observer: MutationObserver) => {
      flushMutations(editor, mutations, observer);
    },
  );
}
