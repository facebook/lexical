// @flow strict

import {TextNode} from '.';
import type {NodeKey} from './OutlineNode';

import {getWritableNode, Node, getNodeByKey} from './OutlineNode';
import {getSelection} from './OutlineSelection';
import {invariant} from './OutlineUtils';
import {getActiveViewModel} from './OutlineView';

function combineAdjacentTextNodes(
  textNodes: Array<TextNode>,
  restoreSelection,
) {
  const selection = getSelection();
  invariant(
    selection !== null,
    'combineAdjacentTextNodes: selection not found',
  );
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

export class BranchNode extends Node {
  _children: Array<NodeKey>;

  constructor(key?: string) {
    super(key);
    this._children = [];
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

  // Mutators

  // TODO add support for appending multiple nodes?
  append(nodeToAppend: Node): BranchNode {
    const writableSelf = getWritableNode(this);
    const writableNodeToAppend = getWritableNode(nodeToAppend);
    const viewModel = getActiveViewModel();
    const nodeMap = viewModel.nodeMap;
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
    const children = writableSelf._children;
    // Because we are appending a node, we need to check if the last
    // child is an empty text node so we can make it as dirty.
    const dirtySubTrees = viewModel.dirtySubTrees;
    const childrenLength = children.length;
    if (childrenLength > 0) {
      const lastChildKey = children[childrenLength - 1];
      const lastChild = nodeMap[lastChildKey];
      if (lastChild instanceof TextNode && lastChild._text === '') {
        dirtySubTrees.add(lastChildKey);
      }
    }
    // Append children.
    const newKey = writableNodeToAppend._key;
    children.push(newKey);
    // Add node to map
    nodeMap[newKey] = writableNodeToAppend;
    viewModel.destroyedNodes.delete(newKey);
    return writableSelf;
  }
  normalizeTextNodes(restoreSelection?: boolean): void {
    const children = this.getChildren();
    let toNormalize = [];
    let lastTextNodeFlags: number | null = null;
    for (let i = 0; i < children.length; i++) {
      const child: Node = children[i].getLatest();
      const flags = child._flags;

      if (
        child instanceof TextNode &&
        !child.isImmutable() &&
        !child.isSegmented()
      ) {
        if (lastTextNodeFlags === null || flags === lastTextNodeFlags) {
          toNormalize.push(child);
          lastTextNodeFlags = flags;
        } else {
          if (toNormalize.length > 1) {
            combineAdjacentTextNodes(toNormalize, restoreSelection);
          }
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
