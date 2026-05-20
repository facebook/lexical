/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createCodeHighlightNode,
  $createCodeNode,
  $isCodeNode,
} from '@lexical/code';
import {$exitCodeNodeOnEnter} from '@lexical/code-core';
import {
  $createCodeLineNode,
  $isCodeLineNode,
  CodeShikiExtension,
} from '@lexical/code-shiki';
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  configExtension,
  KEY_ENTER_COMMAND,
  type LexicalNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $flattenLineNodeIfDetached,
  $groupChildrenIntoLineNodes,
  $updateAndRetainSelection,
} from '../../CodeHighlighterShiki';

describe('CodeLineNode transforms', () => {
  test('grouping: flat CodeNode children re-group into CodeLineNodes', () => {
    using editor = buildEditorFromExtensions(
      configExtension(CodeShikiExtension, {
        disabled: true,
        enableLineNodes: true,
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    editor.update(
      () => {
        const code = $createCodeNode();
        code.append(
          $createTextNode('a'),
          $createLineBreakNode(),
          $createTextNode('b'),
          $createLineBreakNode(),
          $createTextNode('c'),
        );
        $getRoot().clear().append(code);
        $groupChildrenIntoLineNodes(code);
      },
      {discrete: true},
    );

    const shape = editor.read(() => {
      const code = $getRoot().getFirstChildOrThrow();
      if (!$isCodeNode(code)) {
        return [];
      }
      return code.getChildren().map(c => ({
        children: $isCodeLineNode(c)
          ? c.getChildren().map(g => g.getTextContent())
          : [],
        type: c.getType(),
      }));
    });

    expect(shape.map(c => c.type)).toEqual([
      'code-line',
      'code-line',
      'code-line',
    ]);
    expect(shape.map(c => c.children)).toEqual([['a'], ['b'], ['c']]);
  });

  test('grouping is idempotent: re-running on already-grouped CodeNode is a no-op', () => {
    using editor = buildEditorFromExtensions(
      configExtension(CodeShikiExtension, {
        disabled: true,
        enableLineNodes: true,
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    let firstShape: string[] = [];
    let firstLineKeys: string[] = [];
    editor.update(
      () => {
        const code = $createCodeNode();
        code.append(
          $createCodeLineNode().append($createTextNode('a')),
          $createCodeLineNode().append($createTextNode('b')),
        );
        $getRoot().clear().append(code);
        $groupChildrenIntoLineNodes(code);
        firstShape = code.getChildren().map(c => c.getType());
        firstLineKeys = code.getChildren().map(c => c.getKey());
      },
      {discrete: true},
    );

    expect(firstShape).toEqual(['code-line', 'code-line']);
    // Idempotency: keys must survive (no clear+append rebuild) so
    // selection on an unchanged line stays valid.
    editor.update(
      () => {
        const code = $getRoot().getFirstChildOrThrow();
        if (!$isCodeNode(code)) {
          return;
        }
        $groupChildrenIntoLineNodes(code);
        const stillThereKeys = code.getChildren().map(c => c.getKey());
        expect(stillThereKeys).toEqual(firstLineKeys);
      },
      {discrete: true},
    );
  });

  test('grouping handles trailing LineBreakNode → empty trailing CodeLineNode', () => {
    using editor = buildEditorFromExtensions(
      configExtension(CodeShikiExtension, {
        disabled: true,
        enableLineNodes: true,
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    editor.update(
      () => {
        const code = $createCodeNode();
        code.append($createTextNode('a'), $createLineBreakNode());
        $getRoot().clear().append(code);
        $groupChildrenIntoLineNodes(code);
      },
      {discrete: true},
    );

    const shape = editor.read(() => {
      const code = $getRoot().getFirstChildOrThrow();
      if (!$isCodeNode(code)) {
        return [];
      }
      return code.getChildren().map(c => ({
        empty: $isCodeLineNode(c) ? c.getChildrenSize() === 0 : false,
        type: c.getType(),
      }));
    });
    expect(shape).toEqual([
      {empty: false, type: 'code-line'},
      {empty: true, type: 'code-line'},
    ]);
  });

  test('ungrouping (forward order): each adjacent CodeLineNode pair is separated by exactly one LineBreakNode', () => {
    runUngroupOrderTest(['forward']);
  });

  test('ungrouping (reverse order): each adjacent CodeLineNode pair is separated by exactly one LineBreakNode', () => {
    runUngroupOrderTest(['reverse']);
  });

  test('grouped-mode cursor retention: cursor after a within-line LineBreakNode lands at start of the new line after a splice splits the line', () => {
    using editor = buildEditorFromExtensions(
      configExtension(CodeShikiExtension, {
        disabled: true,
        enableLineNodes: true,
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    let codeKey = '';
    editor.update(
      () => {
        // Pre-splice state: one CodeLineNode with a within-line LB
        // (Shift+Enter happened in the middle of "ab|c", the LB now
        // sits between "ab" and "c" inside the same line).
        const code = $createCodeNode();
        const line = $createCodeLineNode();
        const chnAb = $createCodeHighlightNode('ab');
        const lb = $createLineBreakNode();
        const chnC = $createCodeHighlightNode('c');
        line.append(chnAb, lb, chnC);
        code.append(line);
        $getRoot().clear().append(code);
        codeKey = code.getKey();
        // Place caret at the start of "c" — i.e. right after the LB.
        chnC.select(0, 0);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        // Simulate what `$codeNodeTransform` would do in grouped mode:
        // wrap the tokenizer's flat output (which now sees two lines
        // because of the within-line `\n`) into two CodeLineNodes and
        // splice them into the CodeNode.
        $updateAndRetainSelection(codeKey, true, () => {
          const code = $getRoot().getFirstChildOrThrow();
          if (!$isCodeNode(code)) {
            return false;
          }
          const newLine0 = $createCodeLineNode().append(
            $createCodeHighlightNode('ab'),
          );
          const newLine1 = $createCodeLineNode().append(
            $createCodeHighlightNode('c'),
          );
          code.splice(0, 1, [newLine0, newLine1]);
          return true;
        });
      },
      {discrete: true},
    );

    const cursor = editor.read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return null;
      }
      const code = $getRoot().getFirstChildOrThrow();
      const lines = $isCodeNode(code) ? code.getChildren() : [];
      const node = selection.anchor.getNode();
      // Report the lineIndex (which CodeLineNode contains the anchor)
      // and the anchor's text-offset / type for assertion.
      const containingLine = $isCodeLineNode(node)
        ? node
        : node.getParents().find($isCodeLineNode);
      const lineIndex = containingLine
        ? lines.findIndex(l => l.is(containingLine))
        : -1;
      return {
        anchorText: node.getTextContent(),
        anchorType: selection.anchor.type,
        lineIndex,
        offset: selection.anchor.offset,
      };
    });

    // Expected: caret at start of "c" — the second line after the
    // splice. The line-index restoration must follow the split, not
    // stay at the original (pre-splice) line index 0.
    expect(cursor).toMatchObject({
      anchorText: 'c',
      lineIndex: 1,
      offset: 0,
    });
  });

  test('$exitCodeNodeOnEnter in grouped mode: two empty trailing CodeLineNodes get stripped and a paragraph is created after the CodeNode', () => {
    using editor = buildEditorFromExtensions(
      configExtension(CodeShikiExtension, {
        disabled: true,
        enableLineNodes: true,
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    let exitResultType: string | null = null;
    editor.update(
      () => {
        const code = $createCodeNode();
        code.append(
          $createCodeLineNode().append($createTextNode('a')),
          $createCodeLineNode(),
          $createCodeLineNode(),
        );
        $getRoot().clear().append(code);
        const lastLine = code.getLastChildOrThrow();
        if ($isCodeLineNode(lastLine)) {
          lastLine.select(0, 0);
        }
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const result = $exitCodeNodeOnEnter(selection);
          exitResultType = result ? result.getType() : null;
        }
      },
      {discrete: true},
    );

    expect(exitResultType).toBe('paragraph');

    const shape = editor.read(() => {
      return $getRoot()
        .getChildren()
        .map(c => ({
          childrenTypes: $isElementNode(c)
            ? c.getChildren().map(x => x.getType())
            : [],
          type: c.getType(),
        }));
    });

    expect(shape).toEqual([
      {childrenTypes: ['code-line'], type: 'code'},
      {childrenTypes: [], type: 'paragraph'},
    ]);
  });

  test('CodeLineNode.insertNewAfter preserves leading-space indent on the new line and lands the caret after the indent', () => {
    using editor = buildEditorFromExtensions(
      configExtension(CodeShikiExtension, {
        disabled: true,
        enableLineNodes: true,
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    editor.update(
      () => {
        const code = $createCodeNode();
        const line = $createCodeLineNode().append(
          $createCodeHighlightNode('  hello'),
        );
        code.append(line);
        $getRoot().clear().append(code);
        const text = line.getFirstChildOrThrow();
        if (!$isTextNode(text)) {
          return;
        }
        // Caret right after "  hello" — at offset 7.
        text.select(7, 7);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          line.insertNewAfter(selection, false);
        }
      },
      {discrete: true},
    );

    const shape = editor.read(() => {
      const code = $getRoot().getFirstChildOrThrow();
      if (!$isCodeNode(code)) {
        return null;
      }
      const lines = code.getChildren().map(l =>
        $isCodeLineNode(l)
          ? {
              children: l
                .getChildren()
                .map(c => ({text: c.getTextContent(), type: c.getType()})),
              type: l.getType(),
            }
          : {children: [], type: l.getType()},
      );
      const selection = $getSelection();
      const cursor =
        $isRangeSelection(selection) && selection.isCollapsed()
          ? {
              anchorType: selection.anchor.type,
              key: selection.anchor.key,
              offset: selection.anchor.offset,
            }
          : null;
      return {cursor, lines};
    });

    expect(shape?.lines.map(l => l.type)).toEqual(['code-line', 'code-line']);
    // Line 0 keeps "  hello".
    expect(shape?.lines[0].children.map(c => c.text)).toEqual(['  hello']);
    // Line 1 has only the cloned 2-space indent (no trailing content
    // since the caret was at the end of line 0).
    expect(shape?.lines[1].children.map(c => c.text)).toEqual(['  ']);
    // Caret lands on the new line's element point at offset 1 (after
    // the indent token).
    expect(shape?.cursor?.anchorType).toBe('element');
    expect(shape?.cursor?.offset).toBe(1);
  });

  test('CodeLineNode.insertNewAfter with caret mid-line moves trailing children to the new line after the indent', () => {
    using editor = buildEditorFromExtensions(
      configExtension(CodeShikiExtension, {
        disabled: true,
        enableLineNodes: true,
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    editor.update(
      () => {
        const code = $createCodeNode();
        const line = $createCodeLineNode().append(
          $createCodeHighlightNode('  abcdef'),
        );
        code.append(line);
        $getRoot().clear().append(code);
        const text = line.getFirstChildOrThrow();
        if (!$isTextNode(text)) {
          return;
        }
        // Caret right after "abc" (offset 5 = 2 spaces + "abc").
        text.select(5, 5);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          line.insertNewAfter(selection, false);
        }
      },
      {discrete: true},
    );

    const lines = editor.read(() => {
      const code = $getRoot().getFirstChildOrThrow();
      if (!$isCodeNode(code)) {
        return [];
      }
      return code
        .getChildren()
        .map(l => ($isCodeLineNode(l) ? l.getTextContent() : ''));
    });

    expect(lines).toEqual(['  abc', '  def']);
  });

  test('CodeLineNode.insertNewAfter at offset 0 on an unindented line moves all children to the new line, leaving the original empty', () => {
    using editor = buildEditorFromExtensions(
      configExtension(CodeShikiExtension, {
        disabled: true,
        enableLineNodes: true,
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    editor.update(
      () => {
        const code = $createCodeNode();
        const line = $createCodeLineNode().append(
          $createCodeHighlightNode('hello'),
        );
        code.append(line);
        $getRoot().clear().append(code);
        const text = line.getFirstChildOrThrow();
        if (!$isTextNode(text)) {
          return;
        }
        text.select(0, 0);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          line.insertNewAfter(selection, false);
        }
      },
      {discrete: true},
    );

    const lines = editor.read(() => {
      const code = $getRoot().getFirstChildOrThrow();
      if (!$isCodeNode(code)) {
        return [];
      }
      return code
        .getChildren()
        .map(l => ($isCodeLineNode(l) ? l.getTextContent() : ''));
    });

    expect(lines).toEqual(['', 'hello']);
  });

  test('CodeLineNode.insertNewAfter on an empty CodeLineNode yields a second empty line and caret at the new line start', () => {
    using editor = buildEditorFromExtensions(
      configExtension(CodeShikiExtension, {
        disabled: true,
        enableLineNodes: true,
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    editor.update(
      () => {
        const code = $createCodeNode();
        const line = $createCodeLineNode();
        code.append(line);
        $getRoot().clear().append(code);
        line.select(0, 0);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          line.insertNewAfter(selection, false);
        }
      },
      {discrete: true},
    );

    const shape = editor.read(() => {
      const code = $getRoot().getFirstChildOrThrow();
      if (!$isCodeNode(code)) {
        return null;
      }
      const lines = code
        .getChildren()
        .map(l => ($isCodeLineNode(l) ? l.getChildrenSize() : -1));
      const selection = $getSelection();
      const cursor =
        $isRangeSelection(selection) && selection.isCollapsed()
          ? {
              anchorType: selection.anchor.type,
              offset: selection.anchor.offset,
            }
          : null;
      return {cursor, lines};
    });

    expect(shape?.lines).toEqual([0, 0]);
    expect(shape?.cursor).toMatchObject({anchorType: 'element', offset: 0});
  });

  test('KEY_ENTER_COMMAND through CodeShikiExtension stack splits a CodeLineNode and lands the caret on the new line', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          const code = $createCodeNode();
          code.append(
            $createCodeLineNode().append($createCodeHighlightNode('hello')),
          );
          $getRoot().clear().append(code);
        },
        dependencies: [
          configExtension(CodeShikiExtension, {
            disabled: true,
            enableLineNodes: true,
          }),
          RichTextExtension,
        ],
        name: '[ke-grouped]',
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    editor.update(
      () => {
        const code = $getRoot().getFirstChildOrThrow();
        if (!$isCodeNode(code)) {
          return;
        }
        const line = code.getFirstChildOrThrow();
        if (!$isCodeLineNode(line)) {
          return;
        }
        const text = line.getFirstChildOrThrow();
        if (!$isTextNode(text)) {
          return;
        }
        text.select(text.getTextContentSize(), text.getTextContentSize());
      },
      {discrete: true},
    );

    const enterHandled = editor.dispatchCommand(
      KEY_ENTER_COMMAND,
      new KeyboardEvent('keydown', {key: 'Enter'}),
    );
    expect(enterHandled).toBe(true);

    editor.update(
      () => {
        const code = $getRoot().getFirstChildOrThrow();
        if (!$isCodeNode(code)) {
          return;
        }
        const lines = code
          .getChildren()
          .map(l => ($isCodeLineNode(l) ? l.getTextContent() : ''));
        expect(lines).toEqual(['hello', '']);
      },
      {discrete: true},
    );
  });

  test('KEY_ENTER_COMMAND on the last of two trailing empty CodeLineNodes exits the code block through the grouped $exitCodeNodeOnEnter path', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          const code = $createCodeNode();
          code.append(
            $createCodeLineNode().append($createCodeHighlightNode('a')),
            $createCodeLineNode(),
            $createCodeLineNode(),
          );
          $getRoot().clear().append(code);
        },
        dependencies: [
          configExtension(CodeShikiExtension, {
            disabled: true,
            enableLineNodes: true,
          }),
          RichTextExtension,
        ],
        name: '[ke-grouped-exit]',
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    editor.update(
      () => {
        const code = $getRoot().getFirstChildOrThrow();
        if (!$isCodeNode(code)) {
          return;
        }
        const lastLine = code.getLastChildOrThrow();
        if ($isCodeLineNode(lastLine)) {
          lastLine.select(0, 0);
        }
      },
      {discrete: true},
    );

    const enterHandled = editor.dispatchCommand(
      KEY_ENTER_COMMAND,
      new KeyboardEvent('keydown', {key: 'Enter'}),
    );
    expect(enterHandled).toBe(true);

    editor.update(
      () => {
        const shape = $getRoot()
          .getChildren()
          .map(c => c.getType());
        expect(shape).toEqual(['code', 'paragraph']);
      },
      {discrete: true},
    );
  });

  test('$exitCodeNodeOnEnter in grouped mode does NOT exit when only one trailing empty CodeLineNode exists', () => {
    using editor = buildEditorFromExtensions(
      configExtension(CodeShikiExtension, {
        disabled: true,
        enableLineNodes: true,
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);

    let exitResult: unknown = null;
    editor.update(
      () => {
        const code = $createCodeNode();
        code.append(
          $createCodeLineNode().append($createTextNode('a')),
          $createCodeLineNode(),
        );
        $getRoot().clear().append(code);
        const lastLine = code.getLastChildOrThrow();
        if ($isCodeLineNode(lastLine)) {
          lastLine.select(0, 0);
        }
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          exitResult = $exitCodeNodeOnEnter(selection);
        }
      },
      {discrete: true},
    );

    expect(exitResult).toBeNull();
    const rootChildrenCount = editor
      .getEditorState()
      .read(() => $getRoot().getChildrenSize());
    expect(rootChildrenCount).toBe(1);
  });
});

function runUngroupOrderTest(orderTag: ['forward' | 'reverse']) {
  using editor = buildEditorFromExtensions(
    configExtension(CodeShikiExtension, {
      disabled: true,
      enableLineNodes: true,
    }),
  );
  const root = document.createElement('div');
  editor.setRootElement(root);

  let lineKeys: string[] = [];
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      const lines = [
        $createCodeLineNode().append($createTextNode('one')),
        $createCodeLineNode().append($createTextNode('two')),
        $createCodeLineNode().append($createTextNode('three')),
      ];
      paragraph.append(...lines);
      $getRoot().clear().append(paragraph);
      lineKeys = lines.map(l => l.getKey());
    },
    {discrete: true},
  );

  editor.update(
    () => {
      // Apply the ungrouping transform in the requested order, since
      // lexical's transform dispatch order is dirty-set order and we
      // need to verify both directions land correctly.
      const orderedKeys =
        orderTag[0] === 'reverse' ? [...lineKeys].reverse() : lineKeys;
      for (const key of orderedKeys) {
        const node = editor.getEditorState()._nodeMap.get(key) as
          | undefined
          | LexicalNode;
        if (node && $isCodeLineNode(node)) {
          $flattenLineNodeIfDetached(node);
        }
      }
    },
    {discrete: true},
  );

  const finalShape = editor.read(() => {
    const paragraph = $getRoot().getFirstChildOrThrow();
    return ($isElementNode(paragraph) ? paragraph.getChildren() : []).map(
      (node: LexicalNode) => ({
        text: node.getTextContent(),
        type: node.getType(),
      }),
    );
  });

  expect(finalShape.map(c => c.type)).toEqual([
    'text',
    'linebreak',
    'text',
    'linebreak',
    'text',
  ]);
  expect(finalShape.map(c => c.text)).toEqual([
    'one',
    '\n',
    'two',
    '\n',
    'three',
  ]);
  // Sanity: 2 linebreaks between 3 lines.
  expect(finalShape.filter(c => c.type === 'linebreak').length).toBe(2);
}
