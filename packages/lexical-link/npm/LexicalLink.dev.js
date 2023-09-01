/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var utils = require('@lexical/utils');
var lexical = require('lexical');

/** @module @lexical/link */
const SUPPORTED_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'sms:', 'tel:']);

/** @noInheritDoc */
class LinkNode extends lexical.ElementNode {
  /** @internal */

  /** @internal */

  /** @internal */

  /** @internal */

  static getType() {
    return 'link';
  }
  static clone(node) {
    return new LinkNode(node.__url, {
      rel: node.__rel,
      target: node.__target,
      title: node.__title
    }, node.__key);
  }
  constructor(url, attributes = {}, key) {
    super(key);
    const {
      target = null,
      rel = null,
      title = null
    } = attributes;
    this.__url = url;
    this.__target = target;
    this.__rel = rel;
    this.__title = title;
  }
  createDOM(config) {
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
    utils.addClassNamesToElement(element, config.theme.link);
    return element;
  }
  updateDOM(prevNode, anchor, config) {
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
    return false;
  }
  static importDOM() {
    return {
      a: node => ({
        conversion: convertAnchorElement,
        priority: 1
      })
    };
  }
  static importJSON(serializedNode) {
    const node = $createLinkNode(serializedNode.url, {
      rel: serializedNode.rel,
      target: serializedNode.target,
      title: serializedNode.title
    });
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }
  sanitizeUrl(url) {
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
  exportJSON() {
    return {
      ...super.exportJSON(),
      rel: this.getRel(),
      target: this.getTarget(),
      title: this.getTitle(),
      type: 'link',
      url: this.getURL(),
      version: 1
    };
  }
  getURL() {
    return this.getLatest().__url;
  }
  setURL(url) {
    const writable = this.getWritable();
    writable.__url = url;
  }
  getTarget() {
    return this.getLatest().__target;
  }
  setTarget(target) {
    const writable = this.getWritable();
    writable.__target = target;
  }
  getRel() {
    return this.getLatest().__rel;
  }
  setRel(rel) {
    const writable = this.getWritable();
    writable.__rel = rel;
  }
  getTitle() {
    return this.getLatest().__title;
  }
  setTitle(title) {
    const writable = this.getWritable();
    writable.__title = title;
  }
  insertNewAfter(selection, restoreSelection = true) {
    const element = this.getParentOrThrow().insertNewAfter(selection, restoreSelection);
    if (lexical.$isElementNode(element)) {
      const linkNode = $createLinkNode(this.__url, {
        rel: this.__rel,
        target: this.__target,
        title: this.__title
      });
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }
  canInsertTextBefore() {
    return false;
  }
  canInsertTextAfter() {
    return false;
  }
  canBeEmpty() {
    return false;
  }
  isInline() {
    return true;
  }
  extractWithChild(child, selection, destination) {
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    return this.isParentOf(anchorNode) && this.isParentOf(focusNode) && selection.getTextContent().length > 0;
  }
}
function convertAnchorElement(domNode) {
  let node = null;
  if (utils.isHTMLAnchorElement(domNode)) {
    const content = domNode.textContent;
    if (content !== null && content !== '') {
      node = $createLinkNode(domNode.getAttribute('href') || '', {
        rel: domNode.getAttribute('rel'),
        target: domNode.getAttribute('target'),
        title: domNode.getAttribute('title')
      });
    }
  }
  return {
    node
  };
}

/**
 * Takes a URL and creates a LinkNode.
 * @param url - The URL the LinkNode should direct to.
 * @param attributes - Optional HTML a tag attributes { target, rel, title }
 * @returns The LinkNode.
 */
function $createLinkNode(url, attributes) {
  return lexical.$applyNodeReplacement(new LinkNode(url, attributes));
}

/**
 * Determines if node is a LinkNode.
 * @param node - The node to be checked.
 * @returns true if node is a LinkNode, false otherwise.
 */
function $isLinkNode(node) {
  return node instanceof LinkNode;
}
// Custom node type to override `canInsertTextAfter` that will
// allow typing within the link
class AutoLinkNode extends LinkNode {
  static getType() {
    return 'autolink';
  }
  static clone(node) {
    return new AutoLinkNode(node.__url, {
      rel: node.__rel,
      target: node.__target,
      title: node.__title
    }, node.__key);
  }
  static importJSON(serializedNode) {
    const node = $createAutoLinkNode(serializedNode.url, {
      rel: serializedNode.rel,
      target: serializedNode.target,
      title: serializedNode.title
    });
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }
  static importDOM() {
    // TODO: Should link node should handle the import over autolink?
    return null;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'autolink',
      version: 1
    };
  }
  insertNewAfter(selection, restoreSelection = true) {
    const element = this.getParentOrThrow().insertNewAfter(selection, restoreSelection);
    if (lexical.$isElementNode(element)) {
      const linkNode = $createAutoLinkNode(this.__url, {
        rel: this._rel,
        target: this.__target,
        title: this.__title
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
 * @param attributes - Optional HTML a tag attributes. { target, rel, title }
 * @returns The LinkNode.
 */
function $createAutoLinkNode(url, attributes) {
  return lexical.$applyNodeReplacement(new AutoLinkNode(url, attributes));
}

/**
 * Determines if node is an AutoLinkNode.
 * @param node - The node to be checked.
 * @returns true if node is an AutoLinkNode, false otherwise.
 */
function $isAutoLinkNode(node) {
  return node instanceof AutoLinkNode;
}
const TOGGLE_LINK_COMMAND = lexical.createCommand('TOGGLE_LINK_COMMAND');

/**
 * Generates or updates a LinkNode. It can also delete a LinkNode if the URL is null,
 * but saves any children and brings them up to the parent node.
 * @param url - The URL the link directs to.
 * @param attributes - Optional HTML a tag attributes. { target, rel, title }
 */
function toggleLink(url, attributes = {}) {
  const {
    target,
    title
  } = attributes;
  const rel = attributes.rel === undefined ? 'noreferrer' : attributes.rel;
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection)) {
    return;
  }
  const nodes = selection.extract();
  if (url === null) {
    // Remove LinkNodes
    nodes.forEach(node => {
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
      const linkNode = $isLinkNode(firstNode) ? firstNode : $getLinkAncestor(firstNode);
      if (linkNode !== null) {
        linkNode.setURL(url);
        if (target !== undefined) {
          linkNode.setTarget(target);
        }
        if (rel !== null) {
          linkNode.setRel(rel);
        }
        if (title !== undefined) {
          linkNode.setTitle(title);
        }
        return;
      }
    }
    let prevParent = null;
    let linkNode = null;
    nodes.forEach(node => {
      const parent = node.getParent();
      if (parent === linkNode || parent === null || lexical.$isElementNode(node) && !node.isInline()) {
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
        if (title !== undefined) {
          linkNode.setTitle(title);
        }
        return;
      }
      if (!parent.is(prevParent)) {
        prevParent = parent;
        linkNode = $createLinkNode(url, {
          rel,
          target
        });
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
function $getLinkAncestor(node) {
  return $getAncestor(node, $isLinkNode);
}
function $getAncestor(node, predicate) {
  let parent = node;
  while (parent !== null && (parent = parent.getParent()) !== null && !predicate(parent));
  return parent;
}

exports.$createAutoLinkNode = $createAutoLinkNode;
exports.$createLinkNode = $createLinkNode;
exports.$isAutoLinkNode = $isAutoLinkNode;
exports.$isLinkNode = $isLinkNode;
exports.AutoLinkNode = AutoLinkNode;
exports.LinkNode = LinkNode;
exports.TOGGLE_LINK_COMMAND = TOGGLE_LINK_COMMAND;
exports.toggleLink = toggleLink;
