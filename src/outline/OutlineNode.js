import { getActiveViewModel, markParentsAsDirty } from "./OutlineView";
import { getSelection } from "./OutlineSelection";

let nodeKeyCounter = 0;

export const IS_BODY = 1;
export const IS_BLOCK = 1 << 1;
export const IS_TEXT = 1 << 2;
export const IS_IMMUTABLE = 1 << 3;
export const IS_BOLD = 1 << 4;
export const IS_ITALIC = 1 << 5;
export const IS_STRIKETHROUGH = 1 << 6;
export const IS_UNDERLINE = 1 << 7;

export const FORMAT_BOLD = 0;
export const FORMAT_ITALIC = 1;
export const FORMAT_STRIKETHROUGH = 2;
export const FORMAT_UNDERLINE = 3;

function removeNode(nodeToRemove) {
  const parent = nodeToRemove.getParent();
  if (parent === null) {
    return;
  }
  const writableParent = getWritableNode(parent, true);
  const parentChildren = writableParent._children;
  const key = nodeToRemove._key;
  const index = parentChildren.indexOf(key);
  if (index > -1) {
    parentChildren.splice(index, 1);
  }
  // Detach parent
  const writableNodeToRemove = getWritableNode(nodeToRemove);
  writableNodeToRemove._parent = null;
  writableNodeToRemove._key = null;
  // Remove children
  if (!nodeToRemove.isText()) {
    const children = nodeToRemove.getChildren();
    for (let i = 0; i < children.length; i++) {
      children[i].remove();
    }
  }
  // Remove key from node map
  const viewModel = getActiveViewModel();
  delete viewModel.nodeMap[key];
}

function replaceNode(toReplace, replaceWith) {
  const viewModel = getActiveViewModel();
  const nodeMap = viewModel.nodeMap;
  const oldKey = replaceWith._key;
  const newKey = toReplace._key;
  const writableToReplace = getWritableNode(toReplace);
  const writableReplaceWith = getWritableNode(replaceWith, true);
  // Copy over the key and parent pointers
  writableReplaceWith._parent = writableToReplace._parent;
  writableReplaceWith._key = newKey;
  nodeMap[newKey] = writableReplaceWith;
  // Change children parent pointers
  if (!replaceWith.isText()) {
    const children = replaceWith.getChildren();
    const toReplaceKey = toReplace._key;
    for (let i = 0; i < children.length; i++) {
      const child = getWritableNode(children[i]);
      child._parent = toReplaceKey;
    }
  }
  writableToReplace._parent = null;
  writableToReplace._key = null;
  // Remove the old key
  delete nodeMap[oldKey];
  return writableReplaceWith;
}

function combineAdjacentTextNodes(textNodes, restoreSelection) {
  const selection = getSelection();
  const anchorOffset = selection.anchorOffset;
  const focusOffset = selection.focusOffset;
  const anchorKey = selection.anchorKey;
  const focusKey = selection.focusKey;
  // Merge all text nodes into the first node
  const writableMergeToNode = getWritableNode(textNodes[0]);
  let textLength = writableMergeToNode.getTextContent().length;
  let restoreAnchorOffset = 0;
  let restoreFocusOffset = 0;
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

function splitText(node, splitOffsets) {
  if (!node.isText() || node.isImmutable()) {
    throw new Error("splitText: can only be used on non-immutable text nodes");
  }
  const textContent = node.getTextContent();
  const key = node._key;
  const offsetsSet = new Set(splitOffsets);
  const parts = [];
  const textLength = textContent.length;
  let string = "";
  for (let i = 0; i < textLength; i++) {
    if (string !== "" && offsetsSet.has(i)) {
      parts.push(string);
      string = "";
    }
    string += textContent[i];
  }
  if (string !== "") {
    parts.push(string);
  }
  const partsLength = parts.length;
  if (partsLength === 0) {
    return [];
  } else if (parts[0] === textContent) {
    return [node];
  }
  // For the first part, update the existing node
  const writableNode = getWritableNode(node);
  const parentKey = writableNode._parent;
  const firstPart = parts[0];
  const flags = writableNode._flags;
  writableNode._children = firstPart;

  // Handle selection
  const selection = getSelection();
  const { anchorKey, anchorOffset, focusKey, focusOffset } = selection;

  // Then handle all other parts
  const splitNodes = [writableNode];
  let textSize = firstPart.length;
  for (let i = 1; i < partsLength; i++) {
    const part = parts[i];
    const partSize = part.length;
    const sibling = getWritableNode(createTextNode(part));
    sibling._flags = flags;
    const siblingKey = sibling._key;
    const nextTextSize = textLength + partSize;

    if (
      anchorKey === key &&
      anchorOffset > textSize &&
      anchorOffset < nextTextSize
    ) {
      selection.anchorKey = siblingKey;
      selection.anchorOffset = anchorOffset - textSize;
    }
    if (
      focusKey === key &&
      focusOffset > textSize &&
      focusOffset < nextTextSize
    ) {
      selection.focusKey = siblingKey;
      selection.focusOffset = focusOffset - textSize;
    }
    textSize = nextTextSize;
    sibling._parent = parentKey;
    splitNodes.push(sibling);
  }

  // Insert the nodes into the parent's children
  const writableParent = getWritableNode(node.getParent());
  const writableParentChildren = writableParent._children;
  const insertionIndex = writableParentChildren.indexOf(key);
  const splitNodesKeys = splitNodes.map((splitNode) => splitNode._key);
  writableParentChildren.splice(insertionIndex, 1, ...splitNodesKeys);

  return splitNodes;
}

function Node(flags, children) {
  this._type = null;
  this._children = children;
  this._flags = flags;
  this._key = null;
  this._parent = null;
  this._style = null;
}

Object.assign(Node.prototype, {
  // Traversal and gettors

  getType() {
    const self = this.getLatest();
    const flags = self._flags;
    return getNodeType(self, flags);
  },
  getChildren() {
    if (this.isText()) {
      throw new Error("getChildren: can only be used on body/block nodes");
    }
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
  },
  getTextContent() {
    const self = this.getLatest();
    if (this.isText()) {
      return self._children;
    }
    let textContent = "";
    const children = this.getChildren();
    for (let i = 0; i < children.length; i++) {
      textContent += children[i].getTextContent();
    }
    return textContent;
  },
  getBlockType() {
    if (this.isText()) {
      throw new Error("getChildrenDeep: can only be used on block nodes");
    }
    return this.getLatest()._type;
  },
  getKey() {
    // Key is the only property that is stable between copies
    return this._key;
  },
  getFirstChild() {
    if (this.isText()) {
      return null;
    }
    const self = this.getLatest();
    const children = self._children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return getNodeByKey(children[0]);
  },
  getLastChild() {
    if (this.isText()) {
      return null;
    }
    const self = this.getLatest();
    const children = self._children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return getNodeByKey(children[childrenLength - 1]);
  },
  getPreviousSibling() {
    const parent = this.getParent();
    const children = parent._children;
    const index = children.indexOf(this._key);
    if (index <= 0) {
      return null;
    }
    return getNodeByKey(children[index - 1]);
  },
  getNextSibling() {
    const parent = this.getParent();
    const children = parent._children;
    const childrenLength = children.length;
    const index = children.indexOf(this._key);
    if (index >= childrenLength - 1) {
      return null;
    }
    return getNodeByKey(children[index + 1]);
  },
  getCommonAncestor(node) {
    const a = this.getParents();
    const b = node.getParents();
    const aLength = a.length;
    const bLength = b.length;
    if (aLength === 0 || bLength === 0 || a[aLength - 1] !== b[bLength - 1]) {
      return null;
    }
    const bSet = new Set(b);
    for (let i = 0; i < aLength; i++) {
      const ancestor = a[i];
      if (bSet.has(ancestor)) {
        return ancestor;
      }
    }
    return null;
  },
  getParent() {
    const parent = this.getLatest()._parent;
    if (parent === null) {
      return null;
    }
    return getNodeByKey(parent);
  },
  getParentBefore(target) {
    let node = this;
    while (node !== null) {
      const parent = node.getParent();
      if (parent._key === target._key) {
        return node;
      }
      node = parent;
    }
    return null;
  },
  getParentBlock() {
    let node = this;
    while (node !== null) {
      if (node.isBlock()) {
        return node;
      }
      node = node.getParent();
    }
    return null;
  },
  getParents() {
    const parents = [];
    let node = this.getParent();
    while (node !== null) {
      parents.push(node);
      node = node.getParent();
    }
    return parents;
  },
  isBefore(targetNode) {
    const commonAncestor = this.getCommonAncestor(targetNode);
    let indexA = 0;
    let indexB = 0;
    let node = this;
    while (true) {
      const parent = node.getParent();
      if (parent === commonAncestor) {
        indexA = parent._children.indexOf(node._key);
        break;
      }
      node = parent;
    }
    node = targetNode;
    while (true) {
      const parent = node.getParent();
      if (parent === commonAncestor) {
        indexB = parent._children.indexOf(node._key);
        break;
      }
      node = parent;
    }
    return indexA < indexB;
  },
  isParentOf(targetNode) {
    const key = this._key;
    let node = targetNode;
    while (node !== null) {
      if (node._key === key) {
        return true;
      }
      node = node.getParent();
    }
    return false;
  },
  isBold() {
    return (this.getLatest()._flags & IS_BOLD) !== 0;
  },
  isItalic() {
    return (this.getLatest()._flags & IS_ITALIC) !== 0;
  },
  isStrikethrough() {
    return (this.getLatest()._flags & IS_STRIKETHROUGH) !== 0;
  },
  isUnderline() {
    return (this.getLatest()._flags & IS_UNDERLINE) !== 0;
  },
  isBody() {
    return (this.getLatest()._flags & IS_BODY) !== 0;
  },
  isBlock() {
    return (this.getLatest()._flags & IS_BLOCK) !== 0;
  },
  isImmutable() {
    return (this.getLatest()._flags & IS_IMMUTABLE) !== 0;
  },
  isText() {
    return (this.getLatest()._flags & IS_TEXT) !== 0;
  },
  getLatest() {
    if (this._key === null) {
      return this;
    }
    const latest = getNodeByKey(this._key);
    if (latest === null) {
      return this;
    }
    return latest;
  },
  getNodesBetween(targetNode) {
    const isBefore = this.isBefore(targetNode);
    const nodes = [];

    if (isBefore) {
      let node = this;
      while (true) {
        nodes.push(node);
        if (node === targetNode) {
          break;
        }
        const child = node.getFirstChild();
        if (child !== null) {
          node = child;
          continue;
        }
        const nextSibling = node.getNextSibling();
        if (nextSibling !== null) {
          node = nextSibling;
          continue;
        }
        const parent = node.getParent();
        if (parent === null) {
          return null;
        }
        nodes.push(parent);
        let parentSibling = null;
        let ancestor = parent;
        do {
          if (ancestor === null) {
            return null;
          }
          parentSibling = ancestor.getNextSibling();
          ancestor = ancestor.getParent();
        } while (parentSibling === null);
        node = parentSibling;
      }
    } else {
      let node = this;
      while (true) {
        nodes.push(node);
        if (node === targetNode) {
          break;
        }
        const child = node.getLastChild();
        if (child !== null) {
          node = child;
          continue;
        }
        const prevSibling = node.getPreviousSibling();
        if (prevSibling !== null) {
          node = prevSibling;
          continue;
        }
        const parent = node.getParent();
        if (parent === null) {
          return null;
        }
        nodes.push(parent);
        let parentSibling = null;
        let ancestor = parent;
        do {
          if (ancestor === null) {
            return null;
          }
          parentSibling = ancestor.getPreviousSibling();
          ancestor = ancestor.getParent();
        } while (parentSibling === null);
        node = parentSibling;
      }
      nodes.reverse();
    }
    return nodes;
  },

  // Setters and mutators

  setFlags(flags) {
    if (this.isImmutable()) {
      throw new Error("setFlags: can only be used on non-immutable nodes");
    }
    const self = getWritableNode(this);
    self._flags = flags;
    return self;
  },
  setStyle(style) {
    if (this.isImmutable()) {
      throw new Error("setStyle: can only be used on non-immutable nodes");
    }
    const self = getWritableNode(this);
    self._style = style;
    return self;
  },
  makeBold() {
    if (!this.isText() || this.isImmutable()) {
      throw new Error("makeBold: can only be used on non-immutable text nodes");
    }
    const self = getWritableNode(this);
    self._flags |= IS_BOLD;
    return self;
  },
  makeImmutable() {
    const self = getWritableNode(this);
    self._flags |= IS_IMMUTABLE;
    return self;
  },
  makeNormal() {
    if (!this.isText() || this.isImmutable()) {
      throw new Error("select: can only be used on non-immutable text nodes");
    }
    const self = getWritableNode(this);
    self._flags = IS_TEXT;
    return self;
  },
  select(anchorOffset, focusOffset, isCollapsed = false) {
    if (!this.isText()) {
      throw new Error("select: can only be used on text nodes");
    }
    const selection = getSelection();
    const text = this.getTextContent();
    const key = this._key;
    selection.anchorKey = key;
    selection.focusKey = key;
    if (typeof text === "string") {
      const lastOffset = text.length;
      if (anchorOffset === undefined) {
        anchorOffset = lastOffset;
      }
      if (focusOffset === undefined) {
        focusOffset = lastOffset;
      }
    } else {
      anchorOffset = 0;
      focusOffset = 0;
    }
    selection.anchorOffset = anchorOffset;
    selection.focusOffset = focusOffset;
    selection.isCollapsed = isCollapsed;
    return selection;
  },
  splitText(...splitOffsets) {
    return splitText(this, splitOffsets);
  },
  remove() {
    return removeNode(this);
  },
  // TODO add support for replacing with multiple nodes?
  replace(targetNode) {
    return replaceNode(this, targetNode);
  },
  // TODO add support for inserting multiple nodes?
  insertAfter(nodeToInsert) {
    const writableSelf = getWritableNode(this);
    const writableNodeToInsert = getWritableNode(nodeToInsert);
    const writableParent = getWritableNode(this.getParent());
    const nodeToInsertParent = nodeToInsert.getParent();
    const insertKey = nodeToInsert._key;
    if (nodeToInsertParent !== null) {
      const writableNodeToInsertParent = getWritableNode(nodeToInsertParent);
      const parentChildren = writableNodeToInsertParent._children;
      const index = parentChildren.indexOf(insertKey);
      if (index > -1) {
        parentChildren.splice(index, 1);
      }
    }
    writableNodeToInsert._parent = writableSelf._parent;
    const children = writableParent._children;
    const index = children.indexOf(writableSelf._key);
    if (index > -1) {
      children.splice(index + 1, 0, insertKey);
    }
    return writableSelf;
  },
  // TODO add support for inserting multiple nodes?
  insertBefore(nodeToInsert) {
    const writableSelf = getWritableNode(this);
    const writableNodeToInsert = getWritableNode(nodeToInsert);
    const writableParent = getWritableNode(this.getParent());
    const insertKey = nodeToInsert._key;
    writableNodeToInsert._parent = writableSelf._parent;
    const children = writableParent._children;
    const index = children.indexOf(writableSelf._key);
    if (index > -1) {
      children.splice(index, 0, insertKey);
    }
    return writableSelf;
  },
  // TODO add support for appending multiple nodes?
  append(nodeToAppend) {
    if (this.isText()) {
      throw new Error("append(): can only used on body/block nodes");
    }
    const writableSelf = getWritableNode(this);
    const writableNodeToAppend = getWritableNode(nodeToAppend);
    // Set child parent to self
    writableNodeToAppend._parent = writableSelf._key;
    // Append children.
    writableSelf._children.push(writableNodeToAppend._key);
    return writableSelf;
  },
  spliceText(offset, delCount, newText, restoreSelection) {
    if (!this.isText() || this.isImmutable()) {
      throw new Error(
        "spliceText: can only be used on non-immutable text nodes"
      );
    }
    const writableSelf = getWritableNode(this);
    const text = writableSelf._children;
    const newTextLength = newText.length;
    let index = offset;
    if (index < 0) {
      index = newTextLength + index;
      if (index < 0) {
        index = 0;
      }
    }
    const updatedText =
      text.slice(0, index) + newText + text.slice(index + delCount);
    writableSelf._children = updatedText;
    if (restoreSelection) {
      const key = writableSelf._key;
      const selection = getSelection();
      const newOffset = offset + newTextLength;
      selection.anchorKey = key;
      selection.anchorOffset = newOffset;
      selection.focusKey = key;
      selection.focusOffset = newOffset;
    }
    return writableSelf;
  },
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
  },
});

export function getNodeType(node, flags) {
  if (flags & IS_TEXT) {
    if (flags & IS_BOLD) {
      return "strong";
    }
    if (flags & IS_ITALIC) {
      return "em";
    }
    return "span";
  }
  return node._type;
}

export function cloneNode(node) {
  const flags = node._flags;
  const children = node._children;
  const clonedChildren = flags & IS_TEXT ? children : [...children];
  const clonedNode = new Node(node._flags, clonedChildren);
  const key = node._key;
  clonedNode._type = node._type;
  clonedNode._style = node._style;
  clonedNode._parent = node._parent;
  clonedNode._key = key;
  return clonedNode;
}

function getWritableNode(node, skipKeyGeneration) {
  const viewModel = getActiveViewModel();
  const dirtyNodes = viewModel._dirtyNodes;
  const nodeMap = viewModel.nodeMap;
  const key = node._key;
  if (key === null) {
    if (skipKeyGeneration) {
      return node;
    }
    const newKey = (node._key = nodeKeyCounter++);
    dirtyNodes.add(newKey);
    nodeMap[newKey] = node;
    return node;
  }
  // Ensure we get the latest node from pending state
  node = node.getLatest();
  const parent = node._parent;
  if (parent !== null) {
    const dirtySubTrees = viewModel._dirtySubTrees;
    markParentsAsDirty(parent, nodeMap, dirtySubTrees);
  }
  if (dirtyNodes.has(key)) {
    return node;
  }
  const mutableNode = cloneNode(node);
  mutableNode._key = key;
  // If we're mutating the body node, make sure to update
  // the pointer in state too.
  if (mutableNode._flags & IS_BODY) {
    viewModel.body = mutableNode;
  }
  dirtyNodes.add(key);
  nodeMap[key] = mutableNode;
  return mutableNode;
}

export function createBlockNode(blockType = "div") {
  const node = new Node(IS_BLOCK, []);
  node._type = blockType;
  return node;
}

export function createBodyNode() {
  const body = new Node(IS_BODY, []);
  body._key = "body";
  return body;
}

export function createTextNode(text = "") {
  const node = new Node(IS_TEXT);
  node._children = text;
  return node;
}

export function getNodeByKey(key) {
  const viewModel = getActiveViewModel();
  const node = viewModel.nodeMap[key];
  if (node === undefined) {
    return null;
  }
  return node;
}
