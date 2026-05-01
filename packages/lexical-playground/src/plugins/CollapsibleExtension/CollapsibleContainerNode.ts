/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {IS_CHROME, IS_FIREFOX} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSiblingCaret,
  $isBlockElementNode,
  $isElementNode,
  $rewindSiblingCaret,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  isHTMLElement,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  RangeSelection,
  SerializedElementNode,
  Spread,
} from 'lexical';

import {
  $createCollapsibleContentNode,
  $isCollapsibleContentNode,
} from './CollapsibleContentNode';
import {
  $createCollapsibleTitleNode,
  $isCollapsibleTitleNode,
  CollapsibleTitleNode,
} from './CollapsibleTitleNode';
import {setDomHiddenUntilFound} from './CollapsibleUtils';

type SerializedCollapsibleContainerNode = Spread<
  {
    open: boolean;
  },
  SerializedElementNode
>;

export function $convertDetailsElement(
  domNode: HTMLDetailsElement,
): DOMConversionOutput | null {
  const isOpen = domNode.open !== undefined ? domNode.open : true;
  const node = $createCollapsibleContainerNode(isOpen);
  return {
    after: childLexicalNodes => {
      // CollapsibleContainerNode is a shadow root that requires exactly two
      // children: a CollapsibleTitleNode (from <summary>) followed by a
      // CollapsibleContentNode. Arbitrary <details> markup may include loose
      // text or block siblings; reshape the imported children into the
      // expected structure so the editor doesn't end up with TextNodes
      // directly under the shadow root.
      let titleNode: CollapsibleTitleNode | null = null;
      const bodyNodes: LexicalNode[] = [];
      for (const child of childLexicalNodes) {
        if (titleNode === null && $isCollapsibleTitleNode(child)) {
          titleNode = child;
        } else if ($isCollapsibleContentNode(child)) {
          // Lexical-exported markup wraps the body in a CollapsibleContentNode;
          // unwrap so we can rebuild a single canonical content node.
          for (const grandchild of child.getChildren()) {
            bodyNodes.push(grandchild);
          }
        } else {
          bodyNodes.push(child);
        }
      }
      if (titleNode === null) {
        titleNode = $createCollapsibleTitleNode();
      }
      const contentNode = $createCollapsibleContentNode();
      // CollapsibleContentNode is also a shadow root, so wrap any inline
      // siblings in a paragraph before appending.
      let pending: LexicalNode[] = [];
      const flushPending = () => {
        if (pending.length === 0) {
          return;
        }
        const paragraph = $createParagraphNode();
        paragraph.append(...pending);
        contentNode.append(paragraph);
        pending = [];
      };
      for (const body of bodyNodes) {
        if ($isBlockElementNode(body)) {
          flushPending();
          contentNode.append(body);
        } else {
          pending.push(body);
        }
      }
      flushPending();
      return [titleNode, contentNode];
    },
    node,
  };
}

export class CollapsibleContainerNode extends ElementNode {
  __open: boolean;

  constructor(open: boolean, key?: NodeKey) {
    super(key);
    this.__open = open;
  }

  static getType(): string {
    return 'collapsible-container';
  }

  static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
    return new CollapsibleContainerNode(node.__open, node.__key);
  }

  isShadowRoot(): boolean {
    return true;
  }

  collapseAtStart(selection: RangeSelection): boolean {
    // Unwrap the CollapsibleContainerNode by replacing it with the children
    // of its children (CollapsibleTitleNode, CollapsibleContentNode)
    const nodesToInsert: LexicalNode[] = [];
    for (const child of this.getChildren()) {
      if ($isElementNode(child)) {
        nodesToInsert.push(...child.getChildren());
      }
    }
    const caret = $rewindSiblingCaret($getSiblingCaret(this, 'previous'));
    caret.splice(1, nodesToInsert);
    // Merge the first child of the CollapsibleTitleNode with the
    // previous sibling of the CollapsibleContainerNode
    const [firstChild] = nodesToInsert;
    if (firstChild) {
      firstChild.selectStart().deleteCharacter(true);
    }
    return true;
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    // details is not well supported in Chrome #5582 and Firefox #8348
    let dom: HTMLElement;
    if (IS_CHROME || IS_FIREFOX) {
      dom = document.createElement('div');
      dom.setAttribute('open', '');
    } else {
      const detailsDom = document.createElement('details');
      detailsDom.open = this.__open;
      detailsDom.addEventListener('toggle', () => {
        const open = editor.getEditorState().read(() => this.getOpen());
        if (open !== detailsDom.open) {
          editor.update(() => this.toggleOpen());
        }
      });
      dom = detailsDom;
    }
    dom.classList.add('Collapsible__container');

    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLDetailsElement): boolean {
    const currentOpen = this.__open;
    if (prevNode.__open !== currentOpen) {
      // details is not well supported in Chrome #5582 and Firefox #8348
      if (IS_CHROME || IS_FIREFOX) {
        const contentDom = dom.children[1];
        if (!isHTMLElement(contentDom)) {
          throw new Error('Expected contentDom to be an HTMLElement');
        }
        if (currentOpen) {
          dom.setAttribute('open', '');
          contentDom.hidden = false;
        } else {
          dom.removeAttribute('open');
          setDomHiddenUntilFound(contentDom);
        }
      } else {
        dom.open = this.__open;
      }
    }

    return false;
  }

  static importDOM(): DOMConversionMap<HTMLDetailsElement> | null {
    return {
      details: (domNode: HTMLDetailsElement) => {
        return {
          conversion: $convertDetailsElement,
          priority: 1,
        };
      },
    };
  }

  static importJSON(
    serializedNode: SerializedCollapsibleContainerNode,
  ): CollapsibleContainerNode {
    return $createCollapsibleContainerNode(serializedNode.open).updateFromJSON(
      serializedNode,
    );
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('details');
    element.classList.add('Collapsible__container');
    element.setAttribute('open', this.__open.toString());
    return {element};
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(),
      open: this.__open,
    };
  }

  setOpen(open: boolean): this {
    const writable = this.getWritable();
    writable.__open = open;
    return writable;
  }

  getOpen(): boolean {
    return this.getLatest().__open;
  }

  toggleOpen(): this {
    return this.setOpen(!this.getOpen());
  }
}

export function $createCollapsibleContainerNode(
  isOpen: boolean,
): CollapsibleContainerNode {
  return new CollapsibleContainerNode(isOpen);
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}
