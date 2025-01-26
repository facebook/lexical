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
  $isTextNode,
  $isTextNodeCaret,
  $removeTextFromCaretRange,
  $rewindBreadthCaret,
  $setPointFromCaret,
  BreadthNodeCaret,
  DepthNodeCaret,
  LexicalNode,
  RootNode,
  TextNode,
} from 'lexical';

import {initializeUnitTest, invariant} from '../utils';

const DIRECTIONS = ['next', 'previous'] as const;
const BIASES = ['inside', 'outside'] as const;

describe('LexicalCaret', () => {
  initializeUnitTest((testEnv) => {
    describe('$getDepthCaret', () => {
      for (const direction of DIRECTIONS) {
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
      for (const direction of DIRECTIONS) {
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
              $isTextNodeCaret(range.anchor),
              '$isTextNodeCaret(range.anchor)',
            );
            invariant(
              $isTextNodeCaret(range.focus),
              '$isTextNodeCaret(range.anchor)',
            );
            expect(range).toMatchObject({
              anchor: {
                direction: 'next',
                offset,
              },
              focus: {
                direction: 'next',
                offset,
              },
            });
            expect(range.getTextSlices()).toMatchObject([
              {
                caret: {
                  direction: 'next',
                  offset,
                  origin: node,
                  type: 'breadth',
                },
                size: 0,
              },
            ]);
            expect(range.getNonEmptyTextSlices()).toEqual([]);
            expect([...range.internalCarets('root')]).toEqual([]);
          }
        });
      });
      for (const direction of DIRECTIONS) {
        test(`full text node selection (${direction})`, async () => {
          await testEnv.editor.update(() => {
            const textNodes = ['first', 'second', 'third'].map((text) =>
              $createTextNode(text).setMode('token'),
            );
            $getRoot()
              .clear()
              .append($createParagraphNode().append(...textNodes));
            for (const node of textNodes) {
              const key = node.getKey();
              const textSize = node.getTextContentSize();
              const [anchorOffset, focusOffset] =
                direction === 'next' ? [0, textSize] : [textSize, 0];
              const selection = node.select(anchorOffset, focusOffset);
              expect(selection).toMatchObject({
                anchor: {key, offset: anchorOffset, type: 'text'},
                focus: {key, offset: focusOffset, type: 'text'},
              });
              const range = $caretRangeFromSelection(selection);
              invariant(
                $isTextNodeCaret(range.anchor),
                '$isTextNodeCaret(range.anchor)',
              );
              invariant(
                $isTextNodeCaret(range.focus),
                '$isTextNodeCaret(range.anchor)',
              );
              expect(range).toMatchObject({
                anchor: {direction, offset: anchorOffset, origin: node},
                direction,
                focus: {direction, offset: focusOffset, origin: node},
              });
              expect(range.getTextSlices()).toMatchObject([
                {
                  caret: {
                    direction,
                    offset: anchorOffset,
                    origin: node,
                  },
                  size: focusOffset - anchorOffset,
                },
              ]);
              expect([...range.internalCarets('root')]).toEqual([]);
              expect(range.isCollapsed()).toBe(false);
            }
          });
        });
      }
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
            const textSize = node.getTextContentSize();
            for (let indexStart = 0; indexStart < textSize; indexStart++) {
              for (
                let indexEnd = indexStart + 1;
                indexEnd <= textSize;
                indexEnd++
              ) {
                for (const direction of DIRECTIONS) {
                  const [offset, size] =
                    direction === 'next'
                      ? [indexStart, indexEnd - indexStart]
                      : [indexEnd, indexStart - indexEnd];
                  const selection =
                    direction === 'next'
                      ? node.select(indexStart, indexEnd)
                      : node.select(indexEnd, indexStart);
                  const range = $caretRangeFromSelection(selection);
                  invariant(
                    $isTextNodeCaret(range.anchor),
                    '$isTextNodeCaret(range.anchor)',
                  );
                  invariant(
                    $isTextNodeCaret(range.focus),
                    '$isTextNodeCaret(range.anchor)',
                  );
                  expect(range.direction).toBe(direction);
                  expect(range.getTextSlices()).toMatchObject([
                    {caret: {direction, offset, origin: node}, size},
                  ]);
                  expect([...range.internalCarets('root')]).toMatchObject([]);
                }
              }
            }
          }
        });
      });
      for (const direction of DIRECTIONS) {
        test(`multiple text node non-empty selection (${direction})`, async () => {
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
                for (const indexStart of [
                  0,
                  1,
                  startNode.getTextContentSize(),
                ]) {
                  for (const indexEnd of [0, 1, endNode.getTextContentSize()]) {
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
                      $isTextNodeCaret(range.anchor),
                      '$isTextNodeCaret(range.anchor)',
                    );
                    invariant(
                      $isTextNodeCaret(range.focus),
                      '$isTextNodeCaret(range.anchor)',
                    );
                    expect(range.direction).toBe(direction);
                    const textSliceCarets = range.getTextSlices();
                    expect(textSliceCarets).toHaveLength(2);
                    const [anchorSlice, focusSlice] = textSliceCarets;
                    expect(anchorSlice).toMatchObject({
                      caret: {
                        direction,
                        offset: anchorOffset,
                        origin: anchorNode,
                        type: 'breadth',
                      },
                      size:
                        direction === 'next'
                          ? anchorNode.getTextContentSize() - anchorOffset
                          : 0 - anchorOffset,
                    });
                    expect(focusSlice).toMatchObject({
                      caret: {
                        direction,
                        offset: focusOffset,
                        origin: focusNode,
                        type: 'breadth',
                      },
                      size:
                        direction === 'next'
                          ? 0 - focusOffset
                          : focusNode.getTextContentSize() - focusOffset,
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
          });
        });
      }
    });
    describe('$removeTextFromCaretRange', () => {
      const texts = ['first', 'second', 'third'] as const;
      beforeEach(async () => {
        await testEnv.editor.update(() => {
          // Ensure that the separate texts don't get merged
          const textNodes = texts.map((text) =>
            $createTextNode(text).setStyle(`color: --color-${text}`),
          );
          $getRoot()
            .clear()
            .append($createParagraphNode().append(...textNodes));
        });
      });
      test('collapsed text point selection', async () => {
        await testEnv.editor.update(() => {
          const textNodes = $getRoot().getAllTextNodes();
          const originalText = $getRoot().getTextContent();
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
              $isTextNodeCaret(range.anchor),
              '$isTextNodeCaret(range.anchor)',
            );
            invariant(
              $isTextNodeCaret(range.focus),
              '$isTextNodeCaret(range.anchor)',
            );
            const originalRangeMatch = {
              anchor: {
                direction: 'next',
                offset,
              },
              focus: {
                direction: 'next',
                offset,
              },
            } as const;
            expect(range).toMatchObject(originalRangeMatch);
            expect(range.getTextSlices()).toMatchObject([
              {
                caret: {
                  direction: 'next',
                  offset,
                  origin: node,
                  type: 'breadth',
                },
                size: 0,
              },
            ]);
            expect(range.getNonEmptyTextSlices()).toEqual([]);
            expect([...range.internalCarets('root')]).toEqual([]);
            expect($removeTextFromCaretRange(range)).toMatchObject(
              originalRangeMatch,
            );
            expect($getRoot().getTextContent()).toEqual(originalText);
          }
        });
      });
      describe('full text node internal selection', () => {
        for (const direction of DIRECTIONS) {
          texts.forEach((text, i) => {
            test(`${text} node (${direction})`, async () => {
              await testEnv.editor.update(() => {
                const originalNodes = $getRoot().getAllTextNodes();
                const [node] = originalNodes.splice(i, 1);
                invariant($isTextNode(node), `Missing TextNode ${i}`);
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
                  $isTextNodeCaret(range.anchor),
                  '$isTextNodeCaret(range.anchor)',
                );
                invariant(
                  $isTextNodeCaret(range.focus),
                  '$isTextNodeCaret(range.anchor)',
                );
                expect(range).toMatchObject({
                  anchor: {offset: anchorOffset, origin: node},
                  direction,
                  focus: {offset: focusOffset, origin: node},
                });
                expect(range.getTextSlices()).toMatchObject([
                  {
                    caret: {
                      offset:
                        direction === 'next' ? 0 : node.getTextContentSize(),
                      origin: node,
                    },
                    size:
                      (direction === 'next' ? 1 : -1) *
                      node.getTextContentSize(),
                  },
                ]);
                expect([...range.internalCarets('root')]).toEqual([]);
                expect(range.isCollapsed()).toBe(false);
                const resultRange = $removeTextFromCaretRange(range);
                const remainingNodes = $getRoot().getAllTextNodes();
                expect(remainingNodes).toEqual(
                  originalNodes.map((n) => n.getLatest()),
                );
                expect(remainingNodes.map((n) => n.getTextContent())).toEqual(
                  texts.filter((_v, j) => j !== i),
                );
                expect(resultRange.isCollapsed()).toBe(true);
                // bias towards the anchor
                const adjacentIndex = Math.min(
                  remainingNodes.length - 1,
                  Math.max(0, i + (direction === 'next' ? -1 : 0)),
                );
                const newOrigin = remainingNodes[adjacentIndex];
                const offset =
                  direction === 'next'
                    ? i === 0
                      ? 0
                      : newOrigin.getTextContentSize()
                    : i === texts.length - 1
                    ? newOrigin.getTextContentSize()
                    : 0;
                const pt = {
                  direction,
                  offset,
                  origin: newOrigin,
                  type: 'breadth',
                };
                expect(resultRange).toMatchObject({
                  anchor: pt,
                  direction,
                  focus: pt,
                  type: 'node-caret-range',
                });
              });
            });
          });
        }
      });
      describe('full text node biased selection', () => {
        for (const [direction, [anchorBias, focusBias]] of combinations(
          DIRECTIONS,
          combinations(BIASES, BIASES),
        )) {
          if (anchorBias === 'inside' && focusBias === 'inside') {
            // These cases are tested above
            continue;
          }
          texts.forEach((text, i) => {
            test(`${text} node (${direction} ${anchorBias} ${focusBias})`, async () => {
              await testEnv.editor.update(() => {
                const originalNodes = $getRoot().getAllTextNodes();
                const [node] = originalNodes.splice(i, 1);
                invariant($isTextNode(node), `Missing TextNode ${i}`);
                const size = node.getTextContentSize();
                const [anchorOffset, focusOffset] =
                  direction === 'next' ? [0, size] : [size, 0];
                // Create the inside selection, will mutate for outside
                const selection = node.select(anchorOffset, focusOffset);
                const nodeCaret = $getBreadthCaret(node, direction);
                if (anchorBias === 'outside') {
                  $setPointFromCaret(
                    selection.anchor,
                    $rewindBreadthCaret(nodeCaret),
                  );
                  if (direction === 'next') {
                    if (i === 0) {
                      expect(selection.anchor).toMatchObject({
                        key: node.getParentOrThrow().getKey(),
                        offset: 0,
                        type: 'element',
                      });
                    } else {
                      const adj = originalNodes[i - 1]!;
                      expect(selection.anchor).toMatchObject({
                        key: adj.getKey(),
                        offset: adj.getTextContentSize(),
                        type: 'text',
                      });
                    }
                  } else {
                    if (i === texts.length - 1) {
                      const parent = node.getParentOrThrow();
                      expect(selection.anchor).toMatchObject({
                        key: parent.getKey(),
                        offset: parent.getChildrenSize(),
                        type: 'element',
                      });
                    } else {
                      const adj = originalNodes[i]!;
                      expect(selection.anchor).toMatchObject({
                        key: adj.getKey(),
                        offset: 0,
                        type: 'text',
                      });
                    }
                  }
                }
                if (focusBias === 'outside') {
                  $setPointFromCaret(
                    selection.focus,
                    $getBreadthCaret(node, direction).getFlipped(),
                  );
                  if (direction === 'next') {
                    if (i === texts.length - 1) {
                      const parent = node.getParentOrThrow();
                      expect(selection.focus).toMatchObject({
                        key: parent.getKey(),
                        offset: parent.getChildrenSize(),
                        type: 'element',
                      });
                    } else {
                      const adj = originalNodes[i]!;
                      expect(selection.focus).toMatchObject({
                        key: adj.getKey(),
                        offset: 0,
                        type: 'text',
                      });
                    }
                  } else {
                    if (i === 0) {
                      const parent = node.getParentOrThrow();
                      expect(selection.focus).toMatchObject({
                        key: parent.getKey(),
                        offset: 0,
                        type: 'element',
                      });
                    } else {
                      const adj = originalNodes[i - 1]!;
                      expect(selection.focus).toMatchObject({
                        key: adj.getKey(),
                        offset: adj.getTextContentSize(),
                        type: 'text',
                      });
                    }
                  }
                }
                const range = $caretRangeFromSelection(selection);
                expect(range.isCollapsed()).toBe(false);
                expect([...range.internalCarets('root')].length).toBe(
                  anchorBias === 'outside' && focusBias === 'outside' ? 1 : 0,
                );
                expect(range.getNonEmptyTextSlices()).toMatchObject(
                  anchorBias === 'outside' && focusBias === 'outside'
                    ? []
                    : (anchorBias === 'inside') === (direction === 'next')
                    ? [{caret: {offset: 0}, size}]
                    : [{caret: {offset: size}, size: -size}],
                );
                const resultRange = $removeTextFromCaretRange(range);
                const remainingNodes = $getRoot().getAllTextNodes();
                expect(remainingNodes.map((n) => n.getTextContent())).toEqual(
                  texts.filter((_v, j) => j !== i),
                );
                expect(remainingNodes).toEqual(
                  originalNodes.map((n) => n.getLatest()),
                );
                expect(resultRange.isCollapsed()).toBe(true);
                // bias towards the anchor
                const adjacentIndex = Math.min(
                  remainingNodes.length - 1,
                  Math.max(0, i + (direction === 'next' ? -1 : 0)),
                );
                const newOrigin = remainingNodes[adjacentIndex];
                const offset =
                  (direction === 'next' && i !== 0) ||
                  (direction === 'previous' && i === texts.length - 1)
                    ? newOrigin.getTextContentSize()
                    : 0;
                expect(resultRange).toMatchObject({
                  anchor: {
                    direction,
                    offset,
                    origin: newOrigin,
                    type: 'breadth',
                  },
                  direction,
                  focus: {
                    direction,
                    offset,
                    origin: newOrigin,
                    type: 'breadth',
                  },
                  type: 'node-caret-range',
                });
              });
            });
          });
        }
      });

      // test('single text node non-empty selection', async () => {
      //   await testEnv.editor.update(() => {
      //     const textNodes = ['first', 'second', 'third'].map((text) =>
      //       $createTextNode(text).setMode('token'),
      //     );
      //     $getRoot()
      //       .clear()
      //       .append($createParagraphNode().append(...textNodes));
      //     for (const node of textNodes) {
      //       // Test all non-empty selections
      //       const size = node.getTextContentSize();
      //       for (let indexStart = 0; indexStart < size; indexStart++) {
      //         for (
      //           let indexEnd = indexStart + 1;
      //           indexEnd <= size;
      //           indexEnd++
      //         ) {
      //           for (const direction of DIRECTIONS) {
      //             const selection =
      //               direction === 'next'
      //                 ? node.select(indexStart, indexEnd)
      //                 : node.select(indexEnd, indexStart);
      //             const range = $caretRangeFromSelection(selection);
      //             invariant(
      //               $isTextSliceCaret(range.anchor),
      //               '$isTextSliceCaret(range.anchor)',
      //             );
      //             invariant(
      //               $isTextSliceCaret(range.focus),
      //               '$isTextSliceCaret(range.anchor)',
      //             );
      //             expect(range.direction).toBe(direction);
      //             expect(range.textSliceCarets()).toMatchObject([
      //               {indexEnd, indexStart, origin: node},
      //             ]);
      //             expect([...range.internalCarets('root')]).toMatchObject([]);
      //           }
      //         }
      //       }
      //     }
      //   });
      // });
      // test('multiple text node non-empty selection', async () => {
      //   await testEnv.editor.update(() => {
      //     const textNodes = ['first', 'second', 'third'].map((text) =>
      //       $createTextNode(text).setMode('token'),
      //     );
      //     $getRoot()
      //       .clear()
      //       .append($createParagraphNode().append(...textNodes));
      //     const selection = $getRoot().select();

      //     // test all start and end nodes (where different)
      //     const nodeCount = textNodes.length;
      //     for (
      //       let indexNodeStart = 0;
      //       indexNodeStart < nodeCount;
      //       indexNodeStart++
      //     ) {
      //       for (
      //         let indexNodeEnd = indexNodeStart + 1;
      //         indexNodeEnd < nodeCount;
      //         indexNodeEnd++
      //       ) {
      //         const startNode = textNodes[indexNodeStart]!;
      //         const endNode = textNodes[indexNodeEnd]!;
      //         for (const indexStart of [0, 1, startNode.getTextContentSize()]) {
      //           for (const indexEnd of [0, 1, endNode.getTextContentSize()]) {
      //             for (const direction of DIRECTIONS) {
      //               const [anchorNode, anchorOffset, focusNode, focusOffset] =
      //                 direction === 'next'
      //                   ? [startNode, indexStart, endNode, indexEnd]
      //                   : [endNode, indexEnd, startNode, indexStart];
      //               selection.setTextNodeRange(
      //                 anchorNode,
      //                 anchorOffset,
      //                 focusNode,
      //                 focusOffset,
      //               );
      //               const range = $caretRangeFromSelection(selection);
      //               invariant(
      //                 $isTextSliceCaret(range.anchor),
      //                 '$isTextSliceCaret(range.anchor)',
      //               );
      //               invariant(
      //                 $isTextSliceCaret(range.focus),
      //                 '$isTextSliceCaret(range.anchor)',
      //               );
      //               expect(range.direction).toBe(direction);
      //               const textSliceCarets = range.textSliceCarets();
      //               expect(textSliceCarets).toHaveLength(2);
      //               const [anchorSlice, focusSlice] = textSliceCarets;
      //               expect(anchorSlice).toMatchObject({
      //                 direction,
      //                 indexEnd:
      //                   direction === 'next'
      //                     ? anchorNode.getTextContentSize()
      //                     : anchorOffset,
      //                 indexStart: direction === 'next' ? anchorOffset : 0,
      //                 origin: anchorNode,
      //                 type: 'breadth',
      //               });
      //               expect(focusSlice).toMatchObject({
      //                 direction,
      //                 indexEnd:
      //                   direction === 'next'
      //                     ? focusOffset
      //                     : focusNode.getTextContentSize(),
      //                 indexStart: direction === 'next' ? 0 : focusOffset,
      //                 origin: focusNode,
      //                 type: 'breadth',
      //               });
      //               expect([...range.internalCarets('root')]).toMatchObject(
      //                 textNodes
      //                   .slice(indexNodeStart + 1, indexNodeEnd)
      //                   .map((origin) => ({
      //                     direction,
      //                     origin,
      //                     type: 'breadth',
      //                   })),
      //               );
      //             }
      //           }
      //         }
      //       }
      //     }
      //   });
      // });
    });
  });
});

function* combinations<A, B>(
  as: Iterable<A>,
  bs: Iterable<B>,
): Iterable<[A, B]> {
  for (const a of as) {
    for (const b of bs) {
      yield [a, b];
    }
  }
}
