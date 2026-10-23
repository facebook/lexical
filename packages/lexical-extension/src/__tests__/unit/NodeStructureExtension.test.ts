/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$createCodeNode, CodeNode} from '@lexical/code-core';
import {
  $createHorizontalRuleNode,
  buildEditorFromExtensions,
  HorizontalRuleExtension,
  NodeStructureExtension,
} from '@lexical/extension';
import {
  $createLinkNode,
  AutoLinkNode,
  LinkExtension,
  LinkNode,
  type SerializedLinkNode,
} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  $isListNode,
  ListExtension,
  ListItemNode,
  ListNode,
  type ListType,
  type SerializedListNode,
} from '@lexical/list';
import {MarkNode} from '@lexical/mark';
import {$createOverflowNode, OverflowNode} from '@lexical/overflow';
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingNode,
  QuoteNode,
  RichTextExtension,
} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  TableCellNode,
  TableExtension,
} from '@lexical/table';
import {
  $create,
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type AnyLexicalExtension,
  createEditor,
  createState,
  ElementNode,
  getDeclaredNodeStructure,
  isNodeStructureEnforced,
  type LexicalNode,
  type NodeKey,
  nodeSchema,
  ParagraphNode,
  type SerializedParagraphNode,
  stringValue,
  TextNode,
  withField,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

function shape(node: LexicalNode): unknown {
  const json = node.exportJSON() as unknown as Record<string, unknown>;
  if (node instanceof ElementNode) {
    return [node.getType(), ...node.getChildren().map(shape)];
  }
  return json.text !== undefined ? String(json.text) : node.getType();
}

function build($init: () => void, withStructure: boolean) {
  const deps: AnyLexicalExtension[] = [
    RichTextExtension,
    ListExtension,
    LinkExtension,
    TableExtension,
    HorizontalRuleExtension,
  ];
  if (withStructure) {
    deps.push(NodeStructureExtension);
  }
  return buildEditorFromExtensions({
    $initialEditorState: $init,
    dependencies: deps,
    name: 'node-structure-test',
    nodes: [CodeNode, OverflowNode],
    onError: e => {
      throw e;
    },
  });
}

function rootShape(editor: ReturnType<typeof build>): unknown {
  return editor.read(() => $getRoot().getChildren().map(shape));
}

describe('declarations', () => {
  test("Lexical's own nodes", () => {
    expect(getDeclaredNodeStructure(ParagraphNode).children).toBe('inline');
    expect(getDeclaredNodeStructure(HeadingNode).children).toBe('inline');
    expect(getDeclaredNodeStructure(QuoteNode).children).toBe('inline');
    expect(getDeclaredNodeStructure(CodeNode).children).toBe('inline');
    expect(getDeclaredNodeStructure(TableCellNode).children).toBe('block');
    expect(getDeclaredNodeStructure(ListNode).children).toEqual([ListItemNode]);
    expect(getDeclaredNodeStructure(ListNode).mergeAdjacent).toEqual({
      by: ['listType'],
    });
    expect(getDeclaredNodeStructure(ListItemNode).children).toEqual([
      'inline',
      ListNode,
    ]);
    const link = getDeclaredNodeStructure(LinkNode);
    expect(link.inline).toBe(true);
    expect(link.mergeAdjacent!.by).toEqual(['url', 'target', 'rel', 'title']);
    // AutoLinkNode inherits inline/children but turns the merge off.
    const auto = getDeclaredNodeStructure(AutoLinkNode);
    expect(auto.inline).toBe(true);
    expect(auto.children).toBe('inline');
    expect(auto.mergeAdjacent).toBeUndefined();
    expect(getDeclaredNodeStructure(MarkNode).inline).toBe(true);
    // OverflowNode declares nothing (the normalization knows it, see below).
    expect(getDeclaredNodeStructure(OverflowNode)).toEqual({
      declaredBy: {},
      derived: new Set(),
    });
  });

  test('derived fields', () => {
    expect(getDeclaredNodeStructure(ListItemNode).derived).toEqual(
      new Set(['indent', 'value']),
    );
    expect(getDeclaredNodeStructure(ListNode).derived).toEqual(new Set());
    expect(createState('n', {derived: true, parse: Number}).derived).toBe(true);
    expect(createState('n', {parse: Number}).derived).toBe(false);
  });

  test('ElementNode.isInline returns the declared inline', () => {
    class Chip extends ElementNode {
      $config() {
        return this.config('test-chip', {extends: ElementNode, inline: true});
      }
    }
    class Box extends ElementNode {
      $config() {
        return this.config('test-box', {extends: ElementNode});
      }
    }
    const editor = createEditor({
      nodes: [Chip, Box],
      onError: e => {
        throw e;
      },
    });
    editor.update(
      () => {
        expect($create(Chip).isInline()).toBe(true);
        expect($create(Box).isInline()).toBe(false);
      },
      {discrete: true},
    );
  });
});

describe('validation at editor creation', () => {
  test('mergeAdjacent.by names an unknown field', () => {
    class Bad extends ElementNode {
      $config() {
        return this.config('test-bad-by', {
          extends: ElementNode,
          mergeAdjacent: {by: ['nope']},
        });
      }
    }
    expect(() => createEditor({nodes: [Bad]})).toThrow(/not a schema field/);
  });

  test('mergeAdjacent.by names a derived field or state', () => {
    const derived = createState('d', {derived: true, parse: Number});
    class Bad extends ElementNode {
      $config() {
        return this.config('test-bad-derived', {
          extends: ElementNode,
          mergeAdjacent: {by: [derived]},
        });
      }
    }
    expect(() => createEditor({nodes: [Bad]})).toThrow(/derived/);
  });

  test('declared inline disagrees with isInline()', () => {
    class Bad extends ElementNode {
      $config() {
        return this.config('test-bad-inline', {
          extends: ElementNode,
          inline: true,
        });
      }
      isInline(): boolean {
        return false;
      }
    }
    expect(() => createEditor({nodes: [Bad]})).toThrow(/isInline/);
  });

  test("a merging group's children must hold inline content", () => {
    class Item extends ElementNode {
      $config() {
        return this.config('test-item', {
          children: 'block',
          extends: ElementNode,
        });
      }
    }
    class Group extends ElementNode {
      $config() {
        return this.config('test-group', {
          children: [Item],
          extends: ElementNode,
          mergeAdjacent: {by: ['format']},
        });
      }
    }
    expect(() => createEditor({nodes: [Item, Group]})).toThrow(
      /hold inline content/,
    );
  });
});

describe('existing subclasses that inherit a declaration', () => {
  // Classes written before the node-structure keys existed must register
  // exactly as before: an inherited declaration never throws, and a key the
  // class contradicts reads as undeclared for it.
  const nodes = [LinkNode, ListNode, ListItemNode];
  const strict = (e: Error) => {
    throw e;
  };

  class BlockLinkNode extends LinkNode {
    static getType(): string {
      return 'test-block-link';
    }
    static clone(node: BlockLinkNode): BlockLinkNode {
      return new BlockLinkNode(
        node.__url,
        {rel: node.__rel, target: node.__target, title: node.__title},
        node.__key,
      );
    }
    static importJSON(json: SerializedLinkNode): BlockLinkNode {
      return new BlockLinkNode(json.url).updateFromJSON(json);
    }
    // @ts-expect-error LinkNode types isInline() as true; an app subclass
    // written in JavaScript, or with a cast, can still return false.
    isInline(): boolean {
      return false;
    }
  }

  test('a LinkNode subclass whose isInline() returns false', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        $getRoot().append(
          new BlockLinkNode('https://a').append(
            $createParagraphNode().append($createTextNode('x')),
          ),
        );
      },
      dependencies: [RichTextExtension, ListExtension, LinkExtension],
      name: 'block-link',
      nodes: [BlockLinkNode],
      onError: strict,
    });
    expect(() =>
      createEditor({nodes: [...nodes, BlockLinkNode]}),
    ).not.toThrow();
    const declared = getDeclaredNodeStructure(BlockLinkNode);
    expect(declared.inline).toBeUndefined();
    expect(declared.declaredBy.inline).toBeUndefined();
    // The other inherited keys stay (they agree with the class).
    expect(declared.children).toBe('inline');
    expect(declared.mergeAdjacent!.by).toEqual([
      'url',
      'target',
      'rel',
      'title',
    ]);
    editor.read(() => {
      expect($getRoot().getFirstChildOrThrow<ElementNode>().isInline()).toBe(
        false,
      );
    });
    // LinkNode itself still declares it.
    expect(getDeclaredNodeStructure(LinkNode).inline).toBe(true);
  });

  test('a ListNode subclass with an extra field and a legacy exportJSON', () => {
    class LabeledListNode extends ListNode {
      __label: string;
      constructor(
        listType: ListType = 'bullet',
        start: number = 1,
        key?: NodeKey,
      ) {
        super(listType, start, key);
        this.__label = '';
      }
      static getType(): string {
        return 'test-labeled-list';
      }
      static clone(node: LabeledListNode): LabeledListNode {
        const clone = new LabeledListNode(
          node.__listType,
          node.__start,
          node.__key,
        );
        clone.__label = node.__label;
        return clone;
      }
      static importJSON(
        json: SerializedListNode & {label: string},
      ): LabeledListNode {
        const node = new LabeledListNode().updateFromJSON(json);
        node.__label = json.label;
        return node;
      }
      exportJSON(): SerializedListNode & {label: string} {
        return {...super.exportJSON(), label: this.__label};
      }
    }
    const editor = createEditor({
      nodes: [...nodes, LabeledListNode],
      onError: strict,
    });
    editor.update(
      () => {
        const list = new LabeledListNode('number');
        list.__label = 't';
        $getRoot().append(
          list.append($createListItemNode().append($createTextNode('a'))),
        );
      },
      {discrete: true},
    );
    const json = editor.getEditorState().toJSON();
    expect(json.root.children[0]).toMatchObject({
      label: 't',
      listType: 'number',
      type: 'test-labeled-list',
    });
    const restored = createEditor({
      nodes: [...nodes, LabeledListNode],
      onError: strict,
    });
    restored.setEditorState(restored.parseEditorState(json));
    expect(restored.getEditorState().toJSON()).toEqual(json);
  });

  test('a ParagraphNode subclass whose isInline() returns true', () => {
    class InlineParagraphNode extends ParagraphNode {
      static getType(): string {
        return 'test-inline-paragraph';
      }
      static clone(node: InlineParagraphNode): InlineParagraphNode {
        return new InlineParagraphNode(node.__key);
      }
      static importJSON(json: SerializedParagraphNode): InlineParagraphNode {
        return new InlineParagraphNode().updateFromJSON(json);
      }
      isInline(): boolean {
        return true;
      }
    }
    const editor = createEditor({
      nodes: [...nodes, InlineParagraphNode],
      onError: strict,
    });
    editor.update(
      () => {
        const node = new InlineParagraphNode();
        $getRoot().append($createParagraphNode().append(node));
        expect(node.isInline()).toBe(true);
      },
      {discrete: true},
    );
    expect(
      getDeclaredNodeStructure(InlineParagraphNode).inline,
    ).toBeUndefined();
  });

  test('a subclass that declares the key itself is still checked', () => {
    class Bad extends LinkNode {
      $config() {
        return this.config('test-bad-own-inline', {
          extends: LinkNode,
          inline: false,
        });
      }
      isInline(): true {
        return true;
      }
    }
    expect(() => createEditor({nodes: [LinkNode, Bad]})).toThrow(/isInline/);
  });

  test('isInline() is synthesized only for a class that declares inline itself', () => {
    class Chip extends ElementNode {
      $config() {
        return this.config('test-own-chip', {
          extends: ElementNode,
          inline: true,
        });
      }
    }
    class SubChip extends Chip {
      $config() {
        return this.config('test-sub-chip', {extends: Chip});
      }
    }
    class ModernLink extends LinkNode {
      $config() {
        return this.config('test-modern-link', {extends: LinkNode});
      }
    }
    class PlainBox extends ParagraphNode {
      $config() {
        return this.config('test-plain-box', {extends: ParagraphNode});
      }
    }
    createEditor({
      nodes: [Chip, SubChip, LinkNode, ModernLink, PlainBox, BlockLinkNode],
      onError: strict,
    });
    const own = (k: {prototype: object}) =>
      Object.prototype.hasOwnProperty.call(k.prototype, 'isInline');
    expect(own(Chip)).toBe(true);
    for (const k of [SubChip, ModernLink, PlainBox, ParagraphNode]) {
      expect(own(k)).toBe(false);
    }
    // BlockLinkNode's own isInline() is untouched.
    expect(BlockLinkNode.prototype.isInline()).toBe(false);
    expect(PlainBox.prototype.isInline).toBe(ElementNode.prototype.isInline);
  });
});

describe('NodeStructureExtension', () => {
  const $paraWithTable = () => {
    const table = $createTableNode().append(
      $createTableRowNode().append(
        $createTableCellNode().append(
          $createParagraphNode().append($createTextNode('cell')),
        ),
      ),
    );
    $getRoot().append(
      $createParagraphNode().append(
        $createTextNode('before'),
        table,
        $createTextNode('after'),
      ),
    );
  };

  test('off by default: a block in a paragraph stays', () => {
    using editor = build($paraWithTable, false);
    expect(rootShape(editor)).toEqual([
      [
        'paragraph',
        'before',
        ['table', ['tablerow', ['tablecell', ['paragraph', 'cell']]]],
        'after',
      ],
    ]);
  });

  test('a block in a paragraph is lifted out (paragraph split)', () => {
    using editor = build($paraWithTable, true);
    expect(rootShape(editor)).toEqual([
      ['paragraph', 'before'],
      ['table', ['tablerow', ['tablecell', ['paragraph', 'cell']]]],
      ['paragraph', 'after'],
    ]);
  });

  test('an OverflowNode stays in its paragraph', () => {
    using editor = build(() => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('within'),
          $createOverflowNode().append($createTextNode('over')),
        ),
      );
    }, true);
    expect(rootShape(editor)).toEqual([
      ['paragraph', 'within', ['overflow', 'over']],
    ]);
    editor.read(() => {
      const overflow = $getRoot()
        .getFirstChildOrThrow<ElementNode>()
        .getLastChild<OverflowNode>();
      // Its behaviour is unchanged: still not inline for the caret.
      expect(overflow!.isInline()).toBe(false);
    });
  });

  test('inline content in a table cell is wrapped in a paragraph', () => {
    using editor = build(() => {
      $getRoot().append(
        $createTableNode().append(
          $createTableRowNode().append(
            $createTableCellNode().append(
              $createTextNode('a'),
              $createParagraphNode().append($createTextNode('b')),
              $createTextNode('c'),
            ),
          ),
        ),
      );
    }, true);
    expect(rootShape(editor)).toEqual([
      [
        'table',
        [
          'tablerow',
          [
            'tablecell',
            ['paragraph', 'a'],
            ['paragraph', 'b'],
            ['paragraph', 'c'],
          ],
        ],
      ],
    ]);
  });

  test('a shadow root quote keeps its blocks', () => {
    using editor = build(() => {
      $getRoot().append(
        $createQuoteNode({shadowRoot: true}).append(
          $createParagraphNode().append($createTextNode('one')),
          $createParagraphNode().append($createTextNode('two')),
        ),
      );
    }, true);
    expect(rootShape(editor)).toEqual([
      ['quote', ['paragraph', 'one'], ['paragraph', 'two']],
    ]);
  });

  test('paragraphs in a list item become lines of the item', () => {
    using editor = build(() => {
      const x = $createTextNode('x');
      $getRoot().append(
        $createListNode('bullet').append($createListItemNode().append(x)),
      );
      // insertAfter, not ListItemNode.append (which unwraps blocks itself).
      const p = $createParagraphNode().append($createTextNode('p'));
      x.insertAfter(p);
      p.insertAfter($createParagraphNode().append($createTextNode('q')));
    }, true);
    // As the HTML import of <li>x<p>p</p><p>q</p></li> gives.
    expect(rootShape(editor)).toEqual([
      ['list', ['listitem', 'x', 'linebreak', 'p', 'linebreak', 'q']],
    ]);
  });

  test('a table in a list item is lifted out of the list', () => {
    using editor = build(() => {
      $getRoot().append(
        $createListNode('bullet').append(
          $createListItemNode().append($createTextNode('x')),
          $createListItemNode().append(
            $createTableNode().append(
              $createTableRowNode().append(
                $createTableCellNode().append(
                  $createParagraphNode().append($createTextNode('c')),
                ),
              ),
            ),
          ),
          $createListItemNode().append($createTextNode('y')),
        ),
      );
    }, true);
    const shapes = rootShape(editor) as unknown[];
    // No text lost or duplicated, and the table is no longer in the list.
    expect(JSON.stringify(shapes).match(/"[xyc]"/g)).toEqual([
      '"x"',
      '"c"',
      '"y"',
    ]);
    expect((shapes as unknown[][]).map(s => s[0])).toContain('table');
  });

  test('a heading inside a link becomes a heading holding the link', () => {
    using editor = build(() => {
      $getRoot().append(
        $createParagraphNode().append(
          $createLinkNode('https://a').append(
            $createHeadingNode('h1').append($createTextNode('Lexical')),
          ),
        ),
      );
    }, true);
    expect(rootShape(editor)).toEqual([['heading', ['link', 'Lexical']]]);
    expect(
      editor.read(() =>
        ($getRoot().getAllTextNodes()[0].getParent() as LinkNode).getURL(),
      ),
    ).toBe('https://a');
  });

  test('a quote holding paragraphs stays one quote, with line breaks', () => {
    using editor = build(() => {
      $getRoot().append(
        $createQuoteNode().append(
          $createParagraphNode().append($createTextNode('a')),
          $createParagraphNode().append($createTextNode('b')),
        ),
        $createQuoteNode().append(
          $createTextNode('x'),
          $createParagraphNode().append($createTextNode('c')),
          $createTextNode('y'),
        ),
      );
    }, true);
    // As markdown's "> a\n>\n> b" imports (and Shift+Enter in a quote).
    expect(rootShape(editor)).toEqual([
      ['quote', 'a', 'linebreak', 'b'],
      ['quote', 'x', 'linebreak', 'c', 'linebreak', 'y'],
    ]);
  });

  test('an empty paragraph in a quote keeps its line', () => {
    using editor = build(() => {
      const empty = $createParagraphNode();
      $getRoot().append(
        $createQuoteNode().append(
          $createParagraphNode(),
          $createParagraphNode().append($createTextNode('a')),
          empty,
        ),
      );
      empty.select();
    }, true);
    expect(rootShape(editor)).toEqual([
      ['quote', 'linebreak', 'a', 'linebreak'],
    ]);
    editor.read(() => {
      // The caret that was in the last (empty) paragraph is on that line.
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      const quote = $getRoot().getFirstChildOrThrow<QuoteNode>();
      expect([selection.anchor.key, selection.anchor.offset]).toEqual([
        quote.getKey(),
        3,
      ]);
    });
  });

  test('typed blocks inside a quote are split around and keep their type', () => {
    using editor = build(() => {
      $getRoot().append(
        $createQuoteNode().append(
          $createParagraphNode().append($createTextNode('a')),
          $createHeadingNode('h2').append($createTextNode('h')),
          $createParagraphNode().append($createTextNode('b')),
          $createCodeNode().append($createTextNode('c')),
          $createQuoteNode().append($createTextNode('q')),
          $createParagraphNode().append($createTextNode('d')),
        ),
      );
    }, true);
    expect(rootShape(editor)).toEqual([
      ['quote', 'a'],
      ['heading', 'h'],
      ['quote', 'b'],
      ['code', 'c'],
      ['quote', 'q'],
      ['quote', 'd'],
    ]);
  });

  test('paragraphs in other blocks that hold inline content become lines', () => {
    using editor = build(() => {
      $getRoot().append(
        $createCodeNode().append(
          $createParagraphNode().append($createTextNode('one')),
          $createParagraphNode().append($createTextNode('two')),
        ),
        $createHeadingNode('h1').append(
          $createTextNode('x'),
          $createLineBreakNode(),
          $createParagraphNode().append($createTextNode('y')),
        ),
      );
    }, true);
    expect(rootShape(editor)).toEqual([
      ['code', 'one', 'linebreak', 'two'],
      ['heading', 'x', 'linebreak', 'linebreak', 'y'],
    ]);
  });

  test('a list item inside a paragraph is lifted without throwing', () => {
    using editor = build(() => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('a'),
          $createListItemNode().append($createTextNode('item')),
          $createTextNode('b'),
        ),
      );
    }, true);
    expect(rootShape(editor)).toEqual([
      ['paragraph', 'a'],
      ['list', ['listitem', 'item']],
      ['paragraph', 'b'],
    ]);
  });

  test('a caret between two merged links stays between their contents', () => {
    using editor = build(() => {
      const p = $createParagraphNode().append(
        $createLinkNode('https://a').append($createTextNode('one')),
        $createLinkNode('https://a').append($createTextNode('two')),
      );
      $getRoot().append(p);
      p.select(1, 1);
    }, true);
    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      const point = selection.anchor;
      const node = point.getNode();
      // At the boundary: after "one", not after "onetwo".
      const text = node.getTextContent().slice(0, point.offset);
      expect(['one', 'onetwo'].includes(text) ? text : point.type).not.toBe(
        'onetwo',
      );
    });
  });

  test('adjacent equal links merge; different ones do not', () => {
    using editor = build(() => {
      $getRoot().append(
        $createParagraphNode().append(
          $createLinkNode('https://a').append($createTextNode('1')),
          $createLinkNode('https://a').append($createTextNode('2')),
          $createLinkNode('https://b').append($createTextNode('3')),
        ),
      );
    }, true);
    expect(rootShape(editor)).toEqual([
      ['paragraph', ['link', '12'], ['link', '3']],
    ]);
  });

  test('a subclass override of shouldMergeAdjacentLink keeps deciding', () => {
    class NoMergeLink extends LinkNode {
      $config() {
        return this.config('test-nomerge-link', {extends: LinkNode});
      }
      shouldMergeAdjacentLink(): boolean {
        return false;
      }
    }
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append(
            $create(NoMergeLink)
              .setURL('https://a')
              .append($createTextNode('1')),
            $create(NoMergeLink)
              .setURL('https://a')
              .append($createTextNode('2')),
          ),
        );
      },
      dependencies: [RichTextExtension, LinkExtension, NodeStructureExtension],
      name: 'override',
      nodes: [NoMergeLink],
    });
    expect(rootShape(editor)).toEqual([
      ['paragraph', ['test-nomerge-link', '1'], ['test-nomerge-link', '2']],
    ]);
  });

  test('a class that declares mergeAdjacent merges; a subclass that inherits it merges by its own code', () => {
    const tagSchema = nodeSchema<TagNode>()({
      tag: withField(stringValue(), {field: '__tag'}),
    });
    class TagNode extends ElementNode {
      __tag = '';
      $config() {
        return this.config('test-tag', {
          children: 'inline',
          extends: ElementNode,
          inline: true,
          json: tagSchema,
          mergeAdjacent: {by: ['tag']},
        });
      }
    }
    class SubTagNode extends TagNode {
      $config() {
        return this.config('test-subtag', {extends: TagNode});
      }
    }
    const $tag = (klass: typeof TagNode, tag: string, text: string) => {
      const node = $create(klass);
      node.__tag = tag;
      return node.append($createTextNode(text));
    };
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append(
            $tag(TagNode, 'a', '1'),
            $tag(TagNode, 'a', '2'),
            $tag(TagNode, 'b', '3'),
          ),
          $createParagraphNode().append(
            $tag(SubTagNode, 'a', '4'),
            $tag(SubTagNode, 'a', '5'),
          ),
        );
      },
      dependencies: [RichTextExtension, NodeStructureExtension],
      name: 'tags',
      nodes: [TagNode, SubTagNode],
    });
    expect(rootShape(editor)).toEqual([
      ['paragraph', ['test-tag', '12'], ['test-tag', '3']],
      // Its own code (here none) merges a subclass: an override of a merge
      // method is never bypassed.
      ['paragraph', ['test-subtag', '4'], ['test-subtag', '5']],
    ]);
  });

  test('adjacent lists of one type merge, whatever their start', () => {
    using editor = build(() => {
      $getRoot().append(
        $createListNode('number', 1).append(
          $createListItemNode().append($createTextNode('a')),
        ),
        $createListNode('number', 5).append(
          $createListItemNode().append($createTextNode('b')),
        ),
        $createListNode('bullet').append(
          $createListItemNode().append($createTextNode('c')),
        ),
      );
    }, true);
    expect(rootShape(editor)).toEqual([
      ['list', ['listitem', 'a'], ['listitem', 'b']],
      ['list', ['listitem', 'c']],
    ]);
  });

  function listStarts(editor: ReturnType<typeof build>): unknown[] {
    return editor.read(() =>
      $getRoot()
        .getChildren()
        .map(n =>
          $isListNode(n)
            ? [
                n.getStart(),
                ...n
                  .getChildren()
                  .map(c => (c as ListItemNode).getTextContent()),
              ]
            : n.getType(),
        ),
    );
  }

  const $numbered = (
    start: number,
    ...items: (string | (() => LexicalNode[]))[]
  ) =>
    $getRoot().append(
      $createListNode('number', start).append(
        ...items.map(item =>
          $createListItemNode().append(
            ...(typeof item === 'string' ? [$createTextNode(item)] : item()),
          ),
        ),
      ),
    );

  test('a block decorator splits an ordered list; numbering continues', () => {
    const cases: [() => void, unknown[]][] = [
      [
        // In the middle of an item: the rest of the item continues its number.
        () =>
          $numbered(
            1,
            'x',
            () => [
              $createTextNode('a'),
              $createHorizontalRuleNode(),
              $createTextNode('b'),
            ],
            'y',
          ),
        [[1, 'x', 'a'], 'horizontalrule', [2, 'b', 'y']],
      ],
      [
        // An item holding only the rule: the items after keep their numbers.
        () => $numbered(1, 'x', () => [$createHorizontalRuleNode()], 'y'),
        [[1, 'x'], 'horizontalrule', [3, 'y']],
      ],
      [
        () => $numbered(1, () => [$createHorizontalRuleNode()], 'y'),
        ['horizontalrule', [2, 'y']],
      ],
      [
        () => $numbered(3, 'x', () => [$createHorizontalRuleNode()], 'y', 'z'),
        [[3, 'x'], 'horizontalrule', [5, 'y', 'z']],
      ],
      [
        () => $numbered(1, 'x', () => [$createHorizontalRuleNode()]),
        [[1, 'x'], 'horizontalrule'],
      ],
    ];
    for (const [$init, expected] of cases) {
      using editor = build($init, true);
      expect(listStarts(editor)).toEqual(expected);
    }
  });

  test('a block decorator in a list item added later splits the same way', () => {
    using editor = build(() => $numbered(1, 'x', 'a', 'y'), true);
    editor.update(
      () => {
        const item = $getRoot()
          .getFirstChildOrThrow<ListNode>()
          .getChildAtIndex<ListItemNode>(1)!;
        item.clear().append($createHorizontalRuleNode());
      },
      {discrete: true},
    );
    expect(listStarts(editor)).toEqual([[1, 'x'], 'horizontalrule', [3, 'y']]);
  });

  test('isNodeStructureEnforced', () => {
    using on = build(() => {}, true);
    using off = build(() => {}, false);
    expect(isNodeStructureEnforced(on, ListItemNode)).toBe(true);
    expect(isNodeStructureEnforced(on, QuoteNode)).toBe(true);
    expect(isNodeStructureEnforced(off, ListItemNode)).toBe(false);
    expect(isNodeStructureEnforced(on, TableCellNode)).toBe(true);
    // Only element classes that declare children or mergeAdjacent.
    expect(isNodeStructureEnforced(on, TextNode)).toBe(false);
    expect(
      isNodeStructureEnforced(createEditor({nodes: []}), ParagraphNode),
    ).toBe(false);
  });

  test('normalization is a pure function of the document', () => {
    const run = () => {
      using editor = build($paraWithTable, true);
      return JSON.stringify(editor.getEditorState().toJSON());
    };
    expect(run()).toBe(run());
  });
});
