/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createMarkNode, $isMarkNode} from '@lexical/mark';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';
import {
  $createTestElementNode,
  initializeUnitTest,
  invariant,
} from 'lexical/src/__tests__/utils';
import {beforeEach, describe, expect, test} from 'vitest';

import {
  $dfs,
  $firstToLastIterator,
  $getNextSiblingOrParentSibling,
  $lastToFirstIterator,
  $reverseDfs,
} from '../..';

interface DFSKeyPair {
  depth: number;
  node: NodeKey;
}

describe('LexicalNodeHelpers tests', () => {
  initializeUnitTest((testEnv) => {
    describe('dfs order', () => {
      let expectedKeys: DFSKeyPair[];
      let reverseExpectedKeys: DFSKeyPair[];

      /**
       *               R
       *        P1            P2
       *     B1     B2     T4 T5 B3
       *     T1   T2 T3          T6
       *
       *  DFS: R, P1, B1, T1, B2, T2, T3, P2, T4, T5, B3, T6
       *
       *  Reverse DFS: R, P2, B3, T6, T5, T4, P1, B2, T3, T2, B1, T1
       */
      beforeEach(async () => {
        const editor: LexicalEditor = testEnv.editor;
        await editor.update(() => {
          const root = $getRoot();

          const paragraph1 = $createParagraphNode();
          const paragraph2 = $createParagraphNode();

          const block1 = $createTestElementNode();
          const block2 = $createTestElementNode();
          const block3 = $createTestElementNode();

          const text1 = $createTextNode('text1');
          const text2 = $createTextNode('text2');
          const text3 = $createTextNode('text3');
          const text4 = $createTextNode('text4');
          const text5 = $createTextNode('text5');
          const text6 = $createTextNode('text6');

          root.append(paragraph1, paragraph2);
          paragraph1.append(block1, block2);
          paragraph2.append(text4, text5);

          text5.toggleFormat('bold'); // Prevent from merging with text 4

          paragraph2.append(block3);
          block1.append(text1);
          block2.append(text2, text3);

          text3.toggleFormat('bold'); // Prevent from merging with text2

          block3.append(text6);

          function* keysForNode(
            depth: number,
            node: LexicalNode,
            $getChildren: (element: ElementNode) => Iterable<LexicalNode>,
          ): Iterable<DFSKeyPair> {
            yield {depth, node: node.getKey()};
            if ($isElementNode(node)) {
              const childDepth = depth + 1;
              for (const child of $getChildren(node)) {
                yield* keysForNode(childDepth, child, $getChildren);
              }
            }
          }

          expectedKeys = [...keysForNode(0, root, $firstToLastIterator)];
          reverseExpectedKeys = [...keysForNode(0, root, $lastToFirstIterator)];
          // R, P1, B1, T1, B2, T2, T3, P2, T4, T5, B3, T6
          expect(expectedKeys).toEqual(
            [
              root,
              paragraph1,
              block1,
              text1,
              block2,
              text2,
              text3,
              paragraph2,
              text4,
              text5,
              block3,
              text6,
            ].map((n) => ({depth: n.getParentKeys().length, node: n.getKey()})),
          );
          // R, P2, B3, T6, T5, T4, P1, B2, T3, T2, B1, T1
          expect(reverseExpectedKeys).toEqual(
            [
              root,
              paragraph2,
              block3,
              text6,
              text5,
              text4,
              paragraph1,
              block2,
              text3,
              text2,
              block1,
              text1,
            ].map((n) => ({depth: n.getParentKeys().length, node: n.getKey()})),
          );
        });
      });

      test('DFS node order', async () => {
        const editor: LexicalEditor = testEnv.editor;
        editor.getEditorState().read(() => {
          const expectedNodes = expectedKeys.map(({depth, node: nodeKey}) => ({
            depth,
            node: $getNodeByKey(nodeKey)!.getLatest(),
          }));

          const first = expectedNodes[0];
          const second = expectedNodes[1];
          const last = expectedNodes[expectedNodes.length - 1];
          const secondToLast = expectedNodes[expectedNodes.length - 2];

          expect($dfs(first.node, last.node)).toEqual(expectedNodes);
          expect($dfs(second.node, secondToLast.node)).toEqual(
            expectedNodes.slice(1, expectedNodes.length - 1),
          );
          expect($dfs()).toEqual(expectedNodes);
          expect($dfs($getRoot())).toEqual(expectedNodes);
        });
      });

      test('Reverse DFS node order', async () => {
        const editor: LexicalEditor = testEnv.editor;
        editor.getEditorState().read(() => {
          const expectedNodes = reverseExpectedKeys.map(
            ({depth, node: nodeKey}) => ({
              depth,
              node: $getNodeByKey(nodeKey)!.getLatest(),
            }),
          );

          const first = expectedNodes[0];
          const second = expectedNodes[1];
          const last = expectedNodes[expectedNodes.length - 1];
          const secondToLast = expectedNodes[expectedNodes.length - 2];

          expect($reverseDfs(first.node, last.node)).toEqual(expectedNodes);
          expect($reverseDfs(second.node, secondToLast.node)).toEqual(
            expectedNodes.slice(1, expectedNodes.length - 1),
          );
          expect($reverseDfs()).toEqual(expectedNodes);
          expect($reverseDfs($getRoot())).toEqual(expectedNodes);
        });
      });

      test('DFS from middle leaf node should only include that node', async () => {
        const editor: LexicalEditor = testEnv.editor;
        editor.update(
          () => {
            const root = $getRoot();

            root
              .clear()
              .append(
                $createParagraphNode().append(
                  $createTextNode('Hello'),
                  $createTextNode('world').toggleFormat('bold'),
                  $createTextNode('!'),
                ),
              );

            const paragraph = root.getFirstChildOrThrow<ElementNode>();
            const children = paragraph.getChildren();
            expect($dfs(children[1])).toEqual([{depth: 2, node: children[1]}]);
          },
          {discrete: true},
        );
      });

      test("DFS starting at last child of element node should not include parent's siblings", async () => {
        const editor: LexicalEditor = testEnv.editor;
        editor.update(() => {
          const root = $getRoot();
          const p1 = $createParagraphNode().append(
            $createTextNode('Hello'),
            $createMarkNode().append(
              $createTextNode('world').toggleFormat('bold'),
            ),
          );
          const p2 = $createParagraphNode().append($createTextNode('!!'));

          root.clear().append(p1, p2);

          const markNode = p1.getChildAtIndex(1);
          invariant($isMarkNode(markNode), 'first child must be MarkNode');
          const textNodes = markNode.getChildren();
          expect($dfs(markNode)).toEqual([
            {depth: 2, node: markNode},
            {depth: 3, node: textNodes[0]},
          ]);
        });
      });
    });

    test('DFS triggers getLatest()', async () => {
      const editor: LexicalEditor = testEnv.editor;
      let rootKey: string;
      let paragraphKey: string;
      let block1Key: string;
      let block2Key: string;

      await editor.update(() => {
        const root = $getRoot();

        const paragraph = $createParagraphNode();
        const block1 = $createTestElementNode();
        const block2 = $createTestElementNode();

        rootKey = root.getKey();
        paragraphKey = paragraph.getKey();
        block1Key = block1.getKey();
        block2Key = block2.getKey();

        root.append(paragraph);
        paragraph.append(block1, block2);
      });

      await editor.update(() => {
        const root = $getNodeByKey(rootKey);
        const paragraph = $getNodeByKey(paragraphKey);
        const block1 = $getNodeByKey(block1Key);
        const block2 = $getNodeByKey(block2Key);

        const block3 = $createTestElementNode();
        invariant($isElementNode(block1));

        // this will (only) change the latest state of block1
        // all other nodes will be the same version
        block1.append(block3);

        expect($dfs(root!)).toEqual([
          {
            depth: 0,
            node: root!.getLatest(),
          },
          {
            depth: 1,
            node: paragraph!.getLatest(),
          },
          {
            depth: 2,
            node: block1.getLatest(),
          },
          {
            depth: 3,
            node: block3.getLatest(),
          },
          {
            depth: 2,
            node: block2!.getLatest(),
          },
        ]);
      });
    });

    test('reverse DFS triggers getLatest()', async () => {
      const editor: LexicalEditor = testEnv.editor;
      let rootKey: string;
      let paragraphKey: string;
      let block1Key: string;
      let block2Key: string;

      await editor.update(() => {
        const root = $getRoot();

        const paragraph = $createParagraphNode();
        const block1 = $createTestElementNode();
        const block2 = $createTestElementNode();

        rootKey = root.getKey();
        paragraphKey = paragraph.getKey();
        block1Key = block1.getKey();
        block2Key = block2.getKey();

        root.append(paragraph);
        paragraph.append(block1, block2);
      });

      await editor.update(() => {
        const root = $getNodeByKey(rootKey);
        const paragraph = $getNodeByKey(paragraphKey);
        const block1 = $getNodeByKey(block1Key);
        const block2 = $getNodeByKey(block2Key);

        const block3 = $createTestElementNode();
        invariant($isElementNode(block1));

        // this will (only) change the latest state of block1
        // all other nodes will be the same version
        block1.append(block3);

        expect($reverseDfs()).toEqual([
          {
            depth: 0,
            node: root!.getLatest(),
          },
          {
            depth: 1,
            node: paragraph!.getLatest(),
          },
          {
            depth: 2,
            node: block2!.getLatest(),
          },
          {
            depth: 2,
            node: block1.getLatest(),
          },
          {
            depth: 3,
            node: block3.getLatest(),
          },
        ]);
      });
    });

    test('DFS of empty ParagraphNode returns only itself', async () => {
      const editor: LexicalEditor = testEnv.editor;
      let paragraphKey: string;

      await editor.update(() => {
        const root = $getRoot();

        const paragraph = $createParagraphNode();
        const paragraph2 = $createParagraphNode();
        const text = $createTextNode('test');

        paragraphKey = paragraph.getKey();

        paragraph2.append(text);
        root.append(paragraph, paragraph2);
      });
      await editor.update(() => {
        const paragraph = $getNodeByKey(paragraphKey)!;

        expect($dfs(paragraph ?? undefined)).toEqual([
          {
            depth: 1,
            node: paragraph?.getLatest(),
          },
        ]);
      });
    });

    test('reverse DFS of empty ParagraphNode returns only itself', async () => {
      const editor: LexicalEditor = testEnv.editor;
      let paragraphKey: string;

      await editor.update(() => {
        const root = $getRoot();

        const paragraph = $createParagraphNode();
        const paragraph2 = $createParagraphNode();
        const text = $createTextNode('test');

        paragraphKey = paragraph.getKey();

        paragraph2.append(text);
        root.append(paragraph, paragraph2);
      });
      await editor.update(() => {
        const paragraph = $getNodeByKey(paragraphKey)!;

        expect($reverseDfs(paragraph, paragraph)).toEqual([
          {
            depth: 1,
            node: paragraph?.getLatest(),
          },
        ]);
      });
    });

    test('reverse DFS of empty RootNode returns only itself', async () => {
      const editor: LexicalEditor = testEnv.editor;

      await editor.update(() => {
        expect($reverseDfs()).toEqual([
          {
            depth: 0,
            node: $getRoot().getLatest(),
          },
        ]);
      });
    });

    test('$getNextSiblingOrParentSibling', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const paragraph2 = $createParagraphNode();
        const text1 = $createTextNode('text1');
        const text2 = $createTextNode('text2').toggleUnmergeable();
        paragraph.append(text1, text2);
        root.append(paragraph, paragraph2);

        // Sibling
        expect($getNextSiblingOrParentSibling(paragraph)).toEqual([
          paragraph2,
          0,
        ]);
        expect($getNextSiblingOrParentSibling(text1)).toEqual([text2, 0]);

        // Parent
        expect($getNextSiblingOrParentSibling(text2)).toEqual([paragraph2, -1]);

        // Null (end of the tree)
        expect($getNextSiblingOrParentSibling(paragraph2)).toBe(null);
      });
    });
  });
});
