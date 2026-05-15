/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import './index.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {
  addClassNamesToElement,
  mergeRegister,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {
  $getEditorDOMRenderConfig,
  $getNodeByKey,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
} from 'lexical';
import * as React from 'react';
import {useEffect} from 'react';

export type SerializedPageBreakNode = SerializedLexicalNode;

function PageBreakComponent({nodeKey}: {nodeKey: NodeKey}) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          const pbElem = editor.getElementByKey(nodeKey);
          if (pbElem === null || !(event.target instanceof Node)) {
            return false;
          }
          // Hit-test against the slot's inner `<figure>`, not the keyed
          // DOM. With an extension-added wrapper, the keyed DOM is the
          // wrapper and includes the gutter + any sibling controls (drag
          // handle, future add buttons, etc.); restricting `contains` to
          // the inner element keeps clicks on those siblings from
          // registering as a PageBreak selection.
          let target: HTMLElement = pbElem;
          editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey);
            if (node !== null) {
              target = $getEditorDOMRenderConfig(editor).$getDOMSlot(
                node,
                pbElem,
                editor,
              ).element;
            }
          });
          if (target.contains(event.target)) {
            if (!event.shiftKey) {
              clearSelection();
            }
            setSelected(!isSelected);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [clearSelection, editor, isSelected, nodeKey, setSelected]);

  useEffect(() => {
    const pbElem = editor.getElementByKey(nodeKey);
    if (pbElem !== null) {
      // Apply the selected class to the slot's content-bearing element
      // (the actual `<figure>`) rather than the keyed DOM, so a wrapper
      // added by an extension doesn't prevent the page-break-marker theme
      // from highlighting the figure.
      let target: HTMLElement = pbElem;
      editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey);
        if (node !== null) {
          target = $getEditorDOMRenderConfig(editor).$getDOMSlot(
            node,
            pbElem,
            editor,
          ).element;
        }
      });
      if (isSelected) {
        addClassNamesToElement(target, 'selected');
      } else {
        removeClassNamesFromElement(target, 'selected');
      }
    }
  }, [editor, isSelected, nodeKey]);

  return null;
}

export class PageBreakNode extends DecoratorNode<JSX.Element> {
  static getType(): string {
    return 'page-break';
  }

  static clone(node: PageBreakNode): PageBreakNode {
    return new PageBreakNode(node.__key);
  }

  static importJSON(serializedNode: SerializedPageBreakNode): PageBreakNode {
    return $createPageBreakNode().updateFromJSON(serializedNode);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      figure: (domNode: HTMLElement) => {
        const tp = domNode.getAttribute('type');
        if (tp !== this.getType()) {
          return null;
        }

        return {
          conversion: $convertPageBreakElement,
          priority: COMMAND_PRIORITY_HIGH,
        };
      },
    };
  }

  createDOM(): HTMLElement {
    const el = document.createElement('figure');
    el.style.pageBreakAfter = 'always';
    el.setAttribute('type', this.getType());
    return el;
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

  decorate(): JSX.Element {
    return <PageBreakComponent nodeKey={this.__key} />;
  }
}

function $convertPageBreakElement(): DOMConversionOutput {
  return {node: $createPageBreakNode()};
}

export function $createPageBreakNode(): PageBreakNode {
  return new PageBreakNode();
}

export function $isPageBreakNode(
  node: LexicalNode | null | undefined,
): node is PageBreakNode {
  return node instanceof PageBreakNode;
}
