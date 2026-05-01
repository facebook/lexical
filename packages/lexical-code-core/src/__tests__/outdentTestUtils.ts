/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CodeHighlightNode} from '../CodeHighlightNode';
import type {CodeNode} from '../CodeNode';
import type {LexicalEditor, LineBreakNode, TabNode} from 'lexical';

import {
  $caretRangeFromSelection,
  $createRangeSelection,
  $getCaretRangeInDirection,
  $getRoot,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $setSelectionFromCaretRange,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';

import {$createCodeNode} from '../CodeNode';

/**
 * Shared test helper for the OUTDENT_CONTENT_COMMAND space-stripping
 * behavior in `@lexical/code-shiki` and `@lexical/code-prism`.
 *
 * Sets up a single CodeNode containing `rawText`, places a collapsed
 * cursor at `cursorOffset`, dispatches OUTDENT, and reads back the
 * resulting text and cursor offset (relative to the code node).
 *
 * Each highlighter test passes its own `register` callback so it can
 * call its own `registerCodeHighlighting(editor, ..., tabSize)` and any
 * async language/theme loading the highlighter requires.
 */
export async function $runOutdentScenario(
  editor: LexicalEditor,
  register: () => void | Promise<void>,
  rawText: string,
  cursorOffset: number,
): Promise<{cursor: number; text: string}> {
  await register();

  let codeNode: CodeNode;
  await editor.update(() => {
    const root = $getRoot();
    codeNode = $createCodeNode();
    root.append(codeNode);
    codeNode.selectStart();
    $getSelection()!.insertRawText(rawText);
  });

  await editor.update(() => {
    const selection = $createRangeSelection();
    let matching: null | LineBreakNode | TabNode | CodeHighlightNode =
      codeNode.getFirstChild();
    let offset = 0;
    let parentIndex = 0;
    while (
      matching !== null &&
      offset + matching.getTextContentSize() < cursorOffset
    ) {
      offset += matching.getTextContentSize();
      matching = matching.getNextSibling();
      parentIndex++;
    }
    if (matching === null) {
      selection.anchor.set(codeNode.getKey(), 0, 'element');
      selection.focus.set(codeNode.getKey(), 0, 'element');
    } else if (!$isLineBreakNode(matching)) {
      selection.anchor.set(matching.getKey(), cursorOffset - offset, 'text');
      selection.focus.set(matching.getKey(), cursorOffset - offset, 'text');
    } else {
      selection.anchor.set(codeNode.getKey(), parentIndex, 'element');
      selection.focus.set(codeNode.getKey(), parentIndex, 'element');
    }
    $setSelectionFromCaretRange(
      $getCaretRangeInDirection($caretRangeFromSelection(selection), 'next'),
    );
    editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
  });

  let text = '';
  let cursor = 0;
  editor.read(() => {
    text = codeNode.getTextContent();
    const sel = $getSelection();
    if (!$isRangeSelection(sel)) {
      return;
    }
    let runOffset = 0;
    let node: null | LineBreakNode | TabNode | CodeHighlightNode =
      codeNode.getFirstChild();
    while (node !== null) {
      if (sel.focus.key === node.getKey()) {
        cursor = runOffset + sel.focus.offset;
        return;
      }
      runOffset += node.getTextContentSize();
      node = node.getNextSibling();
    }
  });
  return {cursor, text};
}

/**
 * Shared `test.for` row shape and standard test cases for the
 * OUTDENT_CONTENT_COMMAND space-stripping behavior. Used by both the
 * Shiki and Prism unit test suites.
 */
export interface OutdentScenario {
  name: string;
  rawText: string;
  cursorOffset: number;
  tabSize: number | undefined;
  expectedText: string;
  expectedCursor?: number;
}

export const OUTDENT_SCENARIOS: OutdentScenario[] = [
  {
    cursorOffset: 2,
    expectedText: 'hello',
    name: 'tabSize=2 strips two leading spaces',
    rawText: '  hello',
    tabSize: 2,
  },
  {
    cursorOffset: 4,
    expectedCursor: 2,
    expectedText: '  hello',
    name: 'tabSize=2 strips one indent level from four leading spaces',
    rawText: '    hello',
    tabSize: 2,
  },
  {
    cursorOffset: 1,
    expectedText: 'hello',
    name: 'tabSize=2 best-effort: line with one leading space is fully stripped',
    rawText: ' hello',
    tabSize: 2,
  },
  {
    cursorOffset: 4,
    expectedText: 'hello',
    name: 'tabSize=4 strips four leading spaces',
    rawText: '    hello',
    tabSize: 4,
  },
  {
    cursorOffset: 2,
    expectedText: 'hello',
    name: 'tabSize=4 best-effort: two leading spaces are fully stripped',
    rawText: '  hello',
    tabSize: 4,
  },
  {
    cursorOffset: 0,
    expectedText: 'hello',
    name: 'no-op when line has no leading whitespace',
    rawText: 'hello',
    tabSize: 2,
  },
  {
    cursorOffset: 1,
    expectedText: '  hello',
    name: 'TabNode at the start takes precedence over space stripping',
    rawText: '\t  hello',
    tabSize: 2,
  },
  {
    cursorOffset: 2,
    expectedText: '  hello',
    name: 'tabSize=undefined preserves existing TabNode-only behavior',
    rawText: '  hello',
    tabSize: undefined,
  },
  {
    cursorOffset: 4,
    expectedText: '    hello',
    name: 'tabSize=0 is rejected by the guard (non-positive)',
    rawText: '    hello',
    tabSize: 0,
  },
  {
    cursorOffset: 4,
    expectedText: '    hello',
    name: 'tabSize=2.5 is rejected by the guard (non-integer)',
    rawText: '    hello',
    tabSize: 2.5,
  },
];
