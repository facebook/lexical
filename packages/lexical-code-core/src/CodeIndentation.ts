/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CodeHighlightNode} from './CodeHighlightNode';
import type {
  BaseSelection,
  LexicalCommand,
  LexicalEditor,
  LineBreakNode,
  RangeSelection,
  TabNode,
} from 'lexical';

import {effect, namedSignals} from '@lexical/extension';
import {
  $createLineBreakNode,
  $createPoint,
  $createTabNode,
  $getCaretRange,
  $getCaretRangeInDirection,
  $getSelection,
  $getSiblingCaret,
  $getTextPointCaret,
  $insertNodes,
  $isLineBreakNode,
  $isRangeSelection,
  $isTabNode,
  $normalizeCaret,
  $setSelectionFromCaretRange,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  INDENT_CONTENT_COMMAND,
  INSERT_TAB_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
  MOVE_TO_END,
  MOVE_TO_START,
  OUTDENT_CONTENT_COMMAND,
  safeCast,
} from 'lexical';
import invariant from 'shared/invariant';

import {CodeExtension} from './CodeExtension';
import {$isCodeHighlightNode} from './CodeHighlightNode';
import {$isCodeNode} from './CodeNode';
import {
  $getCodeLineDirection,
  $getEndOfCodeInLine,
  $getFirstCodeNodeOfLine,
  $getLastCodeNodeOfLine,
  $getStartOfCodeInLine,
  $outdentLeadingSpaces,
} from './FlatStructureUtils';

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
): (CodeHighlightNode | TabNode)[][] {
  const nodes = selection.getNodes();
  const lines: (CodeHighlightNode | TabNode)[][] = [];
  if (nodes.length === 1 && $isCodeNode(nodes[0])) {
    return lines;
  }
  let lastLine: (CodeHighlightNode | TabNode)[] = [];
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

  const codeLine: (CodeHighlightNode | TabNode)[] = codeLines[0];
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

function $handleMultilineIndent(
  type: LexicalCommand<void>,
  tabSize?: number,
): boolean {
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
      } else if (tabSize !== undefined && $isCodeHighlightNode(firstOfLine)) {
        // Outdent space-indented lines (e.g. code formatted with prettier).
        $outdentLeadingSpaces(firstOfLine, tabSize, selection);
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
  range.forEach(node => node.remove());
  if (type === KEY_ARROW_UP_COMMAND) {
    range.forEach(node => insertionPoint.insertBefore(node));
    insertionPoint.insertBefore(linebreak);
  } else {
    insertionPoint.insertAfter(linebreak);
    insertionPoint = linebreak;
    range.forEach(node => {
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

  const focusLineNode = focusNode as CodeHighlightNode | TabNode;
  const direction = $getCodeLineDirection(focusLineNode);
  const moveToStart = direction === 'rtl' ? !isMoveToStart : isMoveToStart;

  if (moveToStart) {
    const start = $getStartOfCodeInLine(focusLineNode, focus.offset);
    if (start !== null) {
      const {node, offset} = start;
      if ($isLineBreakNode(node)) {
        node.selectNext(0, 0);
      } else {
        selection.setTextNodeRange(node, offset, node, offset);
      }
    } else {
      focusLineNode.getParentOrThrow().selectStart();
    }
  } else {
    const node = $getEndOfCodeInLine(focusLineNode);
    node.select();
  }

  event.preventDefault();
  event.stopPropagation();

  return true;
}

/**
 * @internal
 * Register the keyboard and command handlers that drive code-block
 * indentation: Tab / Shift+Tab, INDENT/OUTDENT_CONTENT_COMMAND,
 * INSERT_TAB_COMMAND, alt+arrow line shifting, and Home/End movement.
 *
 * Both `@lexical/code-shiki` and `@lexical/code-prism` use this via
 * {@link CodeIndentExtension}; callers using `registerCodeHighlighting`
 * will implicitly call this with tabSize of `undefined`.
 *
 * @param editor The editor to register on.
 * @param tabSize When set, OUTDENT_CONTENT_COMMAND (Shift+Tab) also strips
 *   up to that many leading spaces from a code line. See
 *   {@link $outdentLeadingSpaces}.
 */
export function registerCodeIndentation(
  editor: LexicalEditor,
  tabSize?: number,
): () => void {
  return mergeRegister(
    editor.registerCommand(
      KEY_TAB_COMMAND,
      event => {
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
      (): boolean => $handleMultilineIndent(INDENT_CONTENT_COMMAND),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      OUTDENT_CONTENT_COMMAND,
      (): boolean => $handleMultilineIndent(OUTDENT_CONTENT_COMMAND, tabSize),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      event => {
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
      event => {
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
      event => $handleMoveTo(MOVE_TO_START, event),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      MOVE_TO_END,
      event => $handleMoveTo(MOVE_TO_END, event),
      COMMAND_PRIORITY_LOW,
    ),
  );
}

export interface CodeIndentConfig {
  /**
   * When true, the indent commands are not registered on the editor.
   * This signal can be flipped at runtime to enable or disable indent
   * handling without rebuilding the editor.
   */
  disabled: boolean;
  /**
   * When set, treats that many leading spaces on a code line as one indent
   * level for the OUTDENT_CONTENT_COMMAND (Shift+Tab). See
   * {@link registerCodeIndentation}. When undefined (the default), only
   * TabNode removal is supported on outdent.
   *
   * Tab and INSERT_TAB_COMMAND continue to insert a TabNode regardless of
   * this option.
   */
  tabSize: number | undefined;
}

/**
 * Adds keyboard-driven indentation to code blocks (Tab / Shift+Tab,
 * alt+arrow line shifts, Home/End within a line). Both
 * {@link "@lexical/code-shiki".CodeShikiExtension} and
 * {@link "@lexical/code-prism".CodePrismExtension} declare this as a
 * dependency, so it is activated automatically alongside either
 * highlighter.
 *
 * Code blocks without syntax highlighting can use this extension on its
 * own.
 */
export const CodeIndentExtension = defineExtension({
  build: (editor, config) => namedSignals(config),
  config: safeCast<CodeIndentConfig>({
    disabled: false,
    tabSize: undefined,
  }),
  dependencies: [CodeExtension],
  name: '@lexical/code-indent',
  register: (editor, config, state) => {
    const stores = state.getOutput();
    return effect(() => {
      if (stores.disabled.value) {
        return;
      }
      return registerCodeIndentation(editor, stores.tabSize.value);
    });
  },
});
