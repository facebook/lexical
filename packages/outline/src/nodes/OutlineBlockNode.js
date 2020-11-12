// @flow

import {TextNode} from '..';
import type {NodeKey} from '../OutlineNode';

import {getWritableNode, Node, getNodeByKey} from '../OutlineNode';
import {getSelection} from '../OutlineSelection';
import {getActiveViewModel} from '../OutlineView';
import {invariant} from 'shared';

function combineAdjacentTextNodes(
  textNodes: Array<TextNode>,
  restoreSelection,
) {
  const selection = getSelection();
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  const anchorKey = selection.anchorKey;
  const focusKey = selection.focusKey;
  // Merge all text nodes into the first node
  const writableMergeToNode = getWritableNode(textNodes[0]);
  let textLength = writableMergeToNode.getTextContent().length;
  let restoreAnchorOffset = anchorOffset;
  let restoreFocusOffset = focusOffset;
  for (let i = 1; i < textNodes.length; i++) {
    const textNode = textNodes[i];
    const siblingText = textNode.getTextContent();
    if (restoreSelection && textNode._key === anchorKey) {
      restoreAnchorOffset = textLength + anchorOffset;
    }
    if (restoreSelection && textNode._key === focusKey) {
      restoreFocusOffset = textLength + focusOffset;
    }
    writableMergeToNode.spliceText(textLength, 0, siblingText);
    textLength += siblingText.length;
    textNode.remove();
  }
  if (restoreSelection) {
    writableMergeToNode.select(restoreAnchorOffset, restoreFocusOffset);
  }
}

export class BlockNode extends Node {
  _tag: string;
  _children: Array<NodeKey>;

  constructor(tag: string, key?: string) {
    super(key);
    this._children = [];
    this._tag = tag;
    this._type = 'block';
  }
  clone(): BlockNode {
    const clone = new BlockNode(this._tag);
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._key = this._key;
    clone._flags = this._flags;
    return clone;
  }
  isBlock(): true {
    return true;
  }
  getTag(): string {
    const self = this.getLatest();
    return self._tag;
  }
  getChildren(): Array<Node> {
    const self = this.getLatest();
    const children = self._children;
    const childrenNodes = [];
    for (let i = 0; i < children.length; i++) {
      const childNode = getNodeByKey(children[i]);
      if (childNode !== null) {
        childrenNodes.push(childNode);
      }
    }
    return childrenNodes;
  }
  getFirstChild(): null | Node {
    const self = this.getLatest();
    const children = self._children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return getNodeByKey(children[0]);
  }
  getLastChild(): null | Node {
    const self = this.getLatest();
    const children = self._children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return getNodeByKey(children[childrenLength - 1]);
  }

  // View

  _create(): HTMLElement {
    return document.createElement(this._tag);
  }
  _update(): boolean {
    return false;
  }

  // Mutators

  // TODO add support for appending multiple nodes?
  append(nodeToAppend: Node): BlockNode {
    const writableSelf = getWritableNode(this);
    const writableNodeToAppend = getWritableNode(nodeToAppend);
    // Remove node from previous parent
    const oldParent = writableNodeToAppend.getParent();
    if (oldParent !== null) {
      const writableParent = getWritableNode(oldParent);
      const children = writableParent._children;
      const index = children.indexOf(writableNodeToAppend._key);
      if (index > -1) {
        children.splice(index, 1);
      }
    }
    // Set child parent to self
    writableNodeToAppend._parent = writableSelf._key;
    // Append children.
    const newKey = writableNodeToAppend._key;
    writableSelf._children.push(newKey);
    // Add node to map
    const viewModel = getActiveViewModel();
    viewModel.nodeMap[newKey] = writableNodeToAppend;
    return writableSelf;
  }
  normalizeTextNodes(restoreSelection?: boolean): void {
    const children = this.getChildren();
    let toNormalize = [];
    let lastTextNodeFlags: number | null = null;
    for (let i = 0; i < children.length; i++) {
      const child: Node = children[i].getLatest();
      const flags = child._flags;

      if (child.isText() && !child.isImmutable() && !child.isSegmented()) {
        invariant(
          child instanceof TextNode,
          'child.isText() passed, but child is not a TextNode',
        );

        if (lastTextNodeFlags === null || flags === lastTextNodeFlags) {
          toNormalize.push(child);
          lastTextNodeFlags = flags;
        } else {
          toNormalize = [];
          lastTextNodeFlags = null;
        }
      } else {
        if (toNormalize.length > 1) {
          combineAdjacentTextNodes(toNormalize, restoreSelection);
        }
        toNormalize = [];
        lastTextNodeFlags = null;
      }
    }
    if (toNormalize.length > 1) {
      combineAdjacentTextNodes(toNormalize, restoreSelection);
    }
  }
}

export function createBlockNode(tag: string = 'div'): BlockNode {
  return new BlockNode(tag);
}
