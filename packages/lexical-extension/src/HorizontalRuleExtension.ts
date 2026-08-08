/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertNodeToNearestRoot} from '@lexical/utils';
import {
  $create,
  $createNodeSelection,
  $getDocument,
  $getNodeFromDOMNode,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  addClassNamesToElement,
  CLICK_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DecoratorNode,
  defineExtension,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  getDOMSelectionFromTarget,
  getDOMSelectionPoints,
  isDOMNode,
  isHTMLElement,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
  mergeRegister,
  type NodeKey,
  type NodeSelection,
  removeClassNamesFromElement,
  type SerializedLexicalNode,
} from 'lexical';

import {EditorStateExtension} from './EditorStateExtension';
import {NodeSelectionExtension} from './NodeSelectionExtension';
import {
  batch,
  effect,
  type ReadonlySignal,
  type Signal,
  signal,
} from './signals';

/**
 * The serialized form of a {@link HorizontalRuleNode}. It has no extra fields
 * beyond the base serialized node.
 */
export type SerializedHorizontalRuleNode = SerializedLexicalNode;

/**
 * Command that inserts a {@link HorizontalRuleNode} at the current selection.
 * Dispatch it with
 * `editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND)`.
 */
export const INSERT_HORIZONTAL_RULE_COMMAND: LexicalCommand<void> =
  /* @__PURE__ */ createCommand('INSERT_HORIZONTAL_RULE_COMMAND');

export class HorizontalRuleNode extends DecoratorNode<unknown> {
  $config() {
    // `extends` is intentionally left to the runtime default (the prototype
    // parent) rather than declared explicitly: the deprecated
    // `@lexical/react` HorizontalRuleNode subclasses this one and reuses the
    // same 'horizontalrule' type, so both `$config()` overrides must infer a
    // matching shape.
    return this.config('horizontalrule', {
      importDOM: {
        hr: () => ({
          conversion: $convertHorizontalRuleElement,
          priority: 0,
        }),
      },
    });
  }

  exportDOM(): DOMExportOutput {
    return {element: $getDocument().createElement('hr')};
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = $getDocument().createElement('hr');
    addClassNamesToElement(element, config.theme.hr);
    return element;
  }

  getTextContent(): string {
    return '\n';
  }

  isInline(): false {
    return false;
  }

  updateDOM(): boolean {
    return false;
  }
}

function $convertHorizontalRuleElement(): DOMConversionOutput {
  return {node: $createHorizontalRuleNode()};
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return $create(HorizontalRuleNode);
}

/**
 * @returns `true` if `node` is a {@link HorizontalRuleNode}, narrowing its type.
 */
export function $isHorizontalRuleNode(
  node: LexicalNode | null | undefined,
): node is HorizontalRuleNode {
  return node instanceof HorizontalRuleNode;
}

/**
 * A horizontal rule is a block decorator, so the empty space between it and an
 * adjacent block still belongs to the parent element. A click there is
 * resolved by the browser to a collapsed caret immediately before or after the
 * rule, which Lexical reconciles to a block cursor: the caret looks like it is
 * on the rule but typing goes into the neighbouring block. Arrow keys select
 * the rule from those positions, so find the rule the click landed beside and
 * let the click handler do the same.
 *
 * The DOM selection is read rather than the Lexical selection because the
 * `selectionchange` event that would update the editor state has not
 * necessarily been processed by the time `click` fires — the browser has
 * already moved the DOM caret on `mousedown`, so the DOM is the only source
 * that reflects this click.
 */
function $getHorizontalRuleBesideClick(
  editor: LexicalEditor,
  event: MouseEvent,
): null | HorizontalRuleNode {
  const domSelection = getDOMSelectionFromTarget(event.target);
  if (domSelection === null || !domSelection.isCollapsed) {
    return null;
  }
  const rootElement = editor.getRootElement();
  const {anchorNode, anchorOffset} = getDOMSelectionPoints(
    domSelection,
    rootElement,
  );
  if (!isHTMLElement(anchorNode)) {
    return null;
  }
  // The block cursor is transient DOM that Lexical inserts beside decorators;
  // it is not part of the Lexical tree, so drop it before indexing children.
  const blockCursorElement = editor._blockCursorElement;
  const childNodes = Array.prototype.filter.call(
    anchorNode.childNodes,
    (child: Node) => child !== blockCursorElement,
  ) as Node[];
  let offset = anchorOffset;
  if (
    blockCursorElement !== null &&
    blockCursorElement.parentNode === anchorNode &&
    Array.prototype.indexOf.call(anchorNode.childNodes, blockCursorElement) <
      offset
  ) {
    offset -= 1;
  }
  const childDOM =
    offset === childNodes.length ? childNodes[offset - 1] : childNodes[offset];
  const node = childDOM === undefined ? null : $getNodeFromDOMNode(childDOM);
  return $isHorizontalRuleNode(node) ? node : null;
}

function $toggleNodeSelection(
  node: LexicalNode,
  shiftKey: boolean = false,
): void {
  const selection = $getSelection();
  const wasSelected = node.isSelected();
  const key = node.getKey();
  let nodeSelection: NodeSelection;
  if (shiftKey && $isNodeSelection(selection)) {
    nodeSelection = selection;
  } else {
    nodeSelection = $createNodeSelection();
    $setSelection(nodeSelection);
  }
  if (wasSelected) {
    nodeSelection.delete(key);
  } else {
    nodeSelection.add(key);
  }
}

/**
 * An extension for HorizontalRuleNode that provides an implementation that
 * works without any React dependency.
 */
export const HorizontalRuleExtension = /* @__PURE__ */ defineExtension({
  dependencies: [EditorStateExtension, NodeSelectionExtension],
  name: '@lexical/extension/HorizontalRule',
  nodes: () => [HorizontalRuleNode],
  register(editor, config, state) {
    const {watchNodeKey} = state.getDependency(NodeSelectionExtension).output;
    const nodeSelectionStore = signal({
      nodeSelections: new Map<
        NodeKey,
        {
          domNode: Signal<null | HTMLElement>;
          selectedSignal: ReadonlySignal<boolean>;
        }
      >(),
    });
    const isSelectedClassName = editor._config.theme.hrSelected ?? 'selected';

    return mergeRegister(
      editor.registerCommand(
        INSERT_HORIZONTAL_RULE_COMMAND,
        type => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          const focusNode = selection.focus.getNode();

          if (focusNode !== null) {
            const horizontalRuleNode = $createHorizontalRuleNode();
            $insertNodeToNearestRoot(horizontalRuleNode);
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          if (isDOMNode(event.target)) {
            const node = $getNodeFromDOMNode(event.target);
            if ($isHorizontalRuleNode(node)) {
              $toggleNodeSelection(node, event.shiftKey);
              return true;
            }
          }
          const besideNode = $getHorizontalRuleBesideClick(editor, event);
          if (besideNode !== null) {
            const nodeSelection = $createNodeSelection();
            nodeSelection.add(besideNode.getKey());
            $setSelection(nodeSelection);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerMutationListener(HorizontalRuleNode, (nodes, payload) => {
        batch(() => {
          let didChange = false;
          const {nodeSelections} = nodeSelectionStore.peek();
          for (const [k, v] of nodes.entries()) {
            if (v === 'destroyed') {
              nodeSelections.delete(k);
              didChange = true;
            } else {
              const prev = nodeSelections.get(k);
              const dom = editor.getElementByKey(k);
              if (prev) {
                prev.domNode.value = dom;
              } else {
                didChange = true;
                nodeSelections.set(k, {
                  domNode: signal(dom),
                  selectedSignal: watchNodeKey(k),
                });
              }
            }
          }
          if (didChange) {
            nodeSelectionStore.value = {nodeSelections};
          }
        });
      }),
      effect(() => {
        const effects = [];
        for (const {
          domNode,
          selectedSignal,
        } of nodeSelectionStore.value.nodeSelections.values()) {
          effects.push(
            effect(() => {
              const dom = domNode.value;
              if (dom) {
                const isSelected = selectedSignal.value;
                if (isSelected) {
                  addClassNamesToElement(dom, isSelectedClassName);
                } else {
                  removeClassNamesFromElement(dom, isSelectedClassName);
                }
              }
            }),
          );
        }
        return mergeRegister(...effects);
      }),
    );
  },
});
