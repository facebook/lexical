/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var lexical = require('lexical');
var utils = require('@lexical/utils');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Checks the depth of listNode from the root node.
 * @param listNode - The ListNode to be checked.
 * @returns The depth of the ListNode.
 */
function $getListDepth(listNode) {
  let depth = 1;
  let parent = listNode.getParent();
  while (parent != null) {
    if ($isListItemNode(parent)) {
      const parentList = parent.getParent();
      if ($isListNode(parentList)) {
        depth++;
        parent = parentList.getParent();
        continue;
      }
      {
        throw Error(`A ListItemNode must have a ListNode for a parent.`);
      }
    }
    return depth;
  }
  return depth;
}

/**
 * Finds the nearest ancestral ListNode and returns it, throws an invariant if listItem is not a ListItemNode.
 * @param listItem - The node to be checked.
 * @returns The ListNode found.
 */
function $getTopListNode(listItem) {
  let list = listItem.getParent();
  if (!$isListNode(list)) {
    {
      throw Error(`A ListItemNode must have a ListNode for a parent.`);
    }
  }
  let parent = list;
  while (parent !== null) {
    parent = parent.getParent();
    if ($isListNode(parent)) {
      list = parent;
    }
  }
  return list;
}

/**
 * A recursive Depth-First Search (Postorder Traversal) that finds all of a node's children
 * that are of type ListItemNode and returns them in an array.
 * @param node - The ListNode to start the search.
 * @returns An array containing all nodes of type ListItemNode found.
 */
// This should probably be $getAllChildrenOfType
function $getAllListItems(node) {
  let listItemNodes = [];
  const listChildren = node.getChildren().filter($isListItemNode);
  for (let i = 0; i < listChildren.length; i++) {
    const listItemNode = listChildren[i];
    const firstChild = listItemNode.getFirstChild();
    if ($isListNode(firstChild)) {
      listItemNodes = listItemNodes.concat($getAllListItems(firstChild));
    } else {
      listItemNodes.push(listItemNode);
    }
  }
  return listItemNodes;
}

/**
 * Checks to see if the passed node is a ListItemNode and has a ListNode as a child.
 * @param node - The node to be checked.
 * @returns true if the node is a ListItemNode and has a ListNode child, false otherwise.
 */
function isNestedListNode(node) {
  return $isListItemNode(node) && $isListNode(node.getFirstChild());
}

/**
 * Takes a deeply nested ListNode or ListItemNode and traverses up the branch to delete the first
 * ancestral ListNode (which could be the root ListNode) or ListItemNode with siblings, essentially
 * bringing the deeply nested node up the branch once. Would remove sublist if it has siblings.
 * Should not break ListItem -> List -> ListItem chain as empty List/ItemNodes should be removed on .remove().
 * @param sublist - The nested ListNode or ListItemNode to be brought up the branch.
 */
function $removeHighestEmptyListParent(sublist) {
  // Nodes may be repeatedly indented, to create deeply nested lists that each
  // contain just one bullet.
  // Our goal is to remove these (empty) deeply nested lists. The easiest
  // way to do that is crawl back up the tree until we find a node that has siblings
  // (e.g. is actually part of the list contents) and delete that, or delete
  // the root of the list (if no list nodes have siblings.)
  let emptyListPtr = sublist;
  while (emptyListPtr.getNextSibling() == null && emptyListPtr.getPreviousSibling() == null) {
    const parent = emptyListPtr.getParent();
    if (parent == null || !($isListItemNode(emptyListPtr) || $isListNode(emptyListPtr))) {
      break;
    }
    emptyListPtr = parent;
  }
  emptyListPtr.remove();
}

/**
 * Wraps a node into a ListItemNode.
 * @param node - The node to be wrapped into a ListItemNode
 * @returns The ListItemNode which the passed node is wrapped in.
 */
function wrapInListItem(node) {
  const listItemWrapper = $createListItemNode();
  return listItemWrapper.append(node);
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function $isSelectingEmptyListItem(anchorNode, nodes) {
  return $isListItemNode(anchorNode) && (nodes.length === 0 || nodes.length === 1 && anchorNode.is(nodes[0]) && anchorNode.getChildrenSize() === 0);
}
function $getListItemValue(listItem) {
  const list = listItem.getParent();
  let value = 1;
  if (list != null) {
    if (!$isListNode(list)) {
      {
        throw Error(`$getListItemValue: list node is not parent of list item node`);
      }
    } else {
      value = list.getStart();
    }
  }
  const siblings = listItem.getPreviousSiblings();
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if ($isListItemNode(sibling) && !$isListNode(sibling.getFirstChild())) {
      value++;
    }
  }
  return value;
}

/**
 * Inserts a new ListNode. If the selection's anchor node is an empty ListItemNode and is a child of
 * the root/shadow root, it will replace the ListItemNode with a ListNode and the old ListItemNode.
 * Otherwise it will replace its parent with a new ListNode and re-insert the ListItemNode and any previous children.
 * If the selection's anchor node is not an empty ListItemNode, it will add a new ListNode or merge an existing ListNode,
 * unless the the node is a leaf node, in which case it will attempt to find a ListNode up the branch and replace it with
 * a new ListNode, or create a new ListNode at the nearest root/shadow root.
 * @param editor - The lexical editor.
 * @param listType - The type of list, "number" | "bullet" | "check".
 */
function insertList(editor, listType) {
  editor.update(() => {
    const selection = lexical.$getSelection();
    if (lexical.$isRangeSelection(selection) || lexical.DEPRECATED_$isGridSelection(selection)) {
      const nodes = selection.getNodes();
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();
      const anchorNodeParent = anchorNode.getParent();
      if ($isSelectingEmptyListItem(anchorNode, nodes)) {
        const list = $createListNode(listType);
        if (lexical.$isRootOrShadowRoot(anchorNodeParent)) {
          anchorNode.replace(list);
          const listItem = $createListItemNode();
          if (lexical.$isElementNode(anchorNode)) {
            listItem.setFormat(anchorNode.getFormatType());
            listItem.setIndent(anchorNode.getIndent());
          }
          list.append(listItem);
        } else if ($isListItemNode(anchorNode)) {
          const parent = anchorNode.getParentOrThrow();
          append(list, parent.getChildren());
          parent.replace(list);
        }
        return;
      } else {
        const handled = new Set();
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (lexical.$isElementNode(node) && node.isEmpty() && !handled.has(node.getKey())) {
            createListOrMerge(node, listType);
            continue;
          }
          if (lexical.$isLeafNode(node)) {
            let parent = node.getParent();
            while (parent != null) {
              const parentKey = parent.getKey();
              if ($isListNode(parent)) {
                if (!handled.has(parentKey)) {
                  const newListNode = $createListNode(listType);
                  append(newListNode, parent.getChildren());
                  parent.replace(newListNode);
                  updateChildrenListItemValue(newListNode);
                  handled.add(parentKey);
                }
                break;
              } else {
                const nextParent = parent.getParent();
                if (lexical.$isRootOrShadowRoot(nextParent) && !handled.has(parentKey)) {
                  handled.add(parentKey);
                  createListOrMerge(parent, listType);
                  break;
                }
                parent = nextParent;
              }
            }
          }
        }
      }
    }
  });
}
function append(node, nodesToAppend) {
  node.splice(node.getChildrenSize(), 0, nodesToAppend);
}
function createListOrMerge(node, listType) {
  if ($isListNode(node)) {
    return node;
  }
  const previousSibling = node.getPreviousSibling();
  const nextSibling = node.getNextSibling();
  const listItem = $createListItemNode();
  listItem.setFormat(node.getFormatType());
  listItem.setIndent(node.getIndent());
  append(listItem, node.getChildren());
  if ($isListNode(previousSibling) && listType === previousSibling.getListType()) {
    previousSibling.append(listItem);
    node.remove();
    // if the same type of list is on both sides, merge them.

    if ($isListNode(nextSibling) && listType === nextSibling.getListType()) {
      append(previousSibling, nextSibling.getChildren());
      nextSibling.remove();
    }
    return previousSibling;
  } else if ($isListNode(nextSibling) && listType === nextSibling.getListType()) {
    nextSibling.getFirstChildOrThrow().insertBefore(listItem);
    node.remove();
    return nextSibling;
  } else {
    const list = $createListNode(listType);
    list.append(listItem);
    node.replace(list);
    updateChildrenListItemValue(list);
    return list;
  }
}

/**
 * A recursive function that goes through each list and their children, including nested lists,
 * appending list2 children after list1 children and updating ListItemNode values.
 * @param list1 - The first list to be merged.
 * @param list2 - The second list to be merged.
 */
function mergeLists(list1, list2) {
  const listItem1 = list1.getLastChild();
  const listItem2 = list2.getFirstChild();
  if (listItem1 && listItem2 && isNestedListNode(listItem1) && isNestedListNode(listItem2)) {
    mergeLists(listItem1.getFirstChild(), listItem2.getFirstChild());
    listItem2.remove();
  }
  const toMerge = list2.getChildren();
  if (toMerge.length > 0) {
    list1.append(...toMerge);
    updateChildrenListItemValue(list1);
  }
  list2.remove();
}

/**
 * Searches for the nearest ancestral ListNode and removes it. If selection is an empty ListItemNode
 * it will remove the whole list, including the ListItemNode. For each ListItemNode in the ListNode,
 * removeList will also generate new ParagraphNodes in the removed ListNode's place. Any child node
 * inside a ListItemNode will be appended to the new ParagraphNodes.
 * @param editor - The lexical editor.
 */
function removeList(editor) {
  editor.update(() => {
    const selection = lexical.$getSelection();
    if (lexical.$isRangeSelection(selection)) {
      const listNodes = new Set();
      const nodes = selection.getNodes();
      const anchorNode = selection.anchor.getNode();
      if ($isSelectingEmptyListItem(anchorNode, nodes)) {
        listNodes.add($getTopListNode(anchorNode));
      } else {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (lexical.$isLeafNode(node)) {
            const listItemNode = utils.$getNearestNodeOfType(node, ListItemNode);
            if (listItemNode != null) {
              listNodes.add($getTopListNode(listItemNode));
            }
          }
        }
      }
      for (const listNode of listNodes) {
        let insertionPoint = listNode;
        const listItems = $getAllListItems(listNode);
        for (const listItemNode of listItems) {
          const paragraph = lexical.$createParagraphNode();
          append(paragraph, listItemNode.getChildren());
          insertionPoint.insertAfter(paragraph);
          insertionPoint = paragraph;

          // When the anchor and focus fall on the textNode
          // we don't have to change the selection because the textNode will be appended to
          // the newly generated paragraph.
          // When selection is in empty nested list item, selection is actually on the listItemNode.
          // When the corresponding listItemNode is deleted and replaced by the newly generated paragraph
          // we should manually set the selection's focus and anchor to the newly generated paragraph.
          if (listItemNode.__key === selection.anchor.key) {
            selection.anchor.set(paragraph.getKey(), 0, 'element');
          }
          if (listItemNode.__key === selection.focus.key) {
            selection.focus.set(paragraph.getKey(), 0, 'element');
          }
          listItemNode.remove();
        }
        listNode.remove();
      }
    }
  });
}

/**
 * Takes the value of a child ListItemNode and makes it the value the ListItemNode
 * should be if it isn't already. If only certain children should be updated, they
 * can be passed optionally in an array.
 * @param list - The list whose children are updated.
 * @param children - An array of the children to be updated.
 */
function updateChildrenListItemValue(list, children) {
  const childrenOrExisting = children || list.getChildren();
  if (childrenOrExisting !== undefined) {
    for (let i = 0; i < childrenOrExisting.length; i++) {
      const child = childrenOrExisting[i];
      if ($isListItemNode(child)) {
        const prevValue = child.getValue();
        const nextValue = $getListItemValue(child);
        if (prevValue !== nextValue) {
          child.setValue(nextValue);
        }
      }
    }
  }
}

/**
 * Adds an empty ListNode/ListItemNode chain at listItemNode, so as to
 * create an indent effect. Won't indent ListItemNodes that have a ListNode as
 * a child, but does merge sibling ListItemNodes if one has a nested ListNode.
 * @param listItemNode - The ListItemNode to be indented.
 */
function $handleIndent(listItemNode) {
  // go through each node and decide where to move it.
  const removed = new Set();
  if (isNestedListNode(listItemNode) || removed.has(listItemNode.getKey())) {
    return;
  }
  const parent = listItemNode.getParent();

  // We can cast both of the below `isNestedListNode` only returns a boolean type instead of a user-defined type guards
  const nextSibling = listItemNode.getNextSibling();
  const previousSibling = listItemNode.getPreviousSibling();
  // if there are nested lists on either side, merge them all together.

  if (isNestedListNode(nextSibling) && isNestedListNode(previousSibling)) {
    const innerList = previousSibling.getFirstChild();
    if ($isListNode(innerList)) {
      innerList.append(listItemNode);
      const nextInnerList = nextSibling.getFirstChild();
      if ($isListNode(nextInnerList)) {
        const children = nextInnerList.getChildren();
        append(innerList, children);
        nextSibling.remove();
        removed.add(nextSibling.getKey());
      }
      updateChildrenListItemValue(innerList);
    }
  } else if (isNestedListNode(nextSibling)) {
    // if the ListItemNode is next to a nested ListNode, merge them
    const innerList = nextSibling.getFirstChild();
    if ($isListNode(innerList)) {
      const firstChild = innerList.getFirstChild();
      if (firstChild !== null) {
        firstChild.insertBefore(listItemNode);
      }
      updateChildrenListItemValue(innerList);
    }
  } else if (isNestedListNode(previousSibling)) {
    const innerList = previousSibling.getFirstChild();
    if ($isListNode(innerList)) {
      innerList.append(listItemNode);
      updateChildrenListItemValue(innerList);
    }
  } else {
    // otherwise, we need to create a new nested ListNode

    if ($isListNode(parent)) {
      const newListItem = $createListItemNode();
      const newList = $createListNode(parent.getListType());
      newListItem.append(newList);
      newList.append(listItemNode);
      if (previousSibling) {
        previousSibling.insertAfter(newListItem);
      } else if (nextSibling) {
        nextSibling.insertBefore(newListItem);
      } else {
        parent.append(newListItem);
      }
      updateChildrenListItemValue(newList);
    }
  }
  if ($isListNode(parent)) {
    updateChildrenListItemValue(parent);
  }
}

/**
 * Removes an indent by removing an empty ListNode/ListItemNode chain. An indented ListItemNode
 * has a great grandparent node of type ListNode, which is where the ListItemNode will reside
 * within as a child.
 * @param listItemNode - The ListItemNode to remove the indent (outdent).
 */
function $handleOutdent(listItemNode) {
  // go through each node and decide where to move it.

  if (isNestedListNode(listItemNode)) {
    return;
  }
  const parentList = listItemNode.getParent();
  const grandparentListItem = parentList ? parentList.getParent() : undefined;
  const greatGrandparentList = grandparentListItem ? grandparentListItem.getParent() : undefined;
  // If it doesn't have these ancestors, it's not indented.

  if ($isListNode(greatGrandparentList) && $isListItemNode(grandparentListItem) && $isListNode(parentList)) {
    // if it's the first child in it's parent list, insert it into the
    // great grandparent list before the grandparent
    const firstChild = parentList ? parentList.getFirstChild() : undefined;
    const lastChild = parentList ? parentList.getLastChild() : undefined;
    if (listItemNode.is(firstChild)) {
      grandparentListItem.insertBefore(listItemNode);
      if (parentList.isEmpty()) {
        grandparentListItem.remove();
      }
      // if it's the last child in it's parent list, insert it into the
      // great grandparent list after the grandparent.
    } else if (listItemNode.is(lastChild)) {
      grandparentListItem.insertAfter(listItemNode);
      if (parentList.isEmpty()) {
        grandparentListItem.remove();
      }
    } else {
      // otherwise, we need to split the siblings into two new nested lists
      const listType = parentList.getListType();
      const previousSiblingsListItem = $createListItemNode();
      const previousSiblingsList = $createListNode(listType);
      previousSiblingsListItem.append(previousSiblingsList);
      listItemNode.getPreviousSiblings().forEach(sibling => previousSiblingsList.append(sibling));
      const nextSiblingsListItem = $createListItemNode();
      const nextSiblingsList = $createListNode(listType);
      nextSiblingsListItem.append(nextSiblingsList);
      append(nextSiblingsList, listItemNode.getNextSiblings());
      // put the sibling nested lists on either side of the grandparent list item in the great grandparent.
      grandparentListItem.insertBefore(previousSiblingsListItem);
      grandparentListItem.insertAfter(nextSiblingsListItem);
      // replace the grandparent list item (now between the siblings) with the outdented list item.
      grandparentListItem.replace(listItemNode);
    }
    updateChildrenListItemValue(parentList);
    updateChildrenListItemValue(greatGrandparentList);
  }
}

/**
 * Attempts to insert a ParagraphNode at selection and selects the new node. The selection must contain a ListItemNode
 * or a node that does not already contain text. If its grandparent is the root/shadow root, it will get the ListNode
 * (which should be the parent node) and insert the ParagraphNode as a sibling to the ListNode. If the ListNode is
 * nested in a ListItemNode instead, it will add the ParagraphNode after the grandparent ListItemNode.
 * Throws an invariant if the selection is not a child of a ListNode.
 * @returns true if a ParagraphNode was inserted succesfully, false if there is no selection
 * or the selection does not contain a ListItemNode or the node already holds text.
 */
function $handleListInsertParagraph() {
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }
  // Only run this code on empty list items
  const anchor = selection.anchor.getNode();
  if (!$isListItemNode(anchor) || anchor.getChildrenSize() !== 0) {
    return false;
  }
  const topListNode = $getTopListNode(anchor);
  const parent = anchor.getParent();
  if (!$isListNode(parent)) {
    throw Error(`A ListItemNode must have a ListNode for a parent.`);
  }
  const grandparent = parent.getParent();
  let replacementNode;
  if (lexical.$isRootOrShadowRoot(grandparent)) {
    replacementNode = lexical.$createParagraphNode();
    topListNode.insertAfter(replacementNode);
  } else if ($isListItemNode(grandparent)) {
    replacementNode = $createListItemNode();
    grandparent.insertAfter(replacementNode);
  } else {
    return false;
  }
  replacementNode.select();
  const nextSiblings = anchor.getNextSiblings();
  if (nextSiblings.length > 0) {
    const newList = $createListNode(parent.getListType());
    if (lexical.$isParagraphNode(replacementNode)) {
      replacementNode.insertAfter(newList);
    } else {
      const newListItem = $createListItemNode();
      newListItem.append(newList);
      replacementNode.insertAfter(newListItem);
    }
    nextSiblings.forEach(sibling => {
      sibling.remove();
      newList.append(sibling);
    });
  }

  // Don't leave hanging nested empty lists
  $removeHighestEmptyListParent(anchor);
  return true;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class ListItemNode extends lexical.ElementNode {
  /** @internal */

  /** @internal */

  static getType() {
    return 'listitem';
  }
  static clone(node) {
    return new ListItemNode(node.__value, node.__checked, node.__key);
  }
  constructor(value, checked, key) {
    super(key);
    this.__value = value === undefined ? 1 : value;
    this.__checked = checked;
  }
  createDOM(config) {
    const element = document.createElement('li');
    const parent = this.getParent();
    if ($isListNode(parent) && parent.getListType() === 'check') {
      updateListItemChecked(element, this, null);
    }
    element.value = this.__value;
    $setListItemThemeClassNames(element, config.theme, this);
    return element;
  }
  updateDOM(prevNode, dom, config) {
    const parent = this.getParent();
    if ($isListNode(parent) && parent.getListType() === 'check') {
      updateListItemChecked(dom, this, prevNode);
    }
    // @ts-expect-error - this is always HTMLListItemElement
    dom.value = this.__value;
    $setListItemThemeClassNames(dom, config.theme, this);
    return false;
  }
  static transform() {
    return node => {
      const parent = node.getParent();
      if ($isListNode(parent)) {
        updateChildrenListItemValue(parent);
        if (parent.getListType() !== 'check' && node.getChecked() != null) {
          node.setChecked(undefined);
        }
      }
    };
  }
  static importDOM() {
    return {
      li: node => ({
        conversion: convertListItemElement,
        priority: 0
      })
    };
  }
  static importJSON(serializedNode) {
    const node = $createListItemNode();
    node.setChecked(serializedNode.checked);
    node.setValue(serializedNode.value);
    node.setFormat(serializedNode.format);
    node.setDirection(serializedNode.direction);
    return node;
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      checked: this.getChecked(),
      type: 'listitem',
      value: this.getValue(),
      version: 1
    };
  }
  append(...nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (lexical.$isElementNode(node) && this.canMergeWith(node)) {
        const children = node.getChildren();
        this.append(...children);
        node.remove();
      } else {
        super.append(node);
      }
    }
    return this;
  }
  replace(replaceWithNode, includeChildren) {
    if ($isListItemNode(replaceWithNode)) {
      return super.replace(replaceWithNode);
    }
    this.setIndent(0);
    const list = this.getParentOrThrow();
    if (!$isListNode(list)) return replaceWithNode;
    if (list.__first === this.getKey()) {
      list.insertBefore(replaceWithNode);
    } else if (list.__last === this.getKey()) {
      list.insertAfter(replaceWithNode);
    } else {
      // Split the list
      const newList = $createListNode(list.getListType());
      let nextSibling = this.getNextSibling();
      while (nextSibling) {
        const nodeToAppend = nextSibling;
        nextSibling = nextSibling.getNextSibling();
        newList.append(nodeToAppend);
      }
      list.insertAfter(replaceWithNode);
      replaceWithNode.insertAfter(newList);
    }
    if (includeChildren) {
      this.getChildren().forEach(child => {
        replaceWithNode.append(child);
      });
    }
    this.remove();
    if (list.getChildrenSize() === 0) {
      list.remove();
    }
    return replaceWithNode;
  }
  insertAfter(node, restoreSelection = true) {
    const listNode = this.getParentOrThrow();
    if (!$isListNode(listNode)) {
      {
        throw Error(`insertAfter: list node is not parent of list item node`);
      }
    }
    const siblings = this.getNextSiblings();
    if ($isListItemNode(node)) {
      const after = super.insertAfter(node, restoreSelection);
      const afterListNode = node.getParentOrThrow();
      if ($isListNode(afterListNode)) {
        updateChildrenListItemValue(afterListNode);
      }
      return after;
    }

    // Attempt to merge if the list is of the same type.

    if ($isListNode(node)) {
      let child = node;
      const children = node.getChildren();
      for (let i = children.length - 1; i >= 0; i--) {
        child = children[i];
        this.insertAfter(child, restoreSelection);
      }
      return child;
    }

    // Otherwise, split the list
    // Split the lists and insert the node in between them
    listNode.insertAfter(node, restoreSelection);
    if (siblings.length !== 0) {
      const newListNode = $createListNode(listNode.getListType());
      siblings.forEach(sibling => newListNode.append(sibling));
      node.insertAfter(newListNode, restoreSelection);
    }
    return node;
  }
  remove(preserveEmptyParent) {
    const prevSibling = this.getPreviousSibling();
    const nextSibling = this.getNextSibling();
    super.remove(preserveEmptyParent);
    if (prevSibling && nextSibling && isNestedListNode(prevSibling) && isNestedListNode(nextSibling)) {
      mergeLists(prevSibling.getFirstChild(), nextSibling.getFirstChild());
      nextSibling.remove();
    } else if (nextSibling) {
      const parent = nextSibling.getParent();
      if ($isListNode(parent)) {
        updateChildrenListItemValue(parent);
      }
    }
  }
  insertNewAfter(_, restoreSelection = true) {
    const newElement = $createListItemNode(this.__checked == null ? undefined : false);
    this.insertAfter(newElement, restoreSelection);
    return newElement;
  }
  collapseAtStart(selection) {
    const paragraph = lexical.$createParagraphNode();
    const children = this.getChildren();
    children.forEach(child => paragraph.append(child));
    const listNode = this.getParentOrThrow();
    const listNodeParent = listNode.getParentOrThrow();
    const isIndented = $isListItemNode(listNodeParent);
    if (listNode.getChildrenSize() === 1) {
      if (isIndented) {
        // if the list node is nested, we just want to remove it,
        // effectively unindenting it.
        listNode.remove();
        listNodeParent.select();
      } else {
        listNode.insertBefore(paragraph);
        listNode.remove();
        // If we have selection on the list item, we'll need to move it
        // to the paragraph
        const anchor = selection.anchor;
        const focus = selection.focus;
        const key = paragraph.getKey();
        if (anchor.type === 'element' && anchor.getNode().is(this)) {
          anchor.set(key, anchor.offset, 'element');
        }
        if (focus.type === 'element' && focus.getNode().is(this)) {
          focus.set(key, focus.offset, 'element');
        }
      }
    } else {
      listNode.insertBefore(paragraph);
      this.remove();
    }
    return true;
  }
  getValue() {
    const self = this.getLatest();
    return self.__value;
  }
  setValue(value) {
    const self = this.getWritable();
    self.__value = value;
  }
  getChecked() {
    const self = this.getLatest();
    return self.__checked;
  }
  setChecked(checked) {
    const self = this.getWritable();
    self.__checked = checked;
  }
  toggleChecked() {
    this.setChecked(!this.__checked);
  }
  getIndent() {
    // If we don't have a parent, we are likely serializing
    const parent = this.getParent();
    if (parent === null) {
      return this.getLatest().__indent;
    }
    // ListItemNode should always have a ListNode for a parent.
    let listNodeParent = parent.getParentOrThrow();
    let indentLevel = 0;
    while ($isListItemNode(listNodeParent)) {
      listNodeParent = listNodeParent.getParentOrThrow().getParentOrThrow();
      indentLevel++;
    }
    return indentLevel;
  }
  setIndent(indent) {
    if (!(typeof indent === 'number' && indent > -1)) {
      throw Error(`Invalid indent value.`);
    }
    let currentIndent = this.getIndent();
    while (currentIndent !== indent) {
      if (currentIndent < indent) {
        $handleIndent(this);
        currentIndent++;
      } else {
        $handleOutdent(this);
        currentIndent--;
      }
    }
    return this;
  }
  insertBefore(nodeToInsert) {
    if ($isListItemNode(nodeToInsert)) {
      const parent = this.getParentOrThrow();
      if ($isListNode(parent)) {
        const siblings = this.getNextSiblings();
        updateChildrenListItemValue(parent, siblings);
      }
    }
    return super.insertBefore(nodeToInsert);
  }
  canInsertAfter(node) {
    return $isListItemNode(node);
  }
  canReplaceWith(replacement) {
    return $isListItemNode(replacement);
  }
  canMergeWith(node) {
    return lexical.$isParagraphNode(node) || $isListItemNode(node);
  }
  extractWithChild(child, selection) {
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    return this.isParentOf(anchorNode) && this.isParentOf(focusNode) && this.getTextContent().length === selection.getTextContent().length;
  }
  isParentRequired() {
    return true;
  }
  createParentElementNode() {
    return $createListNode('bullet');
  }
}
function $setListItemThemeClassNames(dom, editorThemeClasses, node) {
  const classesToAdd = [];
  const classesToRemove = [];
  const listTheme = editorThemeClasses.list;
  const listItemClassName = listTheme ? listTheme.listitem : undefined;
  let nestedListItemClassName;
  if (listTheme && listTheme.nested) {
    nestedListItemClassName = listTheme.nested.listitem;
  }
  if (listItemClassName !== undefined) {
    const listItemClasses = listItemClassName.split(' ');
    classesToAdd.push(...listItemClasses);
  }
  if (listTheme) {
    const parentNode = node.getParent();
    const isCheckList = $isListNode(parentNode) && parentNode.getListType() === 'check';
    const checked = node.getChecked();
    if (!isCheckList || checked) {
      classesToRemove.push(listTheme.listitemUnchecked);
    }
    if (!isCheckList || !checked) {
      classesToRemove.push(listTheme.listitemChecked);
    }
    if (isCheckList) {
      classesToAdd.push(checked ? listTheme.listitemChecked : listTheme.listitemUnchecked);
    }
  }
  if (nestedListItemClassName !== undefined) {
    const nestedListItemClasses = nestedListItemClassName.split(' ');
    if (node.getChildren().some(child => $isListNode(child))) {
      classesToAdd.push(...nestedListItemClasses);
    } else {
      classesToRemove.push(...nestedListItemClasses);
    }
  }
  if (classesToRemove.length > 0) {
    utils.removeClassNamesFromElement(dom, ...classesToRemove);
  }
  if (classesToAdd.length > 0) {
    utils.addClassNamesToElement(dom, ...classesToAdd);
  }
}
function updateListItemChecked(dom, listItemNode, prevListItemNode, listNode) {
  // Only add attributes for leaf list items
  if ($isListNode(listItemNode.getFirstChild())) {
    dom.removeAttribute('role');
    dom.removeAttribute('tabIndex');
    dom.removeAttribute('aria-checked');
  } else {
    dom.setAttribute('role', 'checkbox');
    dom.setAttribute('tabIndex', '-1');
    if (!prevListItemNode || listItemNode.__checked !== prevListItemNode.__checked) {
      dom.setAttribute('aria-checked', listItemNode.getChecked() ? 'true' : 'false');
    }
  }
}
function convertListItemElement(domNode) {
  const checked = utils.isHTMLElement(domNode) && domNode.getAttribute('aria-checked') === 'true';
  return {
    node: $createListItemNode(checked)
  };
}

/**
 * Creates a new List Item node, passing true/false will convert it to a checkbox input.
 * @param checked - Is the List Item a checkbox and, if so, is it checked? undefined/null: not a checkbox, true/false is a checkbox and checked/unchecked, respectively.
 * @returns The new List Item.
 */
function $createListItemNode(checked) {
  return lexical.$applyNodeReplacement(new ListItemNode(undefined, checked));
}

/**
 * Checks to see if the node is a ListItemNode.
 * @param node - The node to be checked.
 * @returns true if the node is a ListItemNode, false otherwise.
 */
function $isListItemNode(node) {
  return node instanceof ListItemNode;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/** @noInheritDoc */
class ListNode extends lexical.ElementNode {
  /** @internal */

  /** @internal */

  /** @internal */

  static getType() {
    return 'list';
  }
  static clone(node) {
    const listType = node.__listType || TAG_TO_LIST_TYPE[node.__tag];
    return new ListNode(listType, node.__start, node.__key);
  }
  constructor(listType, start, key) {
    super(key);
    const _listType = TAG_TO_LIST_TYPE[listType] || listType;
    this.__listType = _listType;
    this.__tag = _listType === 'number' ? 'ol' : 'ul';
    this.__start = start;
  }
  getTag() {
    return this.__tag;
  }
  setListType(type) {
    const writable = this.getWritable();
    writable.__listType = type;
    writable.__tag = type === 'number' ? 'ol' : 'ul';
  }
  getListType() {
    return this.__listType;
  }
  getStart() {
    return this.__start;
  }

  // View

  createDOM(config, _editor) {
    const tag = this.__tag;
    const dom = document.createElement(tag);
    if (this.__start !== 1) {
      dom.setAttribute('start', String(this.__start));
    }
    // @ts-expect-error Internal field.
    dom.__lexicalListType = this.__listType;
    setListThemeClassNames(dom, config.theme, this);
    return dom;
  }
  updateDOM(prevNode, dom, config) {
    if (prevNode.__tag !== this.__tag) {
      return true;
    }
    setListThemeClassNames(dom, config.theme, this);
    return false;
  }
  static importDOM() {
    return {
      ol: node => ({
        conversion: convertListNode,
        priority: 0
      }),
      ul: node => ({
        conversion: convertListNode,
        priority: 0
      })
    };
  }
  static importJSON(serializedNode) {
    const node = $createListNode(serializedNode.listType, serializedNode.start);
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }
  exportDOM(editor) {
    const {
      element
    } = super.exportDOM(editor);
    if (element && utils.isHTMLElement(element)) {
      if (this.__start !== 1) {
        element.setAttribute('start', String(this.__start));
      }
      if (this.__listType === 'check') {
        element.setAttribute('__lexicalListType', 'check');
      }
    }
    return {
      element
    };
  }
  exportJSON() {
    return {
      ...super.exportJSON(),
      listType: this.getListType(),
      start: this.getStart(),
      tag: this.getTag(),
      type: 'list',
      version: 1
    };
  }
  canBeEmpty() {
    return false;
  }
  canIndent() {
    return false;
  }
  append(...nodesToAppend) {
    for (let i = 0; i < nodesToAppend.length; i++) {
      const currentNode = nodesToAppend[i];
      if ($isListItemNode(currentNode)) {
        super.append(currentNode);
      } else {
        const listItemNode = $createListItemNode();
        if ($isListNode(currentNode)) {
          listItemNode.append(currentNode);
        } else if (lexical.$isElementNode(currentNode)) {
          const textNode = lexical.$createTextNode(currentNode.getTextContent());
          listItemNode.append(textNode);
        } else {
          listItemNode.append(currentNode);
        }
        super.append(listItemNode);
      }
    }
    updateChildrenListItemValue(this);
    return this;
  }
  extractWithChild(child) {
    return $isListItemNode(child);
  }
}
function setListThemeClassNames(dom, editorThemeClasses, node) {
  const classesToAdd = [];
  const classesToRemove = [];
  const listTheme = editorThemeClasses.list;
  if (listTheme !== undefined) {
    const listLevelsClassNames = listTheme[`${node.__tag}Depth`] || [];
    const listDepth = $getListDepth(node) - 1;
    const normalizedListDepth = listDepth % listLevelsClassNames.length;
    const listLevelClassName = listLevelsClassNames[normalizedListDepth];
    const listClassName = listTheme[node.__tag];
    let nestedListClassName;
    const nestedListTheme = listTheme.nested;
    if (nestedListTheme !== undefined && nestedListTheme.list) {
      nestedListClassName = nestedListTheme.list;
    }
    if (listClassName !== undefined) {
      classesToAdd.push(listClassName);
    }
    if (listLevelClassName !== undefined) {
      const listItemClasses = listLevelClassName.split(' ');
      classesToAdd.push(...listItemClasses);
      for (let i = 0; i < listLevelsClassNames.length; i++) {
        if (i !== normalizedListDepth) {
          classesToRemove.push(node.__tag + i);
        }
      }
    }
    if (nestedListClassName !== undefined) {
      const nestedListItemClasses = nestedListClassName.split(' ');
      if (listDepth > 1) {
        classesToAdd.push(...nestedListItemClasses);
      } else {
        classesToRemove.push(...nestedListItemClasses);
      }
    }
  }
  if (classesToRemove.length > 0) {
    utils.removeClassNamesFromElement(dom, ...classesToRemove);
  }
  if (classesToAdd.length > 0) {
    utils.addClassNamesToElement(dom, ...classesToAdd);
  }
}

/*
 * This function normalizes the children of a ListNode after the conversion from HTML,
 * ensuring that they are all ListItemNodes and contain either a single nested ListNode
 * or some other inline content.
 */
function normalizeChildren(nodes) {
  const normalizedListItems = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if ($isListItemNode(node)) {
      normalizedListItems.push(node);
      const children = node.getChildren();
      if (children.length > 1) {
        children.forEach(child => {
          if ($isListNode(child)) {
            normalizedListItems.push(wrapInListItem(child));
          }
        });
      }
    } else {
      normalizedListItems.push(wrapInListItem(node));
    }
  }
  return normalizedListItems;
}
function convertListNode(domNode) {
  const nodeName = domNode.nodeName.toLowerCase();
  let node = null;
  if (nodeName === 'ol') {
    // @ts-ignore
    const start = domNode.start;
    node = $createListNode('number', start);
  } else if (nodeName === 'ul') {
    if (utils.isHTMLElement(domNode) && domNode.getAttribute('__lexicallisttype') === 'check') {
      node = $createListNode('check');
    } else {
      node = $createListNode('bullet');
    }
  }
  return {
    after: normalizeChildren,
    node
  };
}
const TAG_TO_LIST_TYPE = {
  ol: 'number',
  ul: 'bullet'
};

/**
 * Creates a ListNode of listType.
 * @param listType - The type of list to be created. Can be 'number', 'bullet', or 'check'.
 * @param start - Where an ordered list starts its count, start = 1 if left undefined.
 * @returns The new ListNode
 */
function $createListNode(listType, start = 1) {
  return lexical.$applyNodeReplacement(new ListNode(listType, start));
}

/**
 * Checks to see if the node is a ListNode.
 * @param node - The node to be checked.
 * @returns true if the node is a ListNode, false otherwise.
 */
function $isListNode(node) {
  return node instanceof ListNode;
}

/** @module @lexical/list */
const INSERT_UNORDERED_LIST_COMMAND = lexical.createCommand('INSERT_UNORDERED_LIST_COMMAND');
const INSERT_ORDERED_LIST_COMMAND = lexical.createCommand('INSERT_ORDERED_LIST_COMMAND');
const INSERT_CHECK_LIST_COMMAND = lexical.createCommand('INSERT_CHECK_LIST_COMMAND');
const REMOVE_LIST_COMMAND = lexical.createCommand('REMOVE_LIST_COMMAND');

exports.$createListItemNode = $createListItemNode;
exports.$createListNode = $createListNode;
exports.$getListDepth = $getListDepth;
exports.$handleListInsertParagraph = $handleListInsertParagraph;
exports.$isListItemNode = $isListItemNode;
exports.$isListNode = $isListNode;
exports.INSERT_CHECK_LIST_COMMAND = INSERT_CHECK_LIST_COMMAND;
exports.INSERT_ORDERED_LIST_COMMAND = INSERT_ORDERED_LIST_COMMAND;
exports.INSERT_UNORDERED_LIST_COMMAND = INSERT_UNORDERED_LIST_COMMAND;
exports.ListItemNode = ListItemNode;
exports.ListNode = ListNode;
exports.REMOVE_LIST_COMMAND = REMOVE_LIST_COMMAND;
exports.insertList = insertList;
exports.removeList = removeList;
