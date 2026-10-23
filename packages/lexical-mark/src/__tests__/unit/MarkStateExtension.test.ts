/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  DecoratorTextNode,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOMViaExtension,
  CoreImportExtension,
} from '@lexical/html';
import {$isLinkNode, $toggleLink, LinkExtension} from '@lexical/link';
import {
  $addMarkID,
  $createMarkNode,
  $getMarkIDsAtSelection,
  $getNodeMarkIDs,
  $migrateMarkNodesToMarkState,
  $removeMarkID,
  $wrapSelectionInMarkNode,
  DEFAULT_MARKABLE_NODES,
  MARK_STATE_IDS_ATTRIBUTE,
  type MarkableNodeMatch,
  MarkExtension,
  MarkNode,
  MarkStateExtension,
} from '@lexical/mark';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $addUpdateTag,
  $createLineBreakNode,
  $createNodeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $getSlot,
  $insertNodes,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  $setCompositionKey,
  $setSelection,
  $setSlot,
  COLLABORATION_TAG,
  COMPOSITION_START_COMMAND,
  configExtension,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  DecoratorNode,
  defineExtension,
  DELETE_CHARACTER_COMMAND,
  type ElementNode,
  HISTORIC_TAG,
  INSERT_PARAGRAPH_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  REDO_COMMAND,
  type SerializedEditorState,
  TextNode,
  UNDO_COMMAND,
} from 'lexical';
import {describe, expect, test} from 'vitest';

const P = 'Revenue grew 4% in Q3.';

class ChipNode extends DecoratorNode<null> {
  $config() {
    return this.config('test-chip', {extends: DecoratorNode});
  }
  createDOM(): HTMLElement {
    return document.createElement('span');
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
  isInline(): true {
    return true;
  }
  getTextContent(): string {
    return '@';
  }
}

/** A block decorator that hosts a `caption` slot */
class FigureNode extends DecoratorNode<null> {
  $config() {
    return this.config('test-figure', {extends: DecoratorNode});
  }
  isInline(): false {
    return false;
  }
  createDOM(): HTMLElement {
    return document.createElement('figure');
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
}

class TestDecoratorTextNode extends DecoratorTextNode {
  $config() {
    return this.config('test-decorator-text', {extends: DecoratorTextNode});
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
  getTextContent(): string {
    return '#';
  }
}

function $describeNode(node: LexicalNode): string {
  const ids = $getNodeMarkIDs(node);
  const tag = ids.length > 0 ? `[${ids.join(',')}]` : '';
  if ($isTextNode(node)) {
    return JSON.stringify(node.getTextContent()) + tag;
  }
  if ($isLineBreakNode(node)) {
    return 'br' + tag;
  }
  if ($isLinkNode(node)) {
    return `link(${node.getChildren().map($describeNode).join(' ')})`;
  }
  if (node instanceof MarkNode) {
    return `mark[${node.getIDs().join(',')}](${node
      .getChildren()
      .map($describeNode)
      .join(' ')})`;
  }
  if ($isElementNode(node)) {
    return `${node.getType()}(${node
      .getChildren()
      .map($describeNode)
      .join(' ')})`;
  }
  if (node instanceof FigureNode) {
    const caption = $getSlot(node, 'caption');
    return `${node.getType()}${tag}{${caption ? $describeNode(caption) : ''}}`;
  }
  return node.getType() + tag;
}

function $tree(): string {
  return $getRoot().getChildren().map($describeNode).join(' / ');
}

function $paragraph(index = 0): ElementNode {
  return $getRoot().getChildAtIndex(index) as ElementNode;
}

/** The text node and offset at a character offset of a paragraph */
function $locate(
  paragraph: ElementNode,
  offset: number,
  preferNext = false,
): [TextNode, number] {
  let acc = 0;
  const texts = paragraph.getAllTextNodes();
  for (let i = 0; i < texts.length; i++) {
    const node = texts[i];
    const size = node.getTextContentSize();
    if (
      offset < acc + size ||
      (offset === acc + size && (!preferNext || i === texts.length - 1))
    ) {
      return [node, offset - acc];
    }
    acc += size;
  }
  throw new Error(`offset ${offset} out of range`);
}

function $select(
  start: number,
  end: number = start,
  paragraph: ElementNode = $paragraph(),
) {
  const [startNode, startOffset] = $locate(paragraph, start, start !== end);
  const [endNode, endOffset] = $locate(paragraph, end);
  const selection = $createRangeSelection();
  selection.anchor.set(startNode.getKey(), startOffset, 'text');
  selection.focus.set(endNode.getKey(), endOffset, 'text');
  $setSelection(selection);
  return selection;
}

function $init(text = P) {
  $getRoot()
    .clear()
    .append($createParagraphNode().append($createTextNode(text)));
}

function createTestEditor(
  options: {
    disabled?: boolean;
    exportIDsToHTML?: boolean;
    markableNodes?: readonly MarkableNodeMatch[];
    withRoot?: boolean;
  } = {},
): LexicalEditor {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        RichTextExtension,
        LinkExtension,
        MarkExtension,
        CoreImportExtension,
        configExtension(MarkStateExtension, {
          disabled: options.disabled ?? false,
          exportIDsToHTML: options.exportIDsToHTML ?? false,
          markableNodes: options.markableNodes ?? DEFAULT_MARKABLE_NODES,
        }),
      ],
      name: '[root]',
      nodes: () => [ChipNode, FigureNode, TestDecoratorTextNode],
      theme: {mark: 'mark', markOverlap: 'mark-overlap'},
    }),
  );
  if (options.withRoot) {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    document.body.appendChild(root);
    editor.setRootElement(root);
  }
  return editor;
}

function update(editor: LexicalEditor, fn: () => void) {
  editor.update(fn, {discrete: true});
}

function tree(editor: LexicalEditor): string {
  return editor.read($tree);
}

function mark(editor: LexicalEditor, start: number, end: number, id: string) {
  update(editor, () => {
    $addMarkID(id, $select(start, end));
  });
}

function markIDNodeKeys(editor: LexicalEditor) {
  return getExtensionDependencyFromEditor(editor, MarkStateExtension).output
    .markIDNodeKeys.value;
}

/** id -> text of the nodes that carry it, from the markIDNodeKeys output */
function registryText(editor: LexicalEditor): Record<string, string[]> {
  return editor.read(() => {
    const result: Record<string, string[]> = {};
    for (const [id, keys] of markIDNodeKeys(editor)) {
      result[id] = keys
        .map(key => editor.getEditorState()._nodeMap.get(key))
        .map(node => (node ? node.getTextContent() : '<missing>'))
        .sort();
    }
    return result;
  });
}

function typeText(editor: LexicalEditor, text: string) {
  update(editor, () => {
    editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, text);
  });
}

describe('MarkStateExtension', () => {
  describe('add, remove and query', () => {
    test('overlapping marks share TextNodes regardless of order', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      mark(editor, 12, 19, 'c2');
      const expected =
        'paragraph("Revenue " "grew"[c1] " 4%"[c1,c2] " in "[c2] "Q3.")';
      expect(tree(editor)).toBe(expected);

      const reversed = createTestEditor();
      update(reversed, () => $init());
      mark(reversed, 12, 19, 'c2');
      mark(reversed, 8, 15, 'c1');
      expect(tree(reversed)).toBe(expected);

      // One set-valued NodeState key, a sorted array in JSON
      const paragraph = (
        editor.getEditorState().toJSON() as SerializedEditorState
      ).root.children[0] as unknown as {children: {$?: object}[]};
      expect(paragraph.children.map(child => child.$)).toEqual([
        undefined,
        {markIds: ['c1']},
        {markIds: ['c1', 'c2']},
        {markIds: ['c2']},
        undefined,
      ]);
      expect(
        (reversed.getEditorState().toJSON() as SerializedEditorState).root
          .children[0],
      ).toEqual(paragraph);
      expect(registryText(editor)).toEqual({
        c1: [' 4%', 'grew'],
        c2: [' 4%', ' in '],
      });
    });

    test('the selection still covers the marked text', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      update(editor, () => {
        $addMarkID('c1', $select(8, 15));
        const selection = $getSelection();
        expect(selection && selection.getTextContent()).toBe('grew 4%');
      });
    });

    test('$getMarkIDsAtSelection', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      mark(editor, 12, 19, 'c2');
      update(editor, () => {
        expect($getMarkIDsAtSelection($select(3))).toEqual([]);
        expect($getMarkIDsAtSelection($select(10))).toEqual(['c1']);
        expect($getMarkIDsAtSelection($select(13))).toEqual(['c1', 'c2']);
        expect($getMarkIDsAtSelection($select(17))).toEqual(['c2']);
        // A caret right before a marked run (end of "Revenue ") is in it
        expect($getMarkIDsAtSelection($select(8))).toEqual(['c1']);
        // Defaults to the current selection
        $select(13);
        expect($getMarkIDsAtSelection()).toEqual(['c1', 'c2']);
        expect($getMarkIDsAtSelection($select(10, 17))).toEqual(['c1', 'c2']);
        expect($getMarkIDsAtSelection($select(10, 17), 'all')).toEqual([]);
        expect($getMarkIDsAtSelection($select(12, 15), 'all')).toEqual([
          'c1',
          'c2',
        ]);
        // Leaves the selection only touches at an edge do not count
        expect($getMarkIDsAtSelection($select(0, 8))).toEqual([]);
        expect($getMarkIDsAtSelection($select(19, 22))).toEqual([]);
      });
    });

    test('removing an id merges the text back', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      mark(editor, 12, 19, 'c2');
      update(editor, () => $removeMarkID('c1'));
      expect(tree(editor)).toBe(
        'paragraph("Revenue grew" " 4% in "[c2] "Q3.")',
      );
      expect(registryText(editor)).toEqual({c2: [' 4% in ']});
      update(editor, () => $removeMarkID('c2'));
      expect(tree(editor)).toBe('paragraph("Revenue grew 4% in Q3.")');
      expect(markIDNodeKeys(editor).size).toBe(0);
      // No NodeState is left in the JSON
      expect(JSON.stringify(editor.getEditorState().toJSON())).not.toContain(
        '"$"',
      );
    });

    test('removing an id from part of its range', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 8, 19, 'c1');
      update(editor, () => $removeMarkID('c1', $select(12, 15)));
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew"[c1] " 4%" " in "[c1] "Q3.")',
      );
      expect(registryText(editor)).toEqual({c1: [' in ', 'grew']});
    });

    test('removing an id without the active registry walks the document', () => {
      const editor = createTestEditor({disabled: true});
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      mark(editor, 12, 19, 'c2');
      update(editor, () => $removeMarkID('c1'));
      expect(tree(editor)).toBe(
        'paragraph("Revenue grew" " 4% in "[c2] "Q3.")',
      );
    });

    test('add and remove in the same update', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      update(editor, () => {
        $addMarkID('c1', $select(8, 15));
        $removeMarkID('c1');
      });
      expect(tree(editor)).toBe('paragraph("Revenue grew 4% in Q3.")');
      expect(markIDNodeKeys(editor).size).toBe(0);
    });

    test('line breaks, inline decorators and links', () => {
      const editor = createTestEditor();
      update(editor, () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('ab'),
              $createLineBreakNode(),
              $createTextNode('cd'),
              new ChipNode(),
              $createTextNode('ef'),
            ),
          );
      });
      update(editor, () => {
        const paragraph = $paragraph();
        const [first, , , , last] = paragraph.getChildren() as TextNode[];
        const selection = $createRangeSelection();
        selection.anchor.set(first.getKey(), 1, 'text');
        selection.focus.set(last.getKey(), 1, 'text');
        $addMarkID('c1', selection);
      });
      expect(tree(editor)).toBe(
        'paragraph("a" "b"[c1] br[c1] "cd"[c1] test-chip[c1] "e"[c1] "f")',
      );

      const linked = createTestEditor();
      update(linked, () => $init());
      update(linked, () => {
        $select(8, 15);
        $toggleLink('https://example.com');
      });
      mark(linked, 8, 19, 'c1');
      expect(tree(linked)).toBe(
        'paragraph("Revenue " link("grew 4%"[c1]) " in "[c1] "Q3.")',
      );
      // A comment on part of a link marks only that part
      mark(linked, 0, 10, 'c2');
      expect(tree(linked)).toBe(
        'paragraph("Revenue "[c2] link("gr"[c1,c2] "ew 4%"[c1]) " in "[c1] "Q3.")',
      );
      update(linked, () => {
        $select(8, 15);
        $toggleLink(null);
      });
      expect(tree(linked)).toBe(
        'paragraph("Revenue "[c2] "gr"[c1,c2] "ew 4% in "[c1] "Q3.")',
      );
    });
  });

  describe('structural edits', () => {
    test('Enter splits a marked run and Backspace joins it again', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      update(editor, () => {
        $select(12);
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      });
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew"[c1]) / paragraph(" 4%"[c1] " in Q3.")',
      );
      expect(registryText(editor)).toEqual({c1: [' 4%', 'grew']});
      update(editor, () => {
        $paragraph(1).selectStart();
        editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
      });
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew 4%"[c1] " in Q3.")',
      );
      expect(registryText(editor)).toEqual({c1: ['grew 4%']});
    });

    test('Enter at the edge of a run keeps it whole', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      update(editor, () => {
        $select(15);
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      });
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew 4%"[c1]) / paragraph(" in Q3.")',
      );
    });

    test('deleting across the boundaries of a run', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      // Delete "ue gr" across the start of the run
      update(editor, () => {
        $select(5, 10).removeText();
      });
      expect(tree(editor)).toBe('paragraph("Reven" "ew 4%"[c1] " in Q3.")');
      // Delete the last character of the run
      update(editor, () => {
        $select(9, 10).removeText();
      });
      expect(tree(editor)).toBe('paragraph("Reven" "ew 4"[c1] " in Q3.")');
      // Deleting the whole run removes the id
      update(editor, () => {
        $select(4, 11).removeText();
      });
      expect(tree(editor)).toBe('paragraph("Reven Q3.")');
      expect(markIDNodeKeys(editor).size).toBe(0);
    });

    test('marked and unmarked text do not merge, equal ids do', () => {
      const editor = createTestEditor();
      update(editor, () => $init('aabbcc'));
      mark(editor, 0, 2, 'x');
      mark(editor, 2, 4, 'y');
      expect(tree(editor)).toBe('paragraph("aa"[x] "bb"[y] "cc")');
      mark(editor, 4, 6, 'y');
      expect(tree(editor)).toBe('paragraph("aa"[x] "bbcc"[y])');
    });
  });

  describe('typing at the edges of a mark', () => {
    function setup() {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      return editor;
    }

    test('text typed at the end of a run is not marked', () => {
      const editor = setup();
      update(editor, () => $select(15));
      typeText(editor, 'X');
      typeText(editor, 'Y');
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew 4%"[c1] "XY in Q3.")',
      );
      update(editor, () => {
        const selection = $getSelection();
        expect(
          $isRangeSelection(selection) &&
            selection.anchor.getNode().getTextContent().slice(0, 2),
        ).toBe('XY');
        expect($isRangeSelection(selection) && selection.anchor.offset).toBe(2);
      });
    });

    test('text typed at the start of a run is not marked', () => {
      const editor = setup();
      // The caret at the start of the marked node (not the end of "Revenue ")
      update(editor, () => {
        const [, marked] = $paragraph().getChildren() as TextNode[];
        marked.select(0, 0);
      });
      typeText(editor, 'X');
      expect(tree(editor)).toBe(
        'paragraph("Revenue X" "grew 4%"[c1] " in Q3.")',
      );
    });

    test('a run at the start of a paragraph', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 0, 7, 'c1');
      update(editor, () => $paragraph().selectStart());
      typeText(editor, 'X');
      expect(tree(editor)).toBe(
        'paragraph("X" "Revenue"[c1] " grew 4% in Q3.")',
      );
      // and at the end of a paragraph
      mark(editor, 20, 23, 'c2');
      update(editor, () => $paragraph().selectEnd());
      typeText(editor, 'Y');
      expect(tree(editor)).toBe(
        'paragraph("X" "Revenue"[c1] " grew 4% in " "Q3."[c2] "Y")',
      );
    });

    test('text typed inside a run is marked', () => {
      const editor = setup();
      update(editor, () => $select(11));
      typeText(editor, 'X');
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "greXw 4%"[c1] " in Q3.")',
      );
    });

    test('text replacing a selection inside a run is marked', () => {
      const editor = setup();
      update(editor, () => $select(9, 11));
      typeText(editor, 'X');
      expect(tree(editor)).toBe('paragraph("Revenue " "gXw 4%"[c1] " in Q3.")');
    });

    test('ids shared with the neighbor continue across the edge', () => {
      const editor = setup();
      mark(editor, 12, 19, 'c2');
      // Caret at the end of "grew"[c1], before " 4%"[c1,c2]
      update(editor, () => {
        const [, grew] = $paragraph().getChildren() as TextNode[];
        grew.select(4, 4);
      });
      typeText(editor, 'X');
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grewX"[c1] " 4%"[c1,c2] " in "[c2] "Q3.")',
      );
      // Caret at the end of " 4%"[c1,c2], before " in "[c2]: c1 ends here
      update(editor, () => {
        const [, , overlap] = $paragraph().getChildren() as TextNode[];
        overlap.select(3, 3);
      });
      typeText(editor, 'Y');
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grewX"[c1] " 4%"[c1,c2] "Y in "[c2] "Q3.")',
      );
    });

    test('text inserted natively into the DOM text', () => {
      // What the native beforeinput path ends up doing: the DOM text of the
      // marked node changes and is read back into it with the caret after it
      const editor = setup();
      update(editor, () => $select(15));
      update(editor, () => {
        const [, marked] = $paragraph().getChildren() as TextNode[];
        marked.setTextContent('grew 4%X');
        marked.select(8, 8);
      });
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew 4%"[c1] "X in Q3.")',
      );
    });

    test('composition at the end of a run', () => {
      const editor = setup();
      update(editor, () => $select(15));
      update(editor, () => {
        editor.dispatchCommand(
          COMPOSITION_START_COMMAND,
          new CompositionEvent('compositionstart', {data: ''}),
        );
      });
      expect(editor.isComposing()).toBe(true);
      // The IME updates the DOM text of the composing node
      for (const composed of ['に', '日本']) {
        update(editor, () => {
          const [, marked] = $paragraph().getChildren() as TextNode[];
          expect(marked.isComposing()).toBe(true);
          marked.setTextContent('grew 4%' + composed);
          marked.select(7 + composed.length, 7 + composed.length);
        });
        // While composing the text stays in the node the IME writes to
        expect(tree(editor)).toBe(
          `paragraph("Revenue " "grew 4%${composed}"[c1] " in Q3.")`,
        );
      }
      update(editor, () => $setCompositionKey(null));
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew 4%"[c1] "日本 in Q3.")',
      );
    });

    test('composition inside a run', () => {
      const editor = setup();
      update(editor, () => $select(11));
      update(editor, () => {
        editor.dispatchCommand(
          COMPOSITION_START_COMMAND,
          new CompositionEvent('compositionstart', {data: ''}),
        );
      });
      update(editor, () => {
        const [, marked] = $paragraph().getChildren() as TextNode[];
        marked.setTextContent('gre日w 4%');
        marked.select(4, 4);
      });
      update(editor, () => $setCompositionKey(null));
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "gre日w 4%"[c1] " in Q3.")',
      );
    });

    test('remote and historic updates are left alone', () => {
      for (const tag of [COLLABORATION_TAG, HISTORIC_TAG]) {
        const editor = setup();
        update(editor, () => $select(15));
        update(editor, () => {
          $addUpdateTag(tag);
          const [, marked] = $paragraph().getChildren() as TextNode[];
          marked.setTextContent('grew 4%X');
          marked.select(8, 8);
        });
        expect(tree(editor)).toBe(
          'paragraph("Revenue " "grew 4%X"[c1] " in Q3.")',
        );
      }
    });

    test('a caret that was not at the edge does not split', () => {
      const editor = setup();
      update(editor, () => $select(3));
      // e.g. a programmatic append while the caret is elsewhere
      update(editor, () => {
        const [, marked] = $paragraph().getChildren() as TextNode[];
        marked.setTextContent('grew 4%X');
      });
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew 4%X"[c1] " in Q3.")',
      );
    });

    test('pasting at the end of a run', () => {
      const editor = setup();
      update(editor, () => {
        $select(15);
        $insertNodes([$createTextNode('pasted')]);
      });
      expect(editor.read(() => $getNodeMarkIDsOfText('pasted'))).toEqual([]);
    });

    test('text typed with a different format inside a run is marked', () => {
      const editor = setup();
      update(editor, () => {
        $select(11);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.toggleFormat('bold');
        }
      });
      typeText(editor, 'X');
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "gre"[c1] "X"[c1] "w 4%"[c1] " in Q3.")',
      );
      expect(
        editor.read(() => $getRoot().getAllTextNodes()[2].hasFormat('bold')),
      ).toBe(true);
    });

    test('text pasted inside a run is marked', () => {
      const editor = setup();
      update(editor, () => {
        $select(11);
        $insertNodes([$createTextNode('pasted').toggleFormat('italic')]);
      });
      expect(editor.read(() => $getNodeMarkIDsOfText('pasted'))).toEqual([
        'c1',
      ]);
    });

    test('undo restores the marks and the output', () => {
      const editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            RichTextExtension,
            configExtension(HistoryExtension, {delay: 0}),
            MarkStateExtension,
          ],
          name: '[root]',
        }),
      );
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      expect(registryText(editor)).toEqual({c1: ['grew 4%']});
      update(editor, () => $select(15));
      typeText(editor, 'X');
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew 4%"[c1] "X in Q3.")',
      );
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew 4%"[c1] " in Q3.")',
      );
      editor.dispatchCommand(UNDO_COMMAND, undefined);
      expect(tree(editor)).toBe('paragraph("Revenue grew 4% in Q3.")');
      expect(markIDNodeKeys(editor).size).toBe(0);
      editor.dispatchCommand(REDO_COMMAND, undefined);
      expect(registryText(editor)).toEqual({c1: ['grew 4%']});
    });

    test('disabled: typed text joins the run', () => {
      const editor = createTestEditor({disabled: true});
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      update(editor, () => $select(15));
      typeText(editor, 'X');
      expect(tree(editor)).toBe(
        'paragraph("Revenue " "grew 4%X"[c1] " in Q3.")',
      );
      expect(markIDNodeKeys(editor).size).toBe(0);
    });
  });

  describe('DOM', () => {
    test('marked leaves get the theme classes and the ids attribute', () => {
      const editor = createTestEditor({withRoot: true});
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      mark(editor, 12, 19, 'c2');
      const root = editor.getRootElement()!;
      const spans = Array.from(
        root.querySelectorAll(`[${MARK_STATE_IDS_ATTRIBUTE}]`),
      ).map(el => [
        el.textContent,
        el.getAttribute(MARK_STATE_IDS_ATTRIBUTE),
        el.className,
      ]);
      expect(spans).toEqual([
        ['grew', 'c1', 'mark'],
        [' 4%', 'c1 c2', 'mark mark-overlap'],
        [' in ', 'c2', 'mark'],
      ]);
      update(editor, () => $removeMarkID('c2'));
      const after = Array.from(root.querySelectorAll('span')).map(el => [
        el.textContent,
        el.getAttribute(MARK_STATE_IDS_ATTRIBUTE),
        el.className,
      ]);
      expect(after).toEqual([
        ['Revenue ', null, ''],
        ['grew 4%', 'c1', 'mark'],
        [' in Q3.', null, ''],
      ]);
      editor.setRootElement(null);
      root.remove();
    });

    test('toggling disabled removes and restores the decoration', () => {
      const editor = createTestEditor({withRoot: true});
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      const root = editor.getRootElement()!;
      const {disabled} = getExtensionDependencyFromEditor(
        editor,
        MarkStateExtension,
      ).output;
      disabled.value = true;
      editor.update(() => {}, {discrete: true});
      expect(root.querySelector(`[${MARK_STATE_IDS_ATTRIBUTE}]`)).toBe(null);
      expect(root.querySelector('.mark')).toBe(null);
      expect(markIDNodeKeys(editor).size).toBe(0);
      disabled.value = false;
      editor.update(() => {}, {discrete: true});
      expect(
        root
          .querySelector(`[${MARK_STATE_IDS_ATTRIBUTE}]`)
          ?.getAttribute(MARK_STATE_IDS_ATTRIBUTE),
      ).toBe('c1');
      expect(registryText(editor)).toEqual({c1: ['grew 4%']});
      editor.setRootElement(null);
      root.remove();
    });
  });

  describe('HTML', () => {
    test('ids are not exported by default', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      const html = editor.read(() => $generateHtmlFromNodes(editor, null));
      expect(html).toContain('grew 4%');
      expect(html).not.toContain(MARK_STATE_IDS_ATTRIBUTE);
      expect(html).not.toContain('c1');
    });

    test('export and import round trip the ids', () => {
      const editor = createTestEditor({exportIDsToHTML: true});
      update(editor, () => $init());
      update(editor, () => {
        $select(10, 13).formatText('bold');
      });
      mark(editor, 8, 15, 'c1');
      mark(editor, 12, 19, 'c2');
      const before = tree(editor);
      const html = editor.read(() => $generateHtmlFromNodes(editor, null));
      expect(html).toContain(`${MARK_STATE_IDS_ATTRIBUTE}="c1 c2"`);

      const target = createTestEditor();
      update(target, () => {
        const dom = new DOMParser().parseFromString(html, 'text/html');
        $getRoot()
          .clear()
          .append(...$generateNodesFromDOMViaExtension(dom));
      });
      expect(tree(target)).toBe(before);
      expect(registryText(target)).toEqual(registryText(editor));
    });
  });

  describe('ids', () => {
    test('ids must be non-empty and free of whitespace', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      for (const id of ['', 'a b', 'a\tb', 'a\nb', ' a']) {
        expect(() =>
          update(editor, () => {
            $addMarkID(id, $select(8, 15));
          }),
        ).toThrow(/invalid mark id/);
      }
      // Anything else is fine, and round trips through HTML
      const ids = ['a"b', 'a,b', '<x>', '__proto__', 'é-1'];
      const exporting = createTestEditor({exportIDsToHTML: true});
      update(exporting, () => $init());
      for (const id of ids) {
        mark(exporting, 8, 15, id);
      }
      const html = exporting.read(() =>
        $generateHtmlFromNodes(exporting, null),
      );
      const target = createTestEditor();
      update(target, () => {
        const dom = new DOMParser().parseFromString(html, 'text/html');
        $getRoot()
          .clear()
          .append(...$generateNodesFromDOMViaExtension(dom));
      });
      expect(target.read(() => $getNodeMarkIDsOfText('grew'))).toEqual(
        [...ids].sort(),
      );
    });

    test('migrating a MarkNode with an invalid id throws', () => {
      const editor = createTestEditor();
      update(editor, () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createMarkNode(['a b']).append($createTextNode('x')),
            ),
          );
      });
      expect(() =>
        update(editor, () => {
          $migrateMarkNodesToMarkState();
        }),
      ).toThrow(/invalid mark id/);
    });
  });

  describe('links', () => {
    // "Revenue " link("grew"[c1]) " 4% in"[c1] " Q3."
    function setupLinked() {
      const editor = createTestEditor();
      update(editor, () => $init());
      update(editor, () => {
        $select(8, 12);
        $toggleLink('https://example.com');
      });
      mark(editor, 8, 18, 'c1');
      expect(tree(editor)).toBe(
        'paragraph("Revenue " link("grew"[c1]) " 4% in"[c1] " Q3.")',
      );
      return editor;
    }

    test('typing at the start of a run right after a marked link', () => {
      const editor = setupLinked();
      update(editor, () => {
        const [, , run] = $paragraph().getChildren() as TextNode[];
        run.select(0, 0);
      });
      typeText(editor, 'X');
      expect(tree(editor)).toBe(
        'paragraph("Revenue " link("grew"[c1]) "X 4% in"[c1] " Q3.")',
      );
    });

    test('typing at the end of marked link text', () => {
      const editor = setupLinked();
      update(editor, () => {
        $paragraph().getAllTextNodes()[1].select(4, 4);
      });
      typeText(editor, 'X');
      expect(editor.read(() => $getNodeMarkIDsOfText('X'))).toEqual(['c1']);
      expect(
        editor.read(() =>
          $paragraph()
            .getAllTextNodes()
            .map(node => node.getTextContent())
            .join(''),
        ),
      ).toBe('Revenue grewX 4% in Q3.');
    });

    test('typing with a toggled format at the link boundary', () => {
      const editor = setupLinked();
      update(editor, () => {
        const [, , run] = $paragraph().getChildren() as TextNode[];
        run.select(0, 0);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.toggleFormat('bold');
        }
      });
      typeText(editor, 'X');
      expect(editor.read(() => $getNodeMarkIDsOfText('X'))).toEqual(['c1']);
    });

    test('typing after the end of a marked link that ends the mark', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      update(editor, () => {
        $select(8, 12);
        $toggleLink('https://example.com');
      });
      mark(editor, 8, 12, 'c1');
      update(editor, () => {
        const [, , run] = $paragraph().getChildren() as TextNode[];
        run.select(0, 0);
      });
      typeText(editor, 'X');
      expect(editor.read(() => $getNodeMarkIDsOfText('X'))).toEqual([]);
    });

    test('the caret after a marked link is in the mark', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      update(editor, () => {
        $select(8, 12);
        $toggleLink('https://example.com');
      });
      mark(editor, 8, 12, 'c1');
      update(editor, () => {
        // End of "Revenue ", right before the link
        $paragraph().getAllTextNodes()[0].select(8, 8);
        expect($getMarkIDsAtSelection()).toEqual(['c1']);
      });
    });
  });

  describe('migration and compatibility', () => {
    test('a MarkNode document migrates to the same tree', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      // Nested MarkNodes (no nested element resolver registered)
      update(editor, () => {
        $wrapSelectionInMarkNode($select(8, 15), false, 'c1');
      });
      update(editor, () => {
        $wrapSelectionInMarkNode($select(12, 19), false, 'c2');
      });
      expect(tree(editor)).toBe(
        'paragraph("Revenue " mark[c1]("grew" mark[c2](" 4%")) mark[c2](" in ") "Q3.")',
      );
      let count = 0;
      update(editor, () => {
        count = $migrateMarkNodesToMarkState();
      });
      expect(count).toBe(3);

      const direct = createTestEditor();
      update(direct, () => $init());
      mark(direct, 8, 15, 'c1');
      mark(direct, 12, 19, 'c2');
      expect(tree(editor)).toBe(tree(direct));
      expect(registryText(editor)).toEqual(registryText(direct));
    });

    test('a MarkNode with several ids migrates', () => {
      const editor = createTestEditor();
      update(editor, () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('a'),
              $createMarkNode(['x', 'y']).append($createTextNode('b')),
            ),
          );
      });
      update(editor, () => {
        $migrateMarkNodesToMarkState();
      });
      expect(tree(editor)).toBe('paragraph("a" "b"[x,y])');
    });

    test('an editor without the extension keeps the ids', () => {
      const editor = createTestEditor();
      update(editor, () => $init());
      mark(editor, 8, 15, 'c1');
      mark(editor, 12, 19, 'c2');
      const json = JSON.stringify(editor.getEditorState().toJSON());

      const plain = buildEditorFromExtensions(
        defineExtension({dependencies: [RichTextExtension], name: '[root]'}),
      );
      plain.setEditorState(plain.parseEditorState(json));
      update(plain, () => {
        $paragraph().selectStart();
        $getSelection()!.insertText('Q4 ');
      });
      const roundTrip = createTestEditor();
      roundTrip.setEditorState(
        roundTrip.parseEditorState(
          JSON.stringify(plain.getEditorState().toJSON()),
        ),
      );
      expect(tree(roundTrip)).toBe(
        'paragraph("Q4 Revenue " "grew"[c1] " 4%"[c1,c2] " in "[c2] "Q3.")',
      );
      // The output is rebuilt from a loaded editor state
      expect(registryText(roundTrip)).toEqual({
        c1: [' 4%', 'grew'],
        c2: [' 4%', ' in '],
      });
    });
  });

  test('ids in JSON are a set: unordered input is saved sorted and without duplicates', () => {
    const editor = createTestEditor();
    update(editor, () => $init());
    const json = editor.getEditorState().toJSON() as SerializedEditorState;
    const paragraph = json.root.children[0] as unknown as {
      children: Record<string, unknown>[];
    };
    paragraph.children[0].$ = {markIds: ['c2', 'c1', 'c2', 7]};
    const loaded = createTestEditor();
    loaded.setEditorState(loaded.parseEditorState(JSON.stringify(json)));
    expect(tree(loaded)).toBe('paragraph("Revenue grew 4% in Q3."[c1,c2])');
    expect(registryText(loaded)).toEqual({
      c1: ['Revenue grew 4% in Q3.'],
      c2: ['Revenue grew 4% in Q3.'],
    });
    const saved = JSON.stringify(loaded.getEditorState().toJSON());
    expect(
      (
        (JSON.parse(saved) as SerializedEditorState).root
          .children[0] as unknown as {children: {$?: object}[]}
      ).children[0].$,
    ).toEqual({markIds: ['c1', 'c2']});
    // Stable across another round trip
    const again = createTestEditor();
    again.setEditorState(again.parseEditorState(saved));
    expect(JSON.stringify(again.getEditorState().toJSON())).toBe(saved);
  });

  describe('slots', () => {
    /**
     * paragraph(P) / figure{caption paragraph} / paragraph("After it.")
     */
    function $initFigure() {
      $init();
      const figure = new FigureNode();
      $getRoot().append(
        figure,
        $createParagraphNode().append($createTextNode('After it.')),
      );
      $setSlot(
        figure,
        'caption',
        $createParagraphNode().append($createTextNode('A caption')),
      );
    }

    function $selectAcrossFigure() {
      const [first] = $locate($paragraph(0), 8);
      const [last] = $locate($paragraph(2), 5);
      const selection = $createRangeSelection();
      selection.anchor.set(first.getKey(), 8, 'text');
      selection.focus.set(last.getKey(), 5, 'text');
      return selection;
    }

    const MARKED =
      'paragraph("Revenue " "grew 4% in Q3."[c1]) / ' +
      'test-figure{paragraph("A caption"[c1])} / ' +
      'paragraph("After"[c1] " it.")';

    test('marking a range marks the content of the slots in it', () => {
      const editor = createTestEditor();
      update(editor, $initFigure);
      update(editor, () => {
        $addMarkID('c1', $selectAcrossFigure());
      });
      expect(tree(editor)).toBe(MARKED);
      expect(registryText(editor)).toEqual({
        c1: ['A caption', 'After', 'grew 4% in Q3.'],
      });
    });

    test('a NodeSelection of a slot host marks the content of its slots', () => {
      const editor = createTestEditor();
      update(editor, $initFigure);
      update(editor, () => {
        const selection = $createNodeSelection();
        selection.add($getRoot().getChildAtIndex(1)!.getKey());
        $addMarkID('c1', selection);
      });
      expect(tree(editor)).toBe(
        'paragraph("Revenue grew 4% in Q3.") / ' +
          'test-figure{paragraph("A caption"[c1])} / paragraph("After it.")',
      );
    });

    test('removing an id removes it from the slots too', () => {
      for (const withExtension of [true, false]) {
        const editor = createTestEditor();
        update(editor, $initFigure);
        update(editor, () => {
          $addMarkID('c1', $selectAcrossFigure());
        });
        const json = JSON.stringify(editor.getEditorState().toJSON());
        // Without the extension, $removeMarkID walks the document
        const target = withExtension
          ? editor
          : buildEditorFromExtensions(
              defineExtension({
                dependencies: [RichTextExtension],
                name: '[root]',
                nodes: () => [FigureNode],
              }),
            );
        target.setEditorState(target.parseEditorState(json));
        update(target, () => $removeMarkID('c1'));
        expect(tree(target)).toBe(
          'paragraph("Revenue grew 4% in Q3.") / ' +
            'test-figure{paragraph("A caption")} / paragraph("After it.")',
        );
      }
    });

    test('the output is rebuilt from the slots of a loaded state', () => {
      const editor = createTestEditor();
      update(editor, $initFigure);
      update(editor, () => {
        $addMarkID('c1', $selectAcrossFigure());
      });
      const loaded = createTestEditor();
      loaded.setEditorState(
        loaded.parseEditorState(
          JSON.stringify(editor.getEditorState().toJSON()),
        ),
      );
      expect(tree(loaded)).toBe(MARKED);
      expect(registryText(loaded)).toEqual({
        c1: ['A caption', 'After', 'grew 4% in Q3.'],
      });
    });

    test('a MarkNode inside a slot migrates', () => {
      const editor = createTestEditor();
      update(editor, () => {
        $initFigure();
        const caption = $getSlot(
          $getRoot().getChildAtIndex(1)!,
          'caption',
        ) as ElementNode;
        const text = caption.getFirstChildOrThrow<TextNode>();
        const [, rest] = text.splitText(2);
        const markNode = $createMarkNode(['c2']);
        rest.replace(markNode);
        markNode.append(rest);
      });
      update(editor, () => {
        expect($migrateMarkNodesToMarkState()).toBe(1);
      });
      expect(tree(editor)).toBe(
        'paragraph("Revenue grew 4% in Q3.") / ' +
          'test-figure{paragraph("A " "caption"[c2])} / paragraph("After it.")',
      );
    });
  });

  describe('markable nodes', () => {
    function $initMixed() {
      $getRoot()
        .clear()
        .append(
          $createParagraphNode().append(
            $createTextNode('ab'),
            new TestDecoratorTextNode(),
            $createLineBreakNode(),
            new ChipNode(),
            $createTextNode('cd'),
          ),
        );
    }

    function $selectAll() {
      const paragraph = $paragraph();
      const selection = $createRangeSelection();
      selection.anchor.set(
        paragraph.getFirstChildOrThrow().getKey(),
        0,
        'text',
      );
      selection.focus.set(paragraph.getLastChildOrThrow().getKey(), 2, 'text');
      return selection;
    }

    test('by default TextNode, LineBreakNode and inline decorators, including DecoratorTextNode', () => {
      const editor = createTestEditor({withRoot: true});
      update(editor, $initMixed);
      update(editor, () => {
        $addMarkID('c1', $selectAll());
      });
      expect(tree(editor)).toBe(
        'paragraph("ab"[c1] test-decorator-text[c1] br[c1] test-chip[c1] "cd"[c1])',
      );
      expect(registryText(editor)).toEqual({c1: ['\n', '#', '@', 'ab', 'cd']});
      const decoratorText = editor
        .getRootElement()!
        .querySelector(`[${MARK_STATE_IDS_ATTRIBUTE}]`);
      expect(decoratorText).not.toBe(null);
    });

    test('a class list', () => {
      const editor = createTestEditor({markableNodes: [TextNode]});
      update(editor, $initMixed);
      update(editor, () => {
        $addMarkID('c1', $selectAll());
      });
      expect(tree(editor)).toBe(
        'paragraph("ab"[c1] test-decorator-text br test-chip "cd"[c1])',
      );
      expect(registryText(editor)).toEqual({c1: ['ab', 'cd']});
    });

    test('a guard function', () => {
      const editor = createTestEditor({
        markableNodes: [
          (node: LexicalNode) =>
            $isTextNode(node) && !node.getTextContent().includes('c'),
          TestDecoratorTextNode,
        ],
      });
      update(editor, $initMixed);
      update(editor, () => {
        $addMarkID('c1', $selectAll());
      });
      expect(tree(editor)).toBe(
        'paragraph("ab"[c1] test-decorator-text[c1] br test-chip "cd")',
      );
    });

    test('extending the default with a block decorator', () => {
      const editor = createTestEditor({
        markableNodes: [...DEFAULT_MARKABLE_NODES, FigureNode],
      });
      update(editor, () => {
        $init();
        $getRoot().append(new FigureNode());
      });
      update(editor, () => {
        const selection = $createNodeSelection();
        selection.add($getRoot().getLastChildOrThrow().getKey());
        $addMarkID('c1', selection);
      });
      expect(tree(editor)).toBe(
        'paragraph("Revenue grew 4% in Q3.") / test-figure[c1]{}',
      );
      expect(registryText(editor)).toEqual({c1: ['']});
    });
  });
});

function $getNodeMarkIDsOfText(text: string): string[] {
  const node = $getRoot()
    .getAllTextNodes()
    .find(textNode => textNode.getTextContent().includes(text));
  if (!node) {
    throw new Error(`no text node with ${text}`);
  }
  return $getNodeMarkIDs(node);
}
