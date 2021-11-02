/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {
  OutlineEditor,
  State,
  EditorConfig,
  NodeKey,
  OutlineNode,
  Selection,
} from 'outline';

import {BlockNode, isLeafNode, isTextNode, log} from 'outline';
import {updateWithoutHistory} from 'outline/history';
import {dfs} from 'outline/nodes';
import {useEffect, useCallback} from 'react';

type OptionalProps = {
  strlen?: (input: string) => number,
  remainingCharacters?: (characters: number) => void,
};

export function useCharacterLimit(
  editor: OutlineEditor,
  maxCharacters: number,
  optional: OptionalProps = {},
) {
  const {
    strlen = (input) => input.length, // UTF-16
    remainingCharacters = (characters) => {},
  } = optional;

  const execute = useCallback(() => {
    const Segmenter = Intl.Segmenter;
    let offsetUtf16 = 0;
    let offset = 0;
    const text = editor.getCurrentTextContent();
    if (typeof Segmenter === 'function') {
      const segmenter = new Segmenter();
      const graphemes = segmenter.segment(text);
      // eslint-disable-next-line no-for-of-loops/no-for-of-loops
      for (const {segment: grapheme} of graphemes) {
        const nextOffset = offset + strlen(grapheme);
        if (nextOffset > maxCharacters) {
          break;
        }
        offset = nextOffset;
        offsetUtf16 += grapheme.length;
      }
    } else {
      const codepoints = Array.from(text);
      const codepointsLength = codepoints.length;
      for (let i = 0; i < codepointsLength; i++) {
        const codepoint = codepoints[i];
        const nextOffset = offset + strlen(codepoint);
        if (nextOffset > maxCharacters) {
          break;
        }
        offset = nextOffset;
        offsetUtf16 += codepoint.length;
      }
    }
    updateWithoutHistory(editor, (state: State) => {
      log('CharacterLimit');
      wrapOverflowedNodes(state, offsetUtf16);
    });
  }, [editor, maxCharacters, strlen]);

  useEffect(() => {
    editor.registerNodeType('overflow', OverflowNode);
    let textLength = strlen(editor.getCurrentTextContent());
    let diff = maxCharacters - textLength;
    remainingCharacters(diff);
    execute();
    let lastUtf16TextLength = null;
    let lastTextLength = null;
    return editor.addListener('update', ({dirty, dirtyNodes}) => {
      const isComposing = editor.isComposing();
      const text = editor.getCurrentTextContent();
      const utf16TextLength = text.length;
      const hasDirtyNodes = dirty && dirtyNodes.size > 0;
      if (
        isComposing ||
        (utf16TextLength === lastUtf16TextLength && !hasDirtyNodes)
      ) {
        return;
      }
      textLength = strlen(editor.getCurrentTextContent());
      const textLengthAboveThreshold =
        textLength > maxCharacters ||
        (lastTextLength !== null && lastTextLength > maxCharacters);
      diff = maxCharacters - textLength;
      remainingCharacters(diff);
      if (lastTextLength === null || textLengthAboveThreshold || dirtyNodes) {
        execute();
      }
      lastUtf16TextLength = utf16TextLength;
      lastTextLength = textLength;
    });
  }, [editor, execute, maxCharacters, remainingCharacters, strlen]);
}

function wrapOverflowedNodes(state: State, offset: number) {
  const root = state.getRoot();
  let accumulatedLength = 0;

  let previousNode = root;
  dfs(root, (node: OutlineNode) => {
    if (isOverflowNode(node)) {
      const previousLength = accumulatedLength;
      const nextLength = accumulatedLength + node.getTextContentSize();
      if (nextLength <= offset) {
        const parent = node.getParent();
        const previousSibling = node.getPreviousSibling();
        const nextSibling = node.getNextSibling();
        unwrapNode(node);
        const selection = state.getSelection();
        // Restore selection when the overflow children are removed
        if (
          selection !== null &&
          (!selection.anchor.getNode().isAttached() ||
            !selection.focus.getNode().isAttached())
        ) {
          if (isTextNode(previousSibling)) {
            previousSibling.select();
          } else if (isTextNode(nextSibling)) {
            nextSibling.select();
          } else if (parent !== null) {
            parent.select();
          }
        }
        return previousNode;
      } else if (previousLength < offset) {
        const descendant = node.getFirstDescendant();
        const descendantLength =
          descendant !== null ? descendant.getTextContentSize() : 0;
        const previousPlusDescendantLength = previousLength + descendantLength;
        // For simple text we can redimension the overflow into a smaller and more accurate
        // container
        const firstDescendantIsSimpleText =
          isTextNode(descendant) && descendant.isSimpleText();
        const firstDescendantDoesNotOverflow =
          previousPlusDescendantLength <= offset;
        if (firstDescendantIsSimpleText || firstDescendantDoesNotOverflow) {
          unwrapNode(node);
          return previousNode;
        }
      }
    } else if (isLeafNode(node)) {
      const previousAccumulatedLength = accumulatedLength;
      accumulatedLength += node.getTextContentSize();
      if (accumulatedLength > offset && !isOverflowNode(node.getParent())) {
        const previousSelection = state.getSelection();
        let overflowNode;
        // For simple text we can improve the limit accuracy by splitting the TextNode
        // on the split point
        if (
          previousAccumulatedLength < offset &&
          isTextNode(node) &&
          node.isSimpleText()
        ) {
          const [, overflowedText] = node.splitText(
            offset - previousAccumulatedLength,
          );
          overflowNode = wrapNode(overflowedText);
        } else {
          overflowNode = wrapNode(node);
        }
        if (previousSelection !== null) {
          state.setSelection(previousSelection);
        }
        mergePrevious(overflowNode, state);
      }
    }
    previousNode = node;
    return node;
  });
}

export class OverflowNode extends BlockNode {
  static clone(node: OverflowNode): OverflowNode {
    return new OverflowNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'overflow';
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const div = document.createElement('div');
    const className = config.theme.characterLimit;
    if (typeof className === 'string') {
      div.className = className;
    }
    return div;
  }

  updateDOM(prevNode: OverflowNode, dom: HTMLElement): boolean {
    return false;
  }

  insertNewAfter(selection: Selection): null | BlockNode {
    const parent = this.getParentOrThrow();
    return parent.insertNewAfter(selection);
  }

  excludeFromCopy(): boolean {
    return true;
  }
}

export function createOverflowNode(): OverflowNode {
  return new OverflowNode();
}

export function isOverflowNode(node: ?OutlineNode): boolean %checks {
  return node instanceof OverflowNode;
}

function wrapNode(node: OutlineNode): OverflowNode {
  const overflowNode = createOverflowNode();
  node.insertBefore(overflowNode);
  overflowNode.append(node);
  return overflowNode;
}

function unwrapNode(node: OverflowNode): OutlineNode | null {
  const children = node.getChildren();
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    node.insertBefore(children[i]);
  }
  node.remove();
  return childrenLength > 0 ? children[childrenLength - 1] : null;
}

export function mergePrevious(overflowNode: OverflowNode, state: State) {
  const previousNode = overflowNode.getPreviousSibling();
  if (!isOverflowNode(previousNode)) {
    return;
  }

  const firstChild = overflowNode.getFirstChild();
  const previousNodeChildren = previousNode.getChildren();
  const previousNodeChildrenLength = previousNodeChildren.length;
  if (firstChild === null) {
    overflowNode.append(...previousNodeChildren);
  } else {
    for (let i = 0; i < previousNodeChildrenLength; i++) {
      firstChild.insertBefore(previousNodeChildren[i]);
    }
  }

  const selection = state.getSelection();
  if (selection !== null) {
    const anchor = selection.anchor;
    const anchorNode = anchor.getNode();
    const focus = selection.focus;
    const focusNode = anchor.getNode();
    if (anchorNode.is(previousNode)) {
      anchor.set(overflowNode.getKey(), anchor.offset, 'block');
    } else if (anchorNode.is(overflowNode)) {
      anchor.set(
        overflowNode.getKey(),
        previousNodeChildrenLength + anchor.offset,
        'block',
      );
    }
    if (focusNode.is(previousNode)) {
      focus.set(overflowNode.getKey(), focus.offset, 'block');
    } else if (focusNode.is(overflowNode)) {
      focus.set(
        overflowNode.getKey(),
        previousNodeChildrenLength + focus.offset,
        'block',
      );
    }
  }

  previousNode.remove();
}
