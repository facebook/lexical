/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  LexicalEditor,
  EditorConfig,
  NodeKey,
  LexicalNode,
  Selection,
} from 'lexical';

import {
  ElementNode,
  $isLeafNode,
  $isTextNode,
  $log,
  $getSelection,
  $getRoot,
  $setSelection,
} from 'lexical';
import {$dfs__DEPRECATED} from '@lexical/helpers/nodes';
import {$textContentCurry} from '@lexical/helpers/root';
import {useEffect} from 'react';
import withSubscriptions from '@lexical/react/withSubscriptions';

type OptionalProps = {
  strlen?: (input: string) => number,
  remainingCharacters?: (characters: number) => void,
};

export function useCharacterLimit(
  editor: LexicalEditor,
  maxCharacters: number,
  optional: OptionalProps = Object.freeze({}),
): void {
  const {
    strlen = (input) => input.length, // UTF-16
    remainingCharacters = (characters) => {},
  } = optional;

  useEffect(() => {
    let text = editor.getEditorState().read($textContentCurry);
    let lastComputedTextLength = 0;

    return withSubscriptions(
      editor.addListener('textcontent', (currentText: string) => {
        text = currentText;
      }),
      editor.addListener('update', ({dirtyLeaves}) => {
        const isComposing = editor.isComposing();
        const hasDirtyLeaves = dirtyLeaves.size > 0;
        if (isComposing || !hasDirtyLeaves) {
          return;
        }
        const textLength = strlen(text);
        const textLengthAboveThreshold =
          textLength > maxCharacters ||
          (lastComputedTextLength !== null &&
            lastComputedTextLength > maxCharacters);
        const diff = maxCharacters - textLength;
        remainingCharacters(diff);
        if (lastComputedTextLength === null || textLengthAboveThreshold) {
          const offset = findOffset(text, maxCharacters, strlen);
          editor.update(
            () => {
              $log('CharacterLimit');
              $wrapOverflowedNodes(offset);
            },
            {
              tag: 'without-history',
            },
          );
        }
        lastComputedTextLength = textLength;
      }),
    );
  }, [editor, maxCharacters, remainingCharacters, strlen]);
}

function findOffset(
  text: string,
  maxCharacters: number,
  strlen: (input: string) => number,
): number {
  const Segmenter = Intl.Segmenter;
  let offsetUtf16 = 0;
  let offset = 0;
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
  return offsetUtf16;
}

function $wrapOverflowedNodes(offset: number): void {
  const root = $getRoot();
  let accumulatedLength = 0;

  let previousNode = root;
  $dfs__DEPRECATED(root, (node: LexicalNode) => {
    if (isOverflowNode(node)) {
      const previousLength = accumulatedLength;
      const nextLength = accumulatedLength + node.getTextContentSize();
      if (nextLength <= offset) {
        const parent = node.getParent();
        const previousSibling = node.getPreviousSibling();
        const nextSibling = node.getNextSibling();
        $unwrapNode(node);
        const selection = $getSelection();
        // Restore selection when the overflow children are removed
        if (
          selection !== null &&
          (!selection.anchor.getNode().isAttached() ||
            !selection.focus.getNode().isAttached())
        ) {
          if ($isTextNode(previousSibling)) {
            previousSibling.select();
          } else if ($isTextNode(nextSibling)) {
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
          $isTextNode(descendant) && descendant.isSimpleText();
        const firstDescendantDoesNotOverflow =
          previousPlusDescendantLength <= offset;
        if (firstDescendantIsSimpleText || firstDescendantDoesNotOverflow) {
          $unwrapNode(node);
          return previousNode;
        }
      }
    } else if ($isLeafNode(node)) {
      const previousAccumulatedLength = accumulatedLength;
      accumulatedLength += node.getTextContentSize();
      if (accumulatedLength > offset && !isOverflowNode(node.getParent())) {
        const previousSelection = $getSelection();
        let overflowNode;
        // For simple text we can improve the limit accuracy by splitting the TextNode
        // on the split point
        if (
          previousAccumulatedLength < offset &&
          $isTextNode(node) &&
          node.isSimpleText()
        ) {
          const [, overflowedText] = node.splitText(
            offset - previousAccumulatedLength,
          );
          overflowNode = $wrapNode(overflowedText);
        } else {
          overflowNode = $wrapNode(node);
        }
        if (previousSelection !== null) {
          $setSelection(previousSelection);
        }
        mergePrevious(overflowNode);
      }
    }
    previousNode = node;
    return node;
  });
}

export class OverflowNode extends ElementNode {
  static getType(): string {
    return 'overflow';
  }

  static clone(node: OverflowNode): OverflowNode {
    return new OverflowNode(node.__key);
  }

  constructor(key?: NodeKey): void {
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

  insertNewAfter(selection: Selection): null | LexicalNode {
    const parent = this.getParentOrThrow();
    return parent.insertNewAfter(selection);
  }

  excludeFromCopy(): boolean {
    return true;
  }
}

export function $createOverflowNode(): OverflowNode {
  return new OverflowNode();
}

export function isOverflowNode(node: ?LexicalNode): boolean %checks {
  return node instanceof OverflowNode;
}

function $wrapNode(node: LexicalNode): OverflowNode {
  const overflowNode = $createOverflowNode();
  node.insertBefore(overflowNode);
  overflowNode.append(node);
  return overflowNode;
}

function $unwrapNode(node: OverflowNode): LexicalNode | null {
  const children = node.getChildren();
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    node.insertBefore(children[i]);
  }
  node.remove();
  return childrenLength > 0 ? children[childrenLength - 1] : null;
}

export function mergePrevious(overflowNode: OverflowNode): void {
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

  const selection = $getSelection();
  if (selection !== null) {
    const anchor = selection.anchor;
    const anchorNode = anchor.getNode();
    const focus = selection.focus;
    const focusNode = anchor.getNode();
    if (anchorNode.is(previousNode)) {
      anchor.set(overflowNode.getKey(), anchor.offset, 'element');
    } else if (anchorNode.is(overflowNode)) {
      anchor.set(
        overflowNode.getKey(),
        previousNodeChildrenLength + anchor.offset,
        'element',
      );
    }
    if (focusNode.is(previousNode)) {
      focus.set(overflowNode.getKey(), focus.offset, 'element');
    } else if (focusNode.is(overflowNode)) {
      focus.set(
        overflowNode.getKey(),
        previousNodeChildrenLength + focus.offset,
        'element',
      );
    }
  }

  previousNode.remove();
}
