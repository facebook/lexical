/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  GridSelection,
  LexicalCommand,
  LexicalNode,
  NodeKey,
  NodeSelection,
  RangeSelection,
  SerializedElementNode,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  createCommand,
  ElementNode,
  Spread,
} from 'lexical';

export type SerializedLinkNode = Spread<
  {
    type: 'link';
    url: string;
    target?: string;
    relationship?: string;
    version: 1;
  },
  SerializedElementNode
>;

export class LinkNode extends ElementNode {
  __url: string;
  __target?: string;
  __relationship?: string;

  static getType(): string {
    return 'link';
  }

  static clone(node: LinkNode): LinkNode {
    return new LinkNode(
      node.__url,
      node.__target,
      node.__relationship,
      node.__key,
    );
  }

  constructor(
    url: string,
    target?: string,
    relationship?: string,
    key?: NodeKey,
  ) {
    super(key);
    this.__url = url;
    this.__target = target;
    this.__relationship = relationship;
  }

  createDOM(config: EditorConfig): HTMLAnchorElement {
    const element = document.createElement('a');
    element.href = this.__url;
    if (this.__target) {
      element.target = this.__target;
    }
    if (this.__relationship) {
      element.rel = this.__relationship;
    }
    addClassNamesToElement(element, config.theme.link);
    return element;
  }

  updateDOM(
    prevNode: LinkNode,
    anchor: HTMLAnchorElement,
    config: EditorConfig,
  ): boolean {
    const url = this.__url;
    const target = this.__target;
    const relationship = this.__relationship;
    if (url !== prevNode.__url) {
      anchor.href = url;
    }

    if (target !== prevNode.__target) {
      if (target) {
        anchor.target = target;
      } else {
        anchor.removeAttribute('target');
      }
    }

    if (relationship !== prevNode.__relationship) {
      if (relationship) {
        anchor.rel = relationship;
      } else {
        anchor.removeAttribute('rel');
      }
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      a: (node: Node) => ({
        conversion: convertAnchorElement,
        priority: 1,
      }),
    };
  }

  static importJSON(
    serializedNode: SerializedLinkNode | SerializedAutoLinkNode,
  ): LinkNode {
    const node = $createLinkNode(
      serializedNode.url,
      serializedNode.target,
      serializedNode.relationship,
    );
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedLinkNode | SerializedAutoLinkNode {
    return {
      ...super.exportJSON(),
      relationship: this.getRelationship(),
      target: this.getTarget(),
      type: 'link',
      url: this.getURL(),
      version: 1,
    };
  }

  getURL(): string {
    return this.getLatest().__url;
  }

  setURL(url: string): void {
    const writable = this.getWritable();
    writable.__url = url;
  }

  getTarget(): string | undefined {
    return this.getLatest().__target;
  }

  setTarget(target: string | undefined): void {
    const writable = this.getWritable();
    writable.__target = target;
  }

  getRelationship(): string | undefined {
    return this.getLatest().__relationship;
  }

  setRelationship(relationship: string | undefined): void {
    const writable = this.getWritable();
    writable.__relationship = relationship;
  }

  insertNewAfter(selection: RangeSelection): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(selection);
    if ($isElementNode(element)) {
      const linkNode = $createLinkNode(
        this.__url,
        this.__target,
        this.__relationship,
      );
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }

  canInsertTextBefore(): false {
    return false;
  }

  canInsertTextAfter(): false {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }

  isInline(): true {
    return true;
  }

  extractWithChild(
    child: LexicalNode,
    selection: RangeSelection | NodeSelection | GridSelection,
    destination: 'clone' | 'html',
  ): boolean {
    if (!$isRangeSelection(selection)) {
      return false;
    }

    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();

    return (
      this.isParentOf(anchorNode) &&
      this.isParentOf(focusNode) &&
      selection.getTextContent().length > 0
    );
  }
}

function convertAnchorElement(domNode: Node): DOMConversionOutput {
  let node = null;
  if (domNode instanceof HTMLAnchorElement) {
    node = $createLinkNode(
      domNode.getAttribute('href') || '',
      domNode.getAttribute('target') || undefined,
      domNode.getAttribute('rel') || undefined,
    );
  }
  return {node};
}

export function $createLinkNode(
  url: string,
  target?: string,
  relationship?: string,
): LinkNode {
  return new LinkNode(url, target, relationship);
}

export function $isLinkNode(
  node: LexicalNode | null | undefined,
): node is LinkNode {
  return node instanceof LinkNode;
}

export type SerializedAutoLinkNode = Spread<
  {
    type: 'autolink';
    version: 1;
  },
  SerializedLinkNode
>;

// Custom node type to override `canInsertTextAfter` that will
// allow typing within the link
export class AutoLinkNode extends LinkNode {
  static getType(): string {
    return 'autolink';
  }

  static clone(node: AutoLinkNode): AutoLinkNode {
    return new AutoLinkNode(
      node.__url,
      node.__target,
      node.__relationship,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedAutoLinkNode): AutoLinkNode {
    const node = $createAutoLinkNode(
      serializedNode.url,
      serializedNode.target,
      serializedNode.relationship,
    );
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  static importDOM(): null {
    // TODO: Should link node should handle the import over autolink?
    return null;
  }

  exportJSON(): SerializedAutoLinkNode {
    return {
      ...super.exportJSON(),
      type: 'autolink',
      version: 1,
    };
  }

  insertNewAfter(selection: RangeSelection): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(selection);
    if ($isElementNode(element)) {
      const linkNode = $createAutoLinkNode(
        this.__url,
        this.__target,
        this.__relationship,
      );
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }
}

export function $createAutoLinkNode(
  url: string,
  target?: string,
  relationship?: string,
): AutoLinkNode {
  return new AutoLinkNode(url, target, relationship);
}

export function $isAutoLinkNode(
  node: LexicalNode | null | undefined,
): node is AutoLinkNode {
  return node instanceof AutoLinkNode;
}

export const TOGGLE_LINK_COMMAND: LexicalCommand<
  | string
  | {
      url: string;
      target?: string;
      relationship?: string;
    }
  | null
> = createCommand();

export function toggleLink(
  url: null | string,
  target?: string,
  relationship?: string,
): void {
  const selection = $getSelection();

  if (selection !== null) {
    $setSelection(selection);
  }

  const sel = $getSelection();

  if (sel !== null) {
    const nodes = sel.extract();

    if (url === null) {
      // Remove LinkNodes
      nodes.forEach((node) => {
        const parent = node.getParent();

        if ($isLinkNode(parent)) {
          const children = parent.getChildren();

          for (let i = 0; i < children.length; i++) {
            parent.insertBefore(children[i]);
          }

          parent.remove();
        }
      });
    } else {
      // Add or merge LinkNodes
      if ($isRangeSelection(sel) && sel.isCollapsed()) {
        return;
      }
      if (nodes.length === 1) {
        const firstNode = nodes[0];

        // if the first node is a LinkNode or if its
        // parent is a LinkNode, we update the URL, target and relationship.
        if ($isLinkNode(firstNode)) {
          firstNode.setURL(url);
          firstNode.setTarget(target);
          firstNode.setRelationship(relationship);
          return;
        } else {
          const parent = firstNode.getParent();

          if ($isLinkNode(parent)) {
            // set parent to be the current linkNode
            // so that other nodes in the same parent
            // aren't handled separately below.
            parent.setURL(url);
            parent.setTarget(target);
            parent.setRelationship(relationship);
            return;
          }
        }
      }

      let prevParent: ElementNode | LinkNode | null = null;
      let linkNode: LinkNode | null = null;

      nodes.forEach((node) => {
        const parent = node.getParent();

        if (
          parent === linkNode ||
          parent === null ||
          ($isElementNode(node) && !node.isInline())
        ) {
          return;
        }

        if ($isLinkNode(parent)) {
          linkNode = parent;
          parent.setURL(url);
          parent.setTarget(target);
          parent.setRelationship(relationship);
          return;
        }

        if (!parent.is(prevParent)) {
          prevParent = parent;
          linkNode = $createLinkNode(url, target, relationship);

          if ($isLinkNode(parent)) {
            if (node.getPreviousSibling() === null) {
              parent.insertBefore(linkNode);
            } else {
              parent.insertAfter(linkNode);
            }
          } else {
            node.insertBefore(linkNode);
          }
        }

        if ($isLinkNode(node)) {
          if (node.is(linkNode)) {
            return;
          }
          if (linkNode !== null) {
            const children = node.getChildren();

            for (let i = 0; i < children.length; i++) {
              linkNode.append(children[i]);
            }
          }

          node.remove();
          return;
        }

        if (linkNode !== null) {
          linkNode.append(node);
        }
      });
    }
  }
}
