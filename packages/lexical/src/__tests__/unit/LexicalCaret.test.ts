/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getBreadthCaret,
  $getRoot,
  BreadthNodeCaret,
  DepthNodeCaret,
  LexicalNode,
  RootNode,
  TextNode,
} from 'lexical';

import {$getDepthCaret} from '../..';
import {initializeUnitTest, invariant} from '../utils';

describe('LexicalCaret', () => {
  initializeUnitTest((testEnv) => {
    describe('$getDepthCaret', () => {
      for (const direction of ['next', 'previous'] as const) {
        test(`direction ${direction}`, async () => {
          await testEnv.editor.update(
            () => {
              const paragraph = $createParagraphNode();
              const root = $getRoot();
              root.clear().append(paragraph);
              // Note that the type declarations here would normally be inferred, these are
              // used just to demonstrate that inference is working as expected
              const caret: DepthNodeCaret<RootNode, typeof direction> =
                $getDepthCaret(root, direction);
              expect(root.is(caret.origin)).toBe(true);
              expect(caret.direction).toBe(direction);
              expect(caret.type).toBe('depth');
              expect(paragraph.is(caret.getNodeAtCaret())).toBe(true);
              expect(root.is(caret.getParentAtCaret())).toBe(true);

              const flipped = caret.getFlipped();
              expect(flipped).not.toBe(caret);
              expect(flipped.getFlipped().is(caret)).toBe(true);
              expect(flipped.direction).not.toBe(direction);
              expect(flipped.type).toBe('breadth');
              expect(flipped.getNodeAtCaret()).toBe(null);
              expect(flipped.getAdjacentCaret()).toBe(null);
              for (const mode of ['root', 'shadowRoot'] as const) {
                expect(caret.getParentCaret(mode)).toBe(null);
                expect(flipped.getParentCaret(mode)).toBe(null);
              }
              const adjacent: BreadthNodeCaret<
                LexicalNode,
                typeof direction
              > | null = caret.getAdjacentCaret();
              invariant(
                adjacent !== null,
                'depth caret of a non-empty element must always have an adjacent caret',
              );
              expect(paragraph.is(adjacent.origin)).toBe(true);
              expect(adjacent.type).toBe('breadth');
              expect(adjacent.getAdjacentCaret()).toBe(null);

              expect(root.getChildrenSize()).toBe(1);
              caret.remove();
              expect(root.isEmpty()).toBe(true);
              caret.replaceOrInsert(paragraph);
              expect(root.getChildrenSize()).toBe(1);
              caret.remove();
              caret.insert(paragraph);
              expect(root.getChildrenSize()).toBe(1);

              // When direction === 'next' we are prepending the second node, otherwise we are appending it
              const secondParagraph = $createParagraphNode();
              caret.insert(secondParagraph);
              expect(root.getChildrenSize()).toBe(2);
              const paragraphKeys = [
                paragraph.getKey(),
                secondParagraph.getKey(),
              ];
              expect(root.getChildrenKeys()).toEqual(
                direction === 'next'
                  ? [...paragraphKeys].reverse()
                  : paragraphKeys,
              );

              caret.splice(2, []);
              expect(root.getChildrenSize()).toBe(0);
              caret.splice(0, [paragraph, secondParagraph]);
              expect(root.getChildrenKeys()).toEqual(paragraphKeys);
              caret.splice(0, [secondParagraph, paragraph]);
              expect(root.getChildrenKeys()).toEqual(
                [...paragraphKeys].reverse(),
              );
              caret.splice(0, [paragraph, secondParagraph]);
              expect(root.getChildrenKeys()).toEqual(paragraphKeys);
              caret.splice(2, [secondParagraph, paragraph]);
              expect(root.getChildrenKeys()).toEqual(
                [...paragraphKeys].reverse(),
              );
              caret.splice(2, [paragraph, secondParagraph]);
              expect(root.getChildrenKeys()).toEqual(paragraphKeys);
              caret.splice(20, [paragraph]);
              expect(root.getChildrenKeys()).toEqual([paragraph.getKey()]);
              caret.splice(-1, [secondParagraph]);
              expect(root.getChildrenKeys()).toEqual(
                direction === 'next'
                  ? [...paragraphKeys].reverse()
                  : paragraphKeys,
              );
              caret.splice(Infinity, [paragraph, secondParagraph], direction);
              expect(root.getChildrenKeys()).toEqual(
                direction === 'next'
                  ? paragraphKeys
                  : [...paragraphKeys].reverse(),
              );

              expect(
                Array.from(caret, (nextCaret) => nextCaret.origin.getKey()),
              ).toEqual(
                direction === 'next'
                  ? root.getChildrenKeys()
                  : [...root.getChildrenKeys()].reverse(),
              );
            },
            {discrete: true},
          );
        });
      }
    });
    describe('$getBreadthCaret', () => {
      for (const direction of ['next', 'previous'] as const) {
        test(`direction ${direction}`, async () => {
          await testEnv.editor.update(
            () => {
              const paragraph = $createParagraphNode();
              const tokens = ['-2', '-1', '0', '1', '2'].map((text) =>
                $createTextNode(text).setMode('token'),
              );
              const root = $getRoot();
              root.clear().append(paragraph.append(...tokens));
              const ZERO_INDEX = 2;
              const zToken = tokens[ZERO_INDEX];
              const nextToken =
                direction === 'next'
                  ? zToken.getNextSibling()
                  : zToken.getPreviousSibling();
              invariant(nextToken !== null, 'nextToken must exist');
              // Note that the type declarations here would normally be inferred, these are
              // used just to demonstrate that inference is working as expected
              const caret: BreadthNodeCaret<TextNode, typeof direction> =
                $getBreadthCaret(zToken, direction);
              expect(zToken.is(caret.origin)).toBe(true);
              expect(caret.direction).toBe(direction);
              expect(caret.type).toBe('breadth');
              expect(nextToken.is(caret.getNodeAtCaret())).toBe(true);
              expect(paragraph.is(caret.getParentAtCaret())).toBe(true);

              expect(
                Array.from(
                  caret,
                  (nextCaret) =>
                    (direction === 'next' ? 1 : -1) *
                    +nextCaret.origin.getTextContent(),
                ),
              ).toEqual([1, 2]);

              const flipped = caret.getFlipped();
              expect(flipped).not.toBe(caret);
              expect(flipped.getFlipped().is(caret));
              expect(flipped.origin.is(caret.getNodeAtCaret())).toBe(true);
              expect(flipped.direction).not.toBe(direction);
              expect(flipped.type).toBe('breadth');
              expect(zToken.is(flipped.getNodeAtCaret())).toBe(true);
              const flippedAdjacent = flipped.getAdjacentCaret();
              invariant(
                flippedAdjacent !== null,
                'A flipped BreadthNode always has an adjacent caret because it points back to the origin',
              );
              expect(flippedAdjacent.origin.is(caret.origin)).toBe(true);

              for (const mode of ['root', 'shadowRoot'] as const) {
                expect(
                  $getBreadthCaret(paragraph, caret.direction).is(
                    caret.getParentCaret(mode),
                  ),
                ).toBe(true);
                expect(
                  $getBreadthCaret(paragraph, flipped.direction).is(
                    flipped.getParentCaret(mode),
                  ),
                ).toBe(true);
              }

              const adjacent: BreadthNodeCaret<
                LexicalNode,
                typeof direction
              > | null = caret.getAdjacentCaret();
              invariant(adjacent !== null, 'expecting adjacent caret');
              const offset = direction === 'next' ? 1 : -1;
              expect(tokens[ZERO_INDEX + offset].is(adjacent.origin)).toBe(
                true,
              );
              expect(adjacent.type).toBe('breadth');
              expect(adjacent.origin.getTextContent()).toBe(String(offset));

              expect(tokens[ZERO_INDEX + offset].isAttached()).toBe(true);
              expect(
                tokens[ZERO_INDEX + offset].is(caret.getNodeAtCaret()),
              ).toBe(true);
              expect(
                tokens[ZERO_INDEX + offset].is(caret.getNodeAtCaret()),
              ).toBe(true);
              expect(paragraph.getChildrenSize()).toBe(tokens.length);
              caret.remove();
              expect(paragraph.getChildrenSize()).toBe(tokens.length - 1);
              expect(tokens[ZERO_INDEX + offset].isAttached()).toBe(false);
              expect(
                tokens[ZERO_INDEX + 2 * offset].is(caret.getNodeAtCaret()),
              ).toBe(true);
              expect(
                Array.from(
                  caret,
                  (nextCaret) =>
                    (direction === 'next' ? 1 : -1) *
                    +nextCaret.origin.getTextContent(),
                ),
              ).toEqual([2]);
              expect(
                paragraph
                  .getLatest()
                  .getChildren()
                  .map((node) => node.getTextContent()),
              ).toEqual(
                tokens
                  .map((n) => n.getTextContent())
                  .filter((t) => t !== String(offset)),
              );
              caret.insert(tokens[ZERO_INDEX + offset]);
              expect(
                paragraph
                  .getLatest()
                  .getChildren()
                  .map((node) => node.getTextContent()),
              ).toEqual(tokens.map((n) => n.getTextContent()));
              caret.replaceOrInsert(tokens[ZERO_INDEX + offset]);
              expect(
                paragraph
                  .getLatest()
                  .getChildren()
                  .map((node) => node.getTextContent()),
              ).toEqual(tokens.map((n) => n.getTextContent()));

              caret.replaceOrInsert($createTextNode('replaced!'));
              expect(
                paragraph
                  .getLatest()
                  .getChildren()
                  .map((node) => node.getTextContent()),
              ).toEqual(
                tokens.map((n, i) =>
                  i === ZERO_INDEX + offset ? 'replaced!' : n.getTextContent(),
                ),
              );
              caret.replaceOrInsert(tokens[ZERO_INDEX + offset]);

              const abNodes = ['a', 'b'].map((t) => $createTextNode(t));
              caret.splice(0, abNodes);
              expect(
                paragraph
                  .getLatest()
                  .getChildren()
                  .map((node) => node.getTextContent()),
              ).toEqual(
                tokens.flatMap((n, i) => {
                  if (i !== ZERO_INDEX) {
                    return [n.getTextContent()];
                  } else if (direction === 'next') {
                    return ['0', 'a', 'b'];
                  } else {
                    return ['a', 'b', '0'];
                  }
                }),
              );
              abNodes.forEach((n) => n.remove());

              caret.splice(0, abNodes, 'previous');
              expect(
                paragraph
                  .getLatest()
                  .getChildren()
                  .map((node) => node.getTextContent()),
              ).toEqual(
                tokens.flatMap((n, i) => {
                  if (i !== ZERO_INDEX) {
                    return [n.getTextContent()];
                  } else if (direction === 'next') {
                    return ['0', 'b', 'a'];
                  } else {
                    return ['b', 'a', '0'];
                  }
                }),
              );
              abNodes.forEach((n) => n.remove());

              caret.splice(1, abNodes);
              expect(
                paragraph
                  .getLatest()
                  .getChildren()
                  .map((node) => node.getTextContent()),
              ).toEqual(
                tokens.flatMap((n, i) => {
                  if (i === ZERO_INDEX + offset) {
                    return [];
                  } else if (i !== ZERO_INDEX) {
                    return [n.getTextContent()];
                  } else if (direction === 'next') {
                    return ['0', 'a', 'b'];
                  } else {
                    return ['a', 'b', '0'];
                  }
                }),
              );
              paragraph.clear().append(...tokens);

              caret.splice(1, abNodes.slice(0, 1));
              expect(
                paragraph
                  .getLatest()
                  .getChildren()
                  .map((node) => node.getTextContent()),
              ).toEqual(
                tokens.map((n, i) =>
                  i === ZERO_INDEX + offset ? 'a' : n.getTextContent(),
                ),
              );
              paragraph.clear().append(...tokens);

              caret.splice(2, abNodes.slice(0, 1));
              expect(
                paragraph
                  .getLatest()
                  .getChildren()
                  .map((node) => node.getTextContent()),
              ).toEqual(
                direction === 'next'
                  ? ['-2', '-1', '0', 'a']
                  : ['a', '0', '1', '2'],
              );
              paragraph.clear().append(...tokens);

              caret.splice(Infinity, abNodes);
              expect(
                paragraph
                  .getLatest()
                  .getChildren()
                  .map((node) => node.getTextContent()),
              ).toEqual(
                direction === 'next'
                  ? ['-2', '-1', '0', 'a', 'b']
                  : ['a', 'b', '0', '1', '2'],
              );
              paragraph.clear().append(...tokens);
            },
            {discrete: true},
          );
        });
      }
    });
  });
});
