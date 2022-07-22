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
    rel?: string;
    version: 1;
  },
  SerializedElementNode
>;

export class LinkNode extends ElementNode {
  __url: string;
  __target?: string;
  __rel?: string;

  static getType(): string {
    return 'link';
  }

  static clone(node: LinkNode): LinkNode {
    return new LinkNode(node.__url, node.__target, node.__rel, node.__key);
  }

  constructor(url: string, target?: string, rel?: string, key?: NodeKey) {
    super(key);
    this.__url = url;
    this.__target = target;
    this.__rel = rel;
  }

  createDOM(config: EditorConfig): HTMLAnchorElement {
    const element = document.createElement('a');
    element.href = this.__url;
    if (this.__target) {
      element.target = this.__target;
    }
    if (this.__rel) {
      element.rel = this.__rel;
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
    const rel = this.__rel;
    if (url !== prevNode.__url) {
      anchor.href = url;
    }
    if (target && target !== prevNode.__target) {
      anchor.target = target;
    }
    if (rel && rel !== prevNode.__rel) {
      anchor.rel = rel;
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
      serializedNode.rel,
    );
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedLinkNode | SerializedAutoLinkNode {
    return {
      ...super.exportJSON(),
      rel: this.getRel(),
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

  getRel(): string | undefined {
    return this.getLatest().__rel;
  }

  setRel(rel: string | undefined): void {
    const writable = this.getWritable();
    writable.__rel = rel;
  }

  insertNewAfter(selection: RangeSelection): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(selection);
    if ($isElementNode(element)) {
      const linkNode = $createLinkNode(this.__url);
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
  rel?: string,
): LinkNode {
  return new LinkNode(url, target, rel);
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
    return new AutoLinkNode(node.__url, node.__key);
  }

  static importJSON(serializedNode: SerializedAutoLinkNode): AutoLinkNode {
    const node = $createAutoLinkNode(serializedNode.url);
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
      const linkNode = $createAutoLinkNode(this.__url);
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }
}

export function $createAutoLinkNode(url: string): AutoLinkNode {
  return new AutoLinkNode(url);
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
      rel?: string;
    }
  | null
> = createCommand();

export function toggleLink(
  url: null | string,
  target?: string,
  rel?: string,
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
        // parent is a LinkNode, we update the URL.
        if ($isLinkNode(firstNode)) {
          firstNode.setURL(url);
          firstNode.setTarget(target);
          firstNode.setRel(rel);
          return;
        } else {
          const parent = firstNode.getParent();

          if ($isLinkNode(parent)) {
            // set parent to be the current linkNode
            // so that other nodes in the same parent
            // aren't handled separately below.
            parent.setURL(url);
            parent.setTarget(target);
            parent.setRel(rel);
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
          parent.setRel(rel);
          return;
        }

        if (!parent.is(prevParent)) {
          prevParent = parent;
          linkNode = $createLinkNode(url, target, rel);

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
