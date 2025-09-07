/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLinkNode, LinkNode} from '@lexical/link';
import {
  $createParagraphNode,
  $createTextNode,
  $getCaretRange,
  $getChildCaret,
  $getRoot,
  $getSiblingCaret,
  $isChildCaret,
  $isElementNode,
  CaretDirection,
  LexicalNode,
  NodeCaret,
  NodeKey,
  ParagraphNode,
  SiblingCaret,
  TextNode,
} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

import {initializeUnitTest} from '../../../__tests__/utils';

// The tests below here are intended to be basically copied from packages/lexical-website/docs/concepts/traversals.md
describe('traversals.md', () => {
  initializeUnitTest((testEnv) => {
    describe('Traversal Strategies', () => {
      let paragraphA: ParagraphNode;
      let textA1: TextNode;
      let linkA2: LinkNode;
      let textA3: TextNode;
      let textA4: TextNode;
      let paragraphB: ParagraphNode;
      let textB1: TextNode;
      let paragraphC: ParagraphNode;
      beforeEach(() => {
        testEnv.editor.update(() => {
          paragraphA = $createParagraphNode();
          textA1 = $createTextNode('Text A1');
          linkA2 = $createLinkNode(
            'https://lexical.dev/docs/concepts/traversals',
          );
          textA3 = $createTextNode('Text A3');
          textA4 = $createTextNode('Text A4');
          paragraphB = $createParagraphNode();
          textB1 = $createTextNode('Text B1');
          paragraphC = $createParagraphNode();
          // Root
          // * Paragraph A
          //   * Text A1
          //   * Link A2
          //     * Text A3
          //   * Text A4
          // * Paragraph B
          //   * Text B1
          // * Paragraph C
          $getRoot()
            .clear()
            .append(
              paragraphA.append(textA1, linkA2.append(textA3), textA4),
              paragraphB.append(textB1),
              paragraphC,
            );
        });
      });
      describe('Adjacent Caret Traversals', () => {
        test('$iterSiblings', () => {
          // Note that NodeCaret<D> already implements Iterable<NodeCaret<D>> in this
          // way, so this function is not very useful. You can just use startCaret as
          // the iterable.
          function* $iterSiblings<D extends CaretDirection>(
            startCaret: NodeCaret<D>,
          ): Iterable<SiblingCaret<LexicalNode, D>> {
            // Note that we start at the adjacent caret. The start caret
            // points away from the origin node, so we do not want to
            // trick ourselves into thinking that that origin is included.
            for (
              let caret = startCaret.getAdjacentCaret();
              caret !== null;
              caret = caret.getAdjacentCaret()
            ) {
              yield caret;
            }
          }
          testEnv.editor.update(
            () => {
              expect([
                ...$iterSiblings($getChildCaret($getRoot(), 'next')),
              ]).toEqual([
                $getSiblingCaret(paragraphA, 'next'),
                $getSiblingCaret(paragraphB, 'next'),
                $getSiblingCaret(paragraphC, 'next'),
              ]);
              // iterSiblings is the same as iterating the caret
              expect([
                ...$iterSiblings($getChildCaret($getRoot(), 'next')),
              ]).toEqual([...$getChildCaret($getRoot(), 'next')]);
            },
            {discrete: true},
          );
        });
        test('root has no siblings', () => {
          testEnv.editor.update(
            () => {
              // The root does not have sibling nodes
              const carets = [...$getSiblingCaret($getRoot(), 'next')];
              expect(carets).toEqual([]);
            },
            {discrete: true},
          );
        });
        test('root has paragraph children', () => {
          testEnv.editor.update(
            () => {
              // The adjacent node to a ChildNode is its first or last child
              // and is always a SiblingNode. It does not traverse deeper.
              const carets = [...$getChildCaret($getRoot(), 'next')];

              // next starts at the first child
              expect(carets).toEqual([
                $getSiblingCaret(paragraphA, 'next'),
                $getSiblingCaret(paragraphB, 'next'),
                $getSiblingCaret(paragraphC, 'next'),
              ]);

              // previous starts at the last child
              const prevCarets = [...$getChildCaret($getRoot(), 'previous')];
              expect(prevCarets).toEqual([
                $getSiblingCaret(paragraphC, 'previous'),
                $getSiblingCaret(paragraphB, 'previous'),
                $getSiblingCaret(paragraphA, 'previous'),
              ]);
            },
            {discrete: true},
          );
        });
        test('iteration does not include the origin', () => {
          testEnv.editor.update(
            () => {
              // The iteration starts at the node where the head of the "arrow"
              // is pointing, which is away from the origin (the tail of the "arrow").
              const carets = [...$getSiblingCaret(paragraphB, 'next')];
              expect(carets).toEqual([$getSiblingCaret(paragraphC, 'next')]);

              const prevCarets = [...$getSiblingCaret(paragraphB, 'previous')];
              expect(prevCarets).toEqual([
                $getSiblingCaret(paragraphA, 'previous'),
              ]);
            },
            {discrete: true},
          );
        });
      });
      describe('Depth First Caret Traversals', () => {
        describe('$iterCaretsDepthFirst', () => {
          test('via generator', () => {
            function* $iterCaretsDepthFirst<D extends CaretDirection>(
              startCaret: NodeCaret<D>,
            ): Iterable<NodeCaret<D>> {
              function step(prevCaret: NodeCaret<D>): null | NodeCaret<D> {
                // Get the adjacent SiblingCaret
                const nextCaret = prevCaret.getAdjacentCaret();
                return (
                  // If there is a sibling, try and get a ChildCaret from it
                  (nextCaret && nextCaret.getChildCaret()) ||
                  // Return the sibling if there is one
                  nextCaret || // Return a SiblingCaret of the parent, if there is one
                  prevCaret.getParentCaret('root')
                );
              }
              // You may add an additional check here, usually some specific
              // caret to terminate the iteration with (such as the parent caret
              // of startCaret):
              //
              //  `caret !== null || caret.is(endCaret)`
              //
              for (
                let caret = step(startCaret);
                caret !== null;
                caret = step(caret)
              ) {
                yield caret;
              }
            }
            testEnv.editor.update(
              () => {
                expect([
                  ...$iterCaretsDepthFirst($getChildCaret($getRoot(), 'next')),
                ]).toEqual([
                  $getChildCaret(paragraphA, 'next'),
                  $getSiblingCaret(textA1, 'next'),
                  $getChildCaret(linkA2, 'next'),
                  $getSiblingCaret(textA3, 'next'),
                  $getSiblingCaret(linkA2, 'next'),
                  $getSiblingCaret(textA4, 'next'),
                  $getSiblingCaret(paragraphA, 'next'),
                  $getChildCaret(paragraphB, 'next'),
                  $getSiblingCaret(textB1, 'next'),
                  $getSiblingCaret(paragraphB, 'next'),
                  $getChildCaret(paragraphC, 'next'),
                  $getSiblingCaret(paragraphC, 'next'),
                ]);
              },
              {discrete: true},
            );
          });
          test('via CaretRange', () => {
            function $iterCaretsDepthFirst<D extends CaretDirection>(
              startCaret: NodeCaret<D>,
              endCaret?: NodeCaret<D>,
            ): Iterable<NodeCaret<D>> {
              return $getCaretRange(
                startCaret,
                // Use the root as the default end caret, but you might choose
                // to use startCaret.getParentCaret('root') for example
                endCaret || $getSiblingCaret($getRoot(), startCaret.direction),
              );
            }
            testEnv.editor.update(
              () => {
                expect([
                  ...$iterCaretsDepthFirst($getChildCaret($getRoot(), 'next')),
                ]).toEqual([
                  $getChildCaret(paragraphA, 'next'),
                  $getSiblingCaret(textA1, 'next'),
                  $getChildCaret(linkA2, 'next'),
                  $getSiblingCaret(textA3, 'next'),
                  $getSiblingCaret(linkA2, 'next'),
                  $getSiblingCaret(textA4, 'next'),
                  $getSiblingCaret(paragraphA, 'next'),
                  $getChildCaret(paragraphB, 'next'),
                  $getSiblingCaret(textB1, 'next'),
                  $getSiblingCaret(paragraphB, 'next'),
                  $getChildCaret(paragraphC, 'next'),
                  $getSiblingCaret(paragraphC, 'next'),
                ]);
              },
              {discrete: true},
            );
          });
        });
        describe('$iterNodesDepthFirst', () => {
          function* $iterNodesDepthFirst<D extends CaretDirection>(
            startCaret: NodeCaret<D>,
            endCaret: NodeCaret<D> = $getChildCaret(
              $getRoot(),
              startCaret.direction,
            ),
          ): Iterable<LexicalNode> {
            const seen = new Set<NodeKey>();
            for (const caret of $getCaretRange(startCaret, endCaret)) {
              const {origin} = caret;
              if ($isChildCaret(caret)) {
                seen.add(origin.getKey());
              } else if (!$isElementNode(origin) || seen.has(origin.getKey())) {
                // If the origin is an element and we have not seen it as a ChildCaret
                // then it was not entirely in the CaretRange
                yield origin;
              }
            }
          }
          test('includes only wholly included nodes', () => {
            testEnv.editor.update(
              () => {
                expect([
                  ...$iterNodesDepthFirst(
                    $getChildCaret(paragraphA, 'next'),
                    $getChildCaret(paragraphC, 'next'),
                  ),
                ]).toEqual([
                  // already starting inside paragraphA
                  textA1,
                  // linkA2 is entered here
                  textA3,
                  // linkA2 is exited and included
                  linkA2,
                  textA4,
                  // paragraphA is exited but not included because it was never entered
                  // paragraphB is entered here
                  textB1,
                  // paragraphB is exited and included
                  paragraphB,
                  // paragraphC is entered but never exited so not included
                ]);
              },
              {discrete: true},
            );
          });
        });
        test('full traversal', () => {
          testEnv.editor.update(
            () => {
              // A full traversal of the document from root
              const carets = [
                ...$getCaretRange(
                  // Start with the arrow pointing towards the first child of root
                  $getChildCaret($getRoot(), 'next'),
                  // End when the arrow points away from root
                  $getSiblingCaret($getRoot(), 'next'),
                ),
              ];
              expect(carets).toEqual([
                $getChildCaret(paragraphA, 'next'), // enter Paragraph A
                $getSiblingCaret(textA1, 'next'),
                $getChildCaret(linkA2, 'next'), // enter Link A2
                $getSiblingCaret(textA3, 'next'),
                $getSiblingCaret(linkA2, 'next'), // leave Link A2
                $getSiblingCaret(textA4, 'next'),
                $getSiblingCaret(paragraphA, 'next'), // leave Paragraph A
                $getChildCaret(paragraphB, 'next'), // enter Paragraph B
                $getSiblingCaret(textB1, 'next'),
                $getSiblingCaret(paragraphB, 'next'), // leave Paragraph B
                $getChildCaret(paragraphC, 'next'), // enter Paragraph C
                $getSiblingCaret(paragraphC, 'next'), // leave Paragraph C
              ]);
            },
            {discrete: true},
          );
        });
      });
    });
  });
});
