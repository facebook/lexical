/** @module @lexical/link */
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
} from 'lexical';

import {
  $findMatchingParent,
  addClassNamesToElement,
  isHTMLAnchorElement,
} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  createCommand,
  ElementNode,
} from 'lexical';

export type LinkAttributes = {
  rel?: null | string;
  target?: null | string;
};

/** @noInheritDoc */
export class LinkNode extends ElementNode {
  /** @internal */
  __url: string;
  /** @internal */
  __target: null | string;
  /** @internal */
  __rel: null | string;

  static getType(): string {
    return 'link';
  }

  static clone(node: LinkNode): LinkNode {
    return new LinkNode(
      node.__url,
      {rel: node.__rel, target: node.__target},
      node.__key,
    );
  }

  constructor(url: string, attributes: LinkAttributes = {}, key?: NodeKey) {
    super(key);
    const {target = null, rel = null} = attributes;
    this.__url = url;
    this.__target = target;
    this.__rel = rel;
    return $applyNodeReplacement(this);
  }

  createDOM(config: EditorConfig): HTMLAnchorElement {
    const element = document.createElement('a');
    element.href = this.__url;
    if (this.__target !== null) {
      element.target = this.__target;
    }
    if (this.__rel !== null) {
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

    if (target !== prevNode.__target) {
      if (target) {
        anchor.target = target;
      } else {
        anchor.removeAttribute('target');
      }
    }

    if (rel !== prevNode.__rel) {
      if (rel) {
        anchor.rel = rel;
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

  getURL(): string {
    return this.getLatest().__url;
  }

  setURL(url: string): void {
    const writable = this.getWritable();
    writable.__url = url;
  }

  getTarget(): null | string {
    return this.getLatest().__target;
  }

  setTarget(target: null | string): void {
    const writable = this.getWritable();
    writable.__target = target;
  }

  getRel(): null | string {
    return this.getLatest().__rel;
  }

  setRel(rel: null | string): void {
    const writable = this.getWritable();
    writable.__rel = rel;
  }

  insertNewAfter(
    selection: RangeSelection,
    restoreSelection = true,
  ): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(
      selection,
      restoreSelection,
    );
    if ($isElementNode(element)) {
      const linkNode = $createLinkNode(this.__url, {
        rel: this.__rel,
        target: this.__target,
      });
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
  if (isHTMLAnchorElement(domNode)) {
    const content = domNode.textContent;
    if (content !== null && content !== '') {
      node = $createLinkNode(domNode.getAttribute('href') || '', {
        rel: domNode.getAttribute('rel'),
        target: domNode.getAttribute('target'),
      });
    }
  }
  return {node};
}

export function $createLinkNode(
  url: string,
  attributes?: LinkAttributes,
): LinkNode {
  return new LinkNode(url, attributes);
}

export function $isLinkNode(
  node: LexicalNode | null | undefined,
): node is LinkNode {
  return node instanceof LinkNode;
}

// Custom node type to override `canInsertTextAfter` that will
// allow typing within the link
export class AutoLinkNode extends LinkNode {
  static getType(): string {
    return 'autolink';
  }

  constructor(url: string, attributes: LinkAttributes = {}, key?: NodeKey) {
    super(url, attributes, key);
    return $applyNodeReplacement(this);
  }

  static clone(node: AutoLinkNode): AutoLinkNode {
    return new AutoLinkNode(
      node.__url,
      {rel: node.__rel, target: node.__target},
      node.__key,
    );
  }

  static importDOM(): null {
    // TODO: Should link node should handle the import over autolink?
    return null;
  }

  insertNewAfter(
    selection: RangeSelection,
    restoreSelection = true,
  ): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(
      selection,
      restoreSelection,
    );
    if ($isElementNode(element)) {
      const linkNode = $createAutoLinkNode(this.__url, {
        rel: this.__rel,
        target: this.__target,
      });
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }
}

export function $createAutoLinkNode(
  url: string,
  attributes?: LinkAttributes,
): AutoLinkNode {
  return new AutoLinkNode(url, attributes);
}

export function $isAutoLinkNode(
  node: LexicalNode | null | undefined,
): node is AutoLinkNode {
  return node instanceof AutoLinkNode;
}

export const TOGGLE_LINK_COMMAND: LexicalCommand<
  string | ({url: string} & LinkAttributes) | null
> = createCommand('TOGGLE_LINK_COMMAND');

export function toggleLink(
  url: null | string,
  attributes: LinkAttributes = {},
): void {
  const {target} = attributes;
  const rel = attributes.rel === undefined ? 'noopener' : attributes.rel;
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return;
  }
  const nodes = selection.extract();

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
    if (nodes.length === 1) {
      const firstNode = nodes[0];
      // if the first node is a LinkNode or if its
      // parent is a LinkNode, we update the URL, target and rel.
      const linkNode = $findMatchingParent(firstNode, $isLinkNode) as LinkNode;
      if (linkNode !== null) {
        linkNode.setURL(url);
        if (target !== undefined) {
          linkNode.setTarget(target);
        }
        if (rel !== null) {
          linkNode.setRel(rel);
        }
        return;
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
        if (target !== undefined) {
          parent.setTarget(target);
        }
        if (rel !== null) {
          linkNode.setRel(rel);
        }
        return;
      }

      if (!parent.is(prevParent)) {
        prevParent = parent;
        linkNode = $createLinkNode(url, {rel, target});

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
