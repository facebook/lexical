/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {
  $createTestDecoratorNode,
  $createTestShadowRootNode,
  TestDecoratorNode,
  TestShadowRootNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

function makeArrowEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
  });
}

function sel(editor: LexicalEditor) {
  return editor.read(() => {
    const s = $getSelection();
    if (!$isRangeSelection(s)) {
      return null;
    }
    return {
      anchorKey: s.anchor.key,
      anchorOffset: s.anchor.offset,
      anchorType: s.anchor.type,
      focusKey: s.focus.key,
      focusOffset: s.focus.offset,
      focusType: s.focus.type,
    };
  });
}

// Structure used across tests:
//   root
//     decorator (block)       — index 0
//     shadowRoot              — index 1
//       paragraph > text
//     decorator (block)       — index 2
function createDecoratorShadowRootEditor() {
  return buildEditorFromExtensions({
    $initialEditorState: () => {
      const decorator1 = $createTestDecoratorNode().setIsInline(false);
      const shadow = $createTestShadowRootNode();
      const paragraph = $createParagraphNode().append(
        $createTextNode('inside'),
      );
      shadow.append(paragraph);
      const decorator2 = $createTestDecoratorNode().setIsInline(false);
      $getRoot().clear().append(decorator1, shadow, decorator2);
    },
    dependencies: [RichTextExtension],
    name: 'test',
    nodes: [TestDecoratorNode, TestShadowRootNode],
  });
}

describe('$exitNodeSelectionToward — decorator → block cursor beside shadow root (#8736)', () => {
  test.for([
    {command: KEY_ARROW_DOWN_COMMAND, index: 0, key: 'ArrowDown', offset: 1},
    {command: KEY_ARROW_RIGHT_COMMAND, index: 0, key: 'ArrowRight', offset: 1},
    {command: KEY_ARROW_UP_COMMAND, index: 2, key: 'ArrowUp', offset: 2},
    {command: KEY_ARROW_LEFT_COMMAND, index: 2, key: 'ArrowLeft', offset: 2},
  ] as const)(
    '$key from decorator[$index] lands at block cursor (offset $offset)',
    ({key, command, index, offset}) => {
      using editor = createDecoratorShadowRootEditor();

      editor.update(
        () => {
          const decorator = $getRoot().getChildAtIndex(index)!;
          const ns = $createNodeSelection();
          ns.add(decorator.getKey());
          $setSelection(ns);
        },
        {discrete: true},
      );

      editor.dispatchCommand(command, makeArrowEvent(key));

      editor.read(() => {
        const s = $getSelection();
        assert($isRangeSelection(s));
        expect(s.isCollapsed()).toBe(true);
        expect(s.anchor.type).toBe('element');
        expect(s.anchor.key).toBe($getRoot().getKey());
        expect(s.anchor.offset).toBe(offset);
      });
    },
  );
});

describe('$tryEnterFromBlockCursor — block cursor → enter shadow root (#8736)', () => {
  test('ArrowRight from block cursor before shadow root enters at selectStart', () => {
    using editor = createDecoratorShadowRootEditor();

    // Place selection at root offset 1 (block cursor between decorator[0] and shadow root)
    editor.update(
      () => {
        $getRoot().select(1, 1);
      },
      {discrete: true},
    );

    editor.dispatchCommand(
      KEY_ARROW_RIGHT_COMMAND,
      makeArrowEvent('ArrowRight'),
    );

    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.isCollapsed()).toBe(true);
      // selectStart() resolves to the leaf text node
      const shadow = $getRoot().getChildAtIndex(1)!;
      assert($isElementNode(shadow));
      const paragraph = shadow.getFirstChild()!;
      assert($isElementNode(paragraph));
      const text = paragraph.getFirstChild()!;
      expect(s.anchor.key).toBe(text.getKey());
      expect(s.anchor.offset).toBe(0);
    });
  });

  test('ArrowDown from block cursor before shadow root enters at selectStart', () => {
    using editor = createDecoratorShadowRootEditor();

    editor.update(
      () => {
        $getRoot().select(1, 1);
      },
      {discrete: true},
    );

    editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, makeArrowEvent('ArrowDown'));

    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.isCollapsed()).toBe(true);
      const shadow = $getRoot().getChildAtIndex(1)!;
      assert($isElementNode(shadow));
      const paragraph = shadow.getFirstChild()!;
      assert($isElementNode(paragraph));
      const text = paragraph.getFirstChild()!;
      expect(s.anchor.key).toBe(text.getKey());
      expect(s.anchor.offset).toBe(0);
    });
  });

  test('ArrowUp from block cursor after shadow root enters at selectEnd', () => {
    using editor = createDecoratorShadowRootEditor();

    editor.update(
      () => {
        $getRoot().select(2, 2);
      },
      {discrete: true},
    );

    editor.dispatchCommand(KEY_ARROW_UP_COMMAND, makeArrowEvent('ArrowUp'));

    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.isCollapsed()).toBe(true);
      const shadow = $getRoot().getChildAtIndex(1)!;
      assert($isElementNode(shadow));
      const paragraph = shadow.getFirstChild()!;
      assert($isElementNode(paragraph));
      const text = paragraph.getFirstChild()!;
      expect(s.anchor.key).toBe(text.getKey());
      expect(s.anchor.offset).toBe(6); // "inside".length
    });
  });

  test('ArrowLeft from block cursor after shadow root enters at selectEnd', () => {
    using editor = createDecoratorShadowRootEditor();

    // Place selection at root offset 2 (block cursor between shadow root and decorator[2])
    editor.update(
      () => {
        $getRoot().select(2, 2);
      },
      {discrete: true},
    );

    editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, makeArrowEvent('ArrowLeft'));

    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.isCollapsed()).toBe(true);
      // selectEnd() resolves to the leaf text node at end offset
      const shadow = $getRoot().getChildAtIndex(1)!;
      assert($isElementNode(shadow));
      const paragraph = shadow.getFirstChild()!;
      assert($isElementNode(paragraph));
      const text = paragraph.getFirstChild()!;
      expect(s.anchor.key).toBe(text.getKey());
      expect(s.anchor.offset).toBe(6); // "inside".length
    });
  });
});

describe('$tryExitShadowRootToBlockCursor — shadow root → block cursor (#8736)', () => {
  test('ArrowLeft at start of shadow root exits to block cursor before it', () => {
    using editor = createDecoratorShadowRootEditor();

    editor.update(
      () => {
        const shadow = $getRoot().getChildAtIndex(1)!;
        assert($isElementNode(shadow));
        const paragraph = shadow.getFirstChild()!;
        assert($isElementNode(paragraph));
        paragraph.select(0, 0);
      },
      {discrete: true},
    );

    editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, makeArrowEvent('ArrowLeft'));

    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.isCollapsed()).toBe(true);
      expect(s.anchor.type).toBe('element');
      expect(s.anchor.key).toBe($getRoot().getKey());
      expect(s.anchor.offset).toBe(1);
    });
  });

  test('ArrowUp at start of shadow root exits to block cursor before it', () => {
    using editor = createDecoratorShadowRootEditor();

    editor.update(
      () => {
        const shadow = $getRoot().getChildAtIndex(1)!;
        assert($isElementNode(shadow));
        const paragraph = shadow.getFirstChild()!;
        assert($isElementNode(paragraph));
        paragraph.select(0, 0);
      },
      {discrete: true},
    );

    editor.dispatchCommand(KEY_ARROW_UP_COMMAND, makeArrowEvent('ArrowUp'));

    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.isCollapsed()).toBe(true);
      expect(s.anchor.type).toBe('element');
      expect(s.anchor.key).toBe($getRoot().getKey());
      expect(s.anchor.offset).toBe(1);
    });
  });

  test('ArrowDown at end of shadow root exits to block cursor after it', () => {
    using editor = createDecoratorShadowRootEditor();

    editor.update(
      () => {
        const shadow = $getRoot().getChildAtIndex(1)!;
        assert($isElementNode(shadow));
        const paragraph = shadow.getFirstChild()!;
        assert($isElementNode(paragraph));
        const text = paragraph.getFirstChild()!;
        assert($isTextNode(text));
        text.select(6, 6);
      },
      {discrete: true},
    );

    editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, makeArrowEvent('ArrowDown'));

    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.isCollapsed()).toBe(true);
      expect(s.anchor.type).toBe('element');
      expect(s.anchor.key).toBe($getRoot().getKey());
      expect(s.anchor.offset).toBe(2);
    });
  });

  test('ArrowRight at end of shadow root exits to block cursor after it', () => {
    using editor = createDecoratorShadowRootEditor();

    editor.update(
      () => {
        const shadow = $getRoot().getChildAtIndex(1)!;
        assert($isElementNode(shadow));
        const paragraph = shadow.getFirstChild()!;
        assert($isElementNode(paragraph));
        const text = paragraph.getFirstChild()!;
        assert($isTextNode(text));
        text.select(6, 6);
      },
      {discrete: true},
    );

    editor.dispatchCommand(
      KEY_ARROW_RIGHT_COMMAND,
      makeArrowEvent('ArrowRight'),
    );

    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.isCollapsed()).toBe(true);
      expect(s.anchor.type).toBe('element');
      expect(s.anchor.key).toBe($getRoot().getKey());
      expect(s.anchor.offset).toBe(2);
    });
  });
});

describe('nested shadow root exit (#8736)', () => {
  // Structure:
  //   root
  //     decorator (block)
  //     outerShadowRoot
  //       innerShadowRoot
  //         paragraph > text
  //     decorator (block)
  test('ArrowLeft at start of inner shadow root walks up and exits to block cursor', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator1 = $createTestDecoratorNode().setIsInline(false);
        const outer = $createTestShadowRootNode();
        const inner = $createTestShadowRootNode();
        const paragraph = $createParagraphNode().append(
          $createTextNode('nested'),
        );
        inner.append(paragraph);
        outer.append(inner);
        const decorator2 = $createTestDecoratorNode().setIsInline(false);
        $getRoot().clear().append(decorator1, outer, decorator2);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode, TestShadowRootNode],
    });

    editor.update(
      () => {
        const outer = $getRoot().getChildAtIndex(1)!;
        assert($isElementNode(outer));
        const inner = outer.getFirstChild()!;
        assert($isElementNode(inner));
        const paragraph = inner.getFirstChild()!;
        assert($isElementNode(paragraph));
        paragraph.select(0, 0);
      },
      {discrete: true},
    );

    editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, makeArrowEvent('ArrowLeft'));

    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.isCollapsed()).toBe(true);
      expect(s.anchor.type).toBe('element');
      expect(s.anchor.key).toBe($getRoot().getKey());
      expect(s.anchor.offset).toBe(1);
    });
  });

  test('ArrowRight at end of inner shadow root walks up and exits to block cursor', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator1 = $createTestDecoratorNode().setIsInline(false);
        const outer = $createTestShadowRootNode();
        const inner = $createTestShadowRootNode();
        const paragraph = $createParagraphNode().append(
          $createTextNode('nested'),
        );
        inner.append(paragraph);
        outer.append(inner);
        const decorator2 = $createTestDecoratorNode().setIsInline(false);
        $getRoot().clear().append(decorator1, outer, decorator2);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode, TestShadowRootNode],
    });

    editor.update(
      () => {
        const outer = $getRoot().getChildAtIndex(1)!;
        assert($isElementNode(outer));
        const inner = outer.getFirstChild()!;
        assert($isElementNode(inner));
        const paragraph = inner.getFirstChild()!;
        assert($isElementNode(paragraph));
        const text = paragraph.getFirstChild()!;
        assert($isTextNode(text));
        text.select(6, 6);
      },
      {discrete: true},
    );

    editor.dispatchCommand(
      KEY_ARROW_RIGHT_COMMAND,
      makeArrowEvent('ArrowRight'),
    );

    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.isCollapsed()).toBe(true);
      expect(s.anchor.type).toBe('element');
      expect(s.anchor.key).toBe($getRoot().getKey());
      expect(s.anchor.offset).toBe(2);
    });
  });
});

describe('no block cursor between sibling shadow roots inside a shadow root parent (#8736)', () => {
  // Structure (simulates layout-container > layout-items):
  //   root
  //     outerShadowRoot
  //       shadowRoot1 (paragraph > text)
  //       shadowRoot2 (paragraph > text)
  // ArrowLeft at start of shadowRoot2 should NOT exit to a block cursor
  // between the two shadow roots (their parent is also a shadow root).
  test('ArrowLeft at start of sibling shadow root does not produce block cursor', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const outer = $createTestShadowRootNode();
        const sr1 = $createTestShadowRootNode();
        sr1.append($createParagraphNode().append($createTextNode('col1')));
        const sr2 = $createTestShadowRootNode();
        sr2.append($createParagraphNode().append($createTextNode('col2')));
        outer.append(sr1, sr2);
        $getRoot().clear().append(outer);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode, TestShadowRootNode],
    });

    // Place cursor at start of sr2's paragraph
    editor.update(
      () => {
        const outer = $getRoot().getFirstChild()!;
        assert($isElementNode(outer));
        const sr2 = outer.getChildAtIndex(1)!;
        assert($isElementNode(sr2));
        const paragraph = sr2.getFirstChild()!;
        assert($isElementNode(paragraph));
        paragraph.select(0, 0);
      },
      {discrete: true},
    );

    editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, makeArrowEvent('ArrowLeft'));

    // $tryExitShadowRootToBlockCursor should NOT place a block cursor
    // on the outer shadow root (key = outer.getKey()). In jsdom, shadow
    // root containment is not enforced so $moveCharacter may move the
    // cursor elsewhere — the key assertion is that it doesn't land at
    // a block cursor position on the outer shadow root.
    const after = sel(editor);
    const outerKey = editor.read(() => $getRoot().getFirstChild()!.getKey());
    expect(after!.anchorKey).not.toBe(outerKey);
  });
});

describe('full round-trip: decorator → block cursor → shadow root → block cursor → decorator (#8736)', () => {
  test('ArrowRight traversal: decorator → enter shadow root → exit → reach next decorator', () => {
    using editor = createDecoratorShadowRootEditor();

    // Start: NodeSelection on decorator[0]
    editor.update(
      () => {
        const decorator = $getRoot().getChildAtIndex(0)!;
        const ns = $createNodeSelection();
        ns.add(decorator.getKey());
        $setSelection(ns);
      },
      {discrete: true},
    );

    // Step 1: ArrowRight → block cursor at root:1
    editor.dispatchCommand(
      KEY_ARROW_RIGHT_COMMAND,
      makeArrowEvent('ArrowRight'),
    );
    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.anchor.key).toBe($getRoot().getKey());
      expect(s.anchor.offset).toBe(1);
    });

    // Step 2: ArrowRight → enter shadow root (selectStart → text:0)
    editor.dispatchCommand(
      KEY_ARROW_RIGHT_COMMAND,
      makeArrowEvent('ArrowRight'),
    );
    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      const shadow = $getRoot().getChildAtIndex(1)!;
      assert($isElementNode(shadow));
      const paragraph = shadow.getFirstChild()!;
      assert($isElementNode(paragraph));
      const text = paragraph.getFirstChild()!;
      expect(s.anchor.key).toBe(text.getKey());
      expect(s.anchor.offset).toBe(0);
    });

    // Step 3: Place cursor at end of text (jsdom doesn't support
    // selection.modify so we set it directly)
    editor.update(
      () => {
        const shadow = $getRoot().getChildAtIndex(1)!;
        assert($isElementNode(shadow));
        const paragraph = shadow.getFirstChild()!;
        assert($isElementNode(paragraph));
        const text = paragraph.getFirstChild()!;
        assert($isTextNode(text));
        text.select(6, 6);
      },
      {discrete: true},
    );

    // Step 4: ArrowRight → exit shadow root → block cursor at root:2
    editor.dispatchCommand(
      KEY_ARROW_RIGHT_COMMAND,
      makeArrowEvent('ArrowRight'),
    );
    editor.read(() => {
      const s = $getSelection();
      assert($isRangeSelection(s));
      expect(s.anchor.key).toBe($getRoot().getKey());
      expect(s.anchor.offset).toBe(2);
    });
  });
});
