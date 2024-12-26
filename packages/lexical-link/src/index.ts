/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  BaseSelection,
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalCommand,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  Point,
  RangeSelection,
  SerializedElementNode,
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
  $normalizeSelection__EXPERIMENTAL,
  $setSelection,
  createCommand,
  ElementNode,
  Spread,
} from 'lexical';
import invariant from 'shared/invariant';

export type LinkAttributes = {
  rel?: null | string;
  target?: null | string;
  title?: null | string;
};

export type AutoLinkAttributes = Partial<
  Spread<LinkAttributes, {isUnlinked?: boolean}>
>;

export type SerializedLinkNode = Spread<
  {
    url: string;
  },
  Spread<LinkAttributes, SerializedElementNode>
>;

type LinkHTMLElementType = HTMLAnchorElement | HTMLSpanElement;

const SUPPORTED_URL_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'sms:',
  'tel:',
]);

/** @noInheritDoc */
export class LinkNode extends ElementNode {
  /** @internal */
  __url: string;
  /** @internal */
  __target: null | string;
  /** @internal */
  __rel: null | string;
  /** @internal */
  __title: null | string;

  static getType(): string {
    return 'link';
  }

  static clone(node: LinkNode): LinkNode {
    return new LinkNode(
      node.__url,
      {rel: node.__rel, target: node.__target, title: node.__title},
      node.__key,
    );
  }

  constructor(
    url: string = '',
    attributes: LinkAttributes = {},
    key?: NodeKey,
  ) {
    super(key);
    const {target = null, rel = null, title = null} = attributes;
    this.__url = url;
    this.__target = target;
    this.__rel = rel;
    this.__title = title;
  }

  createDOM(config: EditorConfig): LinkHTMLElementType {
    const element = document.createElement('a');
    element.href = this.sanitizeUrl(this.__url);
    if (this.__target !== null) {
      element.target = this.__target;
    }
    if (this.__rel !== null) {
      element.rel = this.__rel;
    }
    if (this.__title !== null) {
      element.title = this.__title;
    }
    addClassNamesToElement(element, config.theme.link);
    return element;
  }

  updateDOM(
    prevNode: this,
    anchor: LinkHTMLElementType,
    config: EditorConfig,
  ): boolean {
    if (isHTMLAnchorElement(anchor)) {
      const url = this.__url;
      const target = this.__target;
      const rel = this.__rel;
      const title = this.__title;
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

      if (title !== prevNode.__title) {
        if (title) {
          anchor.title = title;
        } else {
          anchor.removeAttribute('title');
        }
      }
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      a: (node: Node) => ({
        conversion: $convertAnchorElement,
        priority: 1,
      }),
    };
  }

  static importJSON(serializedNode: SerializedLinkNode): LinkNode {
    return $createLinkNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedLinkNode>): this {
    return super
      .updateFromJSON(serializedNode)
      .setURL(serializedNode.url)
      .setRel(serializedNode.rel || null)
      .setTarget(serializedNode.target || null)
      .setTitle(serializedNode.title || null);
  }

  sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // eslint-disable-next-line no-script-url
      if (!SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
        return 'about:blank';
      }
    } catch {
      return url;
    }
    return url;
  }

  exportJSON(): SerializedLinkNode | SerializedAutoLinkNode {
    return {
      ...super.exportJSON(),
      rel: this.getRel(),
      target: this.getTarget(),
      title: this.getTitle(),
      url: this.getURL(),
    };
  }

  getURL(): string {
    return this.getLatest().__url;
  }

  setURL(url: string): this {
    const writable = this.getWritable();
    writable.__url = url;
    return writable;
  }

  getTarget(): null | string {
    return this.getLatest().__target;
  }

  setTarget(target: null | string): this {
    const writable = this.getWritable();
    writable.__target = target;
    return writable;
  }

  getRel(): null | string {
    return this.getLatest().__rel;
  }

  setRel(rel: null | string): this {
    const writable = this.getWritable();
    writable.__rel = rel;
    return writable;
  }

  getTitle(): null | string {
    return this.getLatest().__title;
  }

  setTitle(title: null | string): this {
    const writable = this.getWritable();
    writable.__title = title;
    return writable;
  }

  insertNewAfter(
    _: RangeSelection,
    restoreSelection = true,
  ): null | ElementNode {
    const linkNode = $createLinkNode(this.__url, {
      rel: this.__rel,
      target: this.__target,
      title: this.__title,
    });
    this.insertAfter(linkNode, restoreSelection);
    return linkNode;
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
    selection: BaseSelection,
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

  isEmailURI(): boolean {
    return this.__url.startsWith('mailto:');
  }

  isWebSiteURI(): boolean {
    return (
      this.__url.startsWith('https://') || this.__url.startsWith('http://')
    );
  }
}

function $convertAnchorElement(domNode: Node): DOMConversionOutput {
  let node = null;
  if (isHTMLAnchorElement(domNode)) {
    const content = domNode.textContent;
    if ((content !== null && content !== '') || domNode.children.length > 0) {
      node = $createLinkNode(domNode.getAttribute('href') || '', {
        rel: domNode.getAttribute('rel'),
        target: domNode.getAttribute('target'),
        title: domNode.getAttribute('title'),
      });
    }
  }
  return {node};
}

/**
 * Takes a URL and creates a LinkNode.
 * @param url - The URL the LinkNode should direct to.
 * @param attributes - Optional HTML a tag attributes \\{ target, rel, title \\}
 * @returns The LinkNode.
 */
export function $createLinkNode(
  url: string = '',
  attributes?: LinkAttributes,
): LinkNode {
  return $applyNodeReplacement(new LinkNode(url, attributes));
}

/**
 * Determines if node is a LinkNode.
 * @param node - The node to be checked.
 * @returns true if node is a LinkNode, false otherwise.
 */
export function $isLinkNode(
  node: LexicalNode | null | undefined,
): node is LinkNode {
  return node instanceof LinkNode;
}

export type SerializedAutoLinkNode = Spread<
  {
    isUnlinked: boolean;
  },
  SerializedLinkNode
>;

// Custom node type to override `canInsertTextAfter` that will
// allow typing within the link
export class AutoLinkNode extends LinkNode {
  /** @internal */
  /** Indicates whether the autolink was ever unlinked. **/
  __isUnlinked: boolean;

  constructor(
    url: string = '',
    attributes: AutoLinkAttributes = {},
    key?: NodeKey,
  ) {
    super(url, attributes, key);
    this.__isUnlinked =
      attributes.isUnlinked !== undefined && attributes.isUnlinked !== null
        ? attributes.isUnlinked
        : false;
  }

  static getType(): string {
    return 'autolink';
  }

  static clone(node: AutoLinkNode): AutoLinkNode {
    return new AutoLinkNode(
      node.__url,
      {
        isUnlinked: node.__isUnlinked,
        rel: node.__rel,
        target: node.__target,
        title: node.__title,
      },
      node.__key,
    );
  }

  getIsUnlinked(): boolean {
    return this.__isUnlinked;
  }

  setIsUnlinked(value: boolean): this {
    const self = this.getWritable();
    self.__isUnlinked = value;
    return self;
  }

  createDOM(config: EditorConfig): LinkHTMLElementType {
    if (this.__isUnlinked) {
      return document.createElement('span');
    } else {
      return super.createDOM(config);
    }
  }

  updateDOM(
    prevNode: this,
    anchor: LinkHTMLElementType,
    config: EditorConfig,
  ): boolean {
    return (
      super.updateDOM(prevNode, anchor, config) ||
      prevNode.__isUnlinked !== this.__isUnlinked
    );
  }

  static importJSON(serializedNode: SerializedAutoLinkNode): AutoLinkNode {
    return $createAutoLinkNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedAutoLinkNode>,
  ): this {
    return super
      .updateFromJSON(serializedNode)
      .setIsUnlinked(serializedNode.isUnlinked || false);
  }

  static importDOM(): null {
    // TODO: Should link node should handle the import over autolink?
    return null;
  }

  exportJSON(): SerializedAutoLinkNode {
    return {
      ...super.exportJSON(),
      isUnlinked: this.__isUnlinked,
    };
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
        isUnlinked: this.__isUnlinked,
        rel: this.__rel,
        target: this.__target,
        title: this.__title,
      });
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }
}

/**
 * Takes a URL and creates an AutoLinkNode. AutoLinkNodes are generally automatically generated
 * during typing, which is especially useful when a button to generate a LinkNode is not practical.
 * @param url - The URL the LinkNode should direct to.
 * @param attributes - Optional HTML a tag attributes. \\{ target, rel, title \\}
 * @returns The LinkNode.
 */
export function $createAutoLinkNode(
  url: string = '',
  attributes?: AutoLinkAttributes,
): AutoLinkNode {
  return $applyNodeReplacement(new AutoLinkNode(url, attributes));
}

/**
 * Determines if node is an AutoLinkNode.
 * @param node - The node to be checked.
 * @returns true if node is an AutoLinkNode, false otherwise.
 */
export function $isAutoLinkNode(
  node: LexicalNode | null | undefined,
): node is AutoLinkNode {
  return node instanceof AutoLinkNode;
}

export const TOGGLE_LINK_COMMAND: LexicalCommand<
  string | ({url: string} & LinkAttributes) | null
> = createCommand('TOGGLE_LINK_COMMAND');

function $getPointNode(point: Point, offset: number): LexicalNode | null {
  if (point.type === 'element') {
    const node = point.getNode();
    invariant(
      $isElementNode(node),
      '$getPointNode: element point is not an ElementNode',
    );
    const childNode = node.getChildren()[point.offset + offset];
    return childNode || null;
  }
  return null;
}

/**
 * Preserve the logical start/end of a RangeSelection in situations where
 * the point is an element that may be reparented in the callback.
 *
 * @param $fn The function to run
 * @returns The result of the callback
 */
function $withSelectedNodes<T>($fn: () => T): T {
  const initialSelection = $getSelection();
  if (!$isRangeSelection(initialSelection)) {
    return $fn();
  }
  const normalized = $normalizeSelection__EXPERIMENTAL(initialSelection);
  const isBackwards = normalized.isBackward();
  const anchorNode = $getPointNode(normalized.anchor, isBackwards ? -1 : 0);
  const focusNode = $getPointNode(normalized.focus, isBackwards ? 0 : -1);
  const rval = $fn();
  if (anchorNode || focusNode) {
    const updatedSelection = $getSelection();
    if ($isRangeSelection(updatedSelection)) {
      const finalSelection = updatedSelection.clone();
      if (anchorNode) {
        const anchorParent = anchorNode.getParent();
        if (anchorParent) {
          finalSelection.anchor.set(
            anchorParent.getKey(),
            anchorNode.getIndexWithinParent() + (isBackwards ? 1 : 0),
            'element',
          );
        }
      }
      if (focusNode) {
        const focusParent = focusNode.getParent();
        if (focusParent) {
          finalSelection.focus.set(
            focusParent.getKey(),
            focusNode.getIndexWithinParent() + (isBackwards ? 0 : 1),
            'element',
          );
        }
      }
      $setSelection($normalizeSelection__EXPERIMENTAL(finalSelection));
    }
  }
  return rval;
}

/**
 * Generates or updates a LinkNode. It can also delete a LinkNode if the URL is null,
 * but saves any children and brings them up to the parent node.
 * @param url - The URL the link directs to.
 * @param attributes - Optional HTML a tag attributes. \\{ target, rel, title \\}
 */
export function $toggleLink(
  url: null | string,
  attributes: LinkAttributes = {},
): void {
  const {target, title} = attributes;
  const rel = attributes.rel === undefined ? 'noreferrer' : attributes.rel;
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return;
  }
  const nodes = selection.extract();

  if (url === null) {
    // Remove LinkNodes
    nodes.forEach((node) => {
      const parentLink = $findMatchingParent(
        node,
        (parent): parent is LinkNode =>
          !$isAutoLinkNode(parent) && $isLinkNode(parent),
      );

      if (parentLink) {
        const children = parentLink.getChildren();

        for (let i = 0; i < children.length; i++) {
          parentLink.insertBefore(children[i]);
        }

        parentLink.remove();
      }
    });
    return;
  }
  const updatedNodes = new Set<NodeKey>();
  const updateLinkNode = (linkNode: LinkNode) => {
    if (updatedNodes.has(linkNode.getKey())) {
      return;
    }
    updatedNodes.add(linkNode.getKey());
    linkNode.setURL(url);
    if (target !== undefined) {
      linkNode.setTarget(target);
    }
    if (rel !== undefined) {
      linkNode.setRel(rel);
    }
    if (title !== undefined) {
      linkNode.setTitle(title);
    }
  };
  // Add or merge LinkNodes
  if (nodes.length === 1) {
    const firstNode = nodes[0];
    // if the first node is a LinkNode or if its
    // parent is a LinkNode, we update the URL, target and rel.
    const linkNode = $getAncestor(firstNode, $isLinkNode);
    if (linkNode !== null) {
      return updateLinkNode(linkNode);
    }
  }

  $withSelectedNodes(() => {
    let linkNode: LinkNode | null = null;
    for (const node of nodes) {
      if (!node.isAttached()) {
        continue;
      }
      const parentLinkNode = $getAncestor(node, $isLinkNode);
      if (parentLinkNode) {
        updateLinkNode(parentLinkNode);
        continue;
      }
      if ($isElementNode(node)) {
        if (!node.isInline()) {
          // Ignore block nodes, if there are any children we will see them
          // later and wrap in a new LinkNode
          continue;
        }
        if ($isLinkNode(node)) {
          // If it's not an autolink node and we don't already have a LinkNode
          // in this block then we can update it and re-use it
          if (
            !$isAutoLinkNode(node) &&
            (linkNode === null || !linkNode.getParentOrThrow().isParentOf(node))
          ) {
            updateLinkNode(node);
            linkNode = node;
            continue;
          }
          // Unwrap LinkNode, we already have one or it's an AutoLinkNode
          for (const child of node.getChildren()) {
            node.insertBefore(child);
          }
          node.remove();
          continue;
        }
      }
      const prevLinkNode = node.getPreviousSibling();
      if ($isLinkNode(prevLinkNode) && prevLinkNode.is(linkNode)) {
        prevLinkNode.append(node);
        continue;
      }
      linkNode = $createLinkNode(url, {rel, target, title});
      node.insertAfter(linkNode);
      linkNode.append(node);
    }
  });
}
/** @deprecated renamed to {@link $toggleLink} by @lexical/eslint-plugin rules-of-lexical */
export const toggleLink = $toggleLink;

function $getAncestor<NodeType extends LexicalNode = LexicalNode>(
  node: LexicalNode,
  predicate: (ancestor: LexicalNode) => ancestor is NodeType,
) {
  let parent = node;
  while (parent !== null && parent.getParent() !== null && !predicate(parent)) {
    parent = parent.getParentOrThrow();
  }
  return predicate(parent) ? parent : null;
}
