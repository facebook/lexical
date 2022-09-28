/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  DOMConversionMap,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  SerializedElementNode,
  Spread,
} from 'lexical';

import {TOGGLE_COLLAPSIBLE_COMMAND} from '.';
import {
  $createCollapsibleContentNode,
  $isCollapsibleContentNode,
} from './CollapsibleContentNode';

type SerializedCollapsibleTitleNode = Spread<
  {
    type: 'collapsible-title';
    version: 1;
  },
  SerializedElementNode
>;

export class CollapsibleTitleNode extends ElementNode {
  static getType(): string {
    return 'collapsible-title';
  }

  static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
    return new CollapsibleTitleNode(node.__key);
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement('div');
    dom.addEventListener('click', () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && selection.isCollapsed()) {
          editor.dispatchCommand(
            TOGGLE_COLLAPSIBLE_COMMAND,
            this.getParentOrThrow().getKey(),
          );
        }
      });
    });
    dom.classList.add('Collapsible__title');
    return dom;
  }

  updateDOM(prevNode: CollapsibleTitleNode, dom: HTMLElement): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {};
  }

  static importJSON(
    serializedNode: SerializedCollapsibleTitleNode,
  ): CollapsibleTitleNode {
    return $createCollapsibleTitleNode();
  }

  exportJSON(): SerializedCollapsibleTitleNode {
    return {
      ...super.exportJSON(),
      type: 'collapsible-title',
      version: 1,
    };
  }

  collapseAtStart(_selection: RangeSelection): boolean {
    this.getParentOrThrow().insertBefore(this);
    return true;
  }

  insertNewAfter(): ElementNode {
    const containerNode = this.getParentOrThrow();

    if (containerNode.getCollapsed()) {
      const paragraph = $createParagraphNode();
      containerNode.insertAfter(paragraph);
      return paragraph;
    } else {
      let contentNode = this.getNextSibling();
      if (!$isCollapsibleContentNode(contentNode)) {
        contentNode = $createCollapsibleContentNode();
      }

      const paragraph = $createParagraphNode();
      contentNode.append(paragraph);
      return paragraph;
    }
  }
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
  return new CollapsibleTitleNode();
}

export function $isCollapsibleTitleNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode;
}
