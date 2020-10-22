import { getEditorInstance, getSelection } from "./editor";
import { getDOMFromNodeKey } from "./reconcilation";

export const IS_BODY = 1;
export const IS_BLOCK = 1 << 1;
export const IS_INLINE = 1 << 2;
export const IS_TEXT = 1 << 3;
export const IS_IMMUTABLE = 1 << 4;
export const IS_PORTAL = 1 << 5;

let nodeKeyCounter = 0;

export function getPendingViewModel() {
  return getEditorInstance().pendingViewModel;
}

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
  const pendingViewModel = getPendingViewModel();
  delete pendingViewModel.nodeMap[key];
}

function replaceNode(toReplace, replaceWith) {
  const pendingViewModel = getPendingViewModel();
  const nodeMap = pendingViewModel.nodeMap;
  const oldKey = replaceWith._key;
  const newKey = toReplace._key;
  const writableToReplace = getWritableNode(toReplace);
  const writableReplaceWith = getWritableNode(replaceWith);
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

function splitText(node, splitOffsets) {
  if (!node.isText()) {
    throw new Error("splitText: can only be used on text nodes");
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
  const splitNodesKeys = splitNodes.map(
    (splitNode) => splitNode._key
  );
  writableParentChildren.splice(insertionIndex, 1, ...splitNodesKeys);

  return splitNodes;
}

function ViewNode(flags, children) {
  this._children = children;
  this._flags = flags;
  this._key = null;
  this._parent = null;
  this._props = null;
  this._type = null;
}

Object.assign(ViewNode.prototype, {
  // Traversal and gettors

  getChildren() {
    if (this.isText()) {
      throw new Error("getChildren: can only be used on body/block nodes");
    }
    const self = this.getPendingCopy();
    const children = self._children;
    const childrenNodes = [];
    for (let i = 0; i < children.length; i++) {
      const childNode = getPendingNodeByKey(children[i]);
      if (childNode !== null) {
        childrenNodes.push(childNode);
      }
    }
    return childrenNodes;
  },
  getChildrenDeep() {
    if (this.isText()) {
      throw new Error(
        "getChildrenDeep: can only be used on body/block nodes"
      );
    }
    const deepChildren = [];
    const children = this.getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      deepChildren.push(child);
      if ((child._flags & IS_TEXT) === 0) {
        deepChildren.push(...child.getChildrenDeep());
      }
    }
    return deepChildren;
  },
  getTextContent() {
    const self = this.getPendingCopy();
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
  getType() {
    return this.getPendingCopy()._type;
  },
  getProps() {
    return this.getPendingCopy()._props;
  },
  getKey() {
    // Key is the only property that is stable between copies
    return this._key;
  },
  getFirstChild() {
    if (this.isText()) {
      return null;
    }
    const self = this.getPendingCopy();
    const children = self._children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return getPendingNodeByKey(children[0]);
  },
  getLastChild() {
    if (this.isText()) {
      return null;
    }
    const self = this.getPendingCopy();
    const children = self._children;
    const childrenLength = children.length;
    if (childrenLength === 0) {
      return null;
    }
    return getPendingNodeByKey(children[childrenLength - 1]);
  },
  getPreviousSibling() {
    const parent = this.getParent();
    const children = parent._children;
    const index = children.indexOf(this._key);
    if (index <= 0) {
      return null;
    }
    return getPendingNodeByKey(children[index - 1]);
  },
  getNextSibling() {
    const parent = this.getParent();
    const children = parent._children;
    const childrenLength = children.length;
    const index = children.indexOf(this._key);
    if (index >= childrenLength - 1) {
      return null;
    }
    return getPendingNodeByKey(children[index + 1]);
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
    const parent = this.getPendingCopy()._parent;
    if (parent === null) {
      return null;
    }
    return getPendingNodeByKey(parent);
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
  isBody() {
    return (this.getPendingCopy()._flags & IS_BODY) !== 0;
  },
  isBlock() {
    return (this.getPendingCopy()._flags & IS_BLOCK) !== 0;
  },
  isImmutable() {
    return (this.getPendingCopy()._flags & IS_IMMUTABLE) !== 0;
  },
  isInline() {
    return (this.getPendingCopy()._flags & IS_INLINE) !== 0;
  },
  isPortal() {
    return (this.getPendingCopy()._flags & IS_PORTAL) !== 0;
  },
  isText() {
    return (this.getPendingCopy()._flags & IS_TEXT) !== 0;
  },
  getPendingCopy() {
    if (this._key === null) {
      return this;
    }
    const pendingCopy = getPendingNodeByKey(this._key);
    if (pendingCopy === null) {
      return this;
    }
    return pendingCopy;
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
        const parentSibling = parent.getNextSibling();
        if (parentSibling === null) {
          return null;
        }
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
        const parentSibling = parent.getPreviousSibling();
        if (parentSibling === null) {
          return null;
        }
        node = parentSibling;
      }
      nodes.reverse();
    }
    return nodes;
  },

  // Setters and mutators

  makeImmutable() {
    const self = getWritableNode(this);
    self._flags |= IS_IMMUTABLE;
    return self;
  },
  select(anchorOffset, focusOffset) {
    if (!this.isText()) {
      throw new Error("select: can only be used on text nodes");
    }
    const self = this.getPendingCopy();
    const selection = getSelection();
    const text = self.getTextContent();
    const key = this._key;
    selection._anchorKey = key;
    selection._focusKey = key;
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
    selection._anchorOffset = anchorOffset;
    selection._focusOffset = focusOffset;
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
    const insertKey = nodeToInsert._key;
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
  spliceText(offset, delCount, newText, restoreSelection, fromComposition) {
    if (!this.isText()) {
      throw new Error("spliceText: can only be used on text nodes");
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
      let newOffset = offset;
      if (delCount === 0) {
        if (!fromComposition) {
          newOffset = offset + newTextLength;
        }
      } else if (newTextLength > 0) {
        newOffset = offset + 1;
      }
      selection._anchorKey = key;
      selection._anchorOffset = newOffset;
      selection._focusKey = key;
      selection._focusOffset = newOffset;
    }
    return writableSelf;
  },
});

export function Selection(
  anchorKey,
  anchorOffset,
  focusKey,
  focusOffset,
  isCollapsed
) {
  this._anchorKey = anchorKey;
  this._anchorOffset = anchorOffset;
  this._focusKey = focusKey;
  this._focusOffset = focusOffset;
  this._isCollapsed = isCollapsed;
}

Object.assign(Selection.prototype, {
  isCaret() {
    return (
      this._anchorKey === this._focusKey &&
      this._anchorOffset === this._focusOffset
    );
  },
  getNodes() {
    const anchorNode = getPendingNodeByKey(this._anchorKey);
    const focusNode = getPendingNodeByKey(this._focusKey);
    if (anchorNode === focusNode) {
      return [anchorNode];
    }
    return anchorNode.getNodesBetween(focusNode);
  },
  getCaretOffset() {
    return this._anchorOffset;
  },
  getRangeOffsets() {
    return [this._anchorOffset, this._focusOffset];
  },
  getAnchorDOM() {
    const anchorDOM = getDOMFromNodeKey(this._anchorKey);
    const anchorChildDOM = anchorDOM.firstChild;
    return anchorChildDOM.nodeType === 3 ? anchorChildDOM : anchorDOM;
  },
  getAnchorNode() {
    return getPendingNodeByKey(this._anchorKey);
  },
  getFocusDOM() {
    const focusDOM = getDOMFromNodeKey(this._focusKey);
    const focusChildDOM = focusDOM.firstChild;
    return focusChildDOM.nodeType === 3 ? focusChildDOM : focusDOM;
  },
  getFocusNode() {
    return getPendingNodeByKey(this._focusKey);
  },
});

function getPendingNodeByKey(key) {
  const pendingViewModel = getPendingViewModel();
  const pendingNode = pendingViewModel.nodeMap[key];
  if (pendingNode === undefined) {
    return null;
  }
  return pendingNode;
}

function markParentsAsDirty(parentKey, nodeMap, dirtySubTreeTracker) {
  while (parentKey !== null) {
    if (dirtySubTreeTracker.has(parentKey)) {
      return;
    }
    dirtySubTreeTracker.add(parentKey);
    parentKey = nodeMap[parentKey]._parent;
  }
}

function getWritableNode(node, skipKeyGeneration) {
  const editorInstance = getEditorInstance();
  const pendingViewModel = editorInstance.pendingViewModel;
  const mutationsTracker = editorInstance.mutationsTracker;
  const nodeMap = pendingViewModel.nodeMap;
  const key = node._key;
  if (key === null) {
    if (skipKeyGeneration) {
      return node;
    }
    const newKey = (node._key = nodeKeyCounter++);
    mutationsTracker.add(newKey);
    nodeMap[newKey] = node;
    return node;
  }
  // Ensure we get the latest node from pending state
  node = node.getPendingCopy();
  const parent = node._parent;
  if (parent !== null) {
    const dirtySubTreeTracker = editorInstance.dirtySubTreeTracker;
    markParentsAsDirty(parent, nodeMap, dirtySubTreeTracker);
  }
  if (mutationsTracker.has(key)) {
    return node;
  }
  const mutableNode = cloneNode(node);
  mutableNode._key = key;
  // If we're mutating the body node, make sure to update
  // the pointer in state too.
  if (mutableNode._flags & IS_BODY) {
    pendingViewModel.body = mutableNode;
  }
  mutationsTracker.add(key);
  nodeMap[key] = mutableNode;
  return mutableNode;
}

export function createPendingViewModel(current) {
  const pending = createViewModel();
  pending.portals = { ...current.portals };
  pending.nodeMap = { ...current.nodeMap };
  pending.body = current.body;
  return pending;
}

export function cloneNode(node) {
  const flags = node._flags;
  const children = node._children;
  const clonedChildren = flags & IS_TEXT ? children : [...children];
  const clonedNode = new ViewNode(node._flags, clonedChildren);
  const key = node._key;
  clonedNode._type = node._type;
  clonedNode._parent = node._parent;
  clonedNode._key = key;
  clonedNode._props = node._props;
  return clonedNode;
}

export function createViewModel() {
  return {
    body: null,
    nodeMap: {},
    portals: {},
    selection: null,
  };
}

export function createBlockNode(props = null, type = "div") {
  const node = new ViewNode(IS_BLOCK, []);
  node._props = props;
  node._type = type;
  return node;
}

export function createBodyNode() {
  const body = new ViewNode(IS_BODY, []);
  body._key = "body";
  return body;
}

export function createInlineNode(props = null, type = "span") {
  const node = new ViewNode(IS_INLINE, []);
  node._props = props;
  node._type = type;
  return node;
}

export function createTextNode(text = "", props = null, type = "span") {
  const node = new ViewNode(IS_TEXT);
  node._children = text;
  node._props = props;
  node._type = type;
  return node;
}
