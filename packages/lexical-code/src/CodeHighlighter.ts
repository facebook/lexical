/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  BaseSelection,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  LineBreakNode,
  NodeKey,
  RangeSelection,
} from 'lexical';

import './CodeHighlighterPrism';

import {mergeRegister} from '@lexical/utils';
import {
  $createLineBreakNode,
  $createTabNode,
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $insertNodes,
  $isLineBreakNode,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  INDENT_CONTENT_COMMAND,
  INSERT_TAB_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_TAB_COMMAND,
  MOVE_TO_END,
  MOVE_TO_START,
  OUTDENT_CONTENT_COMMAND,
  TabNode,
  TextNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
  CodeHighlightNode,
  DEFAULT_CODE_LANGUAGE,
  getFirstCodeNodeOfLine,
  getLastCodeNodeOfLine,
} from './CodeHighlightNode';
import {$isCodeNode, CodeNode} from './CodeNode';

type TokenContent = string | Token | (string | Token)[];

export interface Token {
  type: string;
  content: TokenContent;
}

export interface Tokenizer {
  defaultLanguage: string;
  tokenize(code: string, language?: string): (string | Token)[];
}

export const PrismTokenizer: Tokenizer = {
  defaultLanguage: DEFAULT_CODE_LANGUAGE,
  tokenize(code: string, language?: string): (string | Token)[] {
    return window.Prism.tokenize(
      code,
      window.Prism.languages[language || ''] ||
        window.Prism.languages[this.defaultLanguage],
    );
  },
};

export function getStartOfCodeInLine(
  anchor: CodeHighlightNode | TabNode,
  offset: number,
): null | {
  node: CodeHighlightNode | TabNode | LineBreakNode;
  offset: number;
} {
  let last: null | {
    node: CodeHighlightNode | TabNode | LineBreakNode;
    offset: number;
  } = null;
  let lastNonBlank: null | {node: CodeHighlightNode; offset: number} = null;
  let node: null | CodeHighlightNode | TabNode | LineBreakNode = anchor;
  let nodeOffset = offset;
  let nodeTextContent = anchor.getTextContent();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (nodeOffset === 0) {
      node = node.getPreviousSibling();
      if (node === null) {
        break;
      }
      invariant(
        $isCodeHighlightNode(node) ||
          $isTabNode(node) ||
          $isLineBreakNode(node),
        'Expected a valid Code Node: CodeHighlightNode, TabNode, LineBreakNode',
      );
      if ($isLineBreakNode(node)) {
        last = {
          node,
          offset: 1,
        };
        break;
      }
      nodeOffset = Math.max(0, node.getTextContentSize() - 1);
      nodeTextContent = node.getTextContent();
    } else {
      nodeOffset--;
    }
    const character = nodeTextContent[nodeOffset];
    if ($isCodeHighlightNode(node) && character !== ' ') {
      lastNonBlank = {
        node,
        offset: nodeOffset,
      };
    }
  }
  // lastNonBlank !== null: anchor in the middle of code; move to line beginning
  if (lastNonBlank !== null) {
    return lastNonBlank;
  }
  // Spaces, tabs or nothing ahead of anchor
  let codeCharacterAtAnchorOffset = null;
  if (offset < anchor.getTextContentSize()) {
    if ($isCodeHighlightNode(anchor)) {
      codeCharacterAtAnchorOffset = anchor.getTextContent()[offset];
    }
  } else {
    const nextSibling = anchor.getNextSibling();
    if ($isCodeHighlightNode(nextSibling)) {
      codeCharacterAtAnchorOffset = nextSibling.getTextContent()[0];
    }
  }
  if (
    codeCharacterAtAnchorOffset !== null &&
    codeCharacterAtAnchorOffset !== ' '
  ) {
    // Borderline whitespace and code, move to line beginning
    return last;
  } else {
    const nextNonBlank = findNextNonBlankInLine(anchor, offset);
    if (nextNonBlank !== null) {
      return nextNonBlank;
    } else {
      return last;
    }
  }
}

function findNextNonBlankInLine(
  anchor: LexicalNode,
  offset: number,
): null | {node: CodeHighlightNode; offset: number} {
  let node: null | LexicalNode = anchor;
  let nodeOffset = offset;
  let nodeTextContent = anchor.getTextContent();
  let nodeTextContentSize = anchor.getTextContentSize();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!$isCodeHighlightNode(node) || nodeOffset === nodeTextContentSize) {
      node = node.getNextSibling();
      if (node === null || $isLineBreakNode(node)) {
        return null;
      }
      if ($isCodeHighlightNode(node)) {
        nodeOffset = 0;
        nodeTextContent = node.getTextContent();
        nodeTextContentSize = node.getTextContentSize();
      }
    }
    if ($isCodeHighlightNode(node)) {
      if (nodeTextContent[nodeOffset] !== ' ') {
        return {
          node,
          offset: nodeOffset,
        };
      }
      nodeOffset++;
    }
  }
}

export function getEndOfCodeInLine(
  anchor: CodeHighlightNode | TabNode,
): CodeHighlightNode | TabNode {
  const lastNode = getLastCodeNodeOfLine(anchor);
  invariant(
    !$isLineBreakNode(lastNode),
    'Unexpected lineBreakNode in getEndOfCodeInLine',
  );
  return lastNode;
}

function textNodeTransform(
  node: TextNode,
  editor: LexicalEditor,
  tokenizer: Tokenizer,
): void {
  // Since CodeNode has flat children structure we only need to check
  // if node's parent is a code node and run highlighting if so
  const parentNode = node.getParent();
  if ($isCodeNode(parentNode)) {
    codeNodeTransform(parentNode, editor, tokenizer);
  } else if ($isCodeHighlightNode(node)) {
    // When code block converted into paragraph or other element
    // code highlight nodes converted back to normal text
    node.replace($createTextNode(node.__text));
  }
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

// Using `skipTransforms` to prevent extra transforms since reformatting the code
// will not affect code block content itself.
//
// Using extra cache (`nodesCurrentlyHighlighting`) since both CodeNode and CodeHighlightNode
// transforms might be called at the same time (e.g. new CodeHighlight node inserted) and
// in both cases we'll rerun whole reformatting over CodeNode, which is redundant.
// Especially when pasting code into CodeBlock.

const nodesCurrentlyHighlighting = new Set();

function codeNodeTransform(
  node: CodeNode,
  editor: LexicalEditor,
  tokenizer: Tokenizer,
) {
  const nodeKey = node.getKey();

  if (nodesCurrentlyHighlighting.has(nodeKey)) {
    return;
  }

  nodesCurrentlyHighlighting.add(nodeKey);

  // When new code block inserted it might not have language selected
  if (node.getLanguage() === undefined) {
    node.setLanguage(tokenizer.defaultLanguage);
  }

  // Using nested update call to pass `skipTransforms` since we don't want
  // each individual codehighlight node to be transformed again as it's already
  // in its final state
  editor.update(
    () => {
      updateAndRetainSelection(nodeKey, () => {
        const currentNode = $getNodeByKey(nodeKey);

        if (!$isCodeNode(currentNode) || !currentNode.isAttached()) {
          return false;
        }

        const code = currentNode.getTextContent();
        const tokens = tokenizer.tokenize(
          code,
          currentNode.getLanguage() || tokenizer.defaultLanguage,
        );
        const highlightNodes = getHighlightNodes(tokens);
        const diffRange = getDiffRange(
          currentNode.getChildren(),
          highlightNodes,
        );
        const {from, to, nodesForReplacement} = diffRange;

        if (from !== to || nodesForReplacement.length) {
          node.splice(from, to - from, nodesForReplacement);
          return true;
        }

        return false;
      });
    },
    {
      onUpdate: () => {
        nodesCurrentlyHighlighting.delete(nodeKey);
      },
      skipTransforms: true,
    },
  );
}

function getHighlightNodes(
  tokens: Array<string | Token>,
  type?: string,
): LexicalNode[] {
  const nodes: LexicalNode[] = [];

  for (const token of tokens) {
    if (typeof token === 'string') {
      const partials = token.split(/(\n|\t)/);
      const partialsLength = partials.length;
      for (let i = 0; i < partialsLength; i++) {
        const part = partials[i];
        if (part === '\n' || part === '\r\n') {
          nodes.push($createLineBreakNode());
        } else if (part === '\t') {
          nodes.push($createTabNode());
        } else if (part.length > 0) {
          nodes.push($createCodeHighlightNode(part, type));
        }
      }
    } else {
      const {content} = token;
      if (typeof content === 'string') {
        nodes.push(...getHighlightNodes([content], token.type));
      } else if (Array.isArray(content)) {
        nodes.push(...getHighlightNodes(content, token.type));
      }
    }
  }

  return nodes;
}

// Wrapping update function into selection retainer, that tries to keep cursor at the same
// position as before.
function updateAndRetainSelection(
  nodeKey: NodeKey,
  updateFn: () => boolean,
): void {
  const node = $getNodeByKey(nodeKey);
  if (!$isCodeNode(node) || !node.isAttached()) {
    return;
  }
  const selection = $getSelection();
  // If it's not range selection (or null selection) there's no need to change it,
  // but we can still run highlighting logic
  if (!$isRangeSelection(selection)) {
    updateFn();
    return;
  }

  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const isNewLineAnchor =
    anchor.type === 'element' &&
    $isLineBreakNode(node.getChildAtIndex(anchor.offset - 1));
  let textOffset = 0;

  // Calculating previous text offset (all text node prior to anchor + anchor own text offset)
  if (!isNewLineAnchor) {
    const anchorNode = anchor.getNode();
    textOffset =
      anchorOffset +
      anchorNode.getPreviousSiblings().reduce((offset, _node) => {
        return offset + _node.getTextContentSize();
      }, 0);
  }

  const hasChanges = updateFn();
  if (!hasChanges) {
    return;
  }

  // Non-text anchors only happen for line breaks, otherwise
  // selection will be within text node (code highlight node)
  if (isNewLineAnchor) {
    anchor.getNode().select(anchorOffset, anchorOffset);
    return;
  }

  // If it was non-element anchor then we walk through child nodes
  // and looking for a position of original text offset
  node.getChildren().some((_node) => {
    const isText = $isTextNode(_node);
    if (isText || $isLineBreakNode(_node)) {
      const textContentSize = _node.getTextContentSize();
      if (isText && textContentSize >= textOffset) {
        _node.select(textOffset, textOffset);
        return true;
      }
      textOffset -= textContentSize;
    }
    return false;
  });
}

// Finds minimal diff range between two nodes lists. It returns from/to range boundaries of prevNodes
// that needs to be replaced with `nodes` (subset of nextNodes) to make prevNodes equal to nextNodes.
function getDiffRange(
  prevNodes: Array<LexicalNode>,
  nextNodes: Array<LexicalNode>,
): {
  from: number;
  nodesForReplacement: Array<LexicalNode>;
  to: number;
} {
  let leadingMatch = 0;
  while (leadingMatch < prevNodes.length) {
    if (!isEqual(prevNodes[leadingMatch], nextNodes[leadingMatch])) {
      break;
    }
    leadingMatch++;
  }

  const prevNodesLength = prevNodes.length;
  const nextNodesLength = nextNodes.length;
  const maxTrailingMatch =
    Math.min(prevNodesLength, nextNodesLength) - leadingMatch;

  let trailingMatch = 0;
  while (trailingMatch < maxTrailingMatch) {
    trailingMatch++;
    if (
      !isEqual(
        prevNodes[prevNodesLength - trailingMatch],
        nextNodes[nextNodesLength - trailingMatch],
      )
    ) {
      trailingMatch--;
      break;
    }
  }

  const from = leadingMatch;
  const to = prevNodesLength - trailingMatch;
  const nodesForReplacement = nextNodes.slice(
    leadingMatch,
    nextNodesLength - trailingMatch,
  );
  return {
    from,
    nodesForReplacement,
    to,
  };
}

function isEqual(nodeA: LexicalNode, nodeB: LexicalNode): boolean {
  // Only checking for code higlight nodes, tabs and linebreaks. If it's regular text node
  // returning false so that it's transformed into code highlight node
  return (
    ($isCodeHighlightNode(nodeA) &&
      $isCodeHighlightNode(nodeB) &&
      nodeA.__text === nodeB.__text &&
      nodeA.__highlightType === nodeB.__highlightType) ||
    ($isTabNode(nodeA) && $isTabNode(nodeB)) ||
    ($isLineBreakNode(nodeA) && $isLineBreakNode(nodeB))
  );
}

function $isSelectionInCode(selection: null | BaseSelection): boolean {
  if (!$isRangeSelection(selection)) {
    return false;
  }
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode.is(focusNode) && $isCodeNode(anchorNode)) {
    return true;
  }
  const anchorParent = anchorNode.getParent();
  return $isCodeNode(anchorParent) && anchorParent.is(focusNode.getParent());
}

function $getCodeLines(
  selection: RangeSelection,
): Array<Array<CodeHighlightNode | TabNode>> {
  const nodes = selection.getNodes();
  const lines: Array<Array<CodeHighlightNode | TabNode>> = [[]];
  if (nodes.length === 1 && $isCodeNode(nodes[0])) {
    return lines;
  }
  let lastLine: Array<CodeHighlightNode | TabNode> = lines[0];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    invariant(
      $isCodeHighlightNode(node) || $isTabNode(node) || $isLineBreakNode(node),
      'Expected selection to be inside CodeBlock and consisting of CodeHighlightNode, TabNode and LineBreakNode',
    );
    if ($isLineBreakNode(node)) {
      if (i !== 0 && lastLine.length > 0) {
        lastLine = [];
        lines.push(lastLine);
      }
    } else {
      lastLine.push(node);
    }
  }
  return lines;
}

function handleTab(shiftKey: boolean): null | LexicalCommand<void> {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !$isSelectionInCode(selection)) {
    return null;
  }
  const indentOrOutdent = !shiftKey
    ? INDENT_CONTENT_COMMAND
    : OUTDENT_CONTENT_COMMAND;
  const tabOrOutdent = !shiftKey ? INSERT_TAB_COMMAND : OUTDENT_CONTENT_COMMAND;
  // 1. If multiple lines selected: indent/outdent
  const codeLines = $getCodeLines(selection);
  if (codeLines.length > 1) {
    return indentOrOutdent;
  }
  // 2. If entire line selected: indent/outdent
  const selectionNodes = selection.getNodes();
  const firstNode = selectionNodes[0];
  invariant(
    $isCodeNode(firstNode) ||
      $isCodeHighlightNode(firstNode) ||
      $isTabNode(firstNode) ||
      $isLineBreakNode(firstNode),
    'Expected selection firstNode to be CodeHighlightNode or TabNode',
  );
  if ($isCodeNode(firstNode)) {
    return indentOrOutdent;
  }
  const firstOfLine = getFirstCodeNodeOfLine(firstNode);
  const lastOfLine = getLastCodeNodeOfLine(firstNode);
  const anchor = selection.anchor;
  const focus = selection.focus;
  let selectionFirst;
  let selectionLast;
  if (focus.isBefore(anchor)) {
    selectionFirst = focus;
    selectionLast = anchor;
  } else {
    selectionFirst = anchor;
    selectionLast = focus;
  }
  if (
    firstOfLine !== null &&
    lastOfLine !== null &&
    selectionFirst.key === firstOfLine.getKey() &&
    selectionFirst.offset === 0 &&
    selectionLast.key === lastOfLine.getKey() &&
    selectionLast.offset === lastOfLine.getTextContentSize()
  ) {
    return indentOrOutdent;
  }
  // 3. Else: tab/outdent
  return tabOrOutdent;
}

function handleMultilineIndent(type: LexicalCommand<void>): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !$isSelectionInCode(selection)) {
    return false;
  }
  const codeLines = $getCodeLines(selection);
  const codeLinesLength = codeLines.length;
  // Multiple lines selection
  if (codeLines.length > 1) {
    for (let i = 0; i < codeLinesLength; i++) {
      const line = codeLines[i];
      if (line.length > 0) {
        let firstOfLine: null | CodeHighlightNode | TabNode | LineBreakNode =
          line[0];
        // First and last lines might not be complete
        if (i === 0) {
          firstOfLine = getFirstCodeNodeOfLine(firstOfLine);
        }
        if (firstOfLine !== null) {
          if (type === INDENT_CONTENT_COMMAND) {
            firstOfLine.insertBefore($createTabNode());
          } else if ($isTabNode(firstOfLine)) {
            firstOfLine.remove();
          }
        }
      }
    }
    return true;
  }
  // Just one line
  const selectionNodes = selection.getNodes();
  const firstNode = selectionNodes[0];
  invariant(
    $isCodeNode(firstNode) ||
      $isCodeHighlightNode(firstNode) ||
      $isTabNode(firstNode) ||
      $isLineBreakNode(firstNode),
    'Expected selection firstNode to be CodeHighlightNode or CodeTabNode',
  );
  if ($isCodeNode(firstNode)) {
    // CodeNode is empty
    if (type === INDENT_CONTENT_COMMAND) {
      selection.insertNodes([$createTabNode()]);
    }
    return true;
  }
  const firstOfLine = getFirstCodeNodeOfLine(firstNode);
  invariant(
    firstOfLine !== null,
    'Expected getFirstCodeNodeOfLine to return a valid Code Node',
  );
  if (type === INDENT_CONTENT_COMMAND) {
    if ($isLineBreakNode(firstOfLine)) {
      firstOfLine.insertAfter($createTabNode());
    } else {
      firstOfLine.insertBefore($createTabNode());
    }
  } else if ($isTabNode(firstOfLine)) {
    firstOfLine.remove();
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
  if (
    !$isSelectionInCode(selection) ||
    !($isCodeHighlightNode(anchorNode) || $isTabNode(anchorNode)) ||
    !($isCodeHighlightNode(focusNode) || $isTabNode(focusNode))
  ) {
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

  let start;
  let end;
  if (anchorNode.isBefore(focusNode)) {
    start = getFirstCodeNodeOfLine(anchorNode);
    end = getLastCodeNodeOfLine(focusNode);
  } else {
    start = getFirstCodeNodeOfLine(focusNode);
    end = getLastCodeNodeOfLine(anchorNode);
  }
  if (start == null || end == null) {
    return false;
  }

  const range = start.getNodesBetween(end);
  for (let i = 0; i < range.length; i++) {
    const node = range[i];
    if (
      !$isCodeHighlightNode(node) &&
      !$isTabNode(node) &&
      !$isLineBreakNode(node)
    ) {
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

  const maybeInsertionPoint =
    $isCodeHighlightNode(sibling) ||
    $isTabNode(sibling) ||
    $isLineBreakNode(sibling)
      ? arrowIsUp
        ? getFirstCodeNodeOfLine(sibling)
        : getLastCodeNodeOfLine(sibling)
      : null;
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

  if (
    !($isCodeHighlightNode(anchorNode) || $isTabNode(anchorNode)) ||
    !($isCodeHighlightNode(focusNode) || $isTabNode(focusNode))
  ) {
    return false;
  }

  if (isMoveToStart) {
    const start = getStartOfCodeInLine(focusNode, focus.offset);
    if (start !== null) {
      const {node, offset} = start;
      if ($isLineBreakNode(node)) {
        node.selectNext(0, 0);
      } else {
        selection.setTextNodeRange(node, offset, node, offset);
      }
    } else {
      focusNode.getParentOrThrow().selectStart();
    }
  } else {
    const node = getEndOfCodeInLine(focusNode);
    node.select();
  }

  event.preventDefault();
  event.stopPropagation();

  return true;
}

export function registerCodeHighlighting(
  editor: LexicalEditor,
  tokenizer?: Tokenizer,
): () => void {
  if (!editor.hasNodes([CodeNode, CodeHighlightNode])) {
    throw new Error(
      'CodeHighlightPlugin: CodeNode or CodeHighlightNode not registered on editor',
    );
  }

  if (tokenizer == null) {
    tokenizer = PrismTokenizer;
  }

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
    editor.registerNodeTransform(CodeNode, (node) =>
      codeNodeTransform(node, editor, tokenizer as Tokenizer),
    ),
    editor.registerNodeTransform(TextNode, (node) =>
      textNodeTransform(node, editor, tokenizer as Tokenizer),
    ),
    editor.registerNodeTransform(CodeHighlightNode, (node) =>
      textNodeTransform(node, editor, tokenizer as Tokenizer),
    ),
    editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        const command = handleTab(event.shiftKey);
        if (command === null) {
          return false;
        }
        event.preventDefault();
        editor.dispatchCommand(command, undefined);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      INSERT_TAB_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isSelectionInCode(selection)) {
          return false;
        }
        $insertNodes([$createTabNode()]);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
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
      (payload): boolean => handleShiftLines(KEY_ARROW_UP_COMMAND, payload),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (payload): boolean => handleShiftLines(KEY_ARROW_DOWN_COMMAND, payload),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      MOVE_TO_END,
      (payload): boolean => handleMoveTo(MOVE_TO_END, payload),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      MOVE_TO_START,
      (payload): boolean => handleMoveTo(MOVE_TO_START, payload),
      COMMAND_PRIORITY_LOW,
    ),
  );
}
