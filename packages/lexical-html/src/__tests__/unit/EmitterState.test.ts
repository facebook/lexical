/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListExtension,
} from '@lexical/list';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  LexicalNode,
} from 'lexical';
import {
  $createTestShadowRootNode,
  TestShadowRootNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test, vi} from 'vitest';

import {$createChildEmitter, $createRootEmitter} from '../../EmitterState';
import {StatefulNodeEmitter} from '../../types';

const $withChildEmitter =
  (...args: Parameters<typeof $createChildEmitter>) =>
  (f: (v: ReturnType<typeof $createChildEmitter>) => void) => {
    const emitter = $createChildEmitter(...args);
    f(emitter);
    emitter.close();
  };

type EmitTree = [
  parent: LexicalNode | null,
  children: (LexicalNode | EmitTree)[],
];

function $emitTree(
  emitter: StatefulNodeEmitter<unknown>,
  tree: EmitTree,
): void {
  const [parent, children] = tree;
  if (parent) {
    emitter.$emitNode(parent);
  }
  $withChildEmitter(
    emitter,
    parent,
    parent ? undefined : 'softBreak',
  )((childEmitter) => {
    for (const child of children) {
      if (Array.isArray(child)) {
        $emitTree(childEmitter, child);
      } else {
        childEmitter.$emitNode(child);
      }
    }
  });
}

function $t(...args: EmitTree): EmitTree {
  return args;
}

function $emitTrees(trees: EmitTree[]): LexicalNode[] {
  const emitter = $createRootEmitter();
  for (const tree of trees) {
    $emitTree(emitter, tree);
  }
  return emitter.close();
}

describe('$createRootEmitter', () => {
  test('Can emit a series of inline nodes', () => {
    using editor = buildEditorFromExtensions();
    editor.update(
      () => {
        const inlines = [
          $createTextNode('hello'),
          $createLineBreakNode(),
          $createTextNode('world'),
        ];
        const emitter = $createRootEmitter();
        for (const node of inlines) {
          emitter.$emitNode(node);
        }
        const list = emitter.close();
        expect(list).toEqual(inlines);
      },
      {discrete: true},
    );
  });
  test('Can emit a series of mixed nodes', () => {
    using editor = buildEditorFromExtensions();
    editor.update(
      () => {
        const mixed = [
          $createTextNode('hello'),
          $createLineBreakNode(),
          $createTextNode('world'),
          $createParagraphNode(),
        ];
        const $createBlockNode = vi.fn($createParagraphNode);
        const emitter = $createRootEmitter($createBlockNode);
        for (const node of mixed) {
          emitter.$emitNode(node);
        }
        const list = emitter.close();
        expect($createBlockNode).toHaveBeenCalledOnce();
        const firstParagraph = $createBlockNode.mock.results[0].value;
        const lastParagraph = mixed.at(-1);
        assert(
          $isParagraphNode(firstParagraph),
          'firstParagraph must be a ParagraphNode',
        );
        assert(
          $isParagraphNode(lastParagraph),
          'lastParagraph must be a ParagraphNode',
        );
        expect(list).toEqual([firstParagraph, lastParagraph]);
        expect(firstParagraph.getChildren()).toEqual(mixed.slice(0, -1));
      },
      {discrete: true},
    );
  });
  test('Explicit paragraphs are not mixed up with implicit paragraphs', () => {
    using editor = buildEditorFromExtensions();
    editor.update(
      () => {
        const nodes: EmitTree[] = [
          [$createParagraphNode(), []],
          [null, [$createTextNode('soft break after')]],
          [
            null,
            [
              $createTextNode('soft break before'),
              $createLineBreakNode(),
              $createTextNode('world'),
            ],
          ],
          [$createParagraphNode(), [$createTextNode('paragraph')]],
        ];
        const list = $emitTrees(nodes);
        const expectedTopLevel = nodes.flatMap(([parent, children]) =>
          parent ? [parent] : children,
        );
        expectedTopLevel.splice(2, 0, list[2]); // Add the soft break
        expect(list).toEqual(expectedTopLevel);
        expect(
          list[0] && $isParagraphNode(list[0]) && list[0].getChildren(),
        ).toEqual([]);
        expect(
          list[list.length - 1] &&
            $isParagraphNode(list[list.length - 1]) &&
            list[list.length - 1].getTextContent(),
        ).toEqual('paragraph');
      },
      {discrete: true},
    );
  });
  test('softBreak creates a newline between inline nodes on close', () => {
    using editor = buildEditorFromExtensions();
    editor.update(
      () => {
        const inlines = ['hello', 'world'].map((text) => $createTextNode(text));
        const list = $emitTrees(inlines.map((v) => [null, [v]]));
        expect(list.filter($isTextNode)).toEqual(inlines);
        expect($isLineBreakNode(list[1])).toBe(true);
        expect(list).toHaveLength(3);
      },
      {discrete: true},
    );
  });
  test('$emitNode returns a shadow root emitter', () => {
    using editor = buildEditorFromExtensions({
      name: 'root',
      nodes: [TestShadowRootNode],
    });
    editor.update(
      () => {
        const list = $emitTrees([
          [
            $createTestShadowRootNode(),
            [
              [
                $createParagraphNode(),
                [
                  $createTextNode('this is in p0'),
                  $createTestShadowRootNode(),
                  $createTextNode('p0 got split into p1'),
                ],
              ],
              $createTextNode('lifted to p2'),
            ],
          ],
        ]);
        assert(
          list[0] instanceof TestShadowRootNode,
          'list[0] is a TestShadowRootNode',
        );
        expect(list).toHaveLength(1);
        const shadowList = list[0].getChildren();
        assert(
          $isParagraphNode(shadowList[0]),
          'shadowList[0] is a ParagraphNode',
        );
        assert(
          shadowList[1] instanceof TestShadowRootNode,
          'shadowList[1] is a TestShadowRootNode',
        );
        assert(
          $isParagraphNode(shadowList[2]),
          'shadowList[2] is a ParagraphNode',
        );
        assert(
          $isParagraphNode(shadowList[3]),
          'shadowList[2] is a ParagraphNode',
        );
        expect(shadowList.map((n) => n.getTextContent())).toEqual([
          'this is in p0',
          '', // shadow
          'p0 got split into p1',
          'lifted to p2',
        ]);
      },
      {discrete: true},
    );
  });
  test('blocks are flattened', () => {
    using editor = buildEditorFromExtensions({
      dependencies: [ListExtension],
      name: 'root',
    });
    editor.update(
      () => {
        // <ul><li><p>first</p></li><li><p>second</p></li></ul>
        const list = $emitTrees([
          $t($createListNode(), [
            $t($createListItemNode(), [
              $t($createParagraphNode(), [$createTextNode('first')]),
            ]),
            $t($createListItemNode(), [
              $t($createParagraphNode(), [$createTextNode('second')]),
            ]),
          ]),
        ]);
        expect(list).toHaveLength(1);
        assert($isListNode(list[0]), 'ListNode');
        const listItems = list[0].getChildren();
        expect(listItems).toHaveLength(2);
        listItems.forEach((li, i) => {
          assert($isListItemNode(li), `listItems[${i}] is a ListItemNode`);
          expect(li.getTextContent()).toEqual(['first', 'second'][i]);
          const children = li.getChildren();
          expect(children).toHaveLength(1);
          assert($isTextNode(children[0]), 'children[0] is a TextNode');
        });
      },
      {discrete: true},
    );
  });
});
