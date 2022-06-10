/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// eslint-disable-next-line simple-import-sort/imports

import {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
  CodeHighlightNode,
  CodeNode,
  getFirstCodeHighlightNodeOfLine,
  getLastCodeHighlightNodeOfLine,
} from '@lexical/code';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  INDENT_CONTENT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  MOVE_TO_END,
  MOVE_TO_START,
  OUTDENT_CONTENT_COMMAND,
  TextNode,
} from 'lexical';

function doIndent(node: CodeHighlightNode, type: LexicalCommand<void>) {
  const text = node.getTextContent();
  if (type === INDENT_CONTENT_COMMAND) {
    // If the codeblock node doesn't start with whitespace, we don't want to
    // naively prepend a '\t'; Prism will then mangle all of our nodes when
    // it separates the whitespace from the first non-whitespace node. This
    // will lead to selection bugs when indenting lines that previously
    // didn't start with a whitespace character
    if (text.length > 0 && /\s/.test(text[0])) {
      node.setTextContent('\t' + text);
    } else {
      const indentNode = $createCodeHighlightNode('\t');
      node.insertBefore(indentNode);
    }
  } else {
    if (text.indexOf('\t') === 0) {
      // Same as above - if we leave empty text nodes lying around, the resulting
      // selection will be mangled
      if (text.length === 1) {
        node.remove();
      } else {
        node.setTextContent(text.substring(1));
      }
    }
  }
}

function handleMultilineIndent(type: LexicalCommand<void>): boolean {
  const selection = $getSelection();

  if (!$isRangeSelection(selection) || selection.isCollapsed()) {
    return false;
  }

  // Only run multiline indent logic on selections exclusively composed of code highlights and linebreaks
  const nodes = selection.getNodes();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!$isCodeHighlightNode(node) && !$isLineBreakNode(node)) {
      return false;
    }
  }
  const startOfLine = getFirstCodeHighlightNodeOfLine(nodes[0]);

  if (startOfLine != null) {
    doIndent(startOfLine, type);
  }

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    if ($isLineBreakNode(nodes[i - 1]) && $isCodeHighlightNode(node)) {
      doIndent(node, type);
    }
  }

  return true;
}

function handleShiftLines(
  type: LexicalCommand<KeyboardEvent>,
  event: KeyboardEvent,
): boolean {
  // We only care about the alt+arrow keys
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  // I'm not quite sure why, but it seems like calling anchor.getNode() collapses the selection here
  // So first, get the anchor and the focus, then get their nodes
  const {anchor, focus} = selection;
  const anchorOffset = anchor.offset;
  const focusOffset = focus.offset;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  const arrowIsUp = type === KEY_ARROW_UP_COMMAND;

  // Ensure the selection is within the codeblock
  if (!$isCodeHighlightNode(anchorNode) || !$isCodeHighlightNode(focusNode)) {
    return false;
  }
  if (!event.altKey) {
    // Handle moving selection out of the code block, given there are no
    // sibling thats can natively take the selection.
    if (selection.isCollapsed()) {
      const codeNode = anchorNode.getParentOrThrow();
      if (
        arrowIsUp &&
        anchorOffset === 0 &&
        anchorNode.getPreviousSibling() === null
      ) {
        const codeNodeSibling = codeNode.getPreviousSibling();
        if (codeNodeSibling === null) {
          codeNode.selectPrevious();
          event.preventDefault();
          return true;
        }
      } else if (
        !arrowIsUp &&
        anchorOffset === anchorNode.getTextContentSize() &&
        anchorNode.getNextSibling() === null
      ) {
        const codeNodeSibling = codeNode.getNextSibling();
        if (codeNodeSibling === null) {
          codeNode.selectNext();
          event.preventDefault();
          return true;
        }
      }
    }
    return false;
  }

  const start = getFirstCodeHighlightNodeOfLine(anchorNode);
  const end = getLastCodeHighlightNodeOfLine(focusNode);
  if (start == null || end == null) {
    return false;
  }

  const range = start.getNodesBetween(end);
  for (let i = 0; i < range.length; i++) {
    const node = range[i];
    if (!$isCodeHighlightNode(node) && !$isLineBreakNode(node)) {
      return false;
    }
  }

  // After this point, we know the selection is within the codeblock. We may not be able to
  // actually move the lines around, but we want to return true either way to prevent
  // the event's default behavior
  event.preventDefault();
  event.stopPropagation(); // required to stop cursor movement under Firefox

  const linebreak = arrowIsUp
    ? start.getPreviousSibling()
    : end.getNextSibling();
  if (!$isLineBreakNode(linebreak)) {
    return true;
  }
  const sibling = arrowIsUp
    ? linebreak.getPreviousSibling()
    : linebreak.getNextSibling();
  if (sibling == null) {
    return true;
  }

  const maybeInsertionPoint = arrowIsUp
    ? getFirstCodeHighlightNodeOfLine(sibling)
    : getLastCodeHighlightNodeOfLine(sibling);
  let insertionPoint =
    maybeInsertionPoint != null ? maybeInsertionPoint : sibling;
  linebreak.remove();
  range.forEach((node) => node.remove());
  if (type === KEY_ARROW_UP_COMMAND) {
    range.forEach((node) => insertionPoint.insertBefore(node));
    insertionPoint.insertBefore(linebreak);
  } else {
    insertionPoint.insertAfter(linebreak);
    insertionPoint = linebreak;
    range.forEach((node) => {
      insertionPoint.insertAfter(node);
      insertionPoint = node;
    });
  }

  selection.setTextNodeRange(anchorNode, anchorOffset, focusNode, focusOffset);

  return true;
}

function isSpaceOrTabChar(char: string): boolean {
  return char === ' ' || char === '\t';
}

function findFirstNotSpaceOrTabCharAtText(
  text: string,
  isForward: boolean,
): number {
  const length = text.length;
  let offset = -1;

  if (isForward) {
    for (let i = 0; i < length; i++) {
      const char = text[i];
      if (!isSpaceOrTabChar(char)) {
        offset = i;
        break;
      }
    }
  } else {
    for (let i = length - 1; i > -1; i--) {
      const char = text[i];
      if (!isSpaceOrTabChar(char)) {
        offset = i;
        break;
      }
    }
  }

  return offset;
}

function getStartOfCodeInLine(anchor: LexicalNode): {
  node: TextNode | null;
  offset: number;
} {
  let currentNode = null;
  let currentNodeOffset = -1;
  const previousSiblings = anchor.getPreviousSiblings();
  previousSiblings.push(anchor);
  while (previousSiblings.length > 0) {
    const node = previousSiblings.pop();
    if ($isCodeHighlightNode(node)) {
      const text = node.getTextContent();
      const offset = findFirstNotSpaceOrTabCharAtText(text, true);
      if (offset !== -1) {
        currentNode = node;
        currentNodeOffset = offset;
      }
    }
    if ($isLineBreakNode(node)) {
      break;
    }
  }

  if (currentNode === null) {
    const nextSiblings = anchor.getNextSiblings();
    while (nextSiblings.length > 0) {
      const node = nextSiblings.shift();
      if ($isCodeHighlightNode(node)) {
        const text = node.getTextContent();
        const offset = findFirstNotSpaceOrTabCharAtText(text, true);
        if (offset !== -1) {
          currentNode = node;
          currentNodeOffset = offset;
          break;
        }
      }
      if ($isLineBreakNode(node)) {
        break;
      }
    }
  }

  return {
    node: currentNode,
    offset: currentNodeOffset,
  };
}

function getEndOfCodeInLine(anchor: LexicalNode): {
  node: TextNode | null;
  offset: number;
} {
  let currentNode = null;
  let currentNodeOffset = -1;
  const nextSiblings = anchor.getNextSiblings();
  nextSiblings.unshift(anchor);
  while (nextSiblings.length > 0) {
    const node = nextSiblings.shift();
    if ($isCodeHighlightNode(node)) {
      const text = node.getTextContent();
      const offset = findFirstNotSpaceOrTabCharAtText(text, false);
      if (offset !== -1) {
        currentNode = node;
        currentNodeOffset = offset + 1;
      }
    }
    if ($isLineBreakNode(node)) {
      break;
    }
  }

  if (currentNode === null) {
    const previousSiblings = anchor.getPreviousSiblings();
    while (previousSiblings.length > 0) {
      const node = previousSiblings.pop();
      if ($isCodeHighlightNode(node)) {
        const text = node.getTextContent();
        const offset = findFirstNotSpaceOrTabCharAtText(text, false);
        if (offset !== -1) {
          currentNode = node;
          currentNodeOffset = offset + 1;
          break;
        }
      }
      if ($isLineBreakNode(node)) {
        break;
      }
    }
  }

  return {
    node: currentNode,
    offset: currentNodeOffset,
  };
}

function handleMoveTo(
  type: LexicalCommand<KeyboardEvent>,
  event: KeyboardEvent,
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const {anchor, focus} = selection;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  const isMoveToStart = type === MOVE_TO_START;

  if (!$isCodeHighlightNode(anchorNode) || !$isCodeHighlightNode(focusNode)) {
    return false;
  }

  let node;
  let offset;

  if (isMoveToStart) {
    ({node, offset} = getStartOfCodeInLine(focusNode));
  } else {
    ({node, offset} = getEndOfCodeInLine(focusNode));
  }

  if (node !== null && offset !== -1) {
    selection.setTextNodeRange(node, offset, node, offset);
  }

  event.preventDefault();
  event.stopPropagation();
}
function updateCodeGutter(node: CodeNode, editor: LexicalEditor): void {
  const codeElement = editor.getElementByKey(node.getKey());
  if (codeElement === null) {
    return;
  }
  const children = node.getChildren();
  const childrenLength = children.length;
  // @ts-ignore: internal field
  if (childrenLength === codeElement.__cachedChildrenLength) {
    // Avoid updating the attribute if the children length hasn't changed.
    return;
  }
  // @ts-ignore:: internal field
  codeElement.__cachedChildrenLength = childrenLength;
  let gutter = '1';
  let count = 1;
  for (let i = 0; i < childrenLength; i++) {
    if ($isLineBreakNode(children[i])) {
      gutter += '\n' + ++count;
    }
  }
  codeElement.setAttribute('data-gutter', gutter);
}

export function registerCodeIndent(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerMutationListener(CodeNode, (mutations) => {
      editor.update(() => {
        for (const [key, type] of mutations) {
          if (type !== 'destroyed') {
            const node = $getNodeByKey(key);
            if (node !== null) {
              updateCodeGutter(node as CodeNode, editor);
            }
          }
        }
      });
    }),
    editor.registerCommand(
      INDENT_CONTENT_COMMAND,
      (payload): boolean => handleMultilineIndent(INDENT_CONTENT_COMMAND),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      OUTDENT_CONTENT_COMMAND,
      (payload): boolean => handleMultilineIndent(OUTDENT_CONTENT_COMMAND),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (payload: KeyboardEvent): boolean =>
        handleShiftLines(KEY_ARROW_UP_COMMAND, payload),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (payload: KeyboardEvent): boolean =>
        handleShiftLines(KEY_ARROW_DOWN_COMMAND, payload),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      MOVE_TO_END,
      (payload: KeyboardEvent): boolean => handleMoveTo(MOVE_TO_END, payload),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      MOVE_TO_START,
      (payload: KeyboardEvent): boolean => handleMoveTo(MOVE_TO_START, payload),
      COMMAND_PRIORITY_LOW,
    ),
  );
}
