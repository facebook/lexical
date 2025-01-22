/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $caretRangeFromSelection,
  $createParagraphNode,
  $createTextNode,
  $getBreadthCaret,
  $getDepthCaret,
  $getRoot,
  $isTextSliceCaret,
  BreadthNodeCaret,
  DepthNodeCaret,
  LexicalNode,
  RootNode,
  TextNode,
} from 'lexical';

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
    describe('$caretRangeFromSelection', () => {
      test('collapsed text point selection', async () => {
        await testEnv.editor.update(() => {
          const textNodes = ['first', 'second', 'third'].map((text) =>
            $createTextNode(text).setMode('token'),
          );
          $getRoot()
            .clear()
            .append($createParagraphNode().append(...textNodes));
          const node = textNodes[1];
          const cases = [
            [() => node.selectStart(), 0],
            [() => node.selectEnd(), node.getTextContentSize()],
            [() => node.select(3, 3), 3],
          ] as const;
          for (const [$makeSelection, offset] of cases) {
            const key = node.getKey();
            const selection = $makeSelection();
            expect(selection).toMatchObject({
              anchor: {key, offset, type: 'text'},
              focus: {key, offset, type: 'text'},
            });
            const range = $caretRangeFromSelection(selection);
            expect(range.isCollapsed()).toBe(true);
            invariant(
              $isTextSliceCaret(range.anchor),
              '$isTextSliceCaret(range.anchor)',
            );
            invariant(
              $isTextSliceCaret(range.focus),
              '$isTextSliceCaret(range.anchor)',
            );
            expect(range).toMatchObject({
              anchor: {
                direction: 'next',
                indexEnd: textNodes[1].getTextContentSize(),
                indexStart: offset,
              },
              focus: {
                direction: 'next',
                indexEnd: offset,
                indexStart: 0,
              },
            });
            expect(range.textSliceCarets()).toMatchObject([
              {
                direction: 'next',
                indexEnd: offset,
                indexStart: offset,
                origin: node,
                type: 'breadth',
              },
            ]);
            expect(range.nonEmptyTextSliceCarets()).toEqual([]);
            expect([...range.internalCarets('root')]).toEqual([]);
          }
        });
      });
      test('full text node selection', async () => {
        await testEnv.editor.update(() => {
          const textNodes = ['first', 'second', 'third'].map((text) =>
            $createTextNode(text).setMode('token'),
          );
          $getRoot()
            .clear()
            .append($createParagraphNode().append(...textNodes));
          for (const direction of ['next', 'previous'] as const) {
            for (const node of textNodes) {
              const key = node.getKey();
              const size = node.getTextContentSize();
              const [anchorOffset, focusOffset] =
                direction === 'next' ? [0, size] : [size, 0];
              const selection = node.select(anchorOffset, focusOffset);
              expect(selection).toMatchObject({
                anchor: {key, offset: anchorOffset, type: 'text'},
                focus: {key, offset: focusOffset, type: 'text'},
              });
              const range = $caretRangeFromSelection(selection);
              invariant(
                $isTextSliceCaret(range.anchor),
                '$isTextSliceCaret(range.anchor)',
              );
              invariant(
                $isTextSliceCaret(range.focus),
                '$isTextSliceCaret(range.anchor)',
              );
              const pt = (offset: number, anchorOrFocus: 'anchor' | 'focus') =>
                (direction === 'next') === (anchorOrFocus === 'anchor')
                  ? {indexEnd: size, indexStart: offset}
                  : {indexEnd: offset, indexStart: 0};
              expect(range).toMatchObject({
                anchor: pt(anchorOffset, 'anchor'),
                direction,
                focus: pt(focusOffset, 'focus'),
              });
              expect(range.textSliceCarets()).toMatchObject([
                {
                  indexEnd: size,
                  indexStart: 0,
                  origin: node,
                },
              ]);
              expect([...range.internalCarets('root')]).toEqual([]);
              expect(range.isCollapsed()).toBe(false);
            }
          }
        });
      });
      test('single text node non-empty selection', async () => {
        await testEnv.editor.update(() => {
          const textNodes = ['first', 'second', 'third'].map((text) =>
            $createTextNode(text).setMode('token'),
          );
          $getRoot()
            .clear()
            .append($createParagraphNode().append(...textNodes));
          for (const node of textNodes) {
            // Test all non-empty selections
            const size = node.getTextContentSize();
            for (let indexStart = 0; indexStart < size; indexStart++) {
              for (
                let indexEnd = indexStart + 1;
                indexEnd <= size;
                indexEnd++
              ) {
                for (const direction of ['next', 'previous'] as const) {
                  const selection =
                    direction === 'next'
                      ? node.select(indexStart, indexEnd)
                      : node.select(indexEnd, indexStart);
                  const range = $caretRangeFromSelection(selection);
                  invariant(
                    $isTextSliceCaret(range.anchor),
                    '$isTextSliceCaret(range.anchor)',
                  );
                  invariant(
                    $isTextSliceCaret(range.focus),
                    '$isTextSliceCaret(range.anchor)',
                  );
                  expect(range.direction).toBe(direction);
                  expect(range.textSliceCarets()).toMatchObject([
                    {indexEnd, indexStart, origin: node},
                  ]);
                  expect([...range.internalCarets('root')]).toMatchObject([]);
                }
              }
            }
          }
        });
      });
      test('multiple text node non-empty selection', async () => {
        await testEnv.editor.update(() => {
          const textNodes = ['first', 'second', 'third'].map((text) =>
            $createTextNode(text).setMode('token'),
          );
          $getRoot()
            .clear()
            .append($createParagraphNode().append(...textNodes));
          const selection = $getRoot().select();

          // test all start and end nodes (where different)
          const nodeCount = textNodes.length;
          for (
            let indexNodeStart = 0;
            indexNodeStart < nodeCount;
            indexNodeStart++
          ) {
            for (
              let indexNodeEnd = indexNodeStart + 1;
              indexNodeEnd < nodeCount;
              indexNodeEnd++
            ) {
              const startNode = textNodes[indexNodeStart]!;
              const endNode = textNodes[indexNodeEnd]!;
              for (const indexStart of [0, 1, startNode.getTextContentSize()]) {
                for (const indexEnd of [0, 1, endNode.getTextContentSize()]) {
                  for (const direction of ['next', 'previous'] as const) {
                    const [anchorNode, anchorOffset, focusNode, focusOffset] =
                      direction === 'next'
                        ? [startNode, indexStart, endNode, indexEnd]
                        : [endNode, indexEnd, startNode, indexStart];
                    selection.setTextNodeRange(
                      anchorNode,
                      anchorOffset,
                      focusNode,
                      focusOffset,
                    );
                    const range = $caretRangeFromSelection(selection);
                    invariant(
                      $isTextSliceCaret(range.anchor),
                      '$isTextSliceCaret(range.anchor)',
                    );
                    invariant(
                      $isTextSliceCaret(range.focus),
                      '$isTextSliceCaret(range.anchor)',
                    );
                    expect(range.direction).toBe(direction);
                    const textSliceCarets = range.textSliceCarets();
                    expect(textSliceCarets).toHaveLength(2);
                    const [anchorSlice, focusSlice] = textSliceCarets;
                    expect(anchorSlice).toMatchObject({
                      direction,
                      indexEnd:
                        direction === 'next'
                          ? anchorNode.getTextContentSize()
                          : anchorOffset,
                      indexStart: direction === 'next' ? anchorOffset : 0,
                      origin: anchorNode,
                      type: 'breadth',
                    });
                    expect(focusSlice).toMatchObject({
                      direction,
                      indexEnd:
                        direction === 'next'
                          ? focusOffset
                          : focusNode.getTextContentSize(),
                      indexStart: direction === 'next' ? 0 : focusOffset,
                      origin: focusNode,
                      type: 'breadth',
                    });
                    expect([...range.internalCarets('root')]).toMatchObject(
                      textNodes
                        .slice(indexNodeStart + 1, indexNodeEnd)
                        .map((origin) => ({
                          direction,
                          origin,
                          type: 'breadth',
                        })),
                    );
                  }
                }
              }
            }
          }
        });
      });
    });
  });
});
