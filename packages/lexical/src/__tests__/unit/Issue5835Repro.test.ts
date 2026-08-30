/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$createCodeNode, CodeExtension} from '@lexical/code';
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  RichTextExtension,
} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $selectAll as selectAllUnprefixed,
  $setSlot,
  ElementNode,
  type LexicalEditor,
  type LexicalEditorWithDispose,
  type RangeSelection,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test} from 'vitest';

import {$createTestShadowRootNode, TestShadowRootNode} from '../utils';

const $selectAll = selectAllUnprefixed;

// A block that opts out of dissolving: `collapseAtStart` returning false is the
// ElementNode default, so this stands in for every third-party block node that
// never implemented it.
class StubbornNode extends ElementNode {
  $config() {
    return this.config('issue5835_stubborn', {extends: ElementNode});
  }
  createDOM(): HTMLElement {
    return document.createElement('aside');
  }
  updateDOM(): false {
    return false;
  }
  collapseAtStart(): false {
    return false;
  }
}

// A slot host: its `title` slot holds content that lives outside the regular
// child list, so the host is not an empty wrapper even when its one child is.
class HostNode extends ElementNode {
  $config() {
    return this.config('issue5835_host', {
      extends: ElementNode,
      slots: ['title'],
    });
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): false {
    return false;
  }
}

const ext = defineExtension({
  dependencies: [RichTextExtension, ListExtension, CodeExtension],
  name: '[5835]',
  nodes: [StubbornNode, HostNode, TestShadowRootNode],
});

/**
 * An editor attached to a root element: `deleteLine` reaches the native
 * selection to find the line boundary, so it needs a window to resolve.
 */
function createEditor(): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions(ext);
  const container = document.createElement('div');
  document.body.appendChild(container);
  editor.setRootElement(container);
  onTestFinished(() => {
    editor.setRootElement(null);
    container.remove();
  });
  return editor;
}

type Gesture = 'deleteCharacter' | 'deleteWord' | 'deleteLine';

function $applyGesture(
  selection: RangeSelection,
  gesture: Gesture,
  isBackward: boolean,
): void {
  selection[gesture](isBackward);
}

/** Select the whole document, then run one delete gesture over it. */
function selectAllAndDelete(
  editor: LexicalEditor,
  gesture: Gesture,
  isBackward: boolean,
): void {
  editor.update(
    () => {
      const selection = $selectAll();
      $applyGesture(selection, gesture, isBackward);
    },
    {discrete: true},
  );
}

/** The root's children, as `type` strings — enough to see what survived. */
function readRootTypes(editor: LexicalEditor): string[] {
  return editor.read(() =>
    $getRoot()
      .getChildren()
      .map(node => node.getType()),
  );
}

// `deleteLine` is not in this list: on a selection that spans more than one
// block it collapses to the anchor and deletes a single character instead of
// the range, so it never empties a multi-block document. Its single-block
// behaviour -- the Cmd+Backspace case this fix is about -- is covered below.
const GESTURES: Gesture[] = ['deleteCharacter', 'deleteWord'];
const DIRECTIONS = [true, false];

// Selecting the whole document and deleting it should leave the editor in the
// same state as an empty editor: a single empty paragraph. Before the fix only
// a backwards `deleteCharacter` did that, and only for a heading or quote --
// forward delete, lists, and the word/line gestures left the last block behind
// as an empty heading/quote/list that kept its type.
describe('select-all + delete collapses to an empty paragraph (#5835)', () => {
  describe.for(GESTURES)('%s', gesture => {
    describe.for(DIRECTIONS)('isBackward: %s', isBackward => {
      test('heading as the only block', () => {
        using editor = createEditor();
        editor.update(
          () => {
            $getRoot()
              .clear()
              .append($createHeadingNode('h1').append($createTextNode('hi')));
          },
          {discrete: true},
        );

        selectAllAndDelete(editor, gesture, isBackward);

        expect(readRootTypes(editor)).toEqual(['paragraph']);
        editor.read(() => {
          expect($getRoot().getAllTextNodes()).toEqual([]);
        });
      });

      test('quote as the only block', () => {
        using editor = createEditor();
        editor.update(
          () => {
            $getRoot()
              .clear()
              .append($createQuoteNode().append($createTextNode('hi')));
          },
          {discrete: true},
        );

        selectAllAndDelete(editor, gesture, isBackward);

        expect(readRootTypes(editor)).toEqual(['paragraph']);
      });

      test('list followed by a paragraph', () => {
        using editor = createEditor();
        editor.update(
          () => {
            $getRoot()
              .clear()
              .append(
                $createListNode('bullet').append(
                  $createListItemNode().append($createTextNode('one')),
                  $createListItemNode().append($createTextNode('two')),
                ),
                $createParagraphNode().append($createTextNode('after')),
              );
          },
          {discrete: true},
        );

        selectAllAndDelete(editor, gesture, isBackward);

        expect(readRootTypes(editor)).toEqual(['paragraph']);
        editor.read(() => {
          expect($getRoot().getAllTextNodes()).toEqual([]);
        });
      });

      test('nested list', () => {
        using editor = createEditor();
        editor.update(
          () => {
            $getRoot()
              .clear()
              .append(
                $createListNode('bullet').append(
                  $createListItemNode().append($createTextNode('one')),
                  $createListItemNode().append(
                    $createListNode('bullet').append(
                      $createListItemNode().append($createTextNode('two')),
                    ),
                  ),
                ),
              );
          },
          {discrete: true},
        );

        selectAllAndDelete(editor, gesture, isBackward);

        expect(readRootTypes(editor)).toEqual(['paragraph']);
        editor.read(() => {
          expect($getRoot().getAllTextNodes()).toEqual([]);
        });
      });

      test('paragraph as the first block is left as a paragraph', () => {
        using editor = createEditor();
        editor.update(
          () => {
            $getRoot()
              .clear()
              .append(
                $createParagraphNode().append($createTextNode('hi')),
                $createHeadingNode('h1').append($createTextNode('there')),
              );
          },
          {discrete: true},
        );

        selectAllAndDelete(editor, gesture, isBackward);

        expect(readRootTypes(editor)).toEqual(['paragraph']);
      });
    });
  });

  // Cmd+Backspace over a lone block: `deleteLine` reaches `removeText` for a
  // selection inside a single block, which is the path that used to leave the
  // emptied heading/quote behind.
  describe.for(DIRECTIONS)('deleteLine (isBackward: %s)', isBackward => {
    test('heading as the only block', () => {
      using editor = createEditor();
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createHeadingNode('h1').append($createTextNode('hi')));
        },
        {discrete: true},
      );

      selectAllAndDelete(editor, 'deleteLine', isBackward);

      expect(readRootTypes(editor)).toEqual(['paragraph']);
    });

    test('quote as the only block', () => {
      using editor = createEditor();
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createQuoteNode().append($createTextNode('hi')));
        },
        {discrete: true},
      );

      selectAllAndDelete(editor, 'deleteLine', isBackward);

      expect(readRootTypes(editor)).toEqual(['paragraph']);
    });
  });

  // The collapse is delegated to each block type's own `collapseAtStart`, which
  // is where a node says how -- and whether -- it dissolves.
  describe('respects the collapseAtStart extension point', () => {
    test('a code block opts in, so it collapses', () => {
      using editor = createEditor();
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createCodeNode().append($createTextNode('const x = 1;')));
        },
        {discrete: true},
      );

      selectAllAndDelete(editor, 'deleteCharacter', false);

      expect(readRootTypes(editor)).toEqual(['paragraph']);
    });

    test('a block returning false from collapseAtStart keeps its type', () => {
      using editor = createEditor();
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append(new StubbornNode().append($createTextNode('note')));
        },
        {discrete: true},
      );

      selectAllAndDelete(editor, 'deleteCharacter', false);

      expect(readRootTypes(editor)).toEqual(['issue5835_stubborn']);
    });
  });

  test('a slot host still holding slot content is not dissolved', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const host = new HostNode();
        host.append($createHeadingNode('h1').append($createTextNode('body')));
        $getRoot().clear().append(host);
        $setSlot(
          host,
          'title',
          $createTestShadowRootNode().append(
            $createParagraphNode().append($createTextNode('title')),
          ),
        );
      },
      {discrete: true},
    );

    selectAllAndDelete(editor, 'deleteCharacter', false);

    // The host survives with its slot content: the document was never empty.
    expect(readRootTypes(editor)).toEqual(['issue5835_host']);
    editor.read(() => {
      expect($getRoot().getTextContent()).toContain('title');
    });
  });

  test('a partial delete that only empties the first block is unaffected', () => {
    using editor = createEditor();
    editor.update(
      () => {
        const heading = $createHeadingNode('h1').append($createTextNode('abc'));
        $getRoot()
          .clear()
          .append(
            heading,
            $createParagraphNode().append($createTextNode('def')),
          );
        // Select only the heading's own text, not the whole document. Forward
        // delete: a backwards delete of an emptied first block is separately
        // collapsed by the pre-existing $collapseAtStart path, which is not
        // what this test is guarding.
        const text = heading.getFirstChildOrThrow();
        assert($isTextNode(text), 'Expected a TextNode');
        text.select(0, 3);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.deleteCharacter(false);
      },
      {discrete: true},
    );

    // The heading keeps its type; it is not converted to a paragraph.
    expect(readRootTypes(editor)).toEqual(['heading', 'paragraph']);
    editor.read(() => {
      expect($getRoot().getLastChildOrThrow().getTextContent()).toBe('def');
    });
  });

  test('replacing all text in a lone non-paragraph block keeps its type', () => {
    // Guards the Prettier "format" regression: selecting all of a lone block's
    // content and inserting (a replace, which routes through removeText) must
    // keep the block, not collapse it to a paragraph.
    using editor = createEditor();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createHeadingNode('h1').append($createTextNode('hi')));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $selectAll();
        selection.insertText('there');
      },
      {discrete: true},
    );

    expect(readRootTypes(editor)).toEqual(['heading']);
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('there');
      expect($isParagraphNode($getRoot().getFirstChild())).toBe(false);
    });
  });
});
