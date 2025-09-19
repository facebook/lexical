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

import {mergeRegister} from '@lexical/utils';
import {
  $createLineBreakNode,
  $createPoint,
  $createTabNode,
  $createTextNode,
  $getCaretRange,
  $getCaretRangeInDirection,
  $getNodeByKey,
  $getSelection,
  $getSiblingCaret,
  $getTextPointCaret,
  $insertNodes,
  $isLineBreakNode,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  $normalizeCaret,
  $setSelectionFromCaretRange,
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

import {$isCodeHighlightNode, CodeHighlightNode} from './CodeHighlightNode';
import {$isCodeNode, CodeNode, DEFAULT_CODE_LANGUAGE} from './CodeNode';
import {
  $getHighlightNodes,
  isCodeLanguageLoaded,
  loadCodeLanguage,
  Prism,
} from './FacadePrism';
import {
  $getEndOfCodeInLine,
  $getFirstCodeNodeOfLine,
  $getLastCodeNodeOfLine,
  $getStartOfCodeInLine,
} from './FlatStructureUtils';

type TokenContent = string | Token | (string | Token)[];

export interface Token {
  type: string;
  alias: string | string[];
  content: TokenContent;
}

export interface Tokenizer {
  defaultLanguage: string;
  tokenize(code: string, language?: string): (string | Token)[];
  $tokenize(codeNode: CodeNode, language?: string): LexicalNode[];
}

export const PrismTokenizer: Tokenizer = {
  $tokenize(codeNode: CodeNode, language?: string): LexicalNode[] {
    return $getHighlightNodes(codeNode, language || this.defaultLanguage);
  },
  defaultLanguage: DEFAULT_CODE_LANGUAGE,
  tokenize(code: string, language?: string): (string | Token)[] {
    return Prism.tokenize(
      code,
      Prism.languages[language || ''] || Prism.languages[this.defaultLanguage],
    );
  },
};

function $textNodeTransform(
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

  // When new code block inserted it might not have language selected
  if (node.getLanguage() === undefined) {
    node.setLanguage(tokenizer.defaultLanguage);
  }

  const language = node.getLanguage() || tokenizer.defaultLanguage;
  if (isCodeLanguageLoaded(language)) {
    if (!node.getIsSyntaxHighlightSupported()) {
      node.setIsSyntaxHighlightSupported(true);
    }
  } else {
    if (node.getIsSyntaxHighlightSupported()) {
      node.setIsSyntaxHighlightSupported(false);
    }
    loadCodeLanguage(language, editor, nodeKey);
    return;
  }

  if (nodesCurrentlyHighlighting.has(nodeKey)) {
    return;
  }

  nodesCurrentlyHighlighting.add(nodeKey);

  // Using nested update call to pass `skipTransforms` since we don't want
  // each individual CodeHighlightNode to be transformed again as it's already
  // in its final state
  editor.update(
    () => {
      $updateAndRetainSelection(nodeKey, () => {
        const currentNode = $getNodeByKey(nodeKey);

        if (!$isCodeNode(currentNode) || !currentNode.isAttached()) {
          return false;
        }
        //const DIFF_LANGUAGE_REGEX = /^diff-([\w-]+)/i;
        const currentLanguage =
          currentNode.getLanguage() || tokenizer.defaultLanguage;
        //const diffLanguageMatch = DIFF_LANGUAGE_REGEX.exec(currentLanguage);

        const highlightNodes = tokenizer.$tokenize(
          currentNode,
          currentLanguage,
        );

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

// Wrapping update function into selection retainer, that tries to keep cursor at the same
// position as before.
function $updateAndRetainSelection(
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
  // Only checking for code highlight nodes, tabs and linebreaks. If it's regular text node
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

/**
 * Returns a boolean.
 * Check that the selection span is within a single CodeNode.
 * This is used to guard against executing handlers that can only be
 * applied in a single CodeNode context
 */
function $isSelectionInCode(selection: null | BaseSelection): boolean {
  if (!$isRangeSelection(selection)) {
    return false;
  }
  const anchorNode = selection.anchor.getNode();
  const maybeAnchorCodeNode = $isCodeNode(anchorNode)
    ? anchorNode
    : anchorNode.getParent();
  const focusNode = selection.focus.getNode();
  const maybeFocusCodeNode = $isCodeNode(focusNode)
    ? focusNode
    : focusNode.getParent();

  return (
    $isCodeNode(maybeAnchorCodeNode) &&
    maybeAnchorCodeNode.is(maybeFocusCodeNode)
  );
}

/**
 * Returns an Array of code lines
 * Take the sequence of LineBreakNode | TabNode | CodeHighlightNode forming
 * the selection and split it by LineBreakNode.
 * If the selection ends at the start of the last line, it is considered empty.
 * Empty lines are discarded.
 */
function $getCodeLines(
  selection: RangeSelection,
): Array<Array<CodeHighlightNode | TabNode>> {
  const nodes = selection.getNodes();
  const lines: Array<Array<CodeHighlightNode | TabNode>> = [];
  if (nodes.length === 1 && $isCodeNode(nodes[0])) {
    return lines;
  }
  let lastLine: Array<CodeHighlightNode | TabNode> = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    invariant(
      $isCodeHighlightNode(node) || $isTabNode(node) || $isLineBreakNode(node),
      'Expected selection to be inside CodeBlock and consisting of CodeHighlightNode, TabNode and LineBreakNode',
    );
    if ($isLineBreakNode(node)) {
      if (lastLine.length > 0) {
        lines.push(lastLine);
        lastLine = [];
      }
    } else {
      lastLine.push(node);
    }
  }
  if (lastLine.length > 0) {
    const selectionEnd = selection.isBackward()
      ? selection.anchor
      : selection.focus;

    // Discard the last line if the selection ends exactly at the
    // start of the line (no real selection)
    const lastPoint = $createPoint(lastLine[0].getKey(), 0, 'text');
    if (!selectionEnd.is(lastPoint)) {
      lines.push(lastLine);
    }
  }

  return lines;
}

function $handleTab(shiftKey: boolean): null | LexicalCommand<void> {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !$isSelectionInCode(selection)) {
    return null;
  }
  const indentOrOutdent = !shiftKey
    ? INDENT_CONTENT_COMMAND
    : OUTDENT_CONTENT_COMMAND;
  const tabOrOutdent = !shiftKey ? INSERT_TAB_COMMAND : OUTDENT_CONTENT_COMMAND;

  const anchor = selection.anchor;
  const focus = selection.focus;

  // 1. early decision when there is no real selection
  if (anchor.is(focus)) {
    return tabOrOutdent;
  }

  // 2. If only empty lines or multiple non-empty lines are selected: indent/outdent
  const codeLines = $getCodeLines(selection);
  if (codeLines.length !== 1) {
    return indentOrOutdent;
  }

  const codeLine: Array<CodeHighlightNode | TabNode> = codeLines[0];
  const codeLineLength = codeLine.length;

  invariant(
    codeLineLength !== 0,
    '$getCodeLines only extracts non-empty lines',
  );

  // Take into account the direction of the selection
  let selectionFirst;
  let selectionLast;
  if (selection.isBackward()) {
    selectionFirst = focus;
    selectionLast = anchor;
  } else {
    selectionFirst = anchor;
    selectionLast = focus;
  }

  // find boundary elements of the line
  // since codeLine only contains TabNode | CodeHighlightNode
  // the result of these functions should is of Type TabNode | CodeHighlightNode
  const firstOfLine = $getFirstCodeNodeOfLine(codeLine[0]);
  const lastOfLine = $getLastCodeNodeOfLine(codeLine[0]);

  const anchorOfLine = $createPoint(firstOfLine.getKey(), 0, 'text');
  const focusOfLine = $createPoint(
    lastOfLine.getKey(),
    lastOfLine.getTextContentSize(),
    'text',
  );

  // 3. multiline because selection started strictly before the line
  if (selectionFirst.isBefore(anchorOfLine)) {
    return indentOrOutdent;
  }

  // 4. multiline because the selection stops strictly after the line
  if (focusOfLine.isBefore(selectionLast)) {
    return indentOrOutdent;
  }

  // The selection if within the line.
  // 4. If it does not touch both borders, it needs a tab
  if (
    anchorOfLine.isBefore(selectionFirst) ||
    selectionLast.isBefore(focusOfLine)
  ) {
    return tabOrOutdent;
  }

  // 5. Selection is matching a full line on non-empty code
  return indentOrOutdent;
}

function $handleMultilineIndent(type: LexicalCommand<void>): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !$isSelectionInCode(selection)) {
    return false;
  }

  const codeLines = $getCodeLines(selection);
  const codeLinesLength = codeLines.length;

  // Special Indent case
  // Selection is collapsed at the beginning of a line
  if (codeLinesLength === 0 && selection.isCollapsed()) {
    if (type === INDENT_CONTENT_COMMAND) {
      selection.insertNodes([$createTabNode()]);
    }
    return true;
  }

  // Special Indent case
  // Selection is matching only one LineBreak
  if (
    codeLinesLength === 0 &&
    type === INDENT_CONTENT_COMMAND &&
    selection.getTextContent() === '\n'
  ) {
    const tabNode = $createTabNode();
    const lineBreakNode = $createLineBreakNode();
    const direction = selection.isBackward() ? 'previous' : 'next';
    selection.insertNodes([tabNode, lineBreakNode]);
    $setSelectionFromCaretRange(
      $getCaretRangeInDirection(
        $getCaretRange(
          $getTextPointCaret(tabNode, 'next', 0),
          $normalizeCaret($getSiblingCaret(lineBreakNode, 'next')),
        ),
        direction,
      ),
    );

    return true;
  }

  // Indent Non Empty Lines
  for (let i = 0; i < codeLinesLength; i++) {
    const line = codeLines[i];
    // a line here is never empty
    if (line.length > 0) {
      let firstOfLine: null | CodeHighlightNode | TabNode | LineBreakNode =
        line[0];

      // make sure to consider the first node on the first line
      // because the line might not be fully selected
      if (i === 0) {
        firstOfLine = $getFirstCodeNodeOfLine(firstOfLine);
      }

      if (type === INDENT_CONTENT_COMMAND) {
        const tabNode = $createTabNode();
        firstOfLine.insertBefore(tabNode);
        // First real code line may need selection adjustment
        // when firstOfLine is at the selection boundary
        if (i === 0) {
          const anchorKey = selection.isBackward() ? 'focus' : 'anchor';
          const anchorLine = $createPoint(firstOfLine.getKey(), 0, 'text');

          if (selection[anchorKey].is(anchorLine)) {
            selection[anchorKey].set(tabNode.getKey(), 0, 'text');
          }
        }
      } else if ($isTabNode(firstOfLine)) {
        firstOfLine.remove();
      }
    }
  }
  return true;
}

function $handleShiftLines(
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
    // siblings that can natively take the selection.
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
    start = $getFirstCodeNodeOfLine(anchorNode);
    end = $getLastCodeNodeOfLine(focusNode);
  } else {
    start = $getFirstCodeNodeOfLine(focusNode);
    end = $getLastCodeNodeOfLine(anchorNode);
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
        ? $getFirstCodeNodeOfLine(sibling)
        : $getLastCodeNodeOfLine(sibling)
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

function $handleMoveTo(
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

  // Ensure the selection is within the codeblock
  if (
    !$isSelectionInCode(selection) ||
    !($isCodeHighlightNode(anchorNode) || $isTabNode(anchorNode)) ||
    !($isCodeHighlightNode(focusNode) || $isTabNode(focusNode))
  ) {
    return false;
  }

  if (isMoveToStart) {
    const start = $getStartOfCodeInLine(focusNode, focus.offset);
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
    const node = $getEndOfCodeInLine(focusNode);
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

  const registrations = [];

  // Only register the mutation listener if not in headless mode
  if (editor._headless !== true) {
    registrations.push(
      editor.registerMutationListener(
        CodeNode,
        (mutations) => {
          editor.getEditorState().read(() => {
            for (const [key, type] of mutations) {
              if (type !== 'destroyed') {
                const node = $getNodeByKey(key);
                if (node !== null) {
                  updateCodeGutter(node as CodeNode, editor);
                }
              }
            }
          });
        },
        {skipInitialization: false},
      ),
    );
  }

  // Add the rest of the registrations
  registrations.push(
    editor.registerNodeTransform(CodeNode, (node) =>
      codeNodeTransform(node, editor, tokenizer),
    ),
    editor.registerNodeTransform(TextNode, (node) =>
      $textNodeTransform(node, editor, tokenizer),
    ),
    editor.registerNodeTransform(CodeHighlightNode, (node) =>
      $textNodeTransform(node, editor, tokenizer),
    ),
    editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        const command = $handleTab(event.shiftKey);
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
      (payload): boolean => $handleMultilineIndent(INDENT_CONTENT_COMMAND),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      OUTDENT_CONTENT_COMMAND,
      (payload): boolean => $handleMultilineIndent(OUTDENT_CONTENT_COMMAND),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const {anchor} = selection;
        const anchorNode = anchor.getNode();
        if (!$isSelectionInCode(selection)) {
          return false;
        }
        // If at the start of a code block, prevent selection from moving out
        if (
          selection.isCollapsed() &&
          anchor.offset === 0 &&
          anchorNode.getPreviousSibling() === null &&
          $isCodeNode(anchorNode.getParentOrThrow())
        ) {
          event.preventDefault();
          return true;
        }
        return $handleShiftLines(KEY_ARROW_UP_COMMAND, event);
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const {anchor} = selection;
        const anchorNode = anchor.getNode();
        if (!$isSelectionInCode(selection)) {
          return false;
        }
        // If at the end of a code block, prevent selection from moving out
        if (
          selection.isCollapsed() &&
          anchor.offset === anchorNode.getTextContentSize() &&
          anchorNode.getNextSibling() === null &&
          $isCodeNode(anchorNode.getParentOrThrow())
        ) {
          event.preventDefault();
          return true;
        }
        return $handleShiftLines(KEY_ARROW_DOWN_COMMAND, event);
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      MOVE_TO_START,
      (event) => $handleMoveTo(MOVE_TO_START, event),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      MOVE_TO_END,
      (event) => $handleMoveTo(MOVE_TO_END, event),
      COMMAND_PRIORITY_LOW,
    ),
  );

  return mergeRegister(...registrations);
}
