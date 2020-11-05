import {getWritableNode, Node, getNodeByKey} from '../OutlineNode';
import {getSelection} from '../OutlineSelection';

function combineAdjacentTextNodes(textNodes, restoreSelection) {
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
  constructor(tag) {
    super();
    this._children = [];
    this._tag = tag;
    this._type = 'block';
  }
  clone() {
    const clone = new BlockNode(this._tag);
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._key = this._key;
    clone._flags = this._flags;
    return clone;
  }
  isBlock() {
    return true;
  }
  getTag() {
    const self = this.getLatest();
    return self._tag;
  }
  getChildren() {
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
  getFirstChild() {
    const self = this.getLatest();
    const children = self._children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return getNodeByKey(children[0]);
  }
  getLastChild() {
    const self = this.getLatest();
    const children = self._children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return getNodeByKey(children[childrenLength - 1]);
  }

  // View

  _create() {
    return document.createElement(this._tag);
  }
  _update() {
    return false;
  }

  // Mutators

  // TODO add support for appending multiple nodes?
  append(nodeToAppend) {
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
    writableSelf._children.push(writableNodeToAppend._key);
    return writableSelf;
  }
  normalizeTextNodes(restoreSelection) {
    const children = this.getChildren();
    let toNormalize = [];
    let lastTextNodeFlags = null;
    for (let i = 0; i < children.length; i++) {
      const child = children[i].getLatest();
      const flags = child._flags;

      if (child.isText() && !child.isImmutable()) {
        if (lastTextNodeFlags === null || flags === lastTextNodeFlags) {
          toNormalize.push(child);
        } else {
          toNormalize = [];
        }
        lastTextNodeFlags = flags;
      } else {
        if (toNormalize.length > 1) {
          combineAdjacentTextNodes(toNormalize, restoreSelection);
        }
        toNormalize = [];
      }
    }
    if (toNormalize.length > 1) {
      combineAdjacentTextNodes(toNormalize, restoreSelection);
    }
  }
}

export function createBlockNode(tag = 'div') {
  return new BlockNode(tag);
}
